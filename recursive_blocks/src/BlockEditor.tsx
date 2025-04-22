import React, { useState, useRef } from "react";
import { BlockData } from "./BlockData";
import { Block, getDefaultChildren, getDefaultValues } from "./Block";
import { v4 as uuidv4 } from "uuid";
import { useDrop } from "react-dnd";
import './Block.css';
import { BlockType } from "./BlockConfig";

export function BlockEditor() {
  const [rootBlock, setRootBlock] = useState<BlockData | null>(null);

  const handleUpdateRoot = (newBlock: BlockData | null, movedId?: string) => {
    if (!newBlock) return;
  
    let cleaned = rootBlock;
  
    // Remove the moved block from the tree if needed
    if (movedId && cleaned) {
      cleaned = removeBlockById(cleaned, movedId);
    }
  
    setRootBlock(newBlock);
  };
  
  

  return (
    <div className="flex-1 border p-4 bg-gray-50">
      <h2 className="font-bold mb-4">Editor</h2>
      {rootBlock ? (
        <Block block={rootBlock} onUpdate={setRootBlock} />
      ) : (
        <RootDropArea onDrop={handleUpdateRoot} rootBlock={rootBlock} />
      )}
    </div>
  );
}

function RootDropArea({
  onDrop,
  rootBlock,
}: {
  onDrop: (newBlock: BlockData | null, movedId?: string) => void;
  rootBlock: BlockData | null;
}) {
  const dropRef = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop(() => ({
    accept: "BLOCK",
    drop: (item: { type: BlockType; block?: BlockData }) => {
      if (item.block) {
        onDrop(item.block, item.block.id); // If block is being moved
      } else {
        onDrop({
          id: uuidv4(),
          type: item.type,
          children: getDefaultChildren(item.type),
          num_values: getDefaultValues(item.type),
        });
      }
    },
  }));

  // Attach the drop target functionality to the div ref
  React.useEffect(() => {
    if (dropRef.current) {
      drop(dropRef.current); // Connect the ref with the drop functionality
    }
  }, [drop, dropRef]);

  return (
    <div
      ref={dropRef}
      className={`block-slot ${rootBlock ? "filled" : "empty"}`}
    >
      {rootBlock ? "Root Block Added" : "Drop a block to start"}
    </div>
  );
}

export function removeBlockById(block: BlockData, targetId: string): BlockData {
  return {
    ...block,
    children: block.children.map((slot) => ({
      name: slot.name,
      block: slot.block?.id === targetId
        ? null
        : slot.block
          ? { ...removeBlockById(slot.block, targetId) }
          : null,
    })),
  };
}