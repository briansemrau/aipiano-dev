import * as ort from "onnxruntime-web"

export class Model {
  session: ort.InferenceSession | null = null
  n_layer: number = 0
  n_embd: number = 0

  constructor() {}

  async loadModel(uri: string, n_layer: number, n_embd: number) {
    this.n_layer = n_layer
    this.n_embd = n_embd
    ort.env.wasm.proxy = true;
    if (self.crossOriginIsolated) {
      ort.env.wasm.numThreads = Math.max(1, navigator.hardwareConcurrency * 0.5);
    }
    ort.env.logLevel = 'verbose';
    let options: ort.InferenceSession.SessionOptions = {
      executionProviders: ['wasm'],
      graphOptimizationLevel: "all",
    }
    if (uri.endsWith('.ort')) {
      options = {
        executionProviders: ['wasm'],
        enableMemPattern: false,
        enableCpuMemArena: false,
        extra: {
          session: {
            disable_prepacking: "1",
            use_device_allocator_for_initializers: "0",
            use_ort_model_bytes_directly: "1",
            use_ort_model_bytes_for_initializers: "1",
          }
        }
      }
    }
    this.session = await ort.InferenceSession.create(uri, options)
  }

  async forward(ids: number | Int32Array | ort.Tensor, state: ort.Tensor | null) {
    if (this.session === null) {
      throw new Error('Model not loaded')
    }

    // initialize RWKV RNN state
    let x: ort.Tensor | null = null
    if (state === null) {
      const data = new Float32Array(this.n_layer * 5 * this.n_embd).fill(0)
      for (let i = 0; i < this.n_layer; i++) {
        data.fill(-1e30, (5*i+4)*this.n_embd, (5*i+5)*this.n_embd)
      }
      state = new ort.Tensor(data, [this.n_layer * 5, this.n_embd])
    }
    
    let ctx: Int32Array
    if (typeof ids === 'number') {
      ctx = new Int32Array([ids])
    } else if (ids instanceof Int32Array) {
      ctx = ids
    } else {
      ctx = ids.data as Int32Array
    }
    if (ctx.length === 0) {
      throw new Error('Context must not be empty')
    }

    // feed context
    for (let i = 0; i < ctx.length; i++) {
      const idx = ctx[i]

      const feeds = {
        'idx': new ort.Tensor('int32', [idx], [1]),
        'state': state,
      };
      const results = await this.session.run(feeds)
      
      state = results.state_r as ort.Tensor
      x = results.x as ort.Tensor
    }

    return {
      'x': x as ort.Tensor,
      'state': state
    }
  }
}
