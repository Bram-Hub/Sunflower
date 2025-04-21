export type BlockType = "call" | "if" | "value";

export interface BlockData {
  id: string;
  type: BlockType;
  children: Record<string, BlockData | null>; // e.g., { condition: Block, then: Block }
}
