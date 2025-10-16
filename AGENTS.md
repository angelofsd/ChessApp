# AI Agent Onboarding Guide

This document helps AI coding agents quickly understand the codebase and contribute effectively.

## Project Overview

**Chess Training Application** built with Next.js, TypeScript, and Tailwind CSS. Provides multiple training modes to help users improve their chess skills.

## Architecture

### Tech Stack
- **Framework**: Next.js 15.5.4 (Pages Router)
- **Language**: TypeScript 5.1+
- **Styling**: Tailwind CSS 3.4.7
- **State Management**: React hooks (useState, useEffect, useRef)
- **Backend**: Supabase (optional, for game storage)
- **APIs**: Lichess Opening Explorer
- **Chess Engine**: Stockfish 17.1 (WASM binary running in Web Worker)

### WebAssembly (WASM) & Web Workers

This app uses advanced browser technologies to run a full chess engine directly in the browser:

#### What is WebAssembly (WASM)?

**WebAssembly** is a low-level binary instruction format that runs in modern browsers at near-native speed. It allows code written in languages like C++ (like Stockfish) to be compiled to a format that browsers can execute efficiently.

**Why we use it:**
- Stockfish is written in C++ and compiled to WASM
- Runs 10-20x faster than pure JavaScript
- Enables complex chess analysis (depth 15+) directly in the browser
- No server required - completely client-side

**Our WASM files:**
- `public/stockfish.js` - JavaScript loader/wrapper for the WASM binary
- `public/stockfish.wasm` - The actual compiled Stockfish engine (~800KB)
- `public/stockfish-17.1-lite-single-03e3232.wasm` - Specific version binary

#### What is a Web Worker?

**Web Workers** run JavaScript in a background thread, separate from the main UI thread. This prevents the heavy computation from freezing the user interface.

**Why we use it:**
- Chess engine analysis is CPU-intensive (can take 1-5 seconds)
- Without Web Worker: UI would freeze during analysis
- With Web Worker: Game remains responsive while engine thinks

**How it works in our app:**
```typescript
// Create worker in a background thread
const worker = new Worker('/stockfish.js');
stockfishRef.current = worker;

// Send commands to the worker (non-blocking)
worker.postMessage('uci');                    // Initialize engine
worker.postMessage('position fen <fen>');     // Set position
worker.postMessage('go depth 15');            // Start analysis

// Receive results asynchronously
worker.onmessage = (e) => {
  const message = e.data;
  // Parse engine output: "info depth 15 score cp 38 pv e2e4"
  parseStockfishEval(message);
};
```

**Architecture:**
```
Main Thread (UI)              Web Worker Thread
┌─────────────────┐          ┌──────────────────┐
│  React App      │          │  Stockfish.js    │
│  ChessApp.tsx   │◄────────►│  (WASM loader)   │
│                 │  Events  │                  │
│  - User clicks  │          │  ┌────────────┐  │
│  - Board updates│          │  │ stockfish  │  │
│  - Render UI    │          │  │   .wasm    │  │
│                 │          │  │ (C++ binary)│  │
└─────────────────┘          │  └────────────┘  │
                             └──────────────────┘
     No blocking!              Heavy computation
     UI responsive              runs here
```

#### UCI Protocol

Stockfish communicates using the **Universal Chess Interface (UCI)** protocol:

**Commands we send:**
- `uci` - Initialize engine
- `ucinewgame` - Start new game
- `position fen <fen>` - Set board position
- `setoption name MultiPV value 20` - Analyze top 20 moves
- `go depth 15` - Search to depth 15
- `stop` - Stop analysis

**Responses we parse:**
```
info depth 15 multipv 1 score cp 38 pv e2e4 e7e5
│    │        │         │         │  │
│    │        │         │         │  └─ Principal variation (best line)
│    │        │         │         └─ Centipawns (38 = +0.38 pawns)
│    │        │         └─ MultiPV number (1 = best move)
│    │        └─ Search depth reached
│    └─ Info about analysis
└─ Message type
```

