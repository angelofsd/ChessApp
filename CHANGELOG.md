# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Opening Trainer mode with custom repertoires
- Clock and time controls
- Time-loss detection
- Draw by repetition and 50-move rule
- Pawn promotion choice UI (currently auto-promotes to Queen)

## [0.4.0] - 2025-10-15

### Added
- **AI Opponent with Stockfish** 🤖
  - Four difficulty levels: Easy, Medium, Hard, Expert
  - **Easy**: 100% random legal moves (no engine analysis)
  - **Medium**: Depth 10, weighted selection (60% best, 25% 2nd, 15% 3rd)
  - **Hard**: Depth 15, weighted selection (80% best, 15% 2nd, 5% 3rd)
  - **Expert**: Depth 20, always plays best move
  - AI thinking indicator with loading spinner
  - Difficulty selector dropdown in AI mode
- **Legal Move Enforcement** ⚖️
  - Complete legal move validation for both players
  - King cannot move into check
  - King cannot castle through check or while in check
  - Pieces cannot move if it would leave king in check
  - Special moves (castling, en passant) properly simulated for validation
- **Improved Board State Management**
  - Dynamic FEN castling rights based on actual piece movement tracking
  - Proper king and rook movement state tracking
  - En passant target square tracking

### Fixed
- **Critical: Illegal Move Prevention** 🛡️
  - Fixed king able to move into check (now properly validates destination square)
  - Fixed pieces able to move when king is in check (now filters all moves)
  - Fixed castling allowed when king in check (now properly blocked)
  - Fixed castling through check (simulates rook movement in validation)
  - Fixed AI making illegal moves in Easy mode (now validates all random moves)
- **Castling Execution Bug** 🏰
  - Root cause: Castling moves were added as `[row, col]` without special markers
  - Impact: `getValidMoves()` only moved king, not rook, when simulating castling
  - Solution: Added 'castle-kingside' and 'castle-queenside' markers to moves
  - Now properly simulates both king and rook movement for check detection
- **Move Validation Simulation** 🎭
  - `getValidMoves()` now properly simulates castling (moves both pieces)
  - `getValidMoves()` now properly simulates en passant (removes captured pawn)
  - `makeRandomMove()` now filters out illegal moves using full simulation
  - All special moves properly handled in legal move checking
- **Type Safety Improvements** 
  - Changed `getValidMovesForBoard()` return type from `number[][]` to `Array<Array<number | string>>`
  - Allows special move markers (strings) alongside coordinates (numbers)
  - Fixed TypeScript errors in `makeRandomMove()` with proper type casting
- **React State Management** 
  - Fixed closure bugs with refs for `gameMode`, `currentPlayer`, and `board`
  - Prevents stale state in async callbacks and timeouts
  - AI move execution validates current state using refs, not closures

### Technical
- **AI Move Generation Flow**:
  1. Request analysis from Stockfish with MultiPV based on difficulty
  2. Collect move candidates with evaluations from Black's perspective
  3. Apply difficulty-based weighted selection
  4. Execute move with full validation
- **Legal Move Validation Algorithm**:
  1. Generate pseudo-legal moves (piece movement rules only)
  2. For each move, simulate on test board
  3. Handle special moves (castling moves both pieces, en passant removes pawn)
  4. Check if king would be in check after move
  5. Filter out moves that leave king in check
- **Castling Move Format**: `[toRow, toCol, 'castle-kingside' | 'castle-queenside']`
- **En Passant Move Format**: `[toRow, toCol, 1]` (1 marks en passant)
- **Normal Move Format**: `[toRow, toCol]`

### Lessons Learned
- **React Closure Pitfall**: State in `setTimeout` callbacks can become stale
  - Solution: Use refs (`useRef`) for values needed in async code
  - Keep refs in sync with state via `useEffect`
- **Chess Move Simulation**: Must handle ALL special moves when validating
  - Castling: Move both king and rook
  - En passant: Remove pawn from different square than capture square
  - Promotion: Replace pawn with new piece
- **Type Systems Save Time**: TypeScript caught the move array type mismatch
  - Adding special markers required updating return types
  - Caught potential runtime errors at compile time

## [0.3.0] - 2025-10-14

### Added
- **En Passant Capture**
  - Proper en passant detection and execution
  - Tracks en passant target square after pawn's two-square advance
  - Removes captured pawn from correct square
- **Pawn Promotion**
  - Automatic promotion to Queen when pawn reaches opposite end
  - UCI notation includes promotion suffix (e7e8q)
- **Check Detection and Enforcement**
  - `isSquareUnderAttack()` function for comprehensive attack detection
  - `isKingInCheck()` validates king safety
  - Illegal moves that leave king in check are now filtered out
  - Visual indicator: pulsing red ring on king when in check
  - Check symbol (+) added to move notation
