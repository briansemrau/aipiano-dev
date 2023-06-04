// from https://codesandbox.io/s/midi-viz-678om

import { Rect, Group, Text } from "react-konva";
export const PianoKeyboard = ({
  x,
  y,
  height,
  pianoScale,
  highlightedNotes
}) => {
  return (
    <Group x={x} y={y}>
      {pianoScale.whiteKeys().map((whiteKey, i) => {
        return (
          <Group key={whiteKey.midiCode} x={whiteKey.x} y={0}>
            <Rect
              x={0}
              y={0}
              stroke="black"
              fill={
                highlightedNotes.includes(whiteKey.midiCode)
                  ? "darkgrey"
                  : "white"
              }
              width={whiteKey.width}
              height={height}
              listening={false}
            ></Rect>
            <Text
              x={0}
              y={height}
              fontSize={9}
              fill={
                highlightedNotes.includes(whiteKey.midiCode) ? "white" : "black"
              }
              text={`N${whiteKey.noteName}`}
              listening={false}
            />
          </Group>
        );
      })}
      {pianoScale.blackKeys().map((blackKey) => {
        return (
          <Group key={blackKey.midiCode} x={blackKey.x} y={0}>
            <Rect
              x={0}
              y={0}
              fill={
                highlightedNotes.includes(blackKey.midiCode)
                  ? "dimgrey"
                  : "black"
              }
              height={height * 0.55}
              width={blackKey.width}
              listening={false}
            ></Rect>
          </Group>
        );
      })}
    </Group>
  );
};
