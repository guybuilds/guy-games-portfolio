/**
 * הנוקמים: סערה בניו יורק | Avengers NYC Beat 'Em Up Arcade
 * Built with HTML5 Canvas & Web Audio API & Gamepad API for PlayStation Controllers
 */

// --- HERO ROSTER DEFINITIONS ---
const HEROES = [
    {
        id: 'ironman',
        name: 'איירון מן',
        englishName: 'IRON MAN',
        icon: '🦾',
        role: 'תעופה + ירי ריפולסורים',
        color: '#ef4444',
        accentColor: '#fbbf24',
        speed: 5.5,
        damage: 22,
        maxHp: 100,
        specialName: 'Unibeam Super Blast',
        specialCost: 40
    },
    {
        id: 'captain',
        name: 'קפטן אמריקה',
        englishName: 'CAPTAIN AMERICA',
        icon: '🛡️',
        role: 'מגן מנפץ + קומבו מהיר',
        color: '#3b82f6',
        accentColor: '#ef4444',
        speed: 5.0,
        damage: 25,
        maxHp: 110,
        specialName: 'Shield Boomerang Rampage',
        specialCost: 35
    },
    {
        id: 'hulk',
        name: 'האלק',
        englishName: 'THE HULK',
        icon: '🟢',
        role: 'ענק הרסני + זעזוע מוח',
        color: '#22c55e',
        accentColor: '#15803d',
        speed: 4.2,
        damage: 35,
        maxHp: 140,
        specialName: 'Earthquake Ground Smash',
        specialCost: 50
    },
    {
        id: 'thor',
        name: 'תור',
        englishName: 'THOR',
        icon: '⚡',
        role: 'אל הרעם + מכות מקבת',
        color: '#38bdf8',
        accentColor: '#f59e0b',
        speed: 4.8,
        damage: 28,
        maxHp: 120,
        specialName: 'Mjolnir Lightning Storm',
        specialCost: 45
    },
    {
        id: 'spiderman',
        name: 'ספיידרמן',
        englishName: 'SPIDER-MAN',
        icon: '🕷️',
        role: 'אקרובטיקה + קורי עכביש',
        color: '#dc2626',
        accentColor: '#0284c7',
        speed: 6.2,
        damage: 20,
        maxHp: 95,
        specialName: 'Web Cyclone Tornado',
        specialCost: 30
    }
];

// --- SOUND ENGINE (Web Audio API) ---
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.2) {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    playPunch() {
        if (!this.enabled || !this.ctx) return;
        this.playTone(140, 'triangle', 0.08, 0.3);
        this.playTone(70, 'sawtooth', 0.12, 0.4);
    }

    playLaser() {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.2);
        } catch(e) {}
    }

    playLightning() {
        if (!this.enabled || !this.ctx) return;
        this.playTone(300, 'square', 0.2, 0.3);
        this.playTone(150, 'sawtooth', 0.3, 0.4);
    }

    playExplosion() {
        if (!this.enabled || !this.ctx) return;
        this.playTone(90, 'square', 0.3, 0.5);
        this.playTone(40, 'sawtooth', 0.4, 0.6);
    }

    playSwitch() {
        if (!this.enabled || !this.ctx) return;
        this.playTone(523, 'sine', 0.1, 0.2);
        setTimeout(() => this.playTone(659, 'sine', 0.1, 0.2), 60);
    }
}

const sounds = new SoundEngine();

// --- GAME CANVAS & RESIZE ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameWidth = window.innerWidth;
let gameHeight = window.innerHeight;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gameWidth = canvas.width;
    gameHeight = canvas.height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const STREET_MIN_Z = 0;
const STREET_MAX_Z = 180;

function getScreenY(z, yOffset = 0) {
    const baseLine = gameHeight * 0.68;
    return baseLine + (z / STREET_MAX_Z) * (gameHeight * 0.24) - yOffset;
}

// --- GAME STATE ---
let gameState = {
    running: false,
    score: 0,
    kills: 0,
    maxCombo: 0,
    currentCombo: 0,
    comboTimer: null,
    cameraX: 0,
    selectedHeroIndex: 0,
    soundOn: true,
    bossSpawned: false
};

