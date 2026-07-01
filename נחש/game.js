const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');

// Settings
const GRID_SIZE = 20;
let CANVAS_SIZE = 400;
let tileSize = CANVAS_SIZE / GRID_SIZE;

// Game State
let snake = [];
let food = { x: 0, y: 0 };
let direction = 'RIGHT';
let nextDirection = 'RIGHT';
let gameInterval = null;
let score = 0;
let highScore = localStorage.getItem('snake-high-score') || 0;
let isGameOver = false;

// Snake speed (ms per move)
let speed = 200; // Even slower by default (Easy mode)
let baseSpeed = 200;

// Initialize High Score
highScoreElement.textContent = highScore.toString().padStart(3, '0');

function initGame() {
    // Reset Canvas and Tile
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    tileSize = CANVAS_SIZE / GRID_SIZE;

    // Snake Start Position (Middle)
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];

    direction = 'RIGHT';
    nextDirection = 'RIGHT';
    score = 0;
    speed = baseSpeed;
    updateScore();
    
    spawnFood();
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, speed);
}

function setSpeed(newSpeed) {
    baseSpeed = newSpeed;
    if (gameInterval) {
        // If game is running, update current interval
        const currentProgress = score / 10;
        speed = Math.max(60, baseSpeed - (currentProgress * 2));
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, speed);
    }
}

window.updateSpeed = function(newSpeed, btn) {
    setSpeed(newSpeed);
    
    // Update UI
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
};

function spawnFood() {
    let valid = false;
    while (!valid) {
        food.x = Math.floor(Math.random() * GRID_SIZE);
        food.y = Math.floor(Math.random() * GRID_SIZE);
        
        // Check if food spawned on snake
        valid = !snake.some(segment => segment.x === food.x && segment.y === food.y);
    }
}

function gameLoop() {
    moveSnake();
    checkCollision();
    draw();
}

function moveSnake() {
    direction = nextDirection;
    const head = { ...snake[0] };

    switch (direction) {
        case 'UP': head.y--; break;
        case 'DOWN': head.y++; break;
        case 'LEFT': head.x--; break;
        case 'RIGHT': head.x++; break;
    }

    snake.unshift(head);

    // Check if snake ate food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        updateScore();
        spawnFood();
        
        // Increase speed slightly
        if (speed > 60) {
            clearInterval(gameInterval);
            speed -= 2;
            gameInterval = setInterval(gameLoop, speed);
        }
    } else {
        snake.pop(); // Remove tail segment
    }
}

function checkCollision() {
    const head = snake[0];

    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        gameOver();
    }

    // Self collision
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
        }
    }
}

function gameOver() {
    clearInterval(gameInterval);
    isGameOver = true;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snake-high-score', highScore);
        highScoreElement.textContent = highScore.toString().padStart(3, '0');
    }

    overlayTitle.textContent = "המשחק נגמר!";
    overlayMsg.textContent = "הניקוד שלך: " + score;
    startBtn.textContent = "נסה שוב";
    overlay.classList.remove('hidden');
}

function updateScore() {
    scoreElement.textContent = score.toString().padStart(3, '0');
}

function draw() {
    // Clear Canvas
    ctx.fillStyle = '#121620';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Subtle Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * tileSize, 0);
        ctx.lineTo(i * tileSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * tileSize);
        ctx.lineTo(canvas.width, i * tileSize);
        ctx.stroke();
    }

    // Draw Food (Apple)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0077';
    ctx.fillStyle = '#ff0077';
    
    const centerX = food.x * tileSize + tileSize / 2;
    const centerY = food.y * tileSize + tileSize / 2;
    const radius = tileSize / 1.8; // Larger radius

    // Apple body
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Apple stem (small brown/dark line)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.quadraticCurveTo(centerX + 2, centerY - radius - 5, centerX + 5, centerY - radius - 4);
    ctx.stroke();

    // Apple leaf (small green arc)
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.ellipse(centerX + 3, centerY - radius - 3, 4, 2, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw Snake
    snake.forEach((segment, index) => {
        const isHead = index === 0;
        
        ctx.shadowBlur = isHead ? 20 : 10;
        ctx.shadowColor = '#00ff88';
        
        // Gradient for the snake body
        const alpha = 1 - (index / snake.length) * 0.6;
        ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
        
        const padding = 2;
        const x = segment.x * tileSize + padding;
        const y = segment.y * tileSize + padding;
        const size = tileSize - padding * 2;
        
        // Rounded rectangles for snake
        drawRoundedRect(ctx, x, y, size, size, isHead ? 6 : 4);
    });
    
    // Reset shadow
    ctx.shadowBlur = 0;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
}

// Input Handling
window.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (direction !== 'DOWN') nextDirection = 'UP';
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (direction !== 'UP') nextDirection = 'DOWN';
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (direction !== 'RIGHT') nextDirection = 'LEFT';
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (direction !== 'LEFT') nextDirection = 'RIGHT';
            break;
    }
});

startBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    initGame();
});

// Initial Draw
draw();
