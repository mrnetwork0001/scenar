// webpack's require.context: lets us load optional JSON files that other agents drop in later.
declare const require: {
  context(dir: string, deep: boolean, re: RegExp): { keys(): string[]; (k: string): unknown };
};
