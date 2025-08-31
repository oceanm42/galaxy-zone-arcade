class NeonCycles {
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
        this.highScore = parseInt(localStorage.getItem('neon-cycles-high-score') || '0');
        
        this.tileSize = 4;
        this.player = { x: 50, y: 50, direction: { x: 1, y: 0 }, trail: [], speed: 2 };
        this.ai = { x: 200, y: 200, direction: { x: -1, y: 0 }, trail: [], speed: 2 };
        this.trails = [];
        
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
            if (this.gameState === 'playing') {
                this.handleDirectionInput(e.code);
            }
        });
    }
    
    handleDirectionInput(code) {
        switch(code) {
            case 'ArrowUp':
                if (this.player.direction.y === 0) this.player.direction = { x: 0, y: -1 };
                break;
            case 'ArrowDown':
                if (this.player.direction.y === 0) this.player.direction = { x: 0, y: 1 };
                break;
            case 'ArrowLeft':
                if (this.player.direction.x === 0) this.player.direction = { x: -1, y: 0 };
                break;
            case 'ArrowRight':
                if (this.player.direction.x === 0) this.player.direction = { x: 1, y: 0 };
                break;
        }
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
    
    startGame() { this.gameState = 'playing'; }
    
    resetGame() {
        this.score = 0; this.lives = 3; this.level = 1; this.gameState = 'menu';
        this.player = { x: 50, y: 50, direction: { x: 1, y: 0 }, trail: [], speed: 2 };
        this.ai = { x: 200, y: 200, direction: { x: -1, y: 0 }, trail: [], speed: 2 };
        this.trails = [];
        this.updateUI();
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updatePlayer();
        this.updateAI();
        this.checkCollisions();
    }
    
    updatePlayer() {
        // Add current position to trail
        this.player.trail.push({ x: this.player.x, y: this.player.y });
        
        // Move player
        this.player.x += this.player.direction.x * this.player.speed;
        this.player.y += this.player.direction.y * this.player.speed;
        
        // Keep trail manageable
        if (this.player.trail.length > 1000) {
            this.player.trail.shift();
        }
    }
    
    updateAI() {
        // Simple AI: try not to hit walls or trails
        const directions = [
            { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
        ];
        
        // Change direction occasionally or if about to hit something
        if (Math.random() < 0.02 || this.willHitObstacle(this.ai)) {
            const validDirections = directions.filter(dir => 
                !(dir.x === -this.ai.direction.x && dir.y === -this.ai.direction.y) && // Don't reverse
                !this.willHitObstacle({ ...this.ai, direction: dir })
            );
            
            if (validDirections.length > 0) {
                this.ai.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
            }
        }
        
        // Add current position to trail
        this.ai.trail.push({ x: this.ai.x, y: this.ai.y });
        
        // Move AI
        this.ai.x += this.ai.direction.x * this.ai.speed;
        this.ai.y += this.ai.direction.y * this.ai.speed;
        
        // Keep trail manageable
        if (this.ai.trail.length > 1000) {
            this.ai.trail.shift();
        }
    }
    
    willHitObstacle(cycle) {
        const nextX = cycle.x + cycle.direction.x * cycle.speed * 10;
        const nextY = cycle.y + cycle.direction.y * cycle.speed * 10;
        
        // Check walls
        if (nextX < 0 || nextX >= this.canvas.width || nextY < 0 || nextY >= this.canvas.height) {
            return true;
        }
        
        // Check trails (simplified)
        const checkDistance = 5;
        for (let point of [...this.player.trail, ...this.ai.trail]) {
            if (Math.abs(nextX - point.x) < checkDistance && Math.abs(nextY - point.y) < checkDistance) {
                return true;
            }
        }
        
        return false;
    }
    
    checkCollisions() {
        // Check wall collisions
        if (this.player.x < 0 || this.player.x >= this.canvas.width || 
            this.player.y < 0 || this.player.y >= this.canvas.height) {
            this.loseLife();
            return;
        }
        
        if (this.ai.x < 0 || this.ai.x >= this.canvas.width || 
            this.ai.y < 0 || this.ai.y >= this.canvas.height) {
            this.score += 100;
            this.nextRound();
            return;
        }
        
        // Check trail collisions
        const checkCollision = (cycle, trails) => {
            for (let point of trails) {
                if (Math.abs(cycle.x - point.x) < this.tileSize && 
                    Math.abs(cycle.y - point.y) < this.tileSize) {
                    return true;
                }
            }
            return false;
        };
        
        // Player vs all trails
        if (checkCollision(this.player, [...this.player.trail.slice(0, -10), ...this.ai.trail])) {
            this.loseLife();
            return;
        }
        
        // AI vs all trails
        if (checkCollision(this.ai, [...this.ai.trail.slice(0, -10), ...this.player.trail])) {
            this.score += 100;
            this.nextRound();
            return;
        }
    }
    
    nextRound() {
        this.level++;
        this.player = { x: 50, y: 50, direction: { x: 1, y: 0 }, trail: [], speed: 2 };
        this.ai = { x: 200, y: 200, direction: { x: -1, y: 0 }, trail: [], speed: 2 + this.level * 0.2 };
        this.playSound(800, 0.5);
        this.updateUI();
    }
    
    loseLife() {
        this.lives--;
        this.playSound(200, 1.0, 'sawtooth');
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.player = { x: 50, y: 50, direction: { x: 1, y: 0 }, trail: [], speed: 2 };
            this.ai = { x: 200, y: 200, direction: { x: -1, y: 0 }, trail: [], speed: 2 };
        }
        
        this.updateUI();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('neon-cycles-high-score', this.highScore.toString());
        }
    }
    
    updateUI() {
        this.scoreElement.textContent = `Score: ${this.score}`;
        this.livesElement.textContent = `Lives: ${this.lives}`;
        this.levelElement.textContent = `Level: ${this.level}`;
    }
    
    render() {
        this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw trails
        this.ctx.fillStyle = '#00FFFF';
        for (let point of this.player.trail) {
            this.ctx.fillRect(point.x - this.tileSize/2, point.y - this.tileSize/2, this.tileSize, this.tileSize);
        }
        
        this.ctx.fillStyle = '#FF00FF';
        for (let point of this.ai.trail) {
            this.ctx.fillRect(point.x - this.tileSize/2, point.y - this.tileSize/2, this.tileSize, this.tileSize);
        }
        
        // Draw cycles
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(this.player.x - 4, this.player.y - 4, 8, 8);
        
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.fillRect(this.ai.x - 4, this.ai.y - 4, 8, 8);
        
        this.ctx.font = '24px Courier New'; this.ctx.textAlign = 'center';
        
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fillText('NEON CYCLES', this.canvas.width / 2, this.canvas.height / 2 - 60);
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Survive the light cycle arena!', this.canvas.width / 2, this.canvas.height / 2 - 20);
            this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
            this.ctx.fillText('Press ENTER to Start', this.canvas.width / 2, this.canvas.height / 2 + 60);
        } else if (this.gameState === 'gameOver') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
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

window.addEventListener('load', () => { new NeonCycles(); });