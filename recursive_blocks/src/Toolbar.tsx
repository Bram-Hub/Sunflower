import React from "react";
import './Block.css';

interface ToolbarProps {
  onSave: () => void;
  onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRun: () => void;
}

export function Toolbar({ onSave, onLoad, onRun }: ToolbarProps) {
  return (
    <div className="toolbar-container">
      <img src="src/assets/logo.svg" alt="Sunflower" className="logo"/>
      <div className="toolbar-buttons">
        <button onClick={onSave} className="toolbar-button">
          Save (.bramflower)
        </button>
        <label htmlFor="load-input" className="toolbar-button load-button">
          Load (.bramflower)
        </label>
        <input
          id="load-input"
          type="file"
          accept=".bramflower,application/octet-stream"
          onChange={onLoad}
          className="hidden"
        />
        <button onClick={onRun} className="toolbar-button evaluate-button">
          Run
        </button>
      </div>
    </div>
  );
}