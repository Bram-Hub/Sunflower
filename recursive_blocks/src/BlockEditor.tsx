import React, { useState, useRef } from "react";
import { BlockData } from "./BlockData";
import { Block, getDefaultChildren, getDefaultValues } from "./Block";
import { v4 as uuidv4 } from "uuid";
import { useDrop } from "react-dnd";
import './Block.css';
import { BlockType } from "./BlockConfig";

export function BlockEditor() {
  const [rootBlock, setRootBlock] = useState<BlockData | null>(null);

  const handleDropRoot = (blockType: BlockType) => {
    setRootBlock({
      id: uuidv4(),
      type: blockType,
      children: getDefaultChildren(blockType),
      num_values: getDefaultValues(blockType),
    });
  };

  return (
    <div className="flex-1 border p-4 bg-gray-50">
      <h2 className="font-bold mb-4">Editor</h2>
      {rootBlock ? (
        <Block block={rootBlock} onUpdate={setRootBlock} />
      ) : (
        <RootDropArea onDrop={handleDropRoot} rootBlock={rootBlock} />
      )}
    </div>
  );
}

function RootDropArea({
  onDrop,
  rootBlock,
}: {
  onDrop: (type: BlockType) => void;
  rootBlock: BlockData | null;
}) {
  const dropRef = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop(() => ({
    accept: "BLOCK",
    drop: (item: { type: BlockType }) => onDrop(item.type),
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
      // className={`root-drop-area ${rootBlock ? "root-drop-filled" : "root-drop-placeholder"}`}
      className={`block-slot ${rootBlock ? "filled" : "empty"}`}
    >
      {rootBlock ? "Root Block Added" : "Drop a block to start"}
    </div>
  );
}
