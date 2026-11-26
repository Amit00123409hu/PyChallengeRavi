import { Check, Cog, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExecutionStep, FunctionSpec, ResultPair } from '../types/visualizer';

interface FunctionMachineStageProps {
  values: number[];
  pythonExpr: string;
  fnSpec: FunctionSpec;
  currentStep: ExecutionStep | null;
  allResults: ResultPair[];
}

export function FunctionMachineStage({
  values,
  pythonExpr,
  fnSpec,
  currentStep,
  allResults,
}: FunctionMachineStageProps) {
  const iterIndex = currentStep ? currentStep.iterIndex : -1;
  const machinePhase = currentStep ? currentStep.machinePhase : 'idle';
  const phase = currentStep ? currentStep.phase : 'idle';
  const currentInput = currentStep ? currentStep.currentInput : null;
  const currentOutput = currentStep ? currentStep.currentOutput : null;
  const outputsCount = currentStep ? currentStep.outputsCount : 0;
  const completedPairs = allResults.slice(0, outputsCount);

  const isEntering = machinePhase === 'entering';
  const isGlowing = machinePhase === 'glowing';
  const isExiting = machinePhase === 'exiting';
  const isDone = phase === 'done';

  const formattedOutput =
    currentOutput !== null ? fnSpec.formatOutput(currentOutput) : '';
  const isBoolFalse = currentOutput === false;

  const machineStatusText = isEntering
    ? `Intake · n = ${currentInput}`
    : isGlowing
      ? `Evaluating · ${fnSpec.explainEval(currentInput ?? 0, currentOutput ?? 0)}`
      : isExiting
        ? `Output · ${formattedOutput}`
        : isDone
          ? 'All items processed'
          : 'Waiting for input';

  return (
    <div className="flex flex-col justify-between gap-5 h-full">
      {/* Top Queue Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Function Machine
          </h2>
          <p className="text-sm text-slate-600">
            Passing each value from{' '}
            <code className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
              {pythonExpr}
            </code>{' '}
            into{' '}
            <code className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
              {fnSpec.name}(n)
            </code>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
          <span>{values.length} inputs</span>
          <span aria-hidden="true">·</span>
          <span>
            {isDone
              ? 'Complete'
              : iterIndex >= 0
                ? `Item ${iterIndex + 1} of ${values.length}`
                : 'Ready to run'}
          </span>
        </div>
      </div>

      {/* Loop Input Queue Bar */}
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/70">
        <span className="text-xs font-medium text-slate-500 mr-1">
          Loop queue:
        </span>
        {values.length === 0 ? (
          <span className="text-xs text-slate-400">Empty sequence</span>
        ) : (
          values.map((val, idx) => {
            const isActive = !isDone && iterIndex === idx && currentStep !== null;
            const isCompleted = isDone || idx < outputsCount;

            return (
              <div
                key={`q-${idx}-${val}`}
                className={`relative w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm font-semibold tabular-nums transition-all duration-200 ${
                  isActive
                    ? 'bg-sky-600 text-white ring-4 ring-sky-100 scale-105'
                    : isCompleted
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-400'
                      : 'bg-white text-slate-600 border border-slate-300'
                }`}
              >
                {val}
                {isCompleted && !isActive && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" aria-hidden="true" />
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Center Function Machine Stage */}
      <div className="relative rounded-xl border border-slate-200 bg-slate-50/80 px-4 sm:px-6 py-8 flex flex-col items-center justify-center min-h-[250px] overflow-hidden">
        {/* Subtle blueprint grid lines */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Machine Pipeline Row */}
        <div className="relative z-10 w-full max-w-[640px] grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          {/* LEFT: Intake Track & Input Sphere */}
          <div className="relative flex flex-col items-center justify-center h-28">
            {/* Conveyor rail */}
            <div className="w-full h-2 rounded-full bg-slate-200 relative overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isEntering ? 'w-full bg-sky-500' : 'w-0 bg-sky-500'
                }`}
              />
            </div>

            <span className="mt-3 text-[11px] font-medium text-slate-500 whitespace-nowrap">
              {currentInput !== null && !isExiting ? `Input: n = ${currentInput}` : 'Input'}
            </span>

            {/* Animated Input Sphere */}
            <AnimatePresence mode="wait">
              {currentInput !== null && (phase === 'fn-for' || phase === 'fn-def') && (
                <motion.div
                  key={`in-sphere-${iterIndex}-${currentInput}`}
                  initial={{ x: -36, opacity: 0, scale: 0.75 }}
                  animate={
                    isEntering
                      ? { x: 105, opacity: 0.15, scale: 0.7 }
                      : { x: 0, opacity: 1, scale: 1 }
                  }
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-2 flex items-center justify-center w-14 h-14 rounded-full bg-sky-600 text-white font-mono text-lg font-bold tabular-nums shadow-lg shadow-sky-600/30 ring-4 ring-sky-100"
                >
                  {currentInput}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CENTER: The Function Machine Housing */}
          <div className="relative flex flex-col items-center">
            {/* Ambient Glow Halo when machine is glowing */}
            <motion.div
              aria-hidden="true"
              animate={{
                opacity: isGlowing ? 1 : 0,
                scale: isGlowing ? 1.06 : 0.94,
              }}
              transition={{ duration: 0.25 }}
              className="pointer-events-none absolute -inset-4 rounded-3xl bg-amber-400/35 blur-xl"
            />

            {/* Intake Funnel (Left Port) */}
            <div
              className={`absolute -left-3 top-1/2 -translate-y-1/2 w-3.5 h-12 rounded-l-md border-y border-l transition-colors duration-200 ${
                isEntering
                  ? 'bg-sky-500 border-sky-400'
                  : 'bg-slate-700 border-slate-600'
              }`}
              aria-hidden="true"
            />

            {/* Exhaust Nozzle (Right Port) */}
            <div
              className={`absolute -right-3 top-1/2 -translate-y-1/2 w-3.5 h-12 rounded-r-md border-y border-r transition-colors duration-200 ${
                isExiting
                  ? isBoolFalse
                    ? 'bg-rose-500 border-rose-400'
                    : 'bg-emerald-500 border-emerald-400'
                  : 'bg-slate-700 border-slate-600'
              }`}
              aria-hidden="true"
            />

            {/* Machine Main Body */}
            <motion.div
              animate={{
                scale: isGlowing ? 1.03 : 1,
              }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={`relative w-48 sm:w-56 rounded-2xl border-2 px-4 py-4 transition-all duration-300 ${
                isGlowing
                  ? 'bg-slate-900 border-amber-400 shadow-[0_0_32px_rgba(245,158,11,0.55)]'
                  : isEntering
                    ? 'bg-slate-900 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)]'
                    : isExiting
                      ? 'bg-slate-900 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-900 border-slate-700 shadow-md'
              }`}
            >
              {/* Top Header Plate */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                  {fnSpec.name}(n)
                </span>
                <motion.div
                  animate={{ rotate: isGlowing ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                >
                  <Cog
                    className={`w-4 h-4 ${
                      isGlowing
                        ? 'text-amber-400'
                        : isEntering
                          ? 'text-sky-400'
                          : isExiting
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                    }`}
                    aria-hidden="true"
                  />
                </motion.div>
              </div>

              {/* Central Glass Chamber */}
              <div
                className={`mt-3 rounded-xl px-3 py-3.5 text-center border transition-colors duration-300 ${
                  isGlowing
                    ? 'bg-amber-500/20 border-amber-400/60'
                    : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                <div className="font-mono text-xs text-slate-400 mb-1">
                  return
                </div>
                <div
                  className={`font-mono text-sm sm:text-base font-bold tabular-nums transition-colors ${
                    isGlowing ? 'text-amber-200' : 'text-slate-100'
                  }`}
                >
                  {isGlowing && currentInput !== null
                    ? fnSpec.explainEval(currentInput, currentOutput ?? 0)
                    : fnSpec.returnExpr}
                </div>
              </div>

              {/* Machine Status Readout */}
              <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-medium">
                {isGlowing && (
                  <Sparkles className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />
                )}
                <span
                  className={`truncate ${
                    isGlowing
                      ? 'text-amber-300'
                      : isEntering
                        ? 'text-sky-300'
                        : isExiting
                          ? 'text-emerald-300'
                          : 'text-slate-400'
                  }`}
                >
                  {machineStatusText}
                </span>
              </div>
            </motion.div>
          </div>

          {/* RIGHT: Exhaust Track & Output Sphere */}
          <div className="relative flex flex-col items-center justify-center h-28">
            {/* Conveyor rail */}
            <div className="w-full h-2 rounded-full bg-slate-200 relative overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isExiting
                    ? isBoolFalse
                      ? 'w-full bg-rose-500'
                      : 'w-full bg-emerald-500'
                    : 'w-0 bg-emerald-500'
                }`}
              />
            </div>

            <span className="mt-3 text-[11px] font-medium text-slate-500 whitespace-nowrap">
              {isExiting ? `Output: ${formattedOutput}` : 'Output'}
            </span>

            {/* Animated New Result Sphere */}
            <AnimatePresence mode="wait">
              {isExiting && currentOutput !== null && (
                <motion.div
                  key={`out-sphere-${iterIndex}-${formattedOutput}`}
                  initial={{ x: -105, opacity: 0, scale: 0.65 }}
                  animate={{ x: 0, opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className={`absolute top-2 flex items-center justify-center min-w-[3.5rem] h-14 px-3 rounded-full text-white font-mono font-bold tabular-nums shadow-lg ring-4 ${
                    formattedOutput.length > 3 ? 'text-xs' : 'text-lg'
                  } ${
                    isBoolFalse
                      ? 'bg-rose-600 shadow-rose-600/30 ring-rose-100'
                      : 'bg-emerald-600 shadow-emerald-600/30 ring-emerald-100'
                  }`}
                >
                  {formattedOutput}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom Result Mapping Strip */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <span className="text-xs font-semibold text-slate-700">
            Transformed Results ({fnSpec.name})
          </span>
          <span className="text-xs text-slate-500 tabular-nums">
            {completedPairs.length} / {values.length} returned
          </span>
        </div>

        {completedPairs.length === 0 ? (
          <p className="text-xs text-slate-400 font-mono">
            No outputs returned yet. Click Next or Play to run {fnSpec.name}(n).
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <AnimatePresence initial={false}>
              {completedPairs.map((pair, idx) => {
                const isFalse = pair.output === false;
                return (
                  <motion.div
                    key={`pair-${idx}-${pair.input}`}
                    initial={{ opacity: 0, y: 6, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-mono text-xs tabular-nums"
                  >
                    <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-semibold flex items-center justify-center">
                      {pair.input}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    <span
                      className={`min-w-[1.5rem] h-6 px-2 rounded-full text-white font-semibold flex items-center justify-center ${
                        isFalse ? 'bg-rose-600' : 'bg-emerald-600'
                      }`}
                    >
                      {pair.formattedOutput}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