// --- INPUT MANAGEMENT (Keyboard, Touch, Gamepad) ---
const keys = {};
const virtualKeys = {
    up: false, down: false, left: false, right: false,
    attack: false, special: false, jump: false, dodge: false
};
let lastHeroSwitchTime = 0;

// Keydown / Keyup with PreventDefault for Game Keys
const preventKeys = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyJ', 'KeyK', 'KeyL', 'KeyZ', 'KeyX'];
window.addEventListener('keydown', (e) => {
    if (preventKeys.includes(e.code)) {
        e.preventDefault();
    }
    keys[e.code] = true;
    sounds.init();
});
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// GAMEPAD POLLING (PlayStation Controllers)
let gamepadConnected = false;

function updateGamepadInput() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && gamepads[i].connected) {
            pad = gamepads[i];
            break;
        }
    }

    const gpStatusEl = document.getElementById('gamepadStatus');
    const gpTextEl = document.getElementById('gamepadText');

    if (pad) {
        if (!gamepadConnected) {
            gamepadConnected = true;
            gpStatusEl.classList.remove('disconnected');
            gpStatusEl.classList.add('connected');
            gpTextEl.textContent = `שלט PS מחובר: ${pad.id.substring(0, 14)}...`;
        }
    } else {
        if (gamepadConnected) {
            gamepadConnected = false;
            gpStatusEl.classList.remove('connected');
            gpStatusEl.classList.add('disconnected');
            gpTextEl.textContent = 'שלט PS: לחץ מקש בשלט לחיבור';
        }
    }

    return pad;
}

// SETUP VIRTUAL CONTROLS
function setupVirtualControls() {
    const bindVBtn = (elementId, keyName) => {
        const el = document.getElementById(elementId);
        if (!el) return;

        const press = (e) => {
            e.preventDefault();
            virtualKeys[keyName] = true;
            el.classList.add('active');
            sounds.init();
        };
        const release = (e) => {
            e.preventDefault();
            virtualKeys[keyName] = false;
            el.classList.remove('active');
        };

        el.addEventListener('touchstart', press, { passive: false });
        el.addEventListener('touchend', release, { passive: false });
        el.addEventListener('mousedown', press);
        el.addEventListener('mouseup', release);
        el.addEventListener('mouseleave', release);
    };

    bindVBtn('vUp', 'up');
    bindVBtn('vDown', 'down');
    bindVBtn('vLeft', 'left');
    bindVBtn('vRight', 'right');
    bindVBtn('vAttack', 'attack');
    bindVBtn('vSpecial', 'special');
    bindVBtn('vJump', 'jump');
    bindVBtn('vDodge', 'dodge');
}

// --- PLAYER CLASS ---
class Player {
    constructor(heroIndex = 0) {
        this.heroIndex = heroIndex;
        this.data = HEROES[heroIndex];
        this.x = 200;
        this.z = 90;
        this.y = 0;
        this.vy = 0;
        this.hp = this.data.maxHp;
        this.maxHp = this.data.maxHp;
        this.isGrounded = true;
        this.facing = 1;
        this.state = 'idle';
        this.attackCooldown = 0;
        this.specialMeter = 100;
        this.dodgeCooldown = 0;
        this.invulnerableTimer = 0;
        this.animTimer = 0;
        this.animFrame = 0;
    }

    setHero(index) {
        this.heroIndex = index;
        this.data = HEROES[index];
        this.hp = this.data.maxHp;
        this.maxHp = this.data.maxHp;
        updateHUD();
    }

    reset() {
        this.x = 200;
        this.z = 90;
        this.y = 0;
        this.vy = 0;
        this.hp = this.data.maxHp;
        this.specialMeter = 100;
        this.state = 'idle';
        this.isGrounded = true;
        this.facing = 1;
        updateHUD();
    }

    update() {
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.dodgeCooldown > 0) this.dodgeCooldown--;
        if (this.invulnerableTimer > 0) this.invulnerableTimer--;

        if (this.specialMeter < 100) {
            this.specialMeter = Math.min(100, this.specialMeter + 0.18);
            updateHUDBars();
        }

        // Gravity
        if (!this.isGrounded) {
            this.y += this.vy;
            this.vy -= 0.85;
            if (this.y <= 0) {
                this.y = 0;
                this.vy = 0;
                this.isGrounded = true;
                this.state = 'idle';
            }
        }

