import { useRef, useEffect } from "react";
import { useDrag } from "react-dnd";
import { blockConfig, BlockType } from "./BlockConfig";
import { CURRENT_FILETYPE_VERSION, customBlocks, EditorSaveState } from "./BlockEditor";
import { getDefaultChildren } from "./Block";
import { BlockSave, serializeBlock } from "./BlockSave";
import { useBlockEditor } from "./BlockEditorContext";

function DraggableBlock({ type, custom_block_index, onRemove }: { type: BlockType, custom_block_index?: number, onRemove?: (i: number) => void }) {
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
      {onRemove !== undefined && (
        <button className="remove-button" onClick={() => onRemove(custom_block_index!)}>X</button>
      )}

    </div>
  );
}

export function BlockPalette() {
  const { customBlockCount: _customBlockCount, setCustomBlockCount } = useBlockEditor();
  const {rootBlock, setRootBlock: _setRootBlock} = useBlockEditor();

  function turnRootToCustom() {
    if (!rootBlock) {
      alert("No root block to convert to custom block.");
      return;
    }

    const name = prompt("Enter a name for the new custom block:");
    if (!name) {
      alert("Block creation cancelled.");
      return;
    }
    const newBlock: BlockSave = {
      name: name,
      type: "Custom",
      children: getDefaultChildren("Custom", 0).map(slot => ({ slotName: slot.name, child: null })),
      num_values: []
    };

    newBlock.children[0].child = serializeBlock(rootBlock);

    customBlocks.push(newBlock);
    setCustomBlockCount((prev) => prev + 1);
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed: EditorSaveState = JSON.parse(text);

      if (typeof parsed !== 'object' || parsed === null ||
        parsed.fileType !== CURRENT_FILETYPE_VERSION || 
        !Array.isArray(parsed.inputs) ||
        typeof parsed.inputCount !== 'number') {
        throw new Error("Invalid or incompatible .bramflower file.");
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

      const newBlock: BlockSave = {
        name: name,
        type: "Custom",
        children: getDefaultChildren("Custom", 0).map(slot => ({ slotName: slot.name, child: null })),
        num_values: []
      };

      if (parsed.rootBlock) {
        newBlock.children[0].child = parsed.rootBlock;
      }

      customBlocks.push(newBlock);
      setCustomBlockCount((prev) => prev + 1);
    }
    catch (error) {
      console.error("Error loading block:", error);
      alert("Failed to load block. Please ensure the file is a valid .bramflower file.");
    }
    finally {
      e.target.value = "";
    }
  };

  function removeCustomBlock(index: number) {
    customBlocks.splice(index, 1);
    setCustomBlockCount((prev) => prev - 1);
  }
  
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
        <DraggableBlock key={block.name} type={block.type} custom_block_index={index} onRemove={removeCustomBlock} />
      ))}
      <button onClick={turnRootToCustom} className="toolbar-button">Create Custom Block from Root</button>
      <br />
      <br />
      <label htmlFor="load-custom-block" className="toolbar-button">
          Load Custom Block (.bramflower)
      </label>
      <input
        id="load-custom-block"
        type="file"
        accept=".bramflower,application/octet-stream"
        onChange={handleFileSelected}
      />
    </div>
  );
}