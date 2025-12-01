/**
 * EvaluationBar Component
 * 
 * Displays the chess position evaluation from Stockfish.
 * Shows evaluation from White's perspective, with visual orientation
 * that flips based on which color the player is playing.
 */

import React from 'react';
import { GameMode, Color } from '../lib/constants';

interface EvaluationBarProps {
  currentEvaluation: number;    // Evaluation in centipawns (from White's perspective)
  mateInMoves: number | null;   // Mate-in-X (positive = White mating, negative = Black mating)
  gameMode: GameMode;
  playerColor: Color;
}

export default function EvaluationBar({
  currentEvaluation,
  mateInMoves,
  gameMode,
  playerColor
}: EvaluationBarProps) {
  // Always use White's perspective for evaluation values
  const displayEval = currentEvaluation;
  
  // Mate display - always from White's perspective
  const displayMate = mateInMoves;
  
  // For mate positions, show full bar advantage
  const barEval = displayMate !== null 
    ? (displayMate > 0 ? 1000 : -1000) 
    : displayEval;
  
  // Flip colors when playing as Black (Black on bottom, White on top)
  const isPlayingBlack = (gameMode === 'ai' || gameMode === 'trainer') && playerColor === 'black';
  
  // Calculate heights - positive eval = White better, negative = Black better
  // When playing White: White on bottom (grows with positive eval)
  // When playing Black: Black on bottom (grows with negative eval)
  const whiteHeight = Math.max(0, Math.min(100, 50 + (barEval / 10)));
  const blackHeight = Math.max(0, Math.min(100, 50 - (barEval / 10)));

  return (
    <div className="flex flex-col w-12">
      <div className="flex-1 bg-gradient-to-b from-gray-800 to-gray-700 rounded-lg overflow-hidden relative shadow-lg">
        {/* Top color area */}
        <div 
          className={`absolute top-0 left-0 right-0 transition-all duration-300 ${
            isPlayingBlack 
              ? 'bg-gradient-to-b from-gray-100 to-white'  // White on top when playing Black
              : 'bg-gradient-to-b from-gray-900 to-gray-800' // Black on top when playing White
          }`}
          style={{ 
            height: `${isPlayingBlack ? whiteHeight : blackHeight}%` 
          }}
        />
        {/* Bottom color area */}
        <div 
          className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
            isPlayingBlack
              ? 'bg-gradient-to-t from-gray-900 to-gray-800' // Black on bottom when playing Black
              : 'bg-gradient-to-t from-gray-100 to-white' // White on bottom when playing White
          }`}
          style={{ 
            height: `${isPlayingBlack ? blackHeight : whiteHeight}%` 
          }}
        />
        {/* Center line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-500 transform -translate-y-1/2" />
        {/* Evaluation number or Mate indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          {displayMate !== null ? (
            <div className={`text-xs font-bold px-1 py-0.5 rounded ${
              displayMate > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
              M{Math.abs(displayMate)}
            </div>
          ) : (
            <div className={`text-xs font-bold px-1 py-0.5 rounded ${
              displayEval > 0 ? 'bg-white/90 text-gray-900' : 'bg-gray-900/90 text-white'
            }`}>
              {displayEval > 0 ? '+' : ''}{(displayEval / 100).toFixed(1)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
