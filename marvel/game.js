// LEGO Marvel - Web Edition (Direct File Version)
(function() {
    if (typeof THREE === 'undefined') {
        alert('שגיאה: לא ניתן לטעון את ספריית Three.js. בדוק את החיבור לאינטרנט.');
        return;
    }

    let scene, camera, renderer, clock;
    let ironMan, hulk, captainAmerica, thor, thanos, godzilla, captainMarvel;
    let p1Char = 'HULK';
    let p2Char = 'IRON_MAN';
    let characters = {};
    const charNames = ['IRON_MAN', 'HULK', 'CAPTAIN_AMERICA', 'THOR', 'THANOS', 'GODZILLA', 'CAPTAIN_MARVEL'];
    let bricks = [];
    let obstacles = [];
    let enemies = [];
    let score = 0;
    let ultronBoss = null;
    let ultronScale = 1.0;
    let ultronTargetScale = 1.0;
    let hulkScale = 5.0; // Current scale
    let hulkTargetScale = 5.0; // Target to lerp towards
    let keys = {};
    let abilities = { laser: null, smash: null };
    let isCooldown = false;
    let gamepadIndex = null;
    let lastGamepadButtons = [];
    let mobileInput = { x: 0, z: 0, jump: false, special: false };
    let joystickActive = false;
    let joystickStart = { x: 0, y: 0 };
    let legionMode = false;
    let crowns = {};
    let stars = null;
    let cameraShake = 0;
    let growthHoldTime = 0;
    let hulkExtremeUnlocked = false;
    let isShowingConfirm = false;

    function init() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x7dd3fc); // Brighter Sky Blue
        scene.fog = new THREE.FogExp2(0x7dd3fc, 0.002); // Add depth with fog

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 10, 20);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
        document.body.appendChild(renderer.domElement);

        clock = new THREE.Clock();

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Brighter
        scene.add(ambientLight);
        
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xfffae6, 1.2); // Warm Sunlight
        dirLight.position.set(100, 200, 100);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.left = -200;
        dirLight.shadow.camera.right = 200;
        dirLight.shadow.camera.top = 200;
        dirLight.shadow.camera.bottom = -200;
        scene.add(dirLight);

        // Floor (Much larger cityscape)
        const floorGeo = new THREE.PlaneGeometry(10000, 10000, 20, 20);
        // Add a slight curvature to the floor for Earth effect
        const pos = floorGeo.attributes.position;
        for(let i=0; i<pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const dist = Math.sqrt(x*x + z*z);
            pos.setY(i, -Math.pow(dist, 2) * 0.0001); // Subtle curve
        }
        
        const floorMat = new THREE.MeshPhongMaterial({ color: 0x334155, side: THREE.DoubleSide });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        // City Buildings
        buildCity();
        
        // Trees
        buildTrees();

        // Grid (Asphalt lines look)
        const grid = new THREE.GridHelper(2000, 100, 0x1e293b, 0x1e293b);
        grid.position.y = 0.05;
        scene.add(grid);

        // Clouds
        spawnClouds();
        
        // Stars (Initial invisible)
        spawnStars();

        // Build Characters
        ironMan = buildIronMan();
        hulk = buildHulk();
        hulk.scale.set(hulkScale, hulkScale, hulkScale);
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
            'HULK': { mesh: hulk, speed: 0.18, jump: 0.45, gravity: 0.015, yVel: 0, name: "ענק ירוק", baseSpeed: 0.18, baseJump: 0.45 },
            'CAPTAIN_AMERICA': { mesh: captainAmerica, speed: 0.22, jump: 0.25, gravity: 0.008, yVel: 0, name: "קפטן אמריקה" },
            'THOR': { mesh: thor, speed: 0.20, jump: 0.25, gravity: 0.008, yVel: 0, name: "ת'ור" },
            'THANOS': { mesh: thanos, speed: 0.15, jump: 0.20, gravity: 0.015, yVel: 0, name: "תאנוס" },
            'GODZILLA': { mesh: godzilla, speed: 0.12, jump: 0.15, gravity: 0.02, yVel: 0, name: "גודזילה" },
            'CAPTAIN_MARVEL': { mesh: captainMarvel, speed: 0.28, jump: 0.35, gravity: 0.008, yVel: 0, name: "קפטן מרוול" }
        };

        spawnBricks();
        spawnEnemies();
        spawnUltron();

        // Listeners
        window.addEventListener('resize', onResize);
        
        window.addEventListener('keydown', (e) => {
            keys[e.code] = true;
            // Digit toggles and actions
            if (e.code === 'KeyF') performAction(p1Char);
            if (e.code === 'Enter') performAction(p2Char);
            if (e.code === 'Digit1') toggleLegionMode();
        });
        window.addEventListener('keyup', (e) => keys[e.code] = false);
        
        document.getElementById('switch-char-btn').onclick = () => {
            const idx1 = charNames.indexOf(p1Char);
            p1Char = charNames[(idx1 + 1) % charNames.length];
            if (p1Char === p2Char) p1Char = charNames[(idx1 + 2) % charNames.length];
            updateUI();
        };

        const btnLegion = document.getElementById('btn-legion');
        if (btnLegion) btnLegion.onclick = toggleLegionMode;

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
        onResize(); // Force a resize check to ensure canvas is correct size

        // Mobile Controls Initialization
        initMobileControls();

        animate();
    }

    function initMobileControls() {
        const joystickZone = document.getElementById('joystick-zone');
        const joystickKnob = document.getElementById('joystick-knob');
        const btnJump = document.getElementById('btn-jump');
        const btnSpecial = document.getElementById('btn-special');
        const btnSwitch = document.getElementById('btn-switch');

        if (!joystickZone) return;

        const maxRadius = 60;

        const handlePointerMove = (e) => {
            if (!joystickActive) return;

            let dx = e.clientX - joystickStart.x;
            let dy = e.clientY - joystickStart.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > maxRadius) {
                dx *= maxRadius / dist;
                dy *= maxRadius / dist;
            }

            joystickKnob.style.left = `${joystickStart.x + dx}px`;
            joystickKnob.style.top = `${joystickStart.y + dy}px`;
            
            mobileInput.x = dx / maxRadius;
            mobileInput.z = dy / maxRadius;
        };

        const handlePointerUp = () => {
            joystickActive = false;
            joystickKnob.style.display = 'none';
            mobileInput.x = 0;
            mobileInput.z = 0;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        joystickZone.addEventListener('pointerdown', (e) => {
            // Support both touch and mouse in DevTools
            joystickActive = true;
            joystickStart = { x: e.clientX, y: e.clientY };
            
            joystickKnob.style.display = 'block';
            joystickKnob.style.left = `${joystickStart.x}px`;
            joystickKnob.style.top = `${joystickStart.y}px`;
            
            mobileInput.x = 0;
            mobileInput.z = 0;

            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        });

        // Action Buttons - use both pointer and touch just in case
        const setupButton = (btn, actionDown, actionUp) => {
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                actionDown();
            });
            if (actionUp) {
                btn.addEventListener('pointerup', actionUp);
                btn.addEventListener('pointerleave', actionUp);
            }
        };

        setupButton(btnJump, () => mobileInput.jump = true, () => mobileInput.jump = false);
        setupButton(btnSpecial, () => performAction(p1Char));
        setupButton(btnSwitch, () => {
            const idx1 = charNames.indexOf(p1Char);
            p1Char = charNames[(idx1 + 1) % charNames.length];
            if (p1Char === p2Char) p1Char = charNames[(idx1 + 2) % charNames.length];
            updateUI();
        });
        const btnLegionMob = document.getElementById('btn-legion');
        if (btnLegionMob) setupButton(btnLegionMob, toggleLegionMode);

        // Aggressive mobile detection and forced display
        const checkMobile = () => {
            const isSmall = window.innerWidth < 1000 || window.innerHeight < 600;
            const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            
            if (isSmall || isTouch) {
                document.getElementById('mobile-controls').style.display = 'block';
                const uiPanel = document.getElementById('ui');
                if (uiPanel) uiPanel.style.display = 'none';
            }
        };

        window.addEventListener('resize', checkMobile);
        checkMobile();
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

    function spawnClouds() {
        for (let i = 0; i < 30; i++) {
            const cloud = new THREE.Group();
            const count = Math.floor(Math.random() * 5) + 3;
            for (let j = 0; j < count; j++) {
                const part = createBox(Math.random() * 10 + 5, Math.random() * 5 + 2, Math.random() * 10 + 5, 0xffffff);
                part.position.set(j * 5, Math.random() * 2, Math.random() * 5);
                cloud.add(part);
            }
            cloud.userData = { type: 'cloud' }; 
            cloud.position.set((Math.random() - 0.5) * 800, Math.random() * 50 + 50, (Math.random() - 0.5) * 800);
            scene.add(cloud);
        }
    }

    function spawnStars() {
        const starGeo = new THREE.BufferGeometry();
        const starPos = [];
        for (let i = 0; i < 2000; i++) {
            starPos.push((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2 });
        stars = new THREE.Points(starGeo, starMat);
        stars.visible = false;
        scene.add(stars);
    }

    function buildCity() {
        const buildingCount = 100; // More buildings
        for (let i = 0; i < buildingCount; i++) {
            const w = Math.random() * 6 + 4;
            const h = Math.random() * 25 + 10; // Taller buildings
            const d = Math.random() * 6 + 4;
            
            // Grid alignment for streets
            let x = (Math.floor(Math.random() * 30) - 15) * 12;
            let z = (Math.floor(Math.random() * 30) - 15) * 12;
            
            // Don't spawn buildings at center
            if (Math.abs(x) < 30 && Math.abs(z) < 30) continue;

            const colors = [0x444444, 0x555555, 0x666666, 0x333333, 0x222222, 0x777777];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const b = createBox(w, h, d, color);
            b.position.set(x, h/2, z);
            
            // Add some "LEGO windows" 
            const winRows = Math.floor(h / 3);
            for(let r=0; r<winRows; r++) {
                for(let side=0; side<4; side++) {
                    if (Math.random() > 0.3) {
                        const win = createBox(0.6, 0.6, 0.1, 0xffff66);
                        const winY = (r * 2) - (h/2) + 2;
                        if (side === 0) win.position.set((Math.random()-0.5)*w*0.8, winY, d/2 + 0.05);
                        if (side === 1) { win.position.set((Math.random()-0.5)*w*0.8, winY, -d/2 - 0.05); win.rotation.y = Math.PI; }
                        if (side === 2) { win.position.set(w/2 + 0.05, winY, (Math.random()-0.5)*d*0.8); win.rotation.y = Math.PI/2; }
                        if (side === 3) { win.position.set(-w/2 - 0.05, winY, (Math.random()-0.5)*d*0.8); win.rotation.y = -Math.PI/2; }
                        b.add(win);
                    }
                }
            }
            
            scene.add(b);
            obstacles.push(b);
        }

        // Add Street Lamps
        for (let i = 0; i < 40; i++) {
            const x = (Math.random() - 0.5) * 300;
            const z = (Math.random() - 0.5) * 300;
            if (Math.abs(x) < 25 && Math.abs(z) < 25) continue;

            const lamp = new THREE.Group();
            const pole = createBox(0.2, 5, 0.2, 0x333333);
            pole.position.y = 2.5;
            lamp.add(pole);
            const head = createBox(0.6, 0.3, 0.6, 0xffff00);
            head.position.y = 5;
            lamp.add(head);
            lamp.position.set(x, 0, z);
            scene.add(lamp);
        }
    }

    function buildTrees() {
        const treeCount = 50;
        for (let i = 0; i < treeCount; i++) {
            const x = (Math.random() - 0.5) * 300;
            const z = (Math.random() - 0.5) * 300;
            
            // Grid check - trees often in parks or edges
            if (Math.abs(x) < 25 && Math.abs(z) < 25) continue;
            
            const tree = new THREE.Group();
            const trunk = createBox(0.6, 3, 0.6, 0x5d4037);
            trunk.position.y = 1.5;
            tree.add(trunk);
            
            const leafLayers = 3;
            for(let j=0; j<leafLayers; j++) {
                const leaves = createBox(4 - j, 1.2, 4 - j, 0x2e7d32);
                leaves.position.y = 3 + j;
                tree.add(leaves);
            }
            
            tree.position.set(x, 0, z);
            scene.add(tree);
            obstacles.push(tree);
        }
    }

    function spawnEnemies(count = 30) {
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 300;
            const z = (Math.random() - 0.5) * 300;
            if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
            buildEnemy('BOT', x, z);
        }
    }

    function buildEnemy(type, x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        
        let body;
        if (type === 'BOT') {
            body = createBox(1, 1.5, 0.6, 0x888888);
            body.position.y = 0.75;
            const eye = createBox(0.8, 0.2, 0.1, 0xff0000);
            eye.position.set(0, 1.2, 0.35);
            group.add(body, eye);
            group.userData = { type: 'BOT', hp: 30, speed: 0.05 + Math.random() * 0.05 };
        }
        
        scene.add(group);
        enemies.push(group);
        return group;
    }

    function spawnUltron() {
        ultronBoss = new THREE.Group();
        // Body
        const torso = createBox(2, 3, 1, 0xcccccc);
        torso.position.y = 3;
        // Head
        const head = createBox(1.5, 1.5, 1.5, 0xcccccc);
        head.position.y = 5.25;
        // Jaw/Mouth area
        const jaw = createBox(1.2, 0.4, 1.4, 0xaa0000);
        jaw.position.set(0, 4.6, 0.2);
        // Eyes
        const eyeL = createBox(0.3, 0.3, 0.1, 0xff0000);
        eyeL.position.set(-0.4, 5.5, 0.76);
        const eyeR = createBox(0.3, 0.3, 0.1, 0xff0000);
        eyeR.position.set(0.4, 5.5, 0.76);
        
        ultronBoss.add(torso, head, jaw, eyeL, eyeR);
        ultronBoss.position.set(0, 0, -80);
        ultronBoss.userData = { hp: 1000, maxHp: 1000, state: 'IDLE', timer: 0 };
        
        scene.add(ultronBoss);
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
        const p1Status = document.getElementById('p1-display');
        const gps = navigator.getGamepads();
        const p1Name = characters[p1Char].name;
        const p2Name = characters[p2Char].name;
        
        p1Status.textContent = p1Name;
        
        const gpStatus = document.getElementById('gamepad-status');
        const connectedCount = gps.filter(g => g).length;
        if (connectedCount > 0) {
            gpStatus.textContent = `CONTROLLER CONNECTED [${connectedCount}]`;
            gpStatus.style.color = '#4ade80';
        } else {
            gpStatus.textContent = 'NO GAMEPAD DETECTED';
            gpStatus.style.color = '#f87171';
        }
        
        if (legionMode) {
            gpStatus.textContent += ' | LEGION MODE ACTIVE';
            gpStatus.style.color = '#fbbf24';
        }
    }

    function toggleLegionMode() {
        legionMode = !legionMode;
        playThunderSound(); // Cool sound for activation
        
        charNames.forEach(name => {
            const char = characters[name];
            if (!char) return;
            
            if (legionMode) {
                // Add crown if not exists
                if (!crowns[name]) {
                    const crownGroup = new THREE.Group();
                    const ring = new THREE.Mesh(
                        new THREE.TorusGeometry(0.5, 0.05, 8, 24),
                        new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 1, roughness: 0.3, emissive: 0xffaa00, emissiveIntensity: 0.5 })
                    );
                    ring.rotation.x = Math.PI/2;
                    crownGroup.add(ring);
                    
                    for(let i=0; i<5; i++) {
                        const spike = new THREE.Mesh(
                            new THREE.ConeGeometry(0.1, 0.3, 4),
                            new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 1, roughness: 0.3 })
                        );
                        const angle = (i / 5) * Math.PI * 2;
                        spike.position.set(Math.cos(angle)*0.45, 0.15, Math.sin(angle)*0.45);
                        spike.rotation.x = Math.PI/2;
                        crownGroup.add(spike);
                    }
                    
                    if (name === 'HULK') crownGroup.position.y = 4 + (hulkScale * 3.5);
                    else if (name === 'GODZILLA') crownGroup.position.y = 6;
                    else crownGroup.position.y = 3.0;
                    char.mesh.add(crownGroup);
                    crowns[name] = crownGroup;
                }
                crowns[name].visible = true;
            } else {
                if (crowns[name]) crowns[name].visible = false;
            }
        });
        
        updateUI();
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

    function createImpactEffect(pos, scale = 1) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(scale, 0.1, 16, 100),
            new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.8 })
        );
        ring.position.copy(pos);
        ring.position.y = 0.1;
        ring.rotation.x = Math.PI / 2;
        scene.add(ring);
        
        const animateRing = () => {
            ring.scale.addScalar(0.15);
            ring.material.opacity -= 0.04;
            if (ring.material.opacity <= 0) {
                scene.remove(ring);
            } else {
                requestAnimationFrame(animateRing);
            }
        };
        animateRing();
    }

    function performAction(charKey) {
        if (isCooldown) return;
        const charState = characters[charKey];
        const mesh = charState.mesh;
        const activeCharacter = charKey;

        if (legionMode && charKey === p1Char) {
            // Everyone performs the action!
            charNames.forEach(name => {
                if (name !== p1Char) {
                    performAction(name);
                }
            });
        }

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
            const currentScale = activeCharacter === 'HULK' ? hulkScale : 1.0;
            const smashScale = 3 * currentScale; 
            const ring = new THREE.Mesh(new THREE.TorusGeometry(smashScale, 0.1 * currentScale, 16, 100), new THREE.MeshBasicMaterial({ color: 0x550088 }));
            ring.rotation.x = Math.PI / 2; ring.position.copy(mesh.position);
            scene.add(ring); abilities.smash = ring;
            
            // Screen Shake
            cameraShake = Math.min(10, currentScale * 0.5);
            
            // Bonus: Visual Impact for Giant Hulk
            if (currentScale > 5) createImpactEffect(mesh.position, smashScale * 1.5);
            
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
        const gps = navigator.getGamepads();
        const gp = gps[0]; 
        
        // Update Hulk Dynamic Scale & Stats
        hulkScale = THREE.MathUtils.lerp(hulkScale, hulkTargetScale, 0.05);
        characters['HULK'].mesh.scale.set(hulkScale, hulkScale, hulkScale);
        
        // Speed scaling (diminishing returns but faster)
        characters['HULK'].speed = characters['HULK'].baseSpeed * (1 + Math.pow(hulkScale, 0.6));
        characters['HULK'].jump = characters['HULK'].baseJump * (1 + Math.log2(hulkScale + 1));
        
        // Performance Optimization: Hide tiny things when Mountain Sized
        if (hulkScale > 60) {
            bricks.forEach(b => b.visible = false);
            enemies.forEach(e => e.visible = false);
            obstacles.forEach(o => o.visible = o.scale.x > 5); // Hide small obstacles
        } else {
            bricks.forEach(b => b.visible = true);
            enemies.forEach(e => e.visible = true);
            obstacles.forEach(o => o.visible = true);
        }

        // Update Hulk Scale HUD
        const hulkScaleHUD = document.getElementById('scale-hud');
        if (hulkScaleHUD) {
            hulkScaleHUD.style.display = hulkScale > 1.2 ? 'flex' : 'none';
            document.getElementById('hulk-scale-val').textContent = hulkScale.toFixed(1) + 'x';
        }
        
        // Atmosphere Transition (To Space) & Fog Adjustment
        if (hulkScale > 40) {
            const spaceFactor = Math.min(1.0, (hulkScale - 40) / 200);
            const skyColor = new THREE.Color(0x7dd3fc).lerp(new THREE.Color(0x020617), spaceFactor);
            scene.background = skyColor;
            scene.fog.color = skyColor;
            // Clearer fog as he grows to keep him visible
            scene.fog.density = 0.002 / (1 + (hulkScale - 40) * 0.1); 
            
            if (hulkScale > 100) {
                if (stars) stars.visible = true;
                scene.background = new THREE.Color(0x000000); // Pure Space
                scene.fog.density = 0.0001; // Almost no fog in space
            }
        } else {
            scene.background = new THREE.Color(0x7dd3fc);
            scene.fog.color = new THREE.Color(0x7dd3fc);
            scene.fog.density = 0.002;
            if (stars) stars.visible = false;
        }

        // --- Continuous Growth with Acceleration ---
        const isGrowing = keys['KeyQ'] || (gp && gp.buttons[7].pressed);
        const isShrinking = keys['KeyE'] || (gp && gp.buttons[6].pressed);

        if (isGrowing && !isShowingConfirm) {
            growthHoldTime += 0.016;
            const accel = 1 + growthHoldTime * 5; 
            const limit = hulkExtremeUnlocked ? 1000.0 : 9.0;
            const nextScale = hulkTargetScale * (1 + 0.01 * accel);
            
            if (!hulkExtremeUnlocked && nextScale > 9.0 && hulkTargetScale < 9.0) {
                hulkTargetScale = 9.0;
                showExtremeConfirm();
            } else {
                hulkTargetScale = Math.min(limit, nextScale);
            }
        } else if (isShrinking) {
            growthHoldTime += 0.032; // Shrink slightly faster
            const accel = 1 + growthHoldTime * 5;
            hulkTargetScale = Math.max(0.2, hulkTargetScale / (1 + 0.01 * accel));
        } else {
            growthHoldTime = 0;
        }

        // Handle Confirmation Input
        if (isShowingConfirm) {
            if (keys['KeyY'] || (gp && gp.buttons[0].pressed)) {
                confirmExtreme();
            }
        }

        requestAnimationFrame(animate);
        // PS5 Controller Mapping handled in Growth section above

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
            if (p.position.y <= 0) { 
                if (p.position.y < 0 && pState.yVel < -0.2 && charKey === 'HULK') {
                    performAction('HULK'); // Auto smash on LAND
                }
                p.position.y = 0; 
                pState.yVel = 0; 
                if (keys[isP1 ? 'Space' : 'ControlRight'] || (isP1 && mobileInput.jump)) pState.yVel = pState.jump; 
            }

            // Mobile specific movement for P1
            if (isP1 && joystickActive) {
                p.position.x += mobileInput.x * pState.speed;
                p.position.z += mobileInput.z * pState.speed;
                if (mobileInput.x !== 0 || mobileInput.z !== 0) {
                    p.rotation.y = Math.atan2(mobileInput.x, mobileInput.z);
                }
            }
        };
        updatePlayer(p1Char, true); 
        if (!legionMode) updatePlayer(p2Char, false);
        
        charNames.forEach((key) => {
            if (key === p1Char) return;
            if (!legionMode && key === p2Char) return;
            
            const compState = characters[key]; 
            const comp = compState.mesh;
            const p1Mesh = characters[p1Char].mesh;
            
            if (legionMode) {
                // Mimic P1 exactly but with offsets
                const offsetIdx = charNames.indexOf(key);
                const angle = (offsetIdx / charNames.length) * Math.PI * 2;
                const targetX = p1Mesh.position.x + Math.cos(angle) * 3;
                const targetZ = p1Mesh.position.z + Math.sin(angle) * 3;
                
                comp.position.x = THREE.MathUtils.lerp(comp.position.x, targetX, 0.1);
                comp.position.z = THREE.MathUtils.lerp(comp.position.z, targetZ, 0.1);
                comp.rotation.y = p1Mesh.rotation.y;
                
                // Jumping synchronization
                if (p1Mesh.position.y > 0.1 && comp.position.y <= 0) {
                    compState.yVel = compState.jump;
                }
            } else {
                // Original following logic
                const targetPos = p1Mesh.position.clone().add(new THREE.Vector3(-3, 0, 3));
                if (comp.position.distanceTo(targetPos) > 2) {
                    const dir = new THREE.Vector3().subVectors(targetPos, comp.position).normalize();
                    comp.position.x += dir.x * compState.speed; comp.position.z += dir.z * compState.speed;
                    comp.rotation.y = Math.atan2(dir.x, dir.z);
                }
            }
            
            compState.yVel -= compState.gravity; comp.position.y += compState.yVel;
            if (comp.position.y <= 0) { comp.position.y = 0; compState.yVel = 0; }
            
            // Crown animation
            if (legionMode && crowns[key]) {
                crowns[key].rotation.y += 0.05;
                crowns[key].position.y += Math.sin(Date.now() * 0.005) * 0.002;
            }
        });
        
        // P1 Crown animation if exists
        if (legionMode && crowns[p1Char]) {
            crowns[p1Char].rotation.y += 0.05;
            crowns[p1Char].position.y += Math.sin(Date.now() * 0.005) * 0.002;
        }

        // --- ENEMY AI ---
        enemies.forEach((enemy, i) => {
            const target = characters[p1Char].mesh.position;
            const dist = enemy.position.distanceTo(target);
            if (dist < 30) {
                const dir = target.clone().sub(enemy.position).normalize();
                enemy.position.x += dir.x * enemy.userData.speed;
                enemy.position.z += dir.z * enemy.userData.speed;
                enemy.rotation.y = Math.atan2(dir.x, dir.z);
            }
        });

        // --- ULTRON BOSS AI & SIZE SHIFTING ---
        if (ultronBoss) {
            ultronBoss.userData.timer -= 0.016;
            if (ultronBoss.userData.timer <= 0) {
                // Decision point
                const rand = Math.random();
                if (rand < 0.4) {
                    ultronTargetScale = 12.0; // COLOSSUS
                    ultronBoss.userData.timer = 5 + Math.random() * 5;
                } else if (rand < 0.8) {
                    ultronTargetScale = 1.5; // MINI
                    ultronBoss.userData.timer = 5 + Math.random() * 5;
                } else {
                    ultronTargetScale = 4.0; // NORMAL
                    ultronBoss.userData.timer = 3 + Math.random() * 2;
                }
                
                // Summon more minions when changing state
                if (enemies.length < 50) {
                    spawnEnemies(10);
                }
            }

            // Smooth scale transition
            ultronScale = THREE.MathUtils.lerp(ultronScale, ultronTargetScale, 0.02);
            ultronBoss.scale.set(ultronScale, ultronScale, ultronScale);

            // Move towards player
            const target = characters[p1Char].mesh.position;
            const toPlayer = target.clone().sub(ultronBoss.position);
            const dist = toPlayer.length();
            if (dist > 5 * ultronScale) {
                const dir = toPlayer.normalize();
                const speed = ultronScale > 8 ? 0.02 : (ultronScale < 2 ? 0.15 : 0.08);
                ultronBoss.position.x += dir.x * speed;
                ultronBoss.position.z += dir.z * speed;
                ultronBoss.rotation.y = Math.atan2(dir.x, dir.z);
            }
            
            // Stomp logic for Colossus
            if (ultronScale > 10 && Math.sin(Date.now() * 0.002) > 0.98) {
                playSmashSound();
                createImpactEffect(ultronBoss.position, ultronScale * 2);
            }
        }

        const p1Pos = characters[p1Char].mesh.position; const p2Pos = characters[p2Char].mesh.position;
        const midPoint = new THREE.Vector3().addVectors(p1Pos, p2Pos).multiplyScalar(0.5);
        const playerDist = p1Pos.distanceTo(p2Pos);
        
        // Adjust camera for Extreme Proportions
        const bossBonus = ultronBoss ? (ultronScale * 2) : 0;
        const hulkBonus = (hulkScale * 8); // Significantly more zoom for mountains
        const targetCamPos = midPoint.clone().add(new THREE.Vector3(0, Math.max(10, 10 + playerDist * 0.5 + bossBonus + hulkBonus), Math.max(20, 15 + playerDist * 0.8 + bossBonus * 1.5 + hulkBonus * 1.8)));
        
        // Far clipping adjustment
        camera.far = Math.max(2000, hulkScale * 20);
        camera.updateProjectionMatrix();

        camera.position.lerp(targetCamPos, 0.1); 
        
        // Apply Camera Shake
        if (cameraShake > 0) {
            camera.position.x += (Math.random() - 0.5) * cameraShake;
            camera.position.y += (Math.random() - 0.5) * cameraShake;
            camera.position.z += (Math.random() - 0.5) * cameraShake;
            cameraShake *= 0.9; // Decay
            if (cameraShake < 0.01) cameraShake = 0;
        }

        camera.lookAt(midPoint);

        // Obstacle Destruction via collision/hitting
        obstacles.forEach((obs, i) => {
            charNames.forEach(key => {
                const charMesh = characters[key].mesh;
                const d = obs.position.distanceTo(charMesh.position);
                const currentScale = (key === 'HULK' ? hulkScale : 1.0);
                const hitDist = key === 'HULK' ? (2 * currentScale) : (key === 'GODZILLA' ? 6 : 2.5);
                if (d < hitDist) { // Hit distance
                    destroyObstacle(obs, i);
                }
            });
        });

        // Laser/Ability collisions with enemies
        if (abilities.laser) {
            enemies.forEach((en, i) => {
                charNames.forEach(key => {
                    const char = characters[key];
                    if (char.mesh.children.includes(abilities.laser)) {
                        const dist = en.position.distanceTo(char.mesh.position);
                        if (dist < 25) {
                            const toEn = en.position.clone().sub(char.mesh.position).normalize();
                            const forward = new THREE.Vector3(Math.sin(char.mesh.rotation.y), 0, Math.cos(char.mesh.rotation.y));
                            if (forward.angleTo(toEn) < 0.25) {
                                en.userData.hp -= 2;
                                createImpactEffect(en.position, 1);
                                if (en.userData.hp <= 0) {
                                    explodeObstacle(en.position); // Re-use lego explosion
                                    scene.remove(en);
                                    enemies.splice(i, 1);
                                    score += 200;
                                    document.getElementById('bricks').textContent = score;
                                }
                            }
                        }
                    }
                });
            });
            // Hit Ultron
            if (ultronBoss) {
                charNames.forEach(key => {
                    const char = characters[key];
                    if (char.mesh.children.includes(abilities.laser)) {
                        const dist = ultronBoss.position.distanceTo(char.mesh.position);
                        if (dist < 40) {
                            const toBoss = ultronBoss.position.clone().sub(char.mesh.position).normalize();
                            const forward = new THREE.Vector3(Math.sin(char.mesh.rotation.y), 0, Math.cos(char.mesh.rotation.y));
                            if (forward.angleTo(toBoss) < 0.3) {
                                ultronBoss.userData.hp -= 1;
                                createImpactEffect(ultronBoss.position, ultronScale);
                            }
                        }
                    }
                });
            }
        }

        if (abilities.smash) {
            const smashPos = abilities.smash.position;
            const smashScale = abilities.smash.geometry.parameters.radius * abilities.smash.scale.x; 
            
            obstacles.forEach((obs, i) => {
                if (obs.position.distanceTo(smashPos) < smashScale) {
                    destroyObstacle(obs, i);
                }
            });
            
            enemies.forEach((en, i) => {
                if (en.position.distanceTo(smashPos) < smashScale) {
                    en.userData.hp -= 10;
                    if (en.userData.hp <= 0) {
                        explodeObstacle(en.position);
                        scene.remove(en);
                        enemies.splice(i, 1);
                        score += 200;
                        document.getElementById('bricks').textContent = score;
                    }
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
    function showExtremeConfirm() {
        if (isShowingConfirm || hulkExtremeUnlocked) return;
        isShowingConfirm = true;
        
        const overlay = document.createElement('div');
        overlay.id = 'extreme-confirm-overlay';
        overlay.style.cssText = `
            position: fixed; bottom: 30px; left: 30px; width: 280px; 
            background: rgba(15, 23, 42, 0.9); border: 2px solid #38bdf8; border-radius: 12px;
            display: flex; flex-direction: column; padding: 20px;
            z-index: 10000; color: #38bdf8; font-family: 'Orbitron', sans-serif; text-align: left;
            box-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
            pointer-events: auto;
        `;
        
        overlay.innerHTML = `
            <div style="font-size: 0.8rem; color: #fbbf24; margin-bottom: 10px; letter-spacing: 1px;">POTENTIAL MAGNITUDE DETECTED</div>
            <div style="font-size: 1rem; margin-bottom: 15px; line-height: 1.4;">UNLOCK SUPER MAX? <br><span style="font-size: 0.7rem; opacity: 0.7;">(PLANETARY GROWTH)</span></div>
            <div style="display: flex; gap: 10px;">
                <button id="confirm-yes" style="flex: 1; padding: 10px; background: #38bdf8; border: none; color: #000; font-weight: bold; cursor: pointer; font-family: 'Orbitron'; font-size: 0.8rem; border-radius: 6px;">UNLOCK (Y)</button>
                <button id="confirm-no" style="padding: 10px; background: transparent; border: 1px solid #64748b; color: #64748b; cursor: pointer; border-radius: 6px;">✕</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        document.getElementById('confirm-yes').onclick = confirmExtreme;
        document.getElementById('confirm-no').onclick = () => {
            isShowingConfirm = false;
            document.body.removeChild(overlay);
            hulkTargetScale = 8.9; 
        };
    }

    function confirmExtreme() {
        hulkExtremeUnlocked = true;
        isShowingConfirm = false;
        const overlay = document.getElementById('extreme-confirm-overlay');
        if (overlay) document.body.removeChild(overlay);
        playThunderSound();
    }

    init();
})();
