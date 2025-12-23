import { useRef, useEffect } from "react";
import { useDrag } from "react-dnd";
import { blockConfig, BlockType } from "./BlockConfig";
import { CURRENT_FILETYPE_VERSION, customBlocks, EditorSaveState } from "./BlockEditor";
import { getDefaultChildren } from "./Block";
import { BlockSave, serializeBlock } from "./BlockSave";
import { useBlockEditor } from "./BlockEditorContext";

// JSX element to represent a draggable block type in the block pallete
// Type is the block type. custom_block_index and onRemove are undefined if type is not Custom. 
// If type is Custom, custom_block_index is an index in the custom blocks array corresponding to this block,
// and onRemove is a method to remove this custom block from the custom blocks array.
function DraggableBlock({ type, custom_block_name, onRemove }: { type: BlockType, custom_block_name?: string, onRemove?: (name: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "BLOCK",
    item: { type, custom_block_name },
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
      {custom_block_name !== undefined ? custom_block_name : type.toUpperCase()}
      {onRemove !== undefined && (
        <button className="remove-button" onClick={() => onRemove(custom_block_name!)}>X</button>
      )}

    </div>
  );
}

// JSX element that represents the block palette.
// Contains function to load custom blocks.
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

    // If the root block is a custom block, we want to save its first child as the definition of the new custom block.
    // Otherwise, we save the root block itself as the definition of the new custom block.
    newBlock.children[0].child = serializeBlock(rootBlock.type !== "Custom" ? rootBlock : rootBlock.children[0].block!);

    customBlocks[name] = newBlock;
    setCustomBlockCount((_) => Object.keys(customBlocks).length);
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

      let newBlock: BlockSave;
      if (parsed.rootBlock.type == "Custom") {
        newBlock = parsed.rootBlock;
      } else {
        const name = prompt("Enter a name for the new custom block:");
        if (!name) {
          alert("Block creation cancelled.");
          return;
        }
        
        newBlock = {
          name: name,
          type: "Custom",
          children: getDefaultChildren("Custom", 0).map(slot => ({ slotName: slot.name, child: null })),
          num_values: []
        };

        newBlock.children[0].child = parsed.rootBlock;
      }

      customBlocks[newBlock.name || "A:"+ Object.keys(customBlocks).length.toString()] = newBlock;
      setCustomBlockCount((_) => Object.keys(customBlocks).length);
    }
    catch (error) {
      console.error("Error loading block:", error);
      alert("Failed to load block. Please ensure the file is a valid .bramflower file.");
    }
    finally {
      e.target.value = "";
    }
  };

  function removeCustomBlock(name: string) {
    delete customBlocks[name];
    setCustomBlockCount((_) => Object.keys(customBlocks).length);
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
      {Object.values(customBlocks).map((block) => (
        <DraggableBlock key={block.name} type={block.type} custom_block_name={block.name} onRemove={removeCustomBlock} />
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