        // Input Gathering
        const pad = updateGamepadInput();
        let moveX = 0;
        let moveZ = 0;
        let reqAttack = false;
        let reqSpecial = false;
        let reqJump = false;
        let reqDodge = false;

        // Gamepad Input
        if (pad) {
            if (Math.abs(pad.axes[0]) > 0.25) moveX = pad.axes[0];
            if (Math.abs(pad.axes[1]) > 0.25) moveZ = pad.axes[1];

            if (pad.buttons[14] && pad.buttons[14].pressed) moveX = -1;
            if (pad.buttons[15] && pad.buttons[15].pressed) moveX = 1;
            if (pad.buttons[12] && pad.buttons[12].pressed) moveZ = -1;
            if (pad.buttons[13] && pad.buttons[13].pressed) moveZ = 1;

            if (pad.buttons[2] && pad.buttons[2].pressed) reqAttack = true; // Square
            if (pad.buttons[3] && pad.buttons[3].pressed) reqSpecial = true; // Triangle
            if (pad.buttons[0] && pad.buttons[0].pressed) reqJump = true; // Cross
            if (pad.buttons[1] && pad.buttons[1].pressed) reqDodge = true; // Circle

            const now = Date.now();
            if (now - lastHeroSwitchTime > 300) {
                if (pad.buttons[4] && pad.buttons[4].pressed) {
                    switchHeroRelative(-1);
                    lastHeroSwitchTime = now;
                } else if (pad.buttons[5] && pad.buttons[5].pressed) {
                    switchHeroRelative(1);
                    lastHeroSwitchTime = now;
                }
            }
        }

        // Keyboard & Virtual Keys Input
        if (keys['KeyA'] || keys['ArrowLeft'] || virtualKeys.left) moveX = -1;
        if (keys['KeyD'] || keys['ArrowRight'] || virtualKeys.right) moveX = 1;
        if (keys['KeyW'] || keys['ArrowUp'] || virtualKeys.up) moveZ = -1;
        if (keys['KeyS'] || keys['ArrowDown'] || virtualKeys.down) moveZ = 1;

        if (keys['KeyJ'] || keys['KeyZ'] || virtualKeys.attack) reqAttack = true;
        if (keys['KeyK'] || keys['KeyX'] || virtualKeys.special) reqSpecial = true;
        if (keys['Space'] || virtualKeys.jump) reqJump = true;
        if (keys['KeyL'] || keys['ShiftLeft'] || virtualKeys.dodge) reqDodge = true;

        for (let i = 1; i <= 5; i++) {
            if (keys[`Digit${i}`]) switchHero(i - 1);
        }

        // Trigger Actions
        if (reqAttack) this.attack();
        if (reqSpecial) this.specialAttack();
        if (reqJump) this.jump();
        if (reqDodge) this.dodge();

        // Apply Movement
        if (this.state !== 'attack' && this.state !== 'special' && this.state !== 'hurt') {
            if (moveX !== 0 || moveZ !== 0) {
                this.x += moveX * this.data.speed;
                this.z += moveZ * (this.data.speed * 0.7);

                this.x = Math.max(gameState.cameraX + 50, Math.min(gameState.cameraX + gameWidth - 80, this.x));
                this.z = Math.max(STREET_MIN_Z, Math.min(STREET_MAX_Z, this.z));

                if (moveX > 0) this.facing = 1;
                if (moveX < 0) this.facing = -1;

                if (this.isGrounded && this.state !== 'dodge') this.state = 'walk';
            } else if (this.isGrounded && this.state !== 'dodge') {
                this.state = 'idle';
            }
        }

        // Scroll Camera
        if (this.x > gameState.cameraX + gameWidth * 0.5) {
            gameState.cameraX = this.x - gameWidth * 0.5;
        }

