class SpaceDefenders {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.levelElement = document.getElementById('level');
        
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.highScore = parseInt(localStorage.getItem('space-defenders-high-score') || '0');
        
        // Game objects
        this.player = {
            x: this.canvas.width / 2 - 20,
            y: this.canvas.height - 60,
            width: 40,
            height: 30,
            speed: 6
        };
        
        this.bullets = [];
        this.enemies = [];
        this.enemyBullets = [];
        this.barriers = [];
        
        this.enemyDirection = 1;
        this.enemySpeed = 1;
        this.enemyDropDistance = 20;
        this.lastShotTime = 0;
        this.shotCooldown = 200; // milliseconds
        
        // Input handling
        this.keys = {};
        this.setupEventListeners();
        
        // Audio context for sound effects
        this.setupAudio();
        
        this.setupNavigation();
        
        this.initWave();
        this.createBarriers();
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
                if (this.gameState === 'playing') {
                    this.shoot();
                }
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
            case 'menu':
                this.startGame();
                break;
            case 'gameOver':
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
        this.wave = 1;
        this.gameState = 'menu';
        this.bullets = [];
        this.enemyBullets = [];
        this.player.x = this.canvas.width / 2 - 20;
        this.initWave();
        this.createBarriers();
        this.updateUI();
    }
    
    initWave() {
        this.enemies = [];
        const rows = 5;
        const cols = 10;
        const enemyWidth = 30;
        const enemyHeight = 20;
        const spacing = 40;
        const startX = 100;
        const startY = 80;
        
        const enemyTypes = [
            { points: 40, color: '#FF00FF' }, // Top row
            { points: 20, color: '#00FFFF' }, // Second row
            { points: 20, color: '#00FFFF' }, // Third row
            { points: 10, color: '#00FF00' }, // Fourth row
            { points: 10, color: '#00FF00' }  // Bottom row
        ];
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                this.enemies.push({
                    x: startX + col * spacing,
                    y: startY + row * spacing,
                    width: enemyWidth,
                    height: enemyHeight,
                    type: row,
                    points: enemyTypes[row].points,
                    color: enemyTypes[row].color,
                    alive: true,
                    animFrame: 0
                });
            }
        }
        
        this.enemySpeed = 1 + (this.wave - 1) * 0.3;
    }
    
    createBarriers() {
        this.barriers = [];
        const barrierCount = 4;
        const barrierWidth = 80;
        const barrierHeight = 60;
        const spacing = (this.canvas.width - barrierCount * barrierWidth) / (barrierCount + 1);
        
        for (let i = 0; i < barrierCount; i++) {
            const x = spacing + i * (barrierWidth + spacing);
            const y = this.canvas.height - 200;
            
            // Create barrier blocks
            const blocks = [];
            const blockSize = 4;
            const blocksPerRow = barrierWidth / blockSize;
            const blocksPerCol = barrierHeight / blockSize;
            
            for (let row = 0; row < blocksPerCol; row++) {
                for (let col = 0; col < blocksPerRow; col++) {
                    // Create barrier shape (simple rectangular with some gaps)
                    let exists = true;
                    
                    // Create entrance at bottom center
                    if (row > blocksPerCol - 6 && 
                        col > blocksPerRow / 2 - 3 && 
                        col < blocksPerRow / 2 + 3) {
                        exists = false;
                    }
                    
                    if (exists) {
                        blocks.push({
                            x: x + col * blockSize,
                            y: y + row * blockSize,
                            size: blockSize,
                            exists: true
                        });
                    }
                }
            }
            
            this.barriers.push({ blocks });
        }
    }
    
    shoot() {
        const now = Date.now();
        if (now - this.lastShotTime >= this.shotCooldown) {
            this.bullets.push({
                x: this.player.x + this.player.width / 2 - 2,
                y: this.player.y,
                width: 4,
                height: 10,
                speed: 8
            });
            this.lastShotTime = now;
            this.playSound(800, 0.1);
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updateInput();
        this.updateBullets();
        this.updateEnemies();
        this.updateEnemyBullets();
        this.checkCollisions();
        this.checkWinCondition();
    }
    
    updateInput() {
        // Player movement
        if (this.keys['ArrowLeft'] && this.player.x > 0) {
            this.player.x -= this.player.speed;
        }
        if (this.keys['ArrowRight'] && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += this.player.speed;
        }
    }
    
    updateBullets() {
        // Update player bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.y -= bullet.speed;
            
            if (bullet.y < 0) {
                this.bullets.splice(i, 1);
            }
        }
    }
    
    updateEnemies() {
        if (this.enemies.length === 0) return;
        
        // Update enemy positions
        let hitEdge = false;
        
        for (let enemy of this.enemies) {
            if (!enemy.alive) continue;
            
            enemy.x += this.enemyDirection * this.enemySpeed;
            enemy.animFrame = (enemy.animFrame + 1) % 60;
            
            if (enemy.x <= 0 || enemy.x >= this.canvas.width - enemy.width) {
                hitEdge = true;
            }
        }
        
        // If any enemy hits edge, move all down and reverse direction
        if (hitEdge) {
            this.enemyDirection *= -1;
            for (let enemy of this.enemies) {
                if (enemy.alive) {
                    enemy.y += this.enemyDropDistance;
                }
            }
        }
        
        // Enemy shooting
        if (Math.random() < 0.005 * this.enemies.filter(e => e.alive).length) {
            const aliveEnemies = this.enemies.filter(e => e.alive);
            if (aliveEnemies.length > 0) {
                const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
                this.enemyBullets.push({
                    x: shooter.x + shooter.width / 2 - 2,
                    y: shooter.y + shooter.height,
                    width: 4,
                    height: 10,
                    speed: 3
                });
            }
        }
        
        // Check if enemies reached player
        for (let enemy of this.enemies) {
            if (enemy.alive && enemy.y + enemy.height >= this.player.y) {
                this.gameOver();
                return;
            }
        }
    }
    
    updateEnemyBullets() {
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.y += bullet.speed;
            
            if (bullet.y > this.canvas.height) {
                this.enemyBullets.splice(i, 1);
            }
        }
    }
    
    checkCollisions() {
        // Player bullets vs enemies
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let enemy of this.enemies) {
                if (!enemy.alive) continue;
                
                if (bullet.x < enemy.x + enemy.width &&
                    bullet.x + bullet.width > enemy.x &&
                    bullet.y < enemy.y + enemy.height &&
                    bullet.y + bullet.height > enemy.y) {
                    
                    enemy.alive = false;
                    this.score += enemy.points;
                    this.bullets.splice(i, 1);
                    this.playSound(600, 0.1);
                    this.updateUI();
                    break;
                }
            }
        }
        
        // Enemy bullets vs player
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            
            if (bullet.x < this.player.x + this.player.width &&
                bullet.x + bullet.width > this.player.x &&
                bullet.y < this.player.y + this.player.height &&
                bullet.y + bullet.height > this.player.y) {
                
                this.enemyBullets.splice(i, 1);
                this.loseLife();
                break;
            }
        }
        
        // Bullets vs barriers
        this.checkBarrierCollisions();
    }
    
    checkBarrierCollisions() {
        // Player bullets vs barriers
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let barrier of this.barriers) {
                for (let j = barrier.blocks.length - 1; j >= 0; j--) {
                    const block = barrier.blocks[j];
                    
                    if (block.exists &&
                        bullet.x < block.x + block.size &&
                        bullet.x + bullet.width > block.x &&
                        bullet.y < block.y + block.size &&
                        bullet.y + bullet.height > block.y) {
                        
                        block.exists = false;
                        this.bullets.splice(i, 1);
                        goto_next_bullet: break;
                    }
                }
            }
        }
        
        // Enemy bullets vs barriers
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            
            for (let barrier of this.barriers) {
                for (let j = barrier.blocks.length - 1; j >= 0; j--) {
                    const block = barrier.blocks[j];
                    
                    if (block.exists &&
                        bullet.x < block.x + block.size &&
                        bullet.x + bullet.width > block.x &&
                        bullet.y < block.y + block.size &&
                        bullet.y + bullet.height > block.y) {
                        
                        block.exists = false;
                        this.enemyBullets.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }
    
    checkWinCondition() {
        const aliveEnemies = this.enemies.filter(e => e.alive).length;
        if (aliveEnemies === 0) {
            this.wave++;
            this.score += this.lives * 100; // Bonus for remaining lives
            this.initWave();
            this.bullets = [];
            this.enemyBullets = [];
            this.playSound(800, 0.5);
            this.updateUI();
        }
    }
    
    loseLife() {
        this.lives--;
        this.playSound(200, 0.5, 'sawtooth');
        
        if (this.lives <= 0) {
            this.gameOver();
        }
        
        this.updateUI();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('space-defenders-high-score', this.highScore.toString());
        }
        
        this.playSound(150, 2.0, 'sawtooth');
    }
    
    updateUI() {
        this.scoreElement.textContent = `Score: ${this.score}`;
        this.livesElement.textContent = `Lives: ${this.lives}`;
        this.levelElement.textContent = `Wave: ${this.wave}`;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw player
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Draw player bullets
        this.ctx.fillStyle = '#FFFFFF';
        for (let bullet of this.bullets) {
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
        
        // Draw enemies
        for (let enemy of this.enemies) {
            if (enemy.alive) {
                this.ctx.fillStyle = enemy.color;
                this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                
                // Simple animation (flicker)
                if (enemy.animFrame < 30) {
                    this.ctx.fillStyle = '#FFFFFF';
                    this.ctx.fillRect(enemy.x + 5, enemy.y + 5, enemy.width - 10, enemy.height - 10);
                }
            }
        }
        
        // Draw enemy bullets
        this.ctx.fillStyle = '#FF00FF';
        for (let bullet of this.enemyBullets) {
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
        
        // Draw barriers
        this.ctx.fillStyle = '#00FF00';
        for (let barrier of this.barriers) {
            for (let block of barrier.blocks) {
                if (block.exists) {
                    this.ctx.fillRect(block.x, block.y, block.size, block.size);
                }
            }
        }
        
        // Draw game state messages
        this.ctx.font = '24px Courier New';
        this.ctx.textAlign = 'center';
        
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fillText('SPACE DEFENDERS', this.canvas.width / 2, this.canvas.height / 2 - 60);
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Defend Earth from the alien invasion!', this.canvas.width / 2, this.canvas.height / 2 - 20);
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

// Start the game when page loads
window.addEventListener('load', () => {
    new SpaceDefenders();
});