
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

function argmin(x: Float32Array): number {
  let idx = 0
  let min = x[0]
  const n = x.length
  for (let i = 1; i < n; i++) {
    if (x[i] < min) {
      idx = i
      min = x[i]
    }
  }
  return idx
}

function cumsum(x: Float32Array): Float32Array {
  const result = new Float32Array(x.length)
  let sum = 0
  for (let i = 0; i < x.length; i++) {
    sum += x[i]
    result[i] = sum
  }
  return result
}

function softmax(x: Float32Array): Float32Array {
  let max = -Infinity
  for (let id = 0; id < x.length; id++) {
    if (x[id] > max) {
      max = x[id]
    }
  }
  let sumOfExp = 0
  const result = new Float32Array(x.length)
  for (let id = 0; id < x.length; id++) {
    const exp = Math.exp(x[id] - max)
    result[id] = exp
    sumOfExp += exp
  }
  for (let id = 0; id < x.length; id++) {
    result[id] /= sumOfExp
  }
  return result
}

function findCutoff(x: Float32Array, top_p: number): number {
  const sorted = x.slice().sort()
  for (let i = sorted.length - 1; i >= 0; i--) {
    top_p -= sorted[i]
    if (top_p < 0) {
      return sorted[i]
    }
  }
  return sorted[sorted.length - 1]
}

function randomChoice(probs: Float32Array): number {
  const sum = probs.reduce((p, c) => p + c, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < probs.length; i++) {
    r -= probs[i]
    if (r <= 0) {
      return i
    }
  }
  return probs.length - 1
}

export interface SampleLogitsOptions {
  greedy?: boolean;
  temperature?: number;
  top_p?: number;
  repetition_penalty?: RepetitionPenaltyOptions;
  preProcessProbs?: (x: Float32Array) => Float32Array;
  postProcessProbs?: (x: Float32Array) => Float32Array;
}

export interface RepetitionPenaltyOptions {
  prev_ids: Int32Array;
  penalty: number;
  view_length: number;
  max_penalty: number;
  decay_factor: number;
  exclude_ids: Int32Array;
}

export function sample(
  x: Float32Array,
  {
    greedy = false,
    temperature = 1.0,
    top_p = 0.0,
    repetition_penalty = undefined,
    preProcessProbs = undefined,
    postProcessProbs = undefined,
  }: SampleLogitsOptions
): number {
  if (greedy) {
    return argmax(x)
  }
  let probs = softmax(x)
  if (preProcessProbs) {
    probs = preProcessProbs(probs)
  }
  if (repetition_penalty) {
    const { prev_ids, penalty, view_length, max_penalty, decay_factor, exclude_ids: exclude_token_ids } = repetition_penalty
    const decays = new Float32Array(view_length)
    for (let i = 0; i < view_length; i++) {
      decays[i] = Math.pow(decay_factor, view_length - i - 1)
    }
    const mask = new Float32Array(x.length)
    for (let i = 0; i < prev_ids.length; i++) {
      mask[prev_ids[i]] = decays[i]
    }
    for (let i = 0; i < exclude_token_ids.length; i++) {
      mask[exclude_token_ids[i]] = 0
    }
    const penalty_factor = new Float32Array(x.length)
    for (let i = 0; i < x.length; i++) {
      let factor = Math.pow(x[i] < 0 ? penalty : 1 / penalty, mask[i])
      factor = Math.min(Math.max(factor, 1.0 / max_penalty), max_penalty)
      penalty_factor[i] = factor
    }
    for (let i = 0; i < x.length; i++) {
      x[i] *= penalty_factor[i]
    }
  }
  if (top_p !== 0.0) {
    const cutoff = findCutoff(probs, top_p)
    for (let i = 0; i < probs.length; i++) {
      if (probs[i] < cutoff) {
        probs[i] = 0
      }
    }
  }
  if (temperature !== 1.0) {
    for (let i = 0; i < probs.length; i++) {
      probs[i] = Math.pow(probs[i], 1.0 / temperature)
    }
  }
  if (postProcessProbs) {
    probs = postProcessProbs(probs)
  }
  return randomChoice(probs)
}