        this.animTimer++;
        if (this.animTimer % 8 === 0) {
            this.animFrame = (this.animFrame + 1) % 4;
        }
    }

    jump() {
        if (this.isGrounded) {
            this.vy = 17;
            this.isGrounded = false;
            this.state = 'jump';
        }
    }

    dodge() {
        if (this.dodgeCooldown === 0 && this.isGrounded) {
            this.state = 'dodge';
            this.invulnerableTimer = 25;
            this.dodgeCooldown = 40;
            this.x += this.facing * 90;
            setTimeout(() => { if (this.state === 'dodge') this.state = 'idle'; }, 250);
        }
    }

    attack() {
        if (this.attackCooldown > 0) return;
        this.state = 'attack';
        this.attackCooldown = 18;
        sounds.playPunch();

        const attackBox = {
            x: this.facing === 1 ? this.x + 10 : this.x - 110,
            width: 100,
            z: this.z
        };

        enemies.forEach(enemy => {
            if (enemy.alive && Math.abs(enemy.z - this.z) < 40) {
                if (enemy.x > attackBox.x && enemy.x < attackBox.x + attackBox.width) {
                    enemy.takeDamage(this.data.damage, this.facing);
                    addCombo();
                    createSparkles(enemy.x, getScreenY(enemy.z, enemy.y) - 50, this.data.color);
                }
            }
        });

        setTimeout(() => { if (this.state === 'attack') this.state = 'idle'; }, 220);
    }

    specialAttack() {
        if (this.specialMeter < this.data.specialCost) return;
        this.specialMeter -= this.data.specialCost;
        this.state = 'special';
        updateHUDBars();
        sounds.playLightning();
        createScreenFlash(this.data.accentColor);

        enemies.forEach(enemy => {
            if (enemy.alive && Math.abs(enemy.x - this.x) < 380) {
                enemy.takeDamage(this.data.damage * 2.5, enemy.x > this.x ? 1 : -1);
                addCombo();
                createSparkles(enemy.x, getScreenY(enemy.z, enemy.y) - 50, this.data.accentColor, 16);
            }
        });

        setTimeout(() => { if (this.state === 'special') this.state = 'idle'; }, 500);
    }

    takeDamage(amount) {
        if (this.invulnerableTimer > 0) return;
        this.hp -= amount;
        this.state = 'hurt';
        this.invulnerableTimer = 30;
        updateHUDBars();
        sounds.playTone(100, 'sawtooth', 0.15, 0.4);

        if (this.hp <= 0) {
            this.hp = 0;
            triggerGameOver();
        }

        setTimeout(() => { if (this.state === 'hurt') this.state = 'idle'; }, 300);
    }

    draw() {
        const screenY = getScreenY(this.z, this.y);
        const scale = 0.85 + (this.z / STREET_MAX_Z) * 0.35;
        const posX = this.x - gameState.cameraX;

        ctx.save();

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(posX, screenY + 4, 30 * scale, 10 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hero Figure (Canvas Vector Graphic)
        ctx.translate(posX, screenY);

        if (this.state === 'special') {
            ctx.shadowColor = this.data.accentColor;
            ctx.shadowBlur = 30;
        }

        // Draw Body Circle / Capsule
        ctx.fillStyle = this.data.color;
        ctx.strokeStyle = this.data.accentColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -40 * scale, 24 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw Hero Symbol / Icon inside
        ctx.font = `${24 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.data.icon, 0, -40 * scale);

        // Direction Indicator Eyeline / Weapon
        ctx.fillStyle = this.data.accentColor;
        ctx.beginPath();
        ctx.arc(this.facing * 18 * scale, -40 * scale, 5 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Action Visual Effects
        if (this.state === 'attack') {
            ctx.fillStyle = this.data.color;
            ctx.beginPath();
            ctx.arc(this.facing * 45 * scale, -40 * scale, 20 * scale, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.state === 'special') {
            ctx.fillStyle = this.data.accentColor;
            ctx.beginPath();
            ctx.ellipse(this.facing * 60 * scale, -40 * scale, 50 * scale, 22 * scale, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// --- ENEMY CLASS ---
class Enemy {
    constructor(x, z, type = 'drone') {
        this.x = x;
        this.z = z;
        this.y = 0;
        this.type = type;
        this.isBoss = type === 'boss';
        this.maxHp = this.isBoss ? 550 : 60;
        this.hp = this.maxHp;
        this.speed = this.isBoss ? 2.2 : 2.7;
        this.damage = this.isBoss ? 16 : 7;
        this.alive = true;
        this.attackTimer = 0;
        this.facing = -1;
    }

    update() {
        if (!this.alive || !gameState.running) return;

        const distX = player.x - this.x;
        const distZ = player.z - this.z;
        const totalDist = Math.hypot(distX, distZ);

        if (totalDist > 55) {
            this.x += (distX / totalDist) * this.speed;
            this.z += (distZ / totalDist) * (this.speed * 0.6);
            this.facing = distX > 0 ? 1 : -1;
        } else {
            this.attackTimer++;
            if (this.attackTimer > 60) {
                this.attackTimer = 0;
                player.takeDamage(this.damage);
            }
        }
    }

    takeDamage(amount, knockbackDir) {
        this.hp -= amount;
        this.x += knockbackDir * 35;
        sounds.playPunch();

        if (this.isBoss) {
            updateBossHUD(this.hp, this.maxHp);
        }

        if (this.hp <= 0) {
            this.alive = false;
            gameState.kills++;
            gameState.score += this.isBoss ? 5000 : 500;
            sounds.playExplosion();
            createExplosion(this.x, getScreenY(this.z, 0) - 40);
            updateHUDScore();

            if (this.isBoss) {
                document.getElementById('bossBarContainer').classList.add('hidden');
                triggerVictory();
            }
        }
    }

    draw() {
        if (!this.alive) return;
        const screenY = getScreenY(this.z, this.y);
        const scale = 0.85 + (this.z / STREET_MAX_Z) * 0.35;
        const posX = this.x - gameState.cameraX;

        ctx.save();

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(posX, screenY + 4, 25 * scale, 8 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Enemy Body
        ctx.translate(posX, screenY);
        ctx.fillStyle = this.isBoss ? '#dc2626' : (this.type === 'drone' ? '#475569' : '#0284c7');
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        const radius = (this.isBoss ? 35 : 20) * scale;
        ctx.beginPath();
        ctx.arc(0, -35 * scale, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Icon inside enemy
        ctx.font = `${(this.isBoss ? 32 : 20) * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icon = this.isBoss ? '🤖' : (this.type === 'drone' ? '👾' : '🥷');
        ctx.fillText(icon, 0, -35 * scale);

        // HP bar above enemy
        const barW = this.isBoss ? 90 : 44;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(-barW / 2, -75 * scale, barW, 6);
        ctx.fillStyle = this.isBoss ? '#ef4444' : '#eab308';
        ctx.fillRect(-barW / 2, -75 * scale, barW * Math.max(0, this.hp / this.maxHp), 6);

        ctx.restore();
    }
}

// --- PARTICLES ---
let particles = [];
let screenFlashes = [];

function createSparkles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0,
            color
        });
    }
}

