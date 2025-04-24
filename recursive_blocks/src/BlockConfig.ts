import { BlockData } from "./BlockUtil";

// blockConfig.ts
export type BlockType = "Zero" | "Successor" | "Projection" | "Composition" | "Primitive Recursion" | "Minimization";

export type BlockEvaluator = (block: BlockData, inputs: number[], evaluate: BlockEvaluator) => number;

export type InputDescriptorGenerator = (inputCount: number) => string;

export type BlockSlot = { name: string; block: BlockData | null; input_descriptor: InputDescriptorGenerator; input_set?: number; input_mod?: number};

const DEFAULT_INPUT_DESCRIPTOR: InputDescriptorGenerator = (inputCount) => {
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

const INPUT_DESCRIPTOR_Y: InputDescriptorGenerator = (inputCount) => {
  let output = "";
  for (let i = 1; i < inputCount; i++) {
    output += `x${i}, `;
  }
  return output + `y`;
}

const INPUT_DESCRIPTOR_YZ: InputDescriptorGenerator = (inputCount) => {
  let output = "";
  for (let i = 1; i < inputCount-1; i++) {
    output += `x${i}, `;
  }
  return output + `y, z`;
}

export const blockConfig: Record<BlockType, {
  type: BlockType;
  children: BlockSlot[];
  dynamicChildren?: (block: BlockData) => BlockSlot[];
  num_values?: { name: string; value: number }[];
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
      { name: "i", value: 0 },
    ],
    evaluate: (block, inputs, _evaluate) => {
      // Projection block returns the i-th input
      if (inputs.length <= 0) {
        throw new Error("Projection block requires at least one input.");
      }
      const i = block!.num_values!.find(v => v.name === "i")?.value ?? 0;
      return inputs[i];
    }
  },
  "Composition": {
    type: "Composition" as BlockType,
    children: [
      { name: "f", block: null, input_descriptor: INPUT_DESCRIPTOR_G, input_set: 1 },
      { name: "g1", block: null, input_descriptor: DEFAULT_INPUT_DESCRIPTOR },
    ],
    num_values: [
      { name: "m", value: 1 }, 
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
      { name: "Recursive Case", block: null, input_descriptor: INPUT_DESCRIPTOR_YZ, input_mod: 1 },
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
        const inputs_combined_with_previous = inputs.concat(evaluate(block, inputs_decremented, evaluate));
        return evaluate(block.children[1].block!, inputs_combined_with_previous, evaluate);
      }
    }
  },
  "Minimization": {
    type: "Minimization" as BlockType,
    children: [
      { name: "f", block: null, input_descriptor: INPUT_DESCRIPTOR_Y, input_mod: 1 },
    ],
    evaluate: (block, inputs, evaluate) => {
      // Minimization block finds the smallest n such that f(n) = 0
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
  }
};
