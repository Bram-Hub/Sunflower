import { useRef, useEffect, useState } from "react";
import { useDrag } from "react-dnd";
import { blockConfig, BlockType } from "./BlockConfig";
import { customBlocks, EditorSaveState } from "./BlockEditor";
import { BlockData } from "./BlockUtil";
import { v4 as uuidv4 } from "uuid";
import { getDefaultChildren } from "./Block";
import { deserializeBlock } from "./BlockSave";

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
  const [customBlocks, setCustomBlocks] = useState<BlockData[]>([]);

  const handleAddCustomBlock = () => {
    const jsonFile = prompt("Paste JSON block definition:");
    let parsed: EditorSaveState | null = null;
    if (jsonFile) {
      try {
        parsed = JSON.parse(jsonFile);
      } catch (e) {
        alert("Error parsing JSON.");
        return;
      }
    } else {
      alert("No input provided.");
      return;
    }

    if (!parsed || !parsed.rootBlock) {
      alert("Invalid block definition.");
      return;
    }

    const name = prompt("Enter a name for the new custom block:");
    if (!name) {
      alert("Block creation cancelled.");
      return;
    }

    const newBlock: BlockData = {
      id:  uuidv4(),
      name: name,
      type: "Custom",
      children: getDefaultChildren("Custom", 0),
      collapsed: true,
      inputCount: 1,
      depth: 0
    };

    if (parsed.rootBlock) {
      const deserialized = deserializeBlock(parsed.rootBlock, 1);
      newBlock.children[0].block = deserialized;
    }

    setCustomBlocks((prev) => [...prev, newBlock]);
  };
  
  return (
    <div className="sideP">
      <h2 >Basic</h2>
      {Object.keys(blockConfig).map((blockType) => {
        if (blockType !== "Custom") {
          return <DraggableBlock key={blockType} type={blockType as BlockType} />;
        }
      })}
      <h2 >Custom</h2>
      {customBlocks.map((block, index) => (
        <DraggableBlock key={block.id} type={block.type} custom_block_index={index} />
      ))}
      <button className="add-custom-button" onClick={handleAddCustomBlock}>
        Add Custom Block
      </button>
    </div>


  );
}