function createExplosion(x, y) {
    createSparkles(x, y, '#ef4444', 16);
    createSparkles(x, y, '#fbbf24', 16);
}

function createScreenFlash(color) {
    screenFlashes.push({ color, alpha: 0.4 });
}

function updateParticles() {
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
    });
    particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x - gameState.cameraX, p.y, 4 * p.life, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    screenFlashes.forEach(f => {
        ctx.fillStyle = f.color;
        ctx.globalAlpha = f.alpha;
        ctx.fillRect(0, 0, gameWidth, gameHeight);
        f.alpha -= 0.05;
    });
    screenFlashes = screenFlashes.filter(f => f.alpha > 0);
    ctx.globalAlpha = 1.0;
}

// --- PARALLAX NYC STREET RENDERER ---
function drawNYCBackground() {
    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, gameHeight * 0.6);
    skyGrad.addColorStop(0, '#020617');
    skyGrad.addColorStop(0.5, '#1e1b4b');
    skyGrad.addColorStop(1, '#312e81');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    // Far Buildings
    ctx.fillStyle = '#0f172a';
    const bgOffset1 = (gameState.cameraX * 0.2) % 300;
    for (let x = -bgOffset1; x < gameWidth + 300; x += 120) {
        const h = 180 + Math.sin(x * 0.05) * 60;
        ctx.fillRect(x, gameHeight * 0.45 - h, 90, h);
        ctx.fillStyle = '#fef08a';
        for (let wy = gameHeight * 0.45 - h + 20; wy < gameHeight * 0.45 - 20; wy += 25) {
            ctx.fillRect(x + 15, wy, 14, 10);
            ctx.fillRect(x + 55, wy, 14, 10);
        }
        ctx.fillStyle = '#0f172a';
    }

    // Midground Buildings & Arcade Signs
    ctx.fillStyle = '#1e293b';
    const bgOffset2 = (gameState.cameraX * 0.5) % 400;
    for (let x = -bgOffset2; x < gameWidth + 400; x += 220) {
        ctx.fillRect(x, gameHeight * 0.35, 180, gameHeight * 0.38);

        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 20, gameHeight * 0.4, 140, 36);
        ctx.fillStyle = '#f472b6';
        ctx.font = '700 16px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TMNT NYC ARCADE', x + 90, gameHeight * 0.4 + 23);
    }

    // Asphalt Street & Sidewalk
    const sidewalkY = getScreenY(0) - 20;
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, sidewalkY, gameWidth, 20);

    const streetGrad = ctx.createLinearGradient(0, getScreenY(0), 0, gameHeight);
    streetGrad.addColorStop(0, '#1e293b');
    streetGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = streetGrad;
    ctx.fillRect(0, getScreenY(0), gameWidth, gameHeight - getScreenY(0));

    // Road Markings
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.setLineDash([40, 30]);
    const roadDashOffset = (gameState.cameraX) % 70;
    ctx.beginPath();
    ctx.moveTo(-roadDashOffset, getScreenY(90));
    ctx.lineTo(gameWidth + 100, getScreenY(90));
    ctx.stroke();
    ctx.setLineDash([]);
}

