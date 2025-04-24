import { useRef, useEffect } from "react";
import { useDrag } from "react-dnd";
import { blockConfig, BlockType } from "./BlockConfig";

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
      className={`palette-block ${isDragging ? "opacity-50" : "palette-block-appear"}`}
    >
      {type.toUpperCase()}
    </div>
  );
}

export function BlockPalette() {
  return (
    <div className="sideP">
      <h2 className="font-bold mb-4">Block Palette</h2>
      {Object.keys(blockConfig).map((blockType) => (
        <DraggableBlock key={blockType} type={blockType as BlockType} />
      ))}
    </div>
  );
}