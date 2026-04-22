import { BlockData } from "./BlockUtil";

// Use unicode for sub and superscripts. Could be handled with react, but this is simpler
const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "0": "\u2070",
  "1": "\u00b9",
  "2": "\u00b2",
  "3": "\u00b3",
  "4": "\u2074",
  "5": "\u2075",
  "6": "\u2076",
  "7": "\u2077",
  "8": "\u2078",
  "9": "\u2079",
};

const SUBSCRIPT_DIGITS: Record<string, string> = {
  "0": "\u2080",
  "1": "\u2081",
  "2": "\u2082",
  "3": "\u2083",
  "4": "\u2084",
  "5": "\u2085",
  "6": "\u2086",
  "7": "\u2087",
  "8": "\u2088",
  "9": "\u2089",
};

const toScriptNumber = (value: number, map: Record<string, string>) =>
  value.toString().split("").map(ch => map[ch] ?? ch).join("");

const toSuperscript = (value: number) => toScriptNumber(value, SUPERSCRIPT_DIGITS);
const toSubscript = (value: number) => toScriptNumber(value, SUBSCRIPT_DIGITS);

// Builds generic input arguments like (x1, x2, ..., xN) for a given arity
const inputArgs = (count: number) => {
  if (count <= 0) return "()";
  return `(${Array.from({ length: count }, (_, i) => `x${i + 1}`).join(", ")})`;
};

// Returns a named child slot's formal notation (or "?" when missing)
const childFormal = (block: BlockData, slotName: string): string => {
  const child = block.children.find(s => s.name === slotName)?.block;
  return child ? getFormalNotation(child) : "?";
};

// Returns composition's g function child slots (g1..gm) in their stored order
const compositionGSlots = (block: BlockData) => {
  return block.children.filter(slot => slot.name.startsWith("g"));
};

export const getHeaderNotation = (block: BlockData): string => {
  const n = block.inputCount ?? 0;
  const args = inputArgs(n);

  switch (block.type) {
    case "Zero":
      return `z${args}`;
    case "Successor":
      return `s${args}`;
    case "Projection":
      return `id[n, m]${args}`;
    case "Composition": {
      const gSymbols = compositionGSlots(block).map((_, i) => `g${i + 1}`);
      return `Cn[${["f", ...gSymbols].join(", ")}]${args}`;
    }
    case "Primitive Recursion":
      return `Pr[f, g]${args}`;
    case "Minimization":
      return `Mn[f]${args}`;
    case "Custom":
      return `${block.name ?? "Custom"}[h]${args}`;
    default:
      return `?${args}`;
  }
};

export function getFormalNotation(block: BlockData): string {
  switch (block.type) {
    case "Successor":
      return "s";
    case "Zero":
      return "z";
    case "Projection": {
      const n = block.inputCount ?? 0;
      const m = block.num_values?.find(v => v.name === "i")?.value ?? 1;
      return `id${toSuperscript(n)}${toSubscript(m)}`;
    }
    case "Composition": {
      const fExpr = childFormal(block, "f");
      const gExprs = compositionGSlots(block).map(slot => (slot.block ? getFormalNotation(slot.block) : "?"));
      const suffix = gExprs.length > 0 ? `, ${gExprs.join(", ")}` : "";
      return `Cn[${fExpr}${suffix}]`;
    }
    case "Primitive Recursion":
      return `Pr[${childFormal(block, "Base Case")}, ${childFormal(block, "Recursive Case")}]`;
    case "Minimization":
      return `Mn[${childFormal(block, "f")}]`;
    case "Custom":
      return childFormal(block, "Custom Function");
    default:
      return "?";
  }
}

export function getInformalNotation(
  block: BlockData,
  valueName?: string,
  value?: number
): { label: string; value: string } | null {
  if (valueName !== undefined && value !== undefined) {
    if (block.type === "Projection" && valueName === "i") {
      const inputCount = Math.max(block.inputCount, value, 1);
      const args = Array.from({ length: inputCount }, (_, i) => `x${i + 1}`).join(", ");

      return {
        label: `f(${args}) =`,
        value: `x${value}`,
      };
    }

    if (block.type === "Composition" && valueName === "m") {
      return {
        label: "arity \u2192",
        value: `${value} inner block${value === 1 ? "" : "s"}`,
      };
    }

    return {
      label: `${valueName} \u2192`,
      value: value.toString(),
    };
  }

  const n = block.inputCount ?? 0;
  const args = inputArgs(n);

  if (block.type === "Zero") return { label: `f${args} =`, value: "0" };
  if (block.type === "Successor") return { label: "f(x) =", value: "x + 1" };

  return null;
}
