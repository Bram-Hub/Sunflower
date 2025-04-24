import React from "react";
import { useDrag, useDrop } from "react-dnd";
import { BlockData, removeBlockById, isDescendant, getInputCountOfSlot } from "./BlockUtil";
import { v4 as uuidv4 } from "uuid";
import './Block.css'; // Import the CSS file
import { blockConfig, BlockSlot, BlockType } from "./BlockConfig";
import { ValueEditor } from "./ValueEditor";

interface Props {
  block: BlockData | null; // Allow null to placeholder for empty slots
  onUpdate: (newBlock: BlockData | null) => void; // Allow null to delete
}

export function Block({ block, onUpdate }: Props) {
  if (!block) {
    return <span className="empty-text">Drop block here</span>;
  }

  // const dynamicKey = `${block.id}-${block!.num_values!.find(v => v.name === "m")?.value || 1}`;

  const renderSlot = (slot: BlockSlot) => {
    const { name, block: child } = slot;

    React.useEffect(() => {
      const childBlockData = child as BlockData;
      if (childBlockData) {
        const childConfig = blockConfig[childBlockData.type];
        if (childConfig.dynamicChildren) {
          const nextChildren = childConfig.dynamicChildren(childBlockData);
          const prevChildren = childBlockData.children;

          const changed =
            prevChildren.length !== nextChildren.length ||
            prevChildren.some((c, i) => c.name !== nextChildren[i]?.name);

          if (changed) {
            // Create a fully new block object — don’t mutate
            const updatedChild = {
              ...childBlockData,
              id: uuidv4(), // Ensure a new ID to trigger re-render
              children: nextChildren,
            };

            const newBlock = {
              ...block,
              children: block.children.map((slot) =>
                slot.name === name ? { ...slot, block: updatedChild } : slot
              ),
            };
            onUpdate(newBlock); // Update the parent block state
          }
        }
      }
    }, [JSON.stringify(child?.num_values)]);

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
          //temp
          // const updatedBlock = { ...block };
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
            inputCount: getInputCountOfSlot(slot, block.inputCount),
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

    return (//Actual Block Slot HTML
      <div
        ref={dropRef}
        className={`block-slot ${child ? "filled" : "empty"}`}
      >
        <strong>{name} ({slot.input_descriptor(getInputCountOfSlot(slot, block.inputCount))}):</strong>{" "}
        {/* {child ? ( */}
          <Block key={child?.id ?? `empty-${block.id}-${name}`}
            block={child}
            onUpdate={(newChild) => {//OnUpdate function for this slot
              const updated = { ...block };
              updated.children = updated.children.map((slot) =>
                slot.name === name
                  ? { ...slot, block: newChild === null ? null : newChild }
                  : slot
              );
              onUpdate(updated); // Update the parent block state
            }}
          />
        {/* ) : (
          <span className="empty-text">Drop block here</span>
        )} */}
      </div>
    );
  };

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "BLOCK",
    item: { type: block.type, id: block.id, block },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [block]);

  // Remove the block immediately when drag starts
  // React.useEffect(() => {
  //   if (isDragging) {
  //     onUpdate(null); // Remove the block from its parent
  //   }
  // }, [isDragging, onUpdate]);

  const dragRef = React.useRef<HTMLDivElement>(null);
  drag(dragRef);

  return (//Actual Block HTML
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
          <div key={`${block.id}-${slot.name}`}>{renderSlot(slot)}</div>
        ))}
      </div>

      <ValueEditor block={block} onUpdate={onUpdate} />
    </div>
  );
}

export function getDefaultChildren(type: BlockType): Array<BlockSlot> {
  const blockDef = blockConfig[type];
  return blockDef ? blockDef.children : [];
}

export function getDefaultValues(type: BlockType): Array<{ name: string; value: number }> {
  const blockDef = blockConfig[type];
  return blockDef!.num_values ?? [];
}