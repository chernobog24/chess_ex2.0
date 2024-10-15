class PuzzleGenerator {
  constructor() {
    this.puzzles = {};
    this.currentPuzzle = null;
    this.loaded = false;

    this.loadPuzzles();
  }

  loadPuzzles() {
    return fetch(chrome.runtime.getURL('Puzzles/puzzles.json'))
      .then(response => response.json())
      .then(data => {
        this.puzzles = data;
        this.loaded = true;
        console.log('Puzzles loaded:', Object.keys(this.puzzles).length, 'ELO ranges');
      })
      .catch(err => {
        console.error('Failed to load puzzles:', err);
        this.loaded = false;
      });
  }

  async getRandomPuzzle(elo) {
    if (!this.loaded) {
      await this.loadPuzzles();
    }

    const roundedElo = Math.floor(elo / 100) * 100;
    const eloRange = `${roundedElo}-${roundedElo + 99}`;

    if (!this.puzzles[eloRange] || this.puzzles[eloRange].length === 0) {
      throw new Error(`No puzzles available for ELO range ${eloRange}`);
    }

    const puzzlesInRange = this.puzzles[eloRange];
    const index = Math.floor(Math.random() * puzzlesInRange.length);
    this.currentPuzzle = puzzlesInRange[index];

    console.log('Current puzzle:', this.currentPuzzle);
    console.log('Moves:', this.currentPuzzle.Moves);

    return {
      fen: this.currentPuzzle.FEN,
      moves: this.currentPuzzle.Moves.split(' '),
      tags: this.currentPuzzle.Themes.split(' '),
      elo: this.currentPuzzle.Rating
    };
  }

  getHint() {
    if (!this.currentPuzzle) return null;

    const firstMove = this.currentPuzzle.Moves.split(' ')[0];
    return `Try moving from ${firstMove.slice(0, 2)} to ${firstMove.slice(2, 4)}`;
  }
}

window.PuzzleGenerator = PuzzleGenerator;