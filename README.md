# Chess Puzzle Extension

This Chrome extension provides an interactive chess puzzle solving experience. It helps users improve their chess skills by presenting them with timed puzzles during their browsing sessions.

## Features

- Timed chess puzzles that appear as overlays on specified websites
- Customizable timer duration and website list
- Interactive chessboard with drag-and-drop functionality
- Puzzle difficulty levels (Easy, Medium, Hard)
- Hint system for challenging puzzles
- Settings page for customization

## Project Structure

- `manifest.json`: The extension manifest file
- `background/`: Contains the service worker for the extension
  - `service-worker.js`: Manages the background processes, including timers and messaging
- `images/`: Icon images for the extension
- `overlay/`: Contains the overlay functionality
  - `overlay.js`: Manages the chess puzzle overlay display and interaction
- `popup/`: Contains the extension popup
  - `popup.html`: HTML structure for the popup
  - `popup.css`: Styles for the popup
  - `popup.js`: JavaScript for popup functionality
- `scripts/`: Contains the main chess game and puzzle generator scripts
  - `chess-game.js`: Implements the chess game logic
  - `puzzle-generator.js`: Manages puzzle generation and difficulty
- `settings/`: Contains the settings page
  - `settings.html`: HTML structure for the settings page
  - `settings.css`: Styles for the settings page
  - `settings.js`: JavaScript for settings functionality
- `styles/`: Contains additional styles
  - `chessboard.css`: Styles for the chessboard

## Libraries

The `libs/` directory is not included in this repository. You need to obtain the following libraries:

- chess.js: A JavaScript chess library for chess move generation/validation, piece placement/movement, and check/checkmate/draw detection
- jquery.min.js: jQuery library for DOM manipulation
- chessboard.js (version 1.0.0): A JavaScript chessboard library

Place these files in the `libs/` directory.

## Puzzles

The `Puzzles/` directory is not included in this repository. To get the puzzles:

1. Download the puzzle database from Lichess: [Lichess Puzzle Database](https://database.lichess.org/#puzzles)
2. Format the puzzles according to the Lichess puzzle format. Each puzzle should have the following structure:
   ```json
   {
     "PuzzleId": "unique_id",
     "FEN": "chess_position_in_FEN_notation",
     "Moves": "move1 move2 move3 ...",
     "Rating": 1500,
     "Themes": "theme1 theme2 theme3"
   }
   ```
3. Use the `puzzleutils.py` script in the `Puzzles/` directory to process and prepare the puzzles for use in the extension. This script should convert the Lichess puzzle format into the format used by the extension.

## Setup

1. Clone this repository
2. Obtain the required libraries and place them in the `libs/` directory
3. Prepare the puzzles and place them in the `Puzzles/` directory
4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the directory containing this project

## Usage

1. Click on the extension icon in Chrome to open the popup
2. Use the Settings page to customize:
   - Websites where puzzles will appear
   - Timer duration for puzzles
3. Browse the web normally. When visiting a specified website, a chess puzzle will appear after the set duration
4. Solve the puzzle to continue browsing, or wait for the timer to expire

## Development

To modify or extend the extension:

1. Edit the relevant files in the project structure
2. For major changes, update the `manifest.json` file accordingly
3. Reload the extension in Chrome to see your changes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).
