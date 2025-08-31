class RetroTennis {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ui = document.getElementById('ui');
        this.scoreElement = document.getElementById('score');
        this.stateElement = document.getElementById('gameState');
        
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.score = { player: 0, ai: 0 };
        this.highScore = parseInt(localStorage.getItem('retro-tennis-high-score') || '0');
        
        // Game objects
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            dx: 5,
            dy: 3,
            radius: 8,
            speed: 5
        };
        
        this.playerPaddle = {
            x: 30,
            y: this.canvas.height / 2 - 40,
            width: 10,
            height: 80,
            dy: 0,
            speed: 6
        };
        
        this.aiPaddle = {
            x: this.canvas.width - 40,
            y: this.canvas.height / 2 - 40,
            width: 10,
            height: 80,
            dy: 0,
            speed: 4
        };
        
        // Input handling
        this.keys = {};
        this.setupEventListeners();
        
        // Audio context for sound effects
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
            case 'menu':
                this.startGame();
                break;
            case 'playing':
                this.pauseGame();
                break;
            case 'paused':
                this.resumeGame();
                break;
            case 'gameOver':
                this.resetGame();
                break;
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.resetBall();
        this.stateElement.textContent = '';
    }
    
    pauseGame() {
        this.gameState = 'paused';
        this.stateElement.textContent = 'PAUSED - Press SPACE to Resume';
    }
    
    resumeGame() {
        this.gameState = 'playing';
        this.stateElement.textContent = '';
    }
    
    resetGame() {
        this.score = { player: 0, ai: 0 };
        this.gameState = 'menu';
        this.resetBall();
        this.resetPaddles();
        this.stateElement.textContent = 'Press SPACE to Start';
        this.updateScore();
    }
    
    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * this.ball.speed;
        this.ball.dy = (Math.random() - 0.5) * this.ball.speed;
    }
    
    resetPaddles() {
        this.playerPaddle.y = this.canvas.height / 2 - this.playerPaddle.height / 2;
        this.aiPaddle.y = this.canvas.height / 2 - this.aiPaddle.height / 2;
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updateInput();
        this.updateBall();
        this.updateAI();
        this.checkCollisions();
        this.checkScore();
    }
    
    updateInput() {
        // Player paddle movement
        if (this.keys['ArrowUp'] && this.playerPaddle.y > 0) {
            this.playerPaddle.y -= this.playerPaddle.speed;
        }
        if (this.keys['ArrowDown'] && this.playerPaddle.y < this.canvas.height - this.playerPaddle.height) {
            this.playerPaddle.y += this.playerPaddle.speed;
        }
    }
    
    updateBall() {
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        
        // Top and bottom wall collision
        if (this.ball.y <= this.ball.radius || this.ball.y >= this.canvas.height - this.ball.radius) {
            this.ball.dy *= -1;
            this.playSound(220, 0.1);
        }
    }
    
    updateAI() {
        // Simple AI: move towards ball
        const paddleCenter = this.aiPaddle.y + this.aiPaddle.height / 2;
        const ballCenter = this.ball.y;
        
        if (paddleCenter < ballCenter - 10) {
            this.aiPaddle.y += this.aiPaddle.speed;
        } else if (paddleCenter > ballCenter + 10) {
            this.aiPaddle.y -= this.aiPaddle.speed;
        }
        
        // Keep AI paddle within bounds
        if (this.aiPaddle.y < 0) this.aiPaddle.y = 0;
        if (this.aiPaddle.y > this.canvas.height - this.aiPaddle.height) {
            this.aiPaddle.y = this.canvas.height - this.aiPaddle.height;
        }
    }
    
    checkCollisions() {
        // Player paddle collision
        if (this.ball.x <= this.playerPaddle.x + this.playerPaddle.width &&
            this.ball.x >= this.playerPaddle.x &&
            this.ball.y >= this.playerPaddle.y &&
            this.ball.y <= this.playerPaddle.y + this.playerPaddle.height) {
            
            this.ball.dx = Math.abs(this.ball.dx);
            
            // Add angle based on where ball hits paddle
            const hitPos = (this.ball.y - this.playerPaddle.y) / this.playerPaddle.height;
            this.ball.dy = (hitPos - 0.5) * this.ball.speed * 2;
            
            this.playSound(330, 0.1);
        }
        
        // AI paddle collision
        if (this.ball.x >= this.aiPaddle.x &&
            this.ball.x <= this.aiPaddle.x + this.aiPaddle.width &&
            this.ball.y >= this.aiPaddle.y &&
            this.ball.y <= this.aiPaddle.y + this.aiPaddle.height) {
            
            this.ball.dx = -Math.abs(this.ball.dx);
            
            // Add angle based on where ball hits paddle
            const hitPos = (this.ball.y - this.aiPaddle.y) / this.aiPaddle.height;
            this.ball.dy = (hitPos - 0.5) * this.ball.speed * 2;
            
            this.playSound(330, 0.1);
        }
    }
    
    checkScore() {
        // Left side (AI scores)
        if (this.ball.x < 0) {
            this.score.ai++;
            this.playSound(150, 0.3);
            this.resetBall();
            this.updateScore();
            
            if (this.score.ai >= 11) {
                this.gameOver();
            }
        }
        
        // Right side (Player scores)
        if (this.ball.x > this.canvas.width) {
            this.score.player++;
            this.playSound(400, 0.3);
            this.resetBall();
            this.updateScore();
            
            if (this.score.player >= 11) {
                this.gameOver();
            }
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        const totalScore = this.score.player;
        
        if (totalScore > this.highScore) {
            this.highScore = totalScore;
            localStorage.setItem('retro-tennis-high-score', this.highScore.toString());
            this.stateElement.textContent = `NEW HIGH SCORE: ${this.highScore}! Press SPACE to Play Again`;
        } else {
            this.stateElement.textContent = `GAME OVER - Press SPACE to Play Again`;
        }
        
        this.playSound(200, 1.0, 'sawtooth');
    }
    
    updateScore() {
        this.scoreElement.textContent = `Player: ${this.score.player} | AI: ${this.score.ai}`;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw center line
        this.ctx.strokeStyle = '#00FFFF';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Draw paddles
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillRect(this.playerPaddle.x, this.playerPaddle.y, this.playerPaddle.width, this.playerPaddle.height);
        this.ctx.fillRect(this.aiPaddle.x, this.aiPaddle.y, this.aiPaddle.width, this.aiPaddle.height);
        
        // Draw ball
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw high score if in menu
        if (this.gameState === 'menu' && this.highScore > 0) {
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.font = '16px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, 50);
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
    new RetroTennis();
});