import React, { useRef, useEffect } from "react";
import { useDrag } from "react-dnd";
import { BlockType } from "./BlockTypes";

function DraggableBlock({ type }: { type: BlockType }) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "BLOCK",
    item: { type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  useEffect(() => {
    if (ref.current) {
      drag(ref);
    }
  }, [ref, drag]);

  return (
    <div
      ref={ref}
      className={`p-2 mb-2 border rounded cursor-move select-none transition 
        ${isDragging ? "opacity-50" : "bg-white hover:bg-gray-50"}`}
    >
      {type.toUpperCase()}
    </div>
  );
}

export function BlockPalette() {
  return (
    <div className="w-64 p-4 border-r bg-gray-100">
      <h2 className="font-bold mb-4">Block Palette</h2>
      <DraggableBlock type="call" />
      <DraggableBlock type="if" />
      <DraggableBlock type="value" />
    </div>
  );
}