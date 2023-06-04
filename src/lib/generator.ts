import { Model } from './model';
import { WordLevelTokenizer } from './tokenizer';
import { greedy } from './sampling';

const basePath = process.env.BASE_PATH || '/aipiano'

export class GeneratorQueue {
  public queue: string[] = [];

  private maxSize: number;
  private model: Model;
  private tokenizer: WordLevelTokenizer;
  private cancelFlag: boolean = false;
  private isGenerating: boolean = false;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.model = new Model();
    this.tokenizer = new WordLevelTokenizer();
  }

  async load() {
    await Promise.all([
      this.tokenizer.loadTokenizer(`${basePath}/static/tokenizer-midipiano.json`),
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
      this.queue.push(token);
    }
    this.queue = [];
    this.isGenerating = false;
  }

  cancel() {
    this.cancelFlag = true;
  }
}
