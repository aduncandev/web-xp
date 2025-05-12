function GameManager (Manager) {
  this.htmlManager = new Manager;
  this.level = 1
  this.board = new Board(this.level);
  this.htmlManager.setBoard(this);
  this.htmlManager.addListeners(this);
  this.totalCoins = 0;
  this.currentCoins = 0;
}

GameManager.prototype.flip = function (pos) {
  // Store the previous value of currentCoins
  const previousCoins = this.currentCoins || 0;

  // Perform the flip action
  const result = this.board.flip(pos);

  if (result === 0) {
    // Game over scenario
    this.currentCoins = 0;
    this.htmlManager.setCurrentCoins(this.currentCoins);
    this.htmlManager.gameOverMessage(this.currentCoins, false, this);
  } else if (result != null) {
    // Update currentCoins based on the result
    this.currentCoins = (previousCoins ? previousCoins * result : result);
    this.htmlManager.setCurrentCoins(this.currentCoins);

    // Check if currentCoins has increased and play the sound
    if (this.currentCoins > previousCoins) {
      const scoreFlipSound = new Audio("./voltorbflipsounds/scoreflip.mp3");
      scoreFlipSound.preload = "auto";
      scoreFlipSound.play();
    }
    else{
      const flipSound = new Audio("./voltorbflipsounds//flip.mp3");
      flipSound.preload = "auto";
      flipSound.play();
    }

    // Check if the game has been won
    if (this.currentCoins == this.board.totalCoins) {
      this.htmlManager.gameOverMessage(this.currentCoins, true, this);
    }
  }
  return result;
}

GameManager.prototype.getTile = function (pos) {
  return this.board.tiles[pos.row][pos.col].value
}

GameManager.prototype.levelUp = function () {
  this.totalCoins = Math.min(this.totalCoins+this.currentCoins, 99999);
  this.htmlManager.setTotalCoins(this.totalCoins);
  this.currentCoins = 0;
  oldlevel = this.level;
  this.level = Math.min(this.level+1, 7);
  this.board = new Board(this.level);
  this.htmlManager.setBoard(this);
  this.htmlManager.displayNextLevel(this.level, this.level-oldlevel, this);
}

GameManager.prototype.relative = function (x, n) {
  return -Math.sqrt(x)+Math.sqrt(n)+1
}

GameManager.prototype.levelDown = function () {
  this.currentCoins = 0;
  nextlevel = chance.weighted(
    Array.from({ length: this.level }, (_, i) => i+1), 
    Array.from({ length: this.level }, (_, i) => this.relative(i+1, this.level))
    );
  difference = nextlevel - this.level;
  this.level = nextlevel;
  this.board = new Board(this.level);
  this.htmlManager.setBoard(this);
  this.htmlManager.displayNextLevel(this.level, difference, this);
}