import React, { useState, useRef } from "react";
import { BlockData, evaluateBlock, removeBlockById } from "./BlockUtil";
import { Block, getDefaultChildren, getDefaultValues } from "./Block";
import { v4 as uuidv4 } from "uuid";
import { useDrop } from "react-dnd";
import './Block.css';
import { BlockType } from "./BlockConfig";

export function BlockEditor() {
  const [rootBlock, setRootBlock] = useState<BlockData | null>(null);
  const [inputs, setInputs] = useState<number[]>([]);
  const [inputCount, setInputCount] = useState<number>(0);

  const handleUpdateRoot = (newBlock: BlockData | null, movedId?: string) => {
    if (!newBlock) return;
    let cleaned = rootBlock;

    if (movedId && cleaned) {
      cleaned = removeBlockById(cleaned, movedId);
    }

    setRootBlock(newBlock);
  };

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

  return (
    <div className="flex-1 border p-4 bg-gray-50">
      <h2 className="font-bold mb-4">Editor</h2>
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
