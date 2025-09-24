import React from "react";
import { useDrag, useDrop } from "react-dnd";
import { BlockData, removeBlockById, isDescendant, getInputCountOfSlot } from "./BlockUtil";
import { v4 as uuidv4 } from "uuid";
import './Block.css';
import { blockConfig, BlockSlot, BlockType, DEFAULT_INPUT_DESCRIPTOR } from "./BlockConfig";
import { ValueEditor } from "./ValueEditor";
import { customBlocks } from "./BlockEditor";

interface Props {
  block: BlockData | null;
  onUpdate: (newBlock: BlockData | null) => void;
}

const getDepthColor = (depth: number) => {
  const colors = ['#ff9999', '#99ff99', '#9999ff', '#ffff99', '#ff99ff', '#99ffff'];
  return colors[depth % colors.length];
};

export function Block({ block, onUpdate }: Props) {
  const [collapsed, setCollapsed] = React.useState(block?.collapsed);

  if (!block) {
    return <span className="empty-text"> Drop block here</span>;
  }

  const toggleCollapse = () => setCollapsed(prev => !prev);

  const renderSlot = (slot: BlockSlot) => {
    if (collapsed !== undefined) {
      block.collapsed = collapsed;
    }
    const { name, block: child } = slot;

    React.useEffect(() => {
      if (!child) return;
      const childBlockData = child as BlockData;
      const childConfig = blockConfig[childBlockData.type];
      
      if (childConfig.dynamicChildren) {
        const nextChildren = childConfig.dynamicChildren(childBlockData);
        const prevChildren = childBlockData.children;

        const changed = 
          prevChildren.length !== nextChildren.length ||
          prevChildren.some((c, i) => c.name !== nextChildren[i]?.name);

        if (changed) {
          const updatedChild = {
            ...childBlockData,
            id: uuidv4(),
            children: nextChildren,
            depth: childBlockData.depth
          };

          const newBlock = {
            ...block,
            children: block.children.map((slot) =>
              slot.name === name ? { ...slot, block: updatedChild } : slot
            ),
          };
          onUpdate(newBlock);
        }
      }
    }, [JSON.stringify(child?.num_values)]);

    const dropRef = React.useRef<HTMLDivElement>(null);

    const [, drop] = useDrop(() => ({
      accept: "BLOCK",
      drop: (item: { type: BlockType; id?: string; block?: BlockData, custom_block_index?: number }) => {
        if (child) return;
        if (item.block && (item.block.id === block.id || isDescendant(item.block, block.id))) {
          return;
        }
        
        let newChild: BlockData;
        const newDepth = (block.depth || 0) + 1;

        if (item.block) {
          newChild = {
            ...item.block, 
            depth: newDepth
          };
          const updatedBlock = removeBlockById(block, item.block.id);

          const newBlock = {
            ...updatedBlock,
            children: updatedBlock.children.map((slot) =>
              slot.name === name ? { ...slot, block: newChild } : slot
            ),
          };
          onUpdate(newBlock);
        } else {
          if (item.custom_block_index !== undefined) {
            const customBlock = customBlocks[item.custom_block_index];
            if (customBlock) {
              newChild = {
                ...customBlock,
                id: uuidv4(),
                depth: newDepth,
                children: getDefaultChildren(customBlock.type, newDepth),
                num_values: getDefaultValues(customBlock.type),
                inputCount: block.inputCount
              };
            } else {
              //error: log
              console.error("Invalid custom block index:", item.custom_block_index);
              return;
            }

          } else {

            newChild = {
              id: uuidv4(),
              type: item.type,
              children: getDefaultChildren(item.type, newDepth),
              collapsed: item.type === "Custom",
              num_values: getDefaultValues(item.type),
              inputCount: getInputCountOfSlot(slot, block.inputCount),
              depth: newDepth
            };
          }

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
        drop(dropRef.current);
      }
    }, [drop]);

    if (slot.input_descriptor === undefined) {
      slot.input_descriptor = blockConfig[block.type].children.find((s) => s.name === name)?.input_descriptor ?? DEFAULT_INPUT_DESCRIPTOR;
    }
    if (collapsed) {
      return (
        <div ref={dropRef}>
          {/* <strong>{name} ({slot.input_descriptor(getInputCountOfSlot(slot, block.inputCount))}):</strong> */}
        </div>
      );
    }
    return (
      <div ref={dropRef} className={`block-slot ${child ? "filled" : "empty"}`}>
        <strong>{name} ({slot.input_descriptor(getInputCountOfSlot(slot, block.inputCount))}):</strong>
        <Block 
          key={child?.id ?? `empty-${block.id}-${name}`}
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

  const dragRef = React.useRef<HTMLDivElement>(null);
  drag(dragRef);

  return (
    <div 
      className="block-container" 
      ref={dragRef}
      style={{ 
        opacity: isDragging ? 0.5 : 1, 
        backgroundColor: getDepthColor(block.depth || 0),
        borderLeft: `5px solid ${getDepthColor(block.depth || 0)}`
      }}
    >
      <div className="block-header" style={{ gap: "0.25rem" }}>
        <div className="block-type">{block.name || block.type.toUpperCase()}</div>
        <div>
          {block.children.length > 0 && (
            <button
              className="collapse-button"
              onClick={toggleCollapse}
            >
              {collapsed ? "V" : ">"}
            </button>
          )}
          <button
            className="remove-button"
            onClick={() => onUpdate(null)}
          >
            X
          </button>
        </div>
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

export function getDefaultChildren(type: BlockType, depth: number = 0): Array<BlockSlot> {
  const blockDef = blockConfig[type];
  return blockDef ? blockDef.children.map(child => ({
    ...child,
    block: child.block ? { 
      ...child.block, 
      depth: depth + 1 
    } : null
  })) : [];
}

export function getDefaultValues(type: BlockType): Array<{ name: string; value: number }> {
  const blockDef = blockConfig[type];
  return blockDef?.num_values ?? [];
}