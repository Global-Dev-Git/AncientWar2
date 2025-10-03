export class RandomGenerator {
  private seed: number

  constructor(seed: number = Date.now()) {
    this.seed = RandomGenerator.normaliseSeed(seed)
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647
    return (this.seed - 1) / 2147483646
  }

  nextInRange(min: number, max: number): number {
    return min + (max - min) * this.next()
  }

  clone(): RandomGenerator {
    return new RandomGenerator(this.seed)
  }

  getState(): number {
    return this.seed
  }

  static normaliseSeed(seed: number): number {
    let value = Math.trunc(seed) % 2147483647
    if (value <= 0) {
      value += 2147483646
    }
    return value
  }
}

export const createRngFromString = (value: string): RandomGenerator => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return new RandomGenerator(RandomGenerator.normaliseSeed(Math.abs(hash) + 1))
}
