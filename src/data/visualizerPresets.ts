import {
  CodeLine,
  ExecutionStep,
  FunctionId,
  FunctionSpec,
  ResultPair,
  SequencePreset,
  SequencePresetId,
} from '../types/visualizer';

export const SEQUENCE_PRESETS: Record<Exclude<SequencePresetId, 'custom'>, SequencePreset> = {
  range_1_6: {
    id: 'range_1_6',
    label: 'range(1, 6)',
    pythonExpr: 'range(1, 6)',
    values: [1, 2, 3, 4, 5],
  },
  range_0_10_2: {
    id: 'range_0_10_2',
    label: 'range(0, 10, 2)',
    pythonExpr: 'range(0, 10, 2)',
    values: [0, 2, 4, 6, 8],
  },
  list_values: {
    id: 'list_values',
    label: '[2, 3, 5, 7, 11]',
    pythonExpr: '[2, 3, 5, 7, 11]',
    values: [2, 3, 5, 7, 11],
  },
};

export function computeRangeValues(start: number, stop: number, step: number): number[] {
  const safeStep = step === 0 ? 1 : step;
  const result: number[] = [];
  if (safeStep > 0) {
    for (let v = start; v < stop && result.length < 10; v += safeStep) {
      result.push(v);
    }
  } else {
    for (let v = start; v > stop && result.length < 10; v += safeStep) {
      result.push(v);
    }
  }
  return result;
}

export function formatRangeExpr(start: number, stop: number, step: number): string {
  const safeStep = step === 0 ? 1 : step;
  return safeStep === 1
    ? `range(${start}, ${stop})`
    : `range(${start}, ${stop}, ${safeStep})`;
}

export const PYTHON_FUNCTIONS: Record<FunctionId, FunctionSpec> = {
  square: {
    id: 'square',
    name: 'square',
    dropdownLabel: 'square (n * n)',
    defLine: 'def square(n):',
    returnExpr: 'n * n',
    returnLine: '    return n * n',
    compute: (n: number) => n * n,
    formatOutput: (val: number | boolean) => String(val),
    explainEval: (n: number, result: number | boolean) => `${n} * ${n} = ${String(result)}`,
  },
  double: {
    id: 'double',
    name: 'double',
    dropdownLabel: 'double (n * 2)',
    defLine: 'def double(n):',
    returnExpr: 'n * 2',
    returnLine: '    return n * 2',
    compute: (n: number) => n * 2,
    formatOutput: (val: number | boolean) => String(val),
    explainEval: (n: number, result: number | boolean) => `${n} * 2 = ${String(result)}`,
  },
  is_even: {
    id: 'is_even',
    name: 'is_even',
    dropdownLabel: 'is_even (n % 2 == 0)',
    defLine: 'def is_even(n):',
    returnExpr: 'n % 2 == 0',
    returnLine: '    return n % 2 == 0',
    compute: (n: number) => n % 2 === 0,
    formatOutput: (val: number | boolean) => (val ? 'True' : 'False'),
    explainEval: (n: number, result: number | boolean) =>
      `${n} % 2 == 0 → ${result ? 'True' : 'False'}`,
  },
};

export function getRobotCodeLines(pythonExpr: string): CodeLine[] {
  return [
    { lineNumber: 1, code: `for i in ${pythonExpr}:`, indent: 0, role: 'for' },
    { lineNumber: 2, code: '    print(i)', indent: 1, role: 'print' },
  ];
}

export function getNestedCodeLines(): CodeLine[] {
  return [
    { lineNumber: 1, code: 'for i in range(3):', indent: 0, role: 'for' },
    { lineNumber: 2, code: '    for j in range(3):', indent: 1, role: 'for-inner' },
    { lineNumber: 3, code: '        print(i, j)', indent: 2, role: 'print' },
  ];
}

export function getFunctionCodeLines(fn: FunctionSpec, pythonExpr: string): CodeLine[] {
  return [
    { lineNumber: 1, code: fn.defLine, indent: 0, role: 'def' },
    { lineNumber: 2, code: fn.returnLine, indent: 1, role: 'return' },
    { lineNumber: 3, code: '', indent: 0, role: 'blank' },
    { lineNumber: 4, code: `for i in ${pythonExpr}:`, indent: 0, role: 'for' },
    { lineNumber: 5, code: `    result = ${fn.name}(i)`, indent: 1, role: 'call' },
    { lineNumber: 6, code: '    print(result)', indent: 1, role: 'print' },
  ];
}

