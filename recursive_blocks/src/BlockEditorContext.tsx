import React, { createContext, useContext, useState } from "react";
import { BlockData } from "./BlockUtil";
import { DEFAULT_INPUT_COUNT } from "./BlockEditor";
import { PRTraceFrame } from "./Trace";

/*
Defines a React Context, which makes the variables inside accessable by any React element within the context.
*/

export type ExecutionState = { inputs?: number[]; output?: number };

const BlockEditorContext = createContext<{
  rootBlock: BlockData | null;
  customBlockCount: number;
  inputCount: number;
  blockExecutionStates: Record<string, ExecutionState>;
  setInputCount: React.Dispatch<React.SetStateAction<number>>;
  setRootBlock: React.Dispatch<React.SetStateAction<BlockData | null>>;
  setCustomBlockCount: React.Dispatch<React.SetStateAction<number>>;
  setBlockExecutionStates: React.Dispatch<React.SetStateAction<Record<string, ExecutionState>>>;
  editMode: boolean;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  prTraceMode: Record<string, boolean>;
  setPRTraceMode: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  prTraceFrames: Record<string, PRTraceFrame | null>;
  setPRTraceFrames: React.Dispatch<React.SetStateAction<Record<string, PRTraceFrame | null>>>;
} | null>(null);

export function BlockEditorProvider({ children }: { children: React.ReactNode }) {
  const [rootBlock, setRootBlock] = useState<BlockData | null>(null);
  const [inputCount, setInputCount] = useState<number>(DEFAULT_INPUT_COUNT);
  const [customBlockCount, setCustomBlockCount] = useState<number>(0);
  const [blockExecutionStates, setBlockExecutionStates] = useState<Record<string, ExecutionState>>({});
  const [editMode, setEditMode] = useState<boolean>(false);
  const [prTraceMode, setPRTraceMode] = useState<Record<string, boolean>>({});
  const [prTraceFrames, setPRTraceFrames] = useState<Record<string, PRTraceFrame | null>>({});

  return (
    <BlockEditorContext.Provider value={{
      rootBlock, setRootBlock,
      inputCount, setInputCount,
      customBlockCount, setCustomBlockCount,
      blockExecutionStates, setBlockExecutionStates,
      editMode, setEditMode,
      prTraceMode, setPRTraceMode,
      prTraceFrames, setPRTraceFrames,
    }}>
      {children}
    </BlockEditorContext.Provider>
  );
}

export function useBlockEditor() {
  const ctx = useContext(BlockEditorContext);
  if (!ctx) throw new Error("useBlockEditor must be used inside BlockEditorProvider");
  return ctx;
}