class RoadHopper {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.levelElement = document.getElementById('level');
        this.timeElement = document.getElementById('time');
        
        this.gameState = 'menu'; // menu, playing, paused, gameOver, levelComplete
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.timeLeft = 60;
        this.highScore = parseInt(localStorage.getItem('road-hopper-high-score') || '0');
        
        // Game grid
        this.gridSize = 40;
        this.rows = this.canvas.height / this.gridSize;
        this.cols = this.canvas.width / this.gridSize;
        
        // Player
        this.player = {
            x: Math.floor(this.cols / 2),
            y: this.rows - 1,
            moving: false,
            moveTimer: 0
        };
        
        // Game objects
        this.vehicles = [];
        this.logs = [];
        this.goals = [];
        this.lanes = [];
        
        // Input handling
        this.keys = {};
        this.lastMoveTime = 0;
        this.moveCooldown = 200;
        
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
            
            if (this.gameState === 'playing') {
                this.handleMovement(e.code);
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
    
    handleMovement(keyCode) {
        const now = Date.now();
        if (now - this.lastMoveTime < this.moveCooldown || this.player.moving) return;
        
        let newX = this.player.x;
        let newY = this.player.y;
        
        switch (keyCode) {
            case 'ArrowUp':
                newY = Math.max(0, this.player.y - 1);
                break;
            case 'ArrowDown':
                newY = Math.min(this.rows - 1, this.player.y + 1);
                break;
            case 'ArrowLeft':
                newX = Math.max(0, this.player.x - 1);
                break;
            case 'ArrowRight':
                newX = Math.min(this.cols - 1, this.player.x + 1);
                break;
            default:
                return;
        }
        
        // Check if move is valid (not into obstacles)
        if (this.isValidMove(newX, newY)) {
            this.player.x = newX;
            this.player.y = newY;
            this.player.moving = true;
            this.player.moveTimer = 10;
            this.lastMoveTime = now;
            
            this.playSound(440, 0.1);
            
            // Award points for forward progress
            if (keyCode === 'ArrowUp') {
                this.score += 10;
                this.updateUI();
            }
            
            // Check if reached goal
            if (this.player.y === 0) {
                this.levelComplete();
            }
        }
    }
    
    isValidMove(x, y) {
        // Check bounds
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
        
        // Check lane type
        const lane = this.lanes[y];
        if (lane.type === 'water') {
            // Must land on a log
            return this.logs.some(log => 
                log.lane === y && 
                x >= log.x && 
                x < log.x + log.length
            );
        }
        
        return true;
    }
    
    startGame() {
        this.gameState = 'playing';
        this.timeLeft = 60;
        this.startTimer();
    }
    
    startTimer() {
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateUI();
            
            if (this.timeLeft <= 0) {
                this.loseLife();
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    
    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameState = 'menu';
        this.stopTimer();
        this.resetPlayer();
        this.initLevel();
        this.updateUI();
    }
    
    resetPlayer() {
        this.player.x = Math.floor(this.cols / 2);
        this.player.y = this.rows - 1;
        this.player.moving = false;
        this.player.moveTimer = 0;
    }
    
    levelComplete() {
        this.gameState = 'levelComplete';
        this.stopTimer();
        this.score += this.timeLeft * 10; // Time bonus
        this.score += this.level * 100; // Level completion bonus
        this.level++;
        this.playSound(800, 1.0);
        
        setTimeout(() => {
            this.resetPlayer();
            this.initLevel();
            this.gameState = 'playing';
            this.timeLeft = Math.max(30, 60 - this.level * 2);
            this.startTimer();
        }, 2000);
        
        this.updateUI();
    }
    
    initLevel() {
        this.vehicles = [];
        this.logs = [];
        this.lanes = [];
        
        // Create lanes
        for (let i = 0; i < this.rows; i++) {
            let laneType = 'safe';
            
            if (i === 0) {
                laneType = 'goal';
            } else if (i === this.rows - 1) {
                laneType = 'start';
            } else if (i >= 1 && i <= 3) {
                laneType = 'water';
            } else if (i >= 5 && i <= 8) {
                laneType = 'road';
            } else if (i >= 10 && i <= 12) {
                laneType = 'water';
            } else if (i >= 14 && i <= this.rows - 2) {
                laneType = 'road';
            }
            
            this.lanes.push({
                y: i,
                type: laneType,
                direction: Math.random() > 0.5 ? 1 : -1,
                speed: 1 + Math.random() * 2 + this.level * 0.2
            });
        }
        
        // Create vehicles for road lanes
        for (let lane of this.lanes) {
            if (lane.type === 'road') {
                this.createVehiclesForLane(lane);
            } else if (lane.type === 'water') {
                this.createLogsForLane(lane);
            }
        }
    }
    
    createVehiclesForLane(lane) {
        const numVehicles = 2 + Math.floor(Math.random() * 3);
        const spacing = this.cols / numVehicles;
        
        for (let i = 0; i < numVehicles; i++) {
            const vehicle = {
                x: i * spacing + Math.random() * spacing * 0.5,
                y: lane.y,
                lane: lane.y,
                width: 2 + Math.floor(Math.random() * 2),
                direction: lane.direction,
                speed: lane.speed,
                color: ['#FF0000', '#00FF00', '#FFFF00', '#FF00FF'][Math.floor(Math.random() * 4)]
            };
            
            if (vehicle.direction < 0) {
                vehicle.x = this.cols - vehicle.x;
            }
            
            this.vehicles.push(vehicle);
        }
    }
    
    createLogsForLane(lane) {
        const numLogs = 2 + Math.floor(Math.random() * 2);
        const spacing = this.cols / numLogs;
        
        for (let i = 0; i < numLogs; i++) {
            const log = {
                x: i * spacing + Math.random() * spacing * 0.3,
                y: lane.y,
                lane: lane.y,
                length: 3 + Math.floor(Math.random() * 3),
                direction: lane.direction,
                speed: lane.speed * 0.7
            };
            
            if (log.direction < 0) {
                log.x = this.cols - log.x;
            }
            
            this.logs.push(log);
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updatePlayer();
        this.updateVehicles();
        this.updateLogs();
        this.checkCollisions();
        this.checkWaterDrowning();
    }
    
    updatePlayer() {
        if (this.player.moving && this.player.moveTimer > 0) {
            this.player.moveTimer--;
            if (this.player.moveTimer === 0) {
                this.player.moving = false;
            }
        }
        
        // Move player with logs if on water
        const lane = this.lanes[this.player.y];
        if (lane && lane.type === 'water') {
            const playerLog = this.logs.find(log => 
                log.lane === this.player.y &&
                this.player.x >= log.x &&
                this.player.x < log.x + log.length
            );
            
            if (playerLog) {
                this.player.x += playerLog.direction * playerLog.speed * 0.016; // Adjust for frame rate
                
                // Keep player in bounds
                if (this.player.x < 0 || this.player.x >= this.cols) {
                    this.loseLife();
                }
            }
        }
    }
    
    updateVehicles() {
        for (let vehicle of this.vehicles) {
            vehicle.x += vehicle.direction * vehicle.speed * 0.016; // Adjust for frame rate
            
            // Wrap around screen
            if (vehicle.direction > 0 && vehicle.x > this.cols + vehicle.width) {
                vehicle.x = -vehicle.width;
            } else if (vehicle.direction < 0 && vehicle.x < -vehicle.width) {
                vehicle.x = this.cols;
            }
        }
    }
    
    updateLogs() {
        for (let log of this.logs) {
            log.x += log.direction * log.speed * 0.016; // Adjust for frame rate
            
            // Wrap around screen
            if (log.direction > 0 && log.x > this.cols + log.length) {
                log.x = -log.length;
            } else if (log.direction < 0 && log.x < -log.length) {
                log.x = this.cols;
            }
        }
    }
    
    checkCollisions() {
        // Check vehicle collisions
        for (let vehicle of this.vehicles) {
            if (Math.floor(vehicle.y) === this.player.y &&
                this.player.x >= Math.floor(vehicle.x) &&
                this.player.x < Math.floor(vehicle.x) + vehicle.width) {
                this.loseLife();
                return;
            }
        }
    }
    
    checkWaterDrowning() {
        const lane = this.lanes[this.player.y];
        if (lane && lane.type === 'water') {
            const onLog = this.logs.some(log => 
                log.lane === this.player.y &&
                this.player.x >= Math.floor(log.x) &&
                this.player.x < Math.floor(log.x) + log.length
            );
            
            if (!onLog) {
                this.loseLife();
            }
        }
    }
    
    loseLife() {
        this.lives--;
        this.playSound(150, 0.5, 'sawtooth');
        this.stopTimer();
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.resetPlayer();
            this.timeLeft = Math.max(30, 60 - this.level * 2);
            this.startTimer();
        }
        
        this.updateUI();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('road-hopper-high-score', this.highScore.toString());
        }
    }
    
    updateUI() {
        this.scoreElement.textContent = `Score: ${this.score}`;
        this.livesElement.textContent = `Lives: ${this.lives}`;
        this.levelElement.textContent = `Level: ${this.level}`;
        this.timeElement.textContent = `Time: ${this.timeLeft}`;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw lanes
        for (let i = 0; i < this.rows; i++) {
            const lane = this.lanes[i];
            const y = i * this.gridSize;
            
            switch (lane.type) {
                case 'start':
                case 'safe':
                    this.ctx.fillStyle = '#004400';
                    break;
                case 'goal':
                    this.ctx.fillStyle = '#00FF00';
                    break;
                case 'road':
                    this.ctx.fillStyle = '#333333';
                    break;
                case 'water':
                    this.ctx.fillStyle = '#000066';
                    break;
            }
            
            this.ctx.fillRect(0, y, this.canvas.width, this.gridSize);
            
            // Draw lane dividers
            if (lane.type === 'road') {
                this.ctx.fillStyle = '#FFFF00';
                for (let x = 0; x < this.cols; x += 2) {
                    this.ctx.fillRect(x * this.gridSize + this.gridSize/2 - 2, y + this.gridSize/2 - 1, 4, 2);
                }
            }
        }
        
        // Draw vehicles
        for (let vehicle of this.vehicles) {
            this.ctx.fillStyle = vehicle.color;
            const x = vehicle.x * this.gridSize;
            const y = vehicle.y * this.gridSize + 5;
            const width = vehicle.width * this.gridSize;
            const height = this.gridSize - 10;
            
            this.ctx.fillRect(x, y, width, height);
            
            // Add simple details
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(x + 2, y + 2, 4, 4);
            this.ctx.fillRect(x + width - 6, y + 2, 4, 4);
        }
        
        // Draw logs
        this.ctx.fillStyle = '#8B4513';
        for (let log of this.logs) {
            const x = log.x * this.gridSize;
            const y = log.y * this.gridSize + 8;
            const width = log.length * this.gridSize;
            const height = this.gridSize - 16;
            
            this.ctx.fillRect(x, y, width, height);
            
            // Add log texture
            this.ctx.fillStyle = '#654321';
            for (let i = 0; i < log.length; i++) {
                this.ctx.fillRect(x + i * this.gridSize + this.gridSize/2 - 1, y, 2, height);
            }
        }
        
        // Draw player
        const playerX = this.player.x * this.gridSize + this.gridSize/2;
        const playerY = this.player.y * this.gridSize + this.gridSize/2;
        
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.beginPath();
        this.ctx.arc(playerX, playerY, this.gridSize/2 - 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add simple face
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(playerX - 4, playerY - 4, 2, 2);
        this.ctx.fillRect(playerX + 2, playerY - 4, 2, 2);
        this.ctx.fillRect(playerX - 2, playerY, 4, 2);
        
        // Draw game state messages
        this.ctx.font = '24px Courier New';
        this.ctx.textAlign = 'center';
        
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fillText('ROAD HOPPER', this.canvas.width / 2, this.canvas.height / 2 - 60);
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Cross the dangerous roads and rivers!', this.canvas.width / 2, this.canvas.height / 2 - 20);
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
            this.ctx.fillText(`Level ${this.level - 1} Complete!`, this.canvas.width / 2, this.canvas.height / 2);
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

// Start the game when page loads
window.addEventListener('load', () => {
    new RoadHopper();
});