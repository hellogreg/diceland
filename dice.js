/*jslint indent: 2, vars: true, plusplus: true, immed: true */
/*global alert: false, console: false, document: false, window: false, $: false,
confirm: false, setTimeout: false, clearTimeout: false, CanvasRenderingContext2D: false,
handleUserClick: false, handleUserMousemove: false, startPlayerTurn: false */

//// ^^^ Above: Instructions for Douglas Crockford's jslint JavaScript quality tool (jslint.com).


////
//// DICELAND
//// a game by Greg Gibson
////
//// Current Version 0.3.2 (Late 2011)
//// 0.3.x versions are for adding computer players. (Random as of 0.3.2.)
////


//// THE APP'S NAMESPACE
////

var DICE = DICE || {};


//// APP-WIDE HELPER FUNCTIONS: Array.shuffle(), DICE.setObjectProperties(), DICE.logger()
////

(function (namespace) {

  "use strict";

  // Add a shuffle() method to JavaScript's Array Object (randomizes one-dimensional arrays).
  // Uses Fisher-Yates shuffle (http://en.wikipedia.org/wiki/Fisher-Yates_shuffle).
  // The method used is adapted from this Stack Overflow thread: http://goo.gl/o76sb
  Array.prototype.shuffle = function () {
    var c = this.length, // The control index value
      r, // The random index value
      a; // Temporary array element holder
    if (c === 0) {
      return;
    }
    while (--c) {
      r = Math.floor(Math.random() * (c + 1));
      a = this[r];
      this[r] = this[c];
      this[c] = a;
    }
    return this;
  };

  // Add a setObjectProperties() method to the DICE object.
  // Enumerates properties from a source object and applies those values to a destination object.
  // (Verifies that destination object already has each property, so new ones aren't added.)
  namespace.setObjectProperties = function (sourceobj, destobj) {
    var propname;
    for (propname in sourceobj) {
      if ((sourceobj.hasOwnProperty(propname)) && (destobj[propname] !== undefined)) {
        destobj[propname] = sourceobj[propname];
      }
    }
  };

  // Add a logger() method to the DICE object.
  // Logs errors and status messages to the browser console.
  // Basically just makes sure there is a console. If so, posts log entry.
  namespace.logger = function (message) {
    if (window.console) {
      console.log(message);
    }
  };

}(DICE));


//// THE ACTUAL GAME: DICE.game()
////

