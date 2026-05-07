export const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const safeRandomDelay = (min = 850, max = 1800): Promise<void> =>
  delay(randomBetween(min, max));
