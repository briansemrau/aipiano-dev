import { Model } from "@/utils/model"
import { WordLevelTokenizer } from "@/utils/tokenizer"
import { NoteData, VocabUtils } from "@/utils/vocab"
import { sample } from "@/utils/sampling"

const basePath = process.env.BASE_PATH || '/aipiano'

let crossOriginIsolated = false

let isRunning = false
let stopFlag = false; // work loop

let model: Model
let tokenizer: WordLevelTokenizer
let vocabUtils: VocabUtils

let noteDataQueue: (NoteData | number)[] = []
let queueMaxSize = 64; // buffer can be increased to avoid stuttering
let isGenerating = false
let cancelFlag = false; // generator loop

type PartialNoteData = {
  pitch: number
  velocity: number
  startTime: number
  color: string
}
type CompleteNoteData = PartialNoteData & {
  duration: number
}
type InProgressNotes = { [key: number]: PartialNoteData }
type CompletedNotes = Array<CompleteNoteData>

let prompt = ''
let minNotesTotalTime = 0
let maxNotesTotalTime = 0
let maxTotalNotes = 256
let notesTotalTime = 0
let promptEndTime = 0
let inProgressNotes: InProgressNotes = {}
let completedNotes: CompletedNotes = []

self.onmessage = event => {
  const message = event.data.message as string || event.data as string

  // check for start/stop message
  if (message === 'start') {
    (async () => {
      prompt = event.data.prompt as string || ''
      minNotesTotalTime = event.data.minNotesTotalTime as number || 0
      maxNotesTotalTime = event.data.maxNotesTotalTime as number || 0
      crossOriginIsolated = event.data.crossOriginIsolated as boolean || false
      stopFlag = true
      while (isRunning && stopFlag) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      if (!isRunning) { // technically start can be preempted by another start message
        stopFlag = false
        startWork()
      }
    })()
  }
  if (message === 'stop') {
    stopFlag = true
  }

  // instructions
  if (message === 'updateTime') {
    maxNotesTotalTime = event.data.maxNotesTotalTime as number || 0
    minNotesTotalTime = event.data.minNotesTotalTime as number || 0
  }
}