// --- GAME OBJECTS & WAVES ---
let player = new Player(0);
let enemies = [];

function spawnEnemyWave() {
    const camRight = gameState.cameraX + gameWidth + 80;
    enemies.push(new Enemy(camRight, Math.random() * STREET_MAX_Z, 'drone'));
    enemies.push(new Enemy(camRight + 120, Math.random() * STREET_MAX_Z, 'soldier'));

    if (gameState.kills >= 8 && !gameState.bossSpawned) {
        gameState.bossSpawned = true;
        enemies.push(new Enemy(camRight + 200, 90, 'boss'));
        document.getElementById('bossBarContainer').classList.remove('hidden');
        sounds.playExplosion();
    }
}

// --- HUD & UI UPDATES ---
function updateHUD() {
    const hero = HEROES[player.heroIndex];
    document.getElementById('heroName').textContent = hero.name;
    document.getElementById('heroIcon').textContent = hero.icon;
    updateHUDBars();
}

function updateHUDBars() {
    const healthPercent = (player.hp / player.maxHp) * 100;
    document.getElementById('healthFill').style.width = `${healthPercent}%`;
    document.getElementById('healthText').textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

    const specialPercent = (player.specialMeter / 100) * 100;
    document.getElementById('specialFill').style.width = `${specialPercent}%`;
    document.getElementById('specialText').textContent = player.specialMeter >= 30 ? 'SPECIAL READY! (▲)' : 'CHARGING...';
}

function updateHUDScore() {
    document.getElementById('scoreVal').textContent = String(gameState.score).padStart(6, '0');
}

function updateBossHUD(hp, maxHp) {
    const pct = Math.max(0, (hp / maxHp) * 100);
    document.getElementById('bossHealthFill').style.width = `${pct}%`;
}

function addCombo() {
    gameState.currentCombo++;
    if (gameState.currentCombo > gameState.maxCombo) {
        gameState.maxCombo = gameState.currentCombo;
    }

    const banner = document.getElementById('comboBanner');
    const countEl = document.getElementById('comboCount');
    countEl.textContent = gameState.currentCombo;
    banner.classList.remove('hidden');

    clearTimeout(gameState.comboTimer);
    gameState.comboTimer = setTimeout(() => {
        banner.classList.add('hidden');
        gameState.currentCombo = 0;
    }, 2000);
}

function switchHero(index) {
    if (index >= 0 && index < HEROES.length && index !== player.heroIndex) {
        player.setHero(index);
        sounds.playSwitch();
        createSparkles(player.x, getScreenY(player.z, player.y) - 40, HEROES[index].color, 14);
        renderHeroDock();
    }
}

function switchHeroRelative(dir) {
    let nextIdx = (player.heroIndex + dir + HEROES.length) % HEROES.length;
    switchHero(nextIdx);
}

