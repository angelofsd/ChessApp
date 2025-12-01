/**
 * Chess Logic Library
 * 
 * Pure functions for chess move validation, check detection, and game state.
 * Extracted from ChessApp.tsx for testability.
 */

export type Board = string[][];
export type Color = 'white' | 'black';
export type Square = [number, number];
export type Move = [number, number] | [number, number, string | number];

export interface GameState {
  enPassantTarget: Square | null;
  kingMoved: { white: boolean; black: boolean };
  rookMoved: {
    whiteKingSide: boolean;
    whiteQueenSide: boolean;
    blackKingSide: boolean;
    blackQueenSide: boolean;
  };
}

export const INITIAL_BOARD: Board = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

export const INITIAL_GAME_STATE: GameState = {
  enPassantTarget: null,
  kingMoved: { white: false, black: false },
  rookMoved: {
    whiteKingSide: false,
    whiteQueenSide: false,
    blackKingSide: false,
    blackQueenSide: false,
  },
};

/**
 * Get the color of a piece
 */
export function getPieceColor(piece: string): Color | null {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? 'white' : 'black';
}

/**
 * Check if a square is under attack by a specific color
 */
export function isSquareUnderAttack(
  board: Board,
  row: number,
  col: number,
  byColor: Color
): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const pieceColor = getPieceColor(piece);
      if (pieceColor !== byColor) continue;

      const pieceType = piece.toLowerCase();

      // Check pawn attacks (pawns attack diagonally)
      if (pieceType === 'p') {
        const direction = pieceColor === 'white' ? -1 : 1;
        if (r + direction === row && (c - 1 === col || c + 1 === col)) {
          return true;
        }
        continue;
      }

      // Check knight attacks
      if (pieceType === 'n') {
        const knightMoves = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1],
        ];
        for (const [dr, dc] of knightMoves) {
          if (r + dr === row && c + dc === col) {
            return true;
          }
        }
        continue;
      }

      // Check king attacks (one square in any direction)
      if (pieceType === 'k') {
        const rowDiff = Math.abs(r - row);
        const colDiff = Math.abs(c - col);
        if (rowDiff <= 1 && colDiff <= 1 && rowDiff + colDiff > 0) {
          return true;
        }
        continue;
      }

      // Check sliding pieces (rook, bishop, queen)
      const isRookOrQueen = pieceType === 'r' || pieceType === 'q';
      const isBishopOrQueen = pieceType === 'b' || pieceType === 'q';

      // Rook/Queen horizontal and vertical attacks
      if (isRookOrQueen) {
        // Same row
        if (r === row) {
          const startCol = Math.min(c, col);
          const endCol = Math.max(c, col);
          let blocked = false;
          for (let checkCol = startCol + 1; checkCol < endCol; checkCol++) {
            if (board[r][checkCol]) {
              blocked = true;
              break;
            }
          }
          if (!blocked) return true;
        }

        // Same column
        if (c === col) {
          const startRow = Math.min(r, row);
          const endRow = Math.max(r, row);
          let blocked = false;
          for (let checkRow = startRow + 1; checkRow < endRow; checkRow++) {
            if (board[checkRow][c]) {
              blocked = true;
              break;
            }
          }
          if (!blocked) return true;
        }
      }

      // Bishop/Queen diagonal attacks
      if (isBishopOrQueen) {
        const rowDiff = Math.abs(r - row);
        const colDiff = Math.abs(c - col);

        if (rowDiff === colDiff && rowDiff > 0) {
          const rowDir = row > r ? 1 : -1;
          const colDir = col > c ? 1 : -1;
          let blocked = false;
          let checkRow = r + rowDir;
          let checkCol = c + colDir;

          while (checkRow !== row && checkCol !== col) {
            if (board[checkRow][checkCol]) {
              blocked = true;
              break;
            }
            checkRow += rowDir;
            checkCol += colDir;
          }

          if (!blocked) return true;
        }
      }
    }
  }

  return false;
}

/**
 * Find the position of the king of a specific color
 */
export function findKing(board: Board, color: Color): Square | null {
  const kingPiece = color === 'white' ? 'K' : 'k';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === kingPiece) {
        return [r, c];
      }
    }
  }
  return null;
}

/**
 * Check if the king of a specific color is in check
 */
export function isKingInCheck(board: Board, color: Color): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;

  const opponentColor = color === 'white' ? 'black' : 'white';
  return isSquareUnderAttack(board, kingPos[0], kingPos[1], opponentColor);
}

/**
 * Get all pseudo-legal moves for a piece (doesn't check if move leaves king in check)
 */
