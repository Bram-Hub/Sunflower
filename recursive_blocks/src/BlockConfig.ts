// blockConfig.ts
export type BlockType = "Zero" | "Successor" | "Primitive Recursion" | "Composition" | "Projection";

export const blockConfig = {
  "Zero": {
    type: "Zero" as BlockType,
    children: [],
    num_values: []
  },
  "Successor": {
    type: "Successor" as BlockType,
    children: [],
    num_values: []
  },
  "Primitive Recursion": {
    type: "Primitive Recursion" as BlockType,
    children: [
      { name: "Base Case", block: null },
      { name: "Recursive Case", block: null }
    ],
    num_values: []
  },
  "Composition": {
    type: "Composition" as BlockType,
    children: [
      { name: "f", block: null },
      { name: "g", block: null }
    ],
    num_values: []
  },
  "Projection": {
    type: "Projection" as BlockType,
    children: [],
    num_values: [
      { name: "i", value: 0 },
    ]
  }
};