#### Error Handling

**WASM "unreachable" errors** can occur during hot module reloading in development:
- These are usually harmless
- The app auto-recovers by restarting the worker after 2 seconds
- In development mode, logged as warnings instead of errors

**Worker lifecycle:**
1. Initialize on component mount
2. Listen for messages and errors
3. Auto-restart on crashes
4. Clean up on component unmount

#### Performance Considerations

- **MultiPV=20**: Analyzing 20 moves takes more time but provides better move hints
- **Depth 15**: Good balance between speed (~2-3 seconds) and accuracy
- **Async analysis**: Never blocks the UI - game remains playable during analysis
- **Debouncing**: Analysis only triggers when no piece is selected and position changes

### Key Files

| File | Purpose |
|------|---------|
| `pages/index.tsx` | Entry point, renders ChessApp component |
| `components/ChessApp.tsx` | Main chess game logic and UI (465 lines) |
| `lib/supabase.ts` | Supabase client configuration |
| `styles/globals.css` | Global styles and Tailwind imports |
| `supabase_schema.sql` | Database schema for game storage |

## Component Structure

### ChessApp Component (`components/ChessApp.tsx`)

**State Variables:**
- `board: Board` - 8x8 string array representing current position
- `selectedSquare: [number, number] | null` - Currently selected square
- `validMoves: Array<Array<number | string>>` - Legal moves for selected piece
- `currentPlayer: 'white' | 'black'` - Whose turn it is
- `moveHistory: string[]` - List of moves in algebraic notation
- `gameMode: 'human' | 'ai'` - Current game mode
- `stockfishReady: boolean` - Engine status
- `openingInfo: any` - Data from Lichess API
- `kingMoved, rookMoved` - Castling rights tracking

**Key Functions:**

```typescript
// Board representation to FEN notation
boardToFEN(): string

// Fetch opening statistics from Lichess
fetchOpeningInfo(moves: string[]): Promise<void>

// Get all legal moves for a piece
getValidMovesForBoard(boardState: Board, row: number, col: number): number[][]

// Handle square click (select piece or make move)
handleSquareClick(row: number, col: number): void

// Execute a move and update game state
movePiece(fromRow, fromCol, toRow, toCol, castleType?): void

// AI move generation (currently random)
getStockfishMove(): void
makeRandomMove(): void
```

**Chess Piece Representation:**
- Uppercase = White pieces (K, Q, R, B, N, P)
- Lowercase = Black pieces (k, q, r, b, n, p)
- Empty string = Empty square

**Visual Pieces:**
- Uses Wikipedia Commons SVG images
- Stored in `PIECE_IMAGES` object with URLs
- Rendered as `<img>` tags at 70% square size

## Current Features

### ✅ Implemented
1. **Basic Chess Rules**
   - Piece movement (all types)
   - Castling (kingside and queenside)
   - En passant capture
   - Pawn promotion (to Queen)
   - Check detection and visualization
   - Checkmate and stalemate detection
   - Turn-based gameplay
   - **Move validation (fully legal moves)** ✅
   - **King safety enforcement** ✅
   - **Castling legality checks** ✅

2. **Game Modes**
   - vs Human: Local two-player
   - **vs AI: Play against Stockfish with 4 difficulty levels** ✅
   - **Move Trainer: Stockfish-powered move evaluation** ✅

3. **AI Opponent Features** ✅
   - **Stockfish 17.1 Integration**: Full chess engine with MultiPV analysis
   - **Four Difficulty Levels**:
     - Easy: 100% random legal moves (no engine)
     - Medium: Depth 10, weighted selection (60%/25%/15%)
     - Hard: Depth 15, weighted selection (80%/15%/5%)
     - Expert: Depth 20, always best move
   - **AI Thinking Indicator**: Shows when AI is calculating
   - **Move Validation**: AI only makes legal moves
   - **Difficulty Selector**: Dropdown in AI mode

