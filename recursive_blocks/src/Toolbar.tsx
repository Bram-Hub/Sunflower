import React, { useState } from "react";
import './Toolbar.css';

interface ToolbarProps {
  onSave: () => void;
  onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
  loadInputRef: React.RefObject<HTMLInputElement | null>;
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

// JSX element to represent the toolbar, with functions to save, load, and evaluate.
export function Toolbar({ 
  onSave, 
  onLoad,
  loadInputRef, 
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
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMenu = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const closeMenus = () => {
    setOpenMenu(null);
  };

  return (
    <div className="toolbar-container" onClick={closeMenus}>
      <input
        ref={loadInputRef}

        id="load-input"
        type="file"
        accept=".bramflower,application/octet-stream"
        onChange={(e) => { onLoad(e); closeMenus(); }}
        className="hidden"
      />

      <img src="src/assets/logo.svg" alt="Sunflower" className="logo"/>
      
      {/* File Menu */}
      <div className="menu-wrapper">
        <button 
          className="menu-button"
          onClick={(e) => { e.stopPropagation(); toggleMenu('file'); }}
        >
          File ▼
        </button>
        {openMenu === 'file' && (
          <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { onSave(); closeMenus(); }} className="menu-item">
              Save
            </button>
            <label htmlFor="load-input" className="menu-item menu-item-label">
              Load
            </label>
          </div>
        )}
      </div>

      {/* Program Settings Menu */}
      <div className="menu-wrapper">
        <button 
          className="menu-button"
          onClick={(e) => { e.stopPropagation(); toggleMenu('settings'); }}
        >
          Program Settings ▼
        </button>
        {openMenu === 'settings' && (
          <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
            <div className="menu-item">
              <label>Number of Inputs:</label>
              <input
                type="number"
                min="0"
                max="20"
                step="1"
                value={inputCount.toString()}
                onChange={
                  (e) => onInputCountChange(parseInt(e.target.value))
                }
                className="menu-input"
              />
            </div>

            <div className="menu-divider"></div>

            <div className="menu-item">
              <label>Inputs:</label>
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
                      className="menu-input"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="menu-divider"></div>

            <div className="menu-item">
              <label>Run Speed:</label>
              <input
                type="range"
                min="0"
                max="2"
                step="1"
                value={evaluationSpeed}
                onChange={(e) => onEvaluationSpeedChange(parseInt(e.target.value))}
                className="menu-slider"
              />
              <span className="slider-value">{speedToText(evaluationSpeed)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Program Operations Menu */}
      <div className="menu-wrapper">
        <button 
          className="menu-button"
          onClick={(e) => { e.stopPropagation(); toggleMenu('operations'); }}
        >
          Program Operations ▼
        </button>
        {openMenu === 'operations' && (
          <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { onRun(); closeMenus(); }} className="menu-item evaluate-button-menu">
              Run
            </button>
            <button onClick={() => { onHalt(); closeMenus(); }} className="menu-item halt-button-menu">
              Halt
            </button>
            <button onClick={() => { onStep(); closeMenus(); }} className="menu-item step-button-menu">
              Step
            </button>
          </div>
        )}
      </div>
      
      {/* Result Display */}
      <div className="toolbar-group">
        <div className="result">
          <p>Result: {currentResult}</p>
        </div>
      </div>
    </div>
  );
}