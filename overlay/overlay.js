class ChessPuzzleOverlay {
  constructor(overlayData) {
    // Initialize core components
    this.chessGame = null;
    this.puzzleGenerator = null;
    this.solvedAnimationUrl = chrome.runtime.getURL('images/solved.webm');
    
    // Set up data from service worker
    this.currentElo = overlayData.currentElo;
    this.currentSession = overlayData.currentSession;
    this.maxSessions = overlayData.maxSessions;
    this.globalSettings = overlayData.globalSettings;
    this.websiteSettings = overlayData.websiteSettings;
    
    // Initialize state variables
    this.puzzleSolved = false;
    this.timeAdded = 0;
    this.timerInterval = null;
  }

  // Overlay Setup
  async injectOverlay() {
    console.log("Injecting overlay");
    try {
      const htmlUrl = chrome.runtime.getURL('overlay/overlay.html');
      const cssUrl = chrome.runtime.getURL('overlay/overlay.css');
      const [htmlResponse, cssResponse] = await Promise.all([
        fetch(htmlUrl),
        fetch(cssUrl)
      ]);
      const [htmlText, cssText] = await Promise.all([
        htmlResponse.text(),
        cssResponse.text()
      ]);

      const combinedHTML = `<style>${cssText}</style>${htmlText}`;
      document.body.insertAdjacentHTML('beforeend', combinedHTML);

      document.getElementById('solvedAnimation').src = this.solvedAnimationUrl;
      this.initializeOverlayElements();
    } catch (error) {
      console.error('Error injecting overlay:', error);
    }
  }

  initializeOverlayElements() {
    const elements = ['closeOverlay', 'showHint', 'undoMove', 'redoMove', 'skipPuzzle'];
    elements.forEach(id => {
      document.getElementById(id).addEventListener('click', this[id].bind(this));
    });
  }

  initializeOverlay() {
    this.chessGame = new ChessGame('chessboard', {
      boardId: 'chessboard',
      onMove: this.onMove.bind(this),
      onPuzzleSolved: this.onPuzzleSolved.bind(this),
      onWrongMove: this.onWrongMove.bind(this)
    });
    this.chessGame.init();
    this.puzzleGenerator = new PuzzleGenerator();
    this.updateSessionInfo();
  }

  async showOverlay() {
    await this.injectOverlay();
    this.initializeOverlay();
    document.getElementById('chessOverlay').style.display = 'flex';
    this.loadNewPuzzle();
    this.startTimer();
  }
   
  // Puzzle Management
  async loadNewPuzzle() {
    try {
      const puzzle = await this.puzzleGenerator.getRandomPuzzle(this.currentElo);
      this.chessGame.setPuzzle(puzzle.fen, puzzle.moves);
      this.updatePuzzleInfo(puzzle);
    } catch (error) {
      console.error('Error loading puzzle:', error);
      document.getElementById('puzzlePrompt').textContent = 'Error loading puzzle. Please try again.';
    }
  }

  updatePuzzleInfo(puzzle) {
    document.getElementById('puzzlePrompt').textContent = `Solve this puzzle to continue browsing`;
    document.getElementById('puzzleElo').textContent = `Puzzle Elo: ${puzzle.elo}`;
  }

   
  // Timer Management
  startTimer() {
    this.timeAdded = 0;
    this.updateTimerDisplay();
    this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
  }

  updateTimerDisplay() {
    document.getElementById('timerDisplay').textContent = `Time added: ${this.timeAdded}s`;
  }

  applyTimeBonus(seconds) {
    this.timeAdded += seconds;
    this.updateTimerDisplay();
  }

  applyTimePenalty(seconds) {
    this.timeAdded = Math.max(0, this.timeAdded - seconds);
    this.updateTimerDisplay();
  }

   
  // Event Handlers
  onMove(move) {
    // Additional logic for move events can be added here
  }

  onWrongMove() {
    this.applyTimePenalty(this.globalSettings.wrongMovePenalty);
  }

  onPuzzleSolved() {
    this.endPuzzle(true);
    this.playSolvedAnimation();
    this.applyTimeBonus(this.globalSettings.timeBonus);
  }

   
  // User Actions
  closeOverlay() {
    if (this.puzzleSolved) {
      document.getElementById('chessOverlay').remove();
      chrome.runtime.sendMessage({
        target: 'background', 
        action: "overlayCompleted", 
        solved: true,
        timeAdded: this.timeAdded
      });
      chessPuzzleOverlay = null;
    }
  }

  showHint() {
    const hint = this.chessGame.getHint();
    this.applyTimePenalty(this.globalSettings.hintPenalty);
    // TODO: Implement hint display logic (e.g., highlight the piece to move)
  }

  undoMove() {
    this.chessGame.undoMove();
  }

  redoMove() {
    this.chessGame.redoMove();
  }

  skipPuzzle() {
    if (!this.puzzleSolved) {
      this.applyTimePenalty(this.globalSettings.skipPenalty);
    }
    this.loadNewPuzzle();
  }

  // UI Updates
  updateSessionInfo() {
    const sessionInfoElement = document.getElementById('sessionInfo');
    if (sessionInfoElement) {
      sessionInfoElement.textContent = `Session ${this.currentSession}/${this.maxSessions} | Current ELO: ${this.currentElo}`;
    }
  }

  playSolvedAnimation() {
    const video = document.getElementById('solvedAnimation');
    video.style.display = 'block';
    video.currentTime = 0;
    video.play().then(() => {
      video.onended = () => {
        video.style.display = 'none';
      };
    }).catch(error => {
      console.error('Error playing video:', error);
      video.style.display = 'none';
    });
  }

  endPuzzle(solved) {
    clearInterval(this.timerInterval);
    this.puzzleSolved = solved;
    document.getElementById('closeOverlay').disabled = false;
    document.getElementById('puzzlePrompt').textContent = solved 
      ? 'Puzzle solved! You can close the overlay.' 
      : 'Time\'s up! You can close the overlay.';
    if (solved) {
      this.playSolvedAnimation();
    }
  }
}

 
// Global Event Listener
let chessPuzzleOverlay = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target === 'overlay') {
    console.log("Received message by overlay:", request);
    if (request.action === "showOverlay") {
      if (chessPuzzleOverlay) {
        chessPuzzleOverlay.closeOverlay();
      }
      chessPuzzleOverlay = new ChessPuzzleOverlay(request.data);
      chessPuzzleOverlay.showOverlay();
    }
  }
});

console.log("Overlay script ready");