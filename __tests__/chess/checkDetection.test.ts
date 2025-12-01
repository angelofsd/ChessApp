/**
 * Tests for check detection
 */
import {
  isKingInCheck,
  isSquareUnderAttack,
  findKing,
  fenToBoard,
  fenToGameState,
  INITIAL_BOARD,
} from '../../lib/chess';

describe('findKing', () => {
  it('finds white king on initial board', () => {
    const pos = findKing(INITIAL_BOARD, 'white');
    expect(pos).toEqual([7, 4]); // e1
  });

  it('finds black king on initial board', () => {
    const pos = findKing(INITIAL_BOARD, 'black');
    expect(pos).toEqual([0, 4]); // e8
  });

  it('returns null if king not found', () => {
    const board = fenToBoard('8/8/8/8/8/8/8/8 w - - 0 1');
    expect(findKing(board, 'white')).toBeNull();
  });
});

describe('isSquareUnderAttack', () => {
  describe('pawn attacks', () => {
    it('white pawn attacks diagonally forward', () => {
      const board = fenToBoard('8/8/8/8/8/3P4/8/8 w - - 0 1');
      expect(isSquareUnderAttack(board, 4, 2, 'white')).toBe(true); // c4
      expect(isSquareUnderAttack(board, 4, 4, 'white')).toBe(true); // e4
      expect(isSquareUnderAttack(board, 4, 3, 'white')).toBe(false); // d4 (forward, not attack)
    });

    it('black pawn attacks diagonally forward', () => {
      const board = fenToBoard('8/8/3p4/8/8/8/8/8 w - - 0 1');
      expect(isSquareUnderAttack(board, 3, 2, 'black')).toBe(true); // c5
      expect(isSquareUnderAttack(board, 3, 4, 'black')).toBe(true); // e5
      expect(isSquareUnderAttack(board, 3, 3, 'black')).toBe(false); // d5 (forward, not attack)
    });
  });

  describe('knight attacks', () => {
    it('knight attacks in L-shape', () => {
      const board = fenToBoard('8/8/8/3N4/8/8/8/8 w - - 0 1');
      // Knight on d5, should attack: c7, e7, f6, f4, e3, c3, b4, b6
      expect(isSquareUnderAttack(board, 1, 2, 'white')).toBe(true); // c7
      expect(isSquareUnderAttack(board, 1, 4, 'white')).toBe(true); // e7
      expect(isSquareUnderAttack(board, 2, 5, 'white')).toBe(true); // f6
      expect(isSquareUnderAttack(board, 4, 5, 'white')).toBe(true); // f4
      expect(isSquareUnderAttack(board, 5, 4, 'white')).toBe(true); // e3
      expect(isSquareUnderAttack(board, 5, 2, 'white')).toBe(true); // c3
      expect(isSquareUnderAttack(board, 4, 1, 'white')).toBe(true); // b4
      expect(isSquareUnderAttack(board, 2, 1, 'white')).toBe(true); // b6
      expect(isSquareUnderAttack(board, 3, 3, 'white')).toBe(false); // d5 (knight's own square)
    });
  });

  describe('bishop attacks', () => {
    it('bishop attacks diagonally', () => {
      const board = fenToBoard('8/8/8/3B4/8/8/8/8 w - - 0 1');
      expect(isSquareUnderAttack(board, 0, 0, 'white')).toBe(true); // a8
      expect(isSquareUnderAttack(board, 0, 6, 'white')).toBe(true); // g8
      expect(isSquareUnderAttack(board, 6, 0, 'white')).toBe(true); // a2
      expect(isSquareUnderAttack(board, 7, 7, 'white')).toBe(true); // h1
    });

    it('bishop is blocked by pieces', () => {
      const board = fenToBoard('8/8/4p3/3B4/8/8/8/8 w - - 0 1');
      expect(isSquareUnderAttack(board, 2, 4, 'white')).toBe(true); // e6 (pawn square)
      expect(isSquareUnderAttack(board, 1, 5, 'white')).toBe(false); // f7 (blocked by pawn)
    });
  });

  describe('rook attacks', () => {
    it('rook attacks horizontally and vertically', () => {
      const board = fenToBoard('8/8/8/3R4/8/8/8/8 w - - 0 1');
      expect(isSquareUnderAttack(board, 3, 0, 'white')).toBe(true); // a5
      expect(isSquareUnderAttack(board, 3, 7, 'white')).toBe(true); // h5
      expect(isSquareUnderAttack(board, 0, 3, 'white')).toBe(true); // d8
      expect(isSquareUnderAttack(board, 7, 3, 'white')).toBe(true); // d1
      expect(isSquareUnderAttack(board, 4, 4, 'white')).toBe(false); // e4 (diagonal)
    });

    it('rook is blocked by pieces', () => {
      const board = fenToBoard('8/8/3p4/3R4/8/8/8/8 w - - 0 1');
      expect(isSquareUnderAttack(board, 2, 3, 'white')).toBe(true); // d6 (pawn square)
      expect(isSquareUnderAttack(board, 1, 3, 'white')).toBe(false); // d7 (blocked by pawn)
    });
  });

  describe('queen attacks', () => {
    it('queen attacks in all directions', () => {
      const board = fenToBoard('8/8/8/3Q4/8/8/8/8 w - - 0 1');
      // Horizontal/vertical
      expect(isSquareUnderAttack(board, 3, 0, 'white')).toBe(true); // a5
      expect(isSquareUnderAttack(board, 0, 3, 'white')).toBe(true); // d8
      // Diagonal
      expect(isSquareUnderAttack(board, 0, 0, 'white')).toBe(true); // a8
      expect(isSquareUnderAttack(board, 7, 7, 'white')).toBe(true); // h1
    });
  });

  describe('king attacks', () => {
    it('king attacks adjacent squares', () => {
      const board = fenToBoard('8/8/8/3K4/8/8/8/8 w - - 0 1');
      expect(isSquareUnderAttack(board, 2, 2, 'white')).toBe(true); // c6
      expect(isSquareUnderAttack(board, 2, 3, 'white')).toBe(true); // d6
      expect(isSquareUnderAttack(board, 2, 4, 'white')).toBe(true); // e6
      expect(isSquareUnderAttack(board, 3, 2, 'white')).toBe(true); // c5
      expect(isSquareUnderAttack(board, 3, 4, 'white')).toBe(true); // e5
      expect(isSquareUnderAttack(board, 4, 2, 'white')).toBe(true); // c4
      expect(isSquareUnderAttack(board, 4, 3, 'white')).toBe(true); // d4
      expect(isSquareUnderAttack(board, 4, 4, 'white')).toBe(true); // e4
      expect(isSquareUnderAttack(board, 5, 3, 'white')).toBe(false); // d3 (too far)
    });
  });
});

