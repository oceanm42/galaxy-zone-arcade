class PacChase {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.levelElement = document.getElementById('level');
        
        this.gameState = 'menu';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.highScore = parseInt(localStorage.getItem('pac-chase-high-score') || '0');
        
        // Game grid settings
        this.TILE_SIZE = 25;
        this.COLS = 31;
        this.ROWS = 23;
        
        // Game timing
        this.gameTimer = 0;
        this.powerModeTimer = 0;
        this.powerMode = false;
        
        this.initializeMaze();
        this.initializeGame();
        
        this.keys = {};
        this.setupEventListeners();
        this.setupAudio();
        this.setupNavigation();
        
        this.gameLoop();
    }
    
    initializeMaze() {
        // Classic Pac-Man style maze (1 = wall, 0 = empty, 2 = dot, 3 = power pellet)
        this.mazeLayout = [
            "1111111111111111111111111111111",
            "1222222222222211122222222222221",
            "1311112111112211112111112111131",
            "1222222222222222222222222222221",
            "1211112112111111111211121111121",
            "1222222112222211122222112222221",
            "1111112111111211112111112111111",
            "0000012111000200200001111200000",
            "1111112112111000011112112111111",
            "0000002212111111111112122000000",
            "1111112212000000000012122111111",
            "2222222220000000000022222222222",
            "1111112112000000000211211111111",
            "0000012112111111111211120000000",
            "1111112112111111111211211111111",
            "1222222222222211122222222222221",
            "1311112111112211112111112111131",
            "1222112222222222222222221122221",
            "1112112112111111111211211211111",
            "1222222112222211122222112222221",
            "1211111111112211112111111111121",
            "1222222222222222222222222222221",
            "1111111111111111111111111111111"
        ];
        
        this.maze = [];
        this.dots = [];
        this.powerPellets = [];
        
        for (let row = 0; row < this.ROWS; row++) {
            this.maze[row] = [];
            for (let col = 0; col < this.COLS; col++) {
                const cell = parseInt(this.mazeLayout[row][col]);
                this.maze[row][col] = cell;
                
                if (cell === 2) {
                    this.dots.push({x: col, y: row});
                } else if (cell === 3) {
                    this.powerPellets.push({x: col, y: row});
                }
            }
        }
        
        this.totalDots = this.dots.length + this.powerPellets.length;
    }
    
    initializeGame() {
        // Player (Pac-Man)
        this.player = {
            x: 15,
            y: 18,
            direction: {x: 0, y: 0},
            nextDirection: {x: 0, y: 0},
            animFrame: 0
        };
        
        // Ghosts
        this.ghosts = [
            {x: 15, y: 9, direction: {x: -1, y: 0}, color: '#FF0000', mode: 'chase', timer: 0},
            {x: 14, y: 10, direction: {x: 1, y: 0}, color: '#FFB6C1', mode: 'chase', timer: 0},
            {x: 15, y: 10, direction: {x: 0, y: -1}, color: '#00FFFF', mode: 'chase', timer: 0},
            {x: 16, y: 10, direction: {x: 0, y: 1}, color: '#FFB347', mode: 'chase', timer: 0}
        ];
    }
    
    setupNavigation() {
        // Add click handler for back button
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '../../index.html';
            });
        }
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Escape') {
                e.preventDefault();
                window.location.href = '../../index.html';
                return;
            }
            
            if (e.code === 'Enter') {
                e.preventDefault();
                this.handleEnterPress();
            }
            
            if (this.gameState === 'playing') {
                this.handleDirectionInput(e.code);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    handleDirectionInput(keyCode) {
        switch (keyCode) {
            case 'ArrowUp':
                this.player.nextDirection = {x: 0, y: -1};
                break;
            case 'ArrowDown':
                this.player.nextDirection = {x: 0, y: 1};
                break;
            case 'ArrowLeft':
                this.player.nextDirection = {x: -1, y: 0};
                break;
            case 'ArrowRight':
                this.player.nextDirection = {x: 1, y: 0};
                break;
        }
    }
    
    setupAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    playSound(frequency, duration, type = 'sine') {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    handleEnterPress() {
        switch (this.gameState) {
            case 'menu':
                this.startGame();
                break;
            case 'gameOver':
                this.resetGame();
                break;
        }
    }
    
    startGame() {
        this.gameState = 'playing';
    }
    
    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameState = 'menu';
        this.powerMode = false;
        this.powerModeTimer = 0;
        
        this.initializeMaze();
        this.initializeGame();
        this.updateUI();
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.gameTimer++;
        
        // Update player every 8 frames for smooth but controlled movement
        if (this.gameTimer % 8 === 0) {
            this.updatePlayer();
        }
        
        // Update ghosts every 10 frames (slightly slower than player)
        if (this.gameTimer % 10 === 0) {
            this.updateGhosts();
        }
        
        this.updatePowerMode();
        this.checkCollisions();
        this.checkWinCondition();
    }
    
    updatePlayer() {
        // Try to change direction if requested
        const nextX = this.player.x + this.player.nextDirection.x;
        const nextY = this.player.y + this.player.nextDirection.y;
        
        if (this.canMove(nextX, nextY)) {
            this.player.direction = {...this.player.nextDirection};
        }
        
        // Move player
        const newX = this.player.x + this.player.direction.x;
        const newY = this.player.y + this.player.direction.y;
        
        if (this.canMove(newX, newY)) {
            this.player.x = newX;
            this.player.y = newY;
            
            // Handle tunnel wraparound
            if (this.player.x < 0) this.player.x = this.COLS - 1;
            if (this.player.x >= this.COLS) this.player.x = 0;
            
            this.player.animFrame++;
            this.collectItems();
        }
    }
    
    canMove(x, y) {
        // Allow horizontal tunnels
        if (y >= 0 && y < this.ROWS && (x < 0 || x >= this.COLS)) {
            return this.maze[y][15] !== 1; // Check if tunnel is open
        }
        
        if (x < 0 || x >= this.COLS || y < 0 || y >= this.ROWS) {
            return false;
        }
        
        return this.maze[y][x] !== 1;
    }
    
    collectItems() {
        // Check for dots
        for (let i = this.dots.length - 1; i >= 0; i--) {
            const dot = this.dots[i];
            if (dot.x === this.player.x && dot.y === this.player.y) {
                this.dots.splice(i, 1);
                this.score += 10;
                this.playSound(800, 0.1);
                this.updateUI();
            }
        }
        
        // Check for power pellets
        for (let i = this.powerPellets.length - 1; i >= 0; i--) {
            const pellet = this.powerPellets[i];
            if (pellet.x === this.player.x && pellet.y === this.player.y) {
                this.powerPellets.splice(i, 1);
                this.score += 50;
                this.activatePowerMode();
                this.playSound(400, 0.5);
                this.updateUI();
            }
        }
    }
    
    activatePowerMode() {
        this.powerMode = true;
        this.powerModeTimer = 300; // 5 seconds at 60fps
        
        // Make all ghosts frightened
        for (let ghost of this.ghosts) {
            ghost.mode = 'frightened';
        }
    }
    
    updatePowerMode() {
        if (this.powerMode) {
            this.powerModeTimer--;
            if (this.powerModeTimer <= 0) {
                this.powerMode = false;
                
                // Return ghosts to chase mode
                for (let ghost of this.ghosts) {
                    if (ghost.mode === 'frightened') {
                        ghost.mode = 'chase';
                    }
                }
            }
        }
    }
    
    updateGhosts() {
        for (let ghost of this.ghosts) {
            ghost.timer++;
            
            // Simple ghost AI
            const possibleMoves = [
                {x: 0, y: -1}, // up
                {x: 0, y: 1},  // down
                {x: -1, y: 0}, // left
                {x: 1, y: 0}   // right
            ].filter(move => {
                const newX = ghost.x + move.x;
                const newY = ghost.y + move.y;
                return this.canMove(newX, newY) && 
                       !(move.x === -ghost.direction.x && move.y === -ghost.direction.y); // Don't reverse unless necessary
            });
            
            if (possibleMoves.length === 0) {
                // If no moves available, allow reversal
                possibleMoves.push({x: -ghost.direction.x, y: -ghost.direction.y});
            }
            
            let chosenMove;
            
            if (ghost.mode === 'frightened') {
                // Run away from player (pick move that increases distance)
                chosenMove = possibleMoves.reduce((best, move) => {
                    const newX = ghost.x + move.x;
                    const newY = ghost.y + move.y;
                    const distanceFromPlayer = Math.abs(newX - this.player.x) + Math.abs(newY - this.player.y);
                    
                    const bestX = ghost.x + best.x;
                    const bestY = ghost.y + best.y;
                    const bestDistance = Math.abs(bestX - this.player.x) + Math.abs(bestY - this.player.y);
                    
                    return distanceFromPlayer > bestDistance ? move : best;
                });
            } else {
                // Chase player (with some randomness)
                if (Math.random() < 0.8) {
                    chosenMove = possibleMoves.reduce((best, move) => {
                        const newX = ghost.x + move.x;
                        const newY = ghost.y + move.y;
                        const distanceToPlayer = Math.abs(newX - this.player.x) + Math.abs(newY - this.player.y);
                        
                        const bestX = ghost.x + best.x;
                        const bestY = ghost.y + best.y;
                        const bestDistance = Math.abs(bestX - this.player.x) + Math.abs(bestY - this.player.y);
                        
                        return distanceToPlayer < bestDistance ? move : best;
                    });
                } else {
                    chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                }
            }
            
            ghost.direction = chosenMove;
            ghost.x += ghost.direction.x;
            ghost.y += ghost.direction.y;
            
            // Handle tunnel wraparound for ghosts
            if (ghost.x < 0) ghost.x = this.COLS - 1;
            if (ghost.x >= this.COLS) ghost.x = 0;
        }
    }
    
    checkCollisions() {
        for (let ghost of this.ghosts) {
            if (ghost.x === this.player.x && ghost.y === this.player.y) {
                if (ghost.mode === 'frightened') {
                    // Eat ghost
                    this.score += 200;
                    ghost.mode = 'eaten';
                    ghost.x = 15;
                    ghost.y = 9;
                    
                    // Respawn ghost after delay
                    setTimeout(() => {
                        ghost.mode = 'chase';
                    }, 2000);
                    
                    this.playSound(1000, 0.3);
                    this.updateUI();
                } else if (ghost.mode !== 'eaten') {
                    // Player dies
                    this.loseLife();
                    return;
                }
            }
        }
    }
    
    checkWinCondition() {
        if (this.dots.length === 0 && this.powerPellets.length === 0) {
            this.nextLevel();
        }
    }
    
    nextLevel() {
        this.level++;
        this.score += 1000;
        this.playSound(1200, 1.0);
        
        // Reset for next level
        this.initializeMaze();
        this.player.x = 15;
        this.player.y = 18;
        this.player.direction = {x: 0, y: 0};
        this.player.nextDirection = {x: 0, y: 0};
        
        // Reset ghosts
        this.initializeGame();
        this.powerMode = false;
        this.powerModeTimer = 0;
        
        this.updateUI();
    }
    
    loseLife() {
        this.lives--;
        this.powerMode = false;
        this.powerModeTimer = 0;
        this.playSound(200, 1.0, 'sawtooth');
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Reset positions
            this.player.x = 15;
            this.player.y = 18;
            this.player.direction = {x: 0, y: 0};
            this.player.nextDirection = {x: 0, y: 0};
            
            // Reset ghosts
            this.initializeGame();
        }
        
        this.updateUI();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('pac-chase-high-score', this.highScore.toString());
        }
    }
    
    updateUI() {
        this.scoreElement.textContent = `Score: ${this.score}`;
        this.livesElement.textContent = `Lives: ${this.lives}`;
        this.levelElement.textContent = `Level: ${this.level}`;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw maze
        this.ctx.fillStyle = '#0000FF';
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                if (this.maze[row][col] === 1) {
                    this.ctx.fillRect(
                        col * this.TILE_SIZE, 
                        row * this.TILE_SIZE, 
                        this.TILE_SIZE, 
                        this.TILE_SIZE
                    );
                }
            }
        }
        
        // Draw dots
        this.ctx.fillStyle = '#FFFF00';
        for (let dot of this.dots) {
            this.ctx.beginPath();
            this.ctx.arc(
                dot.x * this.TILE_SIZE + this.TILE_SIZE / 2,
                dot.y * this.TILE_SIZE + this.TILE_SIZE / 2,
                2, 0, Math.PI * 2
            );
            this.ctx.fill();
        }
        
        // Draw power pellets
        this.ctx.fillStyle = '#FFFFFF';
        for (let pellet of this.powerPellets) {
            this.ctx.beginPath();
            this.ctx.arc(
                pellet.x * this.TILE_SIZE + this.TILE_SIZE / 2,
                pellet.y * this.TILE_SIZE + this.TILE_SIZE / 2,
                6, 0, Math.PI * 2
            );
            this.ctx.fill();
        }
        
        // Draw player (Pac-Man)
        const playerPixelX = this.player.x * this.TILE_SIZE + this.TILE_SIZE / 2;
        const playerPixelY = this.player.y * this.TILE_SIZE + this.TILE_SIZE / 2;
        
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.beginPath();
        
        // Animate mouth
        const mouthOpen = Math.floor(this.player.animFrame / 4) % 2 === 0;
        const isMoving = this.player.direction.x !== 0 || this.player.direction.y !== 0;
        
        if (mouthOpen && isMoving) {
            // Draw Pac-Man with mouth
            let startAngle, endAngle;
            if (this.player.direction.x > 0) { // Right
                startAngle = 0.2 * Math.PI;
                endAngle = 1.8 * Math.PI;
            } else if (this.player.direction.x < 0) { // Left
                startAngle = 1.2 * Math.PI;
                endAngle = 0.8 * Math.PI;
            } else if (this.player.direction.y < 0) { // Up
                startAngle = 1.7 * Math.PI;
                endAngle = 1.3 * Math.PI;
            } else { // Down
                startAngle = 0.7 * Math.PI;
                endAngle = 0.3 * Math.PI;
            }
            
            this.ctx.arc(playerPixelX, playerPixelY, this.TILE_SIZE / 2 - 2, startAngle, endAngle);
            this.ctx.lineTo(playerPixelX, playerPixelY);
        } else {
            // Draw full circle
            this.ctx.arc(playerPixelX, playerPixelY, this.TILE_SIZE / 2 - 2, 0, Math.PI * 2);
        }
        
        this.ctx.fill();
        
        // Draw ghosts
        for (let ghost of this.ghosts) {
            const ghostPixelX = ghost.x * this.TILE_SIZE + this.TILE_SIZE / 2;
            const ghostPixelY = ghost.y * this.TILE_SIZE + this.TILE_SIZE / 2;
            
            // Ghost color based on mode
            if (ghost.mode === 'frightened') {
                this.ctx.fillStyle = this.powerModeTimer < 60 && this.powerModeTimer % 10 < 5 ? '#FFFFFF' : '#0000FF';
            } else if (ghost.mode === 'eaten') {
                this.ctx.fillStyle = '#666666';
            } else {
                this.ctx.fillStyle = ghost.color;
            }
            
            // Ghost body (rounded rectangle)
            const ghostSize = this.TILE_SIZE - 4;
            this.ctx.fillRect(
                ghostPixelX - ghostSize / 2,
                ghostPixelY - ghostSize / 2,
                ghostSize,
                ghostSize * 0.8
            );
            
            // Ghost bottom (wavy)
            this.ctx.beginPath();
            this.ctx.moveTo(ghostPixelX - ghostSize / 2, ghostPixelY + ghostSize / 2 - 4);
            this.ctx.lineTo(ghostPixelX - ghostSize / 4, ghostPixelY + ghostSize / 2);
            this.ctx.lineTo(ghostPixelX, ghostPixelY + ghostSize / 2 - 4);
            this.ctx.lineTo(ghostPixelX + ghostSize / 4, ghostPixelY + ghostSize / 2);
            this.ctx.lineTo(ghostPixelX + ghostSize / 2, ghostPixelY + ghostSize / 2 - 4);
            this.ctx.lineTo(ghostPixelX + ghostSize / 2, ghostPixelY);
            this.ctx.fill();
            
            // Ghost eyes
            if (ghost.mode !== 'eaten') {
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.fillRect(ghostPixelX - 6, ghostPixelY - 4, 4, 4);
                this.ctx.fillRect(ghostPixelX + 2, ghostPixelY - 4, 4, 4);
                
                this.ctx.fillStyle = '#000000';
                this.ctx.fillRect(ghostPixelX - 4, ghostPixelY - 2, 2, 2);
                this.ctx.fillRect(ghostPixelX + 4, ghostPixelY - 2, 2, 2);
            }
        }
        
        // Draw UI overlays
        this.ctx.font = '24px Courier New';
        this.ctx.textAlign = 'center';
        
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fillText('PAC-CHASE', this.canvas.width / 2, this.canvas.height / 2 - 60);
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Inspired by Pac-Man (1980)', this.canvas.width / 2, this.canvas.height / 2 - 30);
            this.ctx.fillText('Eat all dots while avoiding ghosts!', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 40);
            this.ctx.fillText('Press ENTER to Start', this.canvas.width / 2, this.canvas.height / 2 + 80);
        } else if (this.gameState === 'gameOver') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.font = '18px Courier New';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
            this.ctx.fillText('Press ENTER to Play Again', this.canvas.width / 2, this.canvas.height / 2 + 60);
        }
        
        // Power mode indicator
        if (this.powerMode && this.gameState === 'playing') {
            this.ctx.fillStyle = '#FF00FF';
            this.ctx.font = '14px Courier New';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`Power: ${Math.ceil(this.powerModeTimer / 60)}s`, this.canvas.width - 20, 30);
        }
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new PacChase();
});