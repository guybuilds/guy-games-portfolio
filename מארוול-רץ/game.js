/**
 * STARK RUN 3D: Subway Surfer Style
 * Powered by Three.js
 */

let scene, camera, renderer, clock;
let player, obstacles = [], particles = [];
let currentLane = 0; // -1, 0, 1
let targetX = 0;
let isMovingLane = false;
let gameActive = false;
let score = 0;
let speed = 0.5;
let energy = 100;

// Constants
const LANE_WIDTH = 5;
const PLAYER_Y = 1.2;
const JUMP_FORCE = 0.5;
const GRAVITY = 0.02;

// UI Elements
const scoreVal = document.getElementById('score-val');
const energyFill = document.getElementById('energy-fill');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const finalScore = document.getElementById('final-score');

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050a14);
    scene.fog = new THREE.FogExp2(0x050a14, 0.015);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 6, 12);
    camera.lookAt(0, 2, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    setupLights();
    createFloor();
    createPlayer();
    
    window.addEventListener('resize', onWindowResize);
    setupInput();
}

function setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0x00d2ff, 1);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    scene.add(mainLight);

    // Add neon track lights
    const neonL = new THREE.PointLight(0xff0055, 2, 50);
    neonL.position.set(-10, 2, 0);
    scene.add(neonL);

    const neonR = new THREE.PointLight(0x00d2ff, 2, 50);
    neonR.position.set(10, 2, 0);
    scene.add(neonR);
}

function createFloor() {
    const floorGeo = new THREE.PlaneGeometry(20, 2000);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        roughness: 0.1, 
        metalness: 0.5 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Lane markers
    const grid = new THREE.GridHelper(2000, 400, 0x00ccff, 0x222222);
    grid.position.y = 0.05;
    scene.add(grid);
}

function createPlayer() {
    const group = new THREE.Group();
    
    // Body (Iron Man-esque)
    const bodyGeo = new THREE.BoxGeometry(1.2, 1.8, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xaa0000 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);

    // Arc Reactor
    const arcGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const arcMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
    const arc = new THREE.Mesh(arcGeo, arcMat);
    arc.position.set(0, 0.3, 0.45);
    group.add(arc);

    // Helmet
    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.y = 1.3;
    group.add(head);

    // Eyes
    const eyeGeo = new THREE.PlaneGeometry(0.5, 0.1);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 1.3, 0.41);
    group.add(eye);

    group.position.y = PLAYER_Y;
    scene.add(group);
    
    player = {
        mesh: group,
        vy: 0,
        isGrounded: true,
        lane: 0,
        sliding: false,
        slideTimer: 0
    };
}

function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3) - 1;
    const type = Math.random() > 0.3 ? 'barrier' : 'drone';
    
    let geo, mat;
    if (type === 'barrier') {
        geo = new THREE.BoxGeometry(4, 3, 2);
        mat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
    } else {
        geo = new THREE.SphereGeometry(1.5, 16, 16);
        mat = new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0xff0055 });
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(lane * LANE_WIDTH, type === 'barrier' ? 1.5 : 4, -200);
    mesh.castShadow = true;
    scene.add(mesh);
    
    obstacles.push({
        mesh,
        type,
        lane
    });
}

function setupInput() {
    window.addEventListener('keydown', (e) => {
        if (!gameActive) return;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveLane(-1);
        if (e.code === 'KeyD' || e.code === 'ArrowRight') moveLane(1);
        if (e.code === 'Space' || e.code === 'ArrowUp') jump();
        if (e.code === 'KeyS' || e.code === 'ArrowDown') slide();
    });

    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('restart-btn').onclick = startGame;
}

function moveLane(dir) {
    const newLane = Math.max(-1, Math.min(1, player.lane + dir));
    if (newLane !== player.lane) {
        player.lane = newLane;
        targetX = player.lane * LANE_WIDTH;
    }
}

function jump() {
    if (player.isGrounded) {
        player.vy = JUMP_FORCE;
        player.isGrounded = false;
    }
}

function slide() {
    if (player.isGrounded && !player.sliding) {
        player.sliding = true;
        player.slideTimer = 40;
        player.mesh.scale.y = 0.5;
        player.mesh.position.y = PLAYER_Y / 2;
    }
}

function updateGamepad() {
    const gamepads = navigator.getGamepads();
    if (!gamepads[0]) return;

    const gp = gamepads[0];
    
    // D-Pad or Left Stick for lane switching
    if (gp.axes[0] < -0.5 || gp.buttons[14].pressed) {
        if (!gp.lanePressed) { moveLane(-1); gp.lanePressed = true; }
    } else if (gp.axes[0] > 0.5 || gp.buttons[15].pressed) {
        if (!gp.lanePressed) { moveLane(1); gp.lanePressed = true; }
    } else {
        gp.lanePressed = false;
    }

    // Buttons
    if (gp.buttons[0].pressed) jump(); // A or X
    if (gp.buttons[1].pressed) slide(); // B or Circle
}

function update() {
    if (!gameActive) return;

    updateGamepad();

    // Smooth lane transition
    player.mesh.position.x = THREE.MathUtils.lerp(player.mesh.position.x, targetX, 0.2);

    // Jump physics
    if (!player.isGrounded) {
        player.vy -= GRAVITY;
        player.mesh.position.y += player.vy;
        if (player.mesh.position.y <= PLAYER_Y) {
            player.mesh.position.y = PLAYER_Y;
            player.vy = 0;
            player.isGrounded = true;
        }
    }

    // Slide logic
    if (player.sliding) {
        player.slideTimer--;
        if (player.slideTimer <= 0) {
            player.sliding = false;
            player.mesh.scale.y = 1;
            player.mesh.position.y = PLAYER_Y;
        }
    }

    // Move and spawn obstacles
    if (Math.random() < 0.02) spawnObstacle();

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.mesh.position.z += speed;
        
        // Collision check
        const distZ = Math.abs(obs.mesh.position.z - player.mesh.position.z);
        if (distZ < 1.5 && obs.lane === player.lane) {
            // Check Y collision
            const playerTop = player.mesh.position.y + (player.sliding ? 0.5 : 1);
            const playerBottom = player.mesh.position.y - 1;
            const obsTop = obs.mesh.position.y + (obs.type === 'barrier' ? 1.5 : 1);
            const obsBottom = obs.mesh.position.y - (obs.type === 'barrier' ? 1.5 : 1);

            if (!(playerTop < obsBottom || playerBottom > obsTop)) {
                endGame();
            }
        }

        if (obs.mesh.position.z > 20) {
            scene.remove(obs.mesh);
            obstacles.splice(i, 1);
            score += 10;
        }
    }

    score++;
    speed += 0.0001;
    scoreVal.innerText = score.toString().padStart(6, '0');
}

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function startGame() {
    gameActive = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    score = 0;
    speed = 0.8;
    
    // Reset obstacles
    obstacles.forEach(o => scene.remove(o.mesh));
    obstacles = [];
    
    player.lane = 0;
    player.mesh.position.set(0, PLAYER_Y, 0);
    targetX = 0;
}

function endGame() {
    gameActive = false;
    gameOverScreen.classList.remove('hidden');
    finalScore.innerText = score;
}

init();
animate();