describe('isKingInCheck', () => {
  it('returns false for initial position', () => {
    expect(isKingInCheck(INITIAL_BOARD, 'white')).toBe(false);
    expect(isKingInCheck(INITIAL_BOARD, 'black')).toBe(false);
  });

  it('detects check from queen', () => {
    const board = fenToBoard('4k3/8/8/8/8/8/8/4K2q w - - 0 1');
    expect(isKingInCheck(board, 'white')).toBe(true);
  });

  it('detects check from rook', () => {
    const board = fenToBoard('4k3/8/8/8/8/8/8/r3K3 w - - 0 1');
    expect(isKingInCheck(board, 'white')).toBe(true);
  });

  it('detects check from bishop', () => {
    const board = fenToBoard('4k3/8/8/8/8/8/3b4/4K3 w - - 0 1');
    expect(isKingInCheck(board, 'white')).toBe(true);
  });

  it('detects check from knight', () => {
    // Knight on d3 attacks e1 where king is
    const board = fenToBoard('4k3/8/8/8/8/3n4/8/4K3 w - - 0 1');
    expect(isKingInCheck(board, 'white')).toBe(true);
  });

  it('detects check from pawn', () => {
    // Pawn on d2 attacks e1
    const board = fenToBoard('4k3/8/8/8/8/8/3p4/4K3 w - - 0 1');
    expect(isKingInCheck(board, 'white')).toBe(true);
  });

  it('does not detect check when blocked', () => {
    // Rook on a1 would check king on e1, but pawn on c1 blocks
    const board = fenToBoard('4k3/8/8/8/8/8/8/r1P1K3 w - - 0 1');
    expect(isKingInCheck(board, 'white')).toBe(false);
  });

  it('detects discovered check', () => {
    // Bishop was blocking rook's attack on king, now moved
    const board = fenToBoard('4k3/8/8/8/8/8/8/r3K3 w - - 0 1');
    expect(isKingInCheck(board, 'white')).toBe(true);
  });

  it('detects double check', () => {
    // King attacked by both knight and rook
    const board = fenToBoard('4k3/8/8/8/8/5n2/8/r3K3 w - - 0 1');
    expect(isKingInCheck(board, 'white')).toBe(true);
  });
});
