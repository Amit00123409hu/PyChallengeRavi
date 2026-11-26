import { Code2, Terminal, Play } from 'lucide-react';
import { AppMode, CodeLine, ExecutionStep } from '../types/visualizer';

interface CodeAndConsolePanelProps {
  mode: AppMode;
  codeLines: CodeLine[];
  currentStep: ExecutionStep | null;
  consoleLines: string[];
}

function highlightPythonLine(line: string) {
  if (!line.trim()) {
    return <span>&nbsp;</span>;
  }

  const tokenRegex =
    /(\bdef\b|\breturn\b|\bfor\b|\bin\b|\bprint\b|\brange\b|\bsquare\b|\bdouble\b|\bis_even\b|\bTrue\b|\bFalse\b|\d+|==|%|\*|=|:|\(|\)|\[|\]|,)/g;
  const parts = line.split(tokenRegex);

  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;
        if (part === 'def' || part === 'return' || part === 'for' || part === 'in') {
          return (
            <span key={idx} className="text-sky-300 font-semibold">
              {part}
            </span>
          );
        }
        if (part === 'print' || part === 'range') {
          return (
            <span key={idx} className="text-amber-300">
              {part}
            </span>
          );
        }
        if (part === 'square' || part === 'double' || part === 'is_even') {
          return (
            <span key={idx} className="text-emerald-300 font-medium">
              {part}
            </span>
          );
        }
        if (part === 'True' || part === 'False' || /^\d+$/.test(part)) {
          return (
            <span key={idx} className="text-rose-300">
              {part}
            </span>
          );
        }
        if (part === '==' || part === '%' || part === '*' || part === '=') {
          return (
            <span key={idx} className="text-slate-300">
              {part}
            </span>
          );
        }
        return (
          <span key={idx} className="text-slate-100">
            {part}
          </span>
        );
      })}
    </>
  );
}

export function CodeAndConsolePanel({
  mode,
  codeLines,
  currentStep,
  consoleLines,
}: CodeAndConsolePanelProps) {
  const activeLine = currentStep && currentStep.phase !== 'done' ? currentStep.activeLine : null;
  const callerLine = currentStep && currentStep.phase !== 'done' ? currentStep.callerLine : null;
  const isDone = currentStep?.phase === 'done';

  const fileName =
    mode === 'function'
      ? 'function_loop.py'
      : mode === 'nested'
        ? 'nested_loops.py'
        : 'robot_loop.py';

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Python Code Panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 text-slate-100 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Code2 className="w-4 h-4 text-sky-400" aria-hidden="true" />
            <span>Python Code</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">{fileName}</span>
        </div>

        {/* Code lines */}
        <div className="py-3 px-2 font-mono text-sm leading-7 overflow-x-auto">
          {codeLines.map((line) => {
            const isActive = activeLine === line.lineNumber;
            const isCaller = !isActive && callerLine === line.lineNumber;

            let rowStyle = 'bg-transparent';
            if (isActive) {
              if (line.role === 'def') {
                rowStyle = 'bg-sky-500/20 ring-1 ring-inset ring-sky-400/50';
              } else if (line.role === 'return' || line.role === 'for-inner') {
                rowStyle = 'bg-amber-500/20 ring-1 ring-inset ring-amber-400/50';
              } else if (line.role === 'print') {
                rowStyle = 'bg-emerald-500/20 ring-1 ring-inset ring-emerald-400/50';
              } else {
                rowStyle = 'bg-sky-500/15 ring-1 ring-inset ring-sky-400/40';
              }
            } else if (isCaller) {
              rowStyle = 'bg-slate-800/70';
            }

            return (
              <div
                key={line.lineNumber}
                className={`flex items-center px-2.5 rounded-md transition-colors duration-150 ${rowStyle}`}
              >
                <span className="w-5 shrink-0 flex items-center justify-center">
                  {isActive ? (
                    <Play
                      className={`w-3 h-3 fill-current ${
                        line.role === 'return' || line.role === 'for-inner'
                          ? 'text-amber-400'
                          : line.role === 'print'
                            ? 'text-emerald-400'
                            : 'text-sky-400'
                      }`}
                      aria-hidden="true"
                    />
                  ) : null}
                </span>
                <span className="w-6 shrink-0 text-right pr-3 text-xs text-slate-500 select-none tabular-nums">
                  {line.lineNumber}
                </span>
                <pre className="whitespace-pre text-[13px] sm:text-sm">
                  {highlightPythonLine(line.code)}
                </pre>
              </div>
            );
          })}
        </div>

        {/* Live Variables Strip */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-400">Variables</span>
          <div className="flex flex-wrap items-center gap-4 font-mono text-xs tabular-nums">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">i =</span>
              <span className="text-sky-300 font-semibold">
                {currentStep ? currentStep.variables.i : '—'}
              </span>
            </div>
            {mode === 'nested' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">j =</span>
                <span className="text-amber-300 font-semibold">
                  {currentStep?.variables.j ?? '—'}
                </span>
              </div>
            )}
            {mode === 'function' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">n =</span>
                  <span className="text-amber-300 font-semibold">
                    {currentStep?.variables.n ?? '—'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">result =</span>
                  <span className="text-emerald-300 font-semibold">
                    {currentStep?.variables.result ?? '—'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Step Explanation Bar */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 min-h-[56px] flex items-center">
        {currentStep ? (
          <span>{currentStep.explanation}</span>
        ) : (
          <span className="text-slate-500">
            Click <strong className="font-semibold text-slate-800">Next</strong> to step through one instruction at a time, or <strong className="font-semibold text-slate-800">Play</strong> to animate automatically.
          </span>
        )}
      </div>

      {/* Output Console */}
      <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 overflow-hidden flex flex-col min-h-[190px]">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-slate-800 bg-slate-900/70">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span>Output Console</span>
          </div>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {consoleLines.length} {consoleLines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>

        <div className="p-4 font-mono text-sm flex-1 overflow-y-auto space-y-1.5 tabular-nums">
          <div className="text-xs text-slate-500 mb-2">
            &gt;&gt;&gt; python3 {fileName}
          </div>
          {consoleLines.length === 0 ? (
            <div className="text-xs text-slate-500 italic">
              Waiting for print() output...
            </div>
          ) : (
            consoleLines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 select-none w-4 text-right">
                  {idx + 1}
                </span>
                <span
                  className={
                    line === 'False'
                      ? 'text-rose-400 font-medium'
                      : 'text-emerald-400 font-medium'
                  }
                >
                  {line}
                </span>
              </div>
            ))
          )}
          {isDone && (
            <div className="pt-2 mt-2 border-t border-slate-800/80 text-xs text-slate-400">
              Process finished with {consoleLines.length} printed{' '}
              {consoleLines.length === 1 ? 'result' : 'results'}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
