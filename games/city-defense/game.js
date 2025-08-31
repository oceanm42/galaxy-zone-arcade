class CityDefense {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.citiesElement = document.getElementById('cities');
        this.levelElement = document.getElementById('level');
        
        this.gameState = 'menu';
        this.score = 0;
        this.cities = 6;
        this.level = 1;
        this.highScore = parseInt(localStorage.getItem('city-defense-high-score') || '0');
        
        this.mouseX = 0;
        this.mouseY = 0;
        this.missiles = [];
        this.enemyMissiles = [];
        this.explosions = [];
        this.cityBuildings = [];
        
        this.setupEventListeners();
        this.setupAudio();
        this.setupNavigation();
        this.initLevel();
        this.gameLoop();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === 'playing') {
                this.shootMissile();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                e.preventDefault();
                window.location.href = '../../index.html';
                return;
            }
            
            if (e.code === 'Enter') {
                e.preventDefault();
                this.handleEnterPress();
            }
        });
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
    
    handleEnterPress() {
        switch (this.gameState) {
            case 'menu': this.startGame(); break;
            case 'gameOver': this.resetGame(); break;
        }
    }
    
    startGame() { this.gameState = 'playing'; }
    
    resetGame() {
        this.score = 0;
        this.cities = 6;
        this.level = 1;
        this.gameState = 'menu';
        this.initLevel();
        this.updateUI();
    }
    
    initLevel() {
        this.missiles = [];
        this.enemyMissiles = [];
        this.explosions = [];
        
        // Create city buildings
        this.cityBuildings = [];
        const citySpacing = this.canvas.width / 7;
        for (let i = 0; i < 6; i++) {
            this.cityBuildings.push({
                x: citySpacing * (i + 1) - 15,
                y: this.canvas.height - 40,
                width: 30,
                height: 40,
                destroyed: false
            });
        }
    }
    
    shootMissile() {
        const startX = this.canvas.width / 2;
        const startY = this.canvas.height - 50;
        const targetX = this.mouseX;
        const targetY = this.mouseY;
        
        const distance = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2));
        const speed = 5;
        
        this.missiles.push({
            x: startX,
            y: startY,
            targetX: targetX,
            targetY: targetY,
            vx: (targetX - startX) / distance * speed,
            vy: (targetY - startY) / distance * speed,
            trail: []
        });
        
        this.playSound(400, 0.3);
    }
    
    spawnEnemyMissiles() {
        if (Math.random() < 0.02 + this.level * 0.005) {
            const startX = Math.random() * this.canvas.width;
            const targetX = Math.random() * this.canvas.width;
            const targetY = this.canvas.height - 40;
            
            const distance = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetY, 2));
            const speed = 2 + this.level * 0.3;
            
            this.enemyMissiles.push({
                x: startX,
                y: 0,
                targetX: targetX,
                targetY: targetY,
                vx: (targetX - startX) / distance * speed,
                vy: targetY / distance * speed,
                trail: []
            });
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.spawnEnemyMissiles();
        this.updateMissiles();
        this.updateEnemyMissiles();
        this.updateExplosions();
        this.checkCollisions();
        this.checkGameOver();
    }
    
    updateMissiles() {
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const missile = this.missiles[i];
            
            // Add trail point
            missile.trail.push({ x: missile.x, y: missile.y });
            if (missile.trail.length > 10) missile.trail.shift();
            
            missile.x += missile.vx;
            missile.y += missile.vy;
            
            // Check if reached target
            const distToTarget = Math.sqrt(
                Math.pow(missile.x - missile.targetX, 2) + 
                Math.pow(missile.y - missile.targetY, 2)
            );
            
            if (distToTarget < 10) {
                this.createExplosion(missile.x, missile.y, 60);
                this.missiles.splice(i, 1);
                this.playSound(300, 0.5, 'sawtooth');
            }
        }
    }
    
    updateEnemyMissiles() {
        for (let i = this.enemyMissiles.length - 1; i >= 0; i--) {
            const missile = this.enemyMissiles[i];
            
            missile.trail.push({ x: missile.x, y: missile.y });
            if (missile.trail.length > 8) missile.trail.shift();
            
            missile.x += missile.vx;
            missile.y += missile.vy;
            
            if (missile.y >= missile.targetY) {
                this.createExplosion(missile.x, missile.y, 40);
                this.enemyMissiles.splice(i, 1);
                this.checkCityDestruction(missile.x, missile.y);
                this.playSound(200, 0.8, 'sawtooth');
            }
        }
    }
    
    updateExplosions() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.life--;
            
            if (explosion.life <= 0) {
                this.explosions.splice(i, 1);
            }
        }
    }
    
    createExplosion(x, y, maxRadius) {
        this.explosions.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: maxRadius,
            life: 60
        });
    }
    
    checkCollisions() {
        // Enemy missiles vs explosions
        for (let i = this.enemyMissiles.length - 1; i >= 0; i--) {
            const missile = this.enemyMissiles[i];
            
            for (let explosion of this.explosions) {
                const currentRadius = explosion.maxRadius * (1 - explosion.life / 60);
                const distance = Math.sqrt(
                    Math.pow(missile.x - explosion.x, 2) + 
                    Math.pow(missile.y - explosion.y, 2)
                );
                
                if (distance < currentRadius) {
                    this.enemyMissiles.splice(i, 1);
                    this.score += 25;
                    this.updateUI();
                    break;
                }
            }
        }
    }
    
    checkCityDestruction(x, y) {
        for (let city of this.cityBuildings) {
            if (!city.destroyed &&
                x > city.x && x < city.x + city.width &&
                y > city.y && y < city.y + city.height) {
                city.destroyed = true;
                this.cities--;
                this.updateUI();
                break;
            }
        }
    }
    
    checkGameOver() {
        if (this.cities <= 0) {
            this.gameOver();
        }
        
        // Check level complete (all enemy missiles destroyed)
        if (this.enemyMissiles.length === 0 && Math.random() < 0.001) {
            this.level++;
            this.score += this.cities * 100;
            this.updateUI();
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('city-defense-high-score', this.highScore.toString());
        }
    }
    
    updateUI() {
        this.scoreElement.textContent = `Score: ${this.score}`;
        this.citiesElement.textContent = `Cities: ${this.cities}`;
        this.levelElement.textContent = `Level: ${this.level}`;
    }
    
    render() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw crosshair
        if (this.gameState === 'playing') {
            this.ctx.strokeStyle = '#00FFFF';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.mouseX - 10, this.mouseY);
            this.ctx.lineTo(this.mouseX + 10, this.mouseY);
            this.ctx.moveTo(this.mouseX, this.mouseY - 10);
            this.ctx.lineTo(this.mouseX, this.mouseY + 10);
            this.ctx.stroke();
        }
        
        // Draw cities
        for (let city of this.cityBuildings) {
            if (!city.destroyed) {
                this.ctx.fillStyle = '#00FF00';
                this.ctx.fillRect(city.x, city.y, city.width, city.height);
            }
        }
        
        // Draw missiles
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        for (let missile of this.missiles) {
            this.ctx.beginPath();
            for (let i = 0; i < missile.trail.length - 1; i++) {
                this.ctx.moveTo(missile.trail[i].x, missile.trail[i].y);
                this.ctx.lineTo(missile.trail[i + 1].x, missile.trail[i + 1].y);
            }
            this.ctx.stroke();
        }
        
        // Draw enemy missiles
        this.ctx.strokeStyle = '#FF0000';
        for (let missile of this.enemyMissiles) {
            this.ctx.beginPath();
            for (let i = 0; i < missile.trail.length - 1; i++) {
                this.ctx.moveTo(missile.trail[i].x, missile.trail[i].y);
                this.ctx.lineTo(missile.trail[i + 1].x, missile.trail[i + 1].y);
            }
            this.ctx.stroke();
        }
        
        // Draw explosions
        for (let explosion of this.explosions) {
            const currentRadius = explosion.maxRadius * (1 - explosion.life / 60);
            this.ctx.fillStyle = `rgba(255, 255, 0, ${explosion.life / 60})`;
            this.ctx.beginPath();
            this.ctx.arc(explosion.x, explosion.y, currentRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw ground
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, this.canvas.height - 10, this.canvas.width, 10);
        
        // Draw game state messages
        this.ctx.font = '24px Courier New';
        this.ctx.textAlign = 'center';
        
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fillText('CITY DEFENSE', this.canvas.width / 2, this.canvas.height / 2 - 60);
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Defend your cities from incoming missiles!', this.canvas.width / 2, this.canvas.height / 2 - 20);
            this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
            this.ctx.fillText('Press ENTER to Start', this.canvas.width / 2, this.canvas.height / 2 + 60);
        } else if (this.gameState === 'gameOver') {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillText('CITIES DESTROYED', this.canvas.width / 2, this.canvas.height / 2 - 30);
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
    new CityDefense();
});