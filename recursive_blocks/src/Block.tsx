import React from "react";
import { useDrag } from "react-dnd";
import { BlockData } from "./BlockUtil";
import './Block.css';
import { blockConfig, BlockSlot, BlockType } from "./BlockConfig";
import { ValueEditor } from "./ValueEditor";
import { BlockSlotDisplay } from "./BlockSlot";
import { useBlockEditor } from "./BlockEditorContext";
import { PRTracePanel } from "./PRTracePanel";
import { getHeaderNotation } from "./Notation";

interface Props {
  block: BlockData | null;
  onUpdate: (newBlock: BlockData | null) => void;
  highlightedBlockId?: string | null;
  selectedBlockId?: string | null; 
  onSelectBlock: (id: string) => void;
  isRunning?: boolean;
  renderDepth?: number;
}

const DEPTH_COLOR_FALLBACKS = ['#8d4f54', '#4e834d', '#4f4d95', '#8a7344', '#8a573b', '#6f4d89'];
const CUSTOM_BLOCK_TINT_FALLBACK = '#514d64';

const getThemeCssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const getDepthColor = (depth: number) => {
  const index = depth % DEPTH_COLOR_FALLBACKS.length;
  return getThemeCssVar(`--depth-color-${index + 1}`, DEPTH_COLOR_FALLBACKS[index]);
};

const colorToRgb = (color: string) => {
  const normalized = color.trim();

  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1);
    const value = hex.length === 3
      ? hex.split('').map((char) => char + char).join('')
      : hex;
    const parsed = Number.parseInt(value, 16);

    return {
      r: (parsed >> 16) & 255,
      g: (parsed >> 8) & 255,
      b: parsed & 255,
    };
  }

  const match = normalized.match(/rgba?\(([^)]+)\)/i);
  if (match) {
    const [r = 255, g = 255, b = 255] = match[1]
      .split(',')
      .slice(0, 3)
      .map((part) => Number.parseFloat(part.trim()));

    return { r, g, b };
  }

  return { r: 255, g: 255, b: 255 };
};

const blendHexColors = (base: string, tint: string, tintWeight: number) => {
  const baseRgb = colorToRgb(base);
  const tintRgb = colorToRgb(tint);
  const baseWeight = 1 - tintWeight;
  const blendChannel = (baseChannel: number, tintChannel: number) =>
    Math.round(baseChannel * baseWeight + tintChannel * tintWeight);

  return `rgb(${blendChannel(baseRgb.r, tintRgb.r)}, ${blendChannel(baseRgb.g, tintRgb.g)}, ${blendChannel(baseRgb.b, tintRgb.b)})`;
};

const getCustomBlockColors = (depth: number) => {
  const baseColor = getDepthColor(depth);
  const customTint = getThemeCssVar('--custom-block-tint', CUSTOM_BLOCK_TINT_FALLBACK);
  const mutedBase = blendHexColors(baseColor, '#000000', 0.14);

  return {
    background: blendHexColors(mutedBase, customTint, 0.48),
    border: blendHexColors(mutedBase, customTint, 0.42),
  };
};

const getTranslucentShade = (base: string, darkenWeight: number, alpha: number) => {
  const baseRgb = colorToRgb(base);
  const darkenChannel = (channel: number) => Math.round(channel * (1 - darkenWeight));

  return `rgba(${darkenChannel(baseRgb.r)}, ${darkenChannel(baseRgb.g)}, ${darkenChannel(baseRgb.b)}, ${alpha})`;
};

const getLightenedTranslucentShade = (base: string, lightenWeight: number, alpha: number) => {
  const baseRgb = colorToRgb(base);
  const lightenChannel = (channel: number) =>
    Math.round(channel + (255 - channel) * lightenWeight);

  return `rgba(${lightenChannel(baseRgb.r)}, ${lightenChannel(baseRgb.g)}, ${lightenChannel(baseRgb.b)}, ${alpha})`;
};

const getSlotLabel = (blockType: BlockType, slotName: string): React.ReactNode => {
  if (blockType === "Composition") {
    return slotName.startsWith("g")
      ? <span>g<sub>{slotName.slice(1)}</sub></span>
      : <span>{slotName}</span>;
  }
  return slotName;
};

