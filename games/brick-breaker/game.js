class BrickBreaker {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.levelElement = document.getElementById('level');
        
        this.gameState = 'ready'; // ready, playing, paused, gameOver, levelComplete
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.highScore = parseInt(localStorage.getItem('brick-breaker-high-score') || '0');
        
        // Game objects
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 60,
            dx: 5,
            dy: -5,
            radius: 8,
            speed: 5
        };
        
        this.paddle = {
            x: this.canvas.width / 2 - 60,
            y: this.canvas.height - 30,
            width: 120,
            height: 15,
            speed: 8
        };
        
        this.bricks = [];
        this.brickColors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF'];
        
        // Input handling
        this.keys = {};
        this.setupEventListeners();
        
        // Audio context for sound effects
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
                this.handleSpacePress();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
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
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    handleSpacePress() {
        switch (this.gameState) {
            case 'ready':
                this.startGame();
                break;
            case 'playing':
                this.pauseGame();
                break;
            case 'paused':
                this.resumeGame();
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
    
    pauseGame() {
        this.gameState = 'paused';
    }
    
    resumeGame() {
        this.gameState = 'playing';
    }
    
    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameState = 'ready';
        this.resetBall();
        this.initLevel();
        this.updateUI();
    }
    
    nextLevel() {
        this.level++;
        this.gameState = 'ready';
        this.resetBall();
        this.initLevel();
        this.ball.speed = Math.min(this.ball.speed + 0.5, 8);
        this.updateUI();
    }
    
    resetBall() {
        this.ball.x = this.paddle.x + this.paddle.width / 2;
        this.ball.y = this.paddle.y - this.ball.radius - 5;
        this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * this.ball.speed;
        this.ball.dy = -this.ball.speed;
    }
    
    initLevel() {
        this.bricks = [];
        const rows = 6;
        const cols = 10;
        const brickWidth = 70;
        const brickHeight = 20;
        const padding = 5;
        const offsetX = (this.canvas.width - (cols * (brickWidth + padding))) / 2;
        const offsetY = 60;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                this.bricks.push({
                    x: offsetX + col * (brickWidth + padding),
                    y: offsetY + row * (brickHeight + padding),
                    width: brickWidth,
                    height: brickHeight,
                    color: this.brickColors[row],
                    points: (6 - row) * 10,
                    destroyed: false
                });
            }
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updateInput();
        this.updateBall();
        this.checkCollisions();
        this.checkWinCondition();
    }
    
    updateInput() {
        // Paddle movement
        if (this.keys['ArrowLeft'] && this.paddle.x > 0) {
            this.paddle.x -= this.paddle.speed;
        }
        if (this.keys['ArrowRight'] && this.paddle.x < this.canvas.width - this.paddle.width) {
            this.paddle.x += this.paddle.speed;
        }
    }
    
    updateBall() {
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        
        // Wall collisions
        if (this.ball.x <= this.ball.radius || this.ball.x >= this.canvas.width - this.ball.radius) {
            this.ball.dx *= -1;
            this.playSound(220, 0.1);
        }
        
        if (this.ball.y <= this.ball.radius) {
            this.ball.dy *= -1;
            this.playSound(220, 0.1);
        }
        
        // Bottom boundary (lose life)
        if (this.ball.y > this.canvas.height) {
            this.loseLife();
        }
    }
    
    checkCollisions() {
        // Paddle collision
        if (this.ball.y + this.ball.radius >= this.paddle.y &&
            this.ball.x >= this.paddle.x &&
            this.ball.x <= this.paddle.x + this.paddle.width &&
            this.ball.dy > 0) {
            
            this.ball.dy *= -1;
            
            // Add angle based on where ball hits paddle
            const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
            this.ball.dx = (hitPos - 0.5) * this.ball.speed * 2;
            
            this.playSound(330, 0.1);
        }
        
        // Brick collisions
        for (let brick of this.bricks) {
            if (brick.destroyed) continue;
            
            if (this.ball.x + this.ball.radius >= brick.x &&
                this.ball.x - this.ball.radius <= brick.x + brick.width &&
                this.ball.y + this.ball.radius >= brick.y &&
                this.ball.y - this.ball.radius <= brick.y + brick.height) {
                
                brick.destroyed = true;
                this.score += brick.points;
                this.updateUI();
                
                // Determine collision side
                const ballCenterX = this.ball.x;
                const ballCenterY = this.ball.y;
                const brickCenterX = brick.x + brick.width / 2;
                const brickCenterY = brick.y + brick.height / 2;
                
                const dx = ballCenterX - brickCenterX;
                const dy = ballCenterY - brickCenterY;
                
                if (Math.abs(dx / brick.width) > Math.abs(dy / brick.height)) {
                    this.ball.dx *= -1;
                } else {
                    this.ball.dy *= -1;
                }
                
                this.playSound(440 + brick.points, 0.1);
                break;
            }
        }
    }
    
    checkWinCondition() {
        const remainingBricks = this.bricks.filter(brick => !brick.destroyed).length;
        if (remainingBricks === 0) {
            this.gameState = 'levelComplete';
            this.score += this.lives * 100; // Bonus for remaining lives
            this.playSound(600, 0.5);
            setTimeout(() => this.nextLevel(), 2000);
        }
    }
    
    loseLife() {
        this.lives--;
        this.playSound(150, 0.5, 'sawtooth');
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.resetBall();
            this.gameState = 'ready';
        }
        
        this.updateUI();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('brick-breaker-high-score', this.highScore.toString());
        }
        
        this.playSound(200, 1.0, 'sawtooth');
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
        
        // Draw bricks
        for (let brick of this.bricks) {
            if (!brick.destroyed) {
                this.ctx.fillStyle = brick.color;
                this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
                
                // Add border
                this.ctx.strokeStyle = '#FFF';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
            }
        }
        
        // Draw paddle
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
        
        // Draw ball
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw game state messages
        this.ctx.font = '24px Courier New';
        this.ctx.textAlign = 'center';
        
        switch (this.gameState) {
            case 'ready':
                this.ctx.fillStyle = '#FFFF00';
                this.ctx.fillText('Press SPACE to Launch Ball', this.canvas.width / 2, this.canvas.height / 2);
                break;
            case 'paused':
                this.ctx.fillStyle = '#FFFF00';
                this.ctx.fillText('PAUSED - Press SPACE to Resume', this.canvas.width / 2, this.canvas.height / 2);
                break;
            case 'gameOver':
                this.ctx.fillStyle = '#FF0000';
                this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);
                this.ctx.fillStyle = '#FFFF00';
                this.ctx.font = '18px Courier New';
                this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
                this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
                this.ctx.fillText('Press SPACE to Play Again', this.canvas.width / 2, this.canvas.height / 2 + 60);
                break;
            case 'levelComplete':
                this.ctx.fillStyle = '#00FF00';
                this.ctx.fillText(`Level ${this.level} Complete!`, this.canvas.width / 2, this.canvas.height / 2);
                this.ctx.fillStyle = '#FFFF00';
                this.ctx.font = '18px Courier New';
                this.ctx.fillText('Next level starting...', this.canvas.width / 2, this.canvas.height / 2 + 30);
                break;
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
    new BrickBreaker();
});