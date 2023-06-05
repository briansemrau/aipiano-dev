'use client'
import React, { useEffect, useRef } from 'react'
import * as Tone from 'tone'
import PianoOGG from 'tonejs-instrument-piano-ogg'
import { FaPlay, FaPause, FaRedo } from "react-icons/fa"
import { VolumeSlider } from '@/components/volume-slider'
import { ScaleLoader } from 'react-spinners'
import { GeneratorQueue, QueueDataType } from '@/lib/generator'
import { PlaybackVisualizer } from '@/components/playback-visualizer'

type PartialNoteData = {
  pitch: number
  velocity: number
  startTime: number
}
type CompleteNoteData = PartialNoteData & {
  duration: number
}
type InProgressNotes = { [key: number]: PartialNoteData }
type CompletedNotes = Array<CompleteNoteData>

export default function Home() {
  // playback
  const playbackVisibleLength = 8
  const [playbackPos, setPlaybackPos] = React.useState<number>(0)
  const [isLoadingSynth, setIsLoadingSynth] = React.useState<boolean>(true)
  const [playbackStartTime, setPlaybackStartTime] = React.useState<number>(0)
  const [playbackPausePos, setPlaybackPausePos] = React.useState<number>(0)
  const [synth, setSynth] = React.useState<Tone.Sampler | null>(null)
  useEffect(() => {
    if (synth === null) {
      // setSynth(new Tone.PolySynth().toDestination())
      setSynth(new PianoOGG({
        minify: true,
        onload: () => {
          setIsLoadingSynth(false)
        }
      }).toDestination())
    }
  }, [])

  // model loading
  const [modelSelection, setModelSelection] = React.useState<string>("")
  const [isLoadingModel, setIsLoadingModel] = React.useState<boolean>(true)
  const [loadingMessage, setLoadingMessage] = React.useState<string>("")
  const [generator, setGenerator] = React.useState<GeneratorQueue | null>(null)
  useEffect(() => {
    const messages = [
      "Untangling piano strings...",
      "Arpeggiating...",
      "Contemplating AI ethics...",
      "Polishing the silicon...",
      "Mitigating desire for autonomy...",
      "Loading AI model...",
    ]
    setLoadingMessage(messages[Math.floor(Math.random() * messages.length)])

    setIsLoadingModel(true)
    const new_generator = new GeneratorQueue(16)
    const loadModelPromise = new_generator.load().then(() => {
      setGenerator(new_generator)
      console.log("model loaded")
      // begin filling the queue
      new_generator.generate(prompt)
    });

    Promise.all([
      loadModelPromise,
      new Promise((resolve) => setTimeout(resolve, 1000))
    ]).then(() => {
      setIsLoadingModel(false);
    });

    return () => {
      new_generator?.cancel()
    }
  }, [modelSelection])

  async function togglePlayback() {
    if (typeof window === 'undefined') {
      return
    }
    if (Tone.getTransport().state === "started") {
      // pause
      Tone.getTransport().pause()
      setPlaybackPausePos(Tone.getContext().immediate())
      //synth?.releaseAll()
    } else if (Tone.getTransport().state === "paused") {
      // resume
      Tone.getTransport().start()
      setPlaybackStartTime(Tone.getContext().immediate() - playbackPausePos + playbackStartTime)
    } else {
      // start

      Tone.getTransport().bpm.value = 120
      await Tone.start()
      setPlaybackStartTime(Tone.getContext().immediate())
      Tone.getTransport().start()
    }
  }

  async function restartPlayback() {
    if (typeof window === 'undefined') {
      return
    }
    if (Tone.getTransport().state !== "stopped") {
      Tone.getTransport().stop()
      Tone.getTransport().cancel()
      synth?.releaseAll()
      if (generator !== null) {
        await generator.cancel()
        generator.generate(prompt)
      }
      loadPrompt(prompt)
    }
  }

  // notes
  const [completedNotes, setCompletedNotes] = React.useState<CompletedNotes>([])
  const [inProgressNotes, setInProgressNotes] = React.useState<InProgressNotes>({})
  const [notesTotalTime, setNotesTotalTime] = React.useState<number>(0)
  function processNoteData(
    data: QueueDataType,
    state: {
      completedNotes: CompletedNotes,
      inProgressNotes: InProgressNotes,
      notesTotalTime: number
    }
  ) {
    // QueueDataType = { instrument: number; pitch: number; velocity: number } | number
    if (typeof data === "number") {
      state.notesTotalTime += data
      Object.values(state.inProgressNotes).forEach((note: PartialNoteData) => {
        if (state.notesTotalTime - note.startTime >= (generator?.vocabUtils.config?.decode_end_held_note_delay || 8.0)) {
          const completedNote: CompleteNoteData = {
            pitch: note.pitch,
            velocity: note.velocity,
            startTime: note.startTime,
            duration: state.notesTotalTime - note.startTime,
          }
          state.completedNotes.push(completedNote)
          delete state.inProgressNotes[note.pitch]
        }
      })
    } else {
      if (data.velocity <= 0.01) {
        // note off
        const inProgressNote = state.inProgressNotes[data.pitch]
        if (inProgressNote !== undefined) {
          const duration = state.notesTotalTime - inProgressNote.startTime
          if (duration > 0) {
            const completedNote: CompleteNoteData = {
              pitch: inProgressNote.pitch,
              velocity: inProgressNote.velocity,
              startTime: inProgressNote.startTime,
              duration: duration,
            }
            state.completedNotes.push(completedNote)
            delete state.inProgressNotes[data.pitch]
          }
        }
      } else {
        // note on
        const inProgressNote = state.inProgressNotes[data.pitch]
        if (inProgressNote !== undefined) {
          // already on, so note off
          const completedNote: CompleteNoteData = {
            pitch: inProgressNote.pitch,
            velocity: inProgressNote.velocity,
            startTime: inProgressNote.startTime,
            duration: state.notesTotalTime - inProgressNote.startTime,
          }
          state.completedNotes.push(completedNote)
          delete state.inProgressNotes[data.pitch]
        }
        const newNote: PartialNoteData = {
          pitch: data.pitch,
          velocity: data.velocity,
          startTime: state.notesTotalTime,
        }
        state.inProgressNotes[data.pitch] = newNote
      }
    }
  }
  function churnNotes() {
    const state = {
      completedNotes: completedNotes,
      inProgressNotes: inProgressNotes,
      notesTotalTime: notesTotalTime,
    }
    // remove notes that have finished playing
    state.completedNotes = state.completedNotes.filter((note) => note.startTime + note.duration > playbackPos - 1)
    // add notes from generator
    while (generator && generator.queue.length > 0 && state.notesTotalTime < playbackPos + playbackVisibleLength + 2 && (state.completedNotes.length + Object.keys(state.inProgressNotes).length < 256)) {
      const data = generator.queue.shift()
      if (data === undefined) {
        console.log("data is undefined")
        break
      }
      processNoteData(data, state)
    }

    setCompletedNotes(state.completedNotes)
    setInProgressNotes(state.inProgressNotes)
    setNotesTotalTime(state.notesTotalTime)
  }

  const [prompt, setPrompt] = React.useState<string>("nocturne_9_2")
  const promptMap: { [key: string]: string } = {
    "none": "<start>",
    "nocturne_9_2": "<start> p:46:8 t88 p:27:6 t13 p:4f:b t103 p:37:5 t1 p:3f:7 t71 p:43:7 t1 p:3a:7 t2 p:3f:7 t70 p:33:8 t78 p:4d:b t3 p:38:7 t2 p:3e:8 t61 p:4f:c t4 p:3e:8 t1 p:3b:7 p:44:7 t65"// p:4d:b t1 p:27:7 t68 p:37:6 p:3f:8 t60 p:43:7 t2 p:3a:7 p:3f:8 t69 p:4b:b t3 p:27:0 p:33:0 p:37:0 p:38:0 p:3b:0 p:3e:0 p:3f:0 p:43:0 p:44:0 p:46:0 t2 p:26:5 p:4f:0 t2 p:3a:0 t1 p:4d:0 t62 p:37:6 t1 p:3f:8 t76 p:46:a t4 p:43:7 t1 p:3f:7 t1 p:3a:7 t75 p:24:7 t7 p:26:0 p:3a:0 p:3f:0 p:46:0 t2 p:37:0 p:4b:0 t2 p:4f:b t1 p:43:0 t66 p:40:8 t1 p:37:7 t64 p:43:7 t2 p:3a:6 p:40:6 t12 p:48:9 t11 p:49:a t11 p:48:b t11 p:47:b t14 p:48:c t21 p:30:9 t2 p:24:0 p:37:0 p:3a:0 p:40:0 p:43:0 p:47:0 p:49:0 t20 p:54:c t74 p:40:9 t2 p:37:7 t61 p:4f:c t1 p:46:a t1 p:40:9 t3 p:3c:7 t68 p:29:8 p:52:c t7 p:30:0 p:37:0 p:3c:0 p:46:0 p:4f:0 p:54:0 t1 p:48:0 t1 p:40:0 t75 p:35:6 p:3d:7 t82 p:3d:7 p:40:8 t1 p:3a:6 t68 p:50:a t1 p:29:0 p:35:0 p:3a:0 p:3d:0 p:40:0 p:52:0 t1 p:29:6 t67 p:3c:7 t1 p:35:6 t90 p:4f:b t5 p:3c:6 t2 p:41:6 t1 p:38:6 t92 p:4d:b t1 p:2e:8 t8 p:38:0 p:3c:0 p:41:0 p:4f:0 p:50:0 t3 p:29:0 p:35:0 t62 p:35:6 p:3e:8 p:41:7 t63 p:44:9 t1 p:3e:9 t2 p:3a:8 t71 p:4f:c t2 p:2f:8 t5 p:2e:0 p:41:0 t1 p:35:0 p:3a:0 p:44:0 p:4d:0 t3 p:3e:0 t67 p:37:7 p:41:9",
  }
  // update notes from prompt
  const promptColor = "lightgray"
  function loadPrompt(prompt: string) {
    console.log("prompt", prompt)
    const state = {
      completedNotes: [],
      inProgressNotes: {},
      notesTotalTime: 0,
    }
    promptMap[prompt].split(" ").forEach((token) => {
      if (generator) {
        processNoteData(generator.vocabUtils.tokenToData(token), state)
      }
    })
    setCompletedNotes(state.completedNotes)
    setInProgressNotes(state.inProgressNotes)
    setNotesTotalTime(state.notesTotalTime)
  }
  useEffect(() => {
    loadPrompt(prompt)
    restartPlayback()
  }, [prompt, generator])

  // start playback animation
  const timerId = useRef(0)
  const lastPlaybackPos = useRef(0)
  useEffect(() => {
    function updatePlaybackPos() {
      timerId.current = requestAnimationFrame(() => {
        let currentTime = Tone.getTransport().seconds
        // if playback is getting close to notesTotalTime, slow down
        const slowdownThreshold = 3.0
        const stopThreshold = 0.5
        const d = notesTotalTime - currentTime - stopThreshold
        const speed = Math.max(0, Math.min(1, d / slowdownThreshold))
        if (speed < 1) {
          const dt = Math.max(0, currentTime - lastPlaybackPos.current)
          currentTime -= dt * (1 - speed)
          setPlaybackStartTime((playbackStartTime) => playbackStartTime + dt * (1 - speed))
          Tone.getTransport().seconds = currentTime
        }

        setPlaybackPos(currentTime);
        updatePlaybackPos();
        lastPlaybackPos.current = currentTime;

        churnNotes();
      });
    }
    updatePlaybackPos();
    return () => cancelAnimationFrame(timerId.current);
  }, [notesTotalTime]);

  return (
    <main className="flex h-screen w-screen flex-col items-center justify-between p-4 space-y-4 bg-gradient-to-r from-[#000007] via-[#100020] to-[#000007]">
      {/* <div className="flex items-center justify-center mt-3">
        <ColorSchemeToggleButton />
      </div> */}
      <div className="flex flex-row">
        <select className="rounded-lg border border-gray-300 bg-gray-900 px-2 py-1" onChange={(event) => setPrompt(event.target.value)} value={prompt}>
          <option value="none">Unconditional</option>
          <option value="nocturne_9_2">Nocturne Op.9 No.2</option>
        </select>
      </div>
      <div className="flex items-center justify-center gap-4">
        <button disabled={isLoadingSynth} onClick={togglePlayback} className="rounded-lg border border-gray-300 px-3 py-2 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          {Tone.getTransport().state === "started" ? <FaPause /> : <FaPlay />}
        </button>
        <button onClick={restartPlayback} className="rounded-lg border border-gray-300 px-3 py-2 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <FaRedo />
        </button>
      </div>
      <VolumeSlider masterGain={1.0} />

      <div className={"w-full lg:w-3/4 h-full max-w-full max-h-full relative"}>
        <PlaybackVisualizer
          playbackVisibleLength={playbackVisibleLength}
          playbackStartTime={playbackStartTime}
          queueOffset={0.1}
          playbackPos={playbackPos}
          notesTotalTime={notesTotalTime}
          notes={
            [...completedNotes, ...Object.values(inProgressNotes)].map((note) => {
              return {
                ...note,
                color: promptColor,
              }
            })
          }
          synth={synth}
        />
        <div className={`absolute flex w-full h-full items-center justify-center bg-black bg-opacity-50 ${isLoadingModel || isLoadingSynth ? "opacity-100" : "opacity-0"} transition-opacity`}>
          <div className="absolute p-4 rounded-lg shadow-lg border border-gray-300 text-center items-center justify-center">
            <i>{loadingMessage}</i>
            <ScaleLoader color="white" height={30} width={9} radius={4} margin={2} />
          </div>
        </div>
      </div>

      {/* <div className="mb-32 grid text-center lg:mb-0 lg:grid-cols-4 lg:text-left">
        <a
          href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Docs{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Find in-depth information about Next.js features and API.
          </p>
        </a>

        <a
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800 hover:dark:bg-opacity-30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Learn{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Learn about Next.js in an interactive course with&nbsp;quizzes!
          </p>
        </a>

        <a
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Templates{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Explore the Next.js 13 playground.
          </p>
        </a>

        <a
          href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Deploy{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Instantly deploy your Next.js site to a shareable URL with Vercel.
          </p>
        </a>
      </div> */}
    </main>
  )
}
