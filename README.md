# Chess App (Next.js + TypeScript + Tailwind + Supabase)

A modern chess application with multiple training modes, AI opponent, and opening analysis. Features a **Move Trainer mode** with Stockfish integration that color-codes moves by quality.

## Features

### Current Features ✅
- **Play vs Human**: Two-player local chess game with full chess rules
- **Play vs AI**: 
  - Four difficulty levels: **Easy**, **Medium**, **Hard**, **Expert**
  - **Play as White or Black**: Choose your side with board auto-flip
  - **Optional evaluation bar**: Toggle to see position analysis
  - Easy: Random moves (great for beginners)
  - Medium: Stockfish depth 10, weighted selection (60%/25%/15%)
  - Hard: Stockfish depth 15, weighted selection (80%/15%/5%)
  - Expert: Stockfish depth 20, always best move
  - **Mate-in-X detection**: Shows M2, M3, etc. on evaluation bar
- **Move Trainer Mode**: 
  - Real-time Stockfish 17.1 engine analysis
  - Color-coded move hints (green = best, red = blunder)
  - Compare moves to global best in position
  - Top 20 moves analyzed at depth 15
  - Moves outside top 20 marked as blunders
  - **Evaluation bar showing position strength from White's perspective**
  - **Mate-in-X display**: Shows M2, M3, etc. when checkmate is forced
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
│   └── supabase.ts           # Supabase client setup
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
- **Choose your difficulty**: Easy, Medium, Hard, or Expert
- **Play as White or Black**: Select your color - board flips automatically when playing Black
- AI makes moves automatically after your turn
- **Easy**: Perfect for beginners - completely random legal moves
- **Medium**: Challenging - thinks 10 moves ahead, varies its play
- **Hard**: Strong - thinks 15 moves ahead, plays near-optimal
- **Expert**: Maximum strength - thinks 20 moves ahead, always best move
- **Evaluation bar** (optional): Toggle with 📊 button to see position analysis
- **Mate detection**: Shows M2, M3, etc. when checkmate is forced

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
- [ ] Unit tests and CI/CD

## Contributing

See `AGENTS.md` for AI agent onboarding and development guidelines.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a detailed history of changes.

## License

MIT
