const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const livesElement = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');

// Settings
const MAP_SIZE = 19;
const TILE_SIZE = 20;
canvas.width = MAP_SIZE * TILE_SIZE;
canvas.height = MAP_SIZE * TILE_SIZE;

// 1 = Wall, 0 = Pellet, 2 = Power Pellet, 3 = Empty, 4 = Ghost Gate
const originalMap = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,2,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,2,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,0,1,1,1,3,1,3,1,1,1,0,1,1,1,1],
    [3,3,3,1,0,1,3,3,3,3,3,3,3,1,0,1,3,3,3],
    [1,1,1,1,0,1,3,1,1,4,1,1,3,1,0,1,1,1,1],
    [3,3,3,3,0,3,3,1,3,3,3,1,3,3,0,3,3,3,3],
    [1,1,1,1,0,1,3,1,1,1,1,1,3,1,0,1,1,1,1],
    [3,3,3,1,0,1,3,3,3,3,3,3,3,1,0,1,3,3,3],
    [1,1,1,1,0,1,3,1,1,1,1,1,3,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,2,0,1,0,0,0,0,0,3,0,0,0,0,0,1,0,2,1],
    [1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

let map = JSON.parse(JSON.stringify(originalMap));
let score = 0;
let lives = 3;
let highScore = localStorage.getItem('pacman-high-score') || 0;
let powerMode = false;
let powerTimeout = null;

// Game State
let pacman = { x: 9, y: 15, dir: 'LEFT', nextDir: 'LEFT', frame: 0 };
let ghosts = [
    { x: 9, y: 8, color: '#ff0000', dir: 'UP', state: 'NORMAL' }, // Red
    { x: 8, y: 9, color: '#ffb8ff', dir: 'LEFT', state: 'NORMAL' }, // Pink
    { x: 10, y: 9, color: '#00ffff', dir: 'RIGHT', state: 'NORMAL' }, // Cyan
    { x: 9, y: 9, color: '#ffb852', dir: 'UP', state: 'NORMAL' }   // Orange
];

highScoreElement.textContent = highScore.toString().padStart(3, '0');

function initGame() {
    map = JSON.parse(JSON.stringify(originalMap));
    score = 0;
    lives = 3;
    resetPosition();
    updateUI();
    startGameLoop();
}

function resetPosition() {
    pacman = { x: 9, y: 15, dir: 'LEFT', nextDir: 'LEFT', frame: 0 };
    ghosts = [
        { x: 9, y: 8, color: '#ff0000', dir: 'UP', state: 'NORMAL' },
        { x: 8, y: 9, color: '#ffb8ff', dir: 'LEFT', state: 'NORMAL' },
        { x: 10, y: 9, color: '#00ffff', dir: 'RIGHT', state: 'NORMAL' },
        { x: 9, y: 9, color: '#ffb852', dir: 'UP', state: 'NORMAL' }
    ];
}

let gameInterval = null;
function startGameLoop() {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(update, 150);
}

function update() {
    movePacman();
    moveGhosts();
    checkCollisions();
    draw();
}

function movePacman() {
    // Try to change direction
    let dx = 0, dy = 0;
    if (pacman.nextDir === 'UP') dy = -1;
    if (pacman.nextDir === 'DOWN') dy = 1;
    if (pacman.nextDir === 'LEFT') dx = -1;
    if (pacman.nextDir === 'RIGHT') dx = 1;

    // Check if nextDir is possible
    const nextX = (pacman.x + dx + MAP_SIZE) % MAP_SIZE;
    const nextY = (pacman.y + dy + MAP_SIZE) % MAP_SIZE;

    if (map[nextY][nextX] !== 1 && map[nextY][nextX] !== 4) {
        pacman.dir = pacman.nextDir;
    }

    // Move in current dir
    dx = 0; dy = 0;
    if (pacman.dir === 'UP') dy = -1;
    if (pacman.dir === 'DOWN') dy = 1;
    if (pacman.dir === 'LEFT') dx = -1;
    if (pacman.dir === 'RIGHT') dx = 1;

    const projX = (pacman.x + dx + MAP_SIZE) % MAP_SIZE;
    const projY = (pacman.y + dy + MAP_SIZE) % MAP_SIZE;

    if (map[projY][projX] !== 1 && map[projY][projX] !== 4) {
        pacman.x = projX;
        pacman.y = projY;
    }

    // Eat
    const cell = map[pacman.y][pacman.x];
    if (cell === 0) {
        map[pacman.y][pacman.x] = 3;
        score += 10;
        updateUI();
    } else if (cell === 2) {
        map[pacman.y][pacman.x] = 3;
        score += 50;
        activatePowerMode();
        updateUI();
    }

    pacman.frame = (pacman.frame + 1) % 4;
}

function activatePowerMode() {
    powerMode = true;
    ghosts.forEach(g => g.state = 'VULNERABLE');
    if (powerTimeout) clearTimeout(powerTimeout);
    powerTimeout = setTimeout(() => {
        powerMode = false;
        ghosts.forEach(g => g.state = 'NORMAL');
    }, 8000);
}

function moveGhosts() {
    ghosts.forEach(ghost => {
        const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        const possibleDirs = dirs.filter(d => {
            let dx = 0, dy = 0;
            if (d === 'UP') dy = -1;
            if (d === 'DOWN') dy = 1;
            if (d === 'LEFT') dx = -1;
            if (d === 'RIGHT') dx = 1;
            const nx = (ghost.x + dx + MAP_SIZE) % MAP_SIZE;
            const ny = (ghost.y + dy + MAP_SIZE) % MAP_SIZE;
            return map[ny][nx] !== 1 && map[ny][nx] !== 4; // Simple walls check
        });

        // Don't go back unless stuck
        const opposite = { 'UP': 'DOWN', 'DOWN': 'UP', 'LEFT': 'RIGHT', 'RIGHT': 'LEFT' }[ghost.dir];
        let choiceDirs = possibleDirs.filter(d => d !== opposite);
        if (choiceDirs.length === 0) choiceDirs = possibleDirs;

        ghost.dir = choiceDirs[Math.floor(Math.random() * choiceDirs.length)];
        
        let dx = 0, dy = 0;
        if (ghost.dir === 'UP') dy = -1;
        if (ghost.dir === 'DOWN') dy = 1;
        if (ghost.dir === 'LEFT') dx = -1;
        if (ghost.dir === 'RIGHT') dx = 1;
        ghost.x = (ghost.x + dx + MAP_SIZE) % MAP_SIZE;
        ghost.y = (ghost.y + dy + MAP_SIZE) % MAP_SIZE;
    });
}

function checkCollisions() {
    ghosts.forEach(ghost => {
        if (Math.abs(ghost.x - pacman.x) < 0.5 && Math.abs(ghost.y - pacman.y) < 0.5) {
            if (ghost.state === 'VULNERABLE') {
                ghost.x = 9; ghost.y = 9;
                ghost.state = 'NORMAL';
                score += 200;
                updateUI();
            } else {
                lives--;
                updateUI();
                if (lives <= 0) gameOver();
                else resetPosition();
            }
        }
    });

    // Check Win
    const remaining = map.flat().filter(c => c === 0 || c === 2).length;
    if (remaining === 0) winGame();
}

function updateUI() {
    scoreElement.textContent = score.toString().padStart(3, '0');
    livesElement.textContent = '❤'.repeat(lives);
}

function gameOver() {
    clearInterval(gameInterval);
    overlayTitle.textContent = "המשחק נגמר!";
    overlayMsg.textContent = "הניקוד שלך: " + score;
    overlay.classList.remove('hidden');
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('pacman-high-score', highScore);
        highScoreElement.textContent = highScore.toString().padStart(3, '0');
    }
}

