class GalaxyRaiders {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.stageElement = document.getElementById('stage');
        
        this.gameState = 'menu'; // menu, playing, gameOver, stageComplete
        this.score = 0;
        this.lives = 3;
        this.stage = 1;
        this.highScore = parseInt(localStorage.getItem('galaxy-raiders-high-score') || '0');
        
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
        this.particles = [];
        this.formations = [];
        
        this.lastShotTime = 0;
        this.shotCooldown = 200;
        this.formationTimer = 0;
        this.swoopTimer = 0;
        
        // Input handling
        this.keys = {};
        this.setupEventListeners();
        this.setupAudio();
        
        this.setupNavigation();
        
        this.initStage();
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
            case 'stageComplete':
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
        this.stage = 1;
        this.gameState = 'menu';
        this.bullets = [];
        this.enemyBullets = [];
        this.particles = [];
        this.player.x = this.canvas.width / 2 - 20;
        this.initStage();
        this.updateUI();
    }
    
    nextStage() {
        this.stage++;
        this.score += this.lives * 200;
        this.bullets = [];
        this.enemyBullets = [];
        this.particles = [];
        this.initStage();
        this.updateUI();
    }
    
    initStage() {
        this.enemies = [];
        this.formations = [];
        this.formationTimer = 0;
        this.swoopTimer = 0;
        
        // Create formation grid
        const rows = 4;
        const cols = 8;
        const enemyWidth = 25;
        const enemyHeight = 20;
        const spacingX = 40;
        const spacingY = 35;
        const startX = (this.canvas.width - (cols - 1) * spacingX) / 2;
        const startY = 80;
        
        // Enemy types with different behaviors
        const enemyTypes = [
            { type: 'boss', points: 400, color: '#FF0000', canSwoop: true, shootRate: 0.003 },
            { type: 'captain', points: 160, color: '#FFFF00', canSwoop: true, shootRate: 0.002 },
            { type: 'soldier', points: 80, color: '#00FF00', canSwoop: false, shootRate: 0.001 },
            { type: 'drone', points: 50, color: '#00FFFF', canSwoop: false, shootRate: 0.001 }
        ];
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const enemyType = enemyTypes[Math.min(row, enemyTypes.length - 1)];
                
                const enemy = {
                    x: startX + col * spacingX,
                    y: startY + row * spacingY,
                    formationX: startX + col * spacingX,
                    formationY: startY + row * spacingY,
                    width: enemyWidth,
                    height: enemyHeight,
                    type: enemyType.type,
                    points: enemyType.points,
                    color: enemyType.color,
                    canSwoop: enemyType.canSwoop,
                    shootRate: enemyType.shootRate,
                    state: 'formation', // formation, swooping, returning
                    animFrame: 0,
                    swoopPath: null,
                    swoopProgress: 0,
                    alive: true
                };
                
                this.enemies.push(enemy);
            }
        }
    }
    
    shoot() {
        const now = Date.now();
        if (now - this.lastShotTime >= this.shotCooldown) {
            this.bullets.push({
                x: this.player.x + this.player.width / 2 - 2,
                y: this.player.y,
                width: 4,
                height: 12,
                speed: 10
            });
            this.lastShotTime = now;
            this.playSound(1000, 0.1);
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updateInput();
        this.updateBullets();
        this.updateEnemies();
        this.updateEnemyBullets();
        this.updateParticles();
        this.checkCollisions();
        this.checkWinCondition();
        
        this.formationTimer++;
        this.swoopTimer++;
    }
    
    updateInput() {
        if (this.keys['ArrowLeft'] && this.player.x > 0) {
            this.player.x -= this.player.speed;
        }
        if (this.keys['ArrowRight'] && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += this.player.speed;
        }
    }
    
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.y -= bullet.speed;
            
            if (bullet.y < 0) {
                this.bullets.splice(i, 1);
            }
        }
    }
    
    updateEnemies() {
        const aliveEnemies = this.enemies.filter(e => e.alive);
        if (aliveEnemies.length === 0) return;
        
        // Formation movement
        const formationOffset = Math.sin(this.formationTimer * 0.02) * 2;
        
        for (let enemy of aliveEnemies) {
            enemy.animFrame = (enemy.animFrame + 1) % 60;
            
            if (enemy.state === 'formation') {
                // Gentle side-to-side movement in formation
                enemy.x = enemy.formationX + formationOffset;
                
                // Random swooping
                if (enemy.canSwoop && Math.random() < 0.0005 && this.swoopTimer > 300) {
                    this.initializeSwoop(enemy);
                    this.swoopTimer = 0;
                }
                
                // Shooting
                if (Math.random() < enemy.shootRate) {
                    this.enemyBullets.push({
                        x: enemy.x + enemy.width / 2 - 2,
                        y: enemy.y + enemy.height,
                        width: 4,
                        height: 8,
                        speed: 3 + this.stage * 0.5
                    });
                    this.playSound(400, 0.1);
                }
                
            } else if (enemy.state === 'swooping') {
                this.updateSwoopingEnemy(enemy);
            } else if (enemy.state === 'returning') {
                this.updateReturningEnemy(enemy);
            }
        }
    }
    
    initializeSwoop(enemy) {
        enemy.state = 'swooping';
        enemy.swoopProgress = 0;
        
        // Create swoop path (dive toward player, then curve)
        const targetX = this.player.x + this.player.width / 2;
        const controlX = (enemy.x + targetX) / 2 + (Math.random() - 0.5) * 200;
        const controlY = enemy.y + 200;
        
        enemy.swoopPath = {
            startX: enemy.x,
            startY: enemy.y,
            controlX: controlX,
            controlY: controlY,
            endX: targetX,
            endY: this.canvas.height + 50
        };
    }
    
    updateSwoopingEnemy(enemy) {
        enemy.swoopProgress += 0.02;
        
        if (enemy.swoopProgress >= 1) {
            enemy.state = 'returning';
            enemy.swoopProgress = 0;
            return;
        }
        
        // Quadratic Bezier curve
        const t = enemy.swoopProgress;
        const path = enemy.swoopPath;
        
        const x = (1 - t) * (1 - t) * path.startX + 2 * (1 - t) * t * path.controlX + t * t * path.endX;
        const y = (1 - t) * (1 - t) * path.startY + 2 * (1 - t) * t * path.controlY + t * t * path.endY;
        
        enemy.x = x;
        enemy.y = y;
        
        // Shoot while swooping
        if (Math.random() < 0.02) {
            const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
            this.enemyBullets.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height,
                width: 4,
                height: 8,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                speed: 0 // Using vx/vy instead
            });
        }
    }
    
    updateReturningEnemy(enemy) {
        enemy.swoopProgress += 0.03;
        
        if (enemy.swoopProgress >= 1) {
            enemy.state = 'formation';
            enemy.x = enemy.formationX;
            enemy.y = enemy.formationY;
            return;
        }
        
        // Move back to formation position
        const t = enemy.swoopProgress;
        const startX = enemy.x;
        const startY = enemy.y;
        
        enemy.x = startX + (enemy.formationX - startX) * t;
        enemy.y = startY + (enemy.formationY - startY) * t;
    }
    
    updateEnemyBullets() {
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            
            if (bullet.vx !== undefined) {
                // Homing bullets
                bullet.x += bullet.vx;
                bullet.y += bullet.vy;
            } else {
                bullet.y += bullet.speed;
            }
            
            if (bullet.y > this.canvas.height || bullet.x < 0 || bullet.x > this.canvas.width) {
                this.enemyBullets.splice(i, 1);
            }
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            particle.vx *= 0.95;
            particle.vy *= 0.95;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
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
                    
                    this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color);
                    this.playSound(800, 0.2);
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
        
        // Enemies vs player (collision)
        for (let enemy of this.enemies) {
            if (!enemy.alive) continue;
            
            if (enemy.x < this.player.x + this.player.width &&
                enemy.x + enemy.width > this.player.x &&
                enemy.y < this.player.y + this.player.height &&
                enemy.y + enemy.height > this.player.y) {
                
                enemy.alive = false;
                this.loseLife();
                break;
            }
        }
    }
    
    createExplosion(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30 + Math.random() * 20,
                color: color || '#FFFFFF'
            });
        }
    }
    
    checkWinCondition() {
        const aliveEnemies = this.enemies.filter(e => e.alive).length;
        if (aliveEnemies === 0) {
            this.gameState = 'stageComplete';
            this.playSound(1200, 1.0);
            setTimeout(() => this.nextStage(), 2000);
        }
    }
    
    loseLife() {
        this.lives--;
        this.createExplosion(this.player.x + this.player.width/2, this.player.y + this.player.height/2, '#00FFFF');
        this.playSound(200, 1.0, 'sawtooth');
        
        if (this.lives <= 0) {
            this.gameOver();
        }
        
        this.updateUI();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('galaxy-raiders-high-score', this.highScore.toString());
        }
    }
    
    updateUI() {
        this.scoreElement.textContent = `Score: ${this.score}`;
        this.livesElement.textContent = `Lives: ${this.lives}`;
        this.stageElement.textContent = `Stage: ${this.stage}`;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars background
        this.ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 50; i++) {
            const x = (i * 37) % this.canvas.width;
            const y = (i * 23 + this.formationTimer * 0.5) % this.canvas.height;
            this.ctx.fillRect(x, y, 1, 1);
        }
        
        // Draw player
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Add player details
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(this.player.x + 5, this.player.y + 5, 5, 5);
        this.ctx.fillRect(this.player.x + this.player.width - 10, this.player.y + 5, 5, 5);
        this.ctx.fillRect(this.player.x + this.player.width/2 - 2, this.player.y, 4, 8);
        
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
                
                // Animation frame
                if (enemy.animFrame < 30) {
                    this.ctx.fillStyle = '#FFFFFF';
                    this.ctx.fillRect(enemy.x + 3, enemy.y + 3, enemy.width - 6, enemy.height - 6);
                }
                
                // Add enemy details based on type
                this.ctx.fillStyle = '#000';
                if (enemy.type === 'boss') {
                    this.ctx.fillRect(enemy.x + 8, enemy.y + 5, 3, 3);
                    this.ctx.fillRect(enemy.x + 14, enemy.y + 5, 3, 3);
                    this.ctx.fillRect(enemy.x + 5, enemy.y + 12, 15, 3);
                } else {
                    this.ctx.fillRect(enemy.x + 6, enemy.y + 4, 2, 2);
                    this.ctx.fillRect(enemy.x + 16, enemy.y + 4, 2, 2);
                }
            }
        }
        
        // Draw enemy bullets
        this.ctx.fillStyle = '#FF00FF';
        for (let bullet of this.enemyBullets) {
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
        
        // Draw particles
        for (let particle of this.particles) {
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.life / 50;
            this.ctx.fillRect(particle.x - 1, particle.y - 1, 3, 3);
            this.ctx.globalAlpha = 1;
        }
        
        // Draw game state messages
        this.ctx.font = '24px Courier New';
        this.ctx.textAlign = 'center';
        
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fillText('GALAXY RAIDERS', this.canvas.width / 2, this.canvas.height / 2 - 60);
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Defend against the galactic invasion!', this.canvas.width / 2, this.canvas.height / 2 - 20);
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
        } else if (this.gameState === 'stageComplete') {
            this.ctx.fillStyle = '#00FF00';
            this.ctx.fillText(`Stage ${this.stage - 1} Complete!`, this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Next stage starting...', this.canvas.width / 2, this.canvas.height / 2 + 30);
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
    new GalaxyRaiders();
});