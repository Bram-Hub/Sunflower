import { BlockType } from "./BlockConfig";

export interface BlockData {
  id: string;
  type: BlockType;
  children: Array<{ name: string; block: BlockData | null }>; // e.g., { condition: Block, then: Block }
  value?: string; // For "value" blocks
}

