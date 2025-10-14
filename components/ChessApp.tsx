"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Cpu, Database, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Board = string[][];

// Using SVG chess pieces from Wikipedia Commons (public domain)
const PIECE_IMAGES: Record<string, string> = {
  K: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  Q: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  R: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  B: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  N: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
  P: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
  k: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
  q: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
  r: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  b: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  n: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
  p: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg'
};

const PIECES: Record<string, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟︎'
};

const INITIAL_BOARD: Board = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

export default function ChessApp() {
  const [board, setBoard] = useState<Board>(INITIAL_BOARD);
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<Array<Array<number | string>>>([]);
  const [currentPlayer, setCurrentPlayer] = useState<'white' | 'black'>('white');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState<'human' | 'ai' | 'trainer'>('human');
  const [stockfishReady, setStockfishReady] = useState(false);
  const [moveEvaluations, setMoveEvaluations] = useState<Record<string, number>>({});
  const [bestMoveEval, setBestMoveEval] = useState<number | null>(null); // Store the absolute best move evaluation
  const [topMoves, setTopMoves] = useState<Array<{move: string, eval: number}>>([]);
  const [showMoveHints, setShowMoveHints] = useState(true);
  const [showTopMoves, setShowTopMoves] = useState(true);
  const [openingInfo, setOpeningInfo] = useState<any>(null);
  const [loadingOpening, setLoadingOpening] = useState(false);
  const [kingMoved, setKingMoved] = useState({ white: false, black: false });
  const [rookMoved, setRookMoved] = useState({
    whiteKingSide: false,
    whiteQueenSide: false,
    blackKingSide: false,
    blackQueenSide: false
  });
  const stockfishRef = useRef<any>(null);
  const analyzingSelectedPiece = useRef<boolean>(false);
  const analysisInProgress = useRef<boolean>(false);

  // Convert UCI notation (e2e4) to algebraic notation (e4, Nf3, etc.)
  const uciToAlgebraic = (uciMove: string): string => {
    const fromSquare = uciMove.substring(0, 2);
    const toSquare = uciMove.substring(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4].toUpperCase() : '';
    
    const fromCol = fromSquare[0];
    const fromRow = fromSquare[1];
    const toCol = toSquare[0];
    const toRow = toSquare[1];
    
    // Get piece at source square
    const rowIndex = 8 - parseInt(fromRow);
    const colIndex = fromCol.charCodeAt(0) - 'a'.charCodeAt(0);
    const piece = board[rowIndex]?.[colIndex] || '';
    const isCapture = board[8 - parseInt(toRow)]?.[toCol.charCodeAt(0) - 'a'.charCodeAt(0)] !== '';
    
    // Pawns
    if (piece.toUpperCase() === 'P') {
      if (isCapture) {
        return `${fromCol}x${toSquare}${promotion ? '=' + promotion : ''}`;
      }
      return `${toSquare}${promotion ? '=' + promotion : ''}`;
    }
    
    // Other pieces
    const pieceSymbol = piece.toUpperCase();
    const captureSymbol = isCapture ? 'x' : '';
    
    // Check if we need disambiguation (multiple pieces of same type can move to same square)
    // For now, simplified version without full disambiguation
    return `${pieceSymbol}${captureSymbol}${toSquare}`;
  };

  // Parse Stockfish evaluation output
  const parseStockfishEval = (message: string) => {
    // Example: info depth 20 multipv 1 score cp 25 pv e2e4 e7e5
    const multipvMatch = message.match(/multipv (\d+)/);
    const scoreMatch = message.match(/score cp (-?\d+)/);
    // Changed regex: Use word boundary \b to ensure we match after "pv " not after "multipv "
    const pvMatch = message.match(/\bpv\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
    
    if (multipvMatch && scoreMatch && pvMatch) {
      const pvIndex = parseInt(multipvMatch[1]);
      const centipawns = parseInt(scoreMatch[1]);
      const move = pvMatch[1];
      
      // Adjust score for Black's perspective (Stockfish always reports from White's perspective)
      const adjustedScore = currentPlayer === 'black' ? -centipawns : centipawns;
      
      console.log(`📊 Parsed move ${pvIndex}: ${move} (${adjustedScore} cp)`);
      
      // If this is the first move (best move), store its evaluation globally
      if (pvIndex === 1) {
        setBestMoveEval(adjustedScore);
        console.log(`🏆 Best move in position: ${move} with eval ${adjustedScore}`);
      }
      
      // Update top moves list with raw evaluations
      setTopMoves(prev => {
        const updated = [...prev];
        updated[pvIndex - 1] = { move, eval: adjustedScore };
        const filtered = updated.filter(m => m !== undefined);
        
        // Calculate centipawn loss from best move (multipv 1)
        if (filtered.length > 0) {
          const bestEval = filtered[0].eval;
          
          // Store centipawn loss for each move (for color coding)
          const evaluations: Record<string, number> = {};
          filtered.forEach(m => {
            // Loss is how much worse the move is (positive = worse, negative = better which shouldn't happen)
            const loss = bestEval - m.eval;
            evaluations[m.move] = loss;
          });
          
          setMoveEvaluations(evaluations);
          console.log('📋 Centipawn losses:', evaluations);
        }
        
        return filtered;
      });
    }
  };

  // Track the best move eval within the current analysis batch
  const currentBestRef = useRef<number | null>(null);

  // Parse evaluations for selected piece moves (compare to global best move)
  const parseSelectedPieceEval = (message: string) => {
    const multipvMatch = message.match(/multipv (\d+)/);
    const scoreMatch = message.match(/score cp (-?\d+)/);
    const pvMatch = message.match(/\bpv\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
    
    console.log('🔍 Regex matches:', { multipv: multipvMatch?.[1], score: scoreMatch?.[1], pv: pvMatch?.[1], bestMoveEval });
    
    if (multipvMatch && scoreMatch && pvMatch) {
      const pvIndex = parseInt(multipvMatch[1]);
      const centipawns = parseInt(scoreMatch[1]);
      const move = pvMatch[1];
      
      // Adjust score for Black's perspective
      const adjustedScore = currentPlayer === 'black' ? -centipawns : centipawns;
      
      // IMPORTANT: Always use the GLOBAL best move (from general analysis)
      // We should never get here if bestMoveEval is null (see evaluateSelectedPieceMoves check)
      if (bestMoveEval === null) {
        console.warn('⚠️ No global best move available - skipping evaluation');
        return;
      }
      
      const cpLoss = bestMoveEval - adjustedScore;
      
      console.log(`🎯 Move ${move}: eval ${adjustedScore}, GLOBAL best ${bestMoveEval}, loss ${cpLoss} cp`);
      
      // Store centipawn loss for this move
      setMoveEvaluations(prev => ({
        ...prev,
        [move]: cpLoss
      }));
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Worker) {
      try {
        // Initialize Stockfish WebWorker - load the engine directly
        const worker = new Worker('/stockfish.js');
        stockfishRef.current = worker;
        
        worker.onmessage = (e) => {
          const message = e.data;
          console.log('Stockfish:', message);
          
          // Check if engine is ready
          if (message === 'uciok') {
            setStockfishReady(true);
            console.log('✅ Stockfish engine ready!');
          }
          
          // Check if analysis is complete
          if (message.startsWith && message.startsWith('bestmove')) {
            analysisInProgress.current = false;
            console.log('✅ Analysis complete');
          }
          
          // Parse multi-pv lines for move evaluations
          if (message.startsWith && message.startsWith('info') && message.includes('multipv')) {
            // Use different parser depending on whether we're analyzing selected piece or whole position
            if (analyzingSelectedPiece.current) {
              console.log('🔧 Parsing piece-specific eval:', message.substring(0, 100));
              parseSelectedPieceEval(message);
            } else {
              parseStockfishEval(message);
            }
          }
        };
        
        worker.onerror = (error) => {
          console.error('Stockfish worker error:', error);
        };
        
        // Initialize engine
        worker.postMessage('uci');
        worker.postMessage('setoption name MultiPV value 20'); // Analyze top 20 moves to cover most pieces
        worker.postMessage('ucinewgame');
        
      } catch (error) {
        console.error('Failed to load Stockfish:', error);
      }
    }
    
    return () => {
      if (stockfishRef.current) {
        stockfishRef.current.terminate();
      }
    };
  }, []);

  // Evaluate all legal moves in trainer mode (only when no piece is selected)
  useEffect(() => {
    if (gameMode === 'trainer' && stockfishReady && !selectedSquare) {
      evaluateAllMoves();
    }
  }, [board, currentPlayer, gameMode, stockfishReady, selectedSquare]);

  // When piece is selected, use evaluations from general analysis
  // (Don't do piece-specific analysis since getValidMovesForBoard doesn't check for check/pins)
  useEffect(() => {
    if (gameMode === 'trainer' && stockfishReady && selectedSquare && topMoves.length > 0) {
      // Color code the valid moves based on topMoves from general analysis
      const files = 'abcdefgh';
      const fromRow = selectedSquare[0];
      const fromCol = selectedSquare[1];
      const fromSquareUCI = `${files[fromCol]}${8-fromRow}`;
      
      // Filter topMoves to only those starting from this square
      const newEvals: Record<string, number> = {};
      const bestEval = topMoves[0]?.eval || 0;
      
      topMoves.forEach(move => {
        if (move.move.startsWith(fromSquareUCI)) {
          const cpLoss = bestEval - move.eval;
          newEvals[move.move] = cpLoss;
        }
      });
      
      setMoveEvaluations(newEvals);
      console.log(`🎨 Color-coding ${Object.keys(newEvals).length} moves from ${fromSquareUCI}:`, newEvals);
    }
  }, [selectedSquare, topMoves, gameMode, stockfishReady]);

  const evaluateSelectedPieceMoves = async () => {
    // CRITICAL: Wait for general analysis to complete first
    if (!stockfishRef.current || !selectedSquare) return;
    
    // If we don't have the global best move yet, wait for general analysis
    if (bestMoveEval === null) {
      console.log('⏳ Waiting for general analysis to complete before analyzing piece moves...');
      return;
    }
    
    const files = 'abcdefgh';
    const fromRow = selectedSquare[0];
    const fromCol = selectedSquare[1];
    
    // Filter to only ACTUAL legal moves (validMoves should already be filtered)
    const legalMoves = validMoves.filter(move => 
      Array.isArray(move) && move.length >= 2 && 
      typeof move[0] === 'number' && typeof move[1] === 'number'
    );
    
    if (legalMoves.length === 0 || legalMoves.length > 25) {
      console.log(`⚠️ Skipping analysis: ${legalMoves.length} moves`);
      return;
    }
    
    // Set flag to use the selected piece parser
    analyzingSelectedPiece.current = true;
    
    // STOP any current analysis first
    stockfishRef.current.postMessage('stop');
    
    // Wait a bit for stop to process
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Set MultiPV to the number of legal moves for this piece
    const numMoves = legalMoves.length;
    stockfishRef.current.postMessage(`setoption name MultiPV value ${numMoves}`);
    
    // Build a search moves string with all legal moves for this piece
    const movesStr = legalMoves
      .map(move => `${files[fromCol]}${8-fromRow}${files[move[1] as number]}${8-(move[0] as number)}`)
      .join(' ');
    
    console.log(`🔍 Analyzing ${numMoves} legal moves for selected piece:`, movesStr);
    console.log(`📌 Using global best move eval: ${bestMoveEval} cp`);
    
    // Send position and analyze only these specific moves with lower depth
    const fen = boardToFEN();
    stockfishRef.current.postMessage(`position fen ${fen}`);
    stockfishRef.current.postMessage(`go depth 12 searchmoves ${movesStr}`);
  };

  const evaluateAllMoves = async () => {
    if (!stockfishRef.current) return;
    
    // Stop any current analysis first
    stockfishRef.current.postMessage('stop');
    
    // Clear previous evaluations
    setMoveEvaluations({});
    setTopMoves([]);
    setBestMoveEval(null);
    
    // Set flag to use the general position parser
    analyzingSelectedPiece.current = false;
    
    // Analyze top 20 moves for general position evaluation
    stockfishRef.current.postMessage('setoption name MultiPV value 20');
    
    // Send current position to Stockfish
    const fen = boardToFEN();
    stockfishRef.current.postMessage(`position fen ${fen}`);
    stockfishRef.current.postMessage('go depth 15');
    
    console.log('🌍 Starting general position analysis (MultiPV=20, depth 15)');
  };

  const boardToFEN = () => {
    let fen = '';
    for (let row of board) {
      let emptyCount = 0;
      for (let piece of row) {
        if (piece === '') {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          fen += piece;
        }
      }
      if (emptyCount > 0) fen += emptyCount;
      fen += '/';
    }
    fen = fen.slice(0, -1);
    fen += ` ${currentPlayer === 'white' ? 'w' : 'b'} KQkq - 0 1`;
    return fen;
  };

  const fetchOpeningInfo = async (moves: string[]) => {
    if (moves.length === 0) return;
    setLoadingOpening(true);
    try {
      // Lichess API expects play parameter with comma-separated moves
      const moveString = moves.join(',');
      const url = `https://explorer.lichess.ovh/lichess?variant=standard&speeds=blitz,rapid,classical&ratings=2000,2200,2500&play=${encodeURIComponent(moveString)}`;
      
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setOpeningInfo(data);
    } catch (error) {
      console.warn('Failed to fetch opening data (this is optional):', error);
      // Don't set error state, just silently fail since this is non-critical
      setOpeningInfo(null);
    } finally {
      setLoadingOpening(false);
    }
  };

  const getStockfishMove = () => {
    if (!stockfishRef.current) return;
    const fen = boardToFEN();
    stockfishRef.current.postMessage(`position fen ${fen}`);
    stockfishRef.current.postMessage('go depth 10');
    setTimeout(() => {
      makeRandomMove();
    }, 1000);
  };

  const makeRandomMove = () => {
    setBoard(currentBoard => {
      const allMoves: { from: [number, number]; to: number[] }[] = [];
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = currentBoard[row][col];
          if (piece && piece === piece.toLowerCase() && piece !== '') {
            const moves = getValidMovesForBoard(currentBoard, row, col);
            moves.forEach(move => {
              allMoves.push({ from: [row, col], to: move });
            });
          }
        }
      }

      if (allMoves.length > 0) {
        const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
        const newBoard = currentBoard.map(r => [...r]);
        const piece = newBoard[randomMove.from[0]][randomMove.from[1]];
        newBoard[randomMove.to[0]][randomMove.to[1]] = piece;
        newBoard[randomMove.from[0]][randomMove.from[1]] = '';

        const files = 'abcdefgh';
        const move = `${files[randomMove.from[1]]}${8 - randomMove.from[0]}${files[randomMove.to[1]]}${8 - randomMove.to[0]}`;
        setMoveHistory(prev => {
          const newHistory = [...prev, move];
          fetchOpeningInfo(newHistory);
          return newHistory;
        });

        setCurrentPlayer('white');
        return newBoard;
      }

      return currentBoard;
    });
  };

  const isCurrentPlayerPiece = (piece: string) => {
    if (!piece) return false;
    if (currentPlayer === 'white') return piece === piece.toUpperCase();
    return piece === piece.toLowerCase();
  };

  const getValidMovesForBoard = (boardState: Board, row: number, col: number) => {
    const piece = boardState[row][col];
    if (!piece) return [] as number[][];

    const moves: Array<number[]> = [];
    const pieceType = piece.toLowerCase();
    const isWhite = piece === piece.toUpperCase();
    const direction = isWhite ? -1 : 1;

    if (pieceType === 'p') {
      if (boardState[row + direction]?.[col] === '') {
        moves.push([row + direction, col]);
        if ((isWhite && row === 6) || (!isWhite && row === 1)) {
          if (boardState[row + 2 * direction]?.[col] === '') {
            moves.push([row + 2 * direction, col]);
          }
        }
      }
      [-1, 1].forEach(colOffset => {
        const targetPiece = boardState[row + direction]?.[col + colOffset];
        if (targetPiece) {
          const targetIsWhite = targetPiece === targetPiece.toUpperCase();
          if (isWhite !== targetIsWhite) {
            moves.push([row + direction, col + colOffset]);
          }
        }
      });
    }

    if (pieceType === 'n') {
      const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      knightMoves.forEach(([dr, dc]) => {
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
          const targetPiece = boardState[newRow][newCol];
          if (!targetPiece) {
            moves.push([newRow, newCol]);
          } else {
            const targetIsWhite = targetPiece === targetPiece.toUpperCase();
            if (isWhite !== targetIsWhite) moves.push([newRow, newCol]);
          }
        }
      });
    }

    if (pieceType === 'r' || pieceType === 'q') {
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
        for (let i = 1; i < 8; i++) {
          const newRow = row + dr * i;
          const newCol = col + dc * i;
          if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) break;
          const targetPiece = boardState[newRow][newCol];
          if (!targetPiece) moves.push([newRow, newCol]);
          else {
            const targetIsWhite = targetPiece === targetPiece.toUpperCase();
            if (isWhite !== targetIsWhite) moves.push([newRow, newCol]);
            break;
          }
        }
      });
    }

    if (pieceType === 'b' || pieceType === 'q') {
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
        for (let i = 1; i < 8; i++) {
          const newRow = row + dr * i;
          const newCol = col + dc * i;
          if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) break;
          const targetPiece = boardState[newRow][newCol];
          if (!targetPiece) moves.push([newRow, newCol]);
          else {
            const targetIsWhite = targetPiece === targetPiece.toUpperCase();
            if (isWhite !== targetIsWhite) moves.push([newRow, newCol]);
            break;
          }
        }
      });
    }

    if (pieceType === 'k') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const newRow = row + dr;
          const newCol = col + dc;
          if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const targetPiece = boardState[newRow][newCol];
            if (!targetPiece) moves.push([newRow, newCol]);
            else {
              const targetIsWhite = targetPiece === targetPiece.toUpperCase();
              if (isWhite !== targetIsWhite) moves.push([newRow, newCol]);
            }
          }
        }
      }

      // Castling (basic checks similar to original)
      if (isWhite) {
        if (!kingMoved.white && !rookMoved.whiteKingSide) {
          if (boardState[7][5] === '' && boardState[7][6] === '' && boardState[7][7] === 'R') moves.push([7, 6]);
        }
        if (!kingMoved.white && !rookMoved.whiteQueenSide) {
          if (boardState[7][1] === '' && boardState[7][2] === '' && boardState[7][3] === '' && boardState[7][0] === 'R') moves.push([7, 2]);
        }
      } else {
        if (!kingMoved.black && !rookMoved.blackKingSide) {
          if (boardState[0][5] === '' && boardState[0][6] === '' && boardState[0][7] === 'r') moves.push([0, 6]);
        }
        if (!kingMoved.black && !rookMoved.blackQueenSide) {
          if (boardState[0][1] === '' && boardState[0][2] === '' && boardState[0][3] === '' && boardState[0][0] === 'r') moves.push([0, 2]);
        }
      }
    }

    return moves;
  };

  const getValidMoves = (row: number, col: number) => getValidMovesForBoard(board, row, col);

  // Get color intensity for move quality (trainer mode)
  const getMoveQualityColor = (fromRow: number, fromCol: number, toRow: number, toCol: number): string => {
    if (gameMode !== 'trainer' || !showMoveHints) return '';
    
    const files = 'abcdefgh';
    const moveStr = `${files[fromCol]}${8-fromRow}${files[toCol]}${8-toRow}`;
    const cpLoss = moveEvaluations[moveStr];
    
    // If move not analyzed by Stockfish, don't show any border (keeps board clean)
    if (cpLoss === undefined) return '';
    
    // Color coding based on centipawn loss (thicker borders, more distinct colors)
    if (cpLoss === 0) return 'ring-[6px] ring-green-600'; // Best move - dark green
    if (cpLoss < 25) return 'ring-[6px] ring-emerald-400'; // Excellent - bright emerald
    if (cpLoss < 50) return 'ring-[6px] ring-lime-400'; // Good
    if (cpLoss < 100) return 'ring-[6px] ring-yellow-400'; // Okay
    if (cpLoss < 200) return 'ring-[6px] ring-orange-400'; // Dubious
    return 'ring-[6px] ring-red-400'; // Bad (200+ centipawns worse)
  };

  const handleSquareClick = (row: number, col: number) => {
    if (gameMode === 'ai' && currentPlayer === 'black') return;
    const piece = board[row][col];

    if (selectedSquare && validMoves.some(move => move[0] === row && move[1] === col)) {
      const move = validMoves.find(m => m[0] === row && m[1] === col)!;
      movePiece(selectedSquare[0], selectedSquare[1], row, col, (move as any)[2]);
      setSelectedSquare(null);
      setValidMoves([]);
      analyzingSelectedPiece.current = false; // Reset flag
      return;
    }

    if (piece && isCurrentPlayerPiece(piece)) {
      const moves = getValidMoves(row, col);
      console.log(`🔎 Selected ${piece} at [${row},${col}], found ${moves.length} legal moves:`, moves);
      setSelectedSquare([row, col]);
      setValidMoves(moves);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
      analyzingSelectedPiece.current = false; // Reset flag when deselecting
    }
  };

  const movePiece = (fromRow: number, fromCol: number, toRow: number, toCol: number, castleType?: string) => {
    const newBoard = board.map(r => [...r]);
    const piece = newBoard[fromRow][fromCol];

    if (castleType === 'castle-kingside') {
      newBoard[toRow][toCol] = piece;
      newBoard[fromRow][fromCol] = '';
      newBoard[toRow][5] = newBoard[toRow][7];
      newBoard[toRow][7] = '';
    } else if (castleType === 'castle-queenside') {
      newBoard[toRow][toCol] = piece;
      newBoard[fromRow][fromCol] = '';
      newBoard[toRow][3] = newBoard[toRow][0];
      newBoard[toRow][0] = '';
    } else {
      newBoard[toRow][toCol] = piece;
      newBoard[fromRow][fromCol] = '';
    }

    setBoard(newBoard);

    const pieceType = piece.toLowerCase();
    const isWhite = piece === piece.toUpperCase();

    if (pieceType === 'k') {
      if (isWhite) setKingMoved(prev => ({ ...prev, white: true }));
      else setKingMoved(prev => ({ ...prev, black: true }));
    }

    if (pieceType === 'r') {
      if (isWhite) {
        if (fromRow === 7 && fromCol === 0) setRookMoved(prev => ({ ...prev, whiteQueenSide: true }));
        else if (fromRow === 7 && fromCol === 7) setRookMoved(prev => ({ ...prev, whiteKingSide: true }));
      } else {
        if (fromRow === 0 && fromCol === 0) setRookMoved(prev => ({ ...prev, blackQueenSide: true }));
        else if (fromRow === 0 && fromCol === 7) setRookMoved(prev => ({ ...prev, blackKingSide: true }));
      }
    }

    const files = 'abcdefgh';
    const move = `${files[fromCol]}${8 - fromRow}${files[toCol]}${8 - toRow}`;
    const newHistory = [...moveHistory, move];
    setMoveHistory(newHistory);

    const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
    setCurrentPlayer(nextPlayer);

    // Fetch opening info (non-blocking, optional)
    fetchOpeningInfo(newHistory).catch(err => {
      console.warn('Opening info fetch failed, continuing game:', err);
    });

    if (gameMode === 'ai' && nextPlayer === 'black') setTimeout(getStockfishMove, 500);
  };

  const resetGame = () => {
    setBoard(INITIAL_BOARD);
    setSelectedSquare(null);
    setValidMoves([]);
    setCurrentPlayer('white');
    setMoveHistory([]);
    setOpeningInfo(null);
    setKingMoved({ white: false, black: false });
    setRookMoved({ whiteKingSide: false, whiteQueenSide: false, blackKingSide: false, blackQueenSide: false });
  };

  const undoMove = () => {
    if (moveHistory.length === 0) return;
    resetGame();
  };

  // Example DB save using Supabase
  const saveGame = async () => {
    try {
      const { data, error } = await supabase.from('games').insert([{ moves: moveHistory }]);
      if (error) throw error;
      console.log('Saved game', data);
    } catch (err) {
      console.error('Failed to save game', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Chess App with Stockfish & Lichess API</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setGameMode('human')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      gameMode === 'human'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    vs Human
                  </button>
                  <button
                    onClick={() => {
                      setGameMode('ai');
                      if (currentPlayer === 'black') {
                        resetGame();
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                      gameMode === 'ai'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <Cpu size={16} />
                    vs AI
                  </button>
                  <button
                    onClick={() => {
                      setGameMode('trainer');
                      resetGame();
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                      gameMode === 'trainer'
                        ? 'bg-green-500 text-white'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <Info size={16} />
                    Move Trainer
                  </button>
                </div>
                <div className="flex gap-2">
                  {gameMode === 'trainer' && (
                    <>
                      <button
                        onClick={() => setShowMoveHints(!showMoveHints)}
                        className={`px-3 py-2 rounded-lg font-medium transition text-sm ${
                          showMoveHints
                            ? 'bg-green-600 text-white'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                        title="Toggle move hints"
                      >
                        {showMoveHints ? '👁️ Hints On' : '👁️ Hints Off'}
                      </button>
                      <button
                        onClick={() => setShowTopMoves(!showTopMoves)}
                        className={`px-3 py-2 rounded-lg font-medium transition text-sm ${
                          showTopMoves
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                        title="Toggle top moves display"
                      >
                        {showTopMoves ? '📊 Top 3' : '📊 Top 3'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={undoMove}
                    className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition"
                    title="Undo"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={resetGame}
                    className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition"
                    title="Reset"
                  >
                    <RotateCcw size={20} />
                  </button>
                </div>
              </div>

              <div className="aspect-square bg-amber-100 rounded-lg shadow-inner">
                <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
                  {board.map((row, rowIndex) => (
                    row.map((piece, colIndex) => {
                      const isLight = (rowIndex + colIndex) % 2 === 0;
                      const isSelected = selectedSquare?.[0] === rowIndex && selectedSquare?.[1] === colIndex;
                      const isValidMove = validMoves.some(move => move[0] === rowIndex && move[1] === colIndex);
                      const moveQuality = selectedSquare ? getMoveQualityColor(selectedSquare[0], selectedSquare[1], rowIndex, colIndex) : '';
                      
                      // In trainer mode with hints: show quality colors or red for non-top-20
                      // In other modes: simple white rings
                      const validMoveRing = gameMode === 'trainer' && moveQuality === '' 
                        ? 'ring-[6px] ring-inset ring-red-400' 
                        : 'ring-4 ring-inset ring-white';

                      return (
                        <div key={`${rowIndex}-${colIndex}`} onClick={() => handleSquareClick(rowIndex, colIndex)} className={`flex items-center justify-center cursor-pointer transition-all select-none relative ${isLight ? 'bg-amber-200' : 'bg-amber-700'} ${isSelected ? 'ring-4 ring-inset ring-blue-400' : ''} ${isValidMove && !moveQuality ? validMoveRing : ''} ${moveQuality ? `ring-inset ${moveQuality}` : ''} hover:brightness-110`}>
                          {piece && (
                            <img 
                              src={PIECE_IMAGES[piece]} 
                              alt={PIECES[piece]}
                              className="pointer-events-none w-[70%] h-[70%] object-contain"
                              draggable={false}
                            />
                          )}
                        </div>
                      );
                    })
                  ))}
                </div>
              </div>

              <div className="mt-4 text-white text-center">
                <p className="text-lg font-semibold">
                  Current Turn: {currentPlayer === 'white' ? '⚪ White' : '⚫ Black'}
                </p>
                {stockfishReady && gameMode === 'ai' && (<p className="text-sm text-green-400 mt-1"><Cpu className="inline mr-1" size={14} />Stockfish Engine Ready</p>)}
                {gameMode === 'trainer' && (
                  <div className="mt-3 text-sm">
                    <p className="font-semibold mb-2 text-base">Move Quality Legend:</p>
                    <div className="flex justify-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1.5 text-sm">
                        <div className="w-5 h-5 rounded ring-[3px] ring-green-600 bg-white"></div>
                        Best
                      </span>
                      <span className="flex items-center gap-1.5 text-sm">
                        <div className="w-5 h-5 rounded ring-[3px] ring-emerald-400 bg-white"></div>
                        Excellent
                      </span>
                      <span className="flex items-center gap-1.5 text-sm">
                        <div className="w-5 h-5 rounded ring-[3px] ring-lime-400 bg-white"></div>
                        Good
                      </span>
                      <span className="flex items-center gap-1.5 text-sm">
                        <div className="w-5 h-5 rounded ring-[3px] ring-yellow-400 bg-white"></div>
                        Okay
                      </span>
                      <span className="flex items-center gap-1.5 text-sm">
                        <div className="w-5 h-5 rounded ring-[3px] ring-orange-400 bg-white"></div>
                        Dubious
                      </span>
                      <span className="flex items-center gap-1.5 text-sm">
                        <div className="w-5 h-5 rounded ring-[3px] ring-red-400 bg-white"></div>
                        Bad
                      </span>
                    </div>
                    {showTopMoves && topMoves.length > 0 && (
                      <div className="mt-4 bg-black/30 rounded-lg p-3">
                        <p className="font-semibold mb-2">Top 3 Moves (Stockfish):</p>
                        <div className="space-y-1 text-xs">
                          {topMoves.slice(0, 3).map((move, idx) => {
                            const cpLoss = idx === 0 ? 0 : Math.abs(topMoves[0].eval - move.eval);
                            return (
                              <div key={idx} className="flex justify-between items-center">
                                <span className="font-mono">{idx + 1}. {uciToAlgebraic(move.move)}</span>
                                <span className={`px-2 py-0.5 rounded ${
                                  cpLoss === 0 ? 'bg-green-600/30 text-green-300' :
                                  cpLoss < 25 ? 'bg-emerald-500/30 text-emerald-300' :
                                  cpLoss < 50 ? 'bg-lime-500/30 text-lime-300' :
                                  cpLoss < 100 ? 'bg-yellow-500/30 text-yellow-300' :
                                  cpLoss < 200 ? 'bg-orange-500/30 text-orange-300' :
                                  'bg-red-500/30 text-red-300'
                                }`}>
                                  {idx === 0 ? `${move.eval > 0 ? '+' : ''}${(move.eval / 100).toFixed(2)}` : `-${(cpLoss / 100).toFixed(2)}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><ChevronRight size={20} />Move History</h2>
              <div className="bg-black/30 rounded-lg p-4 max-h-48 overflow-y-auto">
                {moveHistory.length === 0 ? (<p className="text-gray-400 text-sm">No moves yet</p>) : (
                  <div className="grid grid-cols-2 gap-2 text-white text-sm font-mono">
                    {moveHistory.map((move, i) => (
                      <div key={i} className="flex gap-2">{i % 2 === 0 && <span className="text-gray-400">{Math.floor(i / 2) + 1}.</span>}<span>{move}</span></div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Database size={20} />Opening Explorer</h2>
              {loadingOpening ? (<p className="text-gray-400 text-sm">Loading opening data...</p>) : openingInfo ? (
                <div className="bg-black/30 rounded-lg p-4 text-white text-sm space-y-2">
                  <p><strong>Opening:</strong> {openingInfo.opening?.name || 'Unknown'}</p>
                  <p><strong>Games:</strong> {openingInfo.white + openingInfo.draws + openingInfo.black}</p>
                  <div className="flex gap-4 text-xs"><span>⚪ {openingInfo.white}</span><span>🤝 {openingInfo.draws}</span><span>⚫ {openingInfo.black}</span></div>
                  {openingInfo.moves?.length > 0 && (<div className="mt-3"><p className="font-semibold mb-1">Popular moves:</p>{openingInfo.moves.slice(0, 3).map((move: any, i: number) => (<div key={i} className="text-xs text-gray-300">{move.san} ({move.white + move.draws + move.black} games)</div>))}</div>)}
                </div>
              ) : (
                <p className="text-gray-400 text-sm flex items-center gap-2"><Info size={14} />Make moves to see opening data</p>
              )}

              <div className="mt-4 flex gap-2">
                <button onClick={saveGame} className="px-3 py-2 bg-blue-600 text-white rounded">Save game</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
