import React from "react";
import { useDrag } from "react-dnd";
import { BlockData } from "./BlockUtil";
import './Block.css';
import { blockConfig, BlockSlot, BlockType } from "./BlockConfig"; 
import { ValueEditor } from "./ValueEditor";
import { BlockSlotDisplay } from "./BlockSlot";
import { useBlockEditor } from "./BlockEditorContext";

interface Props {
  block: BlockData | null;
  onUpdate: (newBlock: BlockData | null) => void;
  highlightedBlockId?: string | null;
  selectedBlockId?: string | null; 
  onSelectBlock: (id: string) => void;
  isRunning?: boolean;
}

const getDepthColor = (depth: number) => {
  const colors = ['#ff9999', '#99ff99', '#9999ff', '#ffff99', '#ff99ff', '#99ffff'];
  return colors[depth % colors.length];
};

// Generate formal mathematical notation for each block type
const getMathNotation = (block: BlockData): string => {
  const n = block.inputCount ?? 0;

  // Build argument list like (x1, x2, ..., xn)
  const args = (count: number, suffix?: string) => {
    if (count === 0) return suffix ? `(${suffix})` : "()";
    const vars = Array.from({ length: count }, (_, i) => `x${i + 1}`).join(", ");
    return suffix ? `(${vars}, ${suffix})` : `(${vars})`;
  };

  switch (block.type) {
    case "Zero":
      return `z${args(n)}`;
    case "Successor":
      return `s(x)`;
    case "Projection": {
      const i = block.num_values?.find(v => v.name === "i")?.value ?? 1;
      return `id[${i},${n}]${args(n)}`;
    }
    case "Composition": {
      const m = block.num_values?.find(v => v.name === "m")?.value ?? 1;
      return `C${n}[${m}]${args(n)}`;
    }
    case "Primitive Recursion":
      return `Pr[f,g]${args(n > 0 ? n - 1 : 0, "y")}`;
    case "Minimization":
      return `Mn[f]${args(n)}`;
    default:
      return "";
  }
};

/* 
A JSX element that represents a visual block element.
It is meant to be dragged into block slots.
Block is the BlockData of this block element.
onUpdate is a function that gets called when this block is modified
(meaning it is deleted, a value is modified, or an ancestor is modified)
and replaces the old block with the new block.
*/
export function Block({ block, onUpdate, highlightedBlockId, selectedBlockId, onSelectBlock, isRunning = false }: Props) { 
  const [collapsed, setCollapsed] = React.useState(block?.collapsed);
  const [showInfo, setShowInfo] = React.useState(false);
  const { blockExecutionStates } = useBlockEditor();

  if (!block) {
    return <span className="empty-text"> Drop block here</span>;
  }

  const toggleCollapse = () => {
    setCollapsed(prev => !prev);
    block.collapsed = collapsed !== undefined ? !collapsed : true;
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

  const executionState = blockExecutionStates[block.id];

  // Format input/output for display
  const formatInput = (input: number[] | undefined) => {
    if (!input || input.length === 0) return '—';
    return `(${input.join(', ')})`;
  };

  const formatOutput = (output: number | undefined) => {
    return output !== undefined ? output.toString() : '—';
  };

  return (
    <div 
      className={`block-container
        ${highlightedBlockId === block.id ? "block-highlighted" : ""} 
        ${selectedBlockId === block.id ? "selected-block" : ""}`}
      ref={dragRef}
      style={{ 
        opacity: isDragging ? 0.5 : 1, 
        backgroundColor: getDepthColor(block.depth || 0),
        borderLeft: `5px solid ${getDepthColor(block.depth || 0)}`,
      }}

      onClick={(e) => {
        e.stopPropagation();
        if (onSelectBlock && block) {
          onSelectBlock(block.id);
        }
      }}
    >
      <div className="block-header" style={{ gap: "0.25rem" }}>
        <div className="block-title-group">
          <div className="block-name-row">
            <button 
              className="breakpoint-button"
              onClick={() => {
                onUpdate({ ...block, hasBreakpoint: !block.hasBreakpoint });
              }}
              title="Toggle Breakpoint"
              style={{ color: block.hasBreakpoint ? "red" : "#ccc", border: "none", background: "none", cursor: "pointer", fontSize: "1.2em", padding: "0 0.2rem" }}
            >
              {block.hasBreakpoint ? "\u25CF" : "\u25CB"}
            </button>
            <div>
              <div className="block-type">{block.name || block.type.toUpperCase()}</div>
              {block.type !== "Custom" && (
                <div className="block-math-notation">{getMathNotation(block)}</div>
              )}
            </div>
          </div>
          <div className="block-io-in">
            <span className="block-io-label">In:</span>
            <span className="block-io-value">{formatInput(executionState?.inputs ?? block.latestInput)}</span>
          </div>
        </div>

        <div className="block-error-list">
          {block.errors.map((error, index) => (
            <div key={index} className="block-error">
              {error}
            </div>
          ))}
        </div>

        <div className="block-action-buttons">
          {blockConfig[block.type]?.description && (
            <button
              className="info-button"
              title={"Show description"}
              onClick={() => setShowInfo(prev => !prev)}
            >
              i
            </button>
          )}
          {block.children.length > 0 && (
            <button
              className="collapse-button"
              onClick={toggleCollapse}
            >
              {collapsed ? "▼" : "▶"}
            </button>
          )}
          {!block.immutable && (
            <button
              className="remove-button"
              onClick={() => onUpdate(null)}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {showInfo && blockConfig[block.type]?.description && (
        <div className="block-description">
          {blockConfig[block.type]?.description ?? "No description available for this block."}
        </div>
      )}

      <div className="slots-container">
        {block.children.map((slot) => (
          <div key={`${block.id}-${slot.name}`}><BlockSlotDisplay parentBlock={block} slot={slot} onUpdate={onUpdate} highlightedBlockId={highlightedBlockId} selectedBlockId={selectedBlockId} onSelectBlock={onSelectBlock} isRunning={isRunning} /></div>
        ))}
      </div>

      <ValueEditor block={block} onUpdate={onUpdate} isRunning={isRunning} />

      <div className="block-io-out">
        <span className="block-io-label">Out:</span>
        <span className="block-io-value">{formatOutput(executionState?.output ?? block.latestOutput)}</span>
      </div>
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
  if (blockDef?.num_values) {
    return blockDef.num_values.map(v => ({ ...v })); // return a copy
  }
  return [];
}