4. **Move Trainer Features** ✨
   - **Stockfish 17.1 Integration**: WebWorker-based engine running at depth 15
   - **MultiPV Analysis**: Analyzes top 20 moves in each position
   - **Color-coded Move Quality**:
     - Dark green (6px): Best move (0cp loss)
     - Emerald: Excellent (<25cp loss)
     - Lime: Good (<50cp loss)
     - Yellow: Okay (<100cp loss)
     - Orange: Dubious (<200cp loss)
     - Red: Bad (≥200cp loss or not in top 20)
   - **Global Comparison**: Each move compared to absolute best in position
   - **Smart Analysis**: Only analyzes moves from selected piece's square
   - **Toggle Hints**: On/off button to show/hide evaluations
   - **Evaluation Bar**: Shows position strength always from White's perspective
     - Positive values = White advantage (white area grows from bottom)
     - Negative values = Black advantage (black area grows from top)
     - Values stay consistent regardless of whose turn it is

5. **UI Features**
   - Visual piece selection (blue ring)
   - Valid move indicators (white ring in human/AI modes)
   - Move history display with chess piece symbols
   - Opening explorer panel
   - Reset and undo buttons
   - Top 3 moves display with evaluations
   - King highlight when in check (red background)
   - AI thinking indicator with spinner

6. **API Integration**
   - Lichess Opening Explorer with error handling
   - 5-second timeout on API calls
   - Non-blocking fetch (game continues on failure)

### ❌ Not Implemented Yet
- **Pawn promotion choice UI** (currently auto-promotes to Queen)
- Draw by repetition/50-move rule
- Opening trainer mode with repertoire system
- Undo/redo with full board replay

## Planned Features

### 1. Opening Trainer Mode (Next Priority)

**Requirements:**
- Database of opening lines (PGN format)
- User selects opening repertoire to practice
- Show expected moves
- Alert on incorrect moves with retry option
- Track user progress/accuracy

**Implementation Plan:**
1. Design opening database schema
2. Import common openings (Sicilian, French, etc.)
3. Create opening selection UI
4. Implement move validation against repertoire
5. Add feedback system
6. Store practice statistics

## Major Bug Fixes & Lessons Learned

### 1. Illegal Move Prevention (October 2025)

**Bug**: Players could move pieces when their king was in check, king could move into check, and AI could make illegal moves.

**Root Cause**: 
- `getValidMovesForBoard()` generates pseudo-legal moves (follows piece rules but ignores check)
- Castling moves lacked special markers, so validation only moved king, not rook
- `makeRandomMove()` didn't filter out moves that leave king in check

**Solution**:
```typescript
// Added special markers to castling moves
moves.push([7, 6, 'castle-kingside']);  // Not just [7, 6]

// getValidMoves() now simulates ALL special moves
if (special === 'castle-kingside') {
  testBoard[toRow][toCol] = movingPiece;
  testBoard[row][col] = '';
  testBoard[toRow][5] = testBoard[toRow][7]; // Move rook too!
  testBoard[toRow][7] = '';
}

// makeRandomMove() now filters illegal moves
if (!isKingInCheck(testBoard, 'black')) {
  allMoves.push({ from: [row, col], to: move });
}
```

**Key Lesson**: When validating chess moves, you must simulate the COMPLETE move (including special moves) on a test board, not just the primary piece movement.

### 2. React Closure Bug in AI Move Execution (October 2025)

**Bug**: AI would sometimes make duplicate moves or fail to move when switching between game modes quickly.

**Root Cause**: `setTimeout` callbacks captured stale state values in their closures.

```typescript
// ❌ BAD: Uses stale state from closure
setTimeout(() => {
  if (gameMode === 'ai') {  // This gameMode is stale!
    executeAIMove(move);
  }
}, 300);
```

**Solution**: Use `useRef` to store values that need to be checked in async callbacks:

