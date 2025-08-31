class AsteroidBlaster {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.levelElement = document.getElementById('level');
        
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.highScore = parseInt(localStorage.getItem('asteroid-blaster-high-score') || '0');
        
        // Game objects
        this.ship = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            angle: 0,
            vx: 0,
            vy: 0,
            radius: 10,
            thrust: false,
            invulnerable: 0
        };
        
        this.bullets = [];
        this.asteroids = [];
        this.particles = [];
        
        this.lastShotTime = 0;
        this.shotCooldown = 150;
        
        // Physics constants
        this.thrustPower = 0.3;
        this.friction = 0.98;
        this.rotationSpeed = 0.15;
        this.maxSpeed = 8;
        
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
            case 'playing':
                this.hyperspace();
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
        this.level = 1;
        this.gameState = 'menu';
        this.bullets = [];
        this.particles = [];
        this.resetShip();
        this.initLevel();
        this.updateUI();
    }
    
    resetShip() {
        this.ship.x = this.canvas.width / 2;
        this.ship.y = this.canvas.height / 2;
        this.ship.angle = 0;
        this.ship.vx = 0;
        this.ship.vy = 0;
        this.ship.invulnerable = 180; // 3 seconds of invulnerability
    }
    
    hyperspace() {
        // Teleport to random location
        this.ship.x = Math.random() * this.canvas.width;
        this.ship.y = Math.random() * this.canvas.height;
        this.ship.vx = 0;
        this.ship.vy = 0;
        this.ship.invulnerable = 60;
        this.playSound(400, 0.3, 'sawtooth');
    }
    
    initLevel() {
        this.asteroids = [];
        const asteroidCount = 4 + this.level;
        
        for (let i = 0; i < asteroidCount; i++) {
            this.createAsteroid('large');
        }
    }
    
    createAsteroid(size, x, y) {
        const asteroid = {
            x: x !== undefined ? x : Math.random() * this.canvas.width,
            y: y !== undefined ? y : Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            size: size,
            vertices: []
        };
        
        // Set size properties
        switch (size) {
            case 'large':
                asteroid.radius = 40;
                asteroid.points = 20;
                break;
            case 'medium':
                asteroid.radius = 25;
                asteroid.points = 50;
                break;
            case 'small':
                asteroid.radius = 15;
                asteroid.points = 100;
                break;
        }
        
        // Generate random asteroid shape
        const numVertices = 8 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            const distance = asteroid.radius * (0.7 + Math.random() * 0.3);
            asteroid.vertices.push({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance
            });
        }
        
        // Ensure asteroid doesn't spawn too close to ship
        if (x === undefined && y === undefined) {
            const dx = asteroid.x - this.ship.x;
            const dy = asteroid.y - this.ship.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) {
                asteroid.x += dx > 0 ? 150 : -150;
                asteroid.y += dy > 0 ? 150 : -150;
            }
        }
        
        this.asteroids.push(asteroid);
    }
    
    shoot() {
        const now = Date.now();
        if (now - this.lastShotTime >= this.shotCooldown) {
            const angle = this.ship.angle;
            const bulletSpeed = 10;
            
            this.bullets.push({
                x: this.ship.x,
                y: this.ship.y,
                vx: Math.cos(angle) * bulletSpeed,
                vy: Math.sin(angle) * bulletSpeed,
                life: 60 // bullets last 1 second at 60fps
            });
            
            this.lastShotTime = now;
            this.playSound(800, 0.1);
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updateInput();
        this.updateShip();
        this.updateBullets();
        this.updateAsteroids();
        this.updateParticles();
        this.checkCollisions();
        this.checkWinCondition();
    }
    
    updateInput() {
        // Ship rotation
        if (this.keys['ArrowLeft']) {
            this.ship.angle -= this.rotationSpeed;
        }
        if (this.keys['ArrowRight']) {
            this.ship.angle += this.rotationSpeed;
        }
        
        // Ship thrust
        this.ship.thrust = this.keys['ArrowUp'];
    }
    
    updateShip() {
        // Apply thrust
        if (this.ship.thrust) {
            const thrustX = Math.cos(this.ship.angle) * this.thrustPower;
            const thrustY = Math.sin(this.ship.angle) * this.thrustPower;
            
            this.ship.vx += thrustX;
            this.ship.vy += thrustY;
            
            // Add thrust particles
            if (Math.random() < 0.5) {
                this.createThrustParticle();
            }
        }
        
        // Apply friction
        this.ship.vx *= this.friction;
        this.ship.vy *= this.friction;
        
        // Limit max speed
        const speed = Math.sqrt(this.ship.vx * this.ship.vx + this.ship.vy * this.ship.vy);
        if (speed > this.maxSpeed) {
            this.ship.vx = (this.ship.vx / speed) * this.maxSpeed;
            this.ship.vy = (this.ship.vy / speed) * this.maxSpeed;
        }
        
        // Update position
        this.ship.x += this.ship.vx;
        this.ship.y += this.ship.vy;
        
        // Wrap around screen
        this.ship.x = (this.ship.x + this.canvas.width) % this.canvas.width;
        this.ship.y = (this.ship.y + this.canvas.height) % this.canvas.height;
        
        // Update invulnerability
        if (this.ship.invulnerable > 0) {
            this.ship.invulnerable--;
        }
    }
    
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            bullet.life--;
            
            // Wrap around screen
            bullet.x = (bullet.x + this.canvas.width) % this.canvas.width;
            bullet.y = (bullet.y + this.canvas.height) % this.canvas.height;
            
            // Remove expired bullets
            if (bullet.life <= 0) {
                this.bullets.splice(i, 1);
            }
        }
    }
    
    updateAsteroids() {
        for (let asteroid of this.asteroids) {
            asteroid.x += asteroid.vx;
            asteroid.y += asteroid.vy;
            asteroid.rotation += asteroid.rotationSpeed;
            
            // Wrap around screen
            asteroid.x = (asteroid.x + this.canvas.width) % this.canvas.width;
            asteroid.y = (asteroid.y + this.canvas.height) % this.canvas.height;
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
        // Bullets vs asteroids
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                const asteroid = this.asteroids[j];
                
                const dx = bullet.x - asteroid.x;
                const dy = bullet.y - asteroid.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < asteroid.radius) {
                    // Hit!
                    this.score += asteroid.points;
                    this.bullets.splice(i, 1);
                    this.asteroids.splice(j, 1);
                    
                    this.createExplosion(asteroid.x, asteroid.y);
                    this.playSound(600, 0.2);
                    
                    // Split asteroid if large enough
                    if (asteroid.size === 'large') {
                        this.createAsteroid('medium', asteroid.x, asteroid.y);
                        this.createAsteroid('medium', asteroid.x, asteroid.y);
                    } else if (asteroid.size === 'medium') {
                        this.createAsteroid('small', asteroid.x, asteroid.y);
                        this.createAsteroid('small', asteroid.x, asteroid.y);
                    }
                    
                    this.updateUI();
                    break;
                }
            }
        }
        
        // Ship vs asteroids
        if (this.ship.invulnerable <= 0) {
            for (let asteroid of this.asteroids) {
                const dx = this.ship.x - asteroid.x;
                const dy = this.ship.y - asteroid.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < asteroid.radius + this.ship.radius) {
                    this.loseLife();
                    break;
                }
            }
        }
    }
    
    createThrustParticle() {
        const angle = this.ship.angle + Math.PI + (Math.random() - 0.5) * 0.5;
        const speed = 2 + Math.random() * 2;
        
        this.particles.push({
            x: this.ship.x - Math.cos(this.ship.angle) * 15,
            y: this.ship.y - Math.sin(this.ship.angle) * 15,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 20,
            color: '#FF7F00'
        });
    }
    
    createExplosion(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30 + Math.random() * 20,
                color: '#FFFFFF'
            });
        }
    }
    
    checkWinCondition() {
        if (this.asteroids.length === 0) {
            this.level++;
            this.score += this.lives * 500; // Bonus for remaining lives
            this.bullets = [];
            this.particles = [];
            this.initLevel();
            this.resetShip();
            this.playSound(800, 0.5);
            this.updateUI();
        }
    }
    
    loseLife() {
        this.lives--;
        this.createExplosion(this.ship.x, this.ship.y);
        this.playSound(200, 1.0, 'sawtooth');
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.resetShip();
        }
        
        this.updateUI();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('asteroid-blaster-high-score', this.highScore.toString());
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
        
        // Draw ship
        if (this.ship.invulnerable === 0 || Math.floor(this.ship.invulnerable / 5) % 2 === 0) {
            this.drawShip();
        }
        
        // Draw bullets
        this.ctx.fillStyle = '#FFFFFF';
        for (let bullet of this.bullets) {
            this.ctx.fillRect(bullet.x - 1, bullet.y - 1, 2, 2);
        }
        
        // Draw asteroids
        for (let asteroid of this.asteroids) {
            this.drawAsteroid(asteroid);
        }
        
        // Draw particles
        for (let particle of this.particles) {
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.life / 50;
            this.ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
            this.ctx.globalAlpha = 1;
        }
        
        // Draw game state messages
        this.ctx.font = '24px Courier New';
        this.ctx.textAlign = 'center';
        
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fillText('ASTEROID BLASTER', this.canvas.width / 2, this.canvas.height / 2 - 60);
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Navigate the asteroid field!', this.canvas.width / 2, this.canvas.height / 2 - 20);
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
    
    drawShip() {
        this.ctx.save();
        this.ctx.translate(this.ship.x, this.ship.y);
        this.ctx.rotate(this.ship.angle);
        
        this.ctx.strokeStyle = '#00FFFF';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(15, 0);
        this.ctx.lineTo(-10, -8);
        this.ctx.lineTo(-5, 0);
        this.ctx.lineTo(-10, 8);
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Draw thrust flame
        if (this.ship.thrust) {
            this.ctx.strokeStyle = '#FF7F00';
            this.ctx.beginPath();
            this.ctx.moveTo(-10, -3);
            this.ctx.lineTo(-18, 0);
            this.ctx.lineTo(-10, 3);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    drawAsteroid(asteroid) {
        this.ctx.save();
        this.ctx.translate(asteroid.x, asteroid.y);
        this.ctx.rotate(asteroid.rotation);
        
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        for (let i = 0; i < asteroid.vertices.length; i++) {
            const vertex = asteroid.vertices[i];
            if (i === 0) {
                this.ctx.moveTo(vertex.x, vertex.y);
            } else {
                this.ctx.lineTo(vertex.x, vertex.y);
            }
        }
        
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new AsteroidBlaster();
});