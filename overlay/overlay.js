class ChessPuzzleOverlay {
  constructor() {
    this.chessGame = null;
    this.puzzleGenerator = null;
    this.timer = null;
    this.puzzleSolved = false;
    this.solvedAnimationUrl = chrome.runtime.getURL('images/solved.webm');
  }

  async injectOverlay() {
    console.log("Injecting overlay");
    
    try {
      // Load HTML
      const htmlUrl = chrome.runtime.getURL('overlay/overlay.html');
      const htmlResponse = await fetch(htmlUrl);
      const htmlText = await htmlResponse.text();

      // Load CSS
      const cssUrl = chrome.runtime.getURL('overlay/overlay.css');
      const cssResponse = await fetch(cssUrl);
      const cssText = await cssResponse.text();

      // Combine HTML and CSS
      const combinedHTML = `
        <style>${cssText}</style>
        ${htmlText}
      `;

      // Inject the combined HTML and CSS into the page
      document.body.insertAdjacentHTML('beforeend', combinedHTML);

      // Set the solved animation URL
      document.getElementById('solvedAnimation').src = this.solvedAnimationUrl;

      // Initialize event listeners and other necessary setup
      this.initializeOverlayElements();
    } catch (error) {
      console.error('Error injecting overlay:', error);
    }
  }

  initializeOverlayElements() {
    document.getElementById('closeOverlay').addEventListener('click', this.closeOverlay.bind(this));
    document.getElementById('showHint').addEventListener('click', this.showHint.bind(this));
    document.getElementById('undoMove').addEventListener('click', this.undoMove.bind(this));
    document.getElementById('redoMove').addEventListener('click', this.redoMove.bind(this));
    document.getElementById('skipPuzzle').addEventListener('click', this.skipPuzzle.bind(this));
  }

  initializeOverlay() {
    this.chessGame = new ChessGame('chessboard', {
      boardId: 'chessboard',
      onMove: this.onMove.bind(this),
      onPuzzleSolved: this.onPuzzleSolved.bind(this)
    });
    this.chessGame.init();
    this.puzzleGenerator = new PuzzleGenerator();
  }

  onMove(move) {
    // This method can be used for any additional logic needed after a move
    // The correctness of the move is now handled in the ChessGame class
  }

  onPuzzleSolved() {
    this.endPuzzle(true);
    this.playSolvedAnimation();
  }

  playSolvedAnimation() {
    const video = document.getElementById('solvedAnimation');
    video.style.display = 'block';
    video.currentTime = 0;  // Reset to the beginning
    video.play().then(() => {
      video.onended = () => {
        video.style.display = 'none';
      };
    }).catch(error => {
      console.error('Error playing video:', error);
      video.style.display = 'none';
    });
  }

  async showOverlay() {
    await this.injectOverlay();
    this.initializeOverlay();
    document.getElementById('chessOverlay').style.display = 'flex';
    this.loadNewPuzzle();
    this.startTimer();
  }

  async loadNewPuzzle() {
    try {
      const puzzle = await this.puzzleGenerator.getRandomPuzzle();
      this.chessGame.setPuzzle(puzzle.fen, puzzle.moves);
      this.puzzleSolved = false;
      this.updatePuzzleInfo(puzzle);
    } catch (error) {
      console.error('Error loading puzzle:', error);
      // Handle the error appropriately (e.g., show a message to the user)
    }
  }

  updatePuzzleInfo(puzzle) {
    document.getElementById('puzzlePrompt').textContent = `Solve this puzzle to continue browsing`;
    document.getElementById('puzzleElo').textContent = `Puzzle Elo: ${puzzle.elo}`;
  }

  startTimer() {
    let timeLeft = 300; // 5 minutes
    this.timer = setInterval(() => {
      timeLeft--;
      document.getElementById('timerDisplay').textContent = `Time left: ${timeLeft}s`;
      if (timeLeft <= 0) {
        this.endPuzzle(false);
      }
    }, 1000);
  }

  endPuzzle(solved) {
    clearInterval(this.timer);
    this.puzzleSolved = solved;
    document.getElementById('closeOverlay').disabled = false;
    document.getElementById('puzzlePrompt').textContent = solved ? 'Puzzle solved! You can close the overlay.' : 'Time\'s up! You can close the overlay.';
    if (solved) {
      this.playSolvedAnimation();
    }
  }

  closeOverlay() {
    if (this.puzzleSolved) {
      document.getElementById('chessOverlay').remove();
      chrome.runtime.sendMessage({action: "overlayCompleted", solved: true});
      chessPuzzleOverlay = null;  // Reset the global reference
    }
  }

  showHint() {
    const hint = this.puzzleGenerator.getHint();
    alert(hint); // You might want to display this in a more user-friendly way
  }

  undoMove() {
    this.chessGame.undoMove();
  }

  redoMove() {
    this.chessGame.redoMove();
  }

  skipPuzzle() {
    this.endPuzzle(false);
    this.loadNewPuzzle();
  }
}

let chessPuzzleOverlay = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request);
  if (request.action === "showOverlay") {
    if (chessPuzzleOverlay) {
      chessPuzzleOverlay.closeOverlay();  // Remove existing overlay if present
    }
    chessPuzzleOverlay = new ChessPuzzleOverlay();
    chessPuzzleOverlay.showOverlay();
  }
});

console.log("Overlay script ready");