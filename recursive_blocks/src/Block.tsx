import React, { useState } from "react";
import { useDrop } from "react-dnd";
import { BlockData } from "./BlockData";
import { v4 as uuidv4 } from "uuid";
import './Block.css'; // Import the CSS file
import { blockConfig, BlockType } from "./BlockConfig";
import { ValueEditor } from "./ValueEditor";

interface Props {
  block: BlockData;
  onUpdate: (newBlock: BlockData | null) => void; // Allow null to delete
}

export function Block({ block, onUpdate }: Props) {
  const renderSlot = (slot: { name: string; block: BlockData | null }) => {
    const { name, block: child } = slot;

    const dropRef = React.useRef<HTMLDivElement>(null);

    const [, drop] = useDrop(() => ({
      accept: "BLOCK",
      drop: (item: { type: BlockType }) => {
        if (child) return;

        const newChild: BlockData = {
          id: uuidv4(),
          type: item.type as BlockType,
          children: getDefaultChildren(item.type),
          num_values: getDefaultValues(item.type),
        };

        console.log("Dropping block:", newChild);

        const newBlock = {
          ...block,
          children: block.children.map((slot) =>
            slot.name === name ? { ...slot, block: newChild } : slot
          ),
        };

        onUpdate(newBlock);
      },
    }), [child, block, name]);

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
        <strong>{name}:</strong>{" "}
        {child ? (
          <Block
            block={child}
            onUpdate={(newChild) => {
              const updated = { ...block };
              updated.children = updated.children.map((slot) =>
                slot.name === name
                  ? { ...slot, block: newChild === null ? null : newChild }
                  : slot
              );
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

      <div className="slots-container">
        {block.children.map((slot) => (
          <div key={slot.name}>{renderSlot(slot)}</div>
        ))}
      </div>

      <ValueEditor block={block} onUpdate={onUpdate} />
    </div>
  );
}

export function getDefaultChildren(type: BlockType): Array<{ name: string; block: BlockData | null }> {
  const blockDef = blockConfig[type];
  return blockDef ? blockDef.children : [];
}

export function getDefaultValues(type: BlockType): Array<{ name: string; value: number }> {
  const blockDef = blockConfig[type];
  return blockDef ? blockDef.num_values : [];
}