import React, { useState, useCallback, useEffect, useRef  } from "react";
import { BlockData, checkForErrors, setInputCountOfBlock } from "./BlockUtil";
import './Block.css';
import { Toolbar } from "./Toolbar";
import { BlockSave, deserializeBlock, serializeBlock } from "./BlockSave";
import { useBlockEditor } from "./BlockEditorContext";
import { BlockSlotDisplay } from "./BlockSlot";
import { BlockPalette } from "./BlockPalette";
import { removeBlockById } from "./BlockUtil";
import { generateTrace, TraceEvent, TraceEventType, buildPRFrames, PRTraceFrame } from "./Trace";

export interface EditorSaveState {
  fileType: string;
  rootBlock?: BlockSave;
  inputs: number[];
  inputCount: number;
  customBlocks: Record<string, BlockSave>;
}

export const CURRENT_FILETYPE_VERSION = "BRAM_EDITOR_STATE_V2";

export const DEFAULT_INPUT_COUNT = 2;
export const MAX_INPUT_COUNT = 12;
export const MAX_CUSTOM_BLOCKS = 40;

export const customBlocks: Record<string, BlockSave> = {};

const clampInputCount = (count: number) => {
  if (!Number.isFinite(count)) return 0;
  return Math.min(MAX_INPUT_COUNT, Math.max(0, count));
};

enum PlaybackMode {
  Run,
  ForceRun,
  Step,
  Trace
}

