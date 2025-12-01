/**
 * Tests for special moves: castling and en passant
 */
import {
  getLegalMoves,
  getPseudoLegalMoves,
  simulateMove,
  isKingInCheck,
  fenToBoard,
  fenToGameState,
  INITIAL_GAME_STATE,
  GameState,
  Board,
} from '../../lib/chess';

// Helper to get both board and state from FEN
function parseFEN(fen: string) {
  return {
    board: fenToBoard(fen),
    state: fenToGameState(fen),
  };
}

// Helper to check if a specific move is in the moves list
function hasMove(
  moves: Array<[number, number] | [number, number, string | number]>,
  toRow: number,
  toCol: number,
  special?: string | number
): boolean {
  return moves.some((move) => {
    if (move[0] !== toRow || move[1] !== toCol) return false;
    if (special !== undefined && move[2] !== special) return false;
    return true;
  });
}

describe('Castling', () => {
  describe('white castling', () => {
    it('allows kingside castling when available', () => {
      const board = fenToBoard('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
      const state: GameState = {
        enPassantTarget: null,
        kingMoved: { white: false, black: false },
        rookMoved: {
          whiteKingSide: false,
          whiteQueenSide: false,
          blackKingSide: false,
          blackQueenSide: false,
        },
      };

      const moves = getLegalMoves(board, 7, 4, state); // King on e1
      expect(hasMove(moves, 7, 6, 'castle-kingside')).toBe(true);
    });

    it('allows queenside castling when available', () => {
      const board = fenToBoard('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
      const state: GameState = {
        enPassantTarget: null,
        kingMoved: { white: false, black: false },
        rookMoved: {
          whiteKingSide: false,
          whiteQueenSide: false,
          blackKingSide: false,
          blackQueenSide: false,
        },
      };

      const moves = getLegalMoves(board, 7, 4, state);
      expect(hasMove(moves, 7, 2, 'castle-queenside')).toBe(true);
    });

    it('disallows castling when king has moved', () => {
      const board = fenToBoard('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
      const state: GameState = {
        ...INITIAL_GAME_STATE,
        kingMoved: { white: true, black: false },
      };

      const moves = getLegalMoves(board, 7, 4, state);
      expect(hasMove(moves, 7, 6, 'castle-kingside')).toBe(false);
      expect(hasMove(moves, 7, 2, 'castle-queenside')).toBe(false);
    });

    it('disallows kingside castling when kingside rook has moved', () => {
      const board = fenToBoard('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
      const state: GameState = {
        ...INITIAL_GAME_STATE,
        rookMoved: { ...INITIAL_GAME_STATE.rookMoved, whiteKingSide: true },
      };

      const moves = getLegalMoves(board, 7, 4, state);
      expect(hasMove(moves, 7, 6, 'castle-kingside')).toBe(false);
      expect(hasMove(moves, 7, 2, 'castle-queenside')).toBe(true);
    });

    it('disallows castling when in check', () => {
      // Rook on e8 gives check to white king (no blocking pawns on e-file)
      const board = fenToBoard('4r3/8/8/8/8/8/PPPP1PPP/R3K2R w KQ - 0 1');
      const state: GameState = { ...INITIAL_GAME_STATE };

      const moves = getLegalMoves(board, 7, 4, state);
      expect(hasMove(moves, 7, 6, 'castle-kingside')).toBe(false);
      expect(hasMove(moves, 7, 2, 'castle-queenside')).toBe(false);
    });

    it('disallows castling when king passes through attacked square', () => {
      // Rook on f8 attacks f1 (no pawns blocking)
      const board = fenToBoard('5r2/8/8/8/8/8/8/R3K2R w KQ - 0 1');
      const state: GameState = { ...INITIAL_GAME_STATE };

      const moves = getLegalMoves(board, 7, 4, state);
      expect(hasMove(moves, 7, 6, 'castle-kingside')).toBe(false);
      // Queenside should still be available
      expect(hasMove(moves, 7, 2, 'castle-queenside')).toBe(true);
    });

    it('disallows castling when king ends on attacked square', () => {
      // Rook on g8 attacks g1 (no pawns blocking)
      const board = fenToBoard('6r1/8/8/8/8/8/8/R3K2R w KQ - 0 1');
      const state: GameState = { ...INITIAL_GAME_STATE };

      const moves = getLegalMoves(board, 7, 4, state);
      expect(hasMove(moves, 7, 6, 'castle-kingside')).toBe(false);
    });

    it('disallows castling when pieces block the path', () => {
      const board = fenToBoard('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R2BK1NR w KQkq - 0 1');
      const state: GameState = { ...INITIAL_GAME_STATE };

      const moves = getLegalMoves(board, 7, 4, state);
      expect(hasMove(moves, 7, 6, 'castle-kingside')).toBe(false); // Knight blocks
      expect(hasMove(moves, 7, 2, 'castle-queenside')).toBe(false); // Bishop blocks
    });
  });

  describe('black castling', () => {
    it('allows both castling options when available', () => {
      const board = fenToBoard('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R b KQkq - 0 1');
      const state: GameState = { ...INITIAL_GAME_STATE };

      const moves = getLegalMoves(board, 0, 4, state); // King on e8
      expect(hasMove(moves, 0, 6, 'castle-kingside')).toBe(true);
      expect(hasMove(moves, 0, 2, 'castle-queenside')).toBe(true);
    });

    it('disallows castling when king is in check', () => {
      // Rook on e1 gives check to black king (no blocking pawns)
      const board = fenToBoard('r3k2r/pppp1ppp/8/8/8/8/8/4R3 b kq - 0 1');
      const state: GameState = { ...INITIAL_GAME_STATE };

      const moves = getLegalMoves(board, 0, 4, state);
      expect(hasMove(moves, 0, 6, 'castle-kingside')).toBe(false);
      expect(hasMove(moves, 0, 2, 'castle-queenside')).toBe(false);
    });
  });

  describe('castling simulation', () => {
    it('correctly simulates kingside castling', () => {
      const board = fenToBoard('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
      const newBoard = simulateMove(board, 7, 4, 7, 6, 'castle-kingside');

      expect(newBoard[7][4]).toBe(''); // King moved from e1
      expect(newBoard[7][6]).toBe('K'); // King now on g1
      expect(newBoard[7][7]).toBe(''); // Rook moved from h1
      expect(newBoard[7][5]).toBe('R'); // Rook now on f1
    });

    it('correctly simulates queenside castling', () => {
      const board = fenToBoard('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
      const newBoard = simulateMove(board, 7, 4, 7, 2, 'castle-queenside');

      expect(newBoard[7][4]).toBe(''); // King moved from e1
      expect(newBoard[7][2]).toBe('K'); // King now on c1
      expect(newBoard[7][0]).toBe(''); // Rook moved from a1
      expect(newBoard[7][3]).toBe('R'); // Rook now on d1
    });
  });
});

describe('En Passant', () => {
  describe('white en passant', () => {
    it('allows en passant capture when available', () => {
      // White pawn on e5, black just played d7-d5
      const board = fenToBoard('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3');
      const state: GameState = {
        ...INITIAL_GAME_STATE,
        enPassantTarget: [2, 3], // d6
      };

      const moves = getLegalMoves(board, 3, 4, state); // White pawn on e5
      expect(hasMove(moves, 2, 3, 1)).toBe(true); // d6 with en passant marker
    });

    it('does not allow en passant when target is not adjacent', () => {
      // White pawn on a5, black just played d7-d5 (not adjacent)
      const board = fenToBoard('rnbqkbnr/1pp1pppp/8/P2pP3/8/8/1PPP1PPP/RNBQKBNR w KQkq d6 0 3');
      const state: GameState = {
        ...INITIAL_GAME_STATE,
        enPassantTarget: [2, 3], // d6
      };

      const moves = getLegalMoves(board, 3, 0, state); // White pawn on a5
      expect(hasMove(moves, 2, 3, 1)).toBe(false); // Cannot capture en passant
    });
  });

  describe('black en passant', () => {
    it('allows en passant capture when available', () => {
      // Black pawn on d4, white just played e2-e4
      const board = fenToBoard('rnbqkbnr/pppp1ppp/8/8/3pP3/8/PPP2PPP/RNBQKBNR b KQkq e3 0 3');
      const state: GameState = {
        ...INITIAL_GAME_STATE,
        enPassantTarget: [5, 4], // e3
      };

      const moves = getLegalMoves(board, 4, 3, state); // Black pawn on d4
      expect(hasMove(moves, 5, 4, 1)).toBe(true); // e3 with en passant marker
    });
  });

  describe('en passant simulation', () => {
    it('correctly removes the captured pawn', () => {
      // White pawn on e5, black pawn on d5, en passant available
      const board = fenToBoard('8/8/8/3pP3/8/8/8/8 w - d6 0 1');
      const newBoard = simulateMove(board, 3, 4, 2, 3, 1);

      expect(newBoard[3][4]).toBe(''); // White pawn moved from e5
      expect(newBoard[2][3]).toBe('P'); // White pawn now on d6
      expect(newBoard[3][3]).toBe(''); // Black pawn captured (was on d5)
    });
  });

  describe('en passant edge cases', () => {
    it('does not allow en passant if it would expose king to check', () => {
      // White king on a5, white pawn on b5, black pawn on c5 (just moved),
      // black rook on h5 - en passant would expose king to check
      const board = fenToBoard('8/8/8/K1pP3r/8/8/8/8 w - c6 0 1');
      const state: GameState = {
        ...INITIAL_GAME_STATE,
        enPassantTarget: [2, 2], // c6
      };

      const moves = getLegalMoves(board, 3, 3, state); // White pawn on d5
      expect(hasMove(moves, 2, 2, 1)).toBe(false); // Would expose king
    });
  });
});

describe('Pawn Promotion', () => {
  describe('white pawn promotion', () => {
    it('allows pawn to reach the back rank', () => {
      const board = fenToBoard('8/P7/8/8/8/8/8/K6k w - - 0 1');
      const state: GameState = { ...INITIAL_GAME_STATE };

      const moves = getLegalMoves(board, 1, 0, state); // White pawn on a7
      expect(hasMove(moves, 0, 0)).toBe(true); // Can move to a8
    });
  });

  describe('black pawn promotion', () => {
    it('allows pawn to reach the back rank', () => {
      const board = fenToBoard('K6k/8/8/8/8/8/p7/8 b - - 0 1');
      const state: GameState = { ...INITIAL_GAME_STATE };

      const moves = getLegalMoves(board, 6, 0, state); // Black pawn on a2
      expect(hasMove(moves, 7, 0)).toBe(true); // Can move to a1
    });
  });
});
