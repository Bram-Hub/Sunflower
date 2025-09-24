import { useRef, useEffect } from "react";
import { useDrag } from "react-dnd";
import { blockConfig, BlockType } from "./BlockConfig";
import { customBlocks } from "./BlockEditor";

function DraggableBlock({ type, custom_block_index }: { type: BlockType, custom_block_index?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "BLOCK",
    item: { type, custom_block_index },
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
      {custom_block_index !== undefined ? customBlocks[custom_block_index]?.name : type.toUpperCase()}
    </div>
  );
}

export function BlockPalette() {
  return (
    <div className="sideP">
      {Object.keys(blockConfig).map((blockType) => (
        <DraggableBlock key={blockType} type={blockType as BlockType} />
      ))}
      {customBlocks.map((block, index) => (
        <DraggableBlock key={block.id} type={block.type} custom_block_index={index} />
      ))}
    </div>
  );
}