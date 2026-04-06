// LEGO Marvel - Web Edition (Direct File Version)
(function() {
    if (typeof THREE === 'undefined') {
        alert('שגיאה: לא ניתן לטעון את ספריית Three.js. בדוק את החיבור לאינטרנט.');
        return;
    }

    let scene, camera, renderer, clock;
    let ironMan, hulk, captainAmerica, thor, thanos, godzilla, captainMarvel;
    let p1Char = 'IRON_MAN';
    let p2Char = 'HULK';
    let characters = {};
    const charNames = ['IRON_MAN', 'HULK', 'CAPTAIN_AMERICA', 'THOR', 'THANOS', 'GODZILLA', 'CAPTAIN_MARVEL'];
    let bricks = [];
    let obstacles = [];
    let score = 0;
    let keys = {};
    let abilities = { laser: null, smash: null };
    let isCooldown = false;
    let gamepadIndex = null;
    let lastGamepadButtons = [];

    function init() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 10, 20);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        document.body.appendChild(renderer.domElement);

        clock = new THREE.Clock();

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(20, 50, 20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        scene.add(dirLight);

        // Floor (LEGO Green Board)
        const floorGeo = new THREE.PlaneGeometry(200, 200);
        const floorMat = new THREE.MeshPhongMaterial({ color: 0x3d8e3d, side: THREE.DoubleSide });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        // Grid (Small blocks look)
        const grid = new THREE.GridHelper(200, 40, 0x000000, 0x000000);
        grid.material.transparent = true;
        grid.material.opacity = 0.1;
        grid.position.y = 0.01;
        scene.add(grid);

        // Build Characters
        ironMan = buildIronMan();
        hulk = buildHulk();
        captainAmerica = buildCaptainAmerica();
        thor = buildThor();
        thanos = buildThanos();
        godzilla = buildGodzilla();
        captainMarvel = buildCaptainMarvel();
        
        scene.add(ironMan, hulk, captainAmerica, thor, thanos, godzilla, captainMarvel);
        
        // All visible!
        [ironMan, hulk, captainAmerica, thor, thanos, godzilla, captainMarvel].forEach(m => m.visible = true);
        
        // Start them apart
        ironMan.position.set(0, 0, 0);
        hulk.position.set(4, 0, 0);
        captainAmerica.position.set(-4, 0, 0);
        thor.position.set(0, 0, -4);
        thanos.position.set(4, 0, -4);
        godzilla.position.set(-4, 0, -4);
        captainMarvel.position.set(0, 0, 4);

        characters = {
            'IRON_MAN': { mesh: ironMan, speed: 0.25, jump: 0.25, gravity: 0.008, yVel: 0, name: "איירון מן" },
            'HULK': { mesh: hulk, speed: 0.18, jump: 0.45, gravity: 0.015, yVel: 0, name: "ענק ירוק" },
            'CAPTAIN_AMERICA': { mesh: captainAmerica, speed: 0.22, jump: 0.25, gravity: 0.008, yVel: 0, name: "קפטן אמריקה" },
            'THOR': { mesh: thor, speed: 0.20, jump: 0.25, gravity: 0.008, yVel: 0, name: "ת'ור" },
            'THANOS': { mesh: thanos, speed: 0.15, jump: 0.20, gravity: 0.015, yVel: 0, name: "תאנוס" },
            'GODZILLA': { mesh: godzilla, speed: 0.12, jump: 0.15, gravity: 0.02, yVel: 0, name: "גודזילה" },
            'CAPTAIN_MARVEL': { mesh: captainMarvel, speed: 0.28, jump: 0.35, gravity: 0.008, yVel: 0, name: "קפטן מרוול" }
        };

        spawnBricks();
        spawnObstacles();

        // Listeners
        window.addEventListener('resize', onResize);
        
        window.addEventListener('keydown', (e) => {
            keys[e.code] = true;
            if (e.code === 'KeyF') performAction(p1Char);
            if (e.code === 'Enter') performAction(p2Char);
        });
        window.addEventListener('keyup', (e) => keys[e.code] = false);
        
        document.getElementById('switch-char-btn').onclick = () => {
            const idx1 = charNames.indexOf(p1Char);
            p1Char = charNames[(idx1 + 1) % charNames.length];
            if (p1Char === p2Char) p1Char = charNames[(idx1 + 2) % charNames.length];
            updateUI();
        };

        const switch2 = document.createElement('button');
        switch2.className = 'switch-btn';
        switch2.textContent = 'החלף שחקן 2';
        switch2.style.marginRight = '10px';
        switch2.onclick = () => {
            const idx2 = charNames.indexOf(p2Char);
            p2Char = charNames[(idx2 + 1) % charNames.length];
            if (p2Char === p1Char) p2Char = charNames[(idx2 + 2) % charNames.length];
            updateUI();
        };
        document.getElementById('char-info').appendChild(switch2);

        window.addEventListener("gamepadconnected", (e) => {
            console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                e.gamepad.index, e.gamepad.id,
                e.gamepad.buttons.length, e.gamepad.axes.length);
            updateUI();
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            console.log("Gamepad disconnected from index %d: %s",
                e.gamepad.index, e.gamepad.id);
            updateUI();
        });

        // Hide loading
        document.getElementById('loading').style.opacity = '0';
        setTimeout(() => document.getElementById('loading').style.display = 'none', 500);

        updateUI();
        animate();
    }

    function createBox(w, h, d, color) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshPhongMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    function buildIronMan() {
        const group = new THREE.Group();
        const torso = createBox(0.8, 1.2, 0.4, 0xaa0000);
        torso.position.y = 1.2; group.add(torso);
        const chest = createBox(0.4, 0.4, 0.1, 0xffcc00);
        chest.position.set(0, 1.4, 0.25); group.add(chest);
        const leftLeg = createBox(0.35, 0.8, 0.35, 0xaa0000);
        leftLeg.position.set(-0.25, 0.4, 0); group.add(leftLeg);
        const rightLeg = createBox(0.35, 0.8, 0.35, 0xaa0000);
        rightLeg.position.set(0.25, 0.4, 0); group.add(rightLeg);
        const head = createBox(0.6, 0.6, 0.6, 0xaa0000);
        head.position.y = 2.1; group.add(head);
        const face = createBox(0.4, 0.4, 0.1, 0xffcc00);
        face.position.set(0, 2.1, 0.3); group.add(face);
        return group;
    }

    function buildHulk() {
        const group = new THREE.Group();
        const torso = createBox(1.6, 2.0, 1.0, 0x008800);
        torso.position.y = 2.0; group.add(torso);
        const leftLeg = createBox(0.7, 1.0, 0.7, 0x008800);
        leftLeg.position.set(-0.5, 0.5, 0); group.add(leftLeg);
        const rightLeg = createBox(0.7, 1.0, 0.7, 0x008800);
        rightLeg.position.set(0.5, 0.5, 0); group.add(rightLeg);
        const pants = createBox(1.7, 0.6, 1.1, 0x550088);
        pants.position.y = 1.2; group.add(pants);
        const head = createBox(0.8, 0.8, 0.8, 0x008800);
        head.position.y = 3.4; group.add(head);
        const hair = createBox(0.9, 0.2, 0.9, 0x111111);
        hair.position.y = 3.8; group.add(hair);
        return group;
    }

    function buildCaptainAmerica() {
        const group = new THREE.Group();
        const torso = createBox(0.8, 1.2, 0.4, 0x0000aa);
        torso.position.y = 1.2; group.add(torso);
        const star = createBox(0.2, 0.2, 0.1, 0xffffff);
        star.position.set(0, 1.4, 0.25); group.add(star);
        const leftLeg = createBox(0.35, 0.8, 0.35, 0x0000aa);
        leftLeg.position.set(-0.25, 0.4, 0); group.add(leftLeg);
        const rightLeg = createBox(0.35, 0.8, 0.35, 0x0000aa);
        rightLeg.position.set(0.25, 0.4, 0); group.add(rightLeg);
        const head = createBox(0.6, 0.6, 0.6, 0x0000aa);
        head.position.y = 2.1; group.add(head);
        const shield = createBox(0.8, 0.8, 0.1, 0xaa0000); 
        shield.position.set(-0.6, 1.2, 0.25); group.add(shield);
        return group;
    }

    function buildThor() {
        const group = new THREE.Group();
        const torso = createBox(1.0, 1.4, 0.6, 0x555555);
        torso.position.y = 1.4; group.add(torso);
        const cape = createBox(1.2, 1.5, 0.1, 0xaa0000);
        cape.position.set(0, 1.4, -0.35); group.add(cape);
        const leftLeg = createBox(0.4, 0.8, 0.4, 0x111111);
        leftLeg.position.set(-0.3, 0.4, 0); group.add(leftLeg);
        const rightLeg = createBox(0.4, 0.8, 0.4, 0x111111);
        rightLeg.position.set(0.3, 0.4, 0); group.add(rightLeg);
        const head = createBox(0.6, 0.6, 0.6, 0xffdbac);
        head.position.y = 2.4; group.add(head);
        const hair = createBox(0.7, 0.3, 0.7, 0xeeee00);
        hair.position.y = 2.85; group.add(hair);
        const hammer = createBox(0.4, 0.4, 0.6, 0x888888); 
        hammer.position.set(0.8, 1.4, 0.2); group.add(hammer);
        return group;
    }

    function buildThanos() {
        const group = new THREE.Group();
        const torso = createBox(1.1, 1.6, 0.7, 0x5500aa); 
        torso.position.y = 1.6; group.add(torso);
        const armor = createBox(1.2, 0.8, 0.8, 0xffcc00); 
        armor.position.y = 1.8; group.add(armor);
        const leftLeg = createBox(0.5, 1.0, 0.5, 0x5500aa);
        leftLeg.position.set(-0.35, 0.5, 0); group.add(leftLeg);
        const rightLeg = createBox(0.5, 1.0, 0.5, 0x5500aa);
        rightLeg.position.set(0.35, 0.5, 0); group.add(rightLeg);
        const head = createBox(0.8, 0.8, 0.8, 0x5500aa);
        head.position.y = 2.8; group.add(head);
        const helmet = createBox(0.9, 0.3, 0.9, 0xffcc00);
        helmet.position.y = 3.2; group.add(helmet);
        const gauntlet = createBox(0.5, 0.5, 0.5, 0xffcc00); 
        gauntlet.position.set(-0.8, 1.6, 0.2); group.add(gauntlet);
        const stone = createBox(0.1, 0.1, 0.1, 0xff0000);
        stone.position.set(-0.8, 1.8, 0.46); group.add(stone);
        return group;
    }

    function buildGodzilla() {
        const group = new THREE.Group();
        const torso = createBox(1.8, 3.0, 2.0, 0x2c3e50); 
        torso.position.y = 3.0; group.add(torso);
        const tail = createBox(0.8, 0.8, 3.0, 0x2c3e50);
        tail.position.set(0, 1.5, -2.5); group.add(tail);
        const lLeg = createBox(0.8, 1.5, 1.0, 0x2c3e50);
        lLeg.position.set(-0.7, 0.75, 0); group.add(lLeg);
        const rLeg = createBox(0.8, 1.5, 1.0, 0x2c3e50);
        rLeg.position.set(0.7, 0.75, 0); group.add(rLeg);
        const head = createBox(1.0, 1.0, 1.5, 0x2c3e50);
        head.position.set(0, 5.0, 0.5); group.add(head);
        const jaw = createBox(1.0, 0.4, 1.4, 0x2c3e50);
        jaw.position.set(0, 4.5, 0.5); group.add(jaw);
        for(let i=0; i<5; i++) {
            const spike = createBox(0.4, 0.6, 0.4, 0x34495e);
            spike.position.set(0, 3.5 + i*0.5, -1.0);
            group.add(spike);
        }
        return group;
    }

    function buildCaptainMarvel() {
        const group = new THREE.Group();
        // Torso (Dark Blue)
        const torso = createBox(0.8, 1.2, 0.4, 0x002244);
        torso.position.y = 1.2; group.add(torso);
        // Star (Gold)
        const star = createBox(0.3, 0.3, 0.1, 0xffcc00);
        star.position.set(0, 1.4, 0.25); group.add(star);
        // Legs (Red boots, Blue pants)
        const leftLeg = createBox(0.35, 0.8, 0.35, 0xaa0000);
        leftLeg.position.set(-0.25, 0.4, 0); group.add(leftLeg);
        const rightLeg = createBox(0.35, 0.8, 0.35, 0xaa0000);
        rightLeg.position.set(0.25, 0.4, 0); group.add(rightLeg);
        // Head
        const head = createBox(0.6, 0.6, 0.6, 0xffdbac);
        head.position.y = 2.1; group.add(head);
        // Hair (Blonde)
        const hair = createBox(0.7, 0.4, 0.7, 0xeeee00);
        hair.position.y = 2.5; group.add(hair);
        // Red Sash/Belt area
        const sash = createBox(0.85, 0.2, 0.45, 0xaa0000);
        sash.position.y = 0.9; group.add(sash);
        return group;
    }

    function buildObstacle(type, x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        group.userData = { type, hp: 1 };

        if (type === 'CRATE') {
            const body = createBox(1.2, 1.2, 1.2, 0x8b4513);
            body.position.y = 0.6;
            group.add(body);
            // Add some detail (straps)
            const strap1 = createBox(1.25, 0.2, 1.25, 0x5a2d0c);
            strap1.position.y = 0.6;
            group.add(strap1);
        } else if (type === 'BARREL') {
            const body = createBox(0.8, 1.2, 0.8, 0xbb5500);
            body.position.y = 0.6;
            group.add(body);
            const rim1 = createBox(0.85, 0.1, 0.85, 0x333333);
            rim1.position.y = 1.1;
            group.add(rim1);
            const rim2 = createBox(0.85, 0.1, 0.85, 0x333333);
            rim2.position.y = 0.1;
            group.add(rim2);
        } else if (type === 'HYDRANT') {
            const body = createBox(0.6, 1.0, 0.6, 0xcc0000);
            body.position.y = 0.5;
            group.add(body);
            const cap = createBox(0.4, 0.2, 0.4, 0xcc0000);
            cap.position.y = 1.0;
            group.add(cap);
        }

        scene.add(group);
        obstacles.push(group);
        return group;
    }

    function spawnObstacles() {
        for (let i = 0; i < 50; i++) {
            const types = ['CRATE', 'BARREL', 'HYDRANT'];
            const type = types[Math.floor(Math.random() * types.length)];
            const x = (Math.random() - 0.5) * 160;
            const z = (Math.random() - 0.5) * 160;
            // Don't spawn too close to center
            if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;
            buildObstacle(type, x, z);
        }
    }

    function explodeObstacle(pos) {
        // LEGO piece eruption!
        const particles = [];
        const colors = [0xff0000, 0x0000ff, 0xffff00, 0x00ff00, 0xffffff, 0x8b4513, 0xff7700];
        
        for (let i = 0; i < 50; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            // Vary the shapes/sizes of lego pieces
            const w = Math.random() > 0.5 ? 0.3 : 0.2;
            const h = Math.random() > 0.5 ? 0.15 : 0.3;
            const d = Math.random() > 0.5 ? 0.3 : 0.2;
            const p = createBox(w, h, d, color);
            p.position.copy(pos);
            p.position.y += 0.5;
            p.userData = {
                vel: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.6,
                    Math.random() * 0.7 + 0.3,
                    (Math.random() - 0.5) * 0.6
                ),
                life: 1.5,
                rotVel: new THREE.Vector3((Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3)
            };
            scene.add(p);
            particles.push(p);
        }

        const animateExplosion = () => {
            let active = false;
            particles.forEach((p, idx) => {
                if (p.userData.life <= 0) return;
                active = true;
                p.position.add(p.userData.vel);
                p.userData.vel.y -= 0.03; // Gravity
                p.rotation.x += p.userData.rotVel.x;
                p.rotation.y += p.userData.rotVel.y;
                p.userData.life -= 0.02;
                
                if (p.position.y < 0.1) {
                    p.position.y = 0.1;
                    p.userData.vel.set(0, 0, 0);
                    p.userData.rotVel.set(0, 0, 0);
                }
                
                if (p.userData.life < 0.5) {
                    p.scale.multiplyScalar(0.9);
                }
                
                if (p.userData.life <= 0) {
                    scene.remove(p);
                }
            });
            if (active) requestAnimationFrame(animateExplosion);
        };
        animateExplosion();
        playSmashSound();
    }

    function destroyObstacle(obs, index) {
        explodeObstacle(obs.position);
        scene.remove(obs);
        obstacles.splice(index, 1);
        score += 100;
        document.getElementById('bricks').textContent = score;
        // Maybe spawn it again far away or just keep it gone
    }

    function spawnBricks() {
        for(let i=0; i<300; i++) { // Denser bricks
            const color = [0xffd700, 0xffffff, 0xaaaaaa][Math.floor(Math.random()*3)]; // Gold, Silver, Bronze
            const brick = createBox(0.4, 0.4, 0.4, color);
            brick.position.set((Math.random()-0.5)*180, 0.2, (Math.random()-0.5)*180);
            scene.add(brick);
            bricks.push(brick);
        }
    }

    function playLaserSound() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    }

    function playSmashSound() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const bufferSize = audioCtx.sampleRate * 0.5;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, audioCtx.currentTime);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start();
    }

    function playThunderSound() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const bufferSize = audioCtx.sampleRate * 0.8;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass';
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start();
    }

    function playCollectSound() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    }

    function updateUI() {
        const p1Status = document.getElementById('active-char');
        const gps = navigator.getGamepads();
        const gp1 = gps[0] ? '🎮' : '⌨️';
        const gp2 = gps[1] ? '🎮' : '⌨️';
        p1Status.textContent = `שחקן 1 (${gp1}): ${characters[p1Char].name} | שחקן 2 (${gp2}): ${characters[p2Char].name}`;
        const gpStatus = document.getElementById('gamepad-status');
        const connectedCount = gps.filter(g => g).length;
        if (connectedCount > 0) {
            gpStatus.textContent = `🎮 ${connectedCount} שלטים מחוברים`;
            gpStatus.style.color = '#00ff00';
        } else {
            gpStatus.textContent = '🎮 שלטים לא מחוברים';
            gpStatus.style.color = '#ff3333';
        }
    }

    function createCollectEffect(pos) {
        const particles = [];
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.1, 0.02, 16, 50),
            new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.8 })
        );
        ring.position.copy(pos);
        ring.rotation.x = Math.PI / 2;
        scene.add(ring);

        for (let i = 0; i < 15; i++) {
            const color = [0xffcc00, 0xffffff, 0x00ccff][Math.floor(Math.random()*3)];
            const p = createBox(0.15, 0.15, 0.15, color);
            p.position.copy(pos);
            p.userData = {
                vel: new THREE.Vector3((Math.random()-0.5)*0.3, Math.random()*0.3 + 0.1, (Math.random()-0.5)*0.3),
                life: 1.0,
                rotVel: (Math.random()-0.5)*0.2
            };
            scene.add(p);
            particles.push(p);
        }
        
        let ringScale = 1.0;
        const animateP = () => {
            ringScale += 0.2;
            ring.scale.set(ringScale, ringScale, 1);
            ring.material.opacity -= 0.05;
            if (ring.material.opacity <= 0) scene.remove(ring);

            particles.forEach((p, idx) => {
                p.position.add(p.userData.vel);
                p.userData.vel.y -= 0.01; // Gravity on particles
                p.rotation.x += p.userData.rotVel;
                p.rotation.y += p.userData.rotVel;
                p.userData.life -= 0.04;
                p.scale.multiplyScalar(0.96);
                if (p.userData.life <= 0) {
                    scene.remove(p);
                    particles.splice(idx, 1);
                }
            });
            if (particles.length > 0 || ring.parent) requestAnimationFrame(animateP);
        };
        animateP();
    }

    function createLightningBolt(targetPos) {
        const points = [];
        let curr = new THREE.Vector3(targetPos.x + (Math.random()-0.5)*15, 40, targetPos.z + (Math.random()-0.5)*15);
        points.push(curr.clone());
        while (curr.y > 0) {
            curr.y -= (Math.random() * 3 + 1.5);
            curr.x += (Math.random() - 0.5) * 4;
            curr.z += (Math.random() - 0.5) * 4;
            points.push(curr.clone());
        }
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
        const line = new THREE.Line(geo, mat);
        return line;
    }

    function performAction(charKey) {
        if (isCooldown) return;
        const charState = characters[charKey];
        const mesh = charState.mesh;
        const activeCharacter = charKey;

        if (activeCharacter === 'IRON_MAN') {
            if (abilities.laser) scene.remove(abilities.laser);
            const group = new THREE.Group();
            const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 25), new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.9 }));
            beam.rotation.x = Math.PI / 2; beam.position.set(0, 0, 12.5);
            group.add(beam);
            const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 25), new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 }));
            glow.rotation.x = Math.PI / 2; glow.position.set(0, 0, 12.5);
            group.add(glow);
            mesh.add(group); group.position.set(0, 1.5, 0.5);
            abilities.laser = group; playLaserSound();
            setTimeout(() => { mesh.remove(group); abilities.laser = null; }, 400);
        } else if (activeCharacter === 'HULK') {
            playSmashSound();
            const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.05, 16, 100), new THREE.MeshBasicMaterial({ color: 0x550088 }));
            ring.rotation.x = Math.PI / 2; ring.position.copy(mesh.position);
            scene.add(ring); abilities.smash = ring;
            setTimeout(() => { scene.remove(ring); abilities.smash = null; }, 300);
        } else if (activeCharacter === 'THOR') {
            playThunderSound();
            const bolts = [];
            for(let k=0; k<15; k++) {
                const bolt = createLightningBolt(mesh.position);
                scene.add(bolt); bolts.push(bolt);
            }
            setTimeout(() => bolts.forEach(b => scene.remove(b)), 300);
        } else if (activeCharacter === 'THANOS') {
            isCooldown = true;
            const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.5, 16, 100), new THREE.MeshBasicMaterial({ color: 0xaa00ff }));
            ring.rotation.x = Math.PI / 2; ring.position.copy(mesh.position);
            scene.add(ring); abilities.smash = ring;
            let count = 0;
            bricks.forEach((b, i) => {
                if (Math.random() > 0.5) {
                    setTimeout(() => { scene.remove(b); bricks.splice(i, 1); score += 50; document.getElementById('bricks').textContent = score; }, count * 50);
                    count++;
                }
            });
            setTimeout(() => { scene.remove(ring); abilities.smash = null; isCooldown = false; }, 1000);
        } else if (activeCharacter === 'GODZILLA') {
            // Hot Red/Orange Atomic Breath
            const beam = new THREE.Group();
            const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1.2, 30), new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.9 }));
            b1.rotation.x = Math.PI / 2; b1.position.z = 15; beam.add(b1);
            const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.4, 30), new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 1.0 }));
            b2.rotation.x = Math.PI / 2; b2.position.z = 15; beam.add(b2);
            mesh.add(beam); beam.position.set(0, 5.0, 1.0);
            abilities.laser = beam; playThunderSound();
            setTimeout(() => { mesh.remove(beam); abilities.laser = null; }, 1200);
            isCooldown = true; setTimeout(() => isCooldown = false, 2000);
        } else if (activeCharacter === 'CAPTAIN_MARVEL') {
            // Photon Blast
            const beam = new THREE.Group();
            const core = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 30), new THREE.MeshBasicMaterial({ color: 0xffffff }));
            core.rotation.x = Math.PI / 2; core.position.z = 15; beam.add(core);
            const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 30), new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.5 }));
            glow.rotation.x = Math.PI / 2; glow.position.z = 15; beam.add(glow);
            mesh.add(beam); beam.position.set(0, 1.5, 0.5);
            abilities.laser = beam; playLaserSound();
            setTimeout(() => { mesh.remove(beam); abilities.laser = null; }, 500);
            isCooldown = true; setTimeout(() => isCooldown = false, 800);
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        const gps = navigator.getGamepads();
        const updatePlayer = (charKey, isP1) => {
            const pState = characters[charKey];
            const p = pState.mesh;
            let moveX = 0, moveZ = 0;
            const s = pState.speed * (keys[isP1 ? 'ShiftLeft' : 'ShiftRight'] ? 1.8 : 1.0);
            if (isP1) {
                if (keys['KeyW']) moveZ -= s; if (keys['KeyS']) moveZ += s;
                if (keys['KeyA']) moveX -= s; if (keys['KeyD']) moveX += s;
            } else {
                if (keys['ArrowUp']) moveZ -= s; if (keys['ArrowDown']) moveZ += s;
                if (keys['ArrowLeft']) moveX -= s; if (keys['ArrowRight']) moveX += s;
            }
            const gp = gps[isP1 ? 0 : 1];
            if (gp) {
                const dz = 0.15;
                if (Math.abs(gp.axes[0]) > dz) moveX += gp.axes[0] * s;
                if (Math.abs(gp.axes[1]) > dz) moveZ += gp.axes[1] * s;
                if (gp.buttons[0].pressed && p.position.y <= 0) pState.yVel = pState.jump;
                if (gp.buttons[1].pressed && !lastGamepadButtons[(isP1?0:1)*20 + 1]) performAction(charKey);
                const btns = gp.buttons.map(b => b.pressed);
                btns.forEach((b, i) => lastGamepadButtons[(isP1?0:1)*20 + i] = b);
            }
            p.position.x += moveX; p.position.z += moveZ;
            if (moveX !== 0 || moveZ !== 0) p.rotation.y = Math.atan2(moveX, moveZ);
            pState.yVel -= pState.gravity; p.position.y += pState.yVel;
            if (p.position.y <= 0) { p.position.y = 0; pState.yVel = 0; if (keys[isP1 ? 'Space' : 'ControlRight']) pState.yVel = pState.jump; }
        };
        updatePlayer(p1Char, true); updatePlayer(p2Char, false);
        charNames.forEach((key) => {
            if (key === p1Char || key === p2Char) return;
            const compState = characters[key]; const comp = compState.mesh;
            const targetPos = characters[p1Char].mesh.position.clone().add(new THREE.Vector3(-3, 0, 3));
            if (comp.position.distanceTo(targetPos) > 2) {
                const dir = new THREE.Vector3().subVectors(targetPos, comp.position).normalize();
                comp.position.x += dir.x * compState.speed; comp.position.z += dir.z * compState.speed;
                comp.rotation.y = Math.atan2(dir.x, dir.z);
            }
            compState.yVel -= compState.gravity; comp.position.y += compState.yVel;
            if (comp.position.y <= 0) { comp.position.y = 0; compState.yVel = 0; }
        });
        const p1Pos = characters[p1Char].mesh.position; const p2Pos = characters[p2Char].mesh.position;
        const midPoint = new THREE.Vector3().addVectors(p1Pos, p2Pos).multiplyScalar(0.5);
        const dist = p1Pos.distanceTo(p2Pos);
        const targetCamPos = midPoint.clone().add(new THREE.Vector3(0, Math.max(10, 10 + dist * 0.5), Math.max(20, 15 + dist * 0.8)));
        camera.position.lerp(targetCamPos, 0.1); camera.lookAt(midPoint);

        // Obstacle Destruction via collision/hitting
        obstacles.forEach((obs, i) => {
            charNames.forEach(key => {
                const charMesh = characters[key].mesh;
                const d = obs.position.distanceTo(charMesh.position);
                if (d < 2.5) { // Hit distance
                    destroyObstacle(obs, i);
                }
            });
        });

        // Laser/Ability collisions with obstacles
        if (abilities.laser) {
            obstacles.forEach((obs, i) => {
                // Approximate cylinder-point intersection for laser
                // Laser is at mesh position, pointing forward (rotation.y)
                // For simplicity, we can use distance and angle check or just check if it's "in front"
                // Let's use a simpler approach: check distance in a narrow cone or use actual raycasting if needed.
                // But since we have many characters, let's just check if it's within range and "looking at" it
                charNames.forEach(key => {
                    const char = characters[key];
                    if (char.mesh.children.includes(abilities.laser)) {
                        const dist = obs.position.distanceTo(char.mesh.position);
                        if (dist < 20) {
                            const toObs = obs.position.clone().sub(char.mesh.position).normalize();
                            const forward = new THREE.Vector3(Math.sin(char.mesh.rotation.y), 0, Math.cos(char.mesh.rotation.y));
                            const angle = forward.angleTo(toObs);
                            if (angle < 0.2) { // 0.2 radians is roughly 11 degrees
                                destroyObstacle(obs, i);
                            }
                        }
                    }
                });
            });
        }

        if (abilities.smash) {
            const smashPos = abilities.smash.position;
            const smashScale = abilities.smash.scale.x * 3; // ring radius
            obstacles.forEach((obs, i) => {
                if (obs.position.distanceTo(smashPos) < smashScale) {
                    destroyObstacle(obs, i);
                }
            });
        }

        bricks.forEach((b, i) => {
            let collected = false; charNames.forEach(key => { if (b.position.distanceTo(characters[key].mesh.position) < 2) collected = true; });
            if (collected) { 
                createCollectEffect(b.position);
                playCollectSound();
                scene.remove(b); bricks.splice(i, 1); score += 10; document.getElementById('bricks').textContent = score; 
                if (bricks.length < 100) spawnBricks(); 
            }
            b.rotation.y += 0.05;
        });
        if (abilities.smash) { abilities.smash.scale.addScalar(0.2); abilities.smash.material.opacity *= 0.95; }
        renderer.render(scene, camera);
    }
    function onResize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }
    init();
})();
