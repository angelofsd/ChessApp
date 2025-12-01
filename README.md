# Chess App (Next.js + TypeScript + Tailwind + Supabase)

A modern chess application with multiple training modes, AI opponent, and opening analysis. Features a **Move Trainer mode** with Stockfish integration that color-codes moves by quality.

## Features

### Current Features ✅
- **Play vs Human**: Two-player local chess game with full chess rules
- **Play vs AI**: 
  - **Six difficulty levels**: Beginner, Easy, Medium, Hard, Expert, Master
  - **Play as White or Black**: Choose your side with board auto-flip
  - **Optional evaluation bar**: Toggle to see position analysis
  - **Realistic AI behavior**: Uses depth, Skill Level, and randomization for human-like play
  - **Mate-in-X detection**: Shows M2, M3, etc. on evaluation bar
- **Move Trainer Mode**: 
  - Real-time Stockfish 17.1 engine analysis
  - Color-coded move hints (green = best, red = blunder)
  - Compare moves to global best in position
  - Top 20 moves analyzed at depth 15
  - Moves outside top 20 marked as blunders
  - **Evaluation bar showing position strength from White's perspective**
  - **Mate-in-X display**: Shows M2, M3, etc. when checkmate is forced
- **Intuitive Controls**:
  - **Drag and drop**: Click and drag pieces to move them
  - **Click to move**: Click a piece, then click the destination square
  - Both methods work - use whichever you prefer!
- **Move History Navigation**:
  - Back/forward buttons to review the game
  - Click any move to jump to that position
  - Visual indicator when viewing history
- **Chess Rules Implemented**:
  - All piece movements (pawns, knights, bishops, rooks, queens, kings)
  - Castling (kingside and queenside) with full legality checking
  - **Castling blocked when king in check, passing through check, or ending in check**
  - En passant capture
  - Pawn promotion (to Queen)
  - Check detection and visualization
  - Checkmate and stalemate detection
  - **Legal move enforcement**: King cannot move into check, pieces cannot move if it leaves king in check
