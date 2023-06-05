import { VocabUtils } from './vocab'

describe('VocabUtils', () => {
  describe('binToVelocity', () => {
    it('should return 0 when bin is 0', () => {
      const vocab = new VocabUtils()
      vocab.config = {
        wait_events: 10,
        max_wait_time: 1000,
        velocity_events: 100,
        velocity_bins: 10,
        velocity_exp: 0.5,
        decode_end_held_note_delay: 0,
        decode_fix_repeated_notes: false,
      }
      const result = vocab.binToVelocity(0)
      expect(result).toEqual(0)
    })

    it('should return 1 when bin is config.velocity_bins - 1', () => {
      const vocab = new VocabUtils()
      vocab.config = {
        wait_events: 10,
        max_wait_time: 1000,
        velocity_events: 100,
        velocity_bins: 10,
        velocity_exp: 0.5,
        decode_end_held_note_delay: 0,
        decode_fix_repeated_notes: false,
      }
      const result = vocab.binToVelocity(vocab.config.velocity_bins - 1)
      expect(result).toEqual(1)
    })

    it('should return a value between 0 and 1 for any other bin', () => {
      const vocab = new VocabUtils()
      vocab.config = {
        wait_events: 10,
        max_wait_time: 1000,
        velocity_events: 100,
        velocity_bins: 10,
        velocity_exp: 0.5,
        decode_end_held_note_delay: 0,
        decode_fix_repeated_notes: false,
      }
      for (let i = 1; i < vocab.config.velocity_bins - 1; i++) {
        const result = vocab.binToVelocity(i)
        expect(result).toBeGreaterThan(0)
        expect(result).toBeLessThan(1)
      }
    })

    it('should return 1 when velocity_exp is 1.0 and bin is config.velocity_bins - 1', () => {
      const vocab = new VocabUtils()
      vocab.config = {
        wait_events: 10,
        max_wait_time: 1000,
        velocity_events: 100,
        velocity_bins: 10,
        velocity_exp: 1.0,
        decode_end_held_note_delay: 0,
        decode_fix_repeated_notes: false,
      }
      const result = vocab.binToVelocity(vocab.config.velocity_bins - 1)
      expect(result).toEqual(1)
    })
  })
})
