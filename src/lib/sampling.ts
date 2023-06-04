
function argmax(x: Float32Array): number {
  let idx = 0
  let max = x[0]
  const n = x.length
  for (let i = 1; i < n; i++) {
    if (x[i] > max) {
      idx = i
      max = x[i]
    }
  }
  return idx
}
  

export function greedy(x: Float32Array): number {
  return argmax(x)
}

// export function sampleLogits(
//   temperature: number = 1.0,
//   top_k: number = 0,
//   top_p: number = 0.0,
//   repetition_penalty: number = 1.0,
// ): number {
// }
