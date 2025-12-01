/**
 * Tests for move generation for each piece type
 */
import {
  getLegalMoves,
  getPseudoLegalMoves,
  fenToBoard,
  INITIAL_GAME_STATE,
  GameState,
} from '../../lib/chess';

// Helper to check if a specific move is in the moves list
function hasMove(
  moves: Array<[number, number] | [number, number, string | number]>,
  toRow: number,
  toCol: number
): boolean {
  return moves.some((move) => move[0] === toRow && move[1] === toCol);
}

// Helper to count moves
function countMoves(moves: Array<[number, number] | [number, number, string | number]>): number {
  return moves.length;
}

describe('Pawn moves', () => {
  describe('white pawns', () => {
    it('can move one square forward', () => {
      const board = fenToBoard('8/8/8/8/8/8/4P3/8 w - - 0 1');
      const moves = getLegalMoves(board, 6, 4, INITIAL_GAME_STATE);
      expect(hasMove(moves, 5, 4)).toBe(true);
    });

    it('can move two squares from starting position', () => {
      const board = fenToBoard('8/8/8/8/8/8/4P3/8 w - - 0 1');
      const moves = getLegalMoves(board, 6, 4, INITIAL_GAME_STATE);
      expect(hasMove(moves, 4, 4)).toBe(true);
    });

    it('cannot move two squares if not on starting row', () => {
      const board = fenToBoard('8/8/8/8/8/4P3/8/8 w - - 0 1');
      const moves = getLegalMoves(board, 5, 4, INITIAL_GAME_STATE);
      expect(hasMove(moves, 3, 4)).toBe(false);
    });

    it('cannot move forward if blocked', () => {
      const board = fenToBoard('8/8/8/8/8/4p3/4P3/8 w - - 0 1');
      const moves = getLegalMoves(board, 6, 4, INITIAL_GAME_STATE);
      expect(hasMove(moves, 5, 4)).toBe(false);
    });

    it('can capture diagonally', () => {
      const board = fenToBoard('8/8/8/8/8/3p1p2/4P3/8 w - - 0 1');
      const moves = getLegalMoves(board, 6, 4, INITIAL_GAME_STATE);
      expect(hasMove(moves, 5, 3)).toBe(true); // Capture left
      expect(hasMove(moves, 5, 5)).toBe(true); // Capture right
    });

    it('cannot capture own pieces', () => {
      const board = fenToBoard('8/8/8/8/8/3P1P2/4P3/8 w - - 0 1');
      const moves = getLegalMoves(board, 6, 4, INITIAL_GAME_STATE);
      expect(hasMove(moves, 5, 3)).toBe(false);
      expect(hasMove(moves, 5, 5)).toBe(false);
    });

    it('cannot move forward diagonally without capture', () => {
      const board = fenToBoard('8/8/8/8/8/8/4P3/8 w - - 0 1');
      const moves = getLegalMoves(board, 6, 4, INITIAL_GAME_STATE);
      expect(hasMove(moves, 5, 3)).toBe(false);
      expect(hasMove(moves, 5, 5)).toBe(false);
    });
  });

  describe('black pawns', () => {
    it('moves in opposite direction', () => {
      const board = fenToBoard('8/4p3/8/8/8/8/8/8 b - - 0 1');
      const moves = getLegalMoves(board, 1, 4, INITIAL_GAME_STATE);
      expect(hasMove(moves, 2, 4)).toBe(true);
      expect(hasMove(moves, 3, 4)).toBe(true);
    });

    it('captures diagonally forward (downward on board)', () => {
      const board = fenToBoard('8/4p3/3P1P2/8/8/8/8/8 b - - 0 1');
      const moves = getLegalMoves(board, 1, 4, INITIAL_GAME_STATE);
      expect(hasMove(moves, 2, 3)).toBe(true);
      expect(hasMove(moves, 2, 5)).toBe(true);
    });
  });
});

