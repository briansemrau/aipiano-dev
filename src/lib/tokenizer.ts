
interface EncoderMapping {
  [key: string]: number
}

interface DecoderMapping {
  [key: number]: string
}

export class WordLevelTokenizer {
  tokenizer: any
  encoder: EncoderMapping = {}
  decoder: DecoderMapping = {}

  constructor() {}

  async loadTokenizer(url: string) {
    const response = await fetch(url)
    this.tokenizer = await response.json()
    for (const [key, value] of Object.entries(this.tokenizer.model.vocab)) {
      this.encoder[key] = value as number;
      this.decoder[value as number] = key
    }
  }

  encode(text: string): Int32Array {
    if (!this.encoder) {
      throw new Error('Encoder not loaded')
    }
    const words = text.split(' ')
    const tokens = words.map(word => this.encoder[word])
    return new Int32Array(tokens)
  }

  decode(tokens: number | number[] | Int32Array): string {
    if (!this.decoder) {
      throw new Error('Decoder not loaded')
    }
    if (tokens instanceof Int32Array) {
      tokens = Array.from(tokens)
    }
    if (typeof tokens === 'number') {
      return this.decoder[tokens]
    }
    const words = tokens.map(token => this.decoder[token])
    return words.join(' ')
  }
}
