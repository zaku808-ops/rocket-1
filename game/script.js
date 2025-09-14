class RocketDodgeGame {
    constructor() {
        this.gameArea = document.getElementById('gameArea');
        this.playerRocket = document.getElementById('playerRocket');
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.gameOverElement = document.getElementById('gameOver');
        this.finalScoreElement = document.getElementById('finalScore');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.restartBtn = document.getElementById('restartBtn');
        
        this.gameRunning = false;
        this.gamePaused = false;
        this.score = 0;
        this.highScore = localStorage.getItem('rocketDodgeHighScore') || 0;
        this.obstacles = [];
        this.lasers = [];
        this.enemyLasers = [];
        this.animationId = null;
        this.obstacleSpawnRate = 2000; // milliseconds
        this.lastObstacleSpawn = 0;
        this.lastLaserShot = 0;
        this.laserCooldown = 200; // milliseconds between shots
        
        // Key state tracking for continuous movement
        this.keysPressed = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        
        this.playerPosition = 50; // percentage from left
        this.playerVerticalPosition = 80; // percentage from top
        this.playerSpeed = 2.4; // percentage per keypress
        
        // Different rocket types for obstacles
        this.rocketTypes = [
            { emoji: '🚀', speed: 1, points: 5, type: 'moving' },
            { emoji: '🛸', speed: 1.2, points: 10, type: 'moving' },
            { emoji: '🛰️', speed: 1.4, points: 15, type: 'moving' },
            { emoji: '💫', speed: 1.8, points: 20, type: 'moving' },
            { emoji: '🏰', speed: 0.5, points: 45, type: 'moving' }, // Moving obstacle that shoots
            { emoji: '🏯', speed: 0, points: 35, type: 'stationary' } // Stationary obstacle that shoots
        ];
        
        this.setupEventListeners();
        this.updateHighScore();
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning || this.gamePaused) return;
            
            switch(e.key.toLowerCase()) {
                case 'a':
                case 'arrowleft':
                    this.keysPressed.left = true;
                    break;
                case 'd':
                case 'arrowright':
                    this.keysPressed.right = true;
                    break;
                case 'w':
                case 'arrowup':
                    this.keysPressed.up = true;
                    break;
                case 's':
                case 'arrowdown':
                    this.keysPressed.down = true;
                    break;
                case ' ':
                case 'space':
                    e.preventDefault();
                    this.shootLaser();
                    break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            switch(e.key.toLowerCase()) {
                case 'a':
                case 'arrowleft':
                    this.keysPressed.left = false;
                    break;
                case 'd':
                case 'arrowright':
                    this.keysPressed.right = false;
                    break;
                case 'w':
                case 'arrowup':
                    this.keysPressed.up = false;
                    break;
                case 's':
                case 'arrowdown':
                    this.keysPressed.down = false;
                    break;
            }
        });
        
        // Button controls
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.restartBtn.addEventListener('click', () => this.restartGame());
    }
    
    startGame() {
        this.gameRunning = true;
        this.gamePaused = false;
        this.score = 0;
        this.obstacles = [];
        this.lasers = [];
        this.enemyLasers = [];
        this.playerPosition = 50;
        this.playerVerticalPosition = 80;
        this.obstacleSpawnRate = 2000;
        
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.gameOverElement.style.display = 'none';
        
        this.updateScore();
        this.updatePlayerPosition();
        this.gameLoop();
    }
    
    togglePause() {
        if (!this.gameRunning) return;
        
        this.gamePaused = !this.gamePaused;
        this.pauseBtn.textContent = this.gamePaused ? 'Resume' : 'Pause';
        
        if (!this.gamePaused) {
            this.gameLoop();
        }
    }
    
    restartGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.pauseBtn.textContent = 'Pause';
        
        // Clear all obstacles and lasers
        this.obstacles.forEach(obstacle => obstacle.element.remove());
        this.lasers.forEach(laser => laser.element.remove());
        this.enemyLasers.forEach(laser => laser.element.remove());
        this.obstacles = [];
        this.lasers = [];
        this.enemyLasers = [];
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Hide game over screen
        this.gameOverElement.style.display = 'none';
        
        // Automatically start a new game
        this.startGame();
    }
    
    handleContinuousMovement() {
        if (!this.gameRunning || this.gamePaused) return;
        
        let moved = false;
        
        if (this.keysPressed.left && this.playerPosition > 0) {
            this.playerPosition = Math.max(0, this.playerPosition - this.playerSpeed);
            moved = true;
        }
        if (this.keysPressed.right && this.playerPosition < 100) {
            this.playerPosition = Math.min(100, this.playerPosition + this.playerSpeed);
            moved = true;
        }
        if (this.keysPressed.up && this.playerVerticalPosition > 0) {
            this.playerVerticalPosition = Math.max(0, this.playerVerticalPosition - this.playerSpeed);
            moved = true;
        }
        if (this.keysPressed.down && this.playerVerticalPosition < 100) {
            this.playerVerticalPosition = Math.min(100, this.playerVerticalPosition + this.playerSpeed);
            moved = true;
        }
        
        if (moved) {
            this.updatePlayerPosition();
        }
    }
    
    updatePlayerPosition() {
        this.playerRocket.style.left = this.playerPosition + '%';
        this.playerRocket.style.top = this.playerVerticalPosition + '%';
    }
    
    shootLaser() {
        if (!this.gameRunning || this.gamePaused) return;
        
        const now = Date.now();
        if (now - this.lastLaserShot < this.laserCooldown) return;
        
        this.lastLaserShot = now;
        
        // Create 3 lasers: center, left, and right
        const laserPositions = [
            { offset: 0, className: 'laser laser-center' },      // Center
            { offset: -2, className: 'laser laser-left' },       // Left
            { offset: 2, className: 'laser laser-right' }        // Right
        ];
        
        laserPositions.forEach(({ offset, className }) => {
            const laser = document.createElement('div');
            laser.className = className;
            laser.style.left = (this.playerPosition + 1.5 + offset) + '%';
            laser.style.top = this.playerVerticalPosition + '%';
            
            this.gameArea.appendChild(laser);
            
            this.lasers.push({
                element: laser,
                x: this.playerPosition + 1.5 + offset,
                y: this.playerVerticalPosition,
                speed: 3 // percentage per frame
            });
        });
    }
    
    spawnObstacle() {
        const now = Date.now();
        if (now - this.lastObstacleSpawn < this.obstacleSpawnRate) return;
        
        this.lastObstacleSpawn = now;
        
        const rocketType = this.rocketTypes[Math.floor(Math.random() * this.rocketTypes.length)];
        const obstacle = document.createElement('div');
        obstacle.className = `obstacle-rocket type${Math.floor(Math.random() * 4) + 1}`;
        obstacle.textContent = rocketType.emoji;
        obstacle.style.left = Math.random() * 90 + 5 + '%'; // Random horizontal position
        
        if (rocketType.type === 'stationary') {
            obstacle.style.top = '20%'; // Fixed position for stationary obstacles
            obstacle.style.animation = 'none';
        } else {
            obstacle.style.animationDuration = (3000 / rocketType.speed) + 'ms';
        }
        
        this.gameArea.appendChild(obstacle);
        
        this.obstacles.push({
            element: obstacle,
            x: parseFloat(obstacle.style.left),
            y: rocketType.type === 'stationary' ? 20 : -50,
            speed: rocketType.speed,
            points: rocketType.points,
            width: 40,
            height: 40,
            type: rocketType.type,
            lastShot: 0
        });
    }
    
    updateObstacles() {
        this.obstacles.forEach((obstacle, index) => {
            const rect = obstacle.element.getBoundingClientRect();
            const gameAreaRect = this.gameArea.getBoundingClientRect();
            
            obstacle.y = ((rect.top - gameAreaRect.top) / gameAreaRect.height) * 100;
            
            // Handle obstacles shooting (only if speed is less than 1.1 OR stationary)
            if (obstacle.speed < 1.1 || obstacle.type === 'stationary') {
                const now = Date.now();
                if (now - obstacle.lastShot > 10000) { // 10 seconds = 10,000ms
                    this.shootEnemyLaser(obstacle);
                    obstacle.lastShot = now;
                }
            }
            
            // Remove obstacles that have passed the bottom (only moving ones)
            if (obstacle.type === 'moving' && obstacle.y > 100) {
                obstacle.element.remove();
                this.obstacles.splice(index, 1);
                this.score += obstacle.points;
                this.updateScore();
                this.createParticles(rect.left + rect.width/2, rect.top + rect.height/2);
            }
        });
    }
    
    updateLasers() {
        this.lasers.forEach((laser, index) => {
            laser.y -= laser.speed;
            laser.element.style.top = laser.y + '%';
            
            // Remove lasers that have gone off screen
            if (laser.y < -5) {
                laser.element.remove();
                this.lasers.splice(index, 1);
            }
        });
    }
    
    updateEnemyLasers() {
        this.enemyLasers.forEach((laser, index) => {
            laser.y += laser.speed;
            laser.element.style.top = laser.y + '%';
            
            // Remove lasers that have gone off screen
            if (laser.y > 105) {
                laser.element.remove();
                this.enemyLasers.splice(index, 1);
            }
        });
    }
    
    shootEnemyLaser(obstacle) {
        const laser = document.createElement('div');
        laser.className = 'enemy-laser';
        laser.style.left = (obstacle.x + 1.5) + '%';
        laser.style.top = (obstacle.y + 5) + '%';
        
        this.gameArea.appendChild(laser);
        
        this.enemyLasers.push({
            element: laser,
            x: obstacle.x + 1.5,
            y: obstacle.y + 5,
            speed: 2 // percentage per frame
        });
    }
    
    checkCollisions() {
        const playerRect = this.playerRocket.getBoundingClientRect();
        const gameAreaRect = this.gameArea.getBoundingClientRect();
        
        const playerX = playerRect.left - gameAreaRect.left;
        const playerY = playerRect.top - gameAreaRect.top;
        const playerWidth = playerRect.width;
        const playerHeight = playerRect.height;
        
        // Check laser-obstacle collisions
        this.lasers.forEach((laser, laserIndex) => {
            const laserRect = laser.element.getBoundingClientRect();
            const laserX = laserRect.left - gameAreaRect.left;
            const laserY = laserRect.top - gameAreaRect.top;
            const laserWidth = laserRect.width;
            const laserHeight = laserRect.height;
            
            this.obstacles.forEach((obstacle, obstacleIndex) => {
                const obstacleRect = obstacle.element.getBoundingClientRect();
                const obstacleX = obstacleRect.left - gameAreaRect.left;
                const obstacleY = obstacleRect.top - gameAreaRect.top;
                const obstacleWidth = obstacleRect.width;
                const obstacleHeight = obstacleRect.height;
                
                // Laser-obstacle collision
                if (laserX < obstacleX + obstacleWidth &&
                    laserX + laserWidth > obstacleX &&
                    laserY < obstacleY + obstacleHeight &&
                    laserY + laserHeight > obstacleY) {
                    
                    // Remove laser and obstacle
                    laser.element.remove();
                    obstacle.element.remove();
                    this.lasers.splice(laserIndex, 1);
                    this.obstacles.splice(obstacleIndex, 1);
                    
                    // Add score for destroying obstacle
                    this.score += obstacle.points * 2; // Double points for destroying
                    this.updateScore();
                    
                    // Create explosion effect
                    this.createParticles(obstacleX + obstacleWidth/2, obstacleY + obstacleHeight/2, '#ff6b6b');
                }
            });
        });
        
        // Check player-obstacle collisions
        for (let obstacle of this.obstacles) {
            const obstacleRect = obstacle.element.getBoundingClientRect();
            const obstacleX = obstacleRect.left - gameAreaRect.left;
            const obstacleY = obstacleRect.top - gameAreaRect.top;
            const obstacleWidth = obstacleRect.width;
            const obstacleHeight = obstacleRect.height;
            
            // Collision detection
            if (playerX < obstacleX + obstacleWidth &&
                playerX + playerWidth > obstacleX &&
                playerY < obstacleY + obstacleHeight &&
                playerY + playerHeight > obstacleY) {
                this.gameOver();
                return;
            }
        }
        
        // Check player-enemy laser collisions
        this.enemyLasers.forEach((laser, laserIndex) => {
            const laserRect = laser.element.getBoundingClientRect();
            const laserX = laserRect.left - gameAreaRect.left;
            const laserY = laserRect.top - gameAreaRect.top;
            const laserWidth = laserRect.width;
            const laserHeight = laserRect.height;
            
            // Player-enemy laser collision
            if (playerX < laserX + laserWidth &&
                playerX + playerWidth > laserX &&
                playerY < laserY + laserHeight &&
                playerY + playerHeight > laserY) {
                
                // Remove laser
                laser.element.remove();
                this.enemyLasers.splice(laserIndex, 1);
                
                this.gameOver();
                return;
            }
        });
    }
    
    gameOver() {
        this.gameRunning = false;
        this.gamePaused = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.pauseBtn.textContent = 'Pause';
        
        this.finalScoreElement.textContent = this.score;
        this.gameOverElement.style.display = 'block';
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('rocketDodgeHighScore', this.highScore);
            this.updateHighScore();
        }
        
        // Create explosion effect
        this.createExplosion();
    }
    
    createExplosion() {
        const playerRect = this.playerRocket.getBoundingClientRect();
        const gameAreaRect = this.gameArea.getBoundingClientRect();
        
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.createParticles(
                    playerRect.left + playerRect.width/2 - gameAreaRect.left,
                    playerRect.top + playerRect.height/2 - gameAreaRect.top,
                    '#ff4757'
                );
            }, i * 50);
        }
    }
    
    createParticles(x, y, color = '#00ffff') {
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.background = color;
            particle.style.left = (x + (Math.random() - 0.5) * 100) + 'px';
            particle.style.top = (y + (Math.random() - 0.5) * 100) + 'px';
            
            this.gameArea.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.remove();
                }
            }, 1000);
        }
    }
    
    updateScore() {
        this.scoreElement.textContent = this.score;
        
        // Increase difficulty over time
        if (this.score > 0 && this.score % 100 === 0) {
            this.obstacleSpawnRate = Math.max(800, this.obstacleSpawnRate - 100);
        }
    }
    
    updateHighScore() {
        this.highScoreElement.textContent = this.highScore;
    }
    
    gameLoop() {
        if (!this.gameRunning || this.gamePaused) return;
        
        this.handleContinuousMovement();
        this.spawnObstacle();
        this.updateObstacles();
        this.updateLasers();
        this.updateEnemyLasers();
        this.checkCollisions();
        
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new RocketDodgeGame();
});