function renderHeroDock() {
    const container = document.getElementById('heroDockItems');
    container.innerHTML = '';
    HEROES.forEach((h, idx) => {
        const btn = document.createElement('div');
        btn.className = `dock-hero-btn ${idx === player.heroIndex ? 'active' : ''}`;
        btn.innerHTML = `${h.icon} <span class="num-badge">${idx + 1}</span>`;
        btn.onclick = () => switchHero(idx);
        container.appendChild(btn);
    });
}

function populateCharacterSelectScreen() {
    const grid = document.getElementById('charSelectGrid');
    grid.innerHTML = '';
    HEROES.forEach((h, idx) => {
        const card = document.createElement('div');
        card.className = `char-card ${idx === gameState.selectedHeroIndex ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="char-icon">${h.icon}</div>
            <div class="char-name">${h.name}</div>
            <div class="char-role">${h.role}</div>
        `;
        card.onclick = () => {
            gameState.selectedHeroIndex = idx;
            document.querySelectorAll('.char-card').forEach((c, i) => {
                c.classList.toggle('selected', i === idx);
            });
        };
        grid.appendChild(card);
    });
}

// --- GAME OVER & VICTORY ---
function triggerGameOver() {
    gameState.running = false;
    document.getElementById('endTitle').textContent = 'GAME OVER';
    document.getElementById('endSubtitle').textContent = 'ניו יורק נפלה בידי האויבים!';
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalKills').textContent = gameState.kills;
    document.getElementById('finalMaxCombo').textContent = gameState.maxCombo;
    document.getElementById('gameOverOverlay').classList.remove('hidden');
}

function triggerVictory() {
    gameState.running = false;
    document.getElementById('endTitle').textContent = 'VICTORY!';
    document.getElementById('endSubtitle').textContent = 'הנוקמים הצילו את ניו יורק!';
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalKills').textContent = gameState.kills;
    document.getElementById('finalMaxCombo').textContent = gameState.maxCombo;
    document.getElementById('gameOverOverlay').classList.remove('hidden');
}

// --- MAIN LOOP ---
let lastSpawnTime = 0;

function gameLoop(timestamp) {
    // Always render environment & particles
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    drawNYCBackground();

    if (gameState.running) {
        if (timestamp - lastSpawnTime > 4000 && enemies.filter(e => e.alive).length < 5) {
            spawnEnemyWave();
            lastSpawnTime = timestamp;
        }

        player.update();
        enemies.forEach(e => e.update());
    }

    updateParticles();

    // Render depth sorted objects
    const renderQueue = [player, ...enemies.filter(e => e.alive)];
    renderQueue.sort((a, b) => a.z - b.z);
    renderQueue.forEach(obj => obj.draw());

    drawParticles();
    requestAnimationFrame(gameLoop);
}

// --- INITIALIZATION ---
document.getElementById('btnStartGame').addEventListener('click', () => {
    sounds.init();
    gameState.selectedHeroIndex = gameState.selectedHeroIndex || 0;
    player.setHero(gameState.selectedHeroIndex);
    player.reset();
    gameState.running = true;
    gameState.score = 0;
    gameState.kills = 0;
    gameState.cameraX = 0;
    gameState.bossSpawned = false;
    enemies = [];
    document.getElementById('startOverlay').classList.add('hidden');
    spawnEnemyWave();
});

document.getElementById('btnRestart').addEventListener('click', () => {
    document.getElementById('gameOverOverlay').classList.add('hidden');
    document.getElementById('startOverlay').classList.remove('hidden');
});

document.getElementById('btnControllerHelp').addEventListener('click', () => {
    document.getElementById('modalGamepadHelp').classList.remove('hidden');
});

document.getElementById('btnCloseModal').addEventListener('click', () => {
    document.getElementById('modalGamepadHelp').classList.add('hidden');
});

document.getElementById('btnSoundToggle').addEventListener('click', () => {
    sounds.enabled = !sounds.enabled;
    document.getElementById('btnSoundToggle').textContent = sounds.enabled ? '🔊 צליל' : '🔇 מושתק';
});

// Setup Initial View
setupVirtualControls();
renderHeroDock();
populateCharacterSelectScreen();
requestAnimationFrame(gameLoop);
