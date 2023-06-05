import rewire from 'rewire';

describe('argmax', () => {
  it('should return the index of the maximum value in an array', () => {
    const argmax = rewire('./sampling').__get__('argmax');
    const arr = new Float32Array([1, 2, 3, 2, 1]);
    expect(argmax(arr)).toEqual(2);
  });
});

describe('cumsum', () => {
  it('should return the cumulative sum of an array', () => {
    const cumsum = rewire('./sampling').__get__('cumsum');
    const arr = new Float32Array([1, 2, 3, 4, 5]);
    const expected = new Float32Array([1, 3, 6, 10, 15]);
    const result = cumsum(arr);
    for (let i = 0; i < arr.length; i++) {
      expect(result[i]).toBeCloseTo(expected[i]);
    }
  });
});

describe('sort', () => {
  it('should return a sorted array', () => {
    const sort = rewire('./sampling').__get__('sort');
    const arr = new Float32Array([1, 2, 3, 2, 1]);
    const expected = new Float32Array([3, 2, 2, 1, 1]);
    const result = sort(arr);
    for (let i = 0; i < arr.length; i++) {
      expect(result[i]).toBeCloseTo(expected[i]);
    }
  });
});

describe('softmax', () => {
  it('should return the softmax of an array', () => {
    const softmax = rewire('./sampling').__get__('softmax');
    const arr = new Float32Array([1, 2, 3, 2, 1]);
    const expected = new Float32Array([0.067, 0.183, 0.498, 0.183, 0.067]);
    const result = softmax(arr);
    for (let i = 0; i < arr.length; i++) {
      expect(result[i]).toBeCloseTo(expected[i]);
    }
  });
});

describe('findCutoff', () => {
  it('should return the cutoff value for a given top_p', () => {
    const findCutoff = rewire('./sampling').__get__('findCutoff');
    const sort = rewire('./sampling').__get__('sort');
    const arr = new Float32Array([0.1, 0.2, 0.3, 0.2, 0.1]);
    expect(findCutoff(sort(arr), 0.5)).toBeCloseTo(0.2);
  });
});

describe('sampleLogits', () => {
  it('should return the index of the maximum value if greedy is true', () => {
    const sampleLogits = rewire('./sampling').__get__('sampleLogits');
    const arr = new Float32Array([1, 2, 3, 2, 1]);
    expect(sampleLogits(arr, { greedy: true })).toEqual(2);
  });

  it('should return a random index if greedy is false', () => {
    const sampleLogits = rewire('./sampling').__get__('sampleLogits');
    const arr = new Float32Array([1, 2, 3, 2, 1]);
    const result = sampleLogits(arr, { greedy: false });
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(arr.length);
  });

  it('should apply temperature scaling if temperature is not 1.0', () => {
    const sampleLogits = rewire('./sampling').__get__('sampleLogits');
    const arr = new Float32Array([1, 2, 3, 2, 1]);
    const result = sampleLogits(arr, { temperature: 2.0 });
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(arr.length);
  });

  it('should apply top-p sampling if top_p is not 0.0', () => {
    const sampleLogits = rewire('./sampling').__get__('sampleLogits');
    const arr = new Float32Array([0.1, 0.2, 0.3, 0.2, 0.1]);
    const result = sampleLogits(arr, { top_p: 0.5 });
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(arr.length);
  });
});