- **Checkmate and Stalemate Detection**
  - `hasLegalMoves()` function iterates all pieces to find legal moves
  - `isCheckmate()` detects when king is in check with no legal moves
  - `isStalemate()` detects when king is not in check but has no legal moves
  - Game result display: "1-0" (White won), "0-1" (Black won), "1/2-1/2" (Draw)
  - Winner announcement under "Current Turn" section
  - Checkmate symbol (#) added to final move notation
  - Game automatically ends when checkmate or stalemate is detected
  - Moves prevented after game is over
- **Evaluation Bar** (Move Trainer and AI modes)
  - Visual bar showing position evaluation from White's perspective
  - White area (bottom) grows when White is better
  - Black area (top) grows when Black is better
  - Displays numeric evaluation (e.g., +0.4, -1.2)
  - Center line at equal position
- **Improved Move Notation**
  - Converted UCI notation (e2e4) to standard algebraic notation (e4)
  - Piece moves include piece letter (Nf3, Bc4)
  - Castling notation: O-O (kingside), O-O-O (queenside)
  - Capture notation (Bxc6, exd5)
  - Board state replay system to reconstruct position for accurate notation
  - Fixed issue where pieces displayed as "x" in move history

### Fixed
- **Evaluation Bar Accuracy** - Critical fix for evaluation flipping issue
  - Root cause: Stockfish reports evaluations from side-to-move perspective, not White's perspective
  - Solution: Parse FEN string to determine whose turn it is, then convert to White's perspective
  - `currentAnalysisFEN` ref stores the FEN being analyzed to avoid React state race conditions
  - Now correctly maintains White's perspective regardless of whose turn it is
  - Example: Position after e4 now correctly shows ~+0.3 (White slightly better), not -0.3
- FEN validation now checks board position before adding castling rights (prevents false "2 kings" warnings)
- Stockfish WASM "unreachable" errors now logged as warnings in development (auto-recovery with 2-second restart)
- Move notation now uses board state before move to display correct piece symbols

### Technical
- Added `currentAnalysisFEN` ref to store FEN being analyzed by Stockfish
- Parse FEN `w/b` flag to determine side-to-move for evaluation conversion
- `parseStockfishEval()` and `parseSelectedPieceEval()` now convert evaluations consistently
- Added try-catch blocks around UCI commands for error handling
- Improved Stockfish worker lifecycle management with environment-aware error handling
- Board state simulation for move validation and notation generation

## [0.2.0] - 2025-10-14

### Added
- **Move Trainer Mode** with Stockfish 17.1 integration
  - Real-time move evaluation at depth 15
  - MultiPV=20 analysis for top 20 moves
  - Color-coded move quality hints:
    - Dark green: Best move (0cp loss)
    - Emerald: Excellent (<25cp loss)
    - Lime: Good (<50cp loss)
    - Yellow: Okay (<100cp loss)
    - Orange: Dubious (<200cp loss)
    - Red: Bad (≥200cp loss or not in top 20)
  - Global comparison - all moves compared to absolute best in position
  - Toggle hints on/off button
  - Top 3 moves display with evaluations
- **Opening Explorer** integration with Lichess API
  - Displays opening names as moves are played
  - Shows game statistics (total games, win/draw/loss counts)
  - Popular next moves with game counts
  - Non-blocking API calls with 5-second timeout

### Fixed
- Lichess API parameter changed from `moves` to `play` for proper opening data fetching
- URL encoding for comma-separated moves
- Color-coded rings only appear in Move Trainer mode (white rings in vs Human/AI modes)

### Changed
- Move quality display now uses general analysis results instead of piece-specific analysis
- Moves not in top 20 automatically marked as blunders (red) in Move Trainer mode

## [0.1.0] - 2025-10-14

### Added
- Initial chess application with Next.js, TypeScript, and Tailwind CSS
- **vs Human mode** - Local two-player gameplay
- **vs AI mode** - Play against random move generator
- Basic chess rules implementation:
  - All piece movements (King, Queen, Rook, Bishop, Knight, Pawn)
  - Castling (kingside and queenside)
  - Turn-based gameplay
  - Pseudo-legal move validation
- SVG chess pieces from Wikipedia Commons
- Move history display in algebraic notation
- Undo move functionality
- Reset game button
- Supabase integration for optional game persistence
- Responsive UI with gradient background
- Move quality legend display

### Technical
- Stockfish 17.1 lite-single WebWorker integration
- UCI protocol communication with chess engine
- FEN notation support for position representation
- React hooks-based state management

## [0.0.1] - 2025-10-13

### Added
- Project initialization
- Basic project structure
- Dependencies setup
