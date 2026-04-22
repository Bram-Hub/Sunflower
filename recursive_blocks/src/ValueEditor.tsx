import { useState, useEffect } from "react";
import { BlockData } from "./BlockUtil";
import { blockConfig } from "./BlockConfig";
import { useBlockEditor } from "./BlockEditorContext";
import { getInformalNotation } from "./Notation";

interface ValueEditorProps {
  block: BlockData;
  onUpdate: (newBlock: BlockData | null) => void;
  isRunning?: boolean;
}

// JSX element that exists on a JSX Block element that represents the number values of the block, making them accessible to be updated.
// If the block type doesn't have values, this element is an empty div.
// Block is the block this value editor is on, and onUpdate is called when a value is updated.
export function ValueEditor({ block, onUpdate, isRunning = false }: ValueEditorProps) {
  const [values, setValues] = useState(block.num_values ?? []);
  const { editMode } = useBlockEditor();

  useEffect(() => {
    if (JSON.stringify(values) !== JSON.stringify(block.num_values)) {
      onUpdate({ ...block, num_values: values, depth: block.depth || 0 });
    }
  }, [values, block, onUpdate]);

  const handleValueChange = (index: number, newValue: string) => {
    const updatedValues = [...values];
    updatedValues[index] = { ...updatedValues[index], value: isNaN(parseInt(newValue)) ? 0 : parseInt(newValue) };
    setValues(updatedValues);
  };

  if (!values || values.length === 0) {
    const notation = getInformalNotation(block);
    if (!notation) return;
    return (
      <div className="value-editor">
        <div className="value-field">
          <span className="value-static">
            <span className="value-static-name">{notation.label}</span>
            <span className="value-static-val">{notation.value}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
      <div className="value-editor">
      {values.map((val, index) => {
        const staticValue = getInformalNotation(block, val.name, val.value);
        if (!staticValue) return null;

        return (
          <div key={index} className="value-field">
            {isRunning || !editMode ? (
              <span className="value-static">
                <span className="value-static-name">{staticValue.label}</span>
                <span className="value-static-val">{staticValue.value}</span>
              </span>
            ) : (
              <>
                <label className="value-label">{val.name}</label>
                <input
                  type="number"
                  min={blockConfig[block.type].num_values?.find(v => v.name === val.name)?.min || 0}
                  step="1"
                  value={val.value}
                  onChange={(e) => handleValueChange(index, e.target.value)}
                  className="value-input"
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
