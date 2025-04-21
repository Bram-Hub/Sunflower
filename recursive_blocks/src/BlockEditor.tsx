import React, { useState, useRef } from "react";
import { BlockData } from "./BlockTypes";
import { Block } from "./Block";
import { v4 as uuidv4 } from "uuid";
import { useDrop } from "react-dnd";


export function BlockEditor() {
  const [rootBlock, setRootBlock] = useState<BlockData | null>(null);

  const handleDropRoot = (blockType: string) => {
    setRootBlock({
      id: uuidv4(),
      type: blockType as any,
      children: getDefaultChildren(blockType)
    });
  };

  return (
    <div className="flex-1 border p-4 bg-gray-50">
      <h2 className="font-bold mb-4">Editor</h2>
      {rootBlock ? (
        <Block block={rootBlock} onUpdate={setRootBlock} />
      ) : (
        <RootDropArea onDrop={handleDropRoot} />
      )}
    </div>
  );
}

function RootDropArea({ onDrop }: { onDrop: (type: string) => void }) {
  // Create a ref using useRef
  const dropRef = useRef<HTMLDivElement>(null);

  // Set up the drop functionality
  const [, drop] = useDrop(() => ({
    accept: "BLOCK",
    drop: (item: { type: string }) => onDrop(item.type),
  }));

  // Attach the drop target functionality to the div ref
  React.useEffect(() => {
    if (dropRef.current) {
      drop(dropRef.current); // Connect the ref with the drop functionality
    }
  }, [drop, dropRef]);

  return (
    <div
      ref={dropRef} // Assign the created ref to the div
      className="h-40 border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-500"
    >
      Drop a block to start
    </div>
  );
}

function getDefaultChildren(type: string): Record<string, BlockData | null> {
  if (type === "if") {
    return {
      condition: null,
      then: null,
      else: null
    };
  }
  return {} as Record<string, BlockData | null>;
}
