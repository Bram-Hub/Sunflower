import { BlockData, evaluateBlock } from "./BlockUtil";

export const MAX_BATCH_SIZE = 12;

export interface BatchRowResult {
  index: number;
  inputs: number[];
  output?: number;
  error?: Error;
}

export async function computeSingle(rootBlock: BlockData, inputs: number[]): Promise<number> {
  if (inputs.length !== rootBlock.inputCount) {
    throw new Error(`Input arity mismatch: expected ${rootBlock.inputCount}, received ${inputs.length}.`);
  }
  return evaluateBlock(rootBlock, inputs);
}

export async function computeBatch(rootBlock: BlockData, inputRows: number[][]): Promise<BatchRowResult[]> {
  if (inputRows.length > MAX_BATCH_SIZE) {
    throw new Error(`Batch size error: received ${inputRows.length}, max is ${MAX_BATCH_SIZE}.`);
  }

  return Promise.all(inputRows.map(async (row, index): Promise<BatchRowResult> => {
    const inputs = [...row];

    if (inputs.length !== rootBlock.inputCount) {
      return {
        index,
        inputs,
        error: new Error(
          `Input arity mismatch: expected ${rootBlock.inputCount}, received ${inputs.length}.`
        ),
      };
    }

    try {
      const output = await computeSingle(rootBlock, inputs);
      return { index, inputs, output };
    } catch (error) {
      return {
        index,
        inputs,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }));
}
