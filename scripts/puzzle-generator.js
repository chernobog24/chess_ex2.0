class PuzzleGenerator {
  constructor() {
    this.puzzles = [];
    this.currentPuzzle = null;
    this.usedPuzzles = new Set();
    this.loaded = false;

    this.loadPuzzles();
  }

  loadPuzzles() {
    return fetch(chrome.runtime.getURL('Puzzles/puzzles.json'))
      .then(response => response.json())
      .then(data => {
        this.puzzles = data;
        this.loaded = true;
        console.log('Puzzles loaded:', this.puzzles.length);
      })
      .catch(err => {
        console.error('Failed to load puzzles:', err);
        this.loaded = false;
      });
  }

  async getRandomPuzzle() {
    if (!this.loaded) {
      await this.loadPuzzles();
    }

    console.log('Puzzles available:', this.puzzles.length);
    if (this.puzzles.length === 0) {
      this.resetPuzzles();
    }

    if (this.puzzles.length === 0) {
      throw new Error('No puzzles available');
    }

    const index = Math.floor(Math.random() * this.puzzles.length);
    this.currentPuzzle = this.puzzles.splice(index, 1)[0];
    this.usedPuzzles.add(this.currentPuzzle);
    console.log('Current puzzle:', this.currentPuzzle);
    console.log('Moves:', this.currentPuzzle.Moves);
    return {
      fen: this.currentPuzzle.FEN,
      moves: this.currentPuzzle.Moves.split(' '),
      tags: this.currentPuzzle.Themes.split(' ')
    };
  }

  resetPuzzles() {
    this.puzzles = [...this.usedPuzzles];
    this.usedPuzzles.clear();
  }

  checkSolution(moves) {
    if (!this.currentPuzzle) return false;

    const solutionMoves = this.currentPuzzle.Moves.split(' ');
    return moves.join(' ') === solutionMoves.join(' ');
  }

  getCurrentPuzzleDifficulty() {
    if (!this.currentPuzzle) return null;

    const rating = this.currentPuzzle.Rating;
    if (rating >= 2000) return 'Hard';
    if (rating >= 1500) return 'Medium';
    return 'Easy';
  }

  getHint() {
    if (!this.currentPuzzle) return null;

    const firstMove = this.currentPuzzle.Moves.split(' ')[0];
    return `Try moving from ${firstMove.slice(0, 2)} to ${firstMove.slice(2, 4)}`;
  }
}

window.PuzzleGenerator = PuzzleGenerator;