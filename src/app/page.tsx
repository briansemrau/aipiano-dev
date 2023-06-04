'use client'
import React, { use, useEffect, useRef } from 'react'
import Image from 'next/image'
// import ReactMidiVisualizer from 'react-midi-visualizer'
import { scaleLinear, scaleTime } from 'd3-scale'
import { scalePiano } from '@/lib/piano-scale'
import { Stage, Layer, Rect, Line } from 'react-konva'
import { PianoKeyboard } from '@/components/piano-keyboard'
import * as Tone from 'tone'
import { getNoteName } from '@/lib/notes'
import PianoOGG from 'tonejs-instrument-piano-ogg'
import { FaPlay, FaPause, FaRedo } from "react-icons/fa"
import { VolumeSlider } from '@/components/volume-slider'
import { ScaleLoader } from 'react-spinners'
import { GeneratorQueue } from '@/lib/generator'

type NoteData = {
  value: number
  velocity: number
  startTime: number
  color: string
}

type NoteBlock = {
  pitch: number
  velocity: number
  duration: number
  startTime: number
  color: string
}

// as note events come in, we need to track which notes are on and handle them when they turn off
type NotesState = {
  [key: number]: NoteData
}

type NotesHistory = Array<NoteBlock>

export default function Home() {
  // playback and notes
  const queueOffset = 0.1
  const playbackVisibleLength = 5;
  const [isLoadingSynth, setIsLoadingSynth] = React.useState<boolean>(true)
  const [playbackStart, setPlaybackStart] = React.useState<number>(0)
  const [playbackPausePos, setPlaybackPausePos] = React.useState<number>(0)
  const [playbackPos, setPlaybackPos] = React.useState<number>(0)
  const [visualPlaybackPos, setVisualPlaybackPos] = React.useState<number>(queueOffset)
  const [notesState, setNotesState] = React.useState<NotesState>({})
  const [notesHistory, setNotesHistory] = React.useState<NotesHistory>([])
  const [prompt, setPrompt] = React.useState<string>("nocturne_9_2")
  const [synth, setSynth] = React.useState<Tone.Sampler | null>(null)
  useEffect(() => {
    if (synth === null) {
      //setSynth(new Tone.PolySynth().toDestination())
      setSynth(new PianoOGG({
        minify: true,
        onload: () => {
          setIsLoadingSynth(false)
        }
      }).toDestination())
    }
  }, [])

  // visualizer track sizing
  const trackContainerRef = React.useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = React.useState<number>(0);
  const [windowHeight, setWindowHeight] = React.useState<number>(0);
  const [trackHeight, setTrackHeight] = React.useState<number>(600);
  const [trackWidth, setTrackWidth] = React.useState<number>(800);
  const [keyboardHeight, setKeyboardHeight] = React.useState<number>(70);
  const xScale = useRef(scalePiano().range([0, trackWidth]));
  const yScale = useRef(scaleLinear().range([(trackHeight - keyboardHeight), 0]));
  yScale.current.domain([visualPlaybackPos, visualPlaybackPos + playbackVisibleLength]);
  useEffect(() => {
    const container = trackContainerRef.current?.getBoundingClientRect()
    if (container) {
      setTrackWidth(container.width)
      setTrackHeight(container.height)
      setKeyboardHeight(Math.min(container.height * 0.2, 60 / 800 * container.width))
    }
  }, [windowWidth, windowHeight])
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
      setWindowHeight(window.innerHeight)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  })
  useEffect(() => {
    // update scales
    xScale.current = scalePiano().range([0, trackWidth]);
    yScale.current = scaleLinear().range([(trackHeight - keyboardHeight), 0]);
    yScale.current.domain([visualPlaybackPos, visualPlaybackPos + playbackVisibleLength]);
  }, [trackWidth, trackHeight])

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
      setPlaybackStart(Tone.getContext().immediate() - playbackPausePos + playbackStart)
    } else {
      // start

      Tone.getTransport().bpm.value = 120
      await Tone.start()
      setPlaybackStart(Tone.getContext().immediate())
      // console.log(Tone.getContext().rawContext.currentTime)
      // console.log(Tone.getContext().now())
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
      selectPrompt(prompt)
    }
  }

  // update notes from prompt
  const promptColor = "lightgray"
  function selectPrompt(prompt: string) {
    console.log("prompt", prompt)
    switch (prompt) {
      case "none":
        setNotesHistory([])
        setNotesState({})
        break;
      case "nocturne_9_2":
        setNotesHistory([
          { pitch: 60, velocity: 1, duration: 1, startTime: 0, color: promptColor },
          { pitch: 61, velocity: 0.5, duration: 1.5, startTime: 1, color: promptColor },
          { pitch: 64, velocity: 0.1, duration: 1, startTime: 4, color: promptColor },
          { pitch: 59, velocity: 1, duration: 1, startTime: 5, color: promptColor },
        ])
        setNotesState({
          50: { value: 50, velocity: 1, startTime: 0, color: promptColor },
          51: { value: 51, velocity: 1, startTime: 1, color: promptColor },
          52: { value: 52, velocity: 0.5, startTime: 4, color: promptColor },
        })
        break;
      case "2":
        setNotesHistory([
          { pitch: 48, velocity: 1, duration: .2, startTime: 0, color: promptColor },
          { pitch: 52, velocity: 1, duration: .2, startTime: 0.1, color: promptColor },
          { pitch: 55, velocity: 1, duration: .2, startTime: 0.2, color: promptColor },
          { pitch: 60, velocity: 1, duration: .2, startTime: 0.3, color: promptColor },
          { pitch: 55, velocity: 1, duration: .2, startTime: 0.4, color: promptColor },
          { pitch: 52, velocity: 1, duration: .2, startTime: 0.5, color: promptColor },
          { pitch: 48, velocity: 1, duration: .2, startTime: 0.6, color: promptColor },
        ])
        setNotesState({})
        break;
    }
  }
  useEffect(() => {
    selectPrompt(prompt)
    restartPlayback()
  }, [prompt])

  // play notes, delete old ones
  const lastPlaybackPos = useRef(0)
  useEffect(() => {
    if (lastPlaybackPos.current > playbackPos) {
      // restarted
      lastPlaybackPos.current = playbackPos
      return
    }

    // play new notes
    notesHistory.forEach((note) => {
      if (note.startTime >= lastPlaybackPos.current && note.startTime < playbackPos) {
        const pitch = getNoteName(note.pitch)
        //synth?.triggerAttackRelease(pitch, note.duration, note.startTime + queueOffset + playbackStart, note.velocity)
        synth?.triggerAttack(pitch, note.startTime + playbackStart + queueOffset, note.velocity)
        // console.log("attack", pitch)
      }
      if (note.startTime + note.duration >= lastPlaybackPos.current && note.startTime + note.duration < playbackPos) {
        const pitch = getNoteName(note.pitch)
        synth?.triggerRelease(pitch, note.startTime + note.duration + playbackStart + queueOffset)
        // console.log("release", pitch)
      }
    })
    Object.entries(notesState).map(([pitch, note]) => {
      if (note.startTime >= lastPlaybackPos.current && note.startTime < playbackPos) {
        const pitchName = getNoteName(note.value)
        synth?.triggerAttack(pitchName, note.startTime + playbackStart + queueOffset, note.velocity)
      }
    })

    // delete old notes
    setNotesHistory((current) => {
      return current.filter((note) => note.startTime + note.duration > visualPlaybackPos)
    })

    lastPlaybackPos.current = playbackPos
  }, [playbackPos])

  // add notes from model generation queue
  // useEffect(() => {
  //   if (modelGenerationQueue.length > 0 && notesHistory.length < 256) {
  //     const newNotes = modelGenerationQueue.map((note) => {
  //       return {
  //         pitch: note.value,
  //         velocity: note.velocity,
  //         duration: note.duration,
  //         startTime: note.startTime,
  //         color: "white",
  //       }
  //     })
  //     setNotesHistory((current) => {
  //       return [...current, ...newNotes]
  //     })
  //     setModelGenerationQueue([])
  //   }
  // }, [modelGenerationQueue, notesHistory])

  // start playback animation
  const timerId = useRef(0)
  useEffect(() => {
    function updatePlaybackPos() {
      timerId.current = requestAnimationFrame(() => {
        setPlaybackPos(Tone.getTransport().seconds);
        setVisualPlaybackPos(Tone.getTransport().seconds - queueOffset);
        updatePlaybackPos();
      });
    }
    updatePlaybackPos();
    return () => cancelAnimationFrame(timerId.current);
  }, []);

  return (
    <main className="flex h-screen w-screen flex-col items-center justify-between p-4 space-y-4 bg-gradient-to-r from-[#000007] via-[#100020] to-[#000007]">
      {/* <div className="flex items-center justify-center mt-3">
        <ColorSchemeToggleButton />
      </div> */}
      <div className="flex flex-row">
        <select className="rounded-lg border border-gray-300 bg-gray-900 px-2 py-1" onChange={(event) => setPrompt(event.target.value)} value={prompt}>
          <option value="none">Unconditional</option>
          <option value="nocturne_9_2">Nocturne Op.9 No.2</option>
          <option value="2">Prompt 2</option>
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
      <VolumeSlider />

      <div className={"w-full lg:w-3/4 h-full max-w-full max-h-full relative"}>
        <div className="container w-full h-full max-w-full max-h-full absolute" ref={trackContainerRef}>
          <Stage height={trackHeight} width={trackWidth}>
            <Layer>
              {/* <Line
                points={[0, yScale.current(playbackPos), trackWidth, yScale.current(playbackPos)]}
                stroke="red"
                opacity={0.5}
                strokeWidth={2}
                dash={[4, 4]}
                listening={false}
              /> */}
              {
                notesHistory.filter(
                  (note) =>
                    note.startTime + note.duration > visualPlaybackPos &&
                    note.startTime < visualPlaybackPos + playbackVisibleLength)
                  .map((note) => {
                    const width = xScale.current(note.pitch).width - 2
                    const height = Math.abs(yScale.current(note.duration) - yScale.current(0))
                    const x = xScale.current(note.pitch).x
                    const y = yScale.current(note.startTime) - height
                    const active = note.startTime <= visualPlaybackPos && note.startTime + note.duration >= visualPlaybackPos
                    return (
                      <Rect
                        key={`${note.pitch}-${note.startTime}`}
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        cornerRadius={width * 0.3}
                        fill={note.color}
                        opacity={note.velocity * 0.8 + 0.2}
                        shadowColor={note.color}
                        shadowBlur={active ? 24 : 8}
                        shadowOpacity={active ? 1.0 : 0.4}
                        listening={false}
                      />
                    );
                  })
              }
              {
                Object.entries(notesState).map(([pitch, note]) => {
                  const startTime = Math.max(visualPlaybackPos, note.startTime)
                  const duration = Math.max(1, visualPlaybackPos - startTime + 2)
                  const width = xScale.current(pitch).width
                  const height = Math.abs(yScale.current(duration) - yScale.current(0))
                  const x = xScale.current(pitch).x
                  const y = yScale.current(startTime) - height
                  const active = startTime <= visualPlaybackPos && startTime + duration >= visualPlaybackPos
                  return (
                    <Rect
                      key={`${pitch}-${startTime}`}
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      cornerRadius={width * 0.3}
                      fillLinearGradientStartPointY={height}
                      fillLinearGradientEndPointY={0}
                      fillLinearGradientColorStops={[
                        0, note.color,
                        1, 'rgba(0,0,0,0)'
                      ]}
                      opacity={note.velocity * 0.8 + 0.2}
                      shadowColor={note.color}
                      shadowBlur={active ? 24 : 8}
                      shadowOpacity={active ? 1.0 : 0.4}
                      listening={false}
                    />
                  )
                })
              }
            </Layer>
            <Layer>
              <PianoKeyboard
                x={0}
                y={trackHeight - keyboardHeight}
                height={keyboardHeight}
                pianoScale={xScale.current}
                // combine both notesstate and notes history
                highlightedNotes={
                  Object.entries(notesState).filter(
                    ([_, value]) => value.startTime < visualPlaybackPos
                  ).map(([_, value]) => value.value).concat(
                    notesHistory.filter(
                      (note) =>
                        note.startTime + note.duration > visualPlaybackPos &&
                        note.startTime < visualPlaybackPos
                    ).map((note) => note.pitch))
                }
              />
            </Layer>
          </Stage>
        </div>
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