// JSX element that represents the editor, containing a root block and the header.
export function BlockEditor() {
  const { inputCount, setInputCount, rootBlock, setRootBlock, customBlockCount: _customBlockCount, setCustomBlockCount, setBlockExecutionStates, setEditMode, prTraceMode, setPRTraceFrames } = useBlockEditor();
  const [inputs, setInputs] = useState<number[]>(new Array(inputCount > 0 ? inputCount : 0).fill(0));
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [currentResult, setCurrentResult] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationSpeed, setEvaluationSpeed] = useState<number>(2);
  const [paused, setPaused] = useState(false);
  const loadInputRef = useRef<HTMLInputElement>(null);
  const isHaltedRef = useRef(false);
  const breakpointsRef = useRef<Set<string>>(new Set());

  // Trace playback state
  const traceRef = useRef<TraceEvent[] | null>(null);
  const cursorRef = useRef<number>(0);
  const finalResultRef = useRef<number | null>(null);
  const playbackDepthsRef = useRef<Map<string, number>>(new Map());

  // PR trace panel state
  const prFrameListRef = useRef<Record<string, PRTraceFrame[]>>({});
  const prCursorRef = useRef<Record<string, number>>({});

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
    if (Number.isFinite(count) && count > MAX_INPUT_COUNT) {
      alert(`Input count is capped at ${MAX_INPUT_COUNT}.`);
    }
    const clamped = clampInputCount(count);
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

          const clampedInputCount = clampInputCount(loadedState.inputCount);
          const normalizedInputs = Array.from(
            { length: clampedInputCount },
            (_, i) => loadedState.inputs[i] ?? 0
          );

          setRootBlock(loadedState.rootBlock ? deserializeBlock(loadedState.rootBlock) : null);
          setInputs(normalizedInputs);
          setInputCount(clampedInputCount);

          const nextCustomBlocks = Object.entries(loadedState.customBlocks ?? {});
          const limitedCustomBlocks = nextCustomBlocks.slice(0, MAX_CUSTOM_BLOCKS);

          Object.keys(customBlocks).forEach((key) => {
            delete customBlocks[key];
          });

          for (const [name, customBlock] of limitedCustomBlocks) {
            customBlocks[customBlock.name ?? name] = customBlock;
          }
          setCustomBlockCount(Object.keys(customBlocks).length);

          if (loadedState.inputCount !== clampedInputCount) {
            alert(`Loaded file used ${loadedState.inputCount} inputs. The editor cap is ${MAX_INPUT_COUNT}, so it was reduced.`);
          }

          if (nextCustomBlocks.length > MAX_CUSTOM_BLOCKS) {
            alert(`Loaded file had ${nextCustomBlocks.length} custom blocks. Only the first ${MAX_CUSTOM_BLOCKS} were loaded.`);
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
    traceRef.current = null;
    cursorRef.current = 0;
    finalResultRef.current = null;
    playbackDepthsRef.current.clear();
    prFrameListRef.current = {};
    prCursorRef.current = {};
    setBlockExecutionStates({});
    setPRTraceFrames({});
    setCurrentResult(null);
    setHighlightedBlockId(null);
    setIsEvaluating(false);
    setPaused(false);
  };

  const advancePRPanel = (blockId: string) => {
    if (!prTraceMode[blockId] || !prFrameListRef.current[blockId]) return;
    const cursor = prCursorRef.current[blockId] ?? 0;
    const frames = prFrameListRef.current[blockId];
    if (cursor < frames.length) {
      setPRTraceFrames(prev => ({ ...prev, [blockId]: frames[cursor] }));
      prCursorRef.current[blockId] = cursor + 1;
    }
  };

  const advance = async (mode: PlaybackMode) => {
    const trace = traceRef.current;
    if (!trace) return;

    const speedMap: Record<number, number> = { 0: 500, 1: 100, 2: 0 };
    const delay = speedMap[evaluationSpeed];
    const depths = playbackDepthsRef.current;

    while (cursorRef.current < trace.length) {
      if (isHaltedRef.current) break;

      const event = trace[cursorRef.current];
      cursorRef.current++;

      if (event.type === TraceEventType.Enter) {
        setHighlightedBlockId(event.blockId);
        setBlockExecutionStates(prev => ({
          ...prev,
          [event.blockId]: { inputs: event.inputs, output: undefined }
        }));

        const d = depths.get(event.blockId) || 0;
        depths.set(event.blockId, d + 1);

        // Advance PR trace panel if this block is in trace mode
        advancePRPanel(event.blockId);

        let shouldPause = false;
        if (mode === PlaybackMode.Trace) shouldPause = true;
        if (mode === PlaybackMode.Run && breakpointsRef.current.has(event.blockId) && d === 0) {
          shouldPause = true;
        }

        if (shouldPause) {
          setPaused(true);
          return;
        }

      } else if (event.type === TraceEventType.Exit) {
        setHighlightedBlockId(event.blockId);
        setCurrentResult(event.output);
        setBlockExecutionStates(prev => ({
          ...prev,
          [event.blockId]: { inputs: event.inputs, output: event.output }
        }));

        const d = depths.get(event.blockId) || 0;
        depths.set(event.blockId, Math.max(0, d - 1));

        // Advance PR trace panel if this block is in trace mode
        advancePRPanel(event.blockId);

        let shouldPause = false;
        if (mode === PlaybackMode.Trace) shouldPause = true;
        if (mode === PlaybackMode.Step) shouldPause = true;

        if (shouldPause) {
          setPaused(true);
          return;
        }

        if (delay > 0) {
          await sleep(delay);
          if (trace !== traceRef.current) return; // stale trace after halt+restart
        }

      } else if (event.type === TraceEventType.ClearSubtree) {
        setBlockExecutionStates(prev => {
          const next = { ...prev };
          for (const id of event.blockIds) {
            delete next[id];
          }
          return next;
        });
        for (const id of event.blockIds) {
          depths.delete(id);
        }
      }
    }

    // Playback complete
    if (!isHaltedRef.current && finalResultRef.current !== null) {
      setCurrentResult(finalResultRef.current);
    }
    setHighlightedBlockId(null);
    setIsEvaluating(false);
    setPaused(false);
  };

  const startOrResume = async (mode: PlaybackMode) => {
    setEditMode(false);

    if (isEvaluating && paused) {
      setPaused(false);
      await advance(mode);
      return;
    }

    if (isEvaluating) return;

    if (!rootBlock) {
      alert("No root block to evaluate.");
      return;
    }

    setIsEvaluating(true);
    isHaltedRef.current = false;
    setCurrentResult(null);
    setBlockExecutionStates({});
    playbackDepthsRef.current.clear();

    try {
      const { result, events } = await generateTrace(rootBlock, inputs);
      traceRef.current = events;
      cursorRef.current = 0;
      finalResultRef.current = result;

      // Build PR trace frames for all PR blocks in trace mode
      const prBlockIds = Object.keys(prTraceMode).filter(id => prTraceMode[id]);
      prFrameListRef.current = {};
      prCursorRef.current = {};
      for (const id of prBlockIds) {
        prFrameListRef.current[id] = buildPRFrames(events, id);
        prCursorRef.current[id] = 0;
      }
      setPRTraceFrames({});

      await advance(mode);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Error: ${error.message}`);
      }
      setHighlightedBlockId(null);
      setIsEvaluating(false);
      setPaused(false);
    }
  };

  const handleRun = () => startOrResume(PlaybackMode.Run);
  const handleForceRun = () => startOrResume(PlaybackMode.ForceRun);
  const handleStep = () => startOrResume(PlaybackMode.Step);
  const handleTrace = () => startOrResume(PlaybackMode.Trace);

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
        isEvaluating={isEvaluating}
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
            }}
            highlightedBlockId={highlightedBlockId}
            selectedBlockId={selectedBlockId}
            onSelectBlock={(id) => setSelectedBlockId(id)}
            isRunning={isEvaluating}
          />
        </div>
      </div>

      <hr className="my-6" />
    </>
  );
}
