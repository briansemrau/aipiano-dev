'use client'
import React, { useEffect, useRef } from 'react'
import * as Tone from 'tone'
import PianoOGG from 'tonejs-instrument-piano-ogg'
import { FaPlay, FaPause, FaRedo } from "react-icons/fa"
import { VolumeSlider } from '@/components/volume-slider'
import { ScaleLoader } from 'react-spinners'
import { PlaybackVisualizer } from '@/components/playback-visualizer'

type Note = {
  pitch: number
  velocity: number
  startTime: number
  color: string
  duration?: number
}

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
        minify: false,
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
  const workerRef = useRef<Worker | null>(null)
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

    if (workerRef.current) {
      console.error("changing model selection not yet supported")
      return
    }

    workerRef.current = new Worker(new URL('../workers/notes-generator.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current.onmessage = (e) => {
      const message = e.data.message as string || e.data as string
      if (message === "notes") {
        setCompletedNotes(e.data.notes)
        setNotesTotalTime(e.data.notesTotalTime)
        setPromptEndTime(e.data.promptEndTime)
      } else if (message === "error") {
        console.error(e.data.error)
      } else if (message === 'loading') {
        setIsLoadingModel(true)
      } else if (message === 'loaded') {
        setIsLoadingModel(false)
      }
    }

    return () => {
      workerRef.current?.postMessage('stop')
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
    }
    loadPrompt(prompt)
  }

  // notes
  const [notes, setCompletedNotes] = React.useState<Note[]>([])
  const [notesTotalTime, setNotesTotalTime] = React.useState<number>(0)
  const [promptEndTime, setPromptEndTime] = React.useState<number>(0)
  const [prompt, setPrompt] = React.useState<string>("nocturne_9_2")
  const promptMap: { [key: string]: string } = {
    "none": "<start>",
    "nocturne_9_2": "<start> p:46:8 t88 p:27:6 t13 p:4f:b t103 p:37:5 t1 p:3f:7 t71 p:43:7 t1 p:3a:7 t2 p:3f:7 t70 p:33:8 t78 p:4d:b t3 p:38:7 t2 p:3e:8 t61 p:4f:c t4 p:3e:8 t1 p:3b:7 p:44:7 t65",// p:4d:b t1 p:27:7 t68 p:37:6 p:3f:8 t60 p:43:7 t2 p:3a:7 p:3f:8 t69 p:4b:b t3 p:27:0 p:33:0 p:37:0 p:38:0 p:3b:0 p:3e:0 p:3f:0 p:43:0 p:44:0 p:46:0 t2 p:26:5 p:4f:0 t2 p:3a:0 t1 p:4d:0 t62 p:37:6 t1 p:3f:8 t76 p:46:a t4 p:43:7 t1 p:3f:7 t1 p:3a:7 t75 p:24:7 t7 p:26:0 p:3a:0 p:3f:0 p:46:0 t2 p:37:0 p:4b:0 t2 p:4f:b t1 p:43:0 t66 p:40:8 t1 p:37:7 t64 p:43:7 t2 p:3a:6 p:40:6 t12 p:48:9 t11 p:49:a t11 p:48:b t11 p:47:b t14 p:48:c t21 p:30:9 t2 p:24:0 p:37:0 p:3a:0 p:40:0 p:43:0 p:47:0 p:49:0 t20 p:54:c t74 p:40:9 t2 p:37:7 t61 p:4f:c t1 p:46:a t1 p:40:9 t3 p:3c:7 t68 p:29:8 p:52:c t7 p:30:0 p:37:0 p:3c:0 p:46:0 p:4f:0 p:54:0 t1 p:48:0 t1 p:40:0 t75 p:35:6 p:3d:7 t82 p:3d:7 p:40:8 t1 p:3a:6 t68 p:50:a t1 p:29:0 p:35:0 p:3a:0 p:3d:0 p:40:0 p:52:0 t1 p:29:6 t67 p:3c:7 t1 p:35:6 t90 p:4f:b t5 p:3c:6 t2 p:41:6 t1 p:38:6 t92 p:4d:b t1 p:2e:8 t8 p:38:0 p:3c:0 p:41:0 p:4f:0 p:50:0 t3 p:29:0 p:35:0 t62 p:35:6 p:3e:8 p:41:7 t63 p:44:9 t1 p:3e:9 t2 p:3a:8 t71 p:4f:c t2 p:2f:8 t5 p:2e:0 p:41:0 t1 p:35:0 p:3a:0 p:44:0 p:4d:0 t3 p:3e:0 t67 p:37:7 p:41:9",
    "revolutionary": "<start> p:47:e p:4a:e p:4d:d p:4f:d p:53:e t64 p:44:d t17 p:43:d t17 p:41:d t13 p:3e:c t12 p:3f:b t13 p:3e:b t6 p:3e:0 p:3f:0 p:41:0 p:43:0 p:44:0 p:47:0 p:4a:0 p:4d:0 p:4f:0 p:53:0 t4 p:3b:c t8 p:37:b t10 p:38:c t9 p:38:0 p:3b:0 t1 p:37:0 t1 p:37:c t11 p:35:d t9 p:32:b t9 p:35:0 p:37:0 t1 p:33:c t11 p:32:c t11 p:2f:d p:32:0 p:33:0 t9 p:2b:c t11 p:2c:c t6 p:2f:0 t2 p:2b:0 t1 p:2b:c t1 p:2c:0 t11 p:29:c t5 p:2b:0 t4 p:26:b t11 p:27:c t11 p:26:b t1 p:26:0 p:27:0 p:29:0 t11 p:24:d t12 p:1f:c t12 p:24:d t14 p:1f:c t14 p:1f:0 p:24:c p:24:0 p:44:e p:48:c p:4b:e p:4d:d p:50:d t2 p:26:0 t31 p:24:c t27 p:43:e p:4f:e t1 p:1f:b t13 p:1f:0 p:24:0 p:43:0 p:44:0 p:4b:0 p:50:0 t1 p:1f:0 p:48:0 t1 p:24:0 t1 p:4d:0 p:4f:0 t1 p:23:d p:4f:e t1 p:45:d p:4a:e p:4d:e t53 p:44:c t12 p:43:c t3 p:23:0 p:44:0 p:45:0 p:4a:0 p:4d:0 t6 p:43:0 t3 p:41:c t9 p:3e:c t12 p:3f:b t10 p:3e:b t1 p:3e:0 p:3f:0 p:41:0 t9 p:3b:c p:3e:0 t6 p:37:b t10 p:38:c t11 p:37:0 p:38:0 p:3b:0 t1 p:37:c t6 p:4f:0 t5 p:35:c t8 p:32:b t11 p:33:b t2 p:32:0 p:35:0 p:37:0 t8 p:32:b t10 p:2f:d t9 p:2b:c p:2f:0 p:32:0 p:33:0 t11 p:2c:c t10 p:2b:c t2 p:2b:0 p:2c:0 t8 p:29:c t9 p:26:c t6 p:29:0 p:2b:0 t6 p:27:c t3 p:26:0 t7 p:26:a t8 p:27:0 t4 p:24:d t12 p:1f:b t10 p:24:c t15 p:1f:c t13 p:1f:0 p:24:c p:24:0 p:44:e p:4b:d p:50:e t1 p:4d:d t10 p:1f:0 t1 p:1f:a t19 p:18:c p:24:d t26 p:1f:c p:43:e p:4f:e t18 p:18:0 p:1f:0 p:24:0 p:26:0 p:43:0 p:44:0 p:4b:0 p:4f:0 p:50:0 t2 p:4d:0 t4 p:23:d p:4d:e p:4f:e p:51:e p:56:e p:59:f t67 p:5c:e t1 p:50:d t17 p:4f:d p:5b:e t12 p:23:0 p:4f:0 p:50:0 p:51:0 p:56:0 p:59:0 p:5b:0 p:5c:0 t3 p:4d:0 t1 p:4d:d p:59:e t13 p:4a:b t1 p:56:d t10 p:4b:c t2 p:57:d t12 p:4a:c p:56:c t4 p:4a:0 p:4a:0 p:4b:0 p:4d:0 p:56:0 p:57:0 p:59:0 t3 p:53:d t1 p:47:d t11 p:43:b p:4f:c t9 p:44:b p:50:d t9 p:4f:a t1 p:43:b t1 p:43:0 p:4f:0 t1 p:44:0 p:47:0 p:50:0 p:53:0 t1 p:56:0 t6 p:4d:d t1 p:41:c t10 p:3e:b p:4a:c t9 p:3f:b p:4b:c t6 p:3e:0 p:3f:0 p:41:0 p:43:0 p:4d:0 p:4f:0 t1 p:4b:0 t4 p:4a:0 t1 p:3e:b p:4a:c t8 p:47:d t1 p:3b:c t10 p:37:b p:43:c t8 p:37:0 p:3b:0 p:43:0 p:47:0 p:4a:0 t1 p:3e:0 t1 p:38:b p:44:c t7 p:38:0 p:44:0 t4 p:37:b p:43:b t8 p:41:c t1 p:35:c t10 p:32:b p:3e:c t5 p:35:0 p:37:0 p:41:0 p:43:0 t4 p:32:0 p:33:a p:3e:0 p:3f:c t10 p:32:b p:3e:a t8 p:3b:d t1 p:2f:c t10 p:2b:b p:2f:0 p:32:0 p:33:0 p:37:c p:3b:0 p:3e:0 p:3f:0 t9 p:2b:0 t1 p:37:0 p:38:c t1 p:2c:b t9 p:2b:b t1 p:37:b t11 p:29:b p:34:b p:35:b t9 p:26:c p:32:b t5 p:29:0 p:2b:0 p:2c:0 p:34:0 p:35:0 p:37:0 p:38:0 t1 p:26:0 p:32:0 t2 p:27:b t2 p:33:b t6 p:27:0 t4 p:33:0 t1 p:26:a t1 p:32:a t8 p:26:0 t1 p:32:0 t1 p:24:a p:30:b t7 p:24:0 p:30:0 t2 p:23:b p:2f:b t16 p:2b:a p:37:b t11 p:29:a p:35:a t8 p:33:b t1 p:27:a t7 p:26:a t1 p:32:b t11 p:33:c t1 p:27:b t5 p:26:b t2 p:32:a t8 p:24:b p:30:c t3 p:23:0 p:26:0 p:27:0 p:29:0 p:2b:0 p:2f:0 p:32:0 p:33:0 p:35:0 p:37:0 t1 p:24:0 t2 p:23:c t3 p:30:0 t1 p:2f:b t1 p:23:0 t4 p:2f:0 t7 p:2e:b p:3a:d t10 p:2c:c p:38:c t10 p:2b:b p:37:c t9 p:29:b p:35:d t9 p:2b:c p:37:c t10 p:29:a p:35:a t8 p:27:c p:33:d t8 p:32:d t5 p:27:0 p:29:0 p:2b:0 p:2c:0 p:32:0 p:33:0 p:35:0 p:37:0 p:38:0 p:3a:0 t1 p:2e:0 t1 p:2b:0 t7 p:33:c p:3f:d t12 p:32:b p:3e:c t9 p:30:c p:3c:d t11 p:2f:b p:3b:d t5 p:30:0 p:32:0 p:33:0 p:3c:0 p:3e:0 p:3f:0 t6 p:3b:0 t1 p:2f:0 p:30:c p:3c:d t10 p:2f:b t1 p:3b:d t9 p:2c:b p:38:d t10 p:2b:c p:37:d t11 p:2b:0 p:2c:0 p:2f:0 p:37:0 p:38:0 p:3b:0 t1 p:2c:c p:38:c t1 p:30:0 p:3c:0 t7 p:2a:c p:2c:0 t2 p:38:0 t1 p:37:b t14 p:29:b p:2a:0 p:35:c t1 p:37:0 t9 p:27:c p:33:d t16 p:29:c p:35:c t16 p:27:c p:33:e t19 p:30:e t3 p:24:e t2 p:27:0 p:29:0 p:33:0 p:33:0 p:35:0 t3 p:29:0 t1 p:27:0 p:35:0 t9 p:30:0 t21 p:2b:c t13 p:30:b t13 p:32:b t10 p:33:d t11 p:37:c t10 p:3c:d t10 p:3e:d t11 p:3f:d t10 p:3e:c t11 p:3c:c t13 p:37:c t9 p:33:c t10 p:32:b t12 p:30:c t10 p:2b:c t15 p:24:d p:24:0 p:2b:0 p:2b:0 p:30:0 p:32:0 p:33:0 p:37:0 p:3c:0 p:3e:0 p:3f:0 t15 p:2b:c t14 p:30:b t12 p:32:b t13 p:33:c t11 p:32:a t12 p:30:c t14 p:2b:c t7 p:2b:0 p:30:0 p:32:0 p:33:0 t3 p:32:0 t1 p:24:0 t5 p:2b:0",
    "?": "<start> p:20:8 p:2c:8 p:50:a p:5c:a t50 p:20:0 p:2c:0 p:33:8 p:38:8 p:3b:8 t25 p:4b:a p:50:0 p:57:a p:5c:0 t25 p:33:0 p:33:8 p:38:0 p:38:8 p:3b:0 p:3b:8 p:4b:0 p:4b:a p:57:0 p:57:a t25 p:4b:0 p:4c:a p:57:0 p:58:a t25 p:23:8 p:2f:8 p:33:0 p:38:0 p:3b:0 p:4b:a p:4c:0 p:57:a p:58:0 t50 p:23:0 p:2f:0 p:33:8 p:38:8 p:3f:8 t25 p:44:a p:4b:0 p:50:a p:57:0 t25 p:33:0 p:33:8 p:38:0 p:38:8 p:3f:0 p:3f:8 p:44:0 p:44:a p:50:0 p:50:a t25 p:44:0 p:4b:a p:50:0 p:57:a t25 p:28:8 p:33:0 p:34:8 p:38:0 p:3f:0 p:4b:0 p:50:a p:57:0 p:5c:a t50 p:28:0 p:34:0 p:38:8 p:3d:8 t25 p:49:a p:50:0 p:55:a p:5c:0 t25 p:38:0 p:38:8 p:3d:0 p:3d:8 p:49:0 p:49:a p:55:0 p:55:a t25 p:49:0 p:4b:a p:55:0 p:57:a t25 p:25:8 p:31:8 p:38:0 p:3d:0 p:49:a p:4b:0 p:55:a p:57:0 t50 p:25:0 p:31:0 p:38:8 p:3d:8 p:40:8 t25 p:44:b p:49:0 p:50:b p:55:0 t25 p:38:0 p:38:8 p:3d:0 p:3d:8 p:40:0 p:40:8 p:44:0 p:44:b p:50:0 p:50:b t25 p:44:0 p:49:b p:50:0 p:55:b t25 p:27:8 p:33:8 p:38:0 p:3d:0 p:40:0 p:49:0 p:50:b p:55:0 p:5c:b t50 p:27:0 p:33:0 p:36:8 p:3b:8 t25 p:4e:b p:50:0 p:5a:b p:5c:0 t25 p:36:0 p:36:8 p:3b:0 p:3b:8 p:47:b p:4e:0 p:53:b p:5a:0 t25 p:47:0 p:4e:b p:53:0 p:5a:b t25 p:25:8 p:31:8 p:36:0 p:3b:0 p:4e:0 p:4e:b p:5a:0 p:5a:b t50 p:25:0 p:31:0 p:3a:8 p:40:8 t25 p:4c:b p:4e:0 p:58:b p:5a:0 t25 p:3a:0 p:3a:8 p:40:0 p:40:8 p:46:b p:4c:0 p:52:b p:58:0 t25 p:46:0 p:4c:b p:52:0 p:58:b t25 p:23:8 p:2f:8 p:3a:0 p:40:0 p:4b:b p:4c:0 p:57:b p:58:0 t51 p:23:0 p:2f:0 p:36:a p:3b:a p:3f:a t27 p:49:b p:4b:0 p:55:b p:57:0 t28 p:2c:a p:35:a p:36:0 p:3b:0 p:3b:a p:3f:0 p:41:a p:47:c p:49:0 p:53:c p:55:0 t30 p:47:0 p:53:0 p:53:c p:5f:c t32 p:2a:a p:2c:0 p:35:0 p:3b:0 p:41:0 p:4e:c p:53:0 p:5a:c p:5f:0 t69 p:36:a p:3a:a p:3d:a t38 p:28:a t38 p:27:8 p:36:0 p:37:8 p:3a:0 p:3a:8 p:3d:0 p:3f:8 p:4e:0 p:4f:b p:5a:0 p:5b:b t38 p:27:0 p:28:0 p:2a:0 p:33:8 t38 p:20:8 p:2c:8 p:33:0 p:37:0 p:3a:0 p:3f:0 p:4f:0 p:50:a p:5b:0 p:5c:a t50 p:20:0 p:2c:0 p:33:8 p:38:8 p:3b:8 t25 p:4b:a p:50:0 p:57:a p:5c:0 t25 p:33:0 p:33:8 p:38:0 p:38:8 p:3b:0 p:3b:8 p:4b:0 p:4b:a p:57:0 p:57:a t25 p:4b:0 p:4c:a p:57:0 p:58:a t25 p:23:8 p:2f:8 p:33:0 p:38:0 p:3b:0 p:4b:a p:4c:0 p:57:a p:58:0 t50 p:23:0 p:2f:0 p:33:8 p:38:8 p:3f:8 t25 p:44:a p:4b:0 p:50:a p:57:0 t25 p:33:0 p:33:8 p:38:0 p:38:8 p:3f:0 p:3f:8 p:44:0 p:44:a p:50:0 p:50:a t25 p:44:0 p:4b:a p:50:0 p:57:a t25 p:28:8 p:33:0 p:34:8 p:38:0 p:3f:0 p:4b:0 p:50:a p:57:0 p:5c:a t50 p:28:0 p:34:0 p:38:8 p:3d:8 t25 p:49:a p:50:0 p:55:a p:5c:0 t25 p:38:0 p:38:8 p:3d:0 p:3d:8 p:49:0 p:49:a p:55:0 p:55:a t25 p:49:0 p:4b:a p:55:0 p:57:a t25 p:25:8 p:31:8 p:38:0 p:3d:0 p:49:a p:4b:0 p:55:a p:57:0 t50 p:25:0 p:31:0 p:38:8 p:3d:8 p:40:8 t25 p:44:b p:49:0 p:50:b p:55:0 t25 p:38:0 p:38:8 p:3d:0 p:3d:8 p:40:0 p:40:8 p:44:0 p:44:b p:50:0 p:50:b t25 p:44:0 p:49:b p:50:0 p:55:b t25 p:27:8 p:33:8 p:38:0 p:3d:0 p:40:0 p:49:0 p:50:b p:55:0 p:5c:b t50 p:27:0 p:33:0 p:36:8 p:3b:8 t25 p:4e:b p:50:0 p:5a:b p:5c:0 t25 p:36:0 p:36:8 p:3b:0 p:3b:8 p:47:b p:4e:0 p:53:b p:5a:0 t25 p:47:0 p:4e:b p:53:0 p:5a:b t25 p:25:8 p:31:8 p:36:0 p:3b:0 p:4e:0 p:4e:b p:5a:0 p:5a:b t50 p:25:0 p:31:0 p:3a:8 p:40:8 t25 p:4c:b p:4e:0 p:58:b p:5a:0 t25 p:3a:0 p:3a:8 p:40:0 p:40:8 p:46:b p:4c:0 p:52:b p:58:0 t25 p:46:0 p:4c:b p:52:0 p:58:b t25 p:23:8 p:2f:8 p:3a:0 p:40:0 p:4b:b p:4c:0 p:57:b p:58:0 t51 p:23:0 p:2f:0 p:36:a p:3b:a p:3f:a t27 p:49:b p:4b:0 p:55:b p:57:0 t28 p:2c:a p:35:a p:36:0 p:3b:0 p:3b:a p:3f:0 p:41:a p:47:c p:49:0 p:53:c p:55:0 t30 p:47:0 p:53:0 p:53:c p:5f:c t32 p:2a:a p:2c:0 p:35:0 p:3b:0 p:41:0 p:4e:c p:53:0 p:5a:c p:5f:0 t69 p:36:a p:3a:a p:3d:a t38 p:2c:a t38 p:2a:8 p:31:8 p:36:0 p:3a:0 p:3a:8 p:3d:0 p:4e:0 p:50:b p:5a:0 t38 p:28:8 p:2a:0 p:2c:0 t38 p:27:8 p:28:0 p:31:0 p:33:8 p:3a:0 p:4e:a p:50:0 t50 p:27:0 p:33:0 p:36:8 p:3a:8 t25 p:4c:a t25 p:23:8 p:2f:8 p:36:0 p:36:8 p:3a:0 p:3b:8 p:4b:b t25 p:4b:0 p:4c:0 p:4e:0 p:57:b t25 p:23:0 p:2a:8 p:2f:0 p:36:0 p:3b:0 p:55:b p:57:0 t50 p:2a:0 p:36:8 p:3a:8 p:3d:8 t25 p:52:b t25 p:36:0 p:36:8 p:3a:0 p:3a:8 p:3d:0 p:4e:a t25 p:4c:a p:4e:0 p:52:0 p:55:0 t25 p:23:8 p:2f:8 p:36:0 p:3a:0 p:4b:a p:4c:0 t50 p:23:0 p:2f:0 p:33:8 p:36:8 t25 p:49:a t25 p:20:8 p:2c:8 p:33:0 p:33:8 p:36:0 p:38:8 p:47:b t25 p:47:0 p:49:0 p:4b:0 p:53:b t25 p:20:0 p:27:8 p:2c:0 p:33:0 p:38:0 p:52:b p:53:0 t50 p:27:0 p:33:8 p:36:8 p:3a:8 t25 p:4e:b t25 p:33:0 p:33:8 p:36:0 p:36:8 p:3a:0 p:4b:a t25 p:49:a p:4b:0 p:4e:0 p:52:0 t25 p:20:8 p:2c:8 p:33:0 p:36:0 p:47:a p:49:0 t25 p:4b:a t25 p:20:0 p:2c:0 p:2f:a p:33:a p:53:a t25 p:46:a p:4b:0 p:52:a p:53:0 t25 p:1c:b p:28:b p:2f:0 p:2f:b p:33:0 p:34:b p:44:b p:46:0 p:47:0 p:52:0 t25 p:50:a t25 p:19:b p:1c:0 p:25:b p:28:0 p:2f:0 p:34:0 p:44:0 p:50:0 p:50:b t25 p:55:a t25 p:19:0 p:25:0 p:34:b p:38:b p:5c:a t25 p:4c:b p:55:0 p:58:a p:5c:0 t25 p:1c:a p:28:a p:34:0 p:34:a p:38:0 p:38:a p:3a:a p:49:a p:4c:0 p:50:0 p:58:0 t25 p:55:a t25 p:1b:a p:1c:0 p:27:a p:28:0 p:34:0 p:38:0 p:3a:0 p:47:a p:49:0 p:55:0 t25 p:53:a t26 p:1b:0 p:27:0 p:33:8 p:38:8 p:3b:8 p:57:a t27 p:53:a t28 p:27:8 p:33:0 p:33:8 p:37:8 p:38:0 p:3b:0 p:3d:8 p:46:a p:47:0 p:57:a t30 p:52:a p:53:0 p:57:0 t32 p:20:8 p:27:0 p:2c:8 p:33:0 p:37:0 p:3d:0 p:44:a p:46:0 p:52:0 t33 p:50:a t35 p:20:0 p:2c:0 p:33:8 p:38:8 p:3b:8 p:57:a t38 p:53:a t38 p:33:0 p:33:8 p:38:0 p:38:8 p:3b:0 p:44:0 p:52:a t38 p:50:0 p:50:a p:52:0 p:53:0 p:57:0 t38 p:27:8 p:33:0 p:33:8 p:38:0 p:4e:a p:50:0 t50 p:27:0 p:33:0 p:36:8 p:3a:8 t25 p:4c:a t25 p:23:8 p:2f:8 p:36:0 p:36:8 p:3a:0 p:3b:8 p:4b:b t25 p:4b:0 p:4c:0 p:4e:0 p:57:b t25 p:23:0 p:2a:8 p:2f:0 p:36:0 p:3b:0 p:55:b p:57:0 t50 p:2a:0 p:36:8 p:3a:8 p:3d:8 t25 p:52:b t25 p:36:0 p:36:8 p:3a:0 p:3a:8 p:3d:0 p:4e:a t25 p:4c:a p:4e:0 p:52:0 p:55:0 t25 p:23:8 p:2f:8 p:36:0 p:3a:0 p:4b:a p:4c:0 t50 p:23:0 p:2f:0 p:33:8 p:36:8 t25 p:49:a t25 p:20:8 p:2c:8 p:33:0 p:33:8 p:36:0 p:38:8 p:47:b t25 p:47:0 p:49:0 p:4b:0 p:53:b t25 p:20:0 p:27:8 p:2c:0 p:33:0 p:38:0 p:52:b p:53:0 t50",
    "reverie": "<start> p:3a:5 t72 p:3c:5 t46 p:3e:7 t41 p:43:9 t67 p:3e:8 t38 p:3c:7 t42 p:3a:7 t20 p:3a:0 p:3c:0 p:3e:0 p:3e:0 t50 p:3c:7 t43 p:3e:7 t48 p:43:8 t81 p:3e:6 t47 p:3c:8 t61 p:3a:6 t13 p:3a:0 p:3c:0 p:3e:0 p:43:0 t65 p:4f:a t3 p:1f:5 t58 p:3c:7 t36 p:3e:7 t34 p:43:8 t35 p:4a:9 t32 p:3e:7 t39 p:3c:8 t50 p:3a:7 t19 p:1f:0 p:3a:0 p:3c:0 p:3e:0 p:43:0 t62 p:3c:7 t37 p:4c:9 t3 p:3e:6 t30 p:4d:a t6 p:43:8 t33 p:4f:b t28 p:3e:8 t31 p:4c:b t3 p:3c:8 p:43:6 t30 p:4a:b t3 p:3a:8 t39 p:3a:0 p:3c:0 p:3e:0 p:43:0 p:4a:0 p:4c:0 p:4f:0 t1 p:4c:0 t2 p:4c:b t27 p:3c:8 t22 p:48:a t24 p:3e:7 t22 p:4c:a t27 p:43:7 t32 p:4a:9 t33 p:3e:7 t35 p:3c:7 t47 p:3a:7 t19 p:3a:0 p:3c:0 p:3e:0 p:43:0 p:48:0 p:4a:0 p:4c:0 t2 p:3e:0 t3 p:4d:0 t9 p:4f:0 t51 p:3c:6 t38 p:3e:6 t36 p:43:7 t33 p:46:a t28 p:3e:8 t30 p:43:7 p:4a:b t6 p:3c:7 t25 p:3a:9 t28 p:4c:b t6 p:39:9 t1 p:3e:5 t7 p:3a:0 p:3c:0 p:3e:0 p:43:0 p:46:0 p:4a:0 p:4c:0 t16 p:3e:0 t4 p:3a:a t29 p:4d:c t2 p:3c:9 t29 p:41:8 t1 p:4c:0 t37 p:48:a t47 p:3c:7 t39 p:3a:7 t34 p:39:7 t34 p:37:7 t11 p:39:0 p:39:0 p:3a:0 p:3a:0 p:3c:0 p:41:0 t4 p:3c:0 p:4d:0 t15 p:39:8 t31 p:3a:9 t9 p:39:0 t22 p:40:8 t45 p:43:a t38 p:3a:8 t39 p:39:8 t38 p:37:8 t62 p:45:a t5 p:29:7 p:41:4 t15 p:37:0 p:39:0 p:3a:0 p:40:0 p:43:0 p:48:0 t33 p:30:6 t31 p:39:7 t31 p:41:7 t29 p:3e:8 t29 p:39:8 t33 p:3c:8 t1 p:30:5 t31 p:41:7 t32 p:29:8 t34 p:30:7 t34 p:39:7 t32 p:41:7 t35 p:3e:7 t36 p:39:8 t43 p:3c:6 t42 p:41:6 t93 p:51:b t7 p:26:7 t11 p:29:0 p:30:0 p:39:0 p:3c:0 p:3e:0 p:41:0 t27 p:2d:8 t33 p:32:8 t27 p:35:8 t31 p:4c:a t2 p:39:9 t27 p:3c:9 t30 p:40:9 t31 p:3c:9 t31 p:39:9 t34 p:35:8 t39 p:48:a t2 p:39:7 t29 p:4c:a t2 p:3c:9 t36 p:4a:a t2 p:2b:a t8 p:26:0 p:35:0 p:39:0 p:3c:0 p:45:0 p:4c:0 t16 p:32:0 t2 p:32:a t29 p:37:9 t3 p:46:a t27 p:3a:a t1 p:43:a t48 p:2d:0 p:32:0 p:35:0 p:37:0 p:39:0 p:3a:0 p:40:0 p:43:0 p:46:0 p:4a:0 p:4c:0 p:51:0 t1 p:48:0 t1 p:2b:0 t1 p:3c:0",
  }
  // update notes from prompt
  function loadPrompt(prompt: string) {
    console.log("prompt", prompt)
    console.log("crossOriginIsolated: " + self.crossOriginIsolated)
    workerRef.current?.postMessage({ message: 'start', prompt: promptMap[prompt], crossOriginIsolated: self.crossOriginIsolated })
  }
  useEffect(() => {
    restartPlayback()
  }, [prompt])

  // start playback animation
  const timerId = useRef(0)
  const lastPlaybackPos = useRef(0)
  useEffect(() => {
    function updatePlaybackPos() {
      timerId.current = requestAnimationFrame(() => {
        let currentTime = Tone.getTransport().seconds
        // if playback is getting close to notesTotalTime, slow down
        const slowdownThreshold = 5.0
        const stopThreshold = 0.5
        const d = notesTotalTime - currentTime - stopThreshold
        const speed = Math.max(0, Math.min(1, d / slowdownThreshold))
        if (speed < 1) {
          const dt = Math.max(0, currentTime - lastPlaybackPos.current)
          currentTime -= dt * (1 - speed)
          setPlaybackStartTime((playbackStartTime) => playbackStartTime + dt * (1 - speed))
          Tone.getTransport().seconds = currentTime
        }

        workerRef.current?.postMessage({ message: 'updateTime', minNotesTotalTime: currentTime - 1, maxNotesTotalTime: currentTime + playbackVisibleLength + 1 })

        setPlaybackPos(currentTime);
        lastPlaybackPos.current = currentTime;

        updatePlaybackPos();
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
          <option value="revolutionary">Revolutionary Etude</option>
          <option value="?">?</option>
          <option value="reverie">Rêverie</option>
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
          promptEndTime={promptEndTime}
          notes={notes}
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
