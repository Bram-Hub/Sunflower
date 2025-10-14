import React, { createContext, useContext, useState } from "react";
import { BlockData } from "./BlockUtil";
import { DEFAULT_INPUT_COUNT } from "./BlockEditor";

const BlockEditorContext = createContext<{
  rootBlock: BlockData | null;
  customBlockCount: number;
  inputCount: number;
  setInputCount: React.Dispatch<React.SetStateAction<number>>;
  setRootBlock: React.Dispatch<React.SetStateAction<BlockData | null>>;
  setCustomBlockCount: React.Dispatch<React.SetStateAction<number>>;
} | null>(null);

export function BlockEditorProvider({ children }: { children: React.ReactNode }) {
  const [rootBlock, setRootBlock] = useState<BlockData | null>(null);
  const [inputCount, setInputCount] = useState<number>(DEFAULT_INPUT_COUNT);
  const [customBlockCount, setCustomBlockCount] = useState<number>(0);
  return (
    <BlockEditorContext.Provider value={{ rootBlock, setRootBlock, inputCount, setInputCount, customBlockCount, setCustomBlockCount }}>
      {children}
    </BlockEditorContext.Provider>
  );
}

export function useBlockEditor() {
  const ctx = useContext(BlockEditorContext);
  if (!ctx) throw new Error("useBlockEditor must be used inside BlockEditorProvider");
  return ctx;
}