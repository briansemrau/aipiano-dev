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

type NoteData = {
  value: number
  velocity: number
  startTime: number
}

type NoteBlock = {
  pitch: number
  velocity: number
  duration: number
  startTime: number
}

// as note events come in, we need to track which notes are on and handle them when they turn off
type NotesState = {
  [key: number]: NoteData
}

type NotesHistory = Array<NoteBlock>

export default function Home() {
  const queueOffset = 0.1

  const [playbackStart, setPlaybackStart] = React.useState<number>(0)
  const [playbackPos, setPlaybackPos] = React.useState<number>(0)
  const [visualPlaybackPos, setVisualPlaybackPos] = React.useState<number>(queueOffset)
  const [notesState, setNotesState] = React.useState<NotesState>({})
  const [notesHistory, setNotesHistory] = React.useState<NotesHistory>([])
  const [prompt, setPrompt] = React.useState<string>("nocturne_9_2")
  const timerId = useRef(0)
  const [synth, setSynth] = React.useState<Tone.Sampler | null>(null)

  const trackHeight = 600;
  const trackWidth = 800;
  const keyboardHeight = 70;
  const playbackVisibleLength = 5;
  const xScale = useRef(scalePiano().range([0, trackWidth]));
  const yScale = useRef(scaleLinear().range([(trackHeight - keyboardHeight), 0]));
  yScale.current.domain([visualPlaybackPos, visualPlaybackPos + playbackVisibleLength]);

  async function togglePlayback() {
    if (typeof window === 'undefined') {
      return
    }
    if (Tone.getTransport().state === "started") {
      // pause
      Tone.getTransport().pause()
      //synth?.releaseAll()
    } else if (Tone.getTransport().state === "paused") {
      // resume
      Tone.getTransport().start()
    } else {
      // start
      if (synth === null) {
        //setSynth(new Tone.PolySynth().toDestination())
        setSynth(new PianoOGG({ minify: true }).toDestination())
      }
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
  function selectPrompt(prompt: string) {
    console.log("prompt", prompt)
    switch (prompt) {
      case "none":
        setNotesHistory([])
        setNotesState({})
        break;
      case "nocturne_9_2":
        setNotesHistory([
          { pitch: 60, velocity: 1, duration: 1, startTime: 0 },
          { pitch: 61, velocity: 0.5, duration: 1.5, startTime: 1 },
          { pitch: 64, velocity: 0.1, duration: 1, startTime: 4 },
          { pitch: 59, velocity: 1, duration: 1, startTime: 5 },
        ])
        setNotesState({
          50: { value: 50, velocity: 1, startTime: 0 },
          51: { value: 51, velocity: 1, startTime: 1 },
          52: { value: 52, velocity: 0.5, startTime: 4 },
        })
        break;
      case "2":
        setNotesHistory([
          { pitch: 48, velocity: 1, duration: .2, startTime: 0 },
          { pitch: 52, velocity: 1, duration: .2, startTime: 0.1 },
          { pitch: 55, velocity: 1, duration: .2, startTime: 0.2 },
          { pitch: 60, velocity: 1, duration: .2, startTime: 0.3 },
          { pitch: 55, velocity: 1, duration: .2, startTime: 0.4 },
          { pitch: 52, velocity: 1, duration: .2, startTime: 0.5 },
          { pitch: 48, velocity: 1, duration: .2, startTime: 0.6 },
        ])
        setNotesState({})
        break;
    }
  }
  useEffect(() => {
    selectPrompt(prompt)
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

  // start playback animation
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
    <main className="flex min-h-screen flex-col items-center justify-between p-4">
      {/* <div className="flex items-center justify-center mt-3">
        <ColorSchemeToggleButton />
      </div> */}
      {/* <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Get started by editing&nbsp;
          <code className="font-mono font-bold">src/app/page.tsx</code>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <a
            className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
            href="https://vercel.com?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            By{' '}
            <Image
              src="/vercel.svg"
              alt="Vercel Logo"
              className="dark:invert"
              width={100}
              height={24}
              priority
            />
          </a>
        </div>
      </div> */}

      {/* <div className="relative flex place-items-center before:absolute before:h-[300px] before:w-[480px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[240px] after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 before:lg:h-[360px]">
        <Image
          className="relative dark:drop-shadow-[0_0_0.3rem_#ffffff70] dark:invert"
          src="/next.svg"
          alt="Next.js Logo"
          width={180}
          height={37}
          priority
        />
      </div> */}
      <div className="horizontal-container">
        <select className="rounded-lg border border-gray-300 px-2 py-1 mr-2" onChange={(event) => setPrompt(event.target.value)} value={prompt}>
          <option value="none">Unconditional</option>
          <option value="nocturne_9_2">Nocturne Op.9 No.2</option>
          <option value="2">Prompt 2</option>
        </select>
        {/* <button onClick={togglePlayback} className="rounded-lg border border-gray-300 px-2 py-1 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          {Tone.getTransport().state === "started" ? "stop" : "play"}
        </button> */}
      </div>
      <div className="flex items-center justify-center gap-4">
        <button onClick={togglePlayback} className="rounded-lg border border-gray-300 px-3 py-2 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          {Tone.getTransport().state === "started" ? <FaPause /> : <FaPlay />}
        </button>
        <button onClick={restartPlayback} className="rounded-lg border border-gray-300 px-3 py-2 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <FaRedo />
        </button>
      </div>

      <Stage height={trackHeight} width={trackWidth}>
        <Layer>
          <Line
            points={[0, yScale.current(playbackPos), trackWidth, yScale.current(playbackPos)]}
            stroke="red"
            opacity={0.5}
            strokeWidth={2}
            dash={[4, 4]}
          />
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
                    cornerRadius={4}
                    fill={`rgba(0, 255, 255, ${note.velocity * 0.8 + 0.2})`}
                    shadowColor="cyan"
                    shadowBlur={active ? 24 : 8}
                    shadowOpacity={active ? 1.0 : 0.4}
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
                  cornerRadius={4}
                  fillLinearGradientStartPointY={height}
                  fillLinearGradientEndPointY={0}
                  fillLinearGradientColorStops={[
                    0, `rgba(0,255,255,${note.velocity * 0.8 + 0.2})`,
                    0.5, `rgba(0,255,255,${(note.velocity * 0.8 + 0.2) * 0.33})`,
                    1, 'rgba(0,0,0,0)'
                  ]}
                  shadowColor="cyan"
                  shadowBlur={active ? 24 : 8}
                  shadowOpacity={active ? 1.0 : 0.4}
                />
              )
            })
          }
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