describe('Knight moves', () => {
  it('moves in L-shape pattern', () => {
    const board = fenToBoard('8/8/8/3N4/8/8/8/8 w - - 0 1');
    const moves = getLegalMoves(board, 3, 3, INITIAL_GAME_STATE);

    // All 8 knight moves
    expect(hasMove(moves, 1, 2)).toBe(true); // -2, -1
    expect(hasMove(moves, 1, 4)).toBe(true); // -2, +1
    expect(hasMove(moves, 2, 1)).toBe(true); // -1, -2
    expect(hasMove(moves, 2, 5)).toBe(true); // -1, +2
    expect(hasMove(moves, 4, 1)).toBe(true); // +1, -2
    expect(hasMove(moves, 4, 5)).toBe(true); // +1, +2
    expect(hasMove(moves, 5, 2)).toBe(true); // +2, -1
    expect(hasMove(moves, 5, 4)).toBe(true); // +2, +1
    expect(countMoves(moves)).toBe(8);
  });

  it('can jump over pieces', () => {
    const board = fenToBoard('8/8/2PPP3/2PNP3/2PPP3/8/8/8 w - - 0 1');
    const moves = getLegalMoves(board, 3, 3, INITIAL_GAME_STATE);
    expect(countMoves(moves)).toBe(8); // Can still reach all 8 squares
  });

  it('cannot capture own pieces', () => {
    // Knight on d5 (row 3, col 3), own pawns on c7 and e7 (row 1, cols 2 and 4)
    const board = fenToBoard('8/2P1P3/8/3N4/8/8/8/8 w - - 0 1');
    const moves = getLegalMoves(board, 3, 3, INITIAL_GAME_STATE);
    expect(hasMove(moves, 1, 2)).toBe(false); // c7 blocked by own pawn
    expect(hasMove(moves, 1, 4)).toBe(false); // e7 blocked by own pawn
  });

  it('can capture enemy pieces', () => {
    const board = fenToBoard('8/8/2p1p3/3N4/8/8/8/8 w - - 0 1');
    const moves = getLegalMoves(board, 3, 3, INITIAL_GAME_STATE);
    expect(hasMove(moves, 1, 2)).toBe(true);
    expect(hasMove(moves, 1, 4)).toBe(true);
  });

  it('respects board boundaries', () => {
    const board = fenToBoard('N7/8/8/8/8/8/8/8 w - - 0 1');
    const moves = getLegalMoves(board, 0, 0, INITIAL_GAME_STATE);
    expect(countMoves(moves)).toBe(2); // Only 2 valid moves from corner
    expect(hasMove(moves, 1, 2)).toBe(true);
    expect(hasMove(moves, 2, 1)).toBe(true);
  });
});

describe('Bishop moves', () => {
  it('moves diagonally in all directions', () => {
    const board = fenToBoard('8/8/8/3B4/8/8/8/8 w - - 0 1');
    const moves = getLegalMoves(board, 3, 3, INITIAL_GAME_STATE);

    // Should reach all corners and all squares on diagonals
    expect(hasMove(moves, 0, 0)).toBe(true); // a8
    expect(hasMove(moves, 0, 6)).toBe(true); // g8
    expect(hasMove(moves, 6, 0)).toBe(true); // a2
    expect(hasMove(moves, 7, 7)).toBe(true); // h1

    // Count: 4 squares to top-left, 4 to top-right, 3 to bottom-left, 4 to bottom-right
    // Actually from d5: 3 to a8, 4 to h8 (oops, g8), 3 to a2, 4 to h1
    // Total should be 13
    expect(countMoves(moves)).toBe(13);
  });

  it('is blocked by pieces', () => {
    const board = fenToBoard('8/8/4P3/3B4/8/8/8/8 w - - 0 1');
    const moves = getLegalMoves(board, 3, 3, INITIAL_GAME_STATE);
    expect(hasMove(moves, 2, 4)).toBe(false); // Blocked by own pawn
    expect(hasMove(moves, 1, 5)).toBe(false); // Behind blocked square
  });

  it('can capture enemy pieces', () => {
    const board = fenToBoard('8/8/4p3/3B4/8/8/8/8 w - - 0 1');
    const moves = getLegalMoves(board, 3, 3, INITIAL_GAME_STATE);
    expect(hasMove(moves, 2, 4)).toBe(true); // Can capture pawn
    expect(hasMove(moves, 1, 5)).toBe(false); // Cannot go past
  });
});

