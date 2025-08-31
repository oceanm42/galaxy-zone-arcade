class KnightFlyer {
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
        this.highScore = parseInt(localStorage.getItem('knight-flyer-high-score') || '0');
        
        this.player = { x: this.canvas.width / 2, y: this.canvas.height / 2, width: 30, height: 20, vx: 0, vy: 0, speed: 6 };
        this.enemies = [];
        
        this.keys = {};
        this.setupEventListeners();
        this.setupAudio();
        this.setupNavigation();
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
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    setupAudio() { this.audioContext = new (window.AudioContext || window.webkitAudioContext)(); }
    
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
    
    startGame() { this.gameState = 'playing'; this.spawnEnemies(); }
    
    resetGame() {
        this.score = 0; this.lives = 3; this.level = 1; this.gameState = 'menu';
        this.player = { x: this.canvas.width / 2, y: this.canvas.height / 2, width: 30, height: 20, vx: 0, vy: 0, speed: 6 };
        this.enemies = [];
        this.updateUI();
    }
    
    spawnEnemies() {
        this.enemies = [];
        for (let i = 0; i < 3 + this.level; i++) {
            this.enemies.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                width: 25, height: 15
            });
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        this.updatePlayer();
        this.updateEnemies();
        this.checkCollisions();
    }
    
    updatePlayer() {
        // Physics-based flight
        if (this.keys['ArrowLeft']) this.player.vx -= 0.3;
        if (this.keys['ArrowRight']) this.player.vx += 0.3;
        if (this.keys['ArrowUp']) this.player.vy -= 0.4;
        if (this.keys['ArrowDown']) this.player.vy += 0.2;
        
        // Gravity
        this.player.vy += 0.2;
        
        // Friction
        this.player.vx *= 0.95;
        this.player.vy *= 0.98;
        
        // Update position
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;
        
        // Wrap around screen
        if (this.player.x < 0) this.player.x = this.canvas.width;
        if (this.player.x > this.canvas.width) this.player.x = 0;
        if (this.player.y < 0) this.player.y = this.canvas.height;
        if (this.player.y > this.canvas.height) this.player.y = 0;
    }
    
    updateEnemies() {
        for (let enemy of this.enemies) {
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            
            // Bounce off walls
            if (enemy.x <= 0 || enemy.x >= this.canvas.width - enemy.width) enemy.vx *= -1;
            if (enemy.y <= 0 || enemy.y >= this.canvas.height - enemy.height) enemy.vy *= -1;
        }
    }
    
    checkCollisions() {
        for (let enemy of this.enemies) {
            if (this.player.x < enemy.x + enemy.width &&
                this.player.x + this.player.width > enemy.x &&
                this.player.y < enemy.y + enemy.height &&
                this.player.y + this.player.height > enemy.y) {
                this.loseLife();
                return;
            }
        }
    }
    
    loseLife() {
        this.lives--;
        this.playSound(200, 1.0, 'sawtooth');
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.player.x = this.canvas.width / 2;
            this.player.y = this.canvas.height / 2;
            this.player.vx = 0; this.player.vy = 0;
        }
        this.updateUI();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('knight-flyer-high-score', this.highScore.toString());
        }
    }
    
    updateUI() {
        this.scoreElement.textContent = `Score: ${this.score}`;
        this.livesElement.textContent = `Lives: ${this.lives}`;
        this.levelElement.textContent = `Level: ${this.level}`;
    }
    
    render() {
        this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw player
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Draw enemies
        this.ctx.fillStyle = '#FF0000';
        for (let enemy of this.enemies) {
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
        
        this.ctx.font = '24px Courier New'; this.ctx.textAlign = 'center';
        
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fillText('KNIGHT FLYER', this.canvas.width / 2, this.canvas.height / 2 - 60);
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Master physics-based flight!', this.canvas.width / 2, this.canvas.height / 2 - 20);
            this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
            this.ctx.fillText('Press ENTER to Start', this.canvas.width / 2, this.canvas.height / 2 + 60);
        } else if (this.gameState === 'gameOver') {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);
            this.ctx.fillStyle = '#FFFF00'; this.ctx.font = '18px Courier New';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
            this.ctx.fillText('Press ENTER to Play Again', this.canvas.width / 2, this.canvas.height / 2 + 60);
        }
    }
    
    gameLoop() { this.update(); this.render(); requestAnimationFrame(() => this.gameLoop()); }
}

window.addEventListener('load', () => { new KnightFlyer(); });