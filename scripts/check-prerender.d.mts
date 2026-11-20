export declare const RUNTIME_ONLY_TEXT: string[]

export declare function bakedRuntimeBranches(
  html: string,
  phrases?: string[],
): string[]

export declare function findBakedRuntimeBranches(
  appDirectory?: string,
): Promise<Array<{ file: string; phrases: string[] }>>
