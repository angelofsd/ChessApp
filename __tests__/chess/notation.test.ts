/**
 * Tests for FEN notation parsing and generation
 */
import {
  fenToBoard,
  boardToFEN,
  fenToGameState,
  INITIAL_BOARD,
  Board,
} from '../../lib/chess';

describe('fenToBoard', () => {
  it('parses initial position correctly', () => {
    const board = fenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    
    // Check black pieces
    expect(board[0]).toEqual(['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']);
    expect(board[1]).toEqual(['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p']);
    
    // Check empty rows
    expect(board[2]).toEqual(['', '', '', '', '', '', '', '']);
    expect(board[3]).toEqual(['', '', '', '', '', '', '', '']);
    expect(board[4]).toEqual(['', '', '', '', '', '', '', '']);
    expect(board[5]).toEqual(['', '', '', '', '', '', '', '']);
    
    // Check white pieces
    expect(board[6]).toEqual(['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P']);
    expect(board[7]).toEqual(['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']);
  });

  it('parses position after 1.e4', () => {
    const board = fenToBoard('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    
    expect(board[4][4]).toBe('P'); // e4
    expect(board[6][4]).toBe(''); // e2 is now empty
  });

  it('parses complex middlegame position', () => {
    const board = fenToBoard('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4');
    
    expect(board[0][0]).toBe('r'); // Black rook on a8
    expect(board[0][2]).toBe('b'); // Black bishop on c8
    expect(board[2][2]).toBe('n'); // Black knight on c6
    expect(board[4][2]).toBe('B'); // White bishop on c4
    expect(board[5][5]).toBe('N'); // White knight on f3
  });

  it('handles positions with many empty squares', () => {
    const board = fenToBoard('8/8/8/8/8/8/8/8 w - - 0 1');
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        expect(board[row][col]).toBe('');
      }
    }
  });

  it('handles partial empty squares', () => {
    const board = fenToBoard('r2k3r/8/8/8/8/8/8/R2K3R w - - 0 1');
    
    expect(board[0][0]).toBe('r'); // a8
    expect(board[0][1]).toBe(''); // b8
    expect(board[0][2]).toBe(''); // c8
    expect(board[0][3]).toBe('k'); // d8
    expect(board[0][4]).toBe(''); // e8
    expect(board[0][5]).toBe(''); // f8
    expect(board[0][6]).toBe(''); // g8
    expect(board[0][7]).toBe('r'); // h8
  });
});

describe('boardToFEN', () => {
  it('generates initial position FEN', () => {
    const fen = boardToFEN(INITIAL_BOARD);
    expect(fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
  });

  it('generates FEN with empty squares correctly', () => {
    const board: Board = [
      ['r', '', '', 'k', '', '', '', 'r'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['R', '', '', 'K', '', '', '', 'R'],
    ];
    
    const fen = boardToFEN(board);
    expect(fen).toBe('r2k3r/8/8/8/8/8/8/R2K3R');
  });

  it('generates FEN for complex positions', () => {
    const board: Board = [
      ['r', '', 'b', 'q', 'k', 'b', '', 'r'],
      ['p', 'p', 'p', 'p', '', 'p', 'p', 'p'],
      ['', '', 'n', '', '', 'n', '', ''],
      ['', '', '', '', 'p', '', '', ''],
      ['', '', 'B', '', 'P', '', '', ''],
      ['', '', '', '', '', 'N', '', ''],
      ['P', 'P', 'P', 'P', '', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', '', '', 'R'],
    ];
    
    const fen = boardToFEN(board);
    expect(fen).toBe('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R');
  });

  it('round-trips correctly', () => {
    const fenPositions = [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR',
      'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R',
      '8/8/8/8/8/8/8/8',
      'r2k3r/8/8/8/8/8/8/R2K3R',
    ];
    
    for (const originalFen of fenPositions) {
      const board = fenToBoard(originalFen + ' w - - 0 1');
      const generatedFen = boardToFEN(board);
      expect(generatedFen).toBe(originalFen);
    }
  });
});

describe('fenToGameState', () => {
  it('parses all castling rights', () => {
    const state = fenToGameState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    
    expect(state.kingMoved.white).toBe(false);
    expect(state.kingMoved.black).toBe(false);
    expect(state.rookMoved.whiteKingSide).toBe(false);
    expect(state.rookMoved.whiteQueenSide).toBe(false);
    expect(state.rookMoved.blackKingSide).toBe(false);
    expect(state.rookMoved.blackQueenSide).toBe(false);
  });

  it('parses no castling rights', () => {
    const state = fenToGameState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1');
    
    expect(state.kingMoved.white).toBe(true);
    expect(state.kingMoved.black).toBe(true);
    expect(state.rookMoved.whiteKingSide).toBe(true);
    expect(state.rookMoved.whiteQueenSide).toBe(true);
    expect(state.rookMoved.blackKingSide).toBe(true);
    expect(state.rookMoved.blackQueenSide).toBe(true);
  });

  it('parses partial castling rights (white only)', () => {
    const state = fenToGameState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1');
    
    expect(state.kingMoved.white).toBe(false);
    expect(state.kingMoved.black).toBe(true);
    expect(state.rookMoved.whiteKingSide).toBe(false);
    expect(state.rookMoved.whiteQueenSide).toBe(false);
    expect(state.rookMoved.blackKingSide).toBe(true);
    expect(state.rookMoved.blackQueenSide).toBe(true);
  });

  it('parses partial castling rights (kingside only)', () => {
    const state = fenToGameState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w Kk - 0 1');
    
    expect(state.rookMoved.whiteKingSide).toBe(false);
    expect(state.rookMoved.whiteQueenSide).toBe(true);
    expect(state.rookMoved.blackKingSide).toBe(false);
    expect(state.rookMoved.blackQueenSide).toBe(true);
  });

  it('parses en passant target (e3)', () => {
    const state = fenToGameState('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    
    expect(state.enPassantTarget).toEqual([5, 4]); // Row 5, Col 4 = e3
  });

  it('parses en passant target (d6)', () => {
    const state = fenToGameState('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3');
    
    expect(state.enPassantTarget).toEqual([2, 3]); // Row 2, Col 3 = d6
  });

  it('parses no en passant target', () => {
    const state = fenToGameState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    
    expect(state.enPassantTarget).toBeNull();
  });

  it('parses en passant on a-file', () => {
    const state = fenToGameState('rnbqkbnr/1ppppppp/8/pP6/8/8/P1PPPPPP/RNBQKBNR w KQkq a6 0 3');
    
    expect(state.enPassantTarget).toEqual([2, 0]); // Row 2, Col 0 = a6
  });

  it('parses en passant on h-file', () => {
    const state = fenToGameState('rnbqkbnr/ppppppp1/8/6Pp/8/8/PPPPPP1P/RNBQKBNR w KQkq h6 0 3');
    
    expect(state.enPassantTarget).toEqual([2, 7]); // Row 2, Col 7 = h6
  });
});
