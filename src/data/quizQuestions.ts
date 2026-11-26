export interface QuizQuestion {
  id: string;
  rangeExpr: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    rangeExpr: 'range(4)',
    options: ['0, 1, 2, 3', '1, 2, 3, 4', '0, 1, 2, 3, 4', '1, 2, 3'],
    correctIndex: 0,
    explanation: 'range(4) starts at 0 by default and stops before 4, printing 0, 1, 2, 3.',
  },
  {
    id: 'q2',
    rangeExpr: 'range(1, 5)',
    options: ['1, 2, 3, 4, 5', '0, 1, 2, 3, 4', '1, 2, 3, 4', '2, 3, 4, 5'],
    correctIndex: 2,
    explanation: 'range(1, 5) starts at 1 (inclusive) and stops before 5 (exclusive): 1, 2, 3, 4.',
  },
  {
    id: 'q3',
    rangeExpr: 'range(0, 8, 2)',
    options: ['0, 2, 4, 6, 8', '0, 2, 4, 6', '2, 4, 6, 8', '0, 1, 2'],
    correctIndex: 1,
    explanation: 'Starting at 0 and stepping by 2 up to (but excluding) 8 yields 0, 2, 4, 6.',
  },
  {
    id: 'q4',
    rangeExpr: 'range(2, 10, 3)',
    options: ['2, 5, 8', '2, 5, 8, 11', '3, 6, 9', '2, 4, 6, 8'],
    correctIndex: 0,
    explanation: 'Starting at 2 and adding 3 each step gives 2, 5, 8 (next would be 11, which is >= 10).',
  },
  {
    id: 'q5',
    rangeExpr: 'range(5, 1, -1)',
    options: ['5, 4, 3, 2, 1', '5, 4, 3, 2', '4, 3, 2, 1', '1, 2, 3, 4'],
    correctIndex: 1,
    explanation: 'With step -1, range(5, 1, -1) counts down from 5 and stops before reaching 1: 5, 4, 3, 2.',
  },
  {
    id: 'q6',
    rangeExpr: 'range(3, 12, 4)',
    options: ['3, 7, 11', '3, 6, 9', '4, 8, 12', '3, 7'],
    correctIndex: 0,
    explanation: 'Starting at 3 with step 4 produces 3, 7, 11 (all strictly less than 12).',
  },
];
