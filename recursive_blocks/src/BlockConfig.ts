// blockConfig.ts

export type BlockType = "Zero" | "Successor" | "Primitive Recursion" | "Composition";

export const blockConfig = {
  "Zero": {
    type: "Zero" as BlockType,
    children: []
  },
  "Successor": {
    type: "Successor" as BlockType,
    children: []
  },
  "Primitive Recursion": {
    type: "Primitive Recursion" as BlockType,
    children: [
      { name: "Zero Case", block: null },
      { name: "Succ Case", block: null }
    ]
  },
  "Composition": {
    type: "Composition" as BlockType,
    children: [
      { name: "f", block: null },
      { name: "g", block: null }
    ]
  }
};
