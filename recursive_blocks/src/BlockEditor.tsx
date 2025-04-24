import React, { useState, useRef, useCallback  } from "react";
import { BlockData, evaluateBlock, removeBlockById, setInputCountOfBlock } from "./BlockUtil";
import { Block, getDefaultChildren, getDefaultValues } from "./Block";
import { v4 as uuidv4 } from "uuid";
import { useDrop } from "react-dnd";
import './Block.css';
import { BlockType } from "./BlockConfig";

interface EditorSaveState {
  fileType: string;
  rootBlock: BlockData | null;
  inputs: number[];
  inputCount: number;
}

const DEFAULT_INPUT_COUNT = 2;

export function BlockEditor() {
  const [rootBlock, setRootBlock] = useState<BlockData | null>(null);
  const [inputs, setInputs] = useState<number[]>(new Array(DEFAULT_INPUT_COUNT).fill(0));
  const [inputCount, setInputCount] = useState<number>(DEFAULT_INPUT_COUNT);

  const handleUpdateRoot = (newBlock: BlockData | null, movedId?: string) => {
    if (!newBlock) return;
    let cleaned = rootBlock;

    if (movedId && cleaned) {
      cleaned = removeBlockById(cleaned, movedId);
    }

    setRootBlock(newBlock);
  };

  React.useEffect(() => {
    if (!rootBlock) {
      return;
    }
    setInputCountOfBlock(rootBlock, inputCount);

  }, [JSON.stringify(rootBlock), inputCount]);

  const handleInputCountChange = (count: number) => {
    const clamped = Math.max(0, count);
    setInputCount(clamped);
    setInputs(Array.from({ length: clamped }, (_, i) => inputs[i] ?? 0));
  };

  const handleInputChange = (index: number, value: number) => {
    const updated = [...inputs];
    updated[index] = value;
    setInputs(updated);
  };

  const handleSave = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;
    const filename = `${timestamp}.bramflower`;

    const stateToSave: EditorSaveState = {
      fileType: "BRAM_EDITOR_STATE_V1",
      rootBlock,
      inputs,
      inputCount,
    };

    try {
      const stateString = JSON.stringify(stateToSave, null, 2);
      const blob = new Blob([stateString], { type: 'application/octet-stream' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename; // Use the generated filename

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(link.href);
      console.log("State saved successfully as:", filename);
    } catch (error) {
      console.error("Failed to save state:", error);
      alert(`Error saving file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [rootBlock, inputs, inputCount]);

  const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        try {
          const loadedState: EditorSaveState = JSON.parse(content);
          if (typeof loadedState !== 'object' || loadedState === null ||
              loadedState.fileType !== "BRAM_EDITOR_STATE_V1" || 
              !Array.isArray(loadedState.inputs) ||
              typeof loadedState.inputCount !== 'number') {
             throw new Error("Invalid or incompatible .bramflower file.");
          }
          setRootBlock(loadedState.rootBlock);
          setInputs(loadedState.inputs);
          setInputCount(loadedState.inputCount);

          console.log("State loaded successfully.");
        } catch (error) {
          console.error("Failed to load or parse state file:", error);
          alert(`Error loading file: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
         console.error("Failed to read file content as string.");
         alert("Error reading file content.");
      }
    };

    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      alert("Error reading file.");
    };

    reader.readAsText(file);
  };

  return (
    <div className="editor flex-1 border p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-4"> {}
          <h2 className="font-bold">Editor</h2>
          <div> {/* Container for buttons */}
              <button onClick={handleSave} className="mr-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Save (.bramflower)
              </button>
              <label htmlFor="load-input" className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer">
                  Load (.bramflower)
              </label>
              <input
                  id="load-input"
                  type="file"
                  // Prioritize .bram, remove explicit json type
                  accept=".bramflower,application/octet-stream"
                  onChange={handleLoad}
                  className="hidden"
              />
          </div>
      </div>
      {rootBlock ? (
        <Block block={rootBlock} onUpdate={setRootBlock} />
      ) : (
        <RootDropArea onDrop={handleUpdateRoot} rootBlock={rootBlock} />
      )}

      <hr className="my-6" />

      <div className="input-section">
        <h3 className="font-semibold mb-2">Inputs</h3>
        <label className="block mb-2">
          Number of Inputs:
          <input
            type="number"
            value={inputCount}
            min={0}
            step={1}
            onChange={(e) => handleInputCountChange(parseInt(e.target.value))}
            className="ml-2 px-2 py-1 border rounded w-20"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {inputs.map((val, i) => (
            <input
              key={i}
              type="number"
              value={val}
              min={0}
              step={1}
              onChange={(e) => handleInputChange(i, parseFloat(e.target.value))}
              className="px-2 py-1 border rounded"
              placeholder={`Input ${i + 1}`}
            />
          ))}
        </div>

        {/* Evaluate button */}
        <button
          onClick={() => {
            if (rootBlock) {
              try {
                const result = evaluateBlock(rootBlock, inputs);
                alert(`Result: ${result}`);
              } catch (error: any) {
                alert(`Error: ${error.message}`);
              }
            } else {
              alert("No root block to evaluate.");
            }
          }}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Evaluate
        </button>
      </div>
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
        onDrop(item.block, item.block.id);
      } else {
        onDrop({
          id: uuidv4(),
          type: item.type,
          children: getDefaultChildren(item.type),
          num_values: getDefaultValues(item.type),
          inputCount: DEFAULT_INPUT_COUNT,//placeholder
        });
      }
    },
  }));

  React.useEffect(() => {
    if (dropRef.current) {
      drop(dropRef.current);
    }
  }, [drop]);

  return (
    <div
      ref={dropRef}
      className={`block-slot ${rootBlock ? "filled" : "empty"}`}
    >
      {rootBlock ? "Root Block Added" : "Drop a block to start"}
    </div>
  );
}
