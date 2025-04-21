import React from "react";
import { useDrag } from "react-dnd";
import { BlockType } from "./BlockTypes";

const BLOCK_TYPES: BlockType[] = ["call", "if", "value"];

export function BlockPalette() {
  return (
    <div className="w-40 border p-2 bg-gray-100">
      <h2 className="font-bold mb-2">Palette</h2>
      {BLOCK_TYPES.map(type => (
        <DraggableBlock key={type} type={type} />
      ))}
    </div>
  );
}

function DraggableBlock({ type }: { type: BlockType }) {
  const [, drag] = useDrag(() => ({
    type: "BLOCK",
    item: { type }
  }));

  return (
    <div ref={drag} className="p-2 mb-2 bg-white border rounded cursor-move">
      {type.toUpperCase()}
    </div>
  );
}
