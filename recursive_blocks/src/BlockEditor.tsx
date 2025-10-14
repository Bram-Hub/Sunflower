import React, { useState, useCallback, useEffect  } from "react";
import { evaluateBlock, setInputCountOfBlock, stepBlock } from "./BlockUtil";
import './Block.css';
import { DEFAULT_INPUT_DESCRIPTOR } from "./BlockConfig";
import { Toolbar } from "./Toolbar";
import { BlockSave, deserializeBlock, serializeBlock } from "./BlockSave";
import { useBlockEditor } from "./BlockEditorContext";
import { BlockSlotDisplay } from "./BlockSlot";

export interface EditorSaveState {
  fileType: string;
  rootBlock?: BlockSave;
  inputs: number[];
  inputCount: number;
  customBlocks: BlockSave[];
}

export const CURRENT_FILETYPE_VERSION = "BRAM_EDITOR_STATE_V2";

export const DEFAULT_INPUT_COUNT = 2;

export const customBlocks: BlockSave[] = [];

// JSX element that represents the editor, containing a root block and the header.
export function BlockEditor() {
  const { inputCount, setInputCount } = useBlockEditor();
  const [inputs, setInputs] = useState<number[]>(new Array(inputCount).fill(0));

  const { rootBlock, setRootBlock, customBlockCount: _customBlockCount, setCustomBlockCount } = useBlockEditor();

  React.useEffect(() => {
    if (!rootBlock) {
      return;
    }
    setInputCountOfBlock(rootBlock, inputCount);

  }, [JSON.stringify(rootBlock), inputCount]);

  useEffect(() => {
    setInputs((prevInputs) => {
      const newInputs = Array.from({ length: inputCount }, (_, i) => prevInputs[i] ?? 0);
      return newInputs;
    });

    // If rootBlock exists, keep it updated too
    if (rootBlock) {
      setInputCountOfBlock(rootBlock, inputCount);
    }
  }, [inputCount, rootBlock]);

  const handleInputCountChange = (count: number) => {
    const clamped = Math.max(0, count);
    setInputCount(clamped);
  };

  const handleInputChange = (index: number, value: number) => {
    const updated = [...inputs];
    updated[index] = value;
    setInputs(updated);
  };

  const handleSave = useCallback(() => {
    createSaveFile(rootBlock ? serializeBlock(rootBlock) : undefined, inputs, inputCount);
  }, [rootBlock, inputs, inputCount]);

  function createSaveFile(rootBlock: BlockSave | undefined, inputs: number[], inputCount: number) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;
    const filename = `${timestamp}.bramflower`;

    const stateToSave: EditorSaveState = {
      fileType: CURRENT_FILETYPE_VERSION,
      rootBlock,
      inputs,
      inputCount,
      customBlocks
    };

    try {
      const stateString = JSON.stringify(stateToSave, null, 2);
      const blob = new Blob([stateString], { type: 'application/octet-stream' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(link.href);
      console.log("State saved successfully as:", filename);
    } catch (error) {
      console.error("Failed to save state:", error);
      alert(`Error saving file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        try {
          const loadedState: EditorSaveState = JSON.parse(content);
          if (typeof loadedState !== 'object' || loadedState === null ||
              loadedState.fileType !== CURRENT_FILETYPE_VERSION || 
              !Array.isArray(loadedState.inputs) ||
              typeof loadedState.inputCount !== 'number') {
             throw new Error("Invalid or incompatible .bramflower file.");
          }

          setRootBlock(loadedState.rootBlock ? deserializeBlock(loadedState.rootBlock) : null);
          setInputs(loadedState.inputs);
          setInputCount(loadedState.inputCount);

          loadedState.customBlocks.forEach(element => {
            if (!customBlocks.find(b => b.name === element.name)) {
              customBlocks.push(element);
            }
          });
          setCustomBlockCount(customBlocks.length);

          console.log("State loaded successfully.");
        } catch (error) {
          console.error("Failed to load or parse state file:", error);
          alert(`Error loading file: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };

    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      alert("Error reading file.");
    };

    reader.readAsText(file);
  };

  const handleEvaluate = () => {
    if (rootBlock) {
      try {
        const result = evaluateBlock(rootBlock, inputs);
        const resultElement = document.querySelector('.result');
        if (resultElement) {
          resultElement.textContent = `Result: ${result}`;
        }
      } catch (error: any) {
        alert(`Error: ${error.message}`);
      }
    } else {
      alert("No root block to evaluate.");
    }
  };

  const handleStep = () => {
    if (rootBlock) {
      try {
        const result = stepBlock(rootBlock, inputs);
        const resultElement = document.querySelector('.result');
        if (resultElement) {
          resultElement.textContent = `Result: ${result}`;
        }
      } catch (error: any) {
        alert(`Error: ${error.message}`);
      }
    } else {
      alert("No root block to evaluate.");
    }
  };

  return (
    <div className="editor flex-1 border p-4 bg-gray-50">
      <Toolbar 
        onSave={handleSave}
        onLoad={handleLoad}
        onEvaluate={handleEvaluate}
        onStep={handleStep}
      />
      <div className="input-section">
        <h3 className="font-semibold mb-2">Inputs</h3>
        <label className="block mb-2">
          Number of Inputs:
          <input
            type="number"
            value={inputCount}
            min={0}
            step={1}
            onChange={(e) => handleInputCountChange(parseInt(e.target.value) || 0)}
            className="ml-2 px-2 py-1 border rounded w-20"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {inputs.map((val, i) => (
            <input
              key={i}
              type="number"
              value={val}
              min={0}
              step={1}
              onChange={(e) => handleInputChange(i, parseInt(e.target.value) || 0)}
              className="px-2 py-1 border rounded"
              placeholder={`Input ${i + 1}`}
            />
          ))}
        </div>
        <p className="result">Result: </p>
      </div>

      <div className="editor-content">
        <BlockSlotDisplay parentBlock={null} slot={{ name: "Root", block: rootBlock, input_descriptor: DEFAULT_INPUT_DESCRIPTOR }} onUpdate={(block) => {
          // console.log("Root block updated:", block);
          setRootBlock(block);
        }} />
      </div>

      <hr className="my-6" />
    </div>
  );
}