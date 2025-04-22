import React from "react";
import { useDrag, useDrop } from "react-dnd";
import { BlockData, removeBlockById, isDescendant } from "./BlockUtil";
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
      drop: (item: { type: BlockType; id?: string; block?: BlockData }) => {
        if (child) return;
        if (item.block && (item.block.id === block.id || isDescendant(item.block, block.id))) {
          // Prevent dropping a block into itself or its own descendant
          return;
        }
        
        let newChild: BlockData;

        if (item.block) {
          newChild = item.block;
          const updatedBlock = removeBlockById(block, item.block.id);

          // Update the parent block with the new child
          const newBlock = {
            ...updatedBlock,
            children: updatedBlock.children.map((slot) =>
              slot.name === name ? { ...slot, block: newChild } : slot
            ),
          };

          onUpdate(newBlock);
        } else {
          // New block from palette
          newChild = {
            id: uuidv4(),
            type: item.type,
            children: getDefaultChildren(item.type),
            num_values: getDefaultValues(item.type),
          };

          const newBlock = {
            ...block,
            children: block.children.map((slot) =>
              slot.name === name ? { ...slot, block: newChild } : slot
            ),
          };

          onUpdate(newBlock);
        }
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
              // Only update the current slot where the block is being modified
              const updated = { ...block };
              updated.children = updated.children.map((slot) =>
                slot.name === name
                  ? { ...slot, block: newChild === null ? null : newChild }
                  : slot
              );
              onUpdate(updated); // Update the parent block state
            }}
          />
        ) : (
          <span className="empty-text">Drop block here</span>
        )}
      </div>
    );
  };

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "BLOCK",
    item: { type: block.type, id: block.id, block },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    // end: (_item, monitor) => {
    //   if (!monitor.didDrop()) {
    //     // If the block was not dropped into a valid drop target, remove it from the original slot
    //     if (originalSlot.slotName && originalSlot.parentId) {
    //       const updatedBlock = removeBlockFromSlot(block, originalSlot.parentId, originalSlot.slotName);
    //       onUpdate(updatedBlock);
    //       onUpdate(null); // Remove the block if it wasn't dropped
    //     }
        
    //   }
    // },
  }), [block]);

  const dragRef = React.useRef<HTMLDivElement>(null);
  drag(dragRef);

  return (
    <div className="block-container" 
      ref={dragRef}
      style={{ opacity: isDragging ? 0.5 : 1 }}>
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