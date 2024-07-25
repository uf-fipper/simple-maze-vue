import * as tf from "@tensorflow/tfjs";

function newSeed(seed?: number | string) {
  const s = [
    (tf.randomUniform([1], 0, 100000000, "int32", seed).arraySync() as number[])[0],
    (tf.randomUniform([1], 0, 100000000, "int32", seed).arraySync() as number[])[0],
  ];
  return s.join("");
}

/**
 * 随机数类
 */
export class Random {
  private _rawSeed: number | string;
  private _seed: number | string = "";

  get rawSeed() {
    return this._rawSeed;
  }

  public get seed() {
    return this._seed;
  }

  private set seed(newSeed: number | string) {
    this._seed = newSeed;
  }

  constructor(seed?: number | string) {
    if (seed === undefined) {
      seed = newSeed();
    }
    this.seed = seed;
    this._rawSeed = this.seed;
  }

  int(min: number, max: number): number {
    const result = tf.randomUniform([1], min, max, "int32", this.seed);
    this.seed = newSeed(this.seed);
    const arr = result.arraySync() as number[];
    return arr[0];
  }

  /**
   * 生成一个包含[0, n - 1]的随机数组
   * @param n 数
   * @returns 生成的数组
   */
  randindex(n: number): Array<number> {
    if (n < 0) {
      throw new RangeError("长度不能小于0");
    }
    const res = Array(n)
      .fill(1)
      .map((_, i) => i);
    for (let i = 0; i < n; ++i) {
      const temp_idx = this.int(i, n);
      const temp = res[i];
      res[i] = res[temp_idx];
      res[temp_idx] = temp;
    }
    return res;
  }

  /**
   * 打乱数组排序
   * @param array 数组
   */
  shuffle(array: any[]): void {
    for (let i = 0; i < array.length; ++i) {
      const temp = this.int(i, array.length);
      const t = array[i];
      array[i] = array[temp];
      array[temp] = t;
      // array[i], array[temp] = array[temp], array[i]  // 并不能起到数组交换的作用
    }
  }
}
