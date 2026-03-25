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
