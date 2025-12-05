import React from "react";
import './Toolbar.css';

interface ToolbarProps {
  onSave: () => void;
  onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRun: () => void;
  onHalt: () => void;
  onStep: () => void;
  inputCount: number;
  onInputCountChange: (count: number) => void;
  inputs: number[];
  onInputChange: (index: number, value: number) => void;
  evaluationSpeed: number;
  onEvaluationSpeedChange: (speed: number) => void;
  speedToText: (speed: number) => string;
  currentResult: number | null;
}

export function Toolbar({ 
  onSave, 
  onLoad, 
  onRun, 
  onHalt, 
  onStep,
  inputCount,
  onInputCountChange,
  inputs,
  onInputChange,
  evaluationSpeed,
  onEvaluationSpeedChange,
  speedToText,
  currentResult
}: ToolbarProps) {
  return (
    <div className="toolbar-container">
      <img src="src/assets/logo.svg" alt="Sunflower" className="logo"/>
      
      <div className="toolbar-group">
        <button onClick={onSave} className="toolbar-button">
          Save
        </button>
        <label htmlFor="load-input" className="toolbar-button load-button">
          Load
        </label>
        <input
          id="load-input"
          type="file"
          accept=".bramflower,application/octet-stream"
          onChange={onLoad}
          className="hidden"
        />
      </div>

      <div className="toolbar-group">
        <button onClick={onRun} className="toolbar-button evaluate-button">
          Run
        </button>
        <button onClick={onHalt} className="toolbar-button halt-button">
          Halt
        </button>
        <button onClick={onStep} className="toolbar-button step-button">
          Step
        </button>
      </div>

      <div className="toolbar-group input-section-toolbar">
        <label>Inputs:</label>
        <input
          type="number"
          value={inputCount}
          min={0}
          step={1}
          onChange={(e) => onInputCountChange(parseInt(e.target.value))}
        />
        {inputs.map((val, i) => (
          <input
            key={i}
            type="number"
            value={val}
            min={0}
            step={1}
            onChange={(e) => onInputChange(i, parseFloat(e.target.value))}
            placeholder={`x${i + 1}`}
          />
        ))}
      </div>

      <div className="toolbar-group">
        <div className="speed-control">
          <label htmlFor="speed-slider">Speed: {speedToText(evaluationSpeed)}</label>
          <input
            id="speed-slider"
            type="range"
            min="0"
            max="2"
            step="1"
            value={evaluationSpeed}
            onChange={(e) => onEvaluationSpeedChange(parseInt(e.target.value))}
          />
        </div>
      </div>
      
      <div className="toolbar-group">
        <div className="result">
          <p>Result: {currentResult}</p>
        </div>
      </div>
    </div>
  );
}