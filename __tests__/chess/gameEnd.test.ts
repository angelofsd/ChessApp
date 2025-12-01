/**
 * Tests for checkmate and stalemate detection
 */
import {
  isCheckmate,
  isStalemate,
  hasLegalMoves,
  fenToBoard,
  fenToGameState,
} from '../../lib/chess';

// Helper to get both board and state from FEN
function parseFEN(fen: string) {
  return {
    board: fenToBoard(fen),
    state: fenToGameState(fen),
  };
}

describe('hasLegalMoves', () => {
  it('returns true for initial position', () => {
    const { board, state } = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(hasLegalMoves(board, 'white', state)).toBe(true);
    expect(hasLegalMoves(board, 'black', state)).toBe(true);
  });

  it('returns false when king has no escape and no blocking moves', () => {
    // Back rank mate - white king on e1, black rook on a1 giving check
    // White king has no escape (pawns block d2, e2, f2)
    const { board, state } = parseFEN('4k3/8/8/8/8/8/3PPP2/r3K3 w - - 0 1');
    expect(hasLegalMoves(board, 'white', state)).toBe(false);
  });

  it('returns true when king can escape', () => {
    const { board, state } = parseFEN('4k3/8/8/8/8/8/8/r3K3 w - - 0 1');
    expect(hasLegalMoves(board, 'white', state)).toBe(true); // King can go to d1, d2, e2, f2, f1
  });

  it('returns true when check can be blocked', () => {
    const { board, state } = parseFEN('4k3/8/8/8/8/8/3R4/r3K3 w - - 0 1');
    expect(hasLegalMoves(board, 'white', state)).toBe(true); // Rook can block on a2
  });
});

describe('isCheckmate', () => {
  it('returns false for initial position', () => {
    const { board, state } = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(isCheckmate(board, 'white', state)).toBe(false);
  });

  describe('classic checkmate patterns', () => {
    it('detects back rank mate', () => {
      // White king on e1, black rook on a1 giving check, pawns block escape
      const { board, state } = parseFEN('4k3/8/8/8/8/8/3PPP2/r3K3 w - - 0 1');
      expect(isCheckmate(board, 'white', state)).toBe(true);
    });

    it("detects scholar's mate", () => {
      // After 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7#
      const { board, state } = parseFEN('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4');
      expect(isCheckmate(board, 'black', state)).toBe(true);
    });

    it("detects fool's mate", () => {
      // After 1.f3 e5 2.g4 Qh4#
      const { board, state } = parseFEN('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
      expect(isCheckmate(board, 'white', state)).toBe(true);
    });

    it('detects smothered mate', () => {
      // Classic Anastasia's mate pattern - king smothered, knight delivers check
      // King on h1, pawn blocks g1, rook delivers check from h-file
      // Actually let's use Morphy's checkmate: Kh8, Rg8 (own), pawns g7/h7, knight on f7
      const { board, state } = parseFEN('6rk/5Npp/8/8/8/8/8/4K3 b - - 0 1');
      expect(isCheckmate(board, 'black', state)).toBe(true);
    });

    it('detects queen + king mate', () => {
      // Black king on a8, White king on a6 (blocking a7 escape), Queen on b7 giving checkmate
      const { board, state } = parseFEN('k7/1Q6/K7/8/8/8/8/8 b - - 0 1');
      expect(isCheckmate(board, 'black', state)).toBe(true);
    });

    it('detects two rooks mate (ladder mate)', () => {
      const { board, state } = parseFEN('k7/8/8/8/8/8/1R6/RK6 b - - 0 1');
      expect(isCheckmate(board, 'black', state)).toBe(true);
    });
  });

  describe('not checkmate cases', () => {
    it('returns false when king can escape', () => {
      const { board, state } = parseFEN('4k3/8/8/8/8/8/8/r3K3 w - - 0 1');
      expect(isCheckmate(board, 'white', state)).toBe(false);
    });

    it('returns false when attacker can be captured', () => {
      const { board, state } = parseFEN('4k3/8/8/8/8/8/4R3/r3K3 w - - 0 1');
      expect(isCheckmate(board, 'white', state)).toBe(false);
    });

    it('returns false when check can be blocked', () => {
      const { board, state } = parseFEN('4k3/8/8/8/8/8/R7/r3K3 w - - 0 1');
      expect(isCheckmate(board, 'white', state)).toBe(false);
    });

    it('returns false when not in check', () => {
      const { board, state } = parseFEN('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
      expect(isCheckmate(board, 'white', state)).toBe(false);
    });
  });
});

describe('isStalemate', () => {
  it('returns false for initial position', () => {
    const { board, state } = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(isStalemate(board, 'white', state)).toBe(false);
  });

  describe('classic stalemate patterns', () => {
    it('detects basic king stalemate', () => {
      // King in corner, not in check but no moves
      const { board, state } = parseFEN('k7/2Q5/1K6/8/8/8/8/8 b - - 0 1');
      expect(isStalemate(board, 'black', state)).toBe(true);
    });

    it('detects stalemate with pawns', () => {
      // Black king stuck, pawns blocked
      const { board, state } = parseFEN('k7/P7/K7/8/8/8/8/8 b - - 0 1');
      expect(isStalemate(board, 'black', state)).toBe(true);
    });

    it('detects stalemate in endgame', () => {
      // Famous stalemate pattern
      const { board, state } = parseFEN('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
      expect(isStalemate(board, 'black', state)).toBe(true);
    });
  });

  describe('not stalemate cases', () => {
    it('returns false when king is in check', () => {
      const { board, state } = parseFEN('k7/1Q6/1K6/8/8/8/8/8 b - - 0 1');
      expect(isStalemate(board, 'black', state)).toBe(false); // This is checkmate
    });

    it('returns false when other pieces can move', () => {
      const { board, state } = parseFEN('k7/2Q5/1K6/8/8/8/p7/8 b - - 0 1');
      expect(isStalemate(board, 'black', state)).toBe(false); // Pawn can move
    });

    it('returns false when king has legal moves', () => {
      const { board, state } = parseFEN('k7/8/1K6/8/8/8/8/8 b - - 0 1');
      expect(isStalemate(board, 'black', state)).toBe(false);
    });
  });
});
