# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Improve AI with Stockfish engine (replace random moves with actual engine analysis)
- Adjustable difficulty levels
- Opening Trainer mode with custom repertoires
- Clock and time controls
- Time-loss detection
- Draw by repetition and 50-move rule

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
