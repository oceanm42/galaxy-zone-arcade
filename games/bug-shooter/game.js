class BugShooter {
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
        this.highScore = parseInt(localStorage.getItem('bug-shooter-high-score') || '0');
        
        this.player = {
            x: this.canvas.width / 2 - 15,
            y: this.canvas.height - 60,
            width: 30,
            height: 20,
            speed: 6
        };
        
        this.bullets = [];
        this.centipede = [];
        this.mushrooms = [];
        this.spiders = [];
        this.fleas = [];
        
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
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.gameState === 'playing') this.shoot();
            }
            if (e.code === 'Enter') {
                e.preventDefault();
                this.handleEnterPress();
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
        this.player.x = this.canvas.width / 2 - 15;
        this.initLevel();
        this.updateUI();
    }
    
    initLevel() {
        this.bullets = [];
        this.centipede = [];
        this.mushrooms = [];
        this.spiders = [];
        this.fleas = [];
        
        // Create centipede
        const segments = 12;
        for (let i = 0; i < segments; i++) {
            this.centipede.push({
                x: i * 20,
                y: 50,
                width: 18,
                height: 18,
                vx: 2,
                vy: 0,
                isHead: i === 0
            });
        }
        
        // Create random mushrooms
        for (let i = 0; i < 30; i++) {
            this.mushrooms.push({
                x: Math.random() * (this.canvas.width - 20),
                y: 100 + Math.random() * 300,
                width: 20,
                height: 20,
                health: 4
            });
        }
    }
    
    shoot() {
        this.bullets.push({
            x: this.player.x + this.player.width / 2 - 2,
            y: this.player.y,
            width: 4,
            height: 10,
            speed: 10
        });
        this.playSound(800, 0.1);
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updatePlayer();
        this.updateBullets();
        this.updateCentipede();
        this.checkCollisions();
        this.checkWinCondition();
    }
    
    updatePlayer() {
        if (this.keys['ArrowLeft'] && this.player.x > 0) {
            this.player.x -= this.player.speed;
        }
        if (this.keys['ArrowRight'] && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += this.player.speed;
        }
    }
    
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].y -= this.bullets[i].speed;
            if (this.bullets[i].y < 0) {
                this.bullets.splice(i, 1);
            }
        }
    }
    
    updateCentipede() {
        for (let segment of this.centipede) {
            segment.x += segment.vx;
            
            // Bounce off walls or mushrooms
            if (segment.x <= 0 || segment.x >= this.canvas.width - segment.width) {
                segment.vx *= -1;
                segment.y += 20;
            }
            
            // Check mushroom collision
            for (let mushroom of this.mushrooms) {
                if (segment.x < mushroom.x + mushroom.width &&
                    segment.x + segment.width > mushroom.x &&
                    segment.y < mushroom.y + mushroom.height &&
                    segment.y + segment.height > mushroom.y) {
                    segment.vx *= -1;
                    segment.y += 20;
                    break;
                }
            }
        }
    }
    
    checkCollisions() {
        // Bullets vs centipede
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let j = this.centipede.length - 1; j >= 0; j--) {
                const segment = this.centipede[j];
                
                if (bullet.x < segment.x + segment.width &&
                    bullet.x + bullet.width > segment.x &&
                    bullet.y < segment.y + segment.height &&
                    bullet.y + bullet.height > segment.y) {
                    
                    this.bullets.splice(i, 1);
                    this.centipede.splice(j, 1);
                    this.score += segment.isHead ? 100 : 50;
                    
                    // Create mushroom where segment died
                    this.mushrooms.push({
                        x: segment.x,
                        y: segment.y,
                        width: 20,
                        height: 20,
                        health: 4
                    });
                    
                    this.playSound(600, 0.2);
                    this.updateUI();
                    break;
                }
            }
        }
        
        // Bullets vs mushrooms
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let j = this.mushrooms.length - 1; j >= 0; j--) {
                const mushroom = this.mushrooms[j];
                
                if (bullet.x < mushroom.x + mushroom.width &&
                    bullet.x + bullet.width > mushroom.x &&
                    bullet.y < mushroom.y + mushroom.height &&
                    bullet.y + bullet.height > mushroom.y) {
                    
                    this.bullets.splice(i, 1);
                    mushroom.health--;
                    
                    if (mushroom.health <= 0) {
                        this.mushrooms.splice(j, 1);
                        this.score += 20;
                    }
                    
                    this.playSound(400, 0.1);
                    this.updateUI();
                    break;
                }
            }
        }
        
        // Player vs centipede
        for (let segment of this.centipede) {
            if (this.player.x < segment.x + segment.width &&
                this.player.x + this.player.width > segment.x &&
                this.player.y < segment.y + segment.height &&
                this.player.y + this.player.height > segment.y) {
                this.loseLife();
                return;
            }
        }
    }
    
    checkWinCondition() {
        if (this.centipede.length === 0) {
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
            this.player.x = this.canvas.width / 2 - 15;
        }
        
        this.updateUI();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('bug-shooter-high-score', this.highScore.toString());
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
        
        // Draw player
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Draw bullets
        this.ctx.fillStyle = '#FFFFFF';
        for (let bullet of this.bullets) {
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
        
        // Draw centipede
        for (let i = 0; i < this.centipede.length; i++) {
            const segment = this.centipede[i];
            this.ctx.fillStyle = segment.isHead ? '#FF0000' : '#00FF00';
            this.ctx.fillRect(segment.x, segment.y, segment.width, segment.height);
        }
        
        // Draw mushrooms
        this.ctx.fillStyle = '#FFFF00';
        for (let mushroom of this.mushrooms) {
            this.ctx.fillRect(mushroom.x, mushroom.y, mushroom.width, mushroom.height);
        }
        
        // Draw game state messages
        this.ctx.font = '24px Courier New';
        this.ctx.textAlign = 'center';
        
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fillText('BUG SHOOTER', this.canvas.width / 2, this.canvas.height / 2 - 60);
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Stop the centipede invasion!', this.canvas.width / 2, this.canvas.height / 2 - 20);
            this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
            this.ctx.fillText('Press ENTER to Start', this.canvas.width / 2, this.canvas.height / 2 + 60);
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

window.addEventListener('load', () => {
    new BugShooter();
});