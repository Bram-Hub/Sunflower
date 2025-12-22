import React, { useState, useCallback, useEffect, useRef  } from "react";
import { BlockData, evaluateBlock, setInputCountOfBlock, stepBlock } from "./BlockUtil";
import './Block.css';
import { DEFAULT_INPUT_DESCRIPTOR } from "./BlockConfig";
import { Toolbar } from "./Toolbar";
import { BlockSave, deserializeBlock, serializeBlock } from "./BlockSave";
import { useBlockEditor } from "./BlockEditorContext";
import { BlockSlotDisplay } from "./BlockSlot";
import { BlockPalette } from "./BlockPalette";

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
  const { inputCount, setInputCount, rootBlock, setRootBlock, customBlockCount: _customBlockCount, setCustomBlockCount } = useBlockEditor();
  const [inputs, setInputs] = useState<number[]>(new Array(inputCount).fill(0));
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationSpeed, setEvaluationSpeed] = useState<number>(2);
  const isHaltedRef = useRef(false);
  const stepQueue = useRef<(() => Promise<void>)[]>([]);
  const isStepping = useRef(false);

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

  const handleHalt = () => {
    isHaltedRef.current = true;
    stepQueue.current = [];
    isStepping.current = false;
  };
  
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  const handleStep = async () => {
    if (isEvaluating) return;
  
    if (!isStepping.current) {
      // Start a new stepping session
      isStepping.current = true;
      isHaltedRef.current = false;
      setCurrentResult(null);
  
      if (!rootBlock) {
        alert("No root block to evaluate.");
        isStepping.current = false;
        return;
      }
  
      const onStepCallback = async (block: BlockData, result: number) => {
        return new Promise<void>((resolve) => {
          stepQueue.current.push(async () => {
            if (isHaltedRef.current) {
              stepQueue.current = [];
              isStepping.current = false;
              setHighlightedBlockId(null);
              resolve();
              return;
            }
            setHighlightedBlockId(block.id);
            setCurrentResult(result);
            resolve();
          });
        });
      };
  
      // Don't await this, it will populate the queue
      stepBlock(rootBlock, inputs, onStepCallback).then(() => {
        stepQueue.current.push(async () => {
          setHighlightedBlockId(null);
          isStepping.current = false;
        });
      });
    }
  
    // Execute the next step in the queue
    const nextStep = stepQueue.current.shift();
    if (nextStep) {
      await nextStep();
    } else {
      isStepping.current = false;
      setHighlightedBlockId(null);
    }
  };

  const handleRun = async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    isStepping.current = false;
    stepQueue.current = [];
    isHaltedRef.current = false;
    setCurrentResult(null);
    if (!rootBlock) {
      alert("No root block to evaluate.");
      setIsEvaluating(false);
      return;
    }

    try {
      const speedMap: Record<number, number> = {
        0: 0,
        1: 100,
        2: 500,
      };
      const delay = speedMap[evaluationSpeed];

      if (delay === 0) {
        // Instant evaluation
        const result = await evaluateBlock(rootBlock, inputs);
        setCurrentResult(result);
      } else {
        // Step-by-step evaluation
        const onStepCallback = async (block: BlockData, result: number) => {
          if (isHaltedRef.current) {
            throw new Error("Halted");
          }
          setHighlightedBlockId(block.id);
          setCurrentResult(result);
          await sleep(delay);
        };
        await stepBlock(rootBlock, inputs, onStepCallback);
      }
    } catch (error: any) {
      if (error.message !== "Halted") {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setHighlightedBlockId(null);
      setIsEvaluating(false);
    }
  };

  const speedToText = (speed: number) => {
    if (speed === 0) return "Instant";
    if (speed === 1) return "Fast";
    return "Slow";
  };
  
  return (
    <>
      <Toolbar 
        onSave={handleSave}
        onLoad={handleLoad}
        onRun={handleRun}
        onHalt={handleHalt}
        onStep={handleStep}
        inputCount={inputCount}
        onInputCountChange={handleInputCountChange}
        inputs={inputs}
        onInputChange={handleInputChange}
        evaluationSpeed={evaluationSpeed}
        onEvaluationSpeedChange={setEvaluationSpeed}
        speedToText={speedToText}
        currentResult={currentResult}
      />

      <div className = "flexcont">

        <BlockPalette />

        <div className="editor-content">
          <BlockSlotDisplay 
            parentBlock={null} 
            slot={{ name: "Root", block: rootBlock, input_descriptor: DEFAULT_INPUT_DESCRIPTOR }} 
            onUpdate={(block) => {
              console.log(block);
              setRootBlock(block);
            }}
            highlightedBlockId={highlightedBlockId}
          />
        </div>
      </div>

      <hr className="my-6" />
    </>
  );
}