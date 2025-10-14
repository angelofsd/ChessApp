// Stockfish WebWorker wrapper
// This loads the actual Stockfish engine

let stockfish = null;

// Load Stockfish engine
try {
  importScripts('/stockfish.js');
  stockfish = Stockfish();
} catch (e) {
  console.error('Failed to load Stockfish:', e);
}

// Forward messages between main thread and Stockfish
self.onmessage = function(e) {
  if (stockfish) {
    stockfish.postMessage(e.data);
  }
};

// Forward Stockfish output to main thread
if (stockfish) {
  stockfish.onmessage = function(e) {
    self.postMessage(e.data);
  };
}
