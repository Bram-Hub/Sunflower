import React, { useState, useCallback, useEffect, useRef  } from "react";
import { BlockData, checkForErrors, evaluateBlock, setInputCountOfBlock, stepBlock } from "./BlockUtil";
import './Block.css';
import { Toolbar } from "./Toolbar";
import { BlockSave, deserializeBlock, serializeBlock } from "./BlockSave";
import { useBlockEditor } from "./BlockEditorContext";
import { BlockSlotDisplay } from "./BlockSlot";
import { BlockPalette } from "./BlockPalette";
import { removeBlockById } from "./BlockUtil";

export interface EditorSaveState {
  fileType: string;
  rootBlock?: BlockSave;
  inputs: number[];
  inputCount: number;
  customBlocks: Record<string, BlockSave>;
}

export const CURRENT_FILETYPE_VERSION = "BRAM_EDITOR_STATE_V2";

export const DEFAULT_INPUT_COUNT = 2;

export const customBlocks: Record<string, BlockSave> = {};

enum StepMode {
  None,
  Step,
  Trace
}

// JSX element that represents the editor, containing a root block and the header.
export function BlockEditor() {
  const { inputCount, setInputCount, rootBlock, setRootBlock, customBlockCount: _customBlockCount, setCustomBlockCount, setBlockExecutionStates, setEditMode } = useBlockEditor();
  const [inputs, setInputs] = useState<number[]>(new Array(inputCount > 0 ? inputCount : 0).fill(0));
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [currentResult, setCurrentResult] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [evaluationSpeed, setEvaluationSpeed] = useState<number>(2);
  const [paused, setPaused] = useState(false);
  const loadInputRef = useRef<HTMLInputElement>(null);
  const pauseResolver = useRef<((value: void | PromiseLike<void>) => void) | null>(null);
  const isHaltedRef = useRef(false);
  const stepModeRef = useRef<StepMode>(StepMode.None);
  const ignoreBreakpointsRef = useRef(false);
  const breakpointsRef = useRef<Set<string>>(new Set());
  const selfRecDepthRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const newBreakpoints = new Set<string>();
    const traverse = (b: BlockData) => {
      if (b.hasBreakpoint) {
        newBreakpoints.add(b.id);
      }
      for (const slot of b.children) {
        if (slot.block) {
          traverse(slot.block);
        }
      }
    };
    if (rootBlock) {
      traverse(rootBlock);
    }
    breakpointsRef.current = newBreakpoints;
  }, [rootBlock]);

  React.useEffect(() => {
    if (!rootBlock) return;
    if (isNaN(inputCount)) return;
    if (rootBlock.inputCount === inputCount) return;

    const clone = (typeof structuredClone === 'function')
      ? structuredClone(rootBlock)
      : JSON.parse(JSON.stringify(rootBlock));

    setInputCountOfBlock(clone, inputCount > 0 ? inputCount : 0);
    checkForErrors(clone);
    setRootBlock(clone);
  }, [rootBlock, inputCount, setRootBlock]);

  useEffect(() => {
    setInputs((prevInputs) => {
      const newInputs = Array.from({ length: inputCount > 0 ? inputCount : 0 }, (_, i) => prevInputs[i] ?? 0);
      return newInputs;
    });

    if (rootBlock) {
      setInputCountOfBlock(rootBlock, inputCount > 0 ? inputCount : 0);
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
    createSaveFile(rootBlock ? serializeBlock(rootBlock) : undefined, inputs, inputCount > 0 ? inputCount : 0);
  }, [rootBlock, inputs, inputCount]);

  const handleDeleteSelectedBlock = useCallback(() => {
    if (!rootBlock || !selectedBlockId) return;

    if (rootBlock.id === selectedBlockId) {
      setRootBlock(null);
      setSelectedBlockId(null);
      setHighlightedBlockId(null);
      return;
    }

    const newRoot = removeBlockById(rootBlock, selectedBlockId);
    checkForErrors(newRoot);
    setRootBlock(newRoot);
    setSelectedBlockId(null);
    setHighlightedBlockId(null);
  }, [rootBlock, selectedBlockId]);

  const handleAddTestData = useCallback(() => {
    if (!rootBlock) {
      alert("No blocks to add test data to. Create some blocks first!");
      return;
    }
    setRootBlock({ ...rootBlock });
    console.log("Test data added to all blocks");
  }, [rootBlock, setRootBlock]);

  const handleClearTestData = useCallback(() => {
    if (!rootBlock) return;
    setRootBlock({ ...rootBlock });
    console.log("Test data cleared from all blocks");
  }, [rootBlock, setRootBlock]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const ctrl = isMac ? e.metaKey : e.ctrlKey;

      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) return;

      if ((e.key === "Backspace" || e.key === "Delete") && selectedBlockId) {
        e.preventDefault();
        handleDeleteSelectedBlock();
      }

      if (ctrl && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }

      if (ctrl && e.key.toLowerCase() === "o") {
        e.preventDefault();
        loadInputRef.current?.click();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, selectedBlockId, handleDeleteSelectedBlock]); 

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

          setCustomBlockCount(Object.keys(customBlocks).length);
          for (const [name, customBlock] of Object.entries(loadedState.customBlocks)) {
            customBlocks[customBlock.name ?? name] = customBlock;
          }

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

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleHalt = () => {
    isHaltedRef.current = true;
    stepModeRef.current = StepMode.None;
    
    if (pauseResolver.current) {
      pauseResolver.current();
      pauseResolver.current = null;
    }
    setPaused(false);
  };

  const startOrResume = async (mode: StepMode, ignoreBreakpoints: boolean) => {
    setEditMode(false); // kick user out of edit mode to ensure stable block values
    stepModeRef.current = mode;
    ignoreBreakpointsRef.current = ignoreBreakpoints;

    if (isEvaluating) {
      if (paused && pauseResolver.current) {
        pauseResolver.current();
        pauseResolver.current = null;
        setPaused(false);
      }
      return;
    }

    if (!rootBlock) {
      alert("No root block to evaluate.");
      return;
    }

    setIsEvaluating(true);
    isHaltedRef.current = false;
    setCurrentResult(null);
    setBlockExecutionStates({});
    selfRecDepthRef.current.clear();

    const speedMap: Record<number, number> = { 0: 500, 1: 100, 2: 0 };
    const delay = speedMap[evaluationSpeed];

    // the callback function to be run after evaluation
    const onStepCallback = async (block: BlockData, result: number | null, inputs: number[]) => {
      if (isHaltedRef.current) throw new Error("Halted");

      const isBeforeEval = result === null;

      // update this block's UI
      setHighlightedBlockId(block.id);
      if (!isBeforeEval) setCurrentResult(result);

      // update this block's execution state
      setBlockExecutionStates(prev => ({
        ...prev,
        [block.id]: { inputs, output: !isBeforeEval ? result : undefined }
      }));

      let shouldPause = false;

      // track self-recursion depth so that breakpoints only pause on the first (outermost) call
      if (breakpointsRef.current.has(block.id)) {
        const currentDepth = selfRecDepthRef.current.get(block.id) || 0;
        if (isBeforeEval) {
          selfRecDepthRef.current.set(block.id, currentDepth + 1);
          // pause only if this is the first time we're entering this block
          if (currentDepth === 0 && !ignoreBreakpointsRef.current) {
            shouldPause = true;
          }
        } else {
          selfRecDepthRef.current.set(block.id, Math.max(0, currentDepth - 1));
        }
      }

      if (stepModeRef.current === StepMode.Step && !isBeforeEval) {
        shouldPause = true;
      }
      if (stepModeRef.current === StepMode.Trace) {
        shouldPause = true;
      }

      if (shouldPause) {
        setPaused(true);
        stepModeRef.current = StepMode.None;
        await new Promise<void>(resolve => { pauseResolver.current = resolve; });
      }

      if (delay > 0 && !isBeforeEval) {
        await sleep(delay);
      }
    };

    // execute stepBlock
    try {
      await stepBlock(rootBlock, inputs, onStepCallback);
    } catch (error) {
      if (error instanceof Error && error.message !== "Halted") {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setHighlightedBlockId(null);
      setIsEvaluating(false);
      setPaused(false);
      ignoreBreakpointsRef.current = false;
    }
  };

  const handleRun = () => startOrResume(StepMode.None, false);
  const handleForceRun = () => startOrResume(StepMode.None, true);
  const handleStep = () => startOrResume(StepMode.Step, false);
  const handleTrace = () => startOrResume(StepMode.Trace, false);

  const speedToText = (speed: number) => {
    if (speed === 0) return "Slow";
    if (speed === 1) return "Fast";
    return "Instant";
  };
  
  return (
    <>
      <Toolbar 
        onSave={handleSave}
        onLoad={handleLoad}
        loadInputRef={loadInputRef}

        onRun={handleRun}
        onForceRun={handleForceRun}
        //paused={paused}
        onHalt={handleHalt}
        onStep={handleStep}
        onTrace={handleTrace}
        inputCount={inputCount}
        onInputCountChange={handleInputCountChange}
        inputs={inputs}
        onInputChange={handleInputChange}
        evaluationSpeed={evaluationSpeed}
        onEvaluationSpeedChange={setEvaluationSpeed}
        speedToText={speedToText}
        currentResult={currentResult}
      />

      <div className="flexcont">
        <BlockPalette />
        <div className="editor-content">
          <BlockSlotDisplay 
            parentBlock={null} 
            slot={{ name: "Root", block: rootBlock, input_descriptor_index: 0 }} 
            onUpdate={(block) => {
              if (block) {
                checkForErrors(block);
              }
              setRootBlock(block);
              setHasRun(false);
            }}
            highlightedBlockId={highlightedBlockId}
            selectedBlockId={selectedBlockId}
            onSelectBlock={(id) => setSelectedBlockId(id)}
            isRunning={isEvaluating || hasRun}
          />
        </div>
      </div>

      <hr className="my-6" />
    </>
  );
}