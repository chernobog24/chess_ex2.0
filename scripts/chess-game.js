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
    this.puzzleMoves = [];
    this.currentMoveIndex = 0;
  }

  init() {
    this.board = Chessboard(this.boardConfig.boardId, this.boardConfig);
  }

  setPuzzle(fen, moves) {
    this.game.load(fen);
    this.board.position(fen);
    this.puzzleMoves = moves;
    this.currentMoveIndex = 0;
    this.makeNextMove(); // Make the initial opponent move
  }

  onDragStart(source, piece) {
    if (this.game.game_over() || this.isPuzzleSolved()) return false;
    if ((this.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (this.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
      return false;
    }
  }

  onDrop(source, target) {
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
      this.onMoveCallback(move);
      
      if (!this.isPuzzleSolved()) {
        setTimeout(() => this.makeNextMove(), 300);
      } else {
        this.onPuzzleSolvedCallback();
      }
      
      return move;
    } else {
      this.game.undo();
      return 'snapback';
    }
  }

  onSnapEnd() {
    this.board.position(this.game.fen());
  }

  onMouseoverSquare(square) {
    if (this.isPuzzleSolved()) return;
    const moves = this.game.moves({ square: square, verbose: true });
    if (moves.length === 0) return;

    moves.forEach(move => this.highlightSquare(move.to));
  }

  onMouseoutSquare() {
    this.removeHighlights();
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

    if (this.isPuzzleSolved()) {
      this.onPuzzleSolvedCallback();
    }
  }

  isPuzzleSolved() {
    return this.currentMoveIndex >= this.puzzleMoves.length;
  }

  highlightSquare(square) {
    $(`#${this.boardConfig.boardId} .square-${square}`).addClass('highlight-square');
  }

  removeHighlights() {
    $(`#${this.boardConfig.boardId} .square-55d63`).removeClass('highlight-square');
  }

  removeMoveHighlights() {
    $(`#${this.boardConfig.boardId} .square-55d63`).removeClass('highlight-move');
  }

  highlightMove(move) {
    this.removeMoveHighlights();
    $(`#${this.boardConfig.boardId} .square-${move.from}`).addClass('highlight-move');
    $(`#${this.boardConfig.boardId} .square-${move.to}`).addClass('highlight-move');
  }

  setPosition(fen) {
    this.game.load(fen);
    this.board.position(fen);
  }

  reset() {
    this.game.reset();
    this.board.start();
    this.puzzleMoves = [];
    this.currentMoveIndex = 0;
  }
}

window.ChessGame = ChessGame;