describe('Rook moves', () => {
  it('moves horizontally and vertically', () => {
    const board = fenToBoard('8/8/8/3R4/8/8/8/8 w - - 0 1');
    const moves = getLegalMoves(board, 3, 3, INITIAL_GAME_STATE);

    // Horizontal
    expect(hasMove(moves, 3, 0)).toBe(true); // a5
    expect(hasMove(moves, 3, 7)).toBe(true); // h5
    // Vertical
    expect(hasMove(moves, 0, 3)).toBe(true); // d8
    expect(hasMove(moves, 7, 3)).toBe(true); // d1

    // 7 horizontal + 7 vertical = 14
    expect(countMoves(moves)).toBe(14);
  });

  it('cannot move diagonally', () => {
    const board = fenToBoard('8/8/8/3R4/8/8/8/8 w - - 0 1');
    const moves = getLegalMoves(board, 3, 3, INITIAL_GAME_STATE);
    expect(hasMove(moves, 2, 2)).toBe(false);
    expect(hasMove(moves, 4, 4)).toBe(false);
  });

  it('is blocked by pieces', () => {
    const board = fenToBoard('8/8/3P4/3R4/8/8/8/8 w - - 0 1');
    const moves = getLegalMoves(board, 3, 3, INITIAL_GAME_STATE);
    expect(hasMove(moves, 2, 3)).toBe(false); // Blocked by own pawn
    expect(hasMove(moves, 1, 3)).toBe(false); // Behind blocked square
  });
});

describe('Queen moves', () => {
  it('combines rook and bishop movement', () => {
    const board = fenToBoard('8/8/8/3Q4/8/8/8/8 w - - 0 1');
    const moves = getLegalMoves(board, 3, 3, INITIAL_GAME_STATE);

    // Rook-like moves
    expect(hasMove(moves, 3, 0)).toBe(true);
    expect(hasMove(moves, 0, 3)).toBe(true);
    // Bishop-like moves
    expect(hasMove(moves, 0, 0)).toBe(true);
    expect(hasMove(moves, 7, 7)).toBe(true);

    // 14 (rook) + 13 (bishop) = 27
    expect(countMoves(moves)).toBe(27);
  });
});

describe('King moves', () => {
  it('moves one square in any direction', () => {
    const board = fenToBoard('8/8/8/3K4/8/8/8/8 w - - 0 1');
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      kingMoved: { white: true, black: false }, // Prevent castling
    };
    const moves = getLegalMoves(board, 3, 3, state);

    expect(hasMove(moves, 2, 2)).toBe(true);
    expect(hasMove(moves, 2, 3)).toBe(true);
    expect(hasMove(moves, 2, 4)).toBe(true);
    expect(hasMove(moves, 3, 2)).toBe(true);
    expect(hasMove(moves, 3, 4)).toBe(true);
    expect(hasMove(moves, 4, 2)).toBe(true);
    expect(hasMove(moves, 4, 3)).toBe(true);
    expect(hasMove(moves, 4, 4)).toBe(true);
    expect(countMoves(moves)).toBe(8);
  });

  it('cannot move into check', () => {
    const board = fenToBoard('8/8/8/3K4/8/8/8/3r4 w - - 0 1');
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      kingMoved: { white: true, black: false },
    };
    const moves = getLegalMoves(board, 3, 3, state);

    // d-file is attacked by rook
    expect(hasMove(moves, 2, 3)).toBe(false); // d6
    expect(hasMove(moves, 4, 3)).toBe(false); // d4
  });

  it('cannot capture defended pieces', () => {
    const board = fenToBoard('8/8/2qp4/3K4/8/8/8/8 w - - 0 1');
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      kingMoved: { white: true, black: false },
    };
    const moves = getLegalMoves(board, 3, 3, state);

    // Pawn is defended by queen
    expect(hasMove(moves, 2, 3)).toBe(false);
  });

  it('can capture undefended pieces', () => {
    const board = fenToBoard('8/8/3p4/3K4/8/8/8/8 w - - 0 1');
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      kingMoved: { white: true, black: false },
    };
    const moves = getLegalMoves(board, 3, 3, state);
    expect(hasMove(moves, 2, 3)).toBe(true);
  });

  it('respects board boundaries', () => {
    const board = fenToBoard('K7/8/8/8/8/8/8/8 w - - 0 1');
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      kingMoved: { white: true, black: false },
    };
    const moves = getLegalMoves(board, 0, 0, state);
    expect(countMoves(moves)).toBe(3); // Only 3 valid squares from corner
  });
});

