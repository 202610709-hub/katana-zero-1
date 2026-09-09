const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const chronosFill = document.getElementById("chronos-bar-fill");

canvas.width = 1280;
canvas.height = 720;

const lobbyScreen = document.getElementById("lobby-screen");
const uiLayer = document.getElementById("ui-layer");
const modeDisplay = document.getElementById("mode-display");
const scoreDisplay = document.getElementById("score-display");

let gameState = "LOBBY"; 
let gameMode = "STAGE";  
let currentStage = 1;
let killCount = 0;
let spawnTimer = 0;

let lastTime = 0;
let timeScale = 1.0;
let hitStopTimer = 0;
let cameraShakeTime = 0;
let cameraShakeIntensity = 0;

const keys = {};
const mouse = { x: 0, y: 0, leftPressed: false, rightPressed: false };

const btnStage = document.getElementById("btn-stage");
const btnInfinite = document.getElementById("btn-infinite");

if (btnStage) btnStage.addEventListener("click", () => startGame("STAGE"));
if (btnInfinite) btnInfinite.addEventListener("click", () => startGame("INFINITE"));

window.addEventListener("keydown", (e) => { 
    keys[e.code] = true; 
    if (e.code === "KeyR" && gameState === "PLAYING") resetGame();
    if (e.code === "Escape") returnToLobby();
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });
canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouse.x = (e.clientX - rect.left) * scaleX;
    mouse.y = (e.clientY - rect.top) * scaleY;
});
canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) mouse.leftPressed = true;
    if (e.button === 2) mouse.rightPressed = true;
});
canvas.addEventListener("mouseup", (e) => {
    if (e.button === 0) mouse.leftPressed = false;
    if (e.button === 2) mouse.rightPressed = false;
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

const gravity = 1500;

const stageMaps = {
    1: [
        { x: 0, y: 680, w: 1280, h: 50 },
        { x: 0, y: 0, w: 20, h: 720 },
        { x: 1260, y: 0, w: 20, h: 720 },
        { x: 180, y: 520, w: 320, h: 18 },
        { x: 740, y: 380, w: 380, h: 18 },
        { x: 300, y: 220, w: 240, h: 18 }
    ],
    2: [
        { x: 0, y: 680, w: 1280, h: 50 },
        { x: 0, y: 0, w: 20, h: 720 },
        { x: 1260, y: 0, w: 20, h: 720 },
        { x: 250, y: 540, w: 200, h: 18 },
        { x: 800, y: 540, w: 200, h: 18 },
        { x: 525, y: 360, w: 200, h: 18 },
        { x: 250, y: 180, w: 750, h: 18 }
    ],
    3: [
        { x: 0, y: 680, w: 1280, h: 50 },
        { x: 0, y: 0, w: 20, h: 720 },
        { x: 1260, y: 0, w: 20, h: 720 },
        { x: 100, y: 480, w: 400, h: 18 },
        { x: 780, y: 480, w: 400, h: 18 },
        { x: 440, y: 280, w: 400, h: 18 }
    ]
};

let platforms = stageMaps[1];

const chronos = {
    energy: 5.0,
    maxEnergy: 5.0,
    drainRate: 1.5,
    rechargeRate: 0.8,
    active: false
};

let afterimages = [];
let slashEffects = [];
let dashLines = [];
let sparkParticles = [];
let bloodParticles = [];
let dustParticles = [];
let bullets = [];
let enemies = [];

function drawEnemyType1(ctx, x, y, facing) {
    ctx.save(); ctx.translate(x + 12, y + 20); ctx.scale(facing, 1);
    ctx.fillStyle = "#2b2b2b"; ctx.fillRect(-8, -20, 16, 6); ctx.fillRect(-10, -16, 20, 3);
    ctx.fillStyle = "#dca17a"; ctx.fillRect(-6, -14, 12, 12);
    ctx.fillStyle = "#5c3a21"; ctx.fillRect(-6, -8, 12, 8);
    ctx.fillStyle = "#e6e6e6"; ctx.fillRect(-8, -2, 16, 12);
    ctx.fillStyle = "#1c1c24"; ctx.fillRect(-6, -2, 3, 12); ctx.fillRect(3, -2, 3, 12);
    ctx.fillStyle = "#e0a000"; ctx.fillRect(-4, 10, 8, 3);
    ctx.fillStyle = "#4a5263"; ctx.fillRect(-8, 13, 16, 15);
    ctx.fillStyle = "#1a1a1a"; ctx.fillRect(-9, 25, 7, 4); ctx.fillRect(2, 25, 7, 4);
    ctx.restore();
}

function drawEnemyType2(ctx, x, y, facing) {
    ctx.save(); ctx.translate(x + 12, y + 20); ctx.scale(facing, 1);
    ctx.fillStyle = "#1a1a1a"; ctx.fillRect(-6, -22, 14, 8); ctx.fillRect(-8, -20, 8, 6);
    ctx.fillStyle = "#e2a983"; ctx.fillRect(-6, -14, 12, 10);
    ctx.fillStyle = "#f0f0f0"; ctx.fillRect(-6, -4, 12, 14);
    ctx.fillStyle = "#1a1a1a"; ctx.fillRect(-4, -4, 2, 14); ctx.fillRect(2, -4, 2, 14);
    ctx.fillStyle = "#22252a"; ctx.fillRect(-6, 10, 12, 16);
    ctx.fillStyle = "#d0d0d0"; ctx.fillRect(-7, 24, 5, 3); ctx.fillRect(2, 24, 5, 3);
    ctx.restore();
}

function drawEnemyType3(ctx, x, y, facing) {
    ctx.save(); ctx.translate(x + 12, y + 20); ctx.scale(facing, 1);
    ctx.fillStyle = "#2c221e"; ctx.fillRect(-6, -20, 12, 6);
    ctx.fillStyle = "#dca17a"; ctx.fillRect(-6, -14, 12, 8);
    ctx.fillStyle = "#26292b"; ctx.fillRect(-9, -6, 18, 24);
    ctx.fillStyle = "#d9d9d9"; ctx.fillRect(-3, -6, 6, 10);
    ctx.fillStyle = "#111"; ctx.fillRect(-2, -1, 20, 4);
    ctx.fillStyle = "#777"; ctx.fillRect(4, -4, 6, 3);
    ctx.fillStyle = "#1a1a1d"; ctx.fillRect(-7, 18, 14, 8);
    ctx.restore();
}

function drawEnemyType4(ctx, x, y, facing) {
    ctx.save(); ctx.translate(x + 12, y + 20); ctx.scale(facing, 1);
    ctx.fillStyle = "#1a1a1a"; ctx.fillRect(-6, -22, 14, 10);
    ctx.fillStyle = "#8b1c1c"; ctx.fillRect(-8, -12, 16, 18);
    ctx.fillStyle = "#1a1a1d"; ctx.fillRect(-6, 6, 12, 14);
    ctx.fillStyle = "#dca17a"; ctx.fillRect(6, -6, 4, 4);
    ctx.fillStyle = "#444"; ctx.fillRect(2, -8, 16, 6);
    ctx.fillStyle = "#222"; ctx.fillRect(-4, -6, 8, 4);
    ctx.restore();
}

function drawPlayerSprite(ctx, x, y, facing, isInvincible, isEvading = false) {
    ctx.save(); 
    ctx.translate(x + 10, y + 20); 
    ctx.scale(facing, 1);

    if (isEvading) {
        ctx.translate(0, 8);
        ctx.transform(1, 0, -0.6, 1, 0, 0);
    }

    ctx.fillStyle = isInvincible ? "#00ffff" : "#1a1a1a";
    ctx.fillRect(-12, -22, 8, 12);
    ctx.fillStyle = "#ffcc00"; ctx.fillRect(-6, -22, 3, 4);
    ctx.fillStyle = isInvincible ? "#00ffff" : "#1a1a1a";
    ctx.fillRect(-6, -20, 12, 8);
    ctx.fillStyle = "#dca17a"; ctx.fillRect(-4, -12, 8, 8); ctx.fillRect(-2, -4, 8, 6);
    ctx.fillStyle = "#252528"; ctx.fillRect(-8, -4, 14, 12);
    ctx.fillStyle = "#e0e0e0"; ctx.fillRect(-4, -4, 4, 10);
    ctx.fillStyle = "#80123f"; ctx.fillRect(-12, 4, 12, 5);
    ctx.fillStyle = "#ffcc00"; ctx.fillRect(-14, 4, 3, 5);
    ctx.fillStyle = "#1a1a1e"; ctx.fillRect(-7, 9, 14, 12);
    ctx.fillStyle = "#e6a100"; ctx.fillRect(-8, 17, 12, 4);
    ctx.fillStyle = "#ff0055"; ctx.fillRect(2, -2, 14, 3);
    ctx.fillStyle = "#ffcc00"; ctx.fillRect(0, -3, 3, 5);
    
    ctx.restore();
}

function spawnDust(x, y) {
    for (let i = 0; i < 10; i++) {
        dustParticles.push({
            x: x + (Math.random() - 0.5) * 16,
            y: y,
            vx: (Math.random() - 0.5) * 80,
            vy: -Math.random() * 50 - 10,
            life: Math.random() * 0.2 + 0.15,
            size: Math.random() * 5 + 3,
            color: `rgba(180, 180, 190, ${Math.random() * 0.5 + 0.3})`
        });
    }
}

const player = {
    x: 100, y: 550, w: 20, h: 40,
    vx: 0, vy: 0,
    speed: 380, 
    jumpForce: -620, 
    isGrounded: false,
    isWalled: false,
    wallDir: 0,
    facingDir: 1,
    
    isEvading: false,
    hasAirDashed: false,
    evadeTimer: 0,
    evadeDuration: 0.2, 
    evadeSpeed: 950,    
    evadeCooldown: 0,   
    isInvincible: false,
    
    isDashing: false,
    dashTimer: 0,
    attackCooldown: 0,
    afterimageTimer: 0,
    isDead: false,

    update(dt) {
        if (this.isDead) return;

        this.evadeCooldown -= dt;

        if (this.isEvading || this.isDashing || chronos.active) {
            this.afterimageTimer -= dt;
            if (this.afterimageTimer <= 0) {
                afterimages.push({
                    x: this.x, y: this.y, w: this.w, h: this.h,
                    facing: this.facingDir,
                    color: chronos.active ? "rgba(0, 255, 255, 0.6)" : "rgba(255, 0, 128, 0.6)",
                    life: 0.2,
                    isEvading: this.isEvading
                });
                this.afterimageTimer = 0.02;
            }
        }

        if (this.isDashing) {
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.vx = 0; this.vy = 0;
            }
        } else if (this.isEvading) {
            this.evadeTimer -= dt;
            this.vx = this.facingDir * this.evadeSpeed;
            this.vy = 0;
            
            if (this.evadeTimer <= 0) {
                this.isEvading = false;
                this.isInvincible = false; 
                this.evadeCooldown = 0.25; 
            }
        } else {
            let moveDir = 0;
            if (keys["KeyA"]) moveDir -= 1;
            if (keys["KeyD"]) moveDir += 1;

            this.vx = moveDir * this.speed;
            if (moveDir !== 0) this.facingDir = moveDir;

            if (keys["ShiftLeft"] && !this.isEvading && this.evadeCooldown <= 0) {
                if (this.isGrounded || !this.hasAirDashed) {
                    this.isEvading = true;
                    this.isInvincible = true;
                    this.evadeTimer = this.evadeDuration;
                    
                    if (!this.isGrounded) {
                        this.hasAirDashed = true;
                    } else {
                        spawnDust(this.x + this.w / 2, this.y + this.h);
                    }
                }
            }
        }

        if ((keys["KeyW"] || keys["Space"]) && !this.isDashing && !this.isEvading) {
            if (this.isGrounded) {
                this.vy = this.jumpForce;
                this.isGrounded = false;
                keys["KeyW"] = false; keys["Space"] = false;
            } else if (this.isWalled) {
                this.vy = this.jumpForce * 0.9;
                this.vx = -this.wallDir * this.speed * 1.3;
                this.facingDir = -this.wallDir;
                this.isWalled = false;
                keys["KeyW"] = false; keys["Space"] = false;
            }
        }

        if (!this.isDashing && !this.isEvading) {
            this.vy += gravity * dt;
            if (this.isWalled && this.vy > 0) this.vy = Math.min(this.vy, 90);
        } 

        this.x += this.vx * dt;
        this.checkCollisionX();
        this.y += this.vy * dt;
        this.checkCollisionY();

        this.attackCooldown -= dt;
        if (mouse.leftPressed && this.attackCooldown <= 0 && !this.isEvading) {
            this.attack();
            this.attackCooldown = 0.22;
            mouse.leftPressed = false;
        }
    },

    attack() {
        const startX = this.x + this.w / 2;
        const startY = this.y + this.h / 2;
        const angle = Math.atan2(mouse.y - startY, mouse.x - startX);

        const dashDistance = 180; 
        this.isDashing = true;
        this.dashTimer = 0.07; 
        this.vx = Math.cos(angle) * (dashDistance / this.dashTimer);
        this.vy = Math.sin(angle) * (dashDistance / this.dashTimer);
        this.facingDir = Math.cos(angle) >= 0 ? 1 : -1;

        const endX = startX + Math.cos(angle) * dashDistance;
        const endY = startY + Math.sin(angle) * dashDistance;

        dashLines.push({
            x1: startX, y1: startY, x2: endX, y2: endY,
            life: 0.18, maxLife: 0.18
        });

        slashEffects.push({
            x: endX, y: endY,
            angle: angle,
            radius: 95, 
            life: 0.14, maxLife: 0.14
        });

        for (let i = 0; i < 18; i++) {
            const pAngle = angle + (Math.random() - 0.5) * 1.5;
            const pSpeed = Math.random() * 500 + 150;
            sparkParticles.push({
                x: endX, y: endY,
                vx: Math.cos(pAngle) * pSpeed,
                vy: Math.sin(pAngle) * pSpeed,
                life: Math.random() * 0.12 + 0.05,
                color: Math.random() > 0.5 ? "#00ffff" : "#ffffff"
            });
        }

        const attackBox = {
            x: endX - 110,
            y: endY - 110,
            w: 220, h: 220
        };

        let hitSuccess = false;

        bullets.forEach(b => {
            if (isColliding(attackBox, { x: b.x - 12, y: b.y - 12, w: 24, h: 24 })) {
                b.vx = Math.cos(angle) * 1200; 
                b.vy = Math.sin(angle) * 1200;
                b.isReflected = true;
                hitSuccess = true;
            }
        });

        enemies.forEach(enemy => {
            if (enemy.alive && isColliding(attackBox, enemy)) {
                enemy.alive = false;
                killCount++;
                updateHUD();
                hitSuccess = true;
                spawnBlood(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, angle);
            }
        });

        if (hitSuccess) {
            this.evadeCooldown = 0;
            this.hasAirDashed = false;
        }

        cameraShakeTime = hitSuccess ? 0.35 : 0.15;
        cameraShakeIntensity = hitSuccess ? 16 : 7;
        hitStopTimer = hitSuccess ? 0.12 : 0.04;
    },

    checkCollisionX() {
        this.isWalled = false;
        platforms.forEach(p => {
            if (isColliding(this, p)) {
                if (this.vx > 0) { this.x = p.x - this.w; this.isWalled = true; this.wallDir = 1; } 
                else if (this.vx < 0) { this.x = p.x + p.w; this.isWalled = true; this.wallDir = -1; }
            }
        });
    },

    checkCollisionY() {
        this.isGrounded = false;
        platforms.forEach(p => {
            if (isColliding(this, p)) {
                if (this.vy > 0) { 
                    this.y = p.y - this.h; 
                    this.vy = 0; 
                    this.isGrounded = true; 
                    this.hasAirDashed = false; 
                } 
                else if (this.vy < 0) { this.y = p.y + p.h; this.vy = 0; }
            }
        });
    },

    draw() {
        drawPlayerSprite(ctx, this.x, this.y, this.facingDir, this.isInvincible, this.isEvading);
    }
};

function createEnemy(type, x, y) {
    let speed = 110;
    if (type === 1) speed = 200; 
    if (type === 4) speed = 80;

    return {
        type: type,
        x: x, y: y, w: 24, h: 40,
        vx: 0, vy: 0,
        alive: true,
        shootTimer: type === 4 ? 1.0 : 0.8,
        facingDir: -1,
        moveSpeed: speed,

        update(dt) {
            if (!this.alive) return;

            const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
            this.facingDir = player.x < this.x ? -1 : 1;

            if (distToPlayer < 750) {
                if (this.type === 1) {
                    this.vx = this.facingDir * this.moveSpeed;
                } else {
                    if (distToPlayer > 350) {
                        this.vx = this.facingDir * this.moveSpeed;
                    } else if (distToPlayer < 200) {
                        this.vx = -this.facingDir * this.moveSpeed;
                    } else {
                        this.vx = 0;
                    }
                }
            } else {
                this.vx = 0;
            }

            this.vy += gravity * dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            platforms.forEach(p => {
                if (isColliding(this, p)) {
                    if (this.vy > 0) { this.y = p.y - this.h; this.vy = 0; }
                }
            });

            if (this.type === 1 && isColliding(this, player) && !player.isDead && !player.isInvincible) {
                player.isDead = true;
                cameraShakeTime = 0.4;
                cameraShakeIntensity = 12;
                spawnBlood(player.x + player.w / 2, player.y + player.h / 2, Math.PI);
            }

            if ((this.type === 2 || this.type === 3 || this.type === 4) && distToPlayer < 750) {
                this.shootTimer -= dt;
                if (this.shootTimer <= 0) {
                    if (this.type === 4) {
                        for (let i = -1; i <= 1; i++) {
                            const angle = Math.atan2((player.y + 15) - (this.y + 15), (player.x + 10) - (this.x + 10)) + (i * 0.2);
                            const bSpeed = 520;
                            bullets.push({
                                x: this.x + 12, y: this.y + 15,
                                vx: Math.cos(angle) * bSpeed,
                                vy: Math.sin(angle) * bSpeed,
                                isReflected: false
                            });
                        }
                        this.shootTimer = 2.2;
                    } else {
                        const angle = Math.atan2((player.y + 15) - (this.y + 15), (player.x + 10) - (this.x + 10));
                        const speed = this.type === 3 ? 600 : 450;
                        bullets.push({
                            x: this.x + 12, y: this.y + 15,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            isReflected: false
                        });
                        this.shootTimer = this.type === 3 ? 2.0 : 1.4;
                    }
                }
            }
        },

        draw() {
            if (!this.alive) {
                ctx.fillStyle = "#660011";
                ctx.fillRect(this.x, this.y + this.h - 8, this.h, 8);
                return;
            }
            if (this.type === 1) drawEnemyType1(ctx, this.x, this.y, this.facingDir);
            else if (this.type === 2) drawEnemyType2(ctx, this.x, this.y, this.facingDir);
            else if (this.type === 3) drawEnemyType3(ctx, this.x, this.y, this.facingDir);
            else if (this.type === 4) drawEnemyType4(ctx, this.x, this.y, this.facingDir);
        }
    };
}

function startGame(mode) {
    gameMode = mode;
    gameState = "PLAYING";
    currentStage = 1;
    killCount = 0;
    if (lobbyScreen) lobbyScreen.classList.add("hidden");
    if (uiLayer) uiLayer.classList.remove("hidden");
    resetGame();
}

function returnToLobby() {
    gameState = "LOBBY";
    if (lobbyScreen) lobbyScreen.classList.remove("hidden");
    if (uiLayer) uiLayer.classList.add("hidden");
}

function updateHUD() {
    if (scoreDisplay) scoreDisplay.innerText = `KILL: ${killCount}`;
    if (modeDisplay) {
        if (gameMode === "STAGE") {
            modeDisplay.innerText = `STAGE ${currentStage}`;
        } else {
            modeDisplay.innerText = `INFINITE SURVIVAL`;
        }
    }
}

function initStageEnemies() {
    enemies = [];
    let mapKey = ((currentStage - 1) % 3) + 1;
    platforms = stageMaps[mapKey];

    if (gameMode === "STAGE") {
        let enemyCount = 4 + currentStage;
        let positions = [
            { x: 450, y: 150 }, { x: 750, y: 300 }, { x: 1080, y: 540 },
            { x: 350, y: 540 }, { x: 950, y: 150 }, { x: 1100, y: 150 },
            { x: 200, y: 200 }, { x: 800, y: 500 }
        ];
        for (let i = 0; i < Math.min(enemyCount, positions.length); i++) {
            let type = (i % 4) + 1; 
            enemies.push(createEnemy(type, positions[i].x, positions[i].y));
        }
    }
}

function spawnRandomEnemy() {
    let type = Math.floor(Math.random() * 4) + 1;
    let spawnPoints = [{ x: 1200, y: 540 }, { x: 1200, y: 200 }, { x: 50, y: 200 }, { x: 50, y: 540 }];
    let pt = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    enemies.push(createEnemy(type, pt.x, pt.y));
}

function resetGame() {
    player.x = 100; player.y = 550;
    player.vx = 0; player.vy = 0;
    player.isDead = false;
    player.isEvading = false;
    player.isInvincible = false;
    player.isDashing = false;
    player.hasAirDashed = false;
    player.evadeCooldown = 0;
    
    bullets = [];
    bloodParticles = [];
    sparkParticles = [];
    dustParticles = [];
    dashLines = [];
    afterimages = [];
    slashEffects = [];
    chronos.energy = chronos.maxEnergy;
    spawnTimer = 0;

    updateHUD();
    initStageEnemies();
}

function spawnBlood(x, y, dirAngle) {
    for (let i = 0; i < 45; i++) {
        const spreadAngle = dirAngle + (Math.random() - 0.5) * 1.4;
        const speed = Math.random() * 450 + 100;
        bloodParticles.push({
            x: x, y: y,
            vx: Math.cos(spreadAngle) * speed,
            vy: Math.sin(spreadAngle) * speed,
            radius: Math.random() * 3.5 + 1,
            life: Math.random() * 0.5 + 0.3
        });
    }
}

function isColliding(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}

function gameLoop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (isNaN(dt) || dt > 0.1) dt = 0.1;

    if (gameState === "PLAYING") {
        if (gameMode === "INFINITE" && !player.isDead) {
            spawnTimer += dt;
            if (spawnTimer >= 2.0) {
                spawnRandomEnemy();
                spawnTimer = 0;
            }
        } else if (gameMode === "STAGE" && !player.isDead) {
            let activeEnemies = enemies.filter(e => e.alive).length;
            if (activeEnemies === 0 && enemies.length > 0) {
                currentStage++;
                resetGame();
            }
        }

        if (mouse.rightPressed && chronos.energy > 0) {
            chronos.active = true;
            timeScale = 0.18;
            chronos.energy -= dt * chronos.drainRate;
        } else {
            chronos.active = false;
            timeScale = 1.0;
            if (chronos.energy < chronos.maxEnergy) {
                chronos.energy += dt * chronos.rechargeRate;
            }
        }
        if (chronosFill) {
            chronosFill.style.width = `${Math.max(0, (chronos.energy / chronos.maxEnergy) * 100)}%`;
        }

        let effectiveDt = dt * timeScale;
        if (hitStopTimer > 0) {
            hitStopTimer -= dt;
            effectiveDt = 0;
        }

        if (effectiveDt > 0) {
            player.update(effectiveDt);
            enemies.forEach(e => e.update(effectiveDt));

            for (let i = bullets.length - 1; i >= 0; i--) {
                let b = bullets[i];
                b.x += b.vx * effectiveDt;
                b.y += b.vy * effectiveDt;

                platforms.forEach(p => {
                    if (b.x > p.x && b.x < p.x + p.w && b.y > p.y && b.y < p.y + p.h) {
                        bullets.splice(i, 1);
                    }
                });

                if (!b.isReflected && isColliding(player, { x: b.x - 4, y: b.y - 4, w: 8, h: 8 })) {
                    if (!player.isInvincible) {
                        player.isDead = true;
                        cameraShakeTime = 0.4;
                        cameraShakeIntensity = 12;
                        spawnBlood(player.x + player.w / 2, player.y + player.h / 2, Math.PI);
                    }
                }

                if (b.isReflected) {
                    enemies.forEach(e => {
                        if (e.alive && isColliding(e, { x: b.x - 4, y: b.y - 4, w: 8, h: 8 })) {
                            e.alive = false;
                            killCount++;
                            updateHUD();
                            spawnBlood(e.x + e.w / 2, e.y + e.h / 2, Math.atan2(b.vy, b.vx));
                        }
                    });
                }
            }

            for (let i = bloodParticles.length - 1; i >= 0; i--) {
                let p = bloodParticles[i];
                p.x += p.vx * effectiveDt;
                p.y += p.vy * effectiveDt;
                p.vy += gravity * 0.5 * effectiveDt;
                p.life -= effectiveDt;
                if (p.life <= 0) bloodParticles.splice(i, 1);
            }

            for (let i = sparkParticles.length - 1; i >= 0; i--) {
                let sp = sparkParticles[i];
                sp.x += sp.vx * effectiveDt;
                sp.y += sp.vy * effectiveDt;
                sp.life -= effectiveDt;
                if (sp.life <= 0) sparkParticles.splice(i, 1);
            }

            for (let i = dustParticles.length - 1; i >= 0; i--) {
                let dp = dustParticles[i];
                dp.x += dp.vx * effectiveDt;
                dp.y += dp.vy * effectiveDt;
                dp.life -= effectiveDt;
                if (dp.life <= 0) dustParticles.splice(i, 1);
            }
        }
    }

    ctx.save();

    if (cameraShakeTime > 0) {
        cameraShakeTime -= dt;
        ctx.translate((Math.random() - 0.5) * cameraShakeIntensity, (Math.random() - 0.5) * cameraShakeIntensity);
    }

    ctx.fillStyle = chronos.active ? "#05131d" : "#0a0a10";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#1e1e28";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

    for (let i = afterimages.length - 1; i >= 0; i--) {
        let img = afterimages[i];
        img.life -= dt;
        if (img.life <= 0) { afterimages.splice(i, 1); continue; }
        drawPlayerSprite(ctx, img.x, img.y, img.facing, true, img.isEvading);
    }

    dustParticles.forEach(dp => {
        ctx.fillStyle = dp.color;
        ctx.beginPath();
        ctx.arc(dp.x, dp.y, dp.size, 0, Math.PI * 2);
        ctx.fill();
    });

    for (let i = dashLines.length - 1; i >= 0; i--) {
        let dl = dashLines[i];
        dl.life -= dt;
        if (dl.life <= 0) { dashLines.splice(i, 1); continue; }

        const alpha = dl.life / dl.maxLife;
        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(dl.x1, dl.y1);
        ctx.lineTo(dl.x2, dl.y2);
        ctx.stroke();
    }

    for (let i = slashEffects.length - 1; i >= 0; i--) {
        let s = slashEffects[i];
        s.life -= dt;
        if (s.life <= 0) { slashEffects.splice(i, 1); continue; }

        const progress = 1 - (s.life / s.maxLife);
        ctx.save();
        ctx.translate(s.x, s.y);

        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 10; 
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, s.angle - 1.3 + (progress * 0.4), s.angle + 1.3);
        ctx.stroke();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, s.angle - 1.1 + (progress * 0.4), s.angle + 1.1);
        ctx.stroke();

        ctx.restore();
    }

    sparkParticles.forEach(sp => {
        ctx.fillStyle = sp.color;
        ctx.fillRect(sp.x, sp.y, 2, 2);
    });

    ctx.fillStyle = "#ff0044";
    bloodParticles.forEach(p => ctx.fillRect(p.x, p.y, p.radius, p.radius));

    bullets.forEach(b => {
        ctx.fillStyle = b.isReflected ? "#00ffff" : "#ffcc00";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    enemies.forEach(e => e.draw());
    if (gameState === "PLAYING" && !player.isDead) {
        player.draw();
    }

    if (gameState === "PLAYING" && player.isDead) {
        ctx.fillStyle = "#ff0055";
        ctx.font = "900 36px Consolas";
        ctx.textAlign = "center";
        ctx.shadowColor = "#ff0055";
        ctx.shadowBlur = 12;
        ctx.fillText("STAGE FAILED", canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillStyle = "#ffffff";
        ctx.font = "20px Consolas";
        ctx.fillText("PRESS 'R' TO REVERSE TIME", canvas.width / 2, canvas.height / 2 + 35);
        ctx.shadowBlur = 0;
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);