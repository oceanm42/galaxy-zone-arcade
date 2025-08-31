class CubeHopper {
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
        this.highScore = parseInt(localStorage.getItem('cube-hopper-high-score') || '0');
        
        // Game constants
        this.ROWS = 7;
        this.CUBE_SIZE = 40;
        this.PYRAMID_START_X = 400;
        this.PYRAMID_START_Y = 150;
        
        // Initialize pyramid
        this.initPyramid();
        
        // Player position (in cube coordinates)
        this.player = {
            row: 0,
            col: 0,
            x: 0,
            y: 0,
            isMoving: false,
            moveTimer: 0,
            startX: 0,
            startY: 0,
            targetX: 0,
            targetY: 0
        };
        
        this.enemies = [];
        this.gameTimer = 0;
        this.targetColor = 1; // Color all cubes should be changed to
        
        this.keys = {};
        this.keyPressed = false;
        
        this.setupEventListeners();
        this.setupAudio();
        this.setupNavigation();
        this.updatePlayerPosition();
        this.gameLoop();
    }
    
    initPyramid() {
        this.pyramid = [];
        for (let row = 0; row < this.ROWS; row++) {
            this.pyramid[row] = [];
            for (let col = 0; col <= row; col++) {
                this.pyramid[row][col] = {
                    color: 0, // 0 = original, 1 = changed once, 2 = changed twice
                    x: 0,
                    y: 0
                };
                this.calculateCubePosition(row, col);
            }
        }
    }
    
    calculateCubePosition(row, col) {
        // Isometric positioning
        const offsetX = (this.ROWS - 1 - row) * (this.CUBE_SIZE / 2);
        const x = this.PYRAMID_START_X + offsetX + col * this.CUBE_SIZE;
        const y = this.PYRAMID_START_Y + row * (this.CUBE_SIZE * 0.6);
        
        this.pyramid[row][col].x = x;
        this.pyramid[row][col].y = y;
    }
    
    updatePlayerPosition() {
        if (this.pyramid[this.player.row] && this.pyramid[this.player.row][this.player.col]) {
            const cube = this.pyramid[this.player.row][this.player.col];
            this.player.x = cube.x + this.CUBE_SIZE / 2;
            this.player.y = cube.y - 20; // Float above cube
        }
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.keyPressed) {
                if (e.code === 'Escape') {
                    e.preventDefault();
                    window.location.href = '../../index.html';
                    return;
                }
                
                this.keys[e.code] = true;
                this.keyPressed = true;
                
                if (e.code === 'Enter') {
                    e.preventDefault();
                    this.handleEnterPress();
                } else if (this.gameState === 'playing' && !this.player.isMoving) {
                    this.handleMovement(e.code);
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.keyPressed = false;
        });
    }
    
    handleMovement(keyCode) {
        let newRow = this.player.row;
        let newCol = this.player.col;
        
        // Q*bert moves diagonally
        switch (keyCode) {
            case 'ArrowUp':
            case 'KeyW':
                // Up-left
                newRow--;
                break;
            case 'ArrowRight':
            case 'KeyD':
                // Up-right  
                newRow--;
                newCol++;
                break;
            case 'ArrowDown':
            case 'KeyS':
                // Down-right
                newRow++;
                newCol++;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                // Down-left
                newRow++;
                break;
        }
        
        // Check if move is valid
        if (this.isValidMove(newRow, newCol)) {
            this.movePlayer(newRow, newCol);
        } else {
            // Player fell off - lose a life
            this.fellOff();
        }
    }
    
    isValidMove(row, col) {
        return row >= 0 && row < this.ROWS && col >= 0 && col <= row;
    }
    
    movePlayer(newRow, newCol) {
        this.player.isMoving = true;
        this.player.moveTimer = 0;
        this.player.startX = this.player.x;
        this.player.startY = this.player.y;
        
        this.player.row = newRow;
        this.player.col = newCol;
        
        // Calculate target position
        const cube = this.pyramid[newRow][newCol];
        this.player.targetX = cube.x + this.CUBE_SIZE / 2;
        this.player.targetY = cube.y - 20;
        
        // Change cube color
        this.pyramid[newRow][newCol].color++;
        if (this.pyramid[newRow][newCol].color > 2) {
            this.pyramid[newRow][newCol].color = 2; // Max color
        }
        
        this.playSound(400, 0.1);
        this.score += 25;
        this.updateUI();
        
        // Check if level complete
        this.checkLevelComplete();
    }
    
    fellOff() {
        this.loseLife();
        // Reset player position
        this.player.row = 0;
        this.player.col = 0;
        this.updatePlayerPosition();
    }
    
    checkLevelComplete() {
        let allComplete = true;
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col <= row; col++) {
                if (this.pyramid[row][col].color < this.targetColor) {
                    allComplete = false;
                    break;
                }
            }
            if (!allComplete) break;
        }
        
        if (allComplete) {
            this.nextLevel();
        }
    }
    
    nextLevel() {
        this.level++;
        this.score += 1000;
        this.playSound(600, 0.3);
        
        // Reset pyramid
        this.initPyramid();
        
        // Reset player
        this.player.row = 0;
        this.player.col = 0;
        this.updatePlayerPosition();
        
        // Add more enemies or increase difficulty
        this.spawnEnemies();
        
        this.updateUI();
    }
    
    spawnEnemies() {
        // Simple enemy that moves randomly
        if (this.enemies.length < this.level) {
            this.enemies.push({
                row: Math.floor(Math.random() * this.ROWS),
                col: 0,
                x: 0,
                y: 0,
                moveTimer: Math.random() * 120,
                color: '#FF00FF'
            });
        }
    }
    
    updateEnemies() {
        for (let enemy of this.enemies) {
            enemy.moveTimer--;
            if (enemy.moveTimer <= 0) {
                // Move enemy randomly
                let moves = [];
                
                // Add valid moves
                if (enemy.row > 0) moves.push({row: enemy.row - 1, col: enemy.col});
                if (enemy.row > 0 && enemy.col < enemy.row) moves.push({row: enemy.row - 1, col: enemy.col + 1});
                if (enemy.row < this.ROWS - 1) moves.push({row: enemy.row + 1, col: enemy.col});
                if (enemy.row < this.ROWS - 1) moves.push({row: enemy.row + 1, col: enemy.col + 1});
                
                if (moves.length > 0) {
                    const move = moves[Math.floor(Math.random() * moves.length)];
                    enemy.row = move.row;
                    enemy.col = Math.min(move.col, move.row);
                }
                
                enemy.moveTimer = 60 + Math.random() * 60;
                
                // Update enemy position
                if (this.pyramid[enemy.row] && this.pyramid[enemy.row][enemy.col]) {
                    const cube = this.pyramid[enemy.row][enemy.col];
                    enemy.x = cube.x + this.CUBE_SIZE / 2;
                    enemy.y = cube.y - 20;
                }
            }
            
            // Check collision with player
            if (enemy.row === this.player.row && enemy.col === this.player.col) {
                this.loseLife();
                // Reset player position
                this.player.row = 0;
                this.player.col = 0;
                this.updatePlayerPosition();
            }
        }
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
    
    setupAudio() { 
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)(); 
    }
    
    playSound(frequency, duration, type = 'square') {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    handleEnterPress() {
        switch (this.gameState) {
            case 'menu': this.startGame(); break;
            case 'gameOver': this.resetGame(); break;
        }
    }
    
    startGame() { 
        this.gameState = 'playing';
        this.spawnEnemies();
    }
    
    resetGame() {
        this.score = 0; 
        this.lives = 3; 
        this.level = 1; 
        this.gameState = 'menu';
        this.enemies = [];
        this.initPyramid();
        this.player.row = 0;
        this.player.col = 0;
        this.updatePlayerPosition();
        this.updateUI();
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.gameTimer++;
        
        // Update player movement animation
        if (this.player.isMoving) {
            this.player.moveTimer += 0.2;
            if (this.player.moveTimer >= 1) {
                this.player.isMoving = false;
                this.player.x = this.player.targetX;
                this.player.y = this.player.targetY;
            } else {
                // Smooth interpolation with hop arc
                const progress = this.player.moveTimer;
                const arcHeight = 30 * Math.sin(progress * Math.PI);
                
                this.player.x = this.player.startX + (this.player.targetX - this.player.startX) * progress;
                this.player.y = this.player.startY + (this.player.targetY - this.player.startY) * progress - arcHeight;
            }
        }
        
        // Update enemies
        this.updateEnemies();
    }
    
    loseLife() {
        this.lives--;
        this.playSound(200, 1.0, 'sawtooth');
        if (this.lives <= 0) {
            this.gameOver();
        }
        this.updateUI();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('cube-hopper-high-score', this.highScore.toString());
        }
    }
    
    updateUI() {
        this.scoreElement.textContent = `Score: ${this.score}`;
        this.livesElement.textContent = `Lives: ${this.lives}`;
        this.levelElement.textContent = `Level: ${this.level}`;
    }
    
    drawCube(x, y, color) {
        // Draw isometric cube
        const size = this.CUBE_SIZE;
        const height = size * 0.6;
        
        // Cube colors
        const colors = ['#444444', '#00FFFF', '#FFFF00'];
        const cubeColor = colors[color] || colors[0];
        
        this.ctx.save();
        
        // Top face
        this.ctx.fillStyle = cubeColor;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + size/2, y - height/2);
        this.ctx.lineTo(x + size, y);
        this.ctx.lineTo(x + size/2, y + height/2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Left face (darker)
        const leftColor = this.adjustBrightness(cubeColor, -0.3);
        this.ctx.fillStyle = leftColor;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + size/2, y + height/2);
        this.ctx.lineTo(x + size/2, y + height/2 + size/2);
        this.ctx.lineTo(x, y + size/2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Right face (darker)
        const rightColor = this.adjustBrightness(cubeColor, -0.5);
        this.ctx.fillStyle = rightColor;
        this.ctx.beginPath();
        this.ctx.moveTo(x + size, y);
        this.ctx.lineTo(x + size/2, y + height/2);
        this.ctx.lineTo(x + size/2, y + height/2 + size/2);
        this.ctx.lineTo(x + size, y + size/2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    adjustBrightness(color, percent) {
        // Simple brightness adjustment
        if (color === '#444444') return '#222222';
        if (color === '#00FFFF') return percent < 0 ? '#008888' : '#44FFFF';
        if (color === '#FFFF00') return percent < 0 ? '#888800' : '#FFFF44';
        return color;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState === 'playing') {
            // Draw pyramid
            for (let row = this.ROWS - 1; row >= 0; row--) {
                for (let col = 0; col <= row; col++) {
                    const cube = this.pyramid[row][col];
                    this.drawCube(cube.x, cube.y, cube.color);
                }
            }
            
            // Draw enemies
            for (let enemy of this.enemies) {
                this.ctx.fillStyle = enemy.color;
                this.ctx.beginPath();
                this.ctx.arc(enemy.x, enemy.y, 12, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = '#FFFFFF';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
            
            // Draw player (Q*bert character)
            this.ctx.fillStyle = '#FF8800';
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Player eyes
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(this.player.x - 5, this.player.y - 5, 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(this.player.x + 5, this.player.y - 5, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Player nose
            this.ctx.fillStyle = '#FFAA00';
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // UI text
        this.ctx.font = '24px Courier New'; 
        this.ctx.textAlign = 'center';
        
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fillText('CUBE HOPPER', this.canvas.width / 2, 100);
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Inspired by Q*bert (1982)', this.canvas.width / 2, 130);
            this.ctx.fillText('Hop on all cubes to change their color!', this.canvas.width / 2, 160);
            this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, 500);
            this.ctx.fillText('Use ARROW keys to hop diagonally', this.canvas.width / 2, 530);
            this.ctx.fillText('Press ENTER to Start', this.canvas.width / 2, 560);
        } else if (this.gameState === 'gameOver') {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);
            this.ctx.fillStyle = '#FFFF00'; 
            this.ctx.font = '18px Courier New';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
            this.ctx.fillText('Press ENTER to Play Again', this.canvas.width / 2, this.canvas.height / 2 + 60);
        }
    }
    
    gameLoop() { 
        this.update(); 
        this.render(); 
        requestAnimationFrame(() => this.gameLoop()); 
    }
}

window.addEventListener('load', () => { new CubeHopper(); });