export function getPseudoLegalMoves(
  board: Board,
  row: number,
  col: number,
  gameState: GameState
): Move[] {
  const piece = board[row][col];
  if (!piece) return [];

  const moves: Move[] = [];
  const pieceType = piece.toLowerCase();
  const isWhite = piece === piece.toUpperCase();
  const direction = isWhite ? -1 : 1;

  // Pawn moves
  if (pieceType === 'p') {
    // Forward move
    if (board[row + direction]?.[col] === '') {
      moves.push([row + direction, col]);
      // Double move from starting position
      if ((isWhite && row === 6) || (!isWhite && row === 1)) {
        if (board[row + 2 * direction]?.[col] === '') {
          moves.push([row + 2 * direction, col]);
        }
      }
    }

    // Diagonal captures
    [-1, 1].forEach((colOffset) => {
      const targetPiece = board[row + direction]?.[col + colOffset];
      if (targetPiece) {
        const targetIsWhite = targetPiece === targetPiece.toUpperCase();
        if (isWhite !== targetIsWhite) {
          moves.push([row + direction, col + colOffset]);
        }
      }
    });

    // En passant
    if (gameState.enPassantTarget) {
      const [epRow, epCol] = gameState.enPassantTarget;
      if (epRow === row + direction && Math.abs(epCol - col) === 1) {
        moves.push([epRow, epCol, 1]); // 1 marks en passant
      }
    }
  }

  // Knight moves
  if (pieceType === 'n') {
    const knightMoves = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    knightMoves.forEach(([dr, dc]) => {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        const targetPiece = board[newRow][newCol];
        if (!targetPiece) {
          moves.push([newRow, newCol]);
        } else {
          const targetIsWhite = targetPiece === targetPiece.toUpperCase();
          if (isWhite !== targetIsWhite) moves.push([newRow, newCol]);
        }
      }
    });
  }

  // Rook and Queen (straight lines)
  if (pieceType === 'r' || pieceType === 'q') {
    [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
      for (let i = 1; i < 8; i++) {
        const newRow = row + dr * i;
        const newCol = col + dc * i;
        if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) break;
        const targetPiece = board[newRow][newCol];
        if (!targetPiece) {
          moves.push([newRow, newCol]);
        } else {
          const targetIsWhite = targetPiece === targetPiece.toUpperCase();
          if (isWhite !== targetIsWhite) moves.push([newRow, newCol]);
          break;
        }
      }
    });
  }

  // Bishop and Queen (diagonals)
  if (pieceType === 'b' || pieceType === 'q') {
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
      for (let i = 1; i < 8; i++) {
        const newRow = row + dr * i;
        const newCol = col + dc * i;
        if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) break;
        const targetPiece = board[newRow][newCol];
        if (!targetPiece) {
          moves.push([newRow, newCol]);
        } else {
          const targetIsWhite = targetPiece === targetPiece.toUpperCase();
          if (isWhite !== targetIsWhite) moves.push([newRow, newCol]);
          break;
        }
      }
    });
  }

  // King moves
  if (pieceType === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
          const targetPiece = board[newRow][newCol];
          if (!targetPiece) {
            moves.push([newRow, newCol]);
          } else {
            const targetIsWhite = targetPiece === targetPiece.toUpperCase();
            if (isWhite !== targetIsWhite) moves.push([newRow, newCol]);
          }
        }
      }
    }

    // Castling
    const opponentColor = isWhite ? 'black' : 'white';
    const kingRow = isWhite ? 7 : 0;
    const kingInCheck = isSquareUnderAttack(board, kingRow, 4, opponentColor);

    if (isWhite) {
      // White kingside castling
      if (
        !gameState.kingMoved.white &&
        !gameState.rookMoved.whiteKingSide &&
        !kingInCheck &&
        board[7][5] === '' &&
        board[7][6] === '' &&
        board[7][7] === 'R'
      ) {
        const passesThroughCheck = isSquareUnderAttack(board, 7, 5, opponentColor);
        const endsInCheck = isSquareUnderAttack(board, 7, 6, opponentColor);
        if (!passesThroughCheck && !endsInCheck) {
          moves.push([7, 6, 'castle-kingside']);
        }
      }
      // White queenside castling
      if (
        !gameState.kingMoved.white &&
        !gameState.rookMoved.whiteQueenSide &&
        !kingInCheck &&
        board[7][1] === '' &&
        board[7][2] === '' &&
        board[7][3] === '' &&
        board[7][0] === 'R'
      ) {
        const passesThroughCheck = isSquareUnderAttack(board, 7, 3, opponentColor);
        const endsInCheck = isSquareUnderAttack(board, 7, 2, opponentColor);
        if (!passesThroughCheck && !endsInCheck) {
          moves.push([7, 2, 'castle-queenside']);
        }
      }
    } else {
      // Black kingside castling
      if (
        !gameState.kingMoved.black &&
        !gameState.rookMoved.blackKingSide &&
        !kingInCheck &&
        board[0][5] === '' &&
        board[0][6] === '' &&
        board[0][7] === 'r'
      ) {
        const passesThroughCheck = isSquareUnderAttack(board, 0, 5, opponentColor);
        const endsInCheck = isSquareUnderAttack(board, 0, 6, opponentColor);
        if (!passesThroughCheck && !endsInCheck) {
          moves.push([0, 6, 'castle-kingside']);
        }
      }
      // Black queenside castling
      if (
        !gameState.kingMoved.black &&
        !gameState.rookMoved.blackQueenSide &&
        !kingInCheck &&
        board[0][1] === '' &&
        board[0][2] === '' &&
        board[0][3] === '' &&
        board[0][0] === 'r'
      ) {
        const passesThroughCheck = isSquareUnderAttack(board, 0, 3, opponentColor);
        const endsInCheck = isSquareUnderAttack(board, 0, 2, opponentColor);
        if (!passesThroughCheck && !endsInCheck) {
          moves.push([0, 2, 'castle-queenside']);
        }
      }
    }
  }

  return moves;
}

