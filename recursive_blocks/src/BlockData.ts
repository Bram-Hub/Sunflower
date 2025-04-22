import { BlockType } from "./BlockConfig";

export interface BlockData {
  id: string;
  type: BlockType;
  children: Array<{ name: string; block: BlockData | null }>; // e.g., { condition: Block, then: Block }
  num_values?: Array<{ name: string; value: number }>; // e.g., { name: "n", value: 5 }
}

