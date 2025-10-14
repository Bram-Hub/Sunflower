import { BlockData } from "./BlockUtil";

// blockConfig.ts
export type BlockType = "Zero" | "Successor" | "Projection" | "Composition" | "Primitive Recursion" | "Minimization" | "Custom";

export type BlockEvaluator = (block: BlockData, inputs: number[], evaluate: BlockEvaluator) => number;

export type InputDescriptorGenerator = (inputCount: number) => string;

//The BlockSlot represents a slot in a block that can hold a child block
//The name is a unique identifier for the slot
//The blockData is the child block that occupies the slot, or null if empty
//Input Descriptor is a function that takes in the input count and returns a string describing the inputs
//Input Set and Input Mod are an optional modifiers that adjust the displayed input count for the child block
export type BlockSlot = { name: string; block: BlockData | null; input_descriptor: InputDescriptorGenerator; input_set?: number; input_mod?: number};

export const DEFAULT_INPUT_DESCRIPTOR: InputDescriptorGenerator = (inputCount) => {
  let output = "";
  for (let i = 1; i <= inputCount; i++) {
    output += `x${i}, `;
  }
  return output.slice(0, -2); // Remove trailing comma and space
};

const INPUT_DESCRIPTOR_G: InputDescriptorGenerator = (inputCount) => {
  let output = "";
  for (let i = 1; i <= inputCount; i++) {
    output += `g${i}, `;
  }
  return output.slice(0, -2);
};

const INPUT_DESCRIPTOR_N: InputDescriptorGenerator = (inputCount) => {
  let output = "";
  for (let i = 1; i < inputCount; i++) {
    output += `x${i}, `;
  }
  return output + `n`;
}

const INPUT_DESCRIPTOR_RECUR_YZ: InputDescriptorGenerator = (inputCount) => {
  let output = "";
  for (let i = 1; i < inputCount-1; i++) {
    output += `x${i}, `;
  }
  return output + `y, z`;
}

// Configuration for each block type
// type is the block type identifier (string)
// children is an array of BlockSlot defining the slots for child blocks (BlockSlot is defined above)
// dynamicChildren is an optional function that takes in the current block and returns an updated array of BlockSlot
// num_values is an optional array of named numeric parameters for the block
// evaluate is a function that takes in the block, input values, and an evaluator function, and returns the computed output value
export const blockConfig: Record<BlockType, {
  type: BlockType;
  children: BlockSlot[];
  dynamicChildren?: (block: BlockData) => BlockSlot[];
  num_values?: { name: string; value: number; min: number }[];
  evaluate: BlockEvaluator;
}> = {
  "Zero": {
    type: "Zero" as BlockType,
    children: [],
    evaluate: (_block, _inputs, _evaluate) => {
      // Zero block always returns 0
      return 0;
    }
  },
  "Successor": {
    type: "Successor" as BlockType,
    children: [],
    evaluate: (_block, inputs, _evaluate) => {
      // Successor block returns the input incremented by 1
      if (inputs.length !== 1) {
        throw new Error("Successor block requires exactly one input.");
      }
      return inputs[0] + 1;
    }
  },
  "Projection": {
    type: "Projection" as BlockType,
    children: [],
    num_values: [
      { name: "i", value: 1, min: 1 }
    ],
    evaluate: (block, inputs, _evaluate) => {
      // Projection block returns the i-th input
      if (inputs.length <= 0) {
        throw new Error("Projection block requires at least one input.");
      }
      const i = block!.num_values!.find(v => v.name === "i")?.value ?? 0;
      return inputs[i-1];
    }
  },
  "Composition": {
    type: "Composition" as BlockType,
    children: [
      { name: "f", block: null, input_descriptor: INPUT_DESCRIPTOR_G, input_set: 1 },
      { name: "g1", block: null, input_descriptor: DEFAULT_INPUT_DESCRIPTOR },
    ],
    num_values: [
      { name: "m", value: 1, min: 0 }
    ],
    evaluate: (block, inputs, evaluate) => {
      const m = block!.num_values!.find(v => v.name === "m")?.value ?? 1;
      const g_results = Array.from({ length: m }, (_, i) => {
        const g_block = block.children.find(c => c.name === `g${i + 1}`)?.block;
        if (!g_block) {
          throw new Error(`g${i + 1} block is missing in Composition.`);
        }
        return evaluate(g_block, inputs, evaluate);
      });
      return evaluate(block.children[0].block!, g_results, evaluate);
    },
    dynamicChildren: (block: BlockData) => {
      const m = block!.num_values!.find(v => v.name === "m")?.value ?? 1;
      return [
        { name: "f", block: block.children.find(c => c.name === "f")?.block ?? null, input_descriptor: INPUT_DESCRIPTOR_G, input_set: m },
        ...Array.from({ length: m }, (_, i) => {
          const name = `g${i + 1}`;
          return {
            name,
            block: block.children.find(c => c.name === name)?.block ?? null,
            input_descriptor: DEFAULT_INPUT_DESCRIPTOR,
          };
        })
      ];
    }
  },
  "Primitive Recursion": {
    type: "Primitive Recursion" as BlockType,
    children: [
      { name: "Base Case", block: null, input_descriptor: DEFAULT_INPUT_DESCRIPTOR, input_mod: -1 },
      { name: "Recursive Case", block: null, input_descriptor: INPUT_DESCRIPTOR_RECUR_YZ, input_mod: 1 },
    ],
    evaluate: (block, inputs, evaluate) => {
      // Primitive Recursion block evaluates based on the base case and recursive case
      if (inputs.length < 1) {
        throw new Error("Primitive Recursion block requires at least one inputs.");
      }
      if (inputs[inputs.length - 1] <= 0) {
        // Base case: if the last input is 0, evaluate the base case block
        return evaluate(block.children[0].block!, inputs.slice(0, -1), evaluate);
      } else {
        // Recursive case: evaluate the recursive case block with the inputs
        const inputs_decremented = inputs.slice(0, -1).concat(inputs[inputs.length - 1] - 1);
        console.log("Inputs for recursive case:", inputs_decremented);
        const inputs_combined_with_previous = inputs_decremented.concat(evaluate(block, inputs_decremented, evaluate));
        return evaluate(block.children[1].block!, inputs_combined_with_previous, evaluate);
      }
    }
  },
  "Minimization": {
    type: "Minimization" as BlockType,
    children: [
      { name: "f", block: null, input_descriptor: INPUT_DESCRIPTOR_N, input_mod: 1 },
    ],
    evaluate: (block, inputs, evaluate) => {
      // Minimization block finds the smallest n such that f(..., n) = 0
      const f_block = block.children[0].block;
      if (!f_block) {
        throw new Error("Minimization block requires a function f.");
      }
      let n = 0;
      let depth = 0;
      const MAX_DEPTH = 9999; // Prevent infinite loops
      while (depth < MAX_DEPTH) {
        const result = evaluate(f_block, inputs.concat(n), evaluate);
        if (result === 0) {
          return n;
        }
        n++;
        depth++;
      }
      throw new Error("Minimization did not converge within "+MAX_DEPTH+" iterations.");
    }
  },
  "Custom": {
    type: "Custom" as BlockType,
    children: [//This custom block slot is for internal use and should not be rendered
      { name: "Custom Function", block: null, input_descriptor: DEFAULT_INPUT_DESCRIPTOR },
    ],
    evaluate: (block, inputs, evaluate) => {
      // Custom block evaluation logic
      if (block.children[0].block) {
        return evaluate(block.children[0].block, inputs, evaluate);
      }
      throw new Error("Custom block is empty.");
    }
  }
};