export function buildRobotSteps(values: number[], pythonExpr: string): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  let idxCounter = 0;

  if (values.length === 0) {
    steps.push({
      stepIndex: 0,
      mode: 'robot',
      phase: 'done',
      machinePhase: 'done',
      iterIndex: -1,
      gridI: null,
      gridJ: null,
      currentInput: null,
      currentOutput: null,
      activeLine: 1,
      outputsCount: 0,
      visitedCount: 0,
      variables: { i: '—' },
      explanation: `${pythonExpr} produces 0 values, so the robot stays at the start pad.`,
    });
    return steps;
  }

  values.forEach((val, idx) => {
    steps.push({
      stepIndex: idxCounter++,
      mode: 'robot',
      phase: 'robot-move',
      machinePhase: 'idle',
      iterIndex: idx,
      gridI: null,
      gridJ: null,
      currentInput: val,
      currentOutput: null,
      activeLine: 1,
      outputsCount: idx,
      visitedCount: idx,
      variables: { i: String(val) },
      explanation: `Robot walks to position i = ${val} along ${pythonExpr} and lands with a small jump.`,
    });

    steps.push({
      stepIndex: idxCounter++,
      mode: 'robot',
      phase: 'robot-print',
      machinePhase: 'idle',
      iterIndex: idx,
      gridI: null,
      gridJ: null,
      currentInput: val,
      currentOutput: val,
      activeLine: 2,
      outputsCount: idx + 1,
      visitedCount: idx + 1,
      variables: { i: String(val) },
      explanation: `print(i) prints ${val} to the output console.`,
    });
  });

  steps.push({
    stepIndex: idxCounter++,
    mode: 'robot',
    phase: 'done',
    machinePhase: 'done',
    iterIndex: values.length - 1,
    gridI: null,
    gridJ: null,
    currentInput: null,
    currentOutput: null,
    activeLine: 1,
    outputsCount: values.length,
    visitedCount: values.length,
    variables: { i: String(values[values.length - 1]) },
    explanation: `Robot completed all ${values.length} stops in ${pythonExpr}.`,
  });

  return steps;
}

export function buildNestedSteps(): { steps: ExecutionStep[]; outputs: string[] } {
  const steps: ExecutionStep[] = [];
  const outputs: string[] = [];
  let idxCounter = 0;

  for (let i = 0; i < 3; i++) {
    steps.push({
      stepIndex: idxCounter++,
      mode: 'nested',
      phase: 'nested-outer',
      machinePhase: 'idle',
      iterIndex: i * 3,
      gridI: i,
      gridJ: null,
      currentInput: i,
      currentOutput: null,
      activeLine: 1,
      outputsCount: outputs.length,
      visitedCount: outputs.length,
      variables: { i: String(i), j: '—' },
      explanation: `Outer loop selects row i = ${i}.`,
    });

    for (let j = 0; j < 3; j++) {
      const cellIndex = i * 3 + j;
      steps.push({
        stepIndex: idxCounter++,
        mode: 'nested',
        phase: 'nested-inner',
        machinePhase: 'idle',
        iterIndex: cellIndex,
        gridI: i,
        gridJ: j,
        currentInput: j,
        currentOutput: null,
        activeLine: 2,
        outputsCount: outputs.length,
        visitedCount: outputs.length,
        variables: { i: String(i), j: String(j) },
        explanation: `Inner loop steps to column j = ${j} in row i = ${i} → cube (${i}, ${j}).`,
      });

      outputs.push(`i=${i}, j=${j}`);
      steps.push({
        stepIndex: idxCounter++,
        mode: 'nested',
        phase: 'nested-print',
        machinePhase: 'idle',
        iterIndex: cellIndex,
        gridI: i,
        gridJ: j,
        currentInput: j,
        currentOutput: cellIndex,
        activeLine: 3,
        outputsCount: outputs.length,
        visitedCount: outputs.length,
        variables: { i: String(i), j: String(j) },
        explanation: `Cube (${i}, ${j}) lights up and print(i, j) logs i=${i}, j=${j}.`,
      });
    }
  }

  steps.push({
    stepIndex: idxCounter++,
    mode: 'nested',
    phase: 'done',
    machinePhase: 'done',
    iterIndex: 8,
    gridI: 2,
    gridJ: 2,
    currentInput: null,
    currentOutput: null,
    activeLine: 1,
    outputsCount: outputs.length,
    visitedCount: outputs.length,
    variables: { i: '2', j: '2' },
    explanation: 'All 9 cubes (3 rows × 3 columns) illuminated row by row.',
  });

  return { steps, outputs };
}

