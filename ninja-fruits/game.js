const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const finalScoreElement = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

let score = 0;
let lives = 3;
let gameActive = false;
let fruits = [];
let particles = [];
let sliceTrail = [];
let lastSpawnTime = 0;
let spawnInterval = 1500;

const FRUIT_TYPES = [
    { icon: '🍉', color: '#4caf50', particleColor: '#ff5252' },
    { icon: '🍍', color: '#fbc02d', particleColor: '#fff9c4' },
    { icon: '🍎', color: '#f44336', particleColor: '#ffcdd2' },
    { icon: '🍊', color: '#fb8c00', particleColor: '#ffe0b2' },
    { icon: '🥝', color: '#8bc34a', particleColor: '#dcedc8' }
];

const BOMB = { icon: '💣', color: '#000000', particleColor: '#ffffff' };

class Fruit {
    constructor() {
        this.reset();
    }

    reset() {
        const isBomb = Math.random() < 0.15;
        const type = isBomb ? BOMB : FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
        
        this.icon = type.icon;
        this.color = type.color;
        this.particleColor = type.particleColor;
        this.isBomb = isBomb;
        
        this.size = 60;
        this.x = Math.random() * (canvas.width - 200) + 100;
        this.y = canvas.height + this.size;
        
        // Launch physics
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = -(Math.random() * 8 + 12);
        this.gravity = 0.25;
        this.angle = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        
        this.sliced = false;
        this.offScreen = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.angle += this.rotationSpeed;

        if (this.y > canvas.height + 100 && this.vy > 0) {
            this.offScreen = true;
            if (!this.sliced && !this.isBomb) {
                loseLife();
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (this.sliced) {
            // Draw two halves
            ctx.fillText(this.icon, -15, 0);
            ctx.fillText(this.icon, 15, 0);
        } else {
            ctx.fillText(this.icon, 0, 0);
        }
        
        ctx.restore();
    }

    checkSlice(mx, my, px, py) {
        if (this.sliced) return false;

        // Line-Circle collision detection
        const dx = mx - this.x;
        const dy = my - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.size / 1.5) {
            this.sliced = true;
            if (this.isBomb) {
                gameOver();
            } else {
                score += 10;
                scoreElement.innerText = score;
                createParticles(this.x, this.y, this.particleColor);
            }
            return true;
        }
        return false;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 8 + 4;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // gravity
        this.life -= this.decay;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

// Input Handling
let mouseX = 0, mouseY = 0, prevMouseX = 0, prevMouseY = 0;
let isMouseDown = false;

window.addEventListener('mousemove', (e) => {
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    if (gameActive) {
        sliceTrail.push({ x: mouseX, y: mouseY, life: 1.0 });
        fruits.forEach(fruit => fruit.checkSlice(mouseX, mouseY, prevMouseX, prevMouseY));
    }
});

window.addEventListener('mousedown', () => isMouseDown = true);
window.addEventListener('mouseup', () => isMouseDown = false);

// Touch Support
window.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX = touch.clientX;
    mouseY = touch.clientY;
    
    if (gameActive) {
        sliceTrail.push({ x: mouseX, y: mouseY, life: 1.0 });
        fruits.forEach(fruit => fruit.checkSlice(mouseX, mouseY, prevMouseX, prevMouseY));
    }
    e.preventDefault();
}, { passive: false });

function loseLife() {
    lives--;
    updateLivesUI();
    if (lives <= 0) {
        gameOver();
    }
}

function updateLivesUI() {
    livesElement.innerText = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
}

function gameOver() {
    gameActive = false;
    finalScoreElement.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

function initGame() {
    score = 0;
    lives = 3;
    fruits = [];
    particles = [];
    sliceTrail = [];
    scoreElement.innerText = score;
    updateLivesUI();
    gameActive = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
}

function gameLoop(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameActive) {
        // Spawn fruits
        if (time - lastSpawnTime > spawnInterval) {
            fruits.push(new Fruit());
            lastSpawnTime = time;
            // Difficulty curve
            spawnInterval = Math.max(600, 1500 - (score / 5));
        }
    }

    // Update & Draw Fruits
    for (let i = fruits.length - 1; i >= 0; i--) {
        fruits[i].update();
        fruits[i].draw();
        if (fruits[i].offScreen) {
            fruits.splice(i, 1);
        }
    }

    // Update & Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Draw Slice Trail
    ctx.beginPath();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (let i = 0; i < sliceTrail.length; i++) {
        const point = sliceTrail[i];
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
        
        point.life -= 0.05;
    }
    ctx.stroke();
    sliceTrail = sliceTrail.filter(p => p.life > 0);

    requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);

requestAnimationFrame(gameLoop);
