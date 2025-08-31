class StarGuardian {
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
        this.highScore = parseInt(localStorage.getItem('star-guardian-high-score') || '0');
        
        this.player = { x: 50, y: this.canvas.height / 2, width: 30, height: 20, speed: 5 };
        this.bullets = [];
        this.enemies = [];
        this.humans = [];
        this.scrollOffset = 0;
        
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
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.gameState === 'playing') this.shoot();
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
    
    startGame() { this.gameState = 'playing'; this.spawnEnemies(); this.spawnHumans(); }
    
    resetGame() {
        this.score = 0; this.lives = 3; this.level = 1; this.gameState = 'menu';
        this.player = { x: 50, y: this.canvas.height / 2, width: 30, height: 20, speed: 5 };
        this.bullets = []; this.enemies = []; this.humans = []; this.scrollOffset = 0;
        this.updateUI();
    }
    
    spawnEnemies() {
        for (let i = 0; i < 5; i++) {
            this.enemies.push({
                x: this.canvas.width + Math.random() * 200,
                y: Math.random() * this.canvas.height,
                vx: -2 - Math.random() * 2,
                width: 25, height: 15
            });
        }
    }
    
    spawnHumans() {
        for (let i = 0; i < 3; i++) {
            this.humans.push({
                x: this.canvas.width + Math.random() * 300,
                y: this.canvas.height - 30,
                rescued: false,
                width: 10, height: 20
            });
        }
    }
    
    shoot() {
        this.bullets.push({
            x: this.player.x + this.player.width,
            y: this.player.y + this.player.height / 2,
            width: 8, height: 3, speed: 8
        });
        this.playSound(800, 0.1);
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.scrollOffset += 2;
        this.updatePlayer();
        this.updateBullets();
        this.updateEnemies();
        this.checkCollisions();
        this.spawnNewElements();
    }
    
    updatePlayer() {
        if (this.keys['ArrowUp'] && this.player.y > 0) this.player.y -= this.player.speed;
        if (this.keys['ArrowDown'] && this.player.y < this.canvas.height - this.player.height) this.player.y += this.player.speed;
        if (this.keys['ArrowLeft'] && this.player.x > 0) this.player.x -= this.player.speed;
        if (this.keys['ArrowRight'] && this.player.x < this.canvas.width / 2) this.player.x += this.player.speed;
    }
    
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].x += this.bullets[i].speed;
            if (this.bullets[i].x > this.canvas.width) this.bullets.splice(i, 1);
        }
    }
    
    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.enemies[i].x += this.enemies[i].vx;
            if (this.enemies[i].x < -this.enemies[i].width) this.enemies.splice(i, 1);
        }
    }
    
    checkCollisions() {
        // Bullets vs enemies
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (this.bullets[i] && this.enemies[j] &&
                    this.bullets[i].x < this.enemies[j].x + this.enemies[j].width &&
                    this.bullets[i].x + this.bullets[i].width > this.enemies[j].x &&
                    this.bullets[i].y < this.enemies[j].y + this.enemies[j].height &&
                    this.bullets[i].y + this.bullets[i].height > this.enemies[j].y) {
                    this.bullets.splice(i, 1);
                    this.enemies.splice(j, 1);
                    this.score += 100;
                    this.playSound(600, 0.2);
                    this.updateUI();
                    break;
                }
            }
        }
        
        // Player vs humans (rescue)
        for (let human of this.humans) {
            if (!human.rescued &&
                this.player.x < human.x + human.width &&
                this.player.x + this.player.width > human.x &&
                this.player.y < human.y + human.height &&
                this.player.y + this.player.height > human.y) {
                human.rescued = true;
                this.score += 500;
                this.playSound(1000, 0.3);
                this.updateUI();
            }
        }
    }
    
    spawnNewElements() {
        if (Math.random() < 0.02) this.spawnEnemies();
        if (Math.random() < 0.005) this.spawnHumans();
    }
    
    loseLife() {
        this.lives--;
        this.playSound(200, 1.0, 'sawtooth');
        if (this.lives <= 0) this.gameOver();
        this.updateUI();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('star-guardian-high-score', this.highScore.toString());
        }
    }
    
    updateUI() {
        this.scoreElement.textContent = `Score: ${this.score}`;
        this.livesElement.textContent = `Lives: ${this.lives}`;
        this.levelElement.textContent = `Level: ${this.level}`;
    }
    
    render() {
        this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw scrolling stars
        this.ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 30; i++) {
            const x = (i * 30 - this.scrollOffset) % this.canvas.width;
            const y = (i * 17) % this.canvas.height;
            this.ctx.fillRect(x, y, 1, 1);
        }
        
        // Draw player
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Draw bullets
        this.ctx.fillStyle = '#FFFF00';
        for (let bullet of this.bullets) {
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
        
        // Draw enemies
        this.ctx.fillStyle = '#FF0000';
        for (let enemy of this.enemies) {
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
        
        // Draw humans
        for (let human of this.humans) {
            this.ctx.fillStyle = human.rescued ? '#00FF00' : '#FFFFFF';
            this.ctx.fillRect(human.x, human.y, human.width, human.height);
        }
        
        this.ctx.font = '24px Courier New'; this.ctx.textAlign = 'center';
        
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fillText('STAR GUARDIAN', this.canvas.width / 2, this.canvas.height / 2 - 60);
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Defend the galaxy and rescue humans!', this.canvas.width / 2, this.canvas.height / 2 - 20);
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

window.addEventListener('load', () => { new StarGuardian(); });