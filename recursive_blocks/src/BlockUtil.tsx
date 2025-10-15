import { blockConfig, BlockType, BlockSlot } from "./BlockConfig";

/*
A custom data type that contains all the data for a block placed into the block tree.
*/
export interface BlockData {
  id: string;
  name?: string; // For custom blocks
  type: BlockType;
  children: Array<BlockSlot>; // e.g., { condition: Block, then: Block }
  collapsed: boolean;
  num_values?: Array<{ name: string; value: number }>; // e.g., { name: "n", value: 5 }
  inputCount: number;
  depth: number;
}

//Currently unused.
//Meant to be involved with moving blocks around.
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

//Recursively checks if the parent has an ancestor with id of childId
export function isDescendant(parent: BlockData, childId: string): boolean {
  for (const slot of parent.children) {
    if (!slot.block) continue;
    if (slot.block.id === childId) return true;
    if (isDescendant(slot.block, childId)) return true;
  }
  return false;
}

//Calls evaluate on the given block, starting with given inputs.
//Each block type has an evaluate function, 
//which takes in the blockdata, the inputs to evaluate on, 
//and this evaluation function (to allow calling this function recursively)
export function evaluateBlock(
  block: BlockData,
  inputs: number[]
): number {
  const config = blockConfig[block.type];
  const ev = config.evaluate(block, inputs, evaluateBlock);
  console.log(`Evaluating block ${block.type} with inputs ${inputs} => Result: ${ev}`);
  return ev;
}

//Currently, this function is same as evaluateBlock.
export function stepBlock(
  block: BlockData,
  inputs: number[]
): number {
  const config = blockConfig[block.type];
  const ev = config.evaluate(block, inputs, stepBlock);
  console.log(`Current Step: block ${block.type} with inputs ${inputs} => Result: ${ev}`);
  return ev;
}

//Takes in a defaultCount, and modifies it using the slot's input modifiers to get the actual input count the slot wants.
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

//Recursively sets the input counts of blocks starting with setting the input block to have count inputs.
//TODO: The input count variable might be redundant. Currently it is only used so blockslots know the default count, for displaying input count.
//Consider optimizing it away.
export function setInputCountOfBlock(
  block: BlockData,
  count: number
) {
  block.inputCount = count;
  for (const slot of block.children) {
    if (slot.block) {
      setInputCountOfBlock(slot.block, getInputCountOfSlot(slot, count));
    }
  }
}