```typescript
// ✅ GOOD: Use refs for async/callback access
const gameModeRef = useRef<'human' | 'ai' | 'trainer'>(gameMode);
const currentPlayerRef = useRef<'white' | 'black'>(currentPlayer);
const boardRef = useRef<Board>(board);

// Keep refs in sync via useEffect
useEffect(() => {
  gameModeRef.current = gameMode;
  currentPlayerRef.current = currentPlayer;
  boardRef.current = board;
}, [gameMode, currentPlayer, board]);

// In async callbacks, check the ref
setTimeout(() => {
  if (gameModeRef.current === 'ai') {  // Always current!
    executeAIMove(move);
  }
}, 300);
```

**Key Lesson**: React state in `setTimeout`, `setInterval`, or any async callback can become stale. Always use refs for values that need to be checked after a delay.

### 3. FEN Castling Rights Bug (October 2025)

**Bug**: Stockfish would crash with "memory access out of bounds" when generating castling FEN notation.

**Root Cause**: Hardcoded castling rights as "KQkq" even when pieces had moved.

**Solution**: Generate castling rights dynamically based on actual piece movement:

```typescript
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
```

**Key Lesson**: FEN notation must accurately reflect the current board state. Never hardcode positional flags.

### 4. Evaluation Bar Flipping Bug (October 2025)

**Bug**: Evaluation bar would flip between positive and negative on each move.

**Root Cause**: Stockfish reports evaluations from the **side-to-move** perspective, not White's perspective.
- When White to move: +50 cp means White is better
- When Black to move: +50 cp means Black is better

**Solution**: Parse the FEN to determine whose turn it is, then convert to White's perspective:

```typescript
// Store FEN being analyzed
currentAnalysisFEN.current = fen;

// In parser, extract side-to-move
const fenParts = currentAnalysisFEN.current.split(' ');
const sideToMove = fenParts[1] === 'w' ? 'white' : 'black';

// Convert to White's perspective
const whitePersp = sideToMove === 'white' ? centipawns : -centipawns;
setCurrentEvaluation(whitePersp);
```

**Key Lesson**: UCI engines report from the perspective of the player to move. You must convert these values based on whose turn it is if you want a consistent reference frame.

### 5. TypeScript Type Safety Saves Time (October 2025)

**Issue**: After adding castling markers to move arrays, got compilation errors everywhere moves were used.

**What Happened**: Changing return type from `number[][]` to `Array<Array<number | string>>` exposed all the places where we assumed moves only contained numbers.

**Key Lesson**: TypeScript's strict typing caught potential runtime errors at compile time. The extra effort to fix type errors prevented hard-to-debug runtime bugs.

## Planned Features (Continued)

**Requirements:**
- Database of opening lines (PGN format)
- User selects opening repertoire to practice
- Show expected moves
- Alert on incorrect moves with retry option
- Track user progress/accuracy

**Implementation Plan:**
1. Design opening database schema
2. Import common openings (Sicilian, French, etc.)
3. Create opening selection UI
4. Implement move validation against repertoire
5. Add feedback system
6. Store practice statistics

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use Tailwind utility classes (avoid custom CSS)
- Keep components pure when possible
- Handle errors gracefully (especially network calls)

### Chess Logic
- Board coordinates: `[row, col]` where `[0,0]` is top-left (a8 in chess notation)
- Row 0 = Rank 8, Row 7 = Rank 1
- Move format: e.g., `e2e4` (from square to square)

### Error Handling
- Wrap all API calls in try-catch
- Use `console.warn` for non-critical failures
- Use `console.error` for critical issues
- Always provide fallbacks for external dependencies

### Testing Strategy
- Test move generation for each piece type
- Verify castling conditions
- Test edge cases (board boundaries, captures)
- Validate FEN conversion accuracy

## Common Tasks

### Adding a New Game Mode

1. Add mode to type: `'human' | 'ai' | 'newmode'`
2. Add state variable if needed
3. Create UI toggle button
4. Implement mode-specific logic in `handleSquareClick` or `movePiece`
5. Update README

