
interface VocabConfig {
  wait_events: number
  max_wait_time: number
  velocity_events: number
  velocity_bins: number
  velocity_exp: number
  decode_end_held_note_delay: number
  decode_fix_repeated_notes: boolean
}

export interface NoteData {
  instrument: number
  pitch: number
  velocity: number
}

export class VocabUtils {
  config?: VocabConfig

  constructor() {}

  async load(url: string) {
    const response = await fetch(url)
    const data = await response.json()
    this.config = data
  }

  binToVelocity(bin: number): number {
    if (!this.config) {
      throw new Error('vocab config is not loaded')
    }
    /* py
def bin_to_velocity(self, bin: int) -> int:
    binsize = self.cfg.velocity_events / (self.cfg.velocity_bins - 1)
    if self.cfg.velocity_exp == 1.0:
        return max(0, ceil(bin * binsize - 1))
    else:
        return max(0, ceil(self.cfg.velocity_events*log(((self.cfg.velocity_exp-1)*binsize*bin)/self.cfg.velocity_events+1, self.cfg.velocity_exp) - 1))
    */
    const binsize = this.config.velocity_events / (this.config.velocity_bins - 1)
    if (this.config.velocity_exp == 1.0) {
      return Math.max(0, Math.ceil(bin * binsize - 1)) / (this.config.velocity_events - 1)
    } else {
      return Math.max(
        0,
        Math.ceil(
          this.config.velocity_events *
            Math.log(
              ((this.config.velocity_exp - 1) * binsize * bin) /
                this.config.velocity_events + 1,
            ) / Math.log(this.config.velocity_exp) - 1,
        ),
      ) / (this.config.velocity_events - 1)
    }
  }

  waitTokenToDelta(token: string): number {
    if (!this.config) {
      throw new Error('vocab config is not loaded')
    }
    return this.config.max_wait_time / this.config.wait_events * parseInt(token.substring(1)) / 1000.0
  }

  noteTokenToData(token: string): NoteData {
    /* py
def note_token_to_data(self, token: str) -> Tuple[int, int, int]:
    instr_str, note_str, velocity_str = token.strip().split(":")
    instr_bin = self.cfg._short_instrument_names_str_to_int[instr_str]
    note = int(note_str, base=16)
    velocity = self.bin_to_velocity(int(velocity_str, base=16))
    return instr_bin, note, velocity
    */
    if (!this.config) {
      throw new Error('vocab config is not loaded')
    }
    const [instr_str, note_str, velocity_str] = token.trim().split(':')
    const instr_bin = 0 // TODO
    const note = parseInt(note_str, 16)
    const velocity = this.binToVelocity(parseInt(velocity_str, 16))
    return { instrument: instr_bin, pitch: note, velocity: velocity }
  }

  tokenToData(token: string): NoteData | number {
    if (token === '<end>') {
      return 5.0
    } else if (token.startsWith('<')) {
      return 0.0
    } else if (token.startsWith('t')) {
      return this.waitTokenToDelta(token)
    } else {
      return this.noteTokenToData(token)
    }
  }
}