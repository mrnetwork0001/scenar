/** Spoken numbers → on-screen figures, so kinetic type reads like the product. */
const NUMS: [RegExp, string][] = [
  [/seventy-two thousand/gi, "$72,000"],
  [/eighty-four thousand/gi, "$84,000"],
  [/eighty-three thousand/gi, "$83,000"],
  [/eighty-five thousand/gi, "$85,000"],
];
export const onScreen = (text: string) => NUMS.reduce((t, [re, v]) => t.replace(re, v), text);