describe('Pinned pieces', () => {
  it('cannot move a pinned piece that would expose the king', () => {
    // Bishop on a5 pinning the knight on c3 to the king on e1
    const board = fenToBoard('8/8/8/b7/8/2N5/8/4K3 w - - 0 1');
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      kingMoved: { white: true, black: false },
    };
    const moves = getLegalMoves(board, 5, 2, state);
    expect(countMoves(moves)).toBe(0); // Knight is pinned
  });

  it('allows pinned piece to move along the pin line', () => {
    // Rook on a1 pinning white rook on d1 to king on h1
    const board = fenToBoard('8/8/8/8/8/8/8/r2R3K w - - 0 1');
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      kingMoved: { white: true, black: false },
    };
    const moves = getLegalMoves(board, 7, 3, state);
    // White rook can only move along the 1st rank (capture or interpose)
    expect(hasMove(moves, 7, 0)).toBe(true); // Capture enemy rook on a1
    expect(hasMove(moves, 7, 1)).toBe(true); // b1
    expect(hasMove(moves, 7, 2)).toBe(true); // c1
    // Cannot move vertically (would expose king)
    expect(hasMove(moves, 6, 3)).toBe(false); // d2
    expect(hasMove(moves, 5, 3)).toBe(false); // d3
  });
});

describe('Check evasion', () => {
  it('king must move to safe square when in check', () => {
    // King on e1 in check from rook on a1
    const board = fenToBoard('4k3/8/8/8/8/8/8/r3K3 w - - 0 1');
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      kingMoved: { white: true, black: false },
    };
    const kingMoves = getLegalMoves(board, 7, 4, state);

    // King cannot stay on first rank (rook controls it)
    expect(hasMove(kingMoves, 7, 3)).toBe(false); // d1
    expect(hasMove(kingMoves, 7, 5)).toBe(false); // f1
    // King can escape to second rank
    expect(hasMove(kingMoves, 6, 3)).toBe(true); // d2
    expect(hasMove(kingMoves, 6, 4)).toBe(true); // e2 (rook doesn't control this)
    expect(hasMove(kingMoves, 6, 5)).toBe(true); // f2
  });

  it('allows capturing the checking piece', () => {
    // King on e1 in check from rook on e2, king can capture
    const board = fenToBoard('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1');
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      kingMoved: { white: true, black: false },
    };
    const kingMoves = getLegalMoves(board, 7, 4, state);
    expect(hasMove(kingMoves, 6, 4)).toBe(true); // Capture rook on e2
  });

  it('allows blocking the check with another piece', () => {
    // King on h1 in check from rook on a1, white rook on e3 can block or capture
    const board = fenToBoard('4k3/8/8/8/8/4R3/8/r6K w - - 0 1');
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      kingMoved: { white: true, black: false },
    };
    const rookMoves = getLegalMoves(board, 5, 4, state);
    // Rook can move to e1 to block check (e1 is between a1 and h1)
    expect(hasMove(rookMoves, 7, 4)).toBe(true); // e1 blocks
  });
});
