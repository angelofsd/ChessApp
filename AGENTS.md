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
   - Move validation (fully legal moves)

2. **Game Modes**
   - vs Human: Local two-player
   - vs AI: Play against random move generator
   - **Move Trainer: Stockfish-powered move evaluation** ✨

3. **Move Trainer Features** ✨
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

4. **UI Features**
   - Visual piece selection (blue ring)
   - Valid move indicators (white ring in human/AI modes)
   - Move history display with chess piece symbols
   - Opening explorer panel
   - Reset and undo buttons
   - Top 3 moves display with evaluations
   - King highlight when in check (red background)

5. **API Integration**
   - Lichess Opening Explorer with error handling
   - 5-second timeout on API calls
   - Non-blocking fetch (game continues on failure)

### ❌ Not Implemented Yet
- **Real Stockfish AI moves** (currently uses random moves in AI mode)
- **Adjustable difficulty levels**
- Draw by repetition/50-move rule
- Opening trainer mode with repertoire system

## Planned Features

### 1. Stockfish AI Moves (Next Priority)

**Requirements:**
- Use Stockfish for actual AI moves instead of random
- Adjustable difficulty levels (different depths)
- Time management for moves
- Display AI's thinking (principal variation)

**Implementation Plan:**
1. Modify `getStockfishMove` to request best move from engine
2. Add difficulty settings (depth 1-20)
3. Extract and execute the best move
4. Add "AI is thinking" indicator
5. Store and display AI's evaluation reasoning

### 2. Opening Trainer Mode (Future)

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
