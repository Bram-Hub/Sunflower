import React, { useState } from "react";
import { useDrop } from "react-dnd";
import { BlockData } from "./BlockTypes";
import { v4 as uuidv4 } from "uuid";
import './Block.css';

interface Props {
  block: BlockData;
  onUpdate: (newBlock: BlockData | null) => void; // Allow null to delete
}

export function Block({ block, onUpdate }: Props) {
  const renderSlot = (slotName: string) => {
    const child = block.children[slotName];

    const dropRef = React.useRef<HTMLDivElement>(null);

    const [, drop] = useDrop(() => ({
      accept: "BLOCK",
      // canDrop: () => !child,
      drop: (item: { type: string }) => {
        if (child) return;

        const newChild: BlockData = {
          id: uuidv4(),
          type: item.type as any,
          children: getDefaultChildren(item.type),
        };

        const newBlock = {
          ...block,
          children: {
            ...block.children,
            [slotName]: newChild,
          },
        };

        onUpdate(newBlock);
      },
    }), [child, block, slotName]);

    React.useEffect(() => {
      if (dropRef.current) {
        drop(dropRef.current); // Attach the drop functionality to the div element
      }
    }, [drop]);

    return (
      <div
        ref={dropRef}
        className={`block-slot ${child ? "block-slot-filled" : "block-slot-placeholder"}`}
      >
        <strong>{slotName}:</strong>{" "}
        {child ? (
          <Block
            block={child}
            onUpdate={(newChild) => {
              // Deep copy the block to prevent mutation of the original block
              const updated = { ...block };
              if (newChild === null) {
                // If newChild is null, remove the child from the block
                delete updated.children[slotName];
                updated.children[slotName] = null;//explicitly set to null
              } else {
                // Otherwise, update the child block
                updated.children[slotName] = newChild;
              }
            
              // Call onUpdate with the updated blocks
              onUpdate(updated);
            }}
          />
        ) : (
          <span className="text-gray-400">Drop block here</span>
        )}
      </div>
    );
  };

  return (
    <div className="p-2 border rounded bg-white shadow mb-2">
      <div className="flex justify-between items-center">
        <div className="font-bold">{block.type.toUpperCase()}</div>
        <button
          className="text-sm text-red-500 hover:underline"
          onClick={() => onUpdate(null)}
        >
          Remove
        </button>
      </div>

      {/* Render editable field for 'value' blocks */}
      {block.type === "value" && (
        <ValueEditor block={block} onUpdate={onUpdate} />
      )}

      <div className="ml-2">
        {Object.keys(block.children).map((slotName) => (
          <div key={slotName}>{renderSlot(slotName)}</div>
        ))}
      </div>
    </div>
  );
}

function ValueEditor({
  block,
  onUpdate,
}: {
  block: BlockData;
  onUpdate: (newBlock: BlockData | null) => void;
}) {
  const [input, setInput] = useState(block.value ?? "");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    onUpdate({ ...block, value: e.target.value });
  };

  return (
    <div className="mt-2">
      <label className="text-sm text-gray-600">Value:</label>
      <input
        type="text"
        value={input}
        onChange={handleChange}
        className="ml-2 p-1 border rounded text-sm"
      />
    </div>
  );
}

function getDefaultChildren(type: string): Record<string, BlockData | null> {
  switch (type) {
    case "if":
      return { condition: null, then: null, else: null };
    case "call":
      return { func: null, arg1: null, arg2: null };
    default:
      return {};
  }
}