export function buildFunctionSteps(
  values: number[],
  fn: FunctionSpec,
  pythonExpr: string
): { steps: ExecutionStep[]; allResults: ResultPair[] } {
  const steps: ExecutionStep[] = [];
  const allResults: ResultPair[] = values.map((val) => {
    const output = fn.compute(val);
    return {
      input: val,
      output,
      formattedOutput: fn.formatOutput(output),
    };
  });

  let idxCounter = 0;

  if (values.length === 0) {
    steps.push({
      stepIndex: 0,
      mode: 'function',
      phase: 'done',
      machinePhase: 'done',
      iterIndex: -1,
      gridI: null,
      gridJ: null,
      currentInput: null,
      currentOutput: null,
      activeLine: 4,
      outputsCount: 0,
      visitedCount: 0,
      variables: { i: '—', n: '—', result: '—' },
      explanation: `${pythonExpr} is empty, so ${fn.name}(i) is not called.`,
    });
    return { steps, allResults };
  }

  values.forEach((val, idx) => {
    const computed = allResults[idx].output;
    const formatted = allResults[idx].formattedOutput;
    const prevFormatted = idx > 0 ? allResults[idx - 1].formattedOutput : '—';

    steps.push({
      stepIndex: idxCounter++,
      mode: 'function',
      phase: 'fn-for',
      machinePhase: 'idle',
      iterIndex: idx,
      gridI: null,
      gridJ: null,
      currentInput: val,
      currentOutput: null,
      activeLine: 4,
      outputsCount: idx,
      visitedCount: idx,
      variables: { i: String(val), n: '—', result: prevFormatted },
      explanation: `Loop sets i = ${val} and queues sphere ${val} at the function machine intake.`,
    });

    steps.push({
      stepIndex: idxCounter++,
      mode: 'function',
      phase: 'fn-def',
      machinePhase: 'entering',
      iterIndex: idx,
      gridI: null,
      gridJ: null,
      currentInput: val,
      currentOutput: null,
      activeLine: 1,
      callerLine: 5,
      outputsCount: idx,
      visitedCount: idx,
      variables: { i: String(val), n: String(val), result: prevFormatted },
      explanation: `Calls ${fn.name}(${val}) → enters def ${fn.name}(n) with n = ${val}. Sphere enters the machine.`,
    });

    steps.push({
      stepIndex: idxCounter++,
      mode: 'function',
      phase: 'fn-return',
      machinePhase: 'glowing',
      iterIndex: idx,
      gridI: null,
      gridJ: null,
      currentInput: val,
      currentOutput: computed,
      activeLine: 2,
      callerLine: 5,
      outputsCount: idx,
      visitedCount: idx,
      variables: { i: String(val), n: String(val), result: formatted },
      explanation: `Machine glows and evaluates return ${fn.returnExpr}: ${fn.explainEval(val, computed)}.`,
    });

    steps.push({
      stepIndex: idxCounter++,
      mode: 'function',
      phase: 'fn-print',
      machinePhase: 'exiting',
      iterIndex: idx,
      gridI: null,
      gridJ: null,
      currentInput: val,
      currentOutput: computed,
      activeLine: 6,
      outputsCount: idx + 1,
      visitedCount: idx + 1,
      variables: { i: String(val), n: '—', result: formatted },
      explanation: `New sphere ${formatted} exits the machine and print(result) writes ${formatted} to the console.`,
    });
  });

  const lastFormatted = allResults[allResults.length - 1].formattedOutput;
  steps.push({
    stepIndex: idxCounter++,
    mode: 'function',
    phase: 'done',
    machinePhase: 'done',
    iterIndex: values.length - 1,
    gridI: null,
    gridJ: null,
    currentInput: null,
    currentOutput: null,
    activeLine: 4,
    outputsCount: values.length,
    visitedCount: values.length,
    variables: { i: String(values[values.length - 1]), n: '—', result: lastFormatted },
    explanation: `All ${values.length} loop values transformed through ${fn.name}(n).`,
  });

  return { steps, allResults };
}