export function Block({ block, onUpdate, highlightedBlockId, selectedBlockId, onSelectBlock, isRunning = false, renderDepth }: Props) { 
  const [collapsed, setCollapsed] = React.useState(block?.collapsed ?? false);
  const [showInfo, setShowInfo] = React.useState(false);
  const { blockExecutionStates, prTraceMode, setPRTraceMode, prTraceFrames, prOriginalInputs, prFinalOutputs } = useBlockEditor();

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
  const isMutedCustomBlock = block.type === "Custom" || block.immutable;

  // Link highlight strictly to the active step
  // This ensures that as soon as the 'Step' moves the highlight elsewhere, the color reverts.
  const isCurrentlyActive = highlightedBlockId === block.id;
  const showInputChange = isCurrentlyActive && executionState?.inputs !== undefined;
  const showOutputChange = isCurrentlyActive && executionState?.output !== undefined;

  const isPRTraceActive = block.type === "Primitive Recursion" && prTraceMode[block.id];

  // When PR trace panel is on, freeze in at original inputs, hide out while running
  const displayInput = isPRTraceActive && prOriginalInputs[block.id]
    ? prOriginalInputs[block.id]
    : executionState?.inputs ?? block.latestInput;

  const displayOutput = isPRTraceActive
    ? (prFinalOutputs[block.id] !== undefined ? prFinalOutputs[block.id] : undefined)
    : executionState?.output ?? block.latestOutput;

  const formatInput = (input: number[] | undefined) => {
    if (!input || input.length === 0) return '—';
    return `(${input.join(', ')})`;
  };

  const formatOutput = (output: number | undefined) => {
    return output !== undefined ? output.toString() : '—';
  };

  const resolvedDepth = renderDepth ?? block.depth ?? 0;
  const depthColor = getDepthColor(resolvedDepth);
  const customColors = isMutedCustomBlock ? getCustomBlockColors(resolvedDepth) : null;
  const blockBackground = customColors?.background ?? depthColor;
  const blockBorder = customColors?.border ?? depthColor;
  const ioPillBackgroundLight = getLightenedTranslucentShade(blockBackground, 0.36, 0.8);
  const ioPillBorderLight = getLightenedTranslucentShade(blockBackground, 0.48, 0.94);
  const ioPillBackgroundDark = getTranslucentShade(blockBackground, 0.34, 0.62);
  const ioPillBorderDark = getTranslucentShade(blockBackground, 0.08, 0.78);
  const emptySlotBackgroundLight = getLightenedTranslucentShade(blockBackground, 0.24, 0.58);
  const emptySlotBorderLight = getLightenedTranslucentShade(blockBackground, 0.12, 0.76);
  const valueInputBackgroundDark = getTranslucentShade(blockBackground, 0.18, 0.56);
  const valueInputFocusBackground = getTranslucentShade(blockBackground, 0.24, 0.66);
  const blockStyle = {
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: blockBackground,
    borderLeft: `5px solid ${blockBorder}`,
    '--io-pill-bg-light': ioPillBackgroundLight,
    '--io-pill-border-light': ioPillBorderLight,
    '--io-pill-bg-dark': ioPillBackgroundDark,
    '--io-pill-border-dark': ioPillBorderDark,
    '--empty-slot-bg-light': emptySlotBackgroundLight,
    '--empty-slot-border-light': emptySlotBorderLight,
    '--value-input-bg-dark': valueInputBackgroundDark,
    '--value-input-focus-bg': valueInputFocusBackground,
  } as React.CSSProperties;

  return (
    <div 
      className={`block-container
        ${highlightedBlockId === block.id ? "block-highlighted" : ""} 
        ${selectedBlockId === block.id ? "selected-block" : ""}
        ${isMutedCustomBlock ? "block-custom-style" : ""}`}
      ref={dragRef}
      style={blockStyle}
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
                <div className="block-math-notation">{getHeaderNotation(block)}</div>
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
          {block.type === "Primitive Recursion" && (
            <button
              className={`pr-trace-toggle-button ${prTraceMode[block.id] ? "pr-trace-active" : ""}`}
              title="Toggle recursion trace panel"
              onClick={() => setPRTraceMode(prev => ({ ...prev, [block.id]: !prev[block.id] }))}
            >
              T
            </button>
          )}
          {(block.children.length > 0 || (block.num_values && block.num_values.length > 0) || block.type === "Zero" || block.type === "Successor") && (
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
          {formatInput(displayInput)}
        </span>
      </div>

      {!collapsed && (
        <>
          <div className="slots-container">
            {(block.type === "Primitive Recursion" ? [...block.children].reverse() : block.children).map((slot, i) => {
              const slotDisplay = (
                <BlockSlotDisplay
                  parentBlock={block}
                  slot={slot}
                  onUpdate={onUpdate}
                  highlightedBlockId={highlightedBlockId}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={onSelectBlock}
                  isRunning={isRunning}
                  renderDepth={resolvedDepth + 1}
                />
              );

              return (
                <React.Fragment key={`${block.id}-${slot.name}`}>
                  {blockConfig[block.type].showSlotLabels && (
                    <div className="slot-label">{getSlotLabel(block.type, slot.name)}</div>
                  )}
                  <div>{slotDisplay}</div>
                  {block.type === "Primitive Recursion" && i === 0 && prTraceMode[block.id] && (
                    <>
                      <div className="slot-label">Trace Panel</div>
                      <PRTracePanel frame={prTraceFrames[block.id]} />
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <ValueEditor block={block} onUpdate={onUpdate} isRunning={isRunning} />
        </>
      )}

      <div className="block-io-out">
        <span className="block-io-label">Out:</span>
        <span 
          key={`out-${block.id}-${executionState?.output}`}
          className={`block-io-value ${showOutputChange ? 'value-changed' : ''}`}
        >
          {formatOutput(displayOutput)}
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
