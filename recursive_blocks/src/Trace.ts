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
 * Build the frame sequence for a PR trace panel from a completed trace.
 * Each Enter/Exit event for the given PR block produces exactly one frame.
 * Descent frames show inputs flowing down, ascent frames show outputs building up.
 */
export function buildPRFrames(events: TraceEvent[], prBlockId: string): PRTraceFrame[] {
  const frames: PRTraceFrame[] = [];
  let depth = 0;
  let prevExitOutput: number | null = null;
  let lastDescentFrame: PRTraceFrame | null = null;

  for (const e of events) {
    if (e.type === TraceEventType.ClearSubtree) continue;
    if (e.blockId !== prBlockId) continue;

    if (e.type === TraceEventType.Enter) {
      if (depth === 0) {
        // Reset state on new invocations
        prevExitOutput = null;
        lastDescentFrame = null;
      }
      depth++;

      const y = e.inputs[e.inputs.length - 1];
      if (y > 0) {
        const frame: PRTraceFrame = {
          xy_prime: e.inputs,
          xy: [...e.inputs.slice(0, -1), y - 1],
          hxy: null,
          hxy_prime: null,
        };
        lastDescentFrame = frame;
        frames.push(frame);
      } else if (lastDescentFrame) {
        // Base case enter after descent, hold the last descent view
        frames.push({ ...lastDescentFrame });
      } else {
        // Direct call with y = 0 is an edge case, no descent to hold, so show as own level
        frames.push({ xy_prime: e.inputs, xy: null, hxy: null, hxy_prime: null });
      }
    } else if (e.type === TraceEventType.Exit) {
      depth--;

      const y = e.inputs[e.inputs.length - 1];
      if (y === 0 && lastDescentFrame) {
        // Base case exit after descent, stay at last descent view, fill in h(x,y)
        frames.push({
          xy_prime: lastDescentFrame.xy_prime,
          xy: lastDescentFrame.xy,
          hxy: e.output,
          hxy_prime: null,
        });
      } else if (y === 0) {
        // Direct call with y = 0, just show result
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
