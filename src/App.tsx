import { useEffect, useMemo, useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Gauge,
  Bot,
  Grid3x3,
  Cpu,
  HelpCircle,
} from 'lucide-react';
import {
  AppMode,
  FunctionId,
  SequencePresetId,
} from './types/visualizer';
import {
  PYTHON_FUNCTIONS,
  SEQUENCE_PRESETS,
  buildFunctionSteps,
  buildNestedSteps,
  buildRobotSteps,
  computeRangeValues,
  formatRangeExpr,
  getFunctionCodeLines,
  getNestedCodeLines,
  getRobotCodeLines,
} from './data/visualizerPresets';
import { RobotTrackStage } from './components/RobotTrackStage';
import { NestedGridStage } from './components/NestedGridStage';
import { FunctionMachineStage } from './components/FunctionMachineStage';
import { CodeAndConsolePanel } from './components/CodeAndConsolePanel';
import { QuizGameView } from './components/QuizGameView';

type TopView = AppMode | 'quiz';

export default function App() {
  const [activeView, setActiveView] = useState<TopView>('robot');

  // Robot Loop range(start, stop, step) inputs
  const [robotStartText, setRobotStartText] = useState<string>('0');
  const [robotStopText, setRobotStopText] = useState<string>('5');
  const [robotStepText, setRobotStepText] = useState<string>('1');

  const robotStart = useMemo(() => {
    const n = parseInt(robotStartText, 10);
    return Number.isNaN(n) ? 0 : Math.max(-20, Math.min(20, n));
  }, [robotStartText]);

  const robotStop = useMemo(() => {
    const n = parseInt(robotStopText, 10);
    return Number.isNaN(n) ? 0 : Math.max(-20, Math.min(30, n));
  }, [robotStopText]);

  const robotStep = useMemo(() => {
    const n = parseInt(robotStepText, 10);
    if (Number.isNaN(n) || n === 0) return 1;
    return Math.max(-10, Math.min(10, n));
  }, [robotStepText]);

  // Function Mode sequence + function selection
  const [fnPresetId, setFnPresetId] = useState<SequencePresetId>('range_1_6');
  const [fnCustomStart, setFnCustomStart] = useState<number>(1);
  const [fnCustomStop, setFnCustomStop] = useState<number>(6);
  const [fnCustomStep, setFnCustomStep] = useState<number>(1);
  const [selectedFunctionId, setSelectedFunctionId] = useState<FunctionId>('square');

  // Shared step playback state for Robot, Nested Grid, and Function modes
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);

  // Robot Loop sequence
  const robotValues = useMemo(
    () => computeRangeValues(robotStart, robotStop, robotStep),
    [robotStart, robotStop, robotStep]
  );
  const robotExpr = useMemo(
    () => formatRangeExpr(robotStart, robotStop, robotStep),
    [robotStart, robotStop, robotStep]
  );

  // Function Mode sequence
  const { values: fnValues, pythonExpr: fnExpr } = useMemo(() => {
    if (fnPresetId === 'custom') {
      const safeStep = fnCustomStep === 0 ? 1 : fnCustomStep;
      return {
        values: computeRangeValues(fnCustomStart, fnCustomStop, safeStep),
        pythonExpr: formatRangeExpr(fnCustomStart, fnCustomStop, safeStep),
      };
    }
    const preset = SEQUENCE_PRESETS[fnPresetId];
    return { values: preset.values, pythonExpr: preset.pythonExpr };
  }, [fnPresetId, fnCustomStart, fnCustomStop, fnCustomStep]);

  const fnSpec = PYTHON_FUNCTIONS[selectedFunctionId];

  // Deterministic step lists
  const robotSteps = useMemo(
    () => buildRobotSteps(robotValues, robotExpr),
    [robotValues, robotExpr]
  );

  const nestedData = useMemo(() => buildNestedSteps(), []);

  const functionData = useMemo(
    () => buildFunctionSteps(fnValues, fnSpec, fnExpr),
    [fnValues, fnSpec, fnExpr]
  );

  const visualizerMode: AppMode = activeView === 'quiz' ? 'robot' : activeView;

  const steps =
    visualizerMode === 'robot'
      ? robotSteps
      : visualizerMode === 'nested'
        ? nestedData.steps
        : functionData.steps;

  const codeLines = useMemo(() => {
    if (visualizerMode === 'robot') return getRobotCodeLines(robotExpr);
    if (visualizerMode === 'nested') return getNestedCodeLines();
    return getFunctionCodeLines(fnSpec, fnExpr);
  }, [visualizerMode, robotExpr, fnSpec, fnExpr]);

  const currentStep =
    stepIndex >= 0 && stepIndex < steps.length ? steps[stepIndex] : null;
  const isAtEnd = stepIndex >= steps.length - 1;

  // Console output lines up to current step
  const consoleLines = useMemo(() => {
    if (!currentStep) return [];
    const count = currentStep.outputsCount;
    if (visualizerMode === 'robot') {
      return robotValues.slice(0, count).map((v) => String(v));
    }
    if (visualizerMode === 'nested') {
      return nestedData.outputs.slice(0, count);
    }
    return functionData.allResults.slice(0, count).map((r) => r.formattedOutput);
  }, [currentStep, visualizerMode, robotValues, nestedData.outputs, functionData.allResults]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying || activeView === 'quiz') return;

    const intervalMs = Math.round(900 / speed);
    const timer = window.setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        const next = prev + 1;
        if (next >= steps.length - 1) {
          setIsPlaying(false);
        }
        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, speed, steps.length, activeView]);

  const handleViewChange = (nextView: TopView) => {
    setActiveView(nextView);
    setIsPlaying(false);
    setStepIndex(-1);
  };

  const handleNext = () => {
    setIsPlaying(false);
    setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
  };

  const handlePlayPause = () => {
    if (activeView === 'quiz') {
      handleViewChange('robot');
      return;
    }
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (isAtEnd || stepIndex === -1) {
      setStepIndex(0);
    }
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setStepIndex(-1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar: Clean single-row header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <a
            href="#workspace"
            className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            PyFlow
          </a>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handlePlayPause}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              {activeView === 'quiz'
                ? 'Open Visualizer'
                : isPlaying
                  ? 'Pause Run'
                  : 'Run Visualizer'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main
        id="workspace"
        className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6"
      >
        {/* Workspace Toolbar: Mode Tabs + Mode-Specific Inputs */}
        <section
          aria-label="Visualizer configuration"
          className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4"
        >
          {/* Mode Tabs */}
          <div
            role="tablist"
            aria-label="Visualizer modes"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'robot'}
              onClick={() => handleViewChange('robot')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'robot'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="w-4 h-4 text-sky-600" aria-hidden="true" />
              <span>Loop Mode (3D Robot)</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'nested'}
              onClick={() => handleViewChange('nested')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'nested'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid3x3 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>Nested Loops (3D Grid)</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'function'}
              onClick={() => handleViewChange('function')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'function'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cpu className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span>Function Mode</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'quiz'}
              onClick={() => handleViewChange('quiz')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'quiz'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-indigo-600" aria-hidden="true" />
              <span>3D Quiz Game</span>
            </button>
          </div>

          {/* Right Mode-Specific Controls */}
          {activeView === 'robot' && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span>Start</span>
                <input
                  type="number"
                  value={robotStartText}
                  onChange={(e) => {
                    setRobotStartText(e.target.value);
                    handleReset();
                  }}
                  onBlur={() => setRobotStartText(String(robotStart))}
                  className="w-16 h-10 px-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm font-medium text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span>Stop</span>
                <input
                  type="number"
                  value={robotStopText}
                  onChange={(e) => {
                    setRobotStopText(e.target.value);
                    handleReset();
                  }}
                  onBlur={() => setRobotStopText(String(robotStop))}
                  className="w-16 h-10 px-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm font-medium text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span>Step</span>
                <input
                  type="number"
                  value={robotStepText}
                  onChange={(e) => {
                    setRobotStepText(e.target.value);
                    handleReset();
                  }}
                  onBlur={() => setRobotStepText(String(robotStep))}
                  className="w-16 h-10 px-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm font-medium text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </label>
            </div>
          )}

          {activeView === 'nested' && (
            <div className="text-xs font-medium text-slate-600 font-mono">
              3 rows (i: 0..2) × 3 cols (j: 0..2)
            </div>
          )}

          {activeView === 'function' && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2.5">
                <label
                  htmlFor="function-select"
                  className="text-xs font-semibold text-slate-700 whitespace-nowrap"
                >
                  Function
                </label>
                <select
                  id="function-select"
                  value={selectedFunctionId}
                  onChange={(e) => {
                    setSelectedFunctionId(e.target.value as FunctionId);
                    handleReset();
                  }}
                  className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="square">square (n * n)</option>
                  <option value="double">double (n * 2)</option>
                  <option value="is_even">is_even (n % 2 == 0)</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5">
                <label
                  htmlFor="sequence-select"
                  className="text-xs font-semibold text-slate-700 whitespace-nowrap"
                >
                  Sequence
                </label>
                <select
                  id="sequence-select"
                  value={fnPresetId}
                  onChange={(e) => {
                    setFnPresetId(e.target.value as SequencePresetId);
                    handleReset();
                  }}
                  className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="range_1_6">range(1, 6)</option>
                  <option value="range_0_10_2">range(0, 10, 2)</option>
                  <option value="list_values">[2, 3, 5, 7, 11]</option>
                  <option value="custom">Custom range(...)</option>
                </select>
              </div>

              {fnPresetId === 'custom' && (
                <div className="flex flex-wrap items-center gap-2 pl-2 border-l border-slate-200">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span>start</span>
                    <input
                      type="number"
                      value={fnCustomStart}
                      onChange={(e) => {
                        setFnCustomStart(Number(e.target.value) || 0);
                        handleReset();
                      }}
                      className="w-16 h-9 px-2 rounded-md border border-slate-300 font-mono text-sm tabular-nums"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span>stop</span>
                    <input
                      type="number"
                      value={fnCustomStop}
                      onChange={(e) => {
                        setFnCustomStop(Number(e.target.value) || 0);
                        handleReset();
                      }}
                      className="w-16 h-9 px-2 rounded-md border border-slate-300 font-mono text-sm tabular-nums"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span>step</span>
                    <input
                      type="number"
                      value={fnCustomStep}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFnCustomStep(val === 0 || Number.isNaN(val) ? 1 : val);
                        handleReset();
                      }}
                      className="w-16 h-9 px-2 rounded-md border border-slate-300 font-mono text-sm tabular-nums"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {activeView === 'quiz' && (
            <div className="text-xs font-medium text-slate-600">
              Test your <code className="font-mono text-slate-900">range()</code> output prediction skills
            </div>
          )}
        </section>

        {/* Active View Content */}
        {activeView === 'quiz' ? (
          <QuizGameView />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
            {/* Left Zone: Stage + Playback Bar */}
            <section
              aria-label="Visual simulation stage"
              className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-5"
            >
              <div className="flex-1 flex flex-col">
                {activeView === 'robot' && (
                  <RobotTrackStage
                    values={robotValues}
                    pythonExpr={robotExpr}
                    currentStep={currentStep}
                    speed={speed}
                  />
                )}

                {activeView === 'nested' && (
                  <NestedGridStage currentStep={currentStep} />
                )}

                {activeView === 'function' && (
                  <FunctionMachineStage
                    values={fnValues}
                    pythonExpr={fnExpr}
                    fnSpec={fnSpec}
                    currentStep={currentStep}
                    allResults={functionData.allResults}
                  />
                )}
              </div>

              {/* Unified Playback Bar: Next, Play, Reset, Speed Slider */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4" aria-hidden="true" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" aria-hidden="true" />
                        <span>Play</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isAtEnd}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed text-slate-800 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                  >
                    <SkipForward className="w-4 h-4" aria-hidden="true" />
                    <span>Next</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                  >
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Speed Slider + Step Counter */}
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex items-center gap-2.5">
                    <Gauge
                      className="w-4 h-4 text-slate-500 shrink-0"
                      aria-hidden="true"
                    />
                    <label
                      htmlFor="speed-slider"
                      className="text-xs font-medium text-slate-700 whitespace-nowrap tabular-nums"
                    >
                      Speed: {speed.toFixed(2).replace(/\.00$/, '.0')}×
                    </label>
                    <input
                      id="speed-slider"
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.25"
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      className="pyflow-slider w-28 sm:w-32"
                    />
                  </div>

                  <div className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
                    Step {Math.max(0, stepIndex + 1)} / {steps.length}
                  </div>
                </div>
              </div>
            </section>

            {/* Right Zone: Python Code Panel & Output Console */}
            <section
              id="code-console"
              aria-label="Python code and output console"
              className="lg:col-span-5 flex flex-col"
            >
              <CodeAndConsolePanel
                mode={visualizerMode}
                codeLines={codeLines}
                currentStep={currentStep}
                consoleLines={consoleLines}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
