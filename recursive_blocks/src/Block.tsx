import React, { useState } from "react";
import { useDrop } from "react-dnd";
import { BlockData } from "./BlockTypes";
import { v4 as uuidv4 } from "uuid";
import './Block.css'; // Import the CSS file

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
        className={`block-slot ${child ? "filled" : "empty"}`}
      >
        <strong>{slotName}:</strong>{" "}
        {child ? (
          <Block
            block={child}
            onUpdate={(newChild) => {
              const updated = { ...block };
              if (newChild === null) {
                delete updated.children[slotName];
                updated.children[slotName] = null; // Explicitly set to null
              } else {
                updated.children[slotName] = newChild;
              }
              onUpdate(updated);
            }}
          />
        ) : (
          <span className="empty-text">Drop block here</span>
        )}
      </div>
    );
  };

  return (
    <div className="block-container">
      <div className="block-header">
        <div className="block-type">{block.type.toUpperCase()}</div>
        <button
          className="remove-button"
          onClick={() => onUpdate(null)}
        >
          Remove
        </button>
      </div>

      {/* Render editable field for 'value' blocks */}
      {block.type === "value" && (
        <ValueEditor block={block} onUpdate={onUpdate} />
      )}

      <div className="slots-container">
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
    <div className="value-editor">
      <label className="value-label">Value:</label>
      <input
        type="text"
        value={input}
        onChange={handleChange}
        className="value-input"
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