### Integrating Stockfish

**Stockfish is already integrated!** ✅ Here's how it works:

```typescript
// Create WebWorker (already done in useEffect)
const worker = new Worker('/stockfish.js');

// Send position
const fen = boardToFEN();
worker.postMessage(`position fen ${fenString}`);

// Request evaluation with MultiPV for top 20 moves
worker.postMessage('setoption name MultiPV value 20');
worker.postMessage('go depth 15');

// Listen for response
worker.onmessage = (e) => {
  const message = e.data;
  // Parse UCI protocol: "info depth 15 multipv 1 score cp 38 pv e2e4"
  const multipv = message.match(/multipv (\d+)/)?.[1];
  const score = message.match(/score cp (-?\d+)/)?.[1];
  const move = message.match(/pv ([a-h][1-8][a-h][1-8])/)?.[1];
  
  // CRITICAL: Stockfish reports from SIDE-TO-MOVE perspective!
  // Convert to White's perspective for consistency
  const fenParts = currentAnalysisFEN.current.split(' ');
  const sideToMove = fenParts[1] === 'w' ? 'white' : 'black';
  const whitePersp = sideToMove === 'white' ? centipawns : -centipawns;
  
  // Store move evaluations and update evaluation bar
};
```

**Current Implementation:**
- General analysis: MultiPV=20, depth 15, runs on position change
- Piece selection: Filters topMoves to only moves from selected square
- Color coding: Based on centipawn loss from best move
- No separate piece-specific analysis (uses general analysis results)
- **Evaluation Bar**: Always shows position from White's perspective
  - Uses FEN string to determine side-to-move (not React state)
  - Prevents race conditions during state updates
  - Positive = White better, Negative = Black better (consistent)

### Adding New Piece Movement

1. Add case in `getValidMovesForBoard` function
2. Implement directional movement logic
3. Check for captures vs. empty squares
4. Verify board boundaries
5. Test edge cases

## API Reference

### Lichess Opening Explorer

```
GET https://explorer.lichess.ovh/lichess
  ?variant=standard
  &speeds=blitz,rapid,classical
  &ratings=2000,2200,2500
  &moves=e2e4,e7e5
```

**Response:**
```json
{
  "opening": { "name": "Italian Game" },
  "white": 12345,
  "draws": 5678,
  "black": 9012,
  "moves": [
    { "san": "Nf3", "white": 5000, "draws": 2000, "black": 3000 }
  ]
}
```

## Troubleshooting

### Common Issues

1. **Blank screen**: Check browser console for errors, verify component export
2. **Pieces not showing**: Check PIECE_IMAGES URLs, verify network access
3. **Opening explorer fails**: Check CORS, API rate limits (non-critical, game continues)
4. **Castling not working**: Verify kingMoved and rookMoved state tracking

### Debug Tips

- Add `console.log` in `handleSquareClick` to trace user actions
- Use React DevTools to inspect state
- Check Network tab for API calls
- Verify FEN string format with online validators

## Next Steps for AI Agents

When working on this project:

1. **Read this file first** to understand architecture
2. **Check `components/ChessApp.tsx`** for current implementation
3. **Run the dev server** and test current features
4. **Review planned features** in README for context
5. **Ask clarifying questions** before major changes

## Resources

- [Chess Programming Wiki](https://www.chessprogramming.org/)
- [Stockfish Documentation](https://stockfishchess.org/)
- [Lichess API Docs](https://lichess.org/api)
- [UCI Protocol Specification](http://wbec-ridderkerk.nl/html/UCIProtocol.html)
- [FEN Notation](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)

## Questions?

If you need clarification on any part of the codebase, refer to:
1. Inline code comments in `ChessApp.tsx`
2. TypeScript types for data structures
3. This document for high-level context
4. Ask the user for specific requirements

Happy coding! ♟️
