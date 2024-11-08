class ChessGame {
  constructor(boardId, config = {}) {
    this.game = new Chess();
    this.boardConfig = {
      draggable: true,
      dropOffBoard: 'snapback',
      position: 'start',
      onDragStart: this.onDragStart.bind(this),
      onDrop: this.onDrop.bind(this),
      onSnapEnd: this.onSnapEnd.bind(this),
      onMouseoutSquare: this.onMouseoutSquare.bind(this),
      onMouseoverSquare: this.onMouseoverSquare.bind(this),
      pieceTheme: function(piece) {
        return chrome.runtime.getURL('libs/chessboardjs-1.0.0/img/chesspieces/wikipedia/' + piece + '.png');
      },
      ...config
    };
    this.board = null;
    this.onMoveCallback = config.onMove || (() => {});
    this.onPuzzleSolvedCallback = config.onPuzzleSolved || (() => {});
    this.onWrongMoveCallback = config.onWrongMove || (() => {});
    this.puzzleMoves = [];
    this.currentMoveIndex = 0;
    this.hintSquare = null;
    this.moveHistory = [];
    this.redoStack = [];
    this.solved = false;
  }

  // Initialization
  init() {
    this.board = Chessboard(this.boardConfig.boardId, this.boardConfig);
  }

  setPuzzle(fen, moves) {
    this.game.load(fen);
    this.board.position(fen);
    this.puzzleMoves = moves;
    this.currentMoveIndex = 0;
    this.moveHistory = [];
    this.redoStack = [];
    this.solved = false;
    this.makeNextMove(); // Make the initial opponent move
  }

  // Game State Management
  isPuzzleSolved() {
    return this.currentMoveIndex >= this.puzzleMoves.length;
  }

  isCorrectMove(move) {
    const expectedMove = this.puzzleMoves[this.currentMoveIndex];
    return move.from + move.to === expectedMove;
  }

  
  makeNextMove() {
    if (this.isPuzzleSolved()) return;

    const move = this.puzzleMoves[this.currentMoveIndex];
    const result = this.game.move({
      from: move.slice(0, 2),
      to: move.slice(2, 4),
      promotion: 'q'
    });

    this.board.position(this.game.fen(), true); // Animate the move
    this.highlightMove(result);
    this.currentMoveIndex++;
    this.moveHistory.push(result);
    this.redoStack = []; // Clear redo stack after a new move

    if (this.isPuzzleSolved() && !this.solved) {
      this.solved = true;
      this.onPuzzleSolvedCallback();
    }
  }

  // Move Handling
  onDragStart(source, piece) {
    if (this.game.game_over() || this.solved) return false;
    if ((this.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (this.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
      return false;
    }
  }

  onDrop(source, target) {
    // If we're not at the current move, reset to current position
    if (this.moveHistory.length !== this.currentMoveIndex) {
      this.resetToCurrentMove();
      return 'snapback';
    }

    const move = this.game.move({
      from: source,
      to: target,
      promotion: 'q'
    });
    
    if (move === null) return 'snapback';

    if (this.isCorrectMove(move)) {
      this.removeHighlights();
      this.highlightMove(move);
      this.currentMoveIndex++;
      this.moveHistory.push(move);
      this.redoStack = []; // Clear redo stack after a new move
      this.onMoveCallback(move);
      
      if (!this.isPuzzleSolved()) {
        setTimeout(() => this.makeNextMove(), 300);
      } else if (!this.solved) {
        this.solved = true;
        this.onPuzzleSolvedCallback();
      }
      
      return move;
    } else {
      this.game.undo();
      this.onWrongMoveCallback();
      return 'snapback';
    }
  }

  onSnapEnd() {
    this.board.position(this.game.fen());
  }

  undoMove() {
    if (this.moveHistory.length > 0) {
      const move = this.moveHistory.pop();
      this.game.undo();
      this.redoStack.push(move);
      this.board.position(this.game.fen());
      this.currentMoveIndex--;
      this.removeHighlights();
    }
  }

  redoMove() {
    if (this.redoStack.length > 0) {
      const move = this.redoStack.pop();
      this.game.move(move);
      this.moveHistory.push(move);
      this.board.position(this.game.fen());
      this.currentMoveIndex++;
      this.highlightMove(move);
    }
  }

  resetToCurrentMove() {
    this.game.reset();
    this.board.position('start');
    this.moveHistory.slice(0, this.currentMoveIndex).forEach(move => {
      this.game.move(move);
    });
    this.board.position(this.game.fen());
    this.removeHighlights();
  }

  // Board Interaction
  onMouseoverSquare(square) {
    if (this.solved) return;
    const moves = this.game.moves({ square: square, verbose: true });
    if (moves.length === 0) return;

    moves.forEach(move => this.highlightSquare(move.to));
  }

  onMouseoutSquare() {
    this.removeHighlights();
  }

  // Highlighting
  highlightSquare(square) {
    $(`#${this.boardConfig.boardId} .square-${square}`).addClass('highlight-square');
  }

  removeHighlights() {
    $(`#${this.boardConfig.boardId} .square-55d63`).removeClass('highlight-square');
    if (this.hintSquare) {
      $(`#${this.boardConfig.boardId} .square-${this.hintSquare}`).removeClass('highlight-hint');
      this.hintSquare = null;
    }
  }

  removeMoveHighlights() {
    $(`#${this.boardConfig.boardId} .square-55d63`).removeClass('highlight-move');
  }

  highlightMove(move) {
    this.removeMoveHighlights();
    $(`#${this.boardConfig.boardId} .square-${move.from}`).addClass('highlight-move');
    $(`#${this.boardConfig.boardId} .square-${move.to}`).addClass('highlight-move');
  }

  // Utility Functions
  setPosition(fen) {
    this.game.load(fen);
    this.board.position(fen);
  }

  reset() {
    this.game.reset();
    this.board.start();
    this.puzzleMoves = [];
    this.currentMoveIndex = 0;
    this.moveHistory = [];
    this.redoStack = [];
    this.solved = false;
  }

  getHint() {
    if (this.solved || this.currentMoveIndex >= this.puzzleMoves.length) return;

    const hintMove = this.puzzleMoves[this.currentMoveIndex];
    const fromSquare = hintMove.slice(0, 2);
    
    this.removeHighlights();
    $(`#${this.boardConfig.boardId} .square-${fromSquare}`).addClass('highlight-hint');
    this.hintSquare = fromSquare;
  }
}

window.ChessGame = ChessGame;