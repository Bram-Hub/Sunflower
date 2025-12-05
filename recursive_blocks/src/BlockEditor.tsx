import React, { useState, useRef, useCallback  } from "react";
import { BlockData, evaluateBlock, removeBlockById, setInputCountOfBlock, stepBlock } from "./BlockUtil";
import { Block, getDefaultChildren, getDefaultValues } from "./Block";
import { v4 as uuidv4 } from "uuid";
import { useDrop } from "react-dnd";
import './Block.css';
import { BlockType } from "./BlockConfig";
import { Toolbar } from "./Toolbar";

interface EditorSaveState {
  fileType: string;
  rootBlock: BlockData | null;
  inputs: number[];
  inputCount: number;
}

const DEFAULT_INPUT_COUNT = 2;

export function BlockEditor() {
  const [rootBlock, setRootBlock] = useState<BlockData | null>(null);
  const [inputs, setInputs] = useState<number[]>(new Array(DEFAULT_INPUT_COUNT).fill(0));
  const [inputCount, setInputCount] = useState<number>(DEFAULT_INPUT_COUNT);
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationSpeed, setEvaluationSpeed] = useState<number>(2);
  const isHaltedRef = useRef(false);
  const stepQueue = useRef<(() => Promise<void>)[]>([]);
  const isStepping = useRef(false);

  const handleUpdateRoot = (newBlock: BlockData | null, movedId?: string) => {
    if (!newBlock) return;
    let cleaned = rootBlock;

    if (movedId && cleaned) {
      cleaned = removeBlockById(cleaned, movedId);
    }

    setRootBlock(newBlock);
  };

  React.useEffect(() => {
    if (!rootBlock) {
      return;
    }
    setInputCountOfBlock(rootBlock, inputCount);

  }, [JSON.stringify(rootBlock), inputCount]);

  const handleInputCountChange = (count: number) => {
    const clamped = Math.max(0, count);
    setInputCount(clamped);
    setInputs(Array.from({ length: clamped }, (_, i) => inputs[i] ?? 0));
  };

  const handleInputChange = (index: number, value: number) => {
    const updated = [...inputs];
    updated[index] = value;
    setInputs(updated);
  };

  const handleSave = useCallback(() => {
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
      fileType: "BRAM_EDITOR_STATE_V1",
      rootBlock,
      inputs,
      inputCount,
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
  }, [rootBlock, inputs, inputCount]);

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
              loadedState.fileType !== "BRAM_EDITOR_STATE_V1" || 
              !Array.isArray(loadedState.inputs) ||
              typeof loadedState.inputCount !== 'number') {
             throw new Error("Invalid or incompatible .bramflower file.");
          }

          // Add this function to properly initialize depths when loading
          const initializeDepths = (block: BlockData | null, currentDepth: number = 0): BlockData | null => {
            if (!block) return null;
            
            return {
              ...block,
              depth: currentDepth,
              children: block.children.map(slot => ({
                ...slot,
                block: slot.block ? initializeDepths(slot.block, currentDepth + 1) : null
              }))
            };
          };

          const rootWithDepths = loadedState.rootBlock 
            ? initializeDepths(loadedState.rootBlock, 0)
            : null;

          setRootBlock(rootWithDepths);
          setInputs(loadedState.inputs);
          setInputCount(loadedState.inputCount);

          console.log("State loaded successfully with depth initialization.");
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
      stepBlock(rootBlock, inputs, stepBlock, onStepCallback).then(() => {
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
        const result = evaluateBlock(rootBlock, inputs);
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
        await stepBlock(rootBlock, inputs, stepBlock, onStepCallback);
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
    <div className="editor flex-1 border p-4 bg-gray-50">
      <Toolbar 
        onSave={handleSave}
        onLoad={handleLoad}
        onRun={handleRun}
        onHalt={handleHalt}
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
            onChange={(e) => handleInputCountChange(parseInt(e.target.value))}
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
              onChange={(e) => handleInputChange(i, parseFloat(e.target.value))}
              className="px-2 py-1 border rounded"
              placeholder={`Input ${i + 1}`}
            />
          ))}
        </div>
        
        <div className="speed-control">
          <input
            id="speed-slider"
            type="range"
            min="0"
            max="2"
            step="1"
            value={evaluationSpeed}
            onChange={(e) => setEvaluationSpeed(parseInt(e.target.value))}
          />
          <label htmlFor="speed-slider">Speed: {speedToText(evaluationSpeed)}</label>
        </div>

        <div className="result">
          <p>Result: {currentResult}</p>
        </div>
      </div>

      <div className="editor-content">
        {rootBlock ? (
          <Block block={rootBlock} onUpdate={setRootBlock} highlightedBlockId={highlightedBlockId} />
        ) : (
          <RootDropArea onDrop={handleUpdateRoot} rootBlock={rootBlock} />
        )}
      </div>

      <hr className="my-6" />

      
    </div>
  );
}

function RootDropArea({
  onDrop,
  rootBlock,
}: {
  onDrop: (newBlock: BlockData | null, movedId?: string) => void;
  rootBlock: BlockData | null;
}) {
  const dropRef = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop(() => ({
    accept: "BLOCK",
    drop: (item: { type: BlockType; block?: BlockData }) => {
      if (item.block) {
        const newRootBlock = {
          ...item.block,
          depth: 0,
          inputCount: DEFAULT_INPUT_COUNT
        };
        onDrop(newRootBlock, item.block.id);
      } else {
        onDrop({
          id: uuidv4(),
          type: item.type,
          children: getDefaultChildren(item.type, 0),
          collapsed: item.type === "Custom",
          num_values: getDefaultValues(item.type),
          inputCount: DEFAULT_INPUT_COUNT,
          depth: 0
        });
      }
    },
  }));

  React.useEffect(() => {
    if (dropRef.current) {
      drop(dropRef.current);
    }
  }, [drop]);

  return (
    <div
      ref={dropRef}
      className={`block-slot ${rootBlock ? "filled" : "empty"}`}
    >
      {rootBlock ? "Root Block Added" : "Drop a block to start"}
    </div>
  );
}