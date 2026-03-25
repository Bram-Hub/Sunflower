import { BlockData, collectDescendantIds } from "./BlockUtil";
import { blockConfig, BlockEvaluator, ExecutionContext } from "./BlockConfig";

export enum TraceEventType {
  Enter,
  Exit,
  ClearSubtree
}

export type TraceEvent =
  | { type: TraceEventType.Enter; blockId: string; inputs: number[] }
  | { type: TraceEventType.Exit; blockId: string; inputs: number[]; output: number }
  | { type: TraceEventType.ClearSubtree; blockIds: string[] };

export async function generateTrace(
  block: BlockData,
  inputs: number[]
): Promise<{ result: number; events: TraceEvent[] }> {
  const events: TraceEvent[] = [];

  const context: ExecutionContext = {
    onClearSubtree: (blockToClear: BlockData) => {
      events.push({ type: TraceEventType.ClearSubtree, blockIds: collectDescendantIds(blockToClear) });
    }
  };

  const tracingEvaluator: BlockEvaluator = async (b, i, _eval, _ctx) => {
    events.push({ type: TraceEventType.Enter, blockId: b.id, inputs: [...i] });
    const config = blockConfig[b.type];
    const result = await config.evaluate(b, i, tracingEvaluator, context);
    events.push({ type: TraceEventType.Exit, blockId: b.id, inputs: [...i], output: result });
    return result;
  };

  const result = await tracingEvaluator(block, inputs, tracingEvaluator, context);
  return { result, events };
}

// Primitive Recursion Trace Panel
export type PRTraceFrame = {
  xy_prime: number[];           // x,y'     inputs at the current recursion level
  xy: number[] | null;          // x,y      inputs at the connected level (null at base case)
  hxy: number | null;           // h(x,y)   result from the connected level
  hxy_prime: number | null;     // h(x,y')  result at the current level
};

/**
 * Extract PR-specific animation frames from a flat trace.
 * Each Enter/Exit event for the given PR block maps 1:1 to a frame.
 * Descent frames show inputs flowing down; ascent frames show outputs building up.
 */
export function buildPRFrames(events: TraceEvent[], prBlockId: string): PRTraceFrame[] {
  const frames: PRTraceFrame[] = [];
  let depth = 0;
  let prevExitOutput: number | null = null;

  for (const e of events) {
    if (e.type === TraceEventType.ClearSubtree) continue;
    if (e.blockId !== prBlockId) continue;

    if (e.type === TraceEventType.Enter) {
      if (depth === 0) {
        // New invocation — reset ascent state
        prevExitOutput = null;
      }
      depth++;

      const y = e.inputs[e.inputs.length - 1];
      if (y > 0) {
        frames.push({
          xy_prime: e.inputs,
          xy: [...e.inputs.slice(0, -1), y - 1],
          hxy: null,
          hxy_prime: null,
        });
      } else {
        // Base case enter: inputs visible, results pending
        frames.push({ xy_prime: e.inputs, xy: null, hxy: null, hxy_prime: null });
      }
    } else if (e.type === TraceEventType.Exit) {
      depth--;

      const y = e.inputs[e.inputs.length - 1];
      if (y === 0) {
        // Base case exit: reveal h(x,y')
        frames.push({ xy_prime: e.inputs, xy: null, hxy: null, hxy_prime: e.output });
      } else {
        // Ascent: show current level with result from the level below
        frames.push({
          xy_prime: e.inputs,
          xy: [...e.inputs.slice(0, -1), y - 1],
          hxy: prevExitOutput,
          hxy_prime: e.output,
        });
      }
      prevExitOutput = e.output;
    }
  }

  return frames;
}
