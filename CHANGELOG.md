# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Check detection and enforcement
- Checkmate and stalemate detection
- En passant capture
- Pawn promotion UI
- Improve AI with Stockfish engine (replace random moves)
- Opening Trainer mode

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
- Beautiful SVG chess pieces from Wikipedia Commons
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
