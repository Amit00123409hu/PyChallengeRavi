export type AppMode = 'robot' | 'nested' | 'function';

export type SequencePresetId = 'range_1_6' | 'range_0_10_2' | 'list_values' | 'custom';

export type FunctionId = 'square' | 'double' | 'is_even';

export interface FunctionSpec {
  id: FunctionId;
  name: string;
  dropdownLabel: string;
  defLine: string;
  returnExpr: string;
  returnLine: string;
  compute: (n: number) => number | boolean;
  formatOutput: (value: number | boolean) => string;
  explainEval: (n: number, result: number | boolean) => string;
}

export interface SequencePreset {
  id: SequencePresetId;
  label: string;
  pythonExpr: string;
  values: number[];
}

export interface CodeLine {
  lineNumber: number;
  code: string;
  indent: number;
  role: 'def' | 'return' | 'for' | 'for-inner' | 'call' | 'print' | 'blank';
}

export type FunctionMachinePhase = 'idle' | 'entering' | 'glowing' | 'exiting' | 'done';

export interface ResultPair {
  input: number;
  output: number | boolean;
  formattedOutput: string;
}

export interface ExecutionStep {
  stepIndex: number;
  mode: AppMode;
  phase:
    | 'robot-move'
    | 'robot-print'
    | 'nested-outer'
    | 'nested-inner'
    | 'nested-print'
    | 'fn-for'
    | 'fn-def'
    | 'fn-return'
    | 'fn-print'
    | 'done';
  machinePhase: FunctionMachinePhase;
  iterIndex: number;
  gridI: number | null;
  gridJ: number | null;
  currentInput: number | null;
  currentOutput: number | boolean | null;
  activeLine: number;
  callerLine?: number;
  outputsCount: number;
  visitedCount: number;
  variables: {
    i: string;
    j?: string;
    n?: string;
    result?: string;
  };
  explanation: string;
}
