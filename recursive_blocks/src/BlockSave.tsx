import { getDefaultChildren, getDefaultValues } from "./Block";
import { blockConfig, BlockType } from "./BlockConfig";
import { DEFAULT_INPUT_COUNT } from "./BlockEditor";
import { BlockData } from "./BlockUtil";
import { v4 as uuidv4 } from "uuid";

/*
A custom data type that stores the data necessary to save a block as a file or custom block.
Not to be confused with BlockData, which stores extra information used by React and the evaluator.
*/
export type BlockSave = {
  name?: string;
  type: BlockType;
  children: Array<{ slotName: string; child: BlockSave | null}>;
  num_values?: Array<{ valName: string; value: number }>;
};

//Convert BlockData to a BlockSave (remove unnecessary data)
export function serializeBlock(block: BlockData): BlockSave {
  const serializedChildren = block.children.map((slot) => ({
	slotName: slot.name,
	child: slot.block ? serializeBlock(slot.block) : null
  }));
  return {
	name: block.name,
	type: block.type,
	children: serializedChildren,
	num_values: block.num_values ? block.num_values.map(v => ({ valName: v.name, value: v.value })) : undefined,
  };
}

//Convert BlockSave to BlockData for use
export function deserializeBlock(data: BlockSave, depth: number = 0, immutable: boolean = false): BlockData {
  	const deserializedBlock: BlockData = {
		id: uuidv4(),
		name: data.name,
		type: data.type,
		children: getDefaultChildren(data.type, 0),
		collapsed: data.type === "Custom",
		immutable: immutable,
		num_values: getDefaultValues(data.type),
		inputCount: DEFAULT_INPUT_COUNT,
		depth: depth
	};

	if (!immutable) {
		immutable = data.type === "Custom"
	}

	for (const val of data.num_values || []) {
		const numVal = deserializedBlock.num_values?.find(v => v.name === val.valName);
		if (numVal) {
			numVal.value = val.value;
		}
	}

	if (blockConfig[data.type].dynamicChildren) {
		const dynamicSlots = blockConfig[data.type].dynamicChildren?.(deserializedBlock);
		if (dynamicSlots) {
			deserializedBlock.children = dynamicSlots;
		}
	}

	for (const slotData of data.children) {
		const slot = deserializedBlock.children.find(s => s.name === slotData.slotName);
		if (slot) {
			slot.block = slotData.child ? deserializeBlock(slotData.child, depth + 1, immutable) : null;
		}
	}

	return deserializedBlock;
}