async function startWork() {
  isRunning = true

  // load model
  let promises = []
  if (!model) {
    model = new Model()
    promises.push(model.loadModel(`${basePath}/static/gmp_tiny2_uint8.onnx`, 20, 320))
  }
  if (!tokenizer) {
    tokenizer = new WordLevelTokenizer()
    promises.push(tokenizer.loadTokenizer(`${basePath}/static/tokenizer-midipiano.json`))
  }
  if (!vocabUtils) {
    vocabUtils = new VocabUtils()
    promises.push(vocabUtils.load(`${basePath}/static/vocab_config_piano.json`))
  }
  if (promises.length) {
    self.postMessage('loading')
    await Promise.all(promises)
    self.postMessage('loaded')
  }

  // clear state
  noteDataQueue = []
  completedNotes = []
  inProgressNotes = {}
  notesTotalTime = 0
  promptEndTime = 0
  let prevMinNotesTotalTime = minNotesTotalTime
  let prevNotesTotalTime = notesTotalTime

  self.postMessage({
    message: 'notes',
    notes: [],
    notesTotalTime: notesTotalTime,
    promptEndTime: promptEndTime,
  })

  // process prompt
  if (prompt) {
    let i = 0
    tokenizer.tokenize(prompt).forEach(token => {
      processNoteData(vocabUtils.tokenToData(token))
      if (i++ % 10 === 0) {
        self.postMessage({
          message: 'notes',
          notes: [...completedNotes, ...Object.values(inProgressNotes)],
          notesTotalTime: notesTotalTime,
          promptEndTime: promptEndTime,
        })
      }
    })
  }
  promptEndTime = notesTotalTime

  // begin generate loop (async)
  generateLoop(prompt)

  // begin process loop
  while (!stopFlag) {
    let modified = false

    // delete old notes
    if (prevMinNotesTotalTime !== minNotesTotalTime) {
      completedNotes = completedNotes.filter(note => note.startTime + note.duration >= minNotesTotalTime)
      prevMinNotesTotalTime = minNotesTotalTime
      modified = true
    }

    // update notes
    //console.log([notesTotalTime < maxNotesTotalTime, noteDataQueue.length > 0, completedNotes.length + Object.keys(inProgressNotes).length < maxTotalNotes])
    while (notesTotalTime < maxNotesTotalTime && noteDataQueue.length > 0 && completedNotes.length + Object.keys(inProgressNotes).length < maxTotalNotes) {
      const data = noteDataQueue.shift()
      if (data !== undefined) {
        processNoteData(data)
      }

      if (prevNotesTotalTime !== notesTotalTime) {
        prevNotesTotalTime = notesTotalTime
        modified = true
      }
    }

    if (modified) {
      self.postMessage({
        message: 'notes',
        notes: [...completedNotes, ...Object.values(inProgressNotes)],
        notesTotalTime: notesTotalTime,
        promptEndTime: promptEndTime,
      })
    }
    // don't churn cpu
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // stop generator
  cancelFlag = true
  while (isGenerating) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  isRunning = false
}

async function generateLoop(prompt: string = '') {
  if (isGenerating) {
    throw new Error('Already generating')
  }
  cancelFlag = false
  isGenerating = true

  let state = null
  let x = null
  let ids = prompt ? tokenizer.encode(prompt) : 0

  const repetitionPenaltyViewLength = 128
  // exclude 3 thru 127
  const repetitionPenaltyExcludeIds = new Int32Array(125)
  for (let i = 0; i < repetitionPenaltyExcludeIds.length; i++) {
    repetitionPenaltyExcludeIds[i] = i + 3
  }

  let prev_ids = new Int32Array(repetitionPenaltyViewLength)
  if (ids instanceof Int32Array) {
    prev_ids.set(ids.subarray(Math.max(0, ids.length - repetitionPenaltyViewLength + 1)))
  } else {
    prev_ids[-1] = ids
  }

  outer: while (true) {
    if (cancelFlag) {
      break outer
    }
    while (noteDataQueue.length >= queueMaxSize) {
      if (cancelFlag) {
        break outer
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const result = await model.forward(ids, state)
    state = result.state
    x = result.x.data as Float32Array
    ids = sample(x, {
      temperature: 1.0,
      top_p: 0.8,
      repetition_penalty: {
        prev_ids: prev_ids,
        penalty: 1.1,
        view_length: repetitionPenaltyViewLength,
        max_penalty: 1.5,
        decay_factor: 0.99,
        exclude_ids: repetitionPenaltyExcludeIds
      },
      preProcessProbs: (x) => {
        x[0] = 0
        x.fill(0, 128, 270)
        x.fill(0, 1680, 2175)
        return x
      }
    })

    // <pad> <end> reset state
    if (ids === 0 || ids === 2) {
      state = null
    }

    // add id to prev_ids
    prev_ids.set(prev_ids.subarray(1), 0)
    prev_ids[prev_ids.length - 1] = ids

    const token = tokenizer.decode(ids)
    // console.log(ids + ": " + token)
    if (token === '<pad>') {
      break outer; // something went wrong
    }
    noteDataQueue.push(vocabUtils.tokenToData(token))
  }
  noteDataQueue = []
  isGenerating = false
}

function processNoteData(data: NoteData | number) {
  const minNoteDuration = 0.1
  const currentColor = "hsl(" + (notesTotalTime * 360 / 30) + ", 50%, 50%)"
  if (typeof data === "number") {
    // delay
    notesTotalTime += data
    Object.values(inProgressNotes).forEach((note: PartialNoteData) => {
      if (notesTotalTime - note.startTime >= (vocabUtils.config?.decode_end_held_note_delay || 8.0)) {
        const completedNote: CompleteNoteData = {
          pitch: note.pitch,
          velocity: note.velocity,
          startTime: note.startTime,
          duration: Math.max(notesTotalTime - note.startTime, minNoteDuration),
          color: note.color,
        }
        completedNotes.push(completedNote)
        delete inProgressNotes[note.pitch]
      }
    })
  } else {
    if (data.velocity <= 0.01) {
      // note off
      const inProgressNote = inProgressNotes[data.pitch]
      if (inProgressNote !== undefined) {
        const duration = notesTotalTime - inProgressNote.startTime
        if (duration > 0) {
          const completedNote: CompleteNoteData = {
            pitch: inProgressNote.pitch,
            velocity: inProgressNote.velocity,
            startTime: inProgressNote.startTime,
            duration: Math.max(duration, minNoteDuration),
            color: inProgressNote.color,
          }
          completedNotes.push(completedNote)
          delete inProgressNotes[data.pitch]
        }
      }
    } else {
      // note on
      const inProgressNote = inProgressNotes[data.pitch]
      if (inProgressNote !== undefined) {
        // handle repeat on
        const completedNote: CompleteNoteData = {
          pitch: inProgressNote.pitch,
          velocity: inProgressNote.velocity,
          startTime: inProgressNote.startTime,
          duration: Math.max(notesTotalTime - inProgressNote.startTime, minNoteDuration),
          color: inProgressNote.color,
        }
        completedNotes.push(completedNote)
        delete inProgressNotes[data.pitch]
      }
      const newNote: PartialNoteData = {
        pitch: data.pitch,
        velocity: data.velocity,
        startTime: notesTotalTime,
        color: currentColor,
      }
      inProgressNotes[data.pitch] = newNote
    }
  }
}

export {}