DICE.game = function () {

  "use strict";

  //// GAME VARIABLES/CONSTANTS
  ////

  // Pseudo-constants (We'll pretend they're constants, since JS doesn't have real constants for all browsers.)
  var CANVASWIDTH = 320, // Total canvas width, in pixels
    CANVASHEIGHT = 320, // Total canvas height, in pixels
    MARGIN = 10, // Pixel buffer between the canvas edge and the gameboard
    PADDING = 12, // Pixel buffer between pieces
    ROWS = 4, // # of rows in gameboard grid
    COLUMNS = 4, // # of cols in gameboard grid
    ROWCOLMAX = Math.max(ROWS, COLUMNS), // Greater value between # of rows and # of columns
    COLUMNWIDTH = ((CANVASWIDTH - (MARGIN * 2) - ((COLUMNS + 1) * PADDING)) / COLUMNS), // Pixel width of each column
    ROWHEIGHT = ((CANVASHEIGHT - (MARGIN * 2) - ((ROWS + 1) * PADDING)) / ROWS), // Pixel height of each row 
    TOTALPIECES = (ROWS * COLUMNS), // # of gamepieces in use (saves recalculating this value in multiple for... loops throughout program)
    GAMESPEED = 1; // Raising this shortens pauses between player and computer turns. Default: 1. Dev testing: 2 or 3.

  // Other game-wide variables
  var player = [], // Array to hold the game's player info
    piece = [], // Array to hold the game's piece info
    attacker = false, // The current attacking piece
    defender = false, // The current defending piece
    currentPlayerId = 0, // The player whose turn it is
    displayStatus = true, // Whether to show status messages to the player
    timer = { // Associative array object to hold all setTimeout timers
      "display" : null, // A timer for showing/hiding status messages
      "computerAttack" : null, // a timer that represents the computer "thinking" about its move
      "playerAttack" : null, // A timer that forces a brief pause after the computer's turn
      "redrawBoard" : null // A timer for drawing the final gameboard a second or two after the game ends
    };

  // Shorthand aliases for the namespace-wide functions: DICE.logger() and DICE.setObjectProperties()
  var logger = DICE.logger,
    setObjectProperties = DICE.setObjectProperties;

  // Shorthand variables for referencing the game's canvas
  var canvas = $("#canvas"); // Create canvas.
  canvas.attr({ width: CANVASWIDTH, height: CANVASHEIGHT });
  var context = canvas[0].getContext("2d"); // Create canvas context.


  //// CANVAS EXTENDERS
  ////

  // Draw rectangles with rounded corners.
  context.drawRoundRectangle = function (x, y, width, height, radius, stroke, fill, strokestyle, fillstyle, linewidth, gradient) {
    this.strokeStyle = strokestyle;
    if (gradient) { // Prepare gradient fill
      var g = this.createLinearGradient(x, y, x + height * 6, y + width * 4);
      g.addColorStop(0, fillstyle);
      g.addColorStop(1, "#FFFFFF");
      this.fillStyle = g;
    } else { // Prepare solid fill
      this.fillStyle = fillstyle;
    }
    this.lineWidth = linewidth;
    this.beginPath();
    this.moveTo(x + radius, y);
    this.lineTo(x + width - radius, y);
    this.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.lineTo(x + width, y + height - radius);
    this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.lineTo(x + radius, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
    if (stroke) {
      this.stroke();
    }
    if (fill) {
      this.fill();
    }
  };

  // Draw spots on dice.
  context.drawSpot = function (x, y, hover) {
    var a = (hover) ? "0.2" : "0.8"; // Alpha opacity of the fill
    this.beginPath();
    this.arc(x, y, Math.floor(20 / ROWCOLMAX), 0, Math.PI * 2, true);
    this.fillStyle = "rgba(0,0,0," + a + ")";
    this.closePath();
    this.fill();
  };

  // Draw bullseyes on dice.
  context.drawBullseye = function (x, y) {
    var drawIt = function (radius) {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2, true);
      context.strokeStyle = "rgba(0,0,0,0.2)";
      context.lineWidth = Math.floor(16 / ROWCOLMAX);
      context.closePath();
      context.stroke();
    };
    drawIt(Math.floor(32 / ROWCOLMAX));
    drawIt(Math.floor(64 / ROWCOLMAX));
    drawIt(Math.floor(96 / ROWCOLMAX));
  };

  // Draw question marks on dice.
  context.drawQuestionMark = function (x, y, hover) {
    var a = (hover) ? "0.2" : "0.8"; // Alpha opacity of the fill
    this.font = "bold " + Math.floor(228 / ROWCOLMAX) + "px Arial,Helvetica,sans-serif";
    this.fillStyle = "rgba(0,0,0," + a + ")";
    this.fillText("?", x + Math.floor(48 / ROWCOLMAX), y + Math.floor(200 / ROWCOLMAX));
  };

  // Draw the gameboard's playable area, where the pieces will appear.
  context.drawPlayArea = function () {
    this.drawRoundRectangle(10, 10, (CANVASWIDTH - (MARGIN * 2)), (CANVASHEIGHT - (MARGIN * 2)), 10, true, true, "#333333", "#222222", 4, false);
  };

  // Draw the gameboard's background.
  context.drawBackground = function () {
    var g = this.createLinearGradient(0, 0, Math.floor(CANVASWIDTH / 2.5 - MARGIN), Math.floor(CANVASHEIGHT / 2.0 - MARGIN));
    g.addColorStop(0, "#333333");
    g.addColorStop(1, "#000000");
    this.fillStyle = g;
    this.fillRect(0, 0, CANVASWIDTH, CANVASHEIGHT);
  };


  //// GAME CLASSES
  ////

  // Player class prototype
  var Player = function (name, human, fillstyle, selectedfill, allyfill) {
    this.name = name !== undefined ? name : "Player";
    this.human = human !== undefined ? human : false;
    this.fillstyle = fillstyle !== undefined ? fillstyle : "#333333";
    this.selectedfill = selectedfill !== undefined ? selectedfill : "#555555";
    this.allyfill = allyfill !== undefined ? allyfill : "#444444";
  };

  // Cell class prototype: row/column coordinates at which gamepieces are placed.
  var Cell = function (row, column, x, y) {
    this.row = row !== undefined ? row : -1;
    this.column = column !== undefined ? column : -1;
    this.x = x !== undefined ? x : -1; // Leftmost pixel coordinate of the cell.
    this.y = y !== undefined ? y : -1; // Uppermost pixel coordinate of the cell.
    this.width = COLUMNWIDTH;
    this.height = ROWHEIGHT;
  };

  Cell.prototype = {
    setCellInfo: function (o) {
      setObjectProperties(o, this);
    },
    getPieceAtCoordinates: function () {
      var i; // Incrementer.
      for (i = 0; i < (TOTALPIECES); i += 1) {
        if (this.row === piece[i].cell.row && this.column === piece[i].cell.column) {
          return piece[i];
        }
      }
      return false;
    },
    doesPieceExistHere: function () {
      return !!(this.getPieceAtCoordinates());
    }
  };

  // Gamepiece class prototype
  var Piece = function (cell, playerid) {
    this.cell = cell !== undefined ? cell : new Cell(); // Gameboard coordinates of the piece
    this.playerid = playerid !== undefined ? playerid : -1; // ID of the player who owns this spot on the board
    this.fillstyle = "#333333";
    this.selectedfill = "#555555";
    this.allyfill = "#444444";
    this.allies = 0; // # of adjacent allies (calculated when this piece attacks or defends)
  };

  Piece.prototype = {
    setPieceInfo: function (o) {
      setObjectProperties(o, this);
    },

    // Take all the applicable properties from a player and apply them to this piece.
    setPieceOwnerProperties: function () {
      this.setPieceInfo(player[this.playerid]);
    },

    drawPiece: function (fill) {
      var c = this.cell; // this.cell temporary reference
      var f = (fill === undefined) ? this.fillstyle : fill;
      context.drawRoundRectangle(c.x, c.y, c.width, c.height, 10, true, true, "#222222", f, 3, true);
    },

    drawDiceSpots: function (number, hover) {
      var c = this.cell; // this.cell temporary reference
      switch (number) {
      case 1:
        context.drawSpot(Math.floor(c.x + (c.width * 0.5)), Math.floor(c.y + (c.height * 0.5)), hover);
        break;
      case 2:
        context.drawSpot(Math.floor(c.x + (c.width * 0.25)), Math.floor(c.y + (c.height * 0.75)), hover);
        context.drawSpot(Math.floor(c.x + (c.width * 0.75)), Math.floor(c.y + (c.height * 0.25)), hover);
        break;
      case 3:
        this.drawDiceSpots(1, hover);
        this.drawDiceSpots(2);
        break;
      case 4:
        this.drawDiceSpots(2, hover);
        context.drawSpot(Math.floor(c.x + (c.width * 0.25)), Math.floor(c.y + (c.height * 0.25)), hover);
        context.drawSpot(Math.floor(c.x + (c.width * 0.75)), Math.floor(c.y + (c.height * 0.75)), hover);
        break;
      case 5:
        this.drawDiceSpots(1, hover);
        this.drawDiceSpots(4, hover);
        break;
      case 6:
        this.drawDiceSpots(4, hover);
        context.drawSpot(Math.floor(c.x + (c.width * 0.25)), Math.floor(c.y + (c.height * 0.5)), hover);
        context.drawSpot(Math.floor(c.x + (c.width * 0.75)), Math.floor(c.y + (c.height * 0.5)), hover);
        break;
      default:
        break;
      }
    },

    drawCustomPiece: function (kind, hover, roll) {
      var c = this.cell; // this.cell temporary reference
      switch (kind) {
      case "selected":
        this.drawPiece(this.selectedfill);
        context.drawQuestionMark(c.x, c.y, hover);
        break;
      case "battle":
        this.drawPiece(this.selectedfill);
        this.drawDiceSpots(roll);
        break;
      case "ally":
        this.drawPiece(this.allyfill);
        this.drawDiceSpots(1, hover);
        break;
      case "enemy":
        context.drawBullseye(Math.floor(c.x + (c.width * 0.5)), Math.floor(c.y + (c.height * 0.5)), true);
        break;
      default:
        break;
      }
    },

    isAttackingPiece: function () {
      return (this.playerid === currentPlayerId);
    },

    isDefendingPiece: function () {
      return (this.playerid !== currentPlayerId);
    },

    isAdjacent: function (cell) {
      var c = this.cell; // this.cell temporary reference
      return ((cell.row === c.row && cell.column === (c.column + 1)) ||
              (cell.row === c.row && cell.column === (c.column - 1)) ||
              (cell.row === (c.row + 1) && cell.column === c.column) ||
              (cell.row === (c.row - 1) && cell.column === c.column));
    },

    isAlly: function (cell) {
      return ((this.cell.doesPieceExistHere()) &&
              (cell.doesPieceExistHere()) &&
              (this.playerid === cell.getPieceAtCoordinates().playerid));
    },

    addIfAdjacentAlly: function (cell, hover) {
      if (this.isAlly(cell)) {
        cell.getPieceAtCoordinates().drawCustomPiece("ally", hover);
        this.setPieceInfo({ allies: (this.allies + 1) });
      }
    },

    findAdjacentAllies: function (hover) {
      var c = this.cell; // this.cell temporary reference
      var t = new Cell(); // Temporary cell
      this.setPieceInfo({ allies: 0 }); // Reset the number of allies to zero.
      t.setCellInfo({ row: (c.row + 1), column: c.column });
      this.addIfAdjacentAlly(t, hover);
      t.setCellInfo({ row: (c.row - 1), column: c.column });
      this.addIfAdjacentAlly(t, hover);
      t.setCellInfo({ row: c.row, column: (c.column + 1) });
      this.addIfAdjacentAlly(t, hover);
      t.setCellInfo({ row: c.row, column: (c.column - 1) });
      this.addIfAdjacentAlly(t, hover);
    },

    isEnemy: function (cell) {
      return ((this.cell.doesPieceExistHere()) &&
              (cell.doesPieceExistHere()) &&
              (this.playerid !== cell.getPieceAtCoordinates().playerid));
    },

    addIfAdjacentEnemy: function (cell) {
      if (this.isEnemy(cell)) {
        cell.getPieceAtCoordinates().drawCustomPiece("enemy");
      }
    },

    findAdjacentEnemies: function () {
      var c = this.cell; // this.cell temporary reference
      var t = new Cell(); // Temporary cell
      t.setCellInfo({ row: (c.row + 1), column: c.column });
      this.addIfAdjacentEnemy(t);
      t.setCellInfo({ row: (c.row - 1), column: c.column });
      this.addIfAdjacentEnemy(t);
      t.setCellInfo({ row: c.row, column: (c.column + 1) });
      this.addIfAdjacentEnemy(t);
      t.setCellInfo({ row: c.row, column: (c.column - 1) });
      this.addIfAdjacentEnemy(t);
    }

  };


  //// GAME FUNCTIONS
  ////

  // Hide the status display
  var eraseDisplay = function () {
    $("#status").text("");
    $("#status").hide();
  };

  // Display messages to the player. Messages disappear after a brief period.
  var display = function (message) {
    if (displayStatus) {
      clearTimeout(timer.display);
      timer.display = null;
      $("#status").show();
      $("#status").html(message);
      timer.display = setTimeout(function () { eraseDisplay(); }, 4200);
    }
  };

  // Start listening for user moves and clicks on the gameboard.
  var startListening = function () {
    canvas.bind("click", function (event) { handleUserClick(event); });
    canvas.bind("mousemove", function (event) { handleUserMousemove(event); });
  };

  // Stop listening for user moves and clicks on the gameboard.
  var stopListening = function () {
    canvas.unbind();
  };

  // Draw the background, the playable area, and all the pieces.
  var drawGameboard = function () {
    var i; // Incrementer.
    context.clearRect(0, 0, CANVASWIDTH, CANVASHEIGHT); // Start from scratch.
    context.drawBackground();
    context.drawPlayArea();
    for (i = 0; i < (TOTALPIECES); i += 1) {
      piece[i].drawPiece();
    }
  };

  // Returns the cursor's current row and column coordinates as a Cell object
  var getCursorCoordinates = function (e) {
    var x, y, r, c; // Temporary variables for x, y, row, and column coordinates
    x = e.pageX - (canvas[0].offsetLeft + MARGIN + PADDING / 2);
    y = e.pageY - (canvas[0].offsetTop + MARGIN + PADDING / 2);
    x = Math.min(x, (COLUMNS * COLUMNWIDTH) + (COLUMNS * PADDING));
    y = Math.min(y, (ROWS * ROWHEIGHT) + (ROWS * PADDING));
    r = Math.floor(y / (ROWHEIGHT + PADDING));
    c = Math.floor(x / (COLUMNWIDTH + PADDING));
    if (r < 0 || r >= ROWS || c < 0 || c >= COLUMNS) {
      c = -1;
      r = -1;
    }
    return new Cell(r, c);
  };

  // Deletes the attacker and defender when turn is over or attacker piece deselected.
  var deselectAttackerDefender = function () {
    attacker = false;
    defender = false;
  };

  // Test for game's end.
  var isGameOver = function (p) {
    var i; // Incrementer.
    for (i = 0; i < (TOTALPIECES); i += 1) {
      if (piece[i].playerid !== p) {
        return false; // If any piece is owned by another player, game is not over.
      }
    }
    return true; // If the same player owns all the pieces, then game over, man. Game over.
  };

  // Execute an attack sequence.
  var executeAttack = function () {
    var attackRoll = Math.floor(Math.random() * 6) + 1;
    var defenseRoll = Math.floor(Math.random() * 6) + 1;
    attacker.findAdjacentAllies();
    defender.findAdjacentAllies();
    attacker.drawCustomPiece("battle", false, attackRoll);
    defender.drawCustomPiece("battle", false, defenseRoll);
    // Check for successful attack.
    if ((attackRoll + attacker.allies) > (defenseRoll + defender.allies)) {
      display("Success! " + player[attacker.playerid].name + " gets the square. ");
      defender.playerid = currentPlayerId; // Attacker takes over piece.
      defender.setPieceOwnerProperties();
      // Check if game has been won. Only happens on a successful attack.
      if (isGameOver(attacker.playerid)) {
        stopListening(); // Stop playing (at least until restart).
        clearTimeout(timer.computerAttack); // Make sure the computer stops playing, too!
        timer.computerAttack = null;
        display("Game over, man. Game over!");
        timer.redrawBoard = setTimeout(function () { drawGameboard(); }, 2000);
        return false;
      }
    } else {
      display("Attack failed. " + player[defender.playerid].name + " keeps the square. ");
    }
    deselectAttackerDefender();
    startPlayerTurn(); // Set to next player's turn.

  };

  // Find out whose turn it is and (if human) wait for a move or (if computer) make a move.
  var startPlayerTurn = function (id) {

    if (!isGameOver()) {

      if (id !== undefined) { // Assign the currentPlayerId value if one was passed to this function.
        currentPlayerId = id;
      } else { // Otherwise, increment to the next player in the queue (or start over).
        currentPlayerId = ((currentPlayerId + 1) >= player.length) ? 0 : currentPlayerId += 1;
      }

      if (player[currentPlayerId].human) {
        timer.playerAttack = setTimeout(function () { startListening(); }, (750 / GAMESPEED));  // Pause before player's turn.
      } else {
        stopListening();
        var pickAttacker = function () {
          var p = Math.floor(Math.random() * TOTALPIECES);
          if (piece[p].playerid === currentPlayerId) {
            attacker = piece[p];
          } else {
            pickAttacker();
          }
        };
        var pickDefender = function () {
          var p = Math.floor(Math.random() * TOTALPIECES);
          if (piece[p].playerid !== currentPlayerId) {
            defender = piece[p];
          } else {
            pickDefender();
          }
        };
        var calculateComputerAttack = function () {
          if (!attacker || !defender || !(attacker.isAdjacent(defender.cell))) {
            pickAttacker();
            pickDefender();
            calculateComputerAttack();
          } else {
            drawGameboard();
            executeAttack();
          }
        };
        timer.computerAttack = setTimeout(function () { calculateComputerAttack(); }, (1500 / GAMESPEED));
      }

    } else {
      return false; // Game is over, so a new turn cannot occur.
    }
  };

  // Highlight potential attacking pieces when mousing over the board,
  // unless an attacking piece has already been selected. In that case,
  // highlight potential defending pieces to attack.
  var handleUserMousemove = function (e) {
    var p, // Temporary piece variable
      c = getCursorCoordinates(e); // Temporary cell variable
    if (c.doesPieceExistHere()) {
      if (!attacker) {
        p = c.getPieceAtCoordinates().isAttackingPiece() ? c.getPieceAtCoordinates() : false;
        if (p) {
          drawGameboard();
          p.drawCustomPiece("selected", true);
          p.findAdjacentAllies(true);
        }
      } else {
        p = c.getPieceAtCoordinates().isDefendingPiece() ? c.getPieceAtCoordinates() : false;
        drawGameboard();
        attacker.drawCustomPiece("selected");
        attacker.findAdjacentAllies();
        attacker.findAdjacentEnemies();
        if (p && attacker.isAdjacent(c)) {
          p.drawCustomPiece("selected", true);
          p.findAdjacentAllies(true);
        }
      }
    }
  };

  // Handle click events to initiate attacks, execute attacks, or deselect pieces.
  var handleUserClick = function (e) {
    var c = getCursorCoordinates(e),  // Temporary cell variable
      p;  // Temporary piece variable
    drawGameboard();
    eraseDisplay();
    if (c.doesPieceExistHere()) {
      p = c.getPieceAtCoordinates();
      // If the player has clicked on an allied piece, that piece is now the player's attacker. 
      // If the player clicked on an adjacent enemy piece after selecting an attacker, that 
      // enemy piece is now the defender (and an attack will occur).
      if (attacker) {
        defender = (p.isDefendingPiece() && attacker.isAdjacent(c)) ? p : false;
        if (!defender) {
          attacker = p.isAttackingPiece() ? p : false;
        }
      } else {
        attacker = p.isAttackingPiece() ? p : false;
        defender = false;
      }
      // Test to see if an attack is in progress. If so, execute attack.
      if ((attacker) && (!defender)) {
        // Only an attacker has been chosen. No attack, yet.
        attacker.drawCustomPiece("selected");
        attacker.findAdjacentAllies();
        attacker.findAdjacentEnemies();
      } else if ((attacker) && (defender)) {
        // Attacker and defender chosen. Attack in progress.
        executeAttack();
      }
    } else {
      // Player clicked off the board, which deselects everything.
      deselectAttackerDefender();
    }
  };

  // Begin a game: create players, draw board, randomize piece setup, and start the human player's turn.
  var resetGame = function () {

    logger("Resetting game.");
    var i, // Incrementer.
      p = [], // Temporary player id array
      r, // Temporary cell row variable
      c; // Temporary cell column variable


    // Shut. Down. Everything.
    stopListening(); // Don't allow any moves until the gameboard is reset.
    player = []; // Delete any players from previous games.
    piece = []; // Delete any pieces from previous games.
    currentPlayerId = 0; // Reset currentPlayerId to zero.
    attacker = false; // Nobody can attack before the game has started.
    defender = false; // Nobody can defend before the game has started.
    // Clear any rogue setTimeout timers.
    if (timer) {
      var timername;
      for (timername in timer) {
        if (timer.hasOwnProperty(timername)) {
          clearTimeout(timer[timername]);
          timer[timername] = null;
        }
      }
    }

    // Create players.
    player[player.length] = new Player("Blue", true, "#002FA7", "#8098D4", "#4063BD");
    player[player.length] = new Player("Orange", false, "#CC6600", "#E6B380", "#D98D40");
    //player[player.length] = new Player("Grey", false, "#333333", "#666666", "#999999"); // More players can be added.

    // Create pieces in an array. Player[1] gets more pieces  
    // if there's an odd numbered total, since [0] gets to go first.
    // First, get the player ID values for the pieces...
    for (i = 0; i < (TOTALPIECES); i += 1) {
      p[i] = i % 2 === 0 ? 1 : 0; // Use for two players.
      //p[i] = i % player.length; // De-comment if more than two players.
    }

    // ...Shuffle the pieces
    p.shuffle();

    // ...And then set the pieces in place.
    for (i = 0; i < (TOTALPIECES); i += 1) {
      r = Math.floor(i / ROWS);
      c = i % COLUMNS;
      piece[i] = new Piece(
        new Cell(r, c, (((COLUMNWIDTH + PADDING) * c) + MARGIN + PADDING), (((ROWHEIGHT + PADDING) * r) + MARGIN + PADDING)),
        p[i]
      );
      piece[i].setPieceOwnerProperties(); // Transfer any player-specific properties to this piece.
    }

    drawGameboard();
    eraseDisplay();
    display("You're " + player[currentPlayerId].name + ". Click a square to begin.");
    startPlayerTurn(currentPlayerId);

  };


  //// GAME INITIALIZATION
  //// (This self-executing function executes when DICE.game() is loaded.)

  (function () {
    logger("Game initialization started.");
    window.scrollTo(0, 1); // Scroll up to hide address bar on iPhones.
    resetGame();
    $("#about").hide(); // Hide the "about this game" info.
    $("#showabout").toggle( // Start listener for showing/hiding the "About" info.
      function () { $("#about").show(); $("#showabout").text("Back To The Game"); },
      function () { $("#about").hide(); $("#showabout").text("About Diceland"); }
    );
    $("#restarter").bind("click", function (event) { resetGame(); }); // Start listener for game reset.
    logger("Game initialization complete.");
  }());

};


// Use jQuery's ready() method to get things started once the document is loaded.
$(document).ready(function () {
  "use strict";
  DICE.logger("Document is ready. Loading the DICE...");
  DICE.game();
});
