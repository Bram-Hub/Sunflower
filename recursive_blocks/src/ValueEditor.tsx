import { useState, useEffect } from "react";
import { BlockData } from "./BlockUtil";
import { blockConfig } from "./BlockConfig";

interface ValueEditorProps {
  block: BlockData;
  onUpdate: (newBlock: BlockData | null) => void;
}

export function ValueEditor({ block, onUpdate }: ValueEditorProps) {
  // Initialize state with num_values from block, or an empty array if not defined
  const [values, setValues] = useState(block.num_values ?? []);

//   console.log("Initial values in Block:", block.num_values);

  // Update num_values only if they change
  useEffect(() => {
    if (JSON.stringify(values) !== JSON.stringify(block.num_values)) {
      onUpdate({ ...block, num_values: values, depth: block.depth || 0 });
    }
  }, [values, block, onUpdate]);

  // Handle change in an individual value input field
  const handleValueChange = (index: number, newValue: string) => {
    const updatedValues = [...values];
    updatedValues[index] = { ...updatedValues[index], value: isNaN(parseInt(newValue)) ? 1 : parseInt(newValue) };
    setValues(updatedValues);
  };

  if (!values || values.length === 0) {
    return;
  }

  return (
    <div className="value-editor">
      {values.map((val, index) => (
        <div key={index} className="value-field">
          <label className="value-label">{val.name}</label>
          <input
            type="number"
            min={blockConfig[block.type].num_values?.find(v => v.name === val.name)?.min || 1}
            step="1"
            value={val.value}
            onChange={(e) => handleValueChange(index, e.target.value)}
            className="value-input"
          />
        </div>
      ))}
    </div>
  );
}
