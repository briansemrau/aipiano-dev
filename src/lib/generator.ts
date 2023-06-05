import { Model } from './model';
import { WordLevelTokenizer } from './tokenizer';
import { greedy } from './sampling';
import { VocabUtils, NoteData } from './vocab';

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
      ids = greedy(x);

      // <end> reset state
      if (ids === 0) {
        state = null;
      }

      const token = this.tokenizer.decode(ids);
      console.log(token)
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
