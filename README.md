# Chess App (Next.js + TypeScript + Tailwind + Supabase)

A modern chess application with multiple training modes, AI opponent, and opening analysis. Features a **Move Trainer mode** with Stockfish integration that color-codes moves by quality.

## Features

### Current Features ✅
- **Play vs Human**: Two-player local chess game
- **Play vs AI**: Play against a simulated AI opponent (random moves currently)
- **Move Trainer Mode**: 
  - Real-time Stockfish 17.1 engine analysis
  - Color-coded move hints (green = best, red = blunder)
  - Compare moves to global best in position
  - Top 20 moves analyzed at depth 15
  - Moves outside top 20 marked as blunders
  - **Evaluation bar showing position strength from White's perspective**
- **Chess Rules Implemented**:
  - All piece movements (pawns, knights, bishops, rooks, queens, kings)
  - Castling (kingside and queenside)
  - En passant capture
  - Pawn promotion (to Queen)
  - Check detection and visualization
  - Checkmate and stalemate detection
- **Beautiful SVG Pieces**: High-quality Wikipedia Commons chess pieces
- **Move History**: Track all moves in algebraic notation with chess piece symbols
- **Opening Explorer**: Integration with Lichess API for opening statistics
- **Game Persistence**: Save games to Supabase (optional)
- **Responsive Design**: Beautiful gradient UI with Tailwind CSS

### Planned Features 🚧
1. **Enhanced AI** (Next Priority)
   - Use Stockfish for actual AI moves (currently random)
   - Adjustable difficulty levels

2. **Opening Trainer Mode** (Planned)
   - Custom opening repertoire database
   - Practice specific opening lines
   - Retry mechanism for incorrect moves
   - Progress tracking

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
- Play as white against the computer (black)
- AI makes moves automatically after your turn
- Currently uses random legal moves (Stockfish integration coming)

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
- Toggle hints on/off with the "Hints On" button

## Technology Stack

- **Next.js 15.5.4**: React framework with App Router
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

- [ ] Improve AI with actual Stockfish moves (not random)
- [ ] Add Opening Trainer mode with repertoire system
- [ ] Add adjustable engine difficulty levels
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
