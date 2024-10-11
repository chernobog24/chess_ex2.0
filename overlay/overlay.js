console.log("Overlay script loaded");

class ChessPuzzleOverlay {
  constructor() {
    this.chessGame = null;
    this.puzzleGenerator = null;
    this.timer = null;
    this.puzzleSolved = false;
    this.solvedAnimationUrl = chrome.runtime.getURL('images/solved.webm');
  }

  injectOverlay() {
    console.log("Injecting overlay");
    const overlayHTML = `
    <style>
      #chessOverlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }
      #puzzleContainer {
        background: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 0 20px rgba(0,0,0,0.3);
      }
      #chessboard {
        width: 600px;
        height: 600px;
        margin-bottom: 20px;
      }
      #puzzleInfo {
        text-align: center;
        margin-top: 20px;
        font-family: Arial, sans-serif;
      }
      #puzzlePrompt {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
      }
      #puzzleElo {
        font-size: 16px;
        color: #666;
        margin-bottom: 10px;
      }
      #timerDisplay {
        font-size: 16px;
        color: #333;
      }
      #closeOverlay {
        margin-top: 20px;
        padding: 10px 20px;
        font-size: 16px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s;
      }
      #closeOverlay:hover {
        background-color: #45a049;
      }
      #closeOverlay:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
      }
      .piece-417db {
        z-index: 10000 !important;
      }
      .highlight-green {
        box-shadow: inset 0 0 3px 3px green;
      }
      .highlight-move {
        background-color: rgba(255, 255, 0, 0.5) !important;
      }
      .highlight-square::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 25%;
        height: 25%;
        background-color: rgba(10, 128, 10, 0.5);
        border-radius: 50%;
        z-index: 10;
      }
      #solvedAnimation {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10001;
        display: none;
        width: 100px;
        height: auto;
      }
    </style>
    <div id="chessOverlay">
      <div id="puzzleContainer">
        <div id="chessboard"></div>
        <div id="puzzleInfo">
          <p id="puzzlePrompt">Solve the puzzle to continue browsing</p>
          <p id="puzzleElo"></p>
          <p id="timerDisplay"></p>
        </div>
        <button id="closeOverlay" disabled>Close</button>
      </div>
      <video id="solvedAnimation" src="${this.solvedAnimationUrl}" muted></video>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', overlayHTML);
  }
  initializeOverlay() {
    this.chessGame = new ChessGame('chessboard', {
      boardId: 'chessboard',
      onMove: this.onMove.bind(this),
      onPuzzleSolved: this.onPuzzleSolved.bind(this)
    });
    this.chessGame.init();
    this.puzzleGenerator = new PuzzleGenerator();
    document.getElementById('closeOverlay').addEventListener('click', this.closeOverlay.bind(this));
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

  showOverlay() {
    this.injectOverlay();
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
    }, 1825);
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
    if (this.puzzleSolved || document.getElementById('closeOverlay').disabled === false) {
      document.getElementById('chessOverlay').style.display = 'none';
      chrome.runtime.sendMessage({action: "overlayCompleted", solved: this.puzzleSolved});
    }
  }

  getHint() {
    return this.puzzleGenerator.getHint();
  }
}

let chessPuzzleOverlay = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request);
  if (request.action === "showOverlay") {
    if (!chessPuzzleOverlay) {
      chessPuzzleOverlay = new ChessPuzzleOverlay();
    }
    chessPuzzleOverlay.showOverlay();
  }
});

console.log("Overlay script ready");