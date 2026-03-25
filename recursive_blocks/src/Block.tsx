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

const getMathNotation = (block: BlockData): string => {
  const n = block.inputCount ?? 0;
  const args = (count: number, suffix?: string) => {
    if (count === 0) return suffix ? `(${suffix})` : "()";
    const vars = Array.from({ length: count }, (_, i) => `x${i + 1}`).join(", ");
    return suffix ? `(${vars}, ${suffix})` : `(${vars})`;
  };

  switch (block.type) {
    case "Zero": return `z${args(n)}`;
    case "Successor": return `s(x)`;
    case "Projection": {
      const i = block.num_values?.find(v => v.name === "i")?.value ?? 1;
      return `id[${i},${n}]${args(n)}`;
    }
    case "Composition": {
      const m = block.num_values?.find(v => v.name === "m")?.value ?? 1;
      return `C${n}[${m}]${args(n)}`;
    }
    case "Primitive Recursion": return `Pr[f,g]${args(n > 0 ? n - 1 : 0, "y")}`;
    case "Minimization": return `Mn[f]${args(n)}`;
    default: return "";
  }
};

export function Block({ block, onUpdate, highlightedBlockId, selectedBlockId, onSelectBlock, isRunning = false }: Props) { 
  const [collapsed, setCollapsed] = React.useState(block?.collapsed ?? false);
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

  // Link highlight strictly to the active step
  // This ensures that as soon as the 'Step' moves the highlight elsewhere, the color reverts.
  const isCurrentlyActive = highlightedBlockId === block.id;
  const showInputChange = isCurrentlyActive && executionState?.inputs !== undefined;
  const showOutputChange = isCurrentlyActive && executionState?.output !== undefined;

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
        ${selectedBlockId === block.id ? "selected-block" : ""}
        ${block.type === "Custom" ? "block-custom-style" : ""}`}
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
              <div className="block-type">{block.name || blockConfig[block.type]?.displayName || block.type.toUpperCase()}</div>
              {block.type !== "Custom" && (
                <div className="block-math-notation">{getMathNotation(block)}</div>
              )}
            </div>
          </div>
        </div>

        <div className="block-error-list">
          {block.errors.map((error, index) => (
            <div key={index} className="block-error">{error}</div>
          ))}
        </div>

        <div className="block-action-buttons">
          {blockConfig[block.type]?.description && (
            <button className="info-button" title={"Show description"} onClick={() => setShowInfo(prev => !prev)}>i</button>
          )}
          {(block.children.length > 0 || (block.num_values && block.num_values.length > 0)) && (
            <button className="collapse-button" onClick={toggleCollapse}>{collapsed ? "▼" : "▶"}</button>
          )}
          {!block.immutable && (
            <button className="remove-button" onClick={() => onUpdate(null)}>✕</button>
          )}
        </div>
      </div>

      {showInfo && blockConfig[block.type]?.description && (
        <div className="block-description">
          {blockConfig[block.type]?.description ?? "No description available for this block."}
        </div>
      )}

      <div className="block-io-in">
        <span className="block-io-label">In:</span>
        <span 
          key={`in-${block.id}-${JSON.stringify(executionState?.inputs)}`}
          className={`block-io-value ${showInputChange ? 'value-changed' : ''}`}
        >
          {formatInput(executionState?.inputs ?? block.latestInput)}
        </span>
      </div>

      {!collapsed && (
        <div className={`slots-container ${block.type === "Composition" ? "composition-slots" : ""}`}>
          {block.children.map((slot) => {
            const slotDisplay = (
              <BlockSlotDisplay 
                parentBlock={block} 
                slot={slot} 
                onUpdate={onUpdate} 
                highlightedBlockId={highlightedBlockId} 
                selectedBlockId={selectedBlockId} 
                onSelectBlock={onSelectBlock} 
                isRunning={isRunning} 
              />
            );

            if (block.type === "Composition") {
              const label = slot.name.startsWith("g") 
                ? <span>g<sub>{slot.name.slice(1)}</sub></span> 
                : <span>f</span>;

              return (
                <div key={`${block.id}-${slot.name}`} className="composition-slot-row">
                  <div className="composition-slot-label">{label}:</div>
                  <div className="composition-slot-content">{slotDisplay}</div>
                </div>
              );
            }

            return <div key={`${block.id}-${slot.name}`}>{slotDisplay}</div>;
          })}
        </div>
      )}

      {!collapsed && <ValueEditor block={block} onUpdate={onUpdate} isRunning={isRunning} />}

      <div className="block-io-out">
        <span className="block-io-label">Out:</span>
        <span 
          key={`out-${block.id}-${executionState?.output}`}
          className={`block-io-value ${showOutputChange ? 'value-changed' : ''}`}
        >
          {formatOutput(executionState?.output ?? block.latestOutput)}
        </span>
      </div>
    </div>
  );
}

export function getDefaultChildren(type: BlockType, depth: number = 0): Array<BlockSlot> {
  const blockDef = blockConfig[type];
  return blockDef ? blockDef.children.map(child => ({
    ...child,
    block: child.block ? { ...child.block, depth: depth + 1 } : null
  })) : [];
}

export function getDefaultValues(type: BlockType): Array<{ name: string; value: number }> {
  const blockDef = blockConfig[type];
  if (blockDef?.num_values) {
    return blockDef.num_values.map(v => ({ ...v }));
  }
  return [];
}