/**
 * Simulate a move on the board and return the new board state
 */
export function simulateMove(
  board: Board,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  special?: string | number
): Board {
  const newBoard = board.map((r) => [...r]);
  const piece = newBoard[fromRow][fromCol];

  // Handle castling
  if (typeof special === 'string' && special.includes('castle')) {
    if (special === 'castle-kingside') {
      newBoard[toRow][toCol] = piece;
      newBoard[fromRow][fromCol] = '';
      newBoard[toRow][5] = newBoard[toRow][7];
      newBoard[toRow][7] = '';
    } else if (special === 'castle-queenside') {
      newBoard[toRow][toCol] = piece;
      newBoard[fromRow][fromCol] = '';
      newBoard[toRow][3] = newBoard[toRow][0];
      newBoard[toRow][0] = '';
    }
  }
  // Handle en passant
  else if (special === 1) {
    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = '';
    // Remove the captured pawn
    newBoard[fromRow][toCol] = '';
  }
  // Normal move
  else {
    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = '';
  }

  return newBoard;
}

/**
 * Get all legal moves for a piece (filters out moves that leave king in check)
 */
export function getLegalMoves(
  board: Board,
  row: number,
  col: number,
  gameState: GameState
): Move[] {
  const piece = board[row][col];
  if (!piece) return [];

  const pieceColor = getPieceColor(piece);
  if (!pieceColor) return [];

  const pseudoLegalMoves = getPseudoLegalMoves(board, row, col, gameState);

  return pseudoLegalMoves.filter((move) => {
    const [toRow, toCol, special] = move as [number, number, string | number | undefined];
    const newBoard = simulateMove(board, row, col, toRow, toCol, special);
    return !isKingInCheck(newBoard, pieceColor);
  });
}

/**
 * Check if a player has any legal moves
 */
export function hasLegalMoves(
  board: Board,
  color: Color,
  gameState: GameState
): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      const pieceColor = getPieceColor(piece);
      if (pieceColor !== color) continue;

      const legalMoves = getLegalMoves(board, row, col, gameState);
      if (legalMoves.length > 0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check for checkmate: king in check AND no legal moves
 */
export function isCheckmate(
  board: Board,
  color: Color,
  gameState: GameState
): boolean {
  return isKingInCheck(board, color) && !hasLegalMoves(board, color, gameState);
}

/**
 * Check for stalemate: king NOT in check BUT no legal moves
 */
export function isStalemate(
  board: Board,
  color: Color,
  gameState: GameState
): boolean {
  return !isKingInCheck(board, color) && !hasLegalMoves(board, color, gameState);
}

/**
 * Parse a FEN string to a board position
 */
export function fenToBoard(fen: string): Board {
  const [position] = fen.split(' ');
  const rows = position.split('/');
  const board: Board = [];

  for (const row of rows) {
    const boardRow: string[] = [];
    for (const char of row) {
      if (char >= '1' && char <= '8') {
        // Empty squares
        for (let i = 0; i < parseInt(char); i++) {
          boardRow.push('');
        }
      } else {
        boardRow.push(char);
      }
    }
    board.push(boardRow);
  }

  return board;
}

/**
 * Parse FEN string to get game state
 */
export function fenToGameState(fen: string): GameState {
  const parts = fen.split(' ');
  const castling = parts[2] || '-';
  const enPassant = parts[3] || '-';

  const gameState: GameState = {
    enPassantTarget: null,
    kingMoved: { white: !castling.includes('K') && !castling.includes('Q'), black: !castling.includes('k') && !castling.includes('q') },
    rookMoved: {
      whiteKingSide: !castling.includes('K'),
      whiteQueenSide: !castling.includes('Q'),
      blackKingSide: !castling.includes('k'),
      blackQueenSide: !castling.includes('q'),
    },
  };

  if (enPassant !== '-') {
    const col = enPassant.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(enPassant[1]);
    gameState.enPassantTarget = [row, col];
  }

  return gameState;
}

/**
 * Convert a board to FEN position string (just the piece placement part)
 */
export function boardToFEN(board: Board): string {
  const rows: string[] = [];

  for (const row of board) {
    let fenRow = '';
    let emptyCount = 0;

    for (const piece of row) {
      if (piece === '') {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          fenRow += emptyCount;
          emptyCount = 0;
        }
        fenRow += piece;
      }
    }

    if (emptyCount > 0) {
      fenRow += emptyCount;
    }

    rows.push(fenRow);
  }

  return rows.join('/');
}