function winGame() {
    clearInterval(gameInterval);
    overlayTitle.textContent = "אתה אלוף!";
    overlayMsg.textContent = "ניקית את כל המפה!";
    overlay.classList.remove('hidden');
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Map
    for (let y = 0; y < MAP_SIZE; y++) {
        for (let x = 0; x < MAP_SIZE; x++) {
            const cell = map[y][x];
            if (cell === 1) {
                ctx.fillStyle = '#1a1a5a';
                ctx.strokeStyle = '#0088ff';
                ctx.lineWidth = 1;
                ctx.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                ctx.strokeRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            } else if (cell === 0) {
                ctx.fillStyle = '#ffb8ae';
                ctx.beginPath();
                ctx.arc(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (cell === 2) {
                const glow = Math.sin(Date.now() / 100) * 2 + 3;
                ctx.fillStyle = '#fff';
                ctx.shadowBlur = glow * 2;
                ctx.shadowColor = '#fff';
                ctx.beginPath();
                ctx.arc(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, glow, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }

    // Draw Pacman
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    const px = pacman.x * TILE_SIZE + TILE_SIZE / 2;
    const py = pacman.y * TILE_SIZE + TILE_SIZE / 2;
    const mouth = (pacman.frame === 0 || pacman.frame === 3 ) ? 0.2 : 0;
    let startAngle = mouth * Math.PI;
    let endAngle = (2 - mouth) * Math.PI;
    
    if (pacman.dir === 'UP') { startAngle -= 0.5 * Math.PI; endAngle -= 0.5 * Math.PI; }
    if (pacman.dir === 'DOWN') { startAngle += 0.5 * Math.PI; endAngle += 0.5 * Math.PI; }
    if (pacman.dir === 'LEFT') { startAngle += 1 * Math.PI; endAngle += 1 * Math.PI; }
    
    ctx.moveTo(px, py);
    ctx.arc(px, py, TILE_SIZE / 2 - 2, startAngle, endAngle);
    ctx.lineTo(px, py);
    ctx.fill();

    // Draw Ghosts
    ghosts.forEach(ghost => {
        ctx.fillStyle = (ghost.state === 'VULNERABLE') ? '#0000ff' : ghost.color;
        const gx = ghost.x * TILE_SIZE + TILE_SIZE / 2;
        const gy = ghost.y * TILE_SIZE + TILE_SIZE / 2;
        
        // Body (Circle head + rectangle body)
        ctx.beginPath();
        ctx.arc(gx, gy, TILE_SIZE / 2 - 2, Math.PI, 0); // Head
        ctx.lineTo(gx + TILE_SIZE / 2 - 2, gy + TILE_SIZE / 2 - 2); // Side
        ctx.lineTo(gx - TILE_SIZE / 2 + 2, gy + TILE_SIZE / 2 - 2); // Bottom/Side
        ctx.fill();

        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(gx - 4, gy - 2, 2.5, 0, Math.PI * 2);
        ctx.arc(gx + 4, gy - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(gx - 4, gy - 2, 1, 0, Math.PI * 2);
        ctx.arc(gx + 4, gy - 2, 1, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Input
window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'w', 'W'].includes(e.key)) pacman.nextDir = 'UP';
    if (['ArrowDown', 's', 'S'].includes(e.key)) pacman.nextDir = 'DOWN';
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) pacman.nextDir = 'LEFT';
    if (['ArrowRight', 'd', 'D'].includes(e.key)) pacman.nextDir = 'RIGHT';
});

startBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    initGame();
});

draw();
