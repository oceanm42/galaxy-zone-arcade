class TunnelHero {
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
        this.highScore = parseInt(localStorage.getItem('tunnel-hero-high-score') || '0');
        
        this.tileSize = 20;
        this.cols = this.canvas.width / this.tileSize;
        this.rows = this.canvas.height / this.tileSize;
        
        this.player = {
            x: Math.floor(this.cols / 2),
            y: Math.floor(this.rows / 2),
            width: 1,
            height: 1,
            direction: { x: 0, y: 0 }
        };
        
        this.dirt = [];
        this.enemies = [];
        this.rocks = [];
        this.vegetables = [];
        
        this.keys = {};
        this.setupEventListeners();
        this.setupAudio();
        this.setupNavigation();
        this.initLevel();
        this.gameLoop();
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
            if (e.code === 'Escape') {
                e.preventDefault();
                window.location.href = '../../index.html';
                return;
            }
            
            this.keys[e.code] = true;
            if (e.code === 'Enter') {
                e.preventDefault();
                this.handleEnterPress();
            }
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.gameState === 'playing') this.inflate();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
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
    
    startGame() { this.gameState = 'playing'; }
    
    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameState = 'menu';
        this.player.x = Math.floor(this.cols / 2);
        this.player.y = Math.floor(this.rows / 2);
        this.initLevel();
        this.updateUI();
    }
    
    initLevel() {
        this.dirt = [];
        this.enemies = [];
        this.rocks = [];
        this.vegetables = [];
        
        // Fill with dirt
        for (let y = 0; y < this.rows; y++) {
            this.dirt[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.dirt[y][x] = true;
            }
        }
        
        // Clear starting area
        this.clearDirt(this.player.x, this.player.y);
        
        // Add enemies
        for (let i = 0; i < 3 + this.level; i++) {
            this.enemies.push({
                x: Math.floor(Math.random() * this.cols),
                y: Math.floor(Math.random() * this.rows),
                direction: { x: Math.random() > 0.5 ? 1 : -1, y: 0 },
                inflated: false,
                inflateTimer: 0
            });
        }
        
        // Add vegetables
        for (let i = 0; i < 5; i++) {
            this.vegetables.push({
                x: Math.floor(Math.random() * this.cols),
                y: Math.floor(Math.random() * this.rows),
                collected: false
            });
        }
    }
    
    clearDirt(x, y) {
        if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
            this.dirt[y][x] = false;
        }
    }
    
    inflate() {
        // Create air pump effect - destroy nearby enemies
        for (let enemy of this.enemies) {
            const distance = Math.abs(this.player.x - enemy.x) + Math.abs(this.player.y - enemy.y);
            if (distance <= 2) {
                enemy.inflated = true;
                enemy.inflateTimer = 180; // 3 seconds
                this.score += 100;
                this.playSound(400, 0.3);
                this.updateUI();
            }
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updatePlayer();
        this.updateEnemies();
        this.checkCollisions();
        this.checkWinCondition();
    }
    
    updatePlayer() {
        let moved = false;
        
        if (this.keys['ArrowLeft'] && this.player.x > 0) {
            this.player.x--;
            moved = true;
        }
        if (this.keys['ArrowRight'] && this.player.x < this.cols - 1) {
            this.player.x++;
            moved = true;
        }
        if (this.keys['ArrowUp'] && this.player.y > 0) {
            this.player.y--;
            moved = true;
        }
        if (this.keys['ArrowDown'] && this.player.y < this.rows - 1) {
            this.player.y++;
            moved = true;
        }
        
        if (moved) {
            this.clearDirt(this.player.x, this.player.y);
            this.playSound(200, 0.05);
        }
    }
    
    updateEnemies() {
        for (let enemy of this.enemies) {
            if (enemy.inflated) {
                enemy.inflateTimer--;
                if (enemy.inflateTimer <= 0) {
                    enemy.inflated = false;
                }
                continue;
            }
            
            // Simple AI: move in straight lines, turn at walls
            const newX = enemy.x + enemy.direction.x;
            const newY = enemy.y + enemy.direction.y;
            
            if (newX < 0 || newX >= this.cols || newY < 0 || newY >= this.rows) {
                enemy.direction.x *= -1;
                enemy.direction.y *= -1;
            } else {
                enemy.x = newX;
                enemy.y = newY;
            }
            
            // Random direction change
            if (Math.random() < 0.02) {
                const directions = [
                    { x: 1, y: 0 }, { x: -1, y: 0 },
                    { x: 0, y: 1 }, { x: 0, y: -1 }
                ];
                enemy.direction = directions[Math.floor(Math.random() * directions.length)];
            }
        }
    }
    
    checkCollisions() {
        // Player vs enemies
        for (let enemy of this.enemies) {
            if (!enemy.inflated && enemy.x === this.player.x && enemy.y === this.player.y) {
                this.loseLife();
                return;
            }
        }
        
        // Player vs vegetables
        for (let vegetable of this.vegetables) {
            if (!vegetable.collected && vegetable.x === this.player.x && vegetable.y === this.player.y) {
                vegetable.collected = true;
                this.score += 500;
                this.playSound(800, 0.3);
                this.updateUI();
            }
        }
    }
    
    checkWinCondition() {
        const remainingVegetables = this.vegetables.filter(v => !v.collected).length;
        if (remainingVegetables === 0) {
            this.level++;
            this.score += 1000;
            this.initLevel();
            this.playSound(1000, 0.5);
            this.updateUI();
        }
    }
    
    loseLife() {
        this.lives--;
        this.playSound(200, 1.0, 'sawtooth');
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.player.x = Math.floor(this.cols / 2);
            this.player.y = Math.floor(this.rows / 2);
        }
        
        this.updateUI();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('tunnel-hero-high-score', this.highScore.toString());
        }
    }
    
    updateUI() {
        this.scoreElement.textContent = `Score: ${this.score}`;
        this.livesElement.textContent = `Lives: ${this.lives}`;
        this.levelElement.textContent = `Level: ${this.level}`;
    }
    
    render() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw dirt
        this.ctx.fillStyle = '#8B4513';
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.dirt[y][x]) {
                    this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                }
            }
        }
        
        // Draw player
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillRect(
            this.player.x * this.tileSize + 2,
            this.player.y * this.tileSize + 2,
            this.tileSize - 4,
            this.tileSize - 4
        );
        
        // Draw enemies
        for (let enemy of this.enemies) {
            if (enemy.inflated) {
                this.ctx.fillStyle = enemy.inflateTimer > 60 ? '#FFFF00' : '#FF0000';
            } else {
                this.ctx.fillStyle = '#FF00FF';
            }
            
            this.ctx.fillRect(
                enemy.x * this.tileSize + 2,
                enemy.y * this.tileSize + 2,
                this.tileSize - 4,
                this.tileSize - 4
            );
        }
        
        // Draw vegetables
        this.ctx.fillStyle = '#00FF00';
        for (let vegetable of this.vegetables) {
            if (!vegetable.collected) {
                this.ctx.fillRect(
                    vegetable.x * this.tileSize + 4,
                    vegetable.y * this.tileSize + 4,
                    this.tileSize - 8,
                    this.tileSize - 8
                );
            }
        }
        
        // Draw game state messages
        this.ctx.font = '24px Courier New';
        this.ctx.textAlign = 'center';
        
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fillText('TUNNEL HERO', this.canvas.width / 2, this.canvas.height / 2 - 60);
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Dig through dirt and collect vegetables!', this.canvas.width / 2, this.canvas.height / 2 - 20);
            this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
            this.ctx.fillText('Press ENTER to Start', this.canvas.width / 2, this.canvas.height / 2 + 60);
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
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.addEventListener('load', () => {
    new TunnelHero();
});