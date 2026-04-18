import React from "react";
import { BlockData } from "./BlockUtil";
import { computeBatch, MAX_BATCH_SIZE } from "./Compute";
import "./BatchComputeModal.css";

interface BatchComputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  rootBlock: BlockData | null;
}

const normalizeRow = (row: string[], inputCount: number) =>
  Array.from({ length: inputCount }, (_, i) => row[i] ?? "0");

const zeroRow = (inputCount: number) =>
  Array.from({ length: inputCount }, () => "0");

const emptyResults = (count: number) => Array.from({ length: count }, () => "");
const emptyErrorFlags = (count: number) => Array.from({ length: count }, () => false);

export function BatchComputeModal({ isOpen, onClose, rootBlock }: BatchComputeModalProps) {
  const [rows, setRows] = React.useState<string[][]>([]);
  const [rowDisplays, setRowDisplays] = React.useState<string[]>([]);
  const [rowIsError, setRowIsError] = React.useState<boolean[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const isRunningRef = React.useRef(false);

  const inputCount = rootBlock?.inputCount ?? 0;

  React.useEffect(() => {
    if (!isOpen) return;
    if (rows.length === 0) return;

    setRows(prevRows => prevRows.map(row => normalizeRow(row, inputCount)));
    setRowDisplays(prevDisplays => emptyResults(prevDisplays.length > 0 ? prevDisplays.length : rows.length));
    setRowIsError(prevFlags => emptyErrorFlags(prevFlags.length > 0 ? prevFlags.length : rows.length));
  }, [isOpen, inputCount]);

  if (!isOpen) return null;

  const updateInput = (rowIndex: number, colIndex: number, value: string) => {
    if (!rootBlock) return;

    // Only allow digits in each input box
    if (!/^\d*$/.test(value)) return;

    setRows(prevRows =>
      prevRows.map((row, i) => {
        if (i !== rowIndex) return row;
        const next = [...row];
        next[colIndex] = value;
        return next;
      })
    );
    setRowDisplays(prev => prev.map((display, i) => (i === rowIndex ? "" : display)));
    setRowIsError(prev => prev.map((isError, i) => (i === rowIndex ? false : isError)));
  };

  const addRow = () => {
    if (!rootBlock) return;
    if (rows.length >= MAX_BATCH_SIZE) return;
    setRows(prevRows => [...prevRows, zeroRow(inputCount)]);
    setRowDisplays(prev => [...prev, ""]);
    setRowIsError(prev => [...prev, false]);
  };

  const removeRow = (rowIndex: number) => {
    if (!rootBlock) return;
    setRows(prevRows => prevRows.filter((_, i) => i !== rowIndex));
    setRowDisplays(prev => prev.filter((_, i) => i !== rowIndex));
    setRowIsError(prev => prev.filter((_, i) => i !== rowIndex));
  };

  const clearAll = () => {
    if (!rootBlock) return;
    setRows([]);
    setRowDisplays([]);
    setRowIsError([]);
  };

  const handleRun = async () => {
    if (!rootBlock || isRunningRef.current) return;
    isRunningRef.current = true;

    try {
      setIsRunning(true);
      // This allows react to paint "Running..." and disabled controls before the run starts
      await new Promise(resolve => setTimeout(resolve, 0));
      const nextDisplays = emptyResults(rows.length);
      const nextErrorFlags = emptyErrorFlags(rows.length);
      const parsedRows: number[][] = [];
      const sourceRowIndexes: number[] = [];

      rows.forEach((row, rowIndex) => {
        for (let i = 0; i < row.length; i++) {
          if (row[i].length === 0) {
            nextDisplays[rowIndex] = `Missing value for x${i + 1}.`;
            nextErrorFlags[rowIndex] = true;
            return;
          }
        }

        parsedRows.push(row.map(value => Number(value)));
        sourceRowIndexes.push(rowIndex);
      });

      if (parsedRows.length === 0) {
        setRowDisplays(nextDisplays);
        setRowIsError(nextErrorFlags);
        return;
      }

      const rowResults = await computeBatch(rootBlock, parsedRows);
      for (const rowResult of rowResults) {
        const sourceIndex = sourceRowIndexes[rowResult.index];
        if (rowResult.error) {
          nextDisplays[sourceIndex] = rowResult.error.message;
          nextErrorFlags[sourceIndex] = true;
        } else if (rowResult.output !== undefined) {
          nextDisplays[sourceIndex] = String(rowResult.output);
        } else {
          nextDisplays[sourceIndex] = "-";
        }
      }

      setRowDisplays(nextDisplays);
      setRowIsError(nextErrorFlags);
    } catch (error) {
      // Top level batch failures are rare so just alert for now
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      isRunningRef.current = false;
      setIsRunning(false);
    }
  };

  return (
    <div className="notation-popup-overlay" onClick={onClose} role="dialog">
      <div className="notation-popup-panel batch-compute-panel" onClick={(event) => event.stopPropagation()}>
        <div className="notation-popup-header">
          <div className="notation-popup-title">Batch Compute</div>
          <button className="toolbar-button notation-popup-close" onClick={onClose}>Close</button>
        </div>

        {!rootBlock && (
          <div className="notation-popup-body">
            No root block to evaluate.
          </div>
        )}

        {rootBlock && (
          <div className="batch-compute-grid-wrap" style={{ "--batch-input-count": String(inputCount) } as React.CSSProperties}>
            <div className="batch-compute-grid batch-compute-grid-header">
              {Array.from({ length: inputCount }, (_, i) => (
                <div key={`h-x-${i}`}>x{i + 1}</div>
              ))}
              <div>Output / Error</div>
              <div></div>
            </div>

            {rows.map((row, rowIndex) => {
              const rowDisplay = rowDisplays[rowIndex] || "-";
              const hasError = rowIsError[rowIndex] ?? false;

              return (
                <div className="batch-compute-grid batch-compute-grid-row" key={`row-${rowIndex}`}>
                  {row.map((value, colIndex) => (
                    <input
                      key={`input-${rowIndex}-${colIndex}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={value}
                      onChange={event => updateInput(rowIndex, colIndex, event.target.value)}
                      className="batch-compute-input"
                    />
                  ))}
                  <div className={`batch-compute-result ${hasError ? "batch-compute-result-error" : ""}`}>
                    {rowDisplay}
                  </div>
                  <button
                    className="batch-compute-remove"
                    onClick={() => removeRow(rowIndex)}
                    disabled={!rootBlock || isRunning}
                    title="Remove row"
                  >
                    x
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="batch-compute-toolbar">
          <button className="toolbar-button" onClick={clearAll} disabled={!rootBlock || isRunning}>
            Clear All
          </button>
          <button className="toolbar-button" onClick={addRow} disabled={!rootBlock || rows.length >= MAX_BATCH_SIZE || isRunning}>
            Add Row
          </button>
          <button className="toolbar-button" onClick={handleRun} disabled={!rootBlock || isRunning || rows.length === 0}>
            {isRunning ? "Running..." : "Run Batch"}
          </button>
        </div>
      </div>
    </div>
  );
}
