import React, { useEffect, useImperativeHandle, useRef } from 'react'
import { scaleLinear } from 'd3-scale'
import { scalePiano } from '@/utils/piano-scale'
import { Stage, Layer, Rect, Line } from 'react-konva'
import { PianoKeyboard } from '@/components/piano-keyboard'
import { getNoteName } from '@/utils/notes'
import * as Tone from 'tone'

export type NoteBlock = {
  pitch: number
  velocity: number
  duration?: number
  startTime: number
  color: string
}

export interface PlaybackVisualizerProps {
  playbackVisibleLength?: number
  playbackStartTime?: number
  queueOffset?: number
  playbackPos?: number
  notesTotalTime?: number
  promptEndTime?: number
  notes?: Array<NoteBlock>
  synth?: Tone.Sampler | Tone.PolySynth | null
}

export const PlaybackVisualizer = (
  props: PlaybackVisualizerProps,
) => {
  const {
    playbackVisibleLength = 5,
    playbackStartTime = 0,
    queueOffset = 0.1,
    playbackPos = 0,
    notesTotalTime = 0,
    promptEndTime = 0,
    notes = [],
    synth = null
  } = props

  const [visualPlaybackPos, setVisualPlaybackPos] = React.useState<number>(queueOffset)

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
  }, [])
  useEffect(() => {
    // update scales
    xScale.current = scalePiano().range([0, trackWidth]);
    yScale.current = scaleLinear().range([(trackHeight - keyboardHeight), 0]);
    yScale.current.domain([visualPlaybackPos, visualPlaybackPos + playbackVisibleLength]);
  }, [trackWidth, trackHeight])

  // play notes, delete old ones
  const lastPlaybackPos = useRef(0)
  useEffect(() => {
    if (lastPlaybackPos.current > playbackPos) {
      // restarted
      lastPlaybackPos.current = playbackPos
      return
    }

    // play new notes
    notes.forEach((note) => {
      if (note.startTime >= lastPlaybackPos.current && note.startTime < playbackPos) {
        const pitch = getNoteName(note.pitch)
        synth?.triggerAttack(pitch, note.startTime + playbackStartTime + queueOffset, note.velocity)
      }
      if (note.duration) {
        const duration = Math.max(1.0, note.duration) // keep the sampler from clipping
        if (note.startTime + duration >= lastPlaybackPos.current && note.startTime + duration < playbackPos) {
          const pitch = getNoteName(note.pitch)
          synth?.triggerRelease(pitch, note.startTime + duration + playbackStartTime + queueOffset)
        }
      }
    })

    lastPlaybackPos.current = playbackPos
  }, [playbackPos])

  useEffect(() => {
    setVisualPlaybackPos(playbackPos - queueOffset)
  }, [playbackPos])

  return (
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
          <Line
            points={[0, yScale.current(notesTotalTime), trackWidth, yScale.current(notesTotalTime)]}
            stroke="gray"
            opacity={0.5}
            strokeWidth={2}
            dash={[4, 4]}
            listening={false}
          />
          <Line
            points={[0, yScale.current(promptEndTime), trackWidth, yScale.current(promptEndTime)]}
            stroke="green"
            opacity={0.5}
            strokeWidth={4}
            dash={[10, 6]}
            listening={false}
          />
          {
            notes.filter(
              (note) =>
                (note.duration ? note.startTime + note.duration > visualPlaybackPos : true) &&
                note.startTime < visualPlaybackPos + playbackVisibleLength)
              .map((note) => {
                const startTime = Math.max(visualPlaybackPos, note.startTime)
                const duration = Math.max(0.1, note.duration || (notesTotalTime - startTime))
                const active = note.startTime <= visualPlaybackPos && note.startTime + duration >= visualPlaybackPos

                const width = xScale.current(note.pitch).width - 2
                const height = Math.max(2, Math.abs(yScale.current(duration) - yScale.current(0)) - 2)
                const x = xScale.current(note.pitch).x
                const y = yScale.current(note.startTime) - height
                const gradientStart = 1.0 / duration
                const gradientStop = 3.0 / duration
                return (
                  <Rect
                    key={`${note.pitch}-${note.startTime}`}
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    cornerRadius={Math.min(width * 0.3, height / 2)}
                    opacity={note.velocity * 0.7 + 0.3}
                    shadowColor={note.color}
                    shadowBlur={active ? 24 : 8}
                    shadowOpacity={active ? 1.0 : 0.4}
                    listening={false}
                    {...(
                      gradientStart < 1.0 &&
                      {
                        fillLinearGradientStartPointY: height,
                        fillLinearGradientEndPointY: 0,
                        fillLinearGradientColorStops: [
                          0, note.color,
                          gradientStart, note.color,
                          Math.min(1, gradientStop), `rgba(0,0,0,${Math.max(0, 1.0 - 1.0 / gradientStop)})`
                        ],
                      })
                    }
                    {...(gradientStart >= 1.0 && {
                      fill: note.velocity <= 0.01 ? 'red' : note.color,
                    })}
                  />
                );
              })
          }
        </Layer>
        <Layer>
          <PianoKeyboard
            x={0}
            y={trackHeight - keyboardHeight}
            height={keyboardHeight}
            pianoScale={xScale.current}
            highlightedNotes={
              notes.filter(
                (note) =>
                  (note.duration ? note.startTime + note.duration > visualPlaybackPos : true) &&
                  note.startTime < visualPlaybackPos
              ).map((note) => note.pitch)}
          />
        </Layer>
      </Stage>
    </div>
  )
}
