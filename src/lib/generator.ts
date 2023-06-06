import { Model } from '../utils/model';
import { WordLevelTokenizer } from '@/utils/tokenizer';
import { sample } from '../utils/sampling';
import { VocabUtils, NoteData } from '../utils/vocab';

const basePath = process.env.BASE_PATH || '/aipiano'

export type QueueDataType = NoteData | number;

export class GeneratorQueue {
  public queue: QueueDataType[] = [];

  private maxSize: number;

  private model: Model;
  public tokenizer: WordLevelTokenizer;
  public vocabUtils: VocabUtils;
  
  private cancelFlag: boolean = false;
  private isGenerating: boolean = false;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.model = new Model();
    this.tokenizer = new WordLevelTokenizer();
    this.vocabUtils = new VocabUtils();
  }

  async load() {
    await Promise.all([
      this.tokenizer.loadTokenizer(`${basePath}/static/tokenizer-midipiano.json`),
      this.vocabUtils.load(`${basePath}/static/vocab_config_piano.json`),
      this.model.loadModel(`${basePath}/static/gmp_tiny.onnx`, 16, 256)
    ]);
  }

  async generate(prompt: string = '') {
    if (this.isGenerating) {
      throw new Error('Already generating');
    }
    this.cancelFlag = false;
    this.isGenerating = true;

    let state = null;
    let x = null;
    let ids = prompt ? this.tokenizer.encode(prompt) : 0;

    const repetitionPenaltyViewLength = 32;
    // exclude 3 thru 127
    const repetitionPenaltyExcludeIds = new Int32Array(125);
    for (let i = 0; i < repetitionPenaltyExcludeIds.length; i++) {
      repetitionPenaltyExcludeIds[i] = i + 3;
    }

    let prev_ids = new Int32Array(repetitionPenaltyViewLength);
    if (ids instanceof Int32Array) {
      prev_ids.set(ids.subarray(Math.max(0, ids.length - repetitionPenaltyViewLength + 1)));
    } else {
      prev_ids[-1] = ids;
    }

    outer: while (true) {
      if (this.cancelFlag) {
        break outer;
      }
      while (this.queue.length >= this.maxSize) {
        if (this.cancelFlag) {
          break outer;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const result = await this.model.forward(ids, state);
      state = result.state;
      x = result.x.data as Float32Array;
      ids = sample(x, {
        temperature: 1.0,
        top_p: 0.8,
        repetition_penalty: {
          prev_ids: prev_ids,
          penalty: 1.1,
          view_length: repetitionPenaltyViewLength,
          max_penalty: 1.5,
          decay_factor: 0.99,
          exclude_ids: repetitionPenaltyExcludeIds
        },
        preProcessProbs: (x) => {
          x[0] = 0;
          x.fill(0, 128, 270);
          x.fill(0, 1680, 2175);
          return x;
        }
      });

      // <pad> <end> reset state
      if (ids === 0 || ids === 2) {
        state = null;
      }

      // add id to prev_ids
      prev_ids.set(prev_ids.subarray(1), 0);
      prev_ids[prev_ids.length - 1] = ids;

      const token = this.tokenizer.decode(ids);
      // console.log(ids + ": " + token)
      if (token === '<pad>') {
        break outer; // something went wrong
      }
      this.queue.push(this.vocabUtils.tokenToData(token));
    }
    this.queue = [];
    this.isGenerating = false;
  }

  async cancel() {
    this.cancelFlag = true;
    while (this.isGenerating) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
