/**
 * Chess App Constants
 * 
 * Centralized constants for the chess application including
 * piece images, Unicode symbols, initial board state, and type definitions.
 */

// =============================================================================
// Type Definitions
// =============================================================================

export type Board = string[][];
export type Color = 'white' | 'black';
export type GameMode = 'human' | 'ai' | 'trainer';
export type AIDifficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert' | 'master';

// =============================================================================
// Piece Images (Wikipedia Commons - Public Domain)
// =============================================================================

export const PIECE_IMAGES: Record<string, string> = {
  // White pieces
  K: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  Q: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  R: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  B: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  N: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
  P: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
  // Black pieces
  k: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
  q: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
  r: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  b: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  n: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
  p: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg'
};

// =============================================================================
// Unicode Chess Symbols
// =============================================================================

export const PIECE_SYMBOLS: Record<string, string> = {
  // White pieces
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  // Black pieces
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟︎'
};

// =============================================================================
// Initial Board State
// =============================================================================

export const INITIAL_BOARD: Board = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],  // Rank 8 (Black back rank)
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],  // Rank 7 (Black pawns)
  ['', '', '', '', '', '', '', ''],          // Rank 6
  ['', '', '', '', '', '', '', ''],          // Rank 5
  ['', '', '', '', '', '', '', ''],          // Rank 4
  ['', '', '', '', '', '', '', ''],          // Rank 3
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],  // Rank 2 (White pawns)
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']   // Rank 1 (White back rank)
];

// =============================================================================
// Board Coordinate Helpers
// =============================================================================

export const FILES = 'abcdefgh';
export const RANKS = '87654321';

/**
 * Convert board coordinates to algebraic notation
 * @param row - Board row (0-7, where 0 is rank 8)
 * @param col - Board column (0-7, where 0 is file 'a')
 * @returns Algebraic notation (e.g., 'e4')
 */
export const toAlgebraic = (row: number, col: number): string => {
  return `${FILES[col]}${8 - row}`;
};

/**
 * Convert algebraic notation to board coordinates
 * @param square - Algebraic notation (e.g., 'e4')
 * @returns [row, col] tuple
 */
export const fromAlgebraic = (square: string): [number, number] => {
  const col = FILES.indexOf(square[0]);
  const row = 8 - parseInt(square[1]);
  return [row, col];
};

// =============================================================================
// AI Difficulty Settings
// =============================================================================

export interface DifficultySettings {
  depth: number;
  multiPV: number;
  skillLevel: number;
  randomChance: number;
}

export const AI_DIFFICULTY_SETTINGS: Record<AIDifficulty, DifficultySettings> = {
  beginner: { depth: 1, multiPV: 15, skillLevel: 0, randomChance: 0.30 },
  easy:     { depth: 3, multiPV: 10, skillLevel: 3, randomChance: 0.15 },
  medium:   { depth: 5, multiPV: 5,  skillLevel: 6, randomChance: 0.05 },
  hard:     { depth: 8, multiPV: 3,  skillLevel: 10, randomChance: 0.02 },
  expert:   { depth: 10, multiPV: 2, skillLevel: 15, randomChance: 0 },
  master:   { depth: 15, multiPV: 1, skillLevel: 20, randomChance: 0 }
};

// =============================================================================
// Move Quality Thresholds (in centipawns)
// =============================================================================

export const MOVE_QUALITY_THRESHOLDS = {
  EXCELLENT: 25,   // <25cp loss = Excellent
  GOOD: 50,        // <50cp loss = Good
  OKAY: 100,       // <100cp loss = Okay
  DUBIOUS: 200     // <200cp loss = Dubious, >=200 = Bad
};

// =============================================================================
// Stockfish Analysis Settings
// =============================================================================

export const STOCKFISH_SETTINGS = {
  ANALYSIS_DEPTH: 15,
  MULTI_PV: 20,           // Analyze top 20 moves in trainer mode
  RESTART_DELAY_MS: 2000  // Delay before restarting crashed worker
};
