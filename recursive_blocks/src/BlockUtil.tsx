import { BlockType } from "./BlockConfig";

export interface BlockData {
  id: string;
  type: BlockType;
  children: Array<{ name: string; block: BlockData | null }>; // e.g., { condition: Block, then: Block }
  num_values?: Array<{ name: string; value: number }>; // e.g., { name: "n", value: 5 }
}

export function removeBlockById(block: BlockData, targetId: string): BlockData {
  return {
    ...block,
    children: block.children.map((slot) => ({
      name: slot.name,
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