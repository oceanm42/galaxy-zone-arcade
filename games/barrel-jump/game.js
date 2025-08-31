class BarrelJump {
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
        this.highScore = parseInt(localStorage.getItem('barrel-jump-high-score') || '0');
        
        this.player = {
            x: 50,
            y: 520,
            vx: 0,
            vy: 0,
            width: 20,
            height: 30,
            onGround: false,
            climbing: false,
            jumpPower: 15,
            speed: 4,
            gravity: 0.8
        };
        
        this.platforms = [];
        this.ladders = [];
        this.barrels = [];
        this.princess = { x: 100, y: 80, reached: false };
        
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
            
            if (e.code === 'Space' && this.gameState === 'playing') {
                e.preventDefault();
                this.jump();
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
            case 'menu':
                this.startGame();
                break;
            case 'gameOver':
            case 'levelComplete':
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
        this.resetPlayer();
        this.initLevel();
        this.updateUI();
    }
    
    resetPlayer() {
        this.player.x = 50;
        this.player.y = 520;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.onGround = false;
        this.player.climbing = false;
    }
    
    initLevel() {
        this.barrels = [];
        this.princess.reached = false;
        
        // Create platforms (diagonal ramps)
        this.platforms = [
            { x: 0, y: 550, width: 800, height: 50 },      // Bottom
            { x: 0, y: 450, width: 600, height: 20 },       // Level 1
            { x: 200, y: 350, width: 600, height: 20 },     // Level 2
            { x: 0, y: 250, width: 600, height: 20 },       // Level 3
            { x: 200, y: 150, width: 600, height: 20 },     // Level 4
            { x: 0, y: 100, width: 300, height: 20 }        // Top platform
        ];
        
        // Create ladders
        this.ladders = [
            { x: 700, y: 450, width: 20, height: 100 },     // To level 1
            { x: 150, y: 350, width: 20, height: 100 },     // To level 2
            { x: 700, y: 250, width: 20, height: 100 },     // To level 3
            { x: 150, y: 150, width: 20, height: 100 },     // To level 4
            { x: 350, y: 100, width: 20, height: 50 }       // To princess
        ];
    }
    
    jump() {
        if (this.player.onGround || this.player.climbing) {
            this.player.vy = -this.player.jumpPower;
            this.player.onGround = false;
            this.player.climbing = false;
            this.playSound(600, 0.2);
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updatePlayer();
        this.updateBarrels();
        this.spawnBarrels();
        this.checkCollisions();
        this.checkWinCondition();
    }
    
    updatePlayer() {
        // Handle input
        if (this.keys['ArrowLeft']) {
            this.player.vx = -this.player.speed;
        } else if (this.keys['ArrowRight']) {
            this.player.vx = this.player.speed;
        } else {
            this.player.vx *= 0.8; // Friction
        }
        
        // Climbing
        this.player.climbing = false;
        if (this.keys['ArrowUp']) {
            for (let ladder of this.ladders) {
                if (this.player.x + this.player.width > ladder.x &&
                    this.player.x < ladder.x + ladder.width &&
                    this.player.y + this.player.height > ladder.y &&
                    this.player.y < ladder.y + ladder.height) {
                    this.player.climbing = true;
                    this.player.vy = -3;
                    this.player.vx = 0;
                    break;
                }
            }
        }
        
        // Apply gravity
        if (!this.player.climbing) {
            this.player.vy += this.player.gravity;
        }
        
        // Update position
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;
        
        // Keep player in bounds
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x > this.canvas.width - this.player.width) {
            this.player.x = this.canvas.width - this.player.width;
        }
        
        // Platform collision
        this.player.onGround = false;
        for (let platform of this.platforms) {
            if (this.player.x + this.player.width > platform.x &&
                this.player.x < platform.x + platform.width &&
                this.player.y + this.player.height > platform.y &&
                this.player.y + this.player.height < platform.y + platform.height + 10 &&
                this.player.vy >= 0) {
                
                this.player.y = platform.y - this.player.height;
                this.player.vy = 0;
                this.player.onGround = true;
            }
        }
        
        // Fall off screen
        if (this.player.y > this.canvas.height) {
            this.loseLife();
        }
    }
    
    spawnBarrels() {
        if (Math.random() < 0.005 + this.level * 0.002) {
            this.barrels.push({
                x: 750,
                y: 100,
                vx: -2 - this.level * 0.5,
                vy: 0,
                width: 20,
                height: 20,
                bouncing: false
            });
        }
    }
    
    updateBarrels() {
        for (let i = this.barrels.length - 1; i >= 0; i--) {
            const barrel = this.barrels[i];
            
            // Apply gravity
            barrel.vy += 0.5;
            
            // Update position
            barrel.x += barrel.vx;
            barrel.y += barrel.vy;
            
            // Platform collision
            for (let platform of this.platforms) {
                if (barrel.x + barrel.width > platform.x &&
                    barrel.x < platform.x + platform.width &&
                    barrel.y + barrel.height > platform.y &&
                    barrel.y + barrel.height < platform.y + platform.height + 10 &&
                    barrel.vy > 0) {
                    
                    barrel.y = platform.y - barrel.height;
                    barrel.vy = 0;
                    
                    // Chance to fall off platform
                    if (Math.random() < 0.3) {
                        barrel.vy = 2;
                    }
                }
            }
            
            // Remove barrels that fall off screen
            if (barrel.y > this.canvas.height || barrel.x < -barrel.width) {
                this.barrels.splice(i, 1);
            }
        }
    }
    
    checkCollisions() {
        // Player vs barrels
        for (let barrel of this.barrels) {
            if (this.player.x + this.player.width > barrel.x &&
                this.player.x < barrel.x + barrel.width &&
                this.player.y + this.player.height > barrel.y &&
                this.player.y < barrel.y + barrel.height) {
                this.loseLife();
                return;
            }
        }
        
        // Player vs princess
        if (this.player.x + this.player.width > this.princess.x &&
            this.player.x < this.princess.x + 30 &&
            this.player.y + this.player.height > this.princess.y &&
            this.player.y < this.princess.y + 30) {
            this.princess.reached = true;
        }
    }
    
    checkWinCondition() {
        if (this.princess.reached) {
            this.levelComplete();
        }
    }
    
    levelComplete() {
        this.gameState = 'levelComplete';
        this.level++;
        this.score += 1000 + this.lives * 500;
        this.playSound(1000, 1.0);
        
        setTimeout(() => {
            this.resetPlayer();
            this.initLevel();
            this.gameState = 'playing';
        }, 2000);
        
        this.updateUI();
    }
    
    loseLife() {
        this.lives--;
        this.playSound(200, 1.0, 'sawtooth');
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.resetPlayer();
        }
        
        this.updateUI();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('barrel-jump-high-score', this.highScore.toString());
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
        
        // Draw platforms
        this.ctx.fillStyle = '#FF7F00';
        for (let platform of this.platforms) {
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        }
        
        // Draw ladders
        this.ctx.fillStyle = '#FFFF00';
        for (let ladder of this.ladders) {
            this.ctx.fillRect(ladder.x, ladder.y, ladder.width, ladder.height);
            
            // Draw ladder rungs
            this.ctx.fillStyle = '#FF7F00';
            for (let y = ladder.y; y < ladder.y + ladder.height; y += 15) {
                this.ctx.fillRect(ladder.x, y, ladder.width, 3);
            }
            this.ctx.fillStyle = '#FFFF00';
        }
        
        // Draw player
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Draw barrels
        this.ctx.fillStyle = '#8B4513';
        for (let barrel of this.barrels) {
            this.ctx.fillRect(barrel.x, barrel.y, barrel.width, barrel.height);
            
            // Barrel details
            this.ctx.fillStyle = '#654321';
            this.ctx.fillRect(barrel.x + 2, barrel.y + 2, barrel.width - 4, 3);
            this.ctx.fillRect(barrel.x + 2, barrel.y + barrel.height - 5, barrel.width - 4, 3);
            this.ctx.fillStyle = '#8B4513';
        }
        
        // Draw princess
        if (!this.princess.reached) {
            this.ctx.fillStyle = '#FF69B4';
            this.ctx.fillRect(this.princess.x, this.princess.y, 30, 30);
            
            // Crown
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillRect(this.princess.x + 5, this.princess.y - 5, 20, 8);
        }
        
        // Draw game state messages
        this.ctx.font = '24px Courier New';
        this.ctx.textAlign = 'center';
        
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fillText('BARREL JUMP', this.canvas.width / 2, this.canvas.height / 2 - 60);
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Climb the construction site to rescue the princess!', this.canvas.width / 2, this.canvas.height / 2 - 20);
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
        } else if (this.gameState === 'levelComplete') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#00FF00';
            this.ctx.fillText('PRINCESS RESCUED!', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Next level starting...', this.canvas.width / 2, this.canvas.height / 2 + 30);
        }
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.addEventListener('load', () => {
    new BarrelJump();
});