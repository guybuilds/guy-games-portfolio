/**
 * Godzilla: 3D Rampage
 * Procedural 3D Engine with Three.js
 */

class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.ui = {
            startScreen: document.getElementById('start-screen'),
            startBtn: document.getElementById('start-btn'),
            chargeFill: document.getElementById('charge-fill'),
            scoreLabel: document.getElementById('score-counter'),
            upgradeMenu: document.getElementById('upgrade-menu'),
            gamepadIcon: document.getElementById('gamepad-status'),
            notifications: document.getElementById('hud-notifications'),
            canvas: document.getElementById('gameCanvas')
        };

        // Game State
        this.running = false;
        this.isPaused = false;
        this.score = 0;
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.gamepadIdx = null;
        this.lastNotifTime = 0;

        // Three.js Core
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);
        this.scene.fog = new THREE.FogExp2(0x050505, 0.002);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gameCanvas'),
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        // Godzilla State
        this.godzilla = {
            mesh: null,
            velocity: new THREE.Vector3(),
            speed: 0.5,
            rotation: 0,
            energy: 100,
            maxEnergy: 100,
            isFiring: false,
            grounded: true,
            laserMesh: null
        };

        this.upgrades = {
            damage: 1,
            recharge: 0.2,
            max_energy: 100,
            costs: { damage: 500, recharge: 500, max_energy: 1000 }
        };

        // World Objects
        this.buildings = [];
        this.collapsingBuildings = [];
        this.particles = [];
        this.enemies = []; 
        
        // Math Cache (Avoid GC thrashing)
        this._v1 = new THREE.Vector3();
        this._v2 = new THREE.Vector3();
        this._v3 = new THREE.Vector3();
        
        this.init();
    }

    init() {
        this.setupLights();
        this.createGround();
        this.createProceduralGodzilla();
        this.createCity();

        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'KeyU') this.toggleUpgradeMenu();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'Space') this.godzilla.isFiring = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (this.running && !this.isPaused) {
                // If using pointer lock
                if (document.pointerLockElement) {
                    this.mouse.x = e.movementX * 0.05;
                    this.mouse.y = e.movementY * 0.05;
                }
            }
        });

        window.addEventListener('gamepadconnected', (e) => {
            this.gamepadIdx = e.gamepad.index;
            this.ui.gamepadIcon.classList.add('active');
        });

        this.ui.startBtn.addEventListener('click', () => this.startGame());
        
        document.querySelectorAll('.upgrade-btn').forEach(btn => {
            btn.addEventListener('click', () => this.buyUpgrade(btn.dataset.type, btn));
        });
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffffff, 1.5);
        sun.position.set(100, 200, 100);
        sun.castShadow = true;
        this.scene.add(sun);
    }

    createGround() {
        const geometry = new THREE.PlaneGeometry(10000, 10000);
        const material = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Simple City Grid Lines
        const grid = new THREE.GridHelper(10000, 100, 0x00f0ff, 0x222222);
        this.scene.add(grid);
    }

    createProceduralGodzilla() {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const neonMat = new THREE.MeshStandardMaterial({ 
            color: 0x00f0ff, 
            emissive: 0x00f0ff,
            emissiveIntensity: 2
        });

        // 1. Body (Blocky)
        const body = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 4), mat);
        body.position.y = 4;
        body.castShadow = true;
        group.add(body);

        // 2. Legs
        const legR = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4, 2), mat);
        legR.position.set(2, 2, 0);
        group.add(legR);

        const legL = legR.clone();
        legL.position.x = -2;
        group.add(legL);

        // 3. Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), mat);
        head.position.set(0, 8, 2);
        group.add(head);

        // 4. Tail
        for(let i=0; i<6; i++) {
            const segment = new THREE.Mesh(new THREE.BoxGeometry(3 - i*0.4, 2, 3 - i*0.4), mat);
            segment.position.set(0, 2, -3 - i*2);
            group.add(segment);
        }

        // 5. Glowing Plates
        for(let i=0; i<5; i++) {
            const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 1.5), neonMat);
            plate.position.set(0, 9 - i, -2);
            group.add(plate);
        }

        group.position.set(0, 0, 0);
        this.scene.add(group);
        this.godzilla.mesh = group;

        // Laser Beam (Hidden initially)
        const laserGeom = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
        const laserMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        this.godzilla.laserMesh = new THREE.Mesh(laserGeom, laserMat);
        this.godzilla.laserMesh.rotation.x = Math.PI / 2;
        this.godzilla.laserMesh.visible = false;
        this.scene.add(this.godzilla.laserMesh);
    }

    createCity() {
        const buildingGeom = new THREE.BoxGeometry(1, 1, 1);
        for (let i = 0; i < 400; i++) {
            const h = 10 + Math.random() * 50;
            const mat = new THREE.MeshStandardMaterial({ 
                color: 0x111111,
                emissive: 0x002233,
                emissiveIntensity: Math.random() * 0.5
            });
            const b = new THREE.Mesh(buildingGeom, mat);
            
            // Grid layout
            const gridX = (Math.floor(Math.random() * 20) - 10) * 40;
            const gridZ = (Math.floor(Math.random() * 20) - 10) * 40;
            
            b.scale.set(15, h, 15);
            b.position.set(gridX, h/2, gridZ);
            b.castShadow = true;
            b.receiveShadow = true;
            this.scene.add(b);
            this.buildings.push(b);
        }
    }

    startGame() {
        if (this.running) return; // Already running
        this.ui.startScreen.classList.remove('show');
        this.running = true;
        
        // Request Pointer Lock on start
        this.ui.canvas.requestPointerLock();
        
        this.lastTime = performance.now();
        this.loop();
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    toggleUpgradeMenu() {
        this.isPaused = !this.isPaused;
        this.ui.upgradeMenu.classList.toggle('show');
    }

    buyUpgrade(type, btn) {
        const cost = this.upgrades.costs[type];
        if (this.score >= cost) {
            this.score -= cost;
            if (type === 'damage') this.upgrades.damage += 0.5;
            if (type === 'recharge') this.upgrades.recharge += 0.1;
            if (type === 'max_energy') this.godzilla.maxEnergy += 50;
            this.upgrades.costs[type] = Math.floor(cost * 1.8);
            btn.textContent = `UPGRADED! (${this.upgrades.costs[type]} pts)`;
            this.updateHUD();
        }
    }

    handleGamepad() {
        if (this.gamepadIdx === null) return;
        const gp = navigator.getGamepads()[this.gamepadIdx];
        if (!gp) return;

        const g = this.godzilla;
        const moveSpeed = 0.8;

        // Stick L: Move & Rotate
        if (Math.abs(gp.axes[0]) > 0.2) g.rotation -= gp.axes[0] * 0.05;
        
        const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation);
        if (gp.axes[1] < -0.2) g.mesh.position.add(dir.multiplyScalar(moveSpeed * Math.abs(gp.axes[1])));
        if (gp.axes[1] > 0.2) g.mesh.position.sub(dir.multiplyScalar(moveSpeed * Math.abs(gp.axes[1])));

        // Button A (0): Jump / Glide
        if (gp.buttons[0].pressed) this.keys['ShiftLeft'] = true;
        else if (!this.keys['Shift_Real']) this.keys['ShiftLeft'] = false;

        // RT / X (7/2): Fire
        if (gp.buttons[7].pressed || gp.buttons[2].pressed) this.keys['Space'] = true;
        else if (!this.keys['Space_Real']) this.keys['Space'] = false;
    }

    handleInput() {
        const g = this.godzilla;
        const moveSpeed = 0.8;

        this.handleGamepad();
        
        // Rotation based on keys
        if (this.keys['KeyA']) g.rotation += 0.05;
        if (this.keys['KeyD']) g.rotation -= 0.05;

        // Forward/Backward
        const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation);
        if (this.keys['KeyW']) g.mesh.position.add(dir.multiplyScalar(moveSpeed));
        if (this.keys['KeyS']) g.mesh.position.sub(dir.multiplyScalar(moveSpeed));

        this.checkPhysicalCollisions();

        g.mesh.rotation.y = g.rotation;

        // Fire
        if (this.keys['Space'] && g.energy > 0) {
            g.isFiring = true;
            g.energy -= 1.0;
            this.updateLaser();
        } else {
            g.isFiring = false;
            g.laserMesh.visible = false;
            if (g.energy < g.maxEnergy) g.energy += this.upgrades.recharge;
        }

        // Jump & Glide
        if (this.keys['ShiftLeft']) {
            if (g.grounded) {
                g.velocity.y = 1.5;
                g.grounded = false;
            } else if (g.velocity.y < 0) {
                // Gliding
                g.velocity.y = -0.1; // Hold in air
            }
        }

        // Gravity
        if (!g.grounded) {
            g.velocity.y -= (this.keys['ShiftLeft'] && g.velocity.y < 0) ? 0.01 : 0.05; // Less gravity on glide
            g.mesh.position.y += g.velocity.y;
            if (g.mesh.position.y <= 0) {
                g.mesh.position.y = 0;
                g.grounded = true;
                g.velocity.y = 0;
            }
        }
    }

    updateLaser() {
        const g = this.godzilla;
        const mouthPos = this._v1.set(0, 8, 4).applyMatrix4(g.mesh.matrixWorld);
        const forward = this._v2.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation);
        
        g.laserMesh.visible = true;
        g.laserMesh.scale.set(4, 2000, 4);
        
        // Use pre-allocated _v3 for beam placement
        const beamCenter = this._v3.copy(mouthPos).add(forward.clone().multiplyScalar(1000));
        g.laserMesh.position.copy(beamCenter);
        g.laserMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), forward);
        
        // Efficient Destruction Logic
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            const b = this.buildings[i];
            const dist = b.position.distanceTo(g.mesh.position);
            
            if (dist < 400) {
                // Direction to building using cache
                const toBuilding = this._v3.copy(b.position).sub(mouthPos).normalize();
                if (toBuilding.dot(forward) > 0.85) {
                    this.destroyBuilding(b, i);
                }
            }
        }
    }

    checkPhysicalCollisions() {
        const g = this.godzilla;
        const gPos = g.mesh.position;
        const radius = 6; // Godzilla's footprint size

        for (let i = this.buildings.length - 1; i >= 0; i--) {
            const b = this.buildings[i];
            // Simple bound check (each building is roughly 15x15)
            const dx = Math.abs(b.position.x - gPos.x);
            const dz = Math.abs(b.position.z - gPos.z);
            
            if (dx < 10 && dz < 10) {
                this.destroyBuilding(b, i);
            }
        }
    }

    destroyBuilding(b, index) {
        this.score += 25;
        this.spawnExplosion(b.position, 0x444444, 20); // Dust
        this.spawnExplosion(b.position, 0xffaa00, 10); // Sparks
        
        // Move to collapsing state
        b.userData.collapseSpeed = 0.2 + Math.random() * 0.5;
        this.collapsingBuildings.push(b);
        this.buildings.splice(index, 1);
        
        // Throttled Notification
        const now = Date.now();
        if (now - this.lastNotifTime > 600) {
            this.showNotification("BUILDING DESTROYED +25");
            this.lastNotifTime = now;
        }
    }

    spawnExplosion(pos, color, count) {
        for (let i = 0; i < count; i++) {
            const size = 0.2 + Math.random() * 2;
            const geom = new THREE.BoxGeometry(size, size, size);
            const mat = new THREE.MeshStandardMaterial({ 
                color: color,
                emissive: color,
                emissiveIntensity: 0.5
            });
            const p = new THREE.Mesh(geom, mat);
            
            p.position.copy(pos);
            p.position.y += Math.random() * 20;
            p.position.x += (Math.random() - 0.5) * 15;
            p.position.z += (Math.random() - 0.5) * 15;
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            );
            
            this.scene.add(p);
            this.particles.push({
                mesh: p,
                velocity: velocity,
                life: 1.0,
                decay: 0.01 + Math.random() * 0.02
            });
        }
    }

    showNotification(text) {
        // Limit total notifications to avoid "whatsapp" spam
        if (this.ui.notifications.children.length > 2) {
            this.ui.notifications.removeChild(this.ui.notifications.firstChild);
        }

        const div = document.createElement('div');
        div.className = 'notification';
        div.textContent = text;
        this.ui.notifications.appendChild(div);
        setTimeout(() => div.remove(), 2000);
    }

    updateBuildingsAndParticles() {
        // Collapsible buildings
        for (let i = this.collapsingBuildings.length - 1; i >= 0; i--) {
            const b = this.collapsingBuildings[i];
            b.position.y -= b.userData.collapseSpeed;
            b.scale.x *= 0.99;
            b.scale.z *= 0.99;
            
            if (b.position.y < -50) {
                this.scene.remove(b);
                if (b.geometry) b.geometry.dispose();
                if (b.material) b.material.dispose();
                this.collapsingBuildings.splice(i, 1);
            }
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.mesh.position.add(p.velocity);
            p.velocity.y -= 0.05; // Gravity
            p.life -= p.decay;
            p.mesh.scale.setScalar(p.life);
            
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                if (p.mesh.geometry) p.mesh.geometry.dispose();
                if (p.mesh.material) p.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    updateHUD() {
        this.ui.scoreLabel.textContent = Math.floor(this.score);
        this.ui.chargeFill.style.width = (this.godzilla.energy / this.godzilla.maxEnergy * 100) + '%';
    }

    updateCamera() {
        const g = this.godzilla.mesh;
        
        // Use mouse x for rotation (Yaw)
        // Note: For full free look, you'd use pointer lock delta
        this.godzilla.rotation -= this.mouse.x * 0.05;
        this.mouse.x = 0; // Reset delta/accumulation if naive

        const relativeCameraOffset = new THREE.Vector3(0, 15, -40);
        const cameraOffset = relativeCameraOffset.applyMatrix4(g.matrixWorld);
        
        this.camera.position.lerp(cameraOffset, 0.1);
        this.camera.lookAt(g.position.clone().add(new THREE.Vector3(0, 10, 0)));
    }

    loop() {
        if (!this.running) return;
        if (!this.isPaused) {
            this.handleInput();
            this.updateCamera();
            this.updateHUD();
            this.updateBuildingsAndParticles();
        }
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.loop());
    }
}

new Game();
