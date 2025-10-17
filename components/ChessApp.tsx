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
  const [gameResult, setGameResult] = useState<string | null>(null); // '1-0', '0-1', '1/2-1/2', or null
  const [gameMode, setGameMode] = useState<'human' | 'ai' | 'trainer'>('human');
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [aiThinking, setAiThinking] = useState(false);
  const [stockfishReady, setStockfishReady] = useState(false);
  
  // Initialize refs with current state to avoid closure issues in setTimeout callbacks
  const gameModeRef = useRef<'human' | 'ai' | 'trainer'>(gameMode);
  const currentPlayerRef = useRef<'white' | 'black'>(currentPlayer);
  const boardRef = useRef<Board>(board);
  const [moveEvaluations, setMoveEvaluations] = useState<Record<string, number>>({});
  const [bestMoveEval, setBestMoveEval] = useState<number | null>(null); // Store the absolute best move evaluation
  const [currentEvaluation, setCurrentEvaluation] = useState<number>(0); // Current position evaluation in centipawns
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
  // En passant: track if a pawn just moved two squares (stores target square for capture)
  const [enPassantTarget, setEnPassantTarget] = useState<[number, number] | null>(null);
  const stockfishRef = useRef<any>(null);
  const analyzingSelectedPiece = useRef<boolean>(false);
  const analysisInProgress = useRef<boolean>(false);
  const aiMoveCandidates = useRef<Array<{move: string, eval: number}>>([]);
  const waitingForAIMove = useRef<boolean>(false);

  // Convert UCI notation (e2e4) to algebraic notation (e4, Nf3, etc.)
  // Convert UCI move to algebraic notation with board state
  const uciToAlgebraicWithBoard = (uciMove: string, boardState: Board, nextPlayer: 'white' | 'black'): string => {
    const fromSquare = uciMove.substring(0, 2);
    const toSquare = uciMove.substring(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4].toUpperCase() : '';
    
    const fromCol = fromSquare[0];
    const fromRow = fromSquare[1];
    const toCol = toSquare[0];
    const toRow = toSquare[1];
    
    // Get piece at source square from the GIVEN board state
    const rowIndex = 8 - parseInt(fromRow);
    const colIndex = fromCol.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRowIndex = 8 - parseInt(toRow);
    const toColIndex = toCol.charCodeAt(0) - 'a'.charCodeAt(0);
    
    const piece = boardState[rowIndex]?.[colIndex] || '';
    const targetSquare = boardState[toRowIndex]?.[toColIndex];
    
    // Check for en passant: pawn moves diagonally to empty square
    const isEnPassant = piece.toUpperCase() === 'P' && 
                        Math.abs(colIndex - toColIndex) === 1 && 
                        targetSquare === '';
    
    const isCapture = targetSquare !== '' || isEnPassant;
    
    // Check for castling (king moves 2 squares)
    if (piece.toUpperCase() === 'K') {
      const colDiff = toCol.charCodeAt(0) - fromCol.charCodeAt(0);
      if (Math.abs(colDiff) === 2) {
        return colDiff > 0 ? 'O-O' : 'O-O-O';
      }
    }
    
    // Simulate the move to check for check/checkmate
    const testBoard = boardState.map(r => [...r]);
    let movingPiece = testBoard[rowIndex][colIndex];
    
    // Handle promotion in simulation
    if (movingPiece.toUpperCase() === 'P' && promotion) {
      movingPiece = movingPiece === movingPiece.toUpperCase() ? promotion : promotion.toLowerCase();
    }
    
    testBoard[toRowIndex][toColIndex] = movingPiece;
    testBoard[rowIndex][colIndex] = '';
    
    const opponentInCheck = isKingInCheck(testBoard, nextPlayer);
    const opponentIsCheckmated = opponentInCheck && isCheckmate(testBoard, nextPlayer);
    
    // Pawns
    if (piece.toUpperCase() === 'P') {
      let notation = '';
      if (isCapture) {
        notation = `${fromCol}x${toSquare}`;
      } else {
        notation = toSquare;
      }
      if (promotion) {
        notation += `=${promotion}`;
      }
      if (opponentIsCheckmated) {
        notation += '#';
      } else if (opponentInCheck) {
        notation += '+';
      }
      return notation;
    }
    
    // Other pieces
    const pieceSymbol = piece.toUpperCase();
    const captureSymbol = isCapture ? 'x' : '';
    let notation = `${pieceSymbol}${captureSymbol}${toSquare}`;
    
    if (opponentIsCheckmated) {
      notation += '#';
    } else if (opponentInCheck) {
      notation += '+';
    }
    
    return notation;
  };

  // Legacy function for backwards compatibility (uses current board)
  const uciToAlgebraic = (uciMove: string): string => {
    return uciToAlgebraicWithBoard(uciMove, board, currentPlayer);
  };

  // Store the current FEN being analyzed
  const currentAnalysisFEN = useRef<string>('');

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
      
      // Determine side-to-move from the FEN being analyzed (more reliable than currentPlayer state)
      const fenParts = currentAnalysisFEN.current.split(' ');
      const sideToMove = fenParts[1] === 'w' ? 'white' : 'black';
      
      console.log(`🔍 RAW STOCKFISH: multipv=${pvIndex}, score cp=${centipawns}, move=${move}, sideToMove=${sideToMove} (from FEN)`);
      
      // CRITICAL: Stockfish reports from SIDE-TO-MOVE perspective!
      // When White to move: positive = good for White, negative = good for Black
      // When Black to move: positive = good for Black, negative = good for White
      // We need to convert to ALWAYS be from White's perspective
      const whitePersp = sideToMove === 'white' ? centipawns : -centipawns;
      
      console.log(`📊 Parsed move ${pvIndex}: ${move} (raw: ${centipawns} cp, White persp: ${whitePersp} cp) | Side to move: ${sideToMove}`);
      
      // If this is the first move (best move), store its evaluation globally
      if (pvIndex === 1) {
        console.log(`🔍 DEBUG: Setting evaluation - Raw centipawns: ${centipawns}, whitePersp: ${whitePersp}, currentPlayer: ${currentPlayer}`);
        setBestMoveEval(whitePersp); // Store White's perspective
        setCurrentEvaluation(whitePersp); // Store White's perspective
        console.log(`🏆 Best move in position: ${move} with eval ${whitePersp} cp (White perspective) | Current player: ${currentPlayer}`);
      }
      
      // Update top moves list with White's perspective evaluations
      setTopMoves(prev => {
        const updated = [...prev];
        updated[pvIndex - 1] = { move, eval: whitePersp }; // Store White's perspective
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
      
      // Determine side-to-move from the FEN being analyzed
      const fenParts = currentAnalysisFEN.current.split(' ');
      const sideToMove = fenParts[1] === 'w' ? 'white' : 'black';
      
      // Convert from side-to-move perspective to White's perspective
      const whitePersp = sideToMove === 'white' ? centipawns : -centipawns;
      
      // IMPORTANT: Always use the GLOBAL best move (from general analysis)
      // We should never get here if bestMoveEval is null (see evaluateSelectedPieceMoves check)
      if (bestMoveEval === null) {
        console.warn('⚠️ No global best move available - skipping evaluation');
        return;
      }
      
      // Calculate centipawn loss from White's perspective
      const cpLoss = bestMoveEval - whitePersp;
      
      console.log(`🎯 Move ${move}: raw ${centipawns} cp, White persp ${whitePersp} cp, GLOBAL best ${bestMoveEval} cp, loss ${cpLoss} cp`);
      
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
            
            // If we're in AI mode and it's Black's turn, trigger AI move
            if (gameMode === 'ai' && currentPlayer === 'black' && !aiThinking && !waitingForAIMove.current) {
              console.log('🔄 Retrying AI move after worker restart...');
              setTimeout(getStockfishMove, 500);
            }
          }
          
          // Check if analysis is complete
          if (message.startsWith && message.startsWith('bestmove')) {
            analysisInProgress.current = false;
            console.log('✅ Analysis complete');
            
            // If we're waiting for an AI move, execute it
            if (waitingForAIMove.current) {
              // Check for "bestmove (none)" - this means no legal moves (checkmate or stalemate)
              if (message.includes('bestmove (none)')) {
                console.error('🏁 Stockfish returned no legal moves!');
                console.error('🏁 Current FEN:', boardToFEN());
                console.error('🏁 gameResult:', gameResult);
                console.error('🏁 This should only happen in checkmate/stalemate');
                
                // Try to make a random legal move as fallback
                console.log('🔄 Attempting fallback: making random legal move');
                setAiThinking(false);
                waitingForAIMove.current = false;
                aiMoveQueuedRef.current = false;
                
                // Use setTimeout to avoid React state update conflicts
                setTimeout(() => {
                  makeRandomMove();
                }, 100);
                return;
              }
              
              const moveMatch = message.match(/bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/);
              if (moveMatch) {
                const selectedMove = selectAIMove();
                if (selectedMove) {
                  console.log(`🤖 AI selected: ${selectedMove} from candidates:`, aiMoveCandidates.current.map(c => c?.move));
                  
                  // Clear flag IMMEDIATELY to prevent duplicate execution
                  waitingForAIMove.current = false;
                  
                  // Small delay for visual effect, then execute
                  setTimeout(() => executeAIMove(selectedMove), 300);
                } else {
                  // Easy mode: 50% chance of random move
                  console.log('🎲 Easy AI: Making completely random legal move');
                  waitingForAIMove.current = false;
                  setAiThinking(false);
                  aiMoveQueuedRef.current = false;
                  setTimeout(() => makeRandomMove(), 300);
                }
              } else {
                console.error('Failed to parse bestmove from:', message);
                setAiThinking(false);
                waitingForAIMove.current = false;
                aiMoveQueuedRef.current = false;
              }
            }
          }
          
          // Parse multi-pv lines for move evaluations (and collect AI move candidates)
          if (message.startsWith && message.startsWith('info') && message.includes('multipv')) {
            // Collect AI move candidates when waiting for AI move
            if (waitingForAIMove.current) {
              const multipvMatch = message.match(/multipv (\d+)/);
              const scoreMatch = message.match(/score cp (-?\d+)/);
              const pvMatch = message.match(/\bpv\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
              
              if (multipvMatch && scoreMatch && pvMatch) {
                const pvIndex = parseInt(multipvMatch[1]);
                const centipawns = parseInt(scoreMatch[1]);
                const move = pvMatch[1];
                
                // Add to candidates (convert to Black's perspective since AI plays black)
                const evalForBlack = -centipawns; // Flip for Black's benefit
                aiMoveCandidates.current[pvIndex - 1] = { move, eval: evalForBlack };
                console.log(`🤖 AI candidate ${pvIndex}: ${move} (${evalForBlack} cp for Black)`);
              }
            }
            
            // Use different parser depending on whether we're analyzing selected piece or whole position
            if (analyzingSelectedPiece.current) {
              console.log('🔧 Parsing piece-specific eval:', message.substring(0, 100));
              parseSelectedPieceEval(message);
            } else if (!waitingForAIMove.current) {
              // Only parse for UI if not waiting for AI move
              parseStockfishEval(message);
            }
          }
        };
        
        worker.onerror = (error) => {
          // WASM "unreachable" errors can occur during hot reload in development - usually harmless
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Stockfish worker error (may be from hot reload):', error.message || error);
          } else {
            console.error('Stockfish worker error:', error);
          }
          
          // Try to recover by reinitializing
          setStockfishReady(false);
          analyzingSelectedPiece.current = false;
          analysisInProgress.current = false;
          
          // Clear AI move state to prevent executing stale moves
          waitingForAIMove.current = false;
          aiMoveCandidates.current = [];
          setAiThinking(false);
          
          // Recreate worker after a delay
          setTimeout(() => {
            console.log('🔄 Attempting to restart Stockfish...');
            try {
              const newWorker = new Worker('/stockfish.js');
              stockfishRef.current = newWorker;
              newWorker.postMessage('uci');
              
              newWorker.onmessage = worker.onmessage;
              newWorker.onerror = worker.onerror;
            } catch (err) {
              console.error('Failed to restart Stockfish:', err);
            }
          }, 2000);
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

  // Trigger AI move when it's Black's turn in AI mode
  // Use a ref to track if we've already queued an AI move for this position
  const aiMoveQueuedRef = useRef(false);
  
  useEffect(() => {
    console.log(`🔍 AI useEffect triggered - gameMode: ${gameMode}, currentPlayer: ${currentPlayer}, stockfishReady: ${stockfishReady}, aiThinking: ${aiThinking}, waitingForAIMove: ${waitingForAIMove.current}, aiMoveQueued: ${aiMoveQueuedRef.current}`);
    
    // Keep refs in sync with state
    gameModeRef.current = gameMode;
    currentPlayerRef.current = currentPlayer;
    boardRef.current = board;
    
    // Only trigger AI move when all conditions are met AND flag is not set
    if (gameMode === 'ai' && 
        currentPlayer === 'black' && 
        stockfishReady && 
        !aiThinking && 
        !waitingForAIMove.current && 
        !aiMoveQueuedRef.current && 
        gameResult === null) {
      
      console.log('✅ Triggering AI move via useEffect (currentPlayer changed to black)');
      aiMoveQueuedRef.current = true;
      setTimeout(() => {
        getStockfishMove();
      }, 300);
    }
    // CRITICAL: Reset the flag when turn switches back to White
    // This must happen to allow AI to move again on the NEXT Black turn
    else if (currentPlayer === 'white') {
      if (aiMoveQueuedRef.current || waitingForAIMove.current || aiThinking) {
        console.log('🔄 Turn switched to White - clearing ALL AI flags');
        aiMoveQueuedRef.current = false;
        waitingForAIMove.current = false;
        setAiThinking(false);
      }
    }
  }, [currentPlayer, gameMode, stockfishReady, aiThinking, gameResult]);

  // Evaluate all legal moves in trainer or AI mode (only when no piece is selected)
  useEffect(() => {
    // Skip evaluation if AI is currently making a move
    if (waitingForAIMove.current || aiThinking) {
      console.log('⏭️ Skipping evaluateAllMoves - AI is thinking/moving');
      return;
    }
    
    // DISABLE evaluation in AI mode - only use for trainer mode
    if (gameMode === 'trainer' && stockfishReady && !selectedSquare) {
      evaluateAllMoves();
    }
  }, [board, currentPlayer, gameMode, stockfishReady, selectedSquare, aiThinking]);

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
    
    console.log(`🎯 evaluateAllMoves called - currentPlayer: ${currentPlayer}, board FEN will determine side-to-move`);
    
    // Send current position to Stockfish
    const fen = boardToFEN();
    if (!fen) {
      console.warn('⚠️ Cannot analyze: invalid FEN (skipping)');
      return;
    }
    
    console.log(`🎯 FEN for analysis: ${fen}`);
    
    // Store the FEN being analyzed so we can determine side-to-move in the parser
    currentAnalysisFEN.current = fen;
    
    // Stop any current analysis first
    try {
      stockfishRef.current.postMessage('stop');
    } catch (err) {
      console.error('Error stopping analysis:', err);
      return;
    }
    
    // Clear previous evaluations
    setMoveEvaluations({});
    setTopMoves([]);
    setBestMoveEval(null);
    
    // Set flag to use the general position parser
    analyzingSelectedPiece.current = false;
    
    try {
      // Analyze top 20 moves for general position evaluation
      stockfishRef.current.postMessage('setoption name MultiPV value 20');
      stockfishRef.current.postMessage(`position fen ${fen}`);
      stockfishRef.current.postMessage('go depth 15');
      
      console.log('🌍 Starting general position analysis (MultiPV=20, depth 15)');
    } catch (err) {
      console.error('Error starting analysis:', err);
    }
  };

  const boardToFEN = () => {
    // CRITICAL: Use boardRef to get current board state (avoid stale state in closures)
    const currentBoard = boardRef.current;
    let fen = '';
    for (let row of currentBoard) {
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
    
    // Validate FEN has both kings before adding the rest (warn but don't block)
    const whiteKingCount = (fen.match(/K/g) || []).length;
    const blackKingCount = (fen.match(/k/g) || []).length;
    
    if (whiteKingCount !== 1 || blackKingCount !== 1) {
      console.warn('⚠️ Board validation: Expected 1 of each king, found', { whiteKingCount, blackKingCount, boardPosition: fen });
      // Still continue, just warn about it
    }
    
    // Add turn, castling, en passant, halfmove, and fullmove
    // Build castling rights string based on whether kings/rooks have moved
    let castling = '';
    if (!kingMoved.white) {
      if (!rookMoved.whiteKingSide) castling += 'K';
      if (!rookMoved.whiteQueenSide) castling += 'Q';
    }
    if (!kingMoved.black) {
      if (!rookMoved.blackKingSide) castling += 'k';
      if (!rookMoved.blackQueenSide) castling += 'q';
    }
    if (castling === '') castling = '-';

    // En passant target square (FEN field): use tracked target if available
    // Note: This records the square jumped over after a two-square pawn move
    let epSquare = '-';
    if (enPassantTarget) {
      const [epRow, epCol] = enPassantTarget;
      const files = 'abcdefgh';
      epSquare = `${files[epCol]}${8 - epRow}`;
    }

    fen += ` ${currentPlayer === 'white' ? 'w' : 'b'} ${castling} ${epSquare} 0 1`;
    
    return fen;
  };

  const fetchOpeningInfo = async (moves: string[]) => {
    if (moves.length === 0) return;
    
    // Don't fetch opening info after too many moves or if game is over
    // Keep the last opening displayed instead of clearing it
    if (moves.length > 20 || gameResult !== null) {
      return;
    }
    
    setLoadingOpening(true);
    try {
      // Lichess API expects play parameter with comma-separated moves
      const moveString = moves.join(',');
      const url = `https://explorer.lichess.ovh/lichess?variant=standard&speeds=blitz,rapid,classical&ratings=2000,2200,2500&play=${encodeURIComponent(moveString)}`;
      
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (!response.ok) {
        // 400 errors are often from invalid positions, just ignore them
        if (response.status === 400) {
          console.log('Opening explorer returned 400 - position may be too rare or invalid');
          setOpeningInfo(null);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return;
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
    if (!stockfishRef.current || !stockfishReady) {
      console.warn('Stockfish not ready for AI move');
      return;
    }
    
    // CRITICAL: Prevent duplicate calls
    if (waitingForAIMove.current) {
      console.warn('⚠️ Already waiting for AI move, ignoring duplicate call');
      return;
    }
    
    // CRITICAL: Verify it's actually Black's turn before requesting AI move
    if (currentPlayerRef.current !== 'black') {
      console.warn(`⚠️ Skipping AI move - currentPlayerRef is ${currentPlayerRef.current}, expected black`);
      return;
    }
    
    // Easy mode: 100% random moves, skip Stockfish entirely
    if (aiDifficulty === 'easy') {
      console.log('🎲 Easy AI: Making 100% random move (no Stockfish analysis)');
      setAiThinking(true);
      setTimeout(() => {
        setAiThinking(false);
        makeRandomMove();
      }, 300); // Small delay for visual effect
      return;
    }
    
    setAiThinking(true);
    waitingForAIMove.current = true;
    aiMoveCandidates.current = []; // Clear previous candidates
    
    const fen = boardToFEN();
    console.log(`🤖 AI (${aiDifficulty}) requesting move for position: ${fen}`);
    
    // Configure engine based on difficulty
    const difficultySettings = {
      easy: { depth: 1, multiPV: 10 },     // Not used anymore for easy
      medium: { depth: 10, multiPV: 3 },   // Medium depth, weighted top 3
      hard: { depth: 15, multiPV: 3 },     // Deep search, weighted top 3
      expert: { depth: 20, multiPV: 1 }    // Maximum depth, always best
    };
    
    const settings = difficultySettings[aiDifficulty];
    
    try {
      stockfishRef.current.postMessage('stop');
      stockfishRef.current.postMessage(`setoption name MultiPV value ${settings.multiPV}`);
      stockfishRef.current.postMessage(`position fen ${fen}`);
      stockfishRef.current.postMessage(`go depth ${settings.depth}`);
    } catch (error) {
      console.error('Error requesting AI move:', error);
      setAiThinking(false);
      waitingForAIMove.current = false;
    }
  };

  // Execute AI move from UCI notation
  const executeAIMove = (uciMove: string) => {
    console.log(`🤖 AI executing move: ${uciMove} (currentPlayer: ${currentPlayer}, gameMode: ${gameMode}, gameModeRef: ${gameModeRef.current}, currentPlayerRef: ${currentPlayerRef.current})`);
    
    // CRITICAL: Verify we're still in AI mode using REF (user might have switched modes during setTimeout)
    if (gameModeRef.current !== 'ai') {
      console.warn(`⚠️ ABORT: Game mode changed to ${gameModeRef.current} before AI could move (setTimeout closure had: ${gameMode})`);
      setAiThinking(false);
      waitingForAIMove.current = false;
      aiMoveQueuedRef.current = false;
      return;
    }
    
    // CRITICAL: Double-check it's actually Black's turn using REF (not stale state from closure)
    if (currentPlayerRef.current !== 'black') {
      console.error(`❌ ABORT: AI tried to move when currentPlayerRef is ${currentPlayerRef.current}, not black! (state closure had: ${currentPlayer})`);
      setAiThinking(false);
      waitingForAIMove.current = false;
      aiMoveQueuedRef.current = false;
      return;
    }
    
    // Parse UCI move: e2e4, g1f3, e7e8q (with promotion)
    const fromSquare = uciMove.substring(0, 2);
    const toSquare = uciMove.substring(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4] : '';
    
    const fromCol = fromSquare.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(fromSquare[1]);
    const toCol = toSquare.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(toSquare[1]);
    
    // CRITICAL: Use boardRef to get the CURRENT board state (avoid stale closure)
    const currentBoard = boardRef.current;
    
    // GUARD: Verify the piece at source square is black
    const piece = currentBoard[fromRow][fromCol];
    if (!piece || piece !== piece.toLowerCase()) {
      console.error(`❌ Invalid AI move ${uciMove}: No black piece at source square. Piece: ${piece || 'empty'}, currentPlayerRef: ${currentPlayerRef.current}`);
      console.error(`❌ Board state at [${fromRow},${fromCol}]:`, currentBoard[fromRow]);
      setAiThinking(false);
      waitingForAIMove.current = false;
      aiMoveQueuedRef.current = false;
      return;
    }
    
    console.log(`🎯 Executing AI move: ${piece} from [${fromRow},${fromCol}] to [${toRow},${toCol}]`);
    
    // Check for castling
    let castleType: string | undefined = undefined;
    
    if (piece && piece.toLowerCase() === 'k' && Math.abs(toCol - fromCol) === 2) {
      castleType = toCol > fromCol ? 'castle-kingside' : 'castle-queenside';
    }
    
    // Check for en passant
    const isEnPassant = piece && piece.toLowerCase() === 'p' && 
                        Math.abs(toCol - fromCol) === 1 && 
                        currentBoard[toRow][toCol] === '' &&
                        enPassantTarget &&
                        enPassantTarget[0] === toRow &&
                        enPassantTarget[1] === toCol;
    
    // Execute the move
    movePiece(fromRow, fromCol, toRow, toCol, castleType, isEnPassant);
    
    // Clear aiThinking immediately so UI updates, but let useEffect clear the other flags
    setAiThinking(false);
    console.log(`✅ AI move executed, aiThinking cleared, waiting for turn switch...`);
  };

  // Select AI move based on difficulty and randomization
  const selectAIMove = (): string | null => {
    if (aiMoveCandidates.current.length === 0) {
      console.warn('No AI move candidates available');
      return null;
    }
    
    // Filter out undefined entries (sparse array from multipv indexing)
    const candidates = aiMoveCandidates.current.filter(c => c !== undefined && c.move);
    
    if (candidates.length === 0) {
      console.warn('No valid AI move candidates after filtering');
      return null;
    }
    
    console.log(`🎲 Selecting from ${candidates.length} candidate moves:`, candidates);
    
    // Easy: 80% completely random legal move, 20% pick from top moves at depth 1
    if (aiDifficulty === 'easy') {
      if (Math.random() < 0.2) {
        // Only 20% of the time: Pick randomly from Stockfish top moves (depth 1)
        const randomIndex = Math.floor(Math.random() * candidates.length);
        console.log(`🎲 Easy AI: Picking from top ${candidates.length} moves at depth 1 (20% chance)`);
        return candidates[randomIndex].move;
      } else {
        // 80% of the time: Pick completely random legal move
        console.log(`🎲 Easy AI: Making completely random legal move (80% blunder chance)`);
        return null; // Return null to trigger random move
      }
    }
    
    // Medium: Weighted random (60% best, 25% 2nd, 15% 3rd)
    if (aiDifficulty === 'medium') {
      const rand = Math.random();
      if (rand < 0.60 && candidates.length >= 1) return candidates[0].move;
      if (rand < 0.85 && candidates.length >= 2) return candidates[1].move;
      if (candidates.length >= 3) return candidates[2].move;
      return candidates[0].move;
    }
    
    // Hard: Weighted random (80% best, 15% 2nd, 5% 3rd)
    if (aiDifficulty === 'hard') {
      const rand = Math.random();
      if (rand < 0.80 && candidates.length >= 1) return candidates[0].move;
      if (rand < 0.95 && candidates.length >= 2) return candidates[1].move;
      if (candidates.length >= 3) return candidates[2].move;
      return candidates[0].move;
    }
    
    // Expert: Always best move
    return candidates[0].move;
  };

  const makeRandomMove = () => {
    setBoard(currentBoard => {
      const allMoves: { from: [number, number]; to: Array<number | string> }[] = [];
      
      // Collect all LEGAL moves for black pieces (filter out moves that leave king in check)
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = currentBoard[row][col];
          if (piece && piece === piece.toLowerCase() && piece !== '') {
            // Get pseudo-legal moves
            const pseudoLegalMoves = getValidMovesForBoard(currentBoard, row, col);
            
            // Filter to only legal moves (don't leave king in check)
            pseudoLegalMoves.forEach(move => {
              const [toRow, toCol, special] = move as [number, number, any];
              
              // Simulate the move
              const testBoard = currentBoard.map(r => [...r]);
              const movingPiece = testBoard[row][col];
              
              // Handle castling simulation
              if (typeof special === 'string' && special.includes('castle')) {
                if (special === 'castle-kingside') {
                  testBoard[toRow][toCol] = movingPiece;
                  testBoard[row][col] = '';
                  testBoard[toRow][5] = testBoard[toRow][7];
                  testBoard[toRow][7] = '';
                } else if (special === 'castle-queenside') {
                  testBoard[toRow][toCol] = movingPiece;
                  testBoard[row][col] = '';
                  testBoard[toRow][3] = testBoard[toRow][0];
                  testBoard[toRow][0] = '';
                }
              }
              // Handle en passant simulation
              else if (special === 1) {
                testBoard[toRow][toCol] = movingPiece;
                testBoard[row][col] = '';
                // Remove the captured pawn (same row as moving pawn, target column)
                testBoard[row][toCol] = '';
              }
              // Normal move
              else {
                testBoard[toRow][toCol] = movingPiece;
                testBoard[row][col] = '';
              }
              
              // Only add move if it doesn't leave black king in check
              if (!isKingInCheck(testBoard, 'black')) {
                allMoves.push({ from: [row, col], to: move });
              }
            });
          }
        }
      }

      if (allMoves.length > 0) {
        const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
        const newBoard = currentBoard.map(r => [...r]);
        const piece = newBoard[randomMove.from[0]][randomMove.from[1]];
        const [toRow, toCol, special] = randomMove.to as [number, number, any];
        
        // Handle castling
        if (typeof special === 'string' && special.includes('castle')) {
          if (special === 'castle-kingside') {
            newBoard[toRow][toCol] = piece;
            newBoard[randomMove.from[0]][randomMove.from[1]] = '';
            newBoard[toRow][5] = newBoard[toRow][7];
            newBoard[toRow][7] = '';
          } else if (special === 'castle-queenside') {
            newBoard[toRow][toCol] = piece;
            newBoard[randomMove.from[0]][randomMove.from[1]] = '';
            newBoard[toRow][3] = newBoard[toRow][0];
            newBoard[toRow][0] = '';
          }
        }
        // Handle en passant
        else if (special === 1) {
          newBoard[toRow][toCol] = piece;
          newBoard[randomMove.from[0]][randomMove.from[1]] = '';
          // Remove captured pawn
          newBoard[randomMove.from[0]][toCol] = '';
        }
        // Normal move
        else {
          newBoard[toRow][toCol] = piece;
          newBoard[randomMove.from[0]][randomMove.from[1]] = '';
        }

        const files = 'abcdefgh';
        const move = `${files[randomMove.from[1]]}${8 - randomMove.from[0]}${files[toCol]}${8 - toRow}`;
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
    if (!piece) return [] as Array<Array<number | string>>;

    const moves: Array<Array<number | string>> = [];
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
      // Regular diagonal captures
      [-1, 1].forEach(colOffset => {
        const targetPiece = boardState[row + direction]?.[col + colOffset];
        if (targetPiece) {
          const targetIsWhite = targetPiece === targetPiece.toUpperCase();
          if (isWhite !== targetIsWhite) {
            moves.push([row + direction, col + colOffset]);
          }
        }
      });
      // En passant capture
      if (enPassantTarget) {
        const [epRow, epCol] = enPassantTarget;
        // Check if the en passant target is diagonally adjacent
        if (epRow === row + direction && Math.abs(epCol - col) === 1) {
          moves.push([epRow, epCol, 1]); // Third element (1) marks en passant
        }
      }
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
          if (boardState[7][5] === '' && boardState[7][6] === '' && boardState[7][7] === 'R') {
            moves.push([7, 6, 'castle-kingside']);
          }
        }
        if (!kingMoved.white && !rookMoved.whiteQueenSide) {
          if (boardState[7][1] === '' && boardState[7][2] === '' && boardState[7][3] === '' && boardState[7][0] === 'R') {
            moves.push([7, 2, 'castle-queenside']);
          }
        }
      } else {
        if (!kingMoved.black && !rookMoved.blackKingSide) {
          if (boardState[0][5] === '' && boardState[0][6] === '' && boardState[0][7] === 'r') {
            moves.push([0, 6, 'castle-kingside']);
          }
        }
        if (!kingMoved.black && !rookMoved.blackQueenSide) {
          if (boardState[0][1] === '' && boardState[0][2] === '' && boardState[0][3] === '' && boardState[0][0] === 'r') {
            moves.push([0, 2, 'castle-queenside']);
          }
        }
      }
    }

    return moves;
  };

  // Check if a square is under attack by a specific color
  const isSquareUnderAttack = (boardState: Board, row: number, col: number, byColor: 'white' | 'black'): boolean => {
    // Check all opponent pieces to see if any can attack this square
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = boardState[r][c];
        if (!piece) continue;
        
        const pieceIsWhite = piece === piece.toUpperCase();
        const pieceColor = pieceIsWhite ? 'white' : 'black';
        
        // Skip if piece is not the attacking color
        if (pieceColor !== byColor) continue;
        
        const pieceType = piece.toLowerCase();
        
        // Check pawn attacks (pawns attack diagonally)
        if (pieceType === 'p') {
          const direction = pieceIsWhite ? -1 : 1;
          if (r + direction === row && (c - 1 === col || c + 1 === col)) {
            return true;
          }
          continue;
        }
        
        // Check knight attacks
        if (pieceType === 'n') {
          const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
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
          if (rowDiff <= 1 && colDiff <= 1 && (rowDiff + colDiff > 0)) {
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
              if (boardState[r][checkCol]) {
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
              if (boardState[checkRow][c]) {
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
              if (boardState[checkRow][checkCol]) {
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
  };

  // Check if the king of a specific color is in check
  const isKingInCheck = (boardState: Board, color: 'white' | 'black'): boolean => {
    // Find the king
    const kingPiece = color === 'white' ? 'K' : 'k';
    let kingRow = -1;
    let kingCol = -1;
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (boardState[r][c] === kingPiece) {
          kingRow = r;
          kingCol = c;
          break;
        }
      }
      if (kingRow !== -1) break;
    }
    
    if (kingRow === -1) {
      // King not found (shouldn't happen in valid game)
      return false;
    }
    
    // Check if king's square is under attack by opponent
    const opponentColor = color === 'white' ? 'black' : 'white';
    return isSquareUnderAttack(boardState, kingRow, kingCol, opponentColor);
  };

  // Check if a player has any legal moves
  const hasLegalMoves = (boardState: Board, color: 'white' | 'black'): boolean => {
    // Check all pieces of the given color
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = boardState[row][col];
        if (!piece) continue;
        
        const pieceIsWhite = piece === piece.toUpperCase();
        const pieceColor = pieceIsWhite ? 'white' : 'black';
        
        if (pieceColor !== color) continue;
        
        // Get pseudo-legal moves for this piece
        const pseudoLegalMoves = getValidMovesForBoard(boardState, row, col);
        
        // Check if any move is actually legal (doesn't leave king in check)
        for (const move of pseudoLegalMoves) {
          const testBoard = boardState.map(r => [...r]);
          const [toRow, toCol, special] = move as [number, number, any];

          const movingPiece = testBoard[row][col];

          // Handle castling simulation
          if (typeof special === 'string' && special.includes('castle')) {
            if (special === 'castle-kingside') {
              testBoard[toRow][toCol] = movingPiece;
              testBoard[row][col] = '';
              testBoard[toRow][5] = testBoard[toRow][7];
              testBoard[toRow][7] = '';
            } else if (special === 'castle-queenside') {
              testBoard[toRow][toCol] = movingPiece;
              testBoard[row][col] = '';
              testBoard[toRow][3] = testBoard[toRow][0];
              testBoard[toRow][0] = '';
            }
          }
          // Handle en passant simulation
          else if (special === 1) {
            testBoard[toRow][toCol] = movingPiece;
            testBoard[row][col] = '';
            // Remove the captured pawn (same row as moving pawn, target column)
            testBoard[row][toCol] = '';
          }
          // Normal move
          else {
            testBoard[toRow][toCol] = movingPiece;
            testBoard[row][col] = '';
          }

          if (!isKingInCheck(testBoard, color)) {
            return true; // Found at least one legal move
          }
        }
      }
    }
    
    return false; // No legal moves found
  };

  // Check for checkmate: king in check AND no legal moves
  const isCheckmate = (boardState: Board, color: 'white' | 'black'): boolean => {
    return isKingInCheck(boardState, color) && !hasLegalMoves(boardState, color);
  };

  // Check for stalemate: king NOT in check BUT no legal moves
  const isStalemate = (boardState: Board, color: 'white' | 'black'): boolean => {
    return !isKingInCheck(boardState, color) && !hasLegalMoves(boardState, color);
  };

  const getValidMoves = (row: number, col: number) => {
    const pseudoLegalMoves = getValidMovesForBoard(board, row, col);
    const piece = board[row][col];
    if (!piece) return [];
    
    const pieceColor = piece === piece.toUpperCase() ? 'white' : 'black';
    
    // Filter out moves that would leave the king in check
    const legalMoves = pseudoLegalMoves.filter(move => {
      // Simulate the move
      const testBoard = board.map(r => [...r]);
      const [toRow, toCol, special] = move as [number, number, any];
      
      const movingPiece = testBoard[row][col];
      
      // Handle castling simulation
      if (typeof special === 'string' && special.includes('castle')) {
        if (special === 'castle-kingside') {
          testBoard[toRow][toCol] = movingPiece;
          testBoard[row][col] = '';
          testBoard[toRow][5] = testBoard[toRow][7];
          testBoard[toRow][7] = '';
        } else if (special === 'castle-queenside') {
          testBoard[toRow][toCol] = movingPiece;
          testBoard[row][col] = '';
          testBoard[toRow][3] = testBoard[toRow][0];
          testBoard[toRow][0] = '';
        }
      }
      // Handle en passant simulation
      else if (special === 1) {
        testBoard[toRow][toCol] = movingPiece;
        testBoard[row][col] = '';
        // Remove the captured pawn (same row as moving pawn, target column)
        testBoard[row][toCol] = '';
      }
      // Normal move
      else {
        testBoard[toRow][toCol] = movingPiece;
        testBoard[row][col] = '';
      }
      
      // Check if this move would leave our king in check
      return !isKingInCheck(testBoard, pieceColor);
    });
    
    return legalMoves;
  };

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
    // Prevent moves if game is over
    if (gameResult !== null) {
      console.log('Game is over. Result:', gameResult);
      return;
    }

    if (gameMode === 'ai' && currentPlayer === 'black') return;
    const piece = board[row][col];

    if (selectedSquare && validMoves.some(move => move[0] === row && move[1] === col)) {
      const move = validMoves.find(m => m[0] === row && m[1] === col)!;
      const castleType = typeof (move as any)[2] === 'string' ? (move as any)[2] : undefined;
      const isEnPassant = (move as any)[2] === 1; // 1 marks en passant
      movePiece(selectedSquare[0], selectedSquare[1], row, col, castleType, isEnPassant);
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

  const movePiece = (fromRow: number, fromCol: number, toRow: number, toCol: number, castleType?: string, isEnPassant?: boolean) => {
    console.log(`🎯 movePiece called: [${fromRow},${fromCol}] → [${toRow},${toCol}], castleType: ${castleType}, enPassant: ${isEnPassant}`);
    
    // CRITICAL: Use boardRef to get current board state (avoid stale state in async callbacks)
    const currentBoard = boardRef.current;
    const newBoard = currentBoard.map(r => [...r]);
    const piece = newBoard[fromRow][fromCol];
    
    console.log(`🎯 Moving piece: ${piece || 'EMPTY'} from [${fromRow},${fromCol}] to [${toRow},${toCol}]`);

    // Auto-detect castling if not explicitly set: king moving 2 squares horizontally
    if (!castleType && piece && piece.toLowerCase() === 'k' && Math.abs(toCol - fromCol) === 2) {
      castleType = toCol > fromCol ? 'castle-kingside' : 'castle-queenside';
      console.log(`🏰 Auto-detected castling: ${castleType}`);
    }

    if (castleType === 'castle-kingside') {
      console.log(`🏰 Kingside castling: King to [${toRow},${toCol}], Rook from [${toRow},7] to [${toRow},5]`);
      console.log(`🏰 Before: Rook at [${toRow},7] = ${newBoard[toRow][7]}`);
      newBoard[toRow][toCol] = piece; // Move king to g-file (col 6)
      newBoard[fromRow][fromCol] = '';
      newBoard[toRow][5] = newBoard[toRow][7]; // Move rook from h-file (col 7) to f-file (col 5)
      newBoard[toRow][7] = '';
      console.log(`🏰 After: Rook at [${toRow},5] = ${newBoard[toRow][5]}, old position [${toRow},7] = ${newBoard[toRow][7]}`);
    } else if (castleType === 'castle-queenside') {
      console.log(`🏰 Queenside castling: King to [${toRow},${toCol}], Rook from [${toRow},0] to [${toRow},3]`);
      console.log(`🏰 Before: Rook at [${toRow},0] = ${newBoard[toRow][0]}`);
      newBoard[toRow][toCol] = piece; // Move king to c-file (col 2)
      newBoard[fromRow][fromCol] = '';
      newBoard[toRow][3] = newBoard[toRow][0]; // Move rook from a-file (col 0) to d-file (col 3)
      newBoard[toRow][0] = '';
      console.log(`🏰 After: Rook at [${toRow},3] = ${newBoard[toRow][3]}, old position [${toRow},0] = ${newBoard[toRow][0]}`);
    } else if (isEnPassant) {
      // En passant: move pawn and remove captured pawn
      newBoard[toRow][toCol] = piece;
      newBoard[fromRow][fromCol] = '';
      // Remove the captured pawn (it's on the same row as the moving pawn)
      newBoard[fromRow][toCol] = '';
    } else {
      newBoard[toRow][toCol] = piece;
      newBoard[fromRow][fromCol] = '';
      
      // Pawn promotion: if pawn reaches opposite end, promote to Queen
      const pieceType = piece.toLowerCase();
      const isWhite = piece === piece.toUpperCase();
      if (pieceType === 'p') {
        if (isWhite && toRow === 0) {
          newBoard[toRow][toCol] = 'Q'; // Promote white pawn to Queen
        } else if (!isWhite && toRow === 7) {
          newBoard[toRow][toCol] = 'q'; // Promote black pawn to queen
        }
      }
    }

    setBoard(newBoard);

    const pieceType = piece.toLowerCase();
    const isWhite = piece === piece.toUpperCase();

    // Track en passant opportunity: if pawn moved 2 squares, set target square
    if (pieceType === 'p' && Math.abs(toRow - fromRow) === 2) {
      // The en passant target is the square the pawn "jumped over"
      const targetRow = isWhite ? fromRow - 1 : fromRow + 1;
      setEnPassantTarget([targetRow, fromCol]);
    } else {
      // Clear en passant target after any other move
      setEnPassantTarget(null);
    }

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
    let move = `${files[fromCol]}${8 - fromRow}${files[toCol]}${8 - toRow}`;
    
    // Add promotion suffix if pawn reached last rank
    if (pieceType === 'p') {
      if ((isWhite && toRow === 0) || (!isWhite && toRow === 7)) {
        move += 'q'; // UCI notation: e7e8q for promotion to queen
      }
    }
    
    const newHistory = [...moveHistory, move];
    setMoveHistory(newHistory);

    // CRITICAL: Calculate next player from the piece that JUST MOVED, not from currentPlayer state
    // (currentPlayer state may be stale in async callbacks)
    const nextPlayer = isWhite ? 'black' : 'white';
    console.log(`🔄 Turn switching: piece was ${isWhite ? 'white' : 'black'}, next player: ${nextPlayer}`);
    setCurrentPlayer(nextPlayer);

    // Check for checkmate or stalemate
    if (isCheckmate(newBoard, nextPlayer)) {
      const winner = currentPlayer === 'white' ? '1-0' : '0-1';
      setGameResult(winner);
    } else if (isStalemate(newBoard, nextPlayer)) {
      setGameResult('1/2-1/2');
    }

    // Fetch opening info (non-blocking, optional)
    fetchOpeningInfo(newHistory).catch(err => {
      console.warn('Opening info fetch failed, continuing game:', err);
    });

    // AI move is now triggered by useEffect when currentPlayer changes to 'black'
  };

  const resetGame = () => {
    setBoard(INITIAL_BOARD);
    setSelectedSquare(null);
    setValidMoves([]);
    setCurrentPlayer('white');
    setMoveHistory([]);
    setOpeningInfo(null);
    setGameResult(null);
    setEnPassantTarget(null);
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
                    onClick={() => {
                      // Cancel any pending AI moves when switching to human mode
                      setAiThinking(false);
                      waitingForAIMove.current = false;
                      aiMoveQueuedRef.current = false;
                      setGameMode('human');
                    }}
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
                {/* AI Difficulty Selector */}
                {gameMode === 'ai' && (
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">Difficulty:</span>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value as any)}
                      className="px-3 py-1.5 rounded-lg bg-white/20 text-white border border-white/30 text-sm font-medium hover:bg-white/30 transition cursor-pointer"
                    >
                      <option value="easy" className="bg-gray-800">Easy</option>
                      <option value="medium" className="bg-gray-800">Medium</option>
                      <option value="hard" className="bg-gray-800">Hard</option>
                      <option value="expert" className="bg-gray-800">Expert</option>
                    </select>
                  </div>
                )}
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

              {/* Chessboard with Evaluation Bar */}
              <div className="flex gap-3">
                {/* Evaluation Bar - Show in AI and Trainer modes */}
                {(gameMode === 'ai' || gameMode === 'trainer') && (
                  <div className="flex flex-col w-12">
                    <div className="flex-1 bg-gradient-to-b from-gray-800 to-gray-700 rounded-lg overflow-hidden relative shadow-lg">
                      {/* Black advantage area (top) - grows when evaluation is negative */}
                      <div 
                        className="absolute top-0 left-0 right-0 bg-gradient-to-b from-gray-900 to-gray-800 transition-all duration-300"
                        style={{ 
                          height: `${Math.max(0, Math.min(100, 50 - (currentEvaluation / 10)))}%` 
                        }}
                      />
                      {/* White advantage area (bottom) - grows when evaluation is positive */}
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-100 to-white transition-all duration-300"
                        style={{ 
                          height: `${Math.max(0, Math.min(100, 50 + (currentEvaluation / 10)))}%` 
                        }}
                      />
                      {/* Center line */}
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-500 transform -translate-y-1/2" />
                      {/* Evaluation number */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`text-xs font-bold px-1 py-0.5 rounded ${
                          currentEvaluation > 0 ? 'bg-white/90 text-gray-900' : 'bg-gray-900/90 text-white'
                        }`}>
                          {currentEvaluation > 0 ? '+' : ''}{(currentEvaluation / 100).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chessboard */}
                <div className="aspect-square bg-amber-100 rounded-lg shadow-inner flex-1">
                  <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
                    {board.map((row, rowIndex) => (
                      row.map((piece, colIndex) => {
                        const isLight = (rowIndex + colIndex) % 2 === 0;
                        const isSelected = selectedSquare?.[0] === rowIndex && selectedSquare?.[1] === colIndex;
                        const isValidMove = validMoves.some(move => move[0] === rowIndex && move[1] === colIndex);
                        const moveQuality = selectedSquare ? getMoveQualityColor(selectedSquare[0], selectedSquare[1], rowIndex, colIndex) : '';
                        
                        // Check if this square has a king in check
                        const isKing = piece && piece.toLowerCase() === 'k';
                        const kingColor = piece === 'K' ? 'white' : piece === 'k' ? 'black' : null;
                        const kingInCheck = isKing && kingColor && isKingInCheck(board, kingColor);
                      
                      // In trainer mode with hints: show quality colors or red for non-top-20
                      // In other modes: simple white rings
                      const validMoveRing = gameMode === 'trainer' && moveQuality === '' 
                        ? 'ring-[6px] ring-inset ring-red-400' 
                        : 'ring-4 ring-inset ring-white';

                      return (
                        <div key={`${rowIndex}-${colIndex}`} onClick={() => handleSquareClick(rowIndex, colIndex)} className={`flex items-center justify-center cursor-pointer transition-all select-none relative ${isLight ? 'bg-amber-200' : 'bg-amber-700'} ${isSelected ? 'ring-4 ring-inset ring-blue-400' : ''} ${kingInCheck ? 'ring-[6px] ring-inset ring-red-600 animate-pulse' : ''} ${isValidMove && !moveQuality ? validMoveRing : ''} ${moveQuality ? `ring-inset ${moveQuality}` : ''} hover:brightness-110`}>
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
              </div>

              <div className="mt-4 text-white text-center">
                <p className="text-lg font-semibold">
                  {gameResult ? (
                    gameResult === '1/2-1/2' ? 'Draw - Stalemate' : 
                    gameResult === '1-0' ? '⚪ White won' : '⚫ Black won'
                  ) : aiThinking ? (
                    <span className="flex items-center justify-center gap-2">
                      <Cpu className="animate-spin" size={20} />
                      AI is thinking... ({aiDifficulty})
                    </span>
                  ) : (
                    `Current Turn: ${currentPlayer === 'white' ? '⚪ White' : '⚫ Black'}`
                  )}
                </p>
                {stockfishReady && gameMode === 'ai' && !aiThinking && (<p className="text-sm text-green-400 mt-1"><Cpu className="inline mr-1" size={14} />Stockfish Engine Ready ({aiDifficulty} mode)</p>)}
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
                    {moveHistory.map((move, i) => {
                      // Reconstruct board state at this move by replaying from start
                      let boardState = INITIAL_BOARD.map(r => [...r]);
                      for (let j = 0; j < i; j++) {
                        const pastMove = moveHistory[j];
                        const fromSquare = pastMove.substring(0, 2);
                        const toSquare = pastMove.substring(2, 4);
                        const promotion = pastMove.length > 4 ? pastMove[4] : '';
                        const fromRow = 8 - parseInt(fromSquare[1]);
                        const fromCol = fromSquare.charCodeAt(0) - 'a'.charCodeAt(0);
                        const toRow = 8 - parseInt(toSquare[1]);
                        const toCol = toSquare.charCodeAt(0) - 'a'.charCodeAt(0);
                        
                        let movingPiece = boardState[fromRow][fromCol];
                        // Handle promotion
                        if (movingPiece.toUpperCase() === 'P' && promotion) {
                          movingPiece = movingPiece === movingPiece.toUpperCase() ? promotion.toUpperCase() : promotion.toLowerCase();
                        }
                        
                        boardState[toRow][toCol] = movingPiece;
                        boardState[fromRow][fromCol] = '';
                      }
                      const nextPlayer = i % 2 === 0 ? 'black' : 'white';
                      const algebraic = uciToAlgebraicWithBoard(move, boardState, nextPlayer);
                      
                      return (
                        <div key={i} className="flex gap-2">
                          {i % 2 === 0 && <span className="text-gray-400">{Math.floor(i / 2) + 1}.</span>}
                          <span>{algebraic}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {gameResult && (
                  <div className="mt-4 text-center">
                    <p className="text-2xl font-bold text-white">{gameResult}</p>
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
