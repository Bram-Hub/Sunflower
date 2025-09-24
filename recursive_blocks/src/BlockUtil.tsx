import { blockConfig, BlockType, BlockEvaluator, BlockSlot } from "./BlockConfig";
import { BlockData } from "./Block.tsx"; // Fix to import from correct location

export interface BlockData {
  id: string;
  type: BlockType;
  children: Array<BlockSlot>; // e.g., { condition: Block, then: Block }
  collapsed: boolean;
  num_values?: Array<{ name: string; value: number }>; // e.g., { name: "n", value: 5 }
  inputCount: number;
  depth: number;
}

export function removeBlockById(block: BlockData, targetId: string): BlockData {
  return {
    ...block,
    children: block.children.map((slot) => ({
      ...slot,
      block: slot.block?.id === targetId
        ? null
        : slot.block
          ? removeBlockById(slot.block, targetId)
          : null,
    })),
  };
}

export function isDescendant(parent: BlockData, childId: string): boolean {
  for (const slot of parent.children) {
    if (!slot.block) continue;
    if (slot.block.id === childId) return true;
    if (isDescendant(slot.block, childId)) return true;
  }
  return false;
}

export function evaluateBlock(
  block: BlockData,
  inputs: number[],
  evaluate: BlockEvaluator = evaluateBlock
): number {
  const config = blockConfig[block.type];
  const ev = config.evaluate(block, inputs, evaluate);
  console.log(`Evaluating block ${block.type} with inputs ${inputs} => Result: ${ev}`);
  return ev;
}

export async function stepBlock(
  block: BlockData,
  inputs: number[],
  evaluate: BlockEvaluator = stepBlock,
  onStepCallback: (block: BlockData, result: number) => Promise<void>
): Promise<number> {
  const config = blockConfig[block.type];
  const ev = await config.evaluate(block, inputs, evaluate, onStepCallback);
  await onStepCallback(block, ev);
  return ev;
}

export function getInputCountOfSlot(
  slot: BlockSlot,
  defaultCount: number = 0
): number {
  if (slot.input_set !== undefined) {
    return slot.input_set;
  }
  if (slot.input_mod !== undefined) {
    return defaultCount + slot.input_mod;
  }
  return defaultCount;
}

export function setInputCountOfBlock(
  block: BlockData,
  count: number
) {
  block.inputCount = count;
  for (const slot of block.children) {
    if (slot.block) {
      slot.block.inputCount = getInputCountOfSlot(slot, count);
    }
  }
}