- **Move History**: Track all moves in algebraic notation with check (+) and checkmate (#) symbols
- **SVG Pieces**: High-quality Wikipedia Commons chess pieces
- **Opening Explorer**: Integration with Lichess API for opening statistics
- **Game Persistence**: Save games to Supabase (optional)
- **Responsive Design**: Beautiful gradient UI with Tailwind CSS

### Planned Features 🚧
1. **Opening Trainer Mode** (Next Priority)
   - Custom opening repertoire database
   - Practice specific opening lines
   - Retry mechanism for incorrect moves
   - Progress tracking

2. **Game Improvements**
   - Pawn promotion choice (currently auto-promotes to Queen)
   - Draw by repetition and 50-move rule
   - Clock and time controls
   - Undo/redo moves with board replay

## Quick Start

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

Visit http://localhost:3000

## Environment Variables

Create `.env.local` (copy from `.env.local.example`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Project Structure

```
├── components/
│   └── ChessApp.tsx          # Main chess UI component
├── lib/
│   ├── chess.ts              # Pure chess logic (testable)
│   └── supabase.ts           # Supabase client setup
├── __tests__/
│   └── chess/                # Chess logic unit tests
│       ├── checkDetection.test.ts
│       ├── gameEnd.test.ts
│       ├── moveGeneration.test.ts
│       ├── specialMoves.test.ts
│       └── notation.test.ts
├── pages/
│   ├── _app.tsx              # Next.js app wrapper
│   ├── index.tsx             # Home page
│   └── test.tsx              # Test page
├── styles/
│   └── globals.css           # Global styles + Tailwind
├── supabase_schema.sql       # Database schema
└── README.md                 # This file
```

## Game Modes

### vs Human
- Click pieces to select and move
- Valid moves highlighted in green
- Alternates between white and black

### vs AI
- **Six difficulty levels**: Choose from Beginner to Master
- **Play as White or Black**: Select your color - board flips automatically when playing Black
- AI makes moves automatically after your turn
- **Difficulty Levels** (realistic human-like play using depth + Skill Level + randomization):
  - **Beginner**: Depth 1, picks from 15 moves, Skill Level 0, 30% random chance - makes lots of mistakes
  - **Easy**: Depth 3, picks from 10 moves, Skill Level 3, 15% random chance - misses tactics often
  - **Medium**: Depth 5, picks from 5 moves, Skill Level 6, 5% random chance - club player level
  - **Hard**: Depth 8, picks from 3 moves, Skill Level 10, 2% random chance - strong club player
  - **Expert**: Depth 10, picks from 2 moves, Skill Level 15 - tournament player, few mistakes
  - **Master**: Depth 15, best move only, Skill Level 20 - full Stockfish strength
- **Evaluation bar** (optional): Toggle with 📊 button to see position analysis
- **Mate detection**: Shows M2, M3, etc. when checkmate is forced
- **Move history navigation**: Review the game with back/forward buttons

### Move Trainer ✨
- **Color-coded move quality**: Each move is evaluated by Stockfish 17.1
  - Dark green (6px ring): Best move (0 centipawn loss)
  - Emerald: Excellent (<25cp loss)
  - Lime: Good (<50cp loss)
  - Yellow: Okay (<100cp loss)
  - Orange: Dubious (<200cp loss)
  - Red: Bad (≥200cp loss or not in top 20)
- **Global comparison**: All moves compared to the absolute best move in the position
- **Top 20 analysis**: MultiPV=20 at depth 15 for comprehensive evaluation
- **Real-time hints**: Click any piece to see quality of all its moves
- **Evaluation bar**: Shows position strength always from White's perspective
  - White area (bottom) grows when White is better
  - Black area (top) grows when Black is better
  - Position evaluation stays consistent regardless of whose turn it is
  - **Mate-in-X display**: Shows M2 (green) when you can mate, M3 (red) when being mated
- Toggle hints on/off with the "Hints On" button

## Technology Stack

- **Next.js 15.5.4**: React framework with Pages Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Supabase**: Optional backend for game storage
- **Lichess API**: Opening database integration
- **Stockfish 17.1**: World-class chess engine running in your browser via WebAssembly

### How Stockfish Works in the Browser

This app uses **WebAssembly (WASM)** and **Web Workers** to run a full chess engine directly in your browser:

- **WebAssembly**: Allows the C++ Stockfish engine to run at near-native speed in the browser (10-20x faster than JavaScript)
- **Web Worker**: Runs the engine in a background thread, so the UI stays responsive during analysis
- **No server needed**: All analysis happens on your computer - no data sent to servers
- **Real-time analysis**: Evaluates positions at depth 15 with top 20 move analysis in 2-3 seconds

The result: Professional-grade chess analysis running entirely client-side! 🚀

## Database Setup

If using Supabase for game storage:

1. Create a Supabase project at https://supabase.com
2. Run the SQL in `supabase_schema.sql` to create the `games` table
3. Add your credentials to `.env.local`

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Next Steps

- [x] Improve AI with actual Stockfish moves ✅
- [x] Add adjustable engine difficulty levels ✅
- [x] Legal move enforcement (king safety) ✅
- [x] Play as Black option with board flip ✅
- [x] Mate-in-X detection on evaluation bar ✅
- [ ] Add Opening Trainer mode with repertoire system
- [ ] Pawn promotion choice UI (Q/R/B/N)
- [ ] User authentication and saved games per user
- [ ] Move analysis and post-game review
- [ ] Puzzle mode
- [x] Unit tests for chess logic ✅
- [x] CI/CD integration

## Testing

The project includes comprehensive unit tests for chess logic using Jest:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

The test suite includes 111 tests covering:

- **Check Detection** (45 tests): `findKing()`, `isSquareUnderAttack()`, `isKingInCheck()` for all piece types
- **Game End** (22 tests): `isCheckmate()`, `isStalemate()`, classic mate patterns (back rank, scholar's, fool's, smothered)
- **Move Generation** (31 tests): All piece movements, pinned pieces, check evasion
- **Special Moves** (20 tests): Castling (all restrictions), en passant, pawn promotion
- **FEN Notation** (13 tests): Parsing, generation, round-trip validation

## CI/CD

This project uses **GitHub Actions** for continuous integration. Every push and pull request to `main` triggers:

1. **Install dependencies**: Uses npm ci for reproducible installs
2. **Run tests**: Executes the full Jest test suite (111 tests)
3. **Build**: Verifies the Next.js application builds successfully

### Workflow Status

The CI workflow runs automatically on:
- Every push to `main` branch
- Every pull request targeting `main`

### Configuration

The workflow is defined in `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci --legacy-peer-deps
      - run: npm test
      - run: npm run build
```

## Contributing

See `AGENTS.md` for AI agent onboarding and development guidelines.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a detailed history of changes.

## License

MIT
