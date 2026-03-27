import { PRTraceFrame } from "./Trace";
import './Block.css';

interface Props {
  frame?: PRTraceFrame | null;
}

export function PRTracePanel({ frame }: Props) {
  const fmtVals = (v: number[] | null | undefined) => {
    if (!v || v.length === 0) return '\u2014';
    return v.join(', ');
  };

  const fmtResult = (v: number | null | undefined) => {
    return v !== null && v !== undefined ? String(v) : '\u2014';
  };

  return (
    <div className="pr-trace-panel">
      <div className="pr-trace-row">
        <div className="pr-trace-cell">
          <span className="pr-trace-label">x,y'</span>
          <span className="pr-trace-value">{fmtVals(frame?.xy_prime)}</span>
        </div>
        <div className="pr-trace-cell">
          <span className="pr-trace-label">h(x,y')</span>
          <span className="pr-trace-value">{fmtResult(frame?.hxy_prime)}</span>
        </div>
      </div>
      <div className="pr-trace-row">
        <div className="pr-trace-cell">
          <span className="pr-trace-label">x,y</span>
          <span className="pr-trace-value">{fmtVals(frame?.xy)}</span>
        </div>
        <div className="pr-trace-cell">
          <span className="pr-trace-label">h(x,y)</span>
          <span className="pr-trace-value">{fmtResult(frame?.hxy)}</span>
        </div>
      </div>
    </div>
  );
}
