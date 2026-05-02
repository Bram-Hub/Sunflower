import React from "react";
import './Toolbar.css';
import { useBlockEditor } from "./BlockEditorContext";
import { MAX_INPUT_COUNT } from "./BlockEditor";

interface ToolbarProps {
  onSave: () => void;
  onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onShowNotation: () => void;
  loadInputRef: React.RefObject<HTMLInputElement | null>;
  onRun: () => void;
  onForceRun: () => void;
  onStep: () => void;
  onTrace: () => void;
  onHalt: () => void;
  inputCount: number;
  onInputCountChange: (count: number) => void;
  inputs: number[];
  onInputChange: (index: number, value: number) => void;
  evaluationSpeed: number;
  onEvaluationSpeedChange: (speed: number) => void;
  speedToText: (speed: number) => string;
  currentResult: number | null;
  isEvaluating: boolean;
}

export function Toolbar({ 
  onSave, 
  onLoad,
  onShowNotation,
  loadInputRef, 
  onRun, 
  onForceRun,
  onStep,
  onTrace,
  onHalt, 
  inputCount,
  onInputCountChange,
  inputs,
  onInputChange,
  evaluationSpeed,
  onEvaluationSpeedChange,
  speedToText,
  currentResult,
  isEvaluating
}: ToolbarProps) {
  const { editMode, setEditMode } = useBlockEditor();
  
  return (
    <>
      <div className="toolbar-container">
        <input
          ref={loadInputRef}
          id="load-input"
          type="file"
          accept=".bramflower,application/octet-stream"
          onChange={onLoad}
          className="hidden"
        />

        {/* File operations and testing */}
        <div className="toolbar-left">
          <img src="src/assets/logo.svg" alt="Sunflower" className="logo"/>
          
          <div className="toolbar-section">
            <button onClick={onSave} className="toolbar-button" title="Save (Ctrl+Shift+S)">
              Save
            </button>
            <button
              className="toolbar-button"
              onClick={() => loadInputRef.current?.click()}
              title="Load (Ctrl+O)" 
            >
              Load
            </button>
          </div>

          {/* Edit mode toggle button */}
          <div className="toolbar-divider"></div>

          <div className="toolbar-section">
            <button
              onClick={() => !isEvaluating && setEditMode(prev => !prev)}
              className={`toolbar-button${editMode && !isEvaluating ? " toolbar-button-active" : ""}${isEvaluating ? " toolbar-button-disabled" : ""}`}
              title={isEvaluating ? "Cannot edit while executing" : "Toggle edit mode to change block values"}
              disabled={isEvaluating}
            >
              {editMode && !isEvaluating ? "Editing" : "Edit"}
            </button>
            <button onClick={onShowNotation} className="toolbar-button" title="Show root formal notation">
              Notation
            </button>
          </div>
        </div>

        {/* Program execution controls */}
        <div className="toolbar-center">   
          {/* run buttons lock edit; halt unlocks it - no async race condition */}
          <button onClick={onRun} className="icon-button run-button" title="Run program">
            <svg viewBox="0 0 24 24" className="icon">
              <path d="M8 5v14l11-7z" fill="currentColor"/>
            </svg>
          </button>
          <button onClick={onForceRun} className="icon-button step-button" title="Run without breakpoints">
            <svg viewBox="0 0 24 24" className="icon">
              <path d="M4 5v14l8-7z M13 5v14l8-7z" fill="currentColor"/>
            </svg>
          </button>
          <button onClick={onStep} className="icon-button step-button" title="Step through program">
            <svg viewBox="0 0 24 24" className="icon">
              <path d="M5 8h14l-7 11z" fill="currentColor"/>
            </svg>
          </button>
          <button onClick={onTrace} className="icon-button step-button" title="Trace through program">
            <svg viewBox="0 0 24 24" className="icon">
              <path d="M4 5h7a7 7 0 0 1 7 7v3h4l-6 7-6-7h4v-3a3 3 0 0 0-3-3H4z" fill="currentColor"/>
            </svg>
          </button>
          <button onClick={onHalt} className="icon-button halt-button" title="Halt execution">
            <svg viewBox="0 0 24 24" className="icon">
              <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
            </svg>
          </button>
        </div>

        {/* Program settings and result */}
        <div className="toolbar-right">
          <div className="toolbar-section">
            <label className="toolbar-label">Inputs:</label>
            <input
              type="number"
              min="0"
              max={MAX_INPUT_COUNT}
              step="1"
              value={inputCount.toString()}
              onChange={(e) => onInputCountChange(parseInt(e.target.value))}
              className="toolbar-input"
            />
          </div>

          <div className="toolbar-section">
            <label className="toolbar-label">Speed:</label>
            <input
              type="range"
              min="0"
              max="2"
              step="1"
              value={evaluationSpeed}
              onChange={(e) => onEvaluationSpeedChange(parseInt(e.target.value))}
              className="toolbar-slider"
            />
            <span className="toolbar-value">{speedToText(evaluationSpeed)}</span>
          </div>

          <div className="toolbar-divider"></div>

          <div className="toolbar-section">
            <label className="toolbar-label">Result:</label>
            <span className="result-value">{currentResult ?? '—'}</span>
          </div>

          <div className="toolbar-divider"></div>

          <a href="#docs" className="toolbar-button docs-button">
            Documentation
          </a>
        </div>
      </div>

      {/* Settings panel */}
      <div className="settings-panel">
          <div className="settings-content">
            
            {/* Input values grid */}
            <div className="settings-group">
              <label className="settings-label">Input Values:</label>
              <div className="inputs-grid">
                {inputs.map((val, i) => (
                  <div key={i} className="input-item">
                    <label>x{i + 1}:</label>
                    <input
                      type="number"
                      value={val}
                      min="0"
                      step="1"
                      onChange={(e) => onInputChange(i, parseFloat(e.target.value))}
                      placeholder={`x${i + 1}`}
                      className="settings-input"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
      </div>
    </>
  );
}
