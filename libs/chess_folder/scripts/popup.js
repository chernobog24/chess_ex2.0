document.addEventListener('DOMContentLoaded', function() {
  var board, game = new Chess();
  var $board = $('#myBoard')
  var squareToHighlight = null
  var squareClass = 'square-55d63'
  // Configuration for the chessboard
  var boardConfig = {
    draggable: true, // Allow pieces to be draggable
    dropOffBoard: 'trash', // Allow pieces to be dropped off board
    pieceTheme: 'chessboardjs-1.0.0/img/chesspieces/wikipedia/{piece}.png', // Path to the chess pieces images
    position: 'start', // Set up the initial position
    onDrop: onDrop, // Handler for when a piece is dropped
    onSnapEnd: onSnapEnd, // Handler for when a piece snap is completed
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
    onDragStart: onDragStart // Handler for when a piece is dragged
  };

  // Initialize the chessboard with the configuration
  board = Chessboard('chessboard', boardConfig);

  function onDragStart (source, piece) {
    // do not pick up pieces if the game is over
    if (game.game_over()) return false
  
    // or if it's not that side's turn
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
      return false
    }
  }

  // Handler for when a piece is dropped
  function onDrop(source, target) {
    var move = game.move({
      from: source,
      to: target,
      promotion: 'q' // Default to promoting to a queen
    });
    
    if (move === null) return 'snapback'; // If the move is illegal, snap the piece back
    removeHighlights(); // Remove any existing highlights
    updateHighlights(move); // Highlight the move
  }

  // Handler for when the piece snap animation is completed
  function onSnapEnd() {
    board.position(game.fen()); // Update the board position to the new FEN
  }

  // Function to highlight the squares for the last move
  function updateHighlights(move) {
    highlightSquare(move.from);
    highlightSquare(move.to);
  }

  // Function to add a highlight to a square
  function highlightSquare(square) {
    var squareEl = $('#chessboard .square-' + square);
    var background = '#a9a9a9'; // Light gray for highlights
    if (squareEl.hasClass('black-3c85d')) {
      background = '#696969'; // Darker gray for dark squares
    }
    squareEl.css('background', background); // Apply the background
  }

  // Function to remove highlights from all squares
  function removeHighlights() {
    $('#chessboard .square-55d63').css('background', ''); // Clear the background
  }

  // Function to show legal moves for a piece
  function onMouseoverSquare (square, piece) {
    // get list of possible moves for this square
    var moves = game.moves({
      square: square,
      verbose: true
    })
  
    // exit if there are no moves available for this square
    if (moves.length === 0) return
  
    // highlight the square they moused over
    greenSquare(square,'green')
  
    // highlight the possible squares for this piece
    for (var i = 0; i < moves.length; i++) {
      greenSquare(moves[i].to)
    }
  }
  
  function onMouseoutSquare (square, piece) {
    removegreenSquares('green')
  }

  // Function to remove highlights from all squares
  function removegreenSquares (color) {
    $board.find('.' + squareClass)
      .removeClass('highlight-' + color)
  }
  
  // Function to add a highlight to a square
  function greenSquare (square,color) {
    removeHighlights(color)
    $board.find('.square-' + square).addClass('highlight-green')
  }

  // Function to load a random chess puzzle
  function loadRandomPuzzle() {
    // Example FEN; in a real app, this would be replaced with a random puzzle generator or API call
    var randomFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 0 3';
    game.load(randomFen);
    board.position(randomFen); // Set the board to the puzzle's starting position
  }

  // Load a random puzzle when the document is ready
  loadRandomPuzzle();
});