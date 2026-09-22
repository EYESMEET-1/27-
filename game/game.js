const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const overlayEyebrow = document.getElementById("overlayEyebrow");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const upgradeChoices = document.getElementById("upgradeChoices");
const primaryAction = document.getElementById("primaryAction");
const heatWarning = document.getElementById("heatWarning");
const pauseButton = document.getElementById("pauseButton");

const hpFill = document.getElementById("healthFill");
const heatFill = document.getElementById("heatFill");
const healthValue = document.getElementById("healthValue");
const heatValue = document.getElementById("heatValue");
const heatState = document.getElementById("heatState");
const waveValue = document.getElementById("waveValue");
const scoreValue = document.getElementById("scoreValue");
const enemyValue = document.getElementById("enemyValue");
const dashValue = document.getElementById("dashValue");
const pulseValue = document.getElementById("pulseValue");
const killValue = document.getElementById("killValue");
const overheatValue = document.getElementById("overheatValue");
const buildValue = document.getElementById("buildValue");
const buildList = document.getElementById("buildList");
const heatPanel = document.querySelector(".heat-block");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();
const mouse = { x: WIDTH / 2, y: HEIGHT / 2 - 180, down: false };
const bullets = [];
const enemyBullets = [];
const enemies = [];
const particles = [];
const pickups = [];
const effects = [];
const damageTexts = [];
const spawnQueue = [];

const ENEMY_TYPES = {
  hunter: {
    label: "追猎者",
    radius: 15,
    speed: 88,
    health: 28,
    damage: 8,
    color: "#e86b63",
    score: 10,
  },
  heavy: {
    label: "重装体",
    radius: 24,
    speed: 58,
    health: 72,
    damage: 14,
    color: "#d99a42",
    score: 18,
  },
  ripper: {
    label: "撕裂者",
    radius: 17,
    speed: 108,
    health: 42,
    damage: 11,
    color: "#dd7fae",
    score: 14,
  },
  gunner: {
    label: "枪手",
    radius: 18,
    speed: 62,
    health: 40,
    damage: 9,
    color: "#6f9dd8",
    score: 16,
  },
  elite: {
    label: "炉心精英",
    radius: 31,
    speed: 70,
    health: 220,
    damage: 20,
    color: "#f0b65a",
    score: 80,
  },
};

const CLASSES = {
  pulse: {
    name: "脉冲突袭",
    description: "平衡射速、热量和冲刺，适合主动升温。",
    apply: () => {},
  },
  bastion: {
    name: "堡垒回路",
    description: "生命和减伤更高，冲刺更快，但基础伤害较低。",
    apply: (state) => {
      state.stats.damage = 10;
      state.stats.maxHealth = 130;
      state.player.health = 130;
      state.player.speed = 225;
      state.stats.dashCooldown = 1.8;
      state.stats.damageReduction = 0.12;
    },
  },
  fracture: {
    name: "裂解弹头",
    description: "初始拥有爆炸子弹，单发更强，但射速和热量压力更高。",
    apply: (state) => {
      state.stats.damage = 10;
      state.stats.fireInterval = 0.36;
      state.stats.explosive = 1;
      state.stats.heatPerShot = 1.9;
    },
  },
};

const UPGRADES = {
  damage: {
    name: "脉冲增幅",
    description: "子弹伤害增加 5。",
    apply: (state) => {
      state.stats.damage += 5;
    },
  },
  fireRate: {
    name: "冷却回路",
    description: "射击间隔降低 15%。",
    apply: (state) => {
      state.stats.fireInterval = Math.max(0.10, state.stats.fireInterval * 0.85);
    },
  },
  pierce: {
    name: "穿透弹",
    description: "子弹额外穿透一个敌人。",
    apply: (state) => {
      state.stats.pierce += 1;
    },
  },
  explosive: {
    name: "裂解弹头",
    description: "子弹命中后产生小范围爆炸。",
    apply: (state) => {
      state.stats.explosive += 1;
    },
  },
  vitality: {
    name: "强韧骨架",
    description: "最大生命增加 20，并恢复 20。",
    apply: (state) => {
      state.stats.maxHealth += 20;
      state.player.health = Math.min(state.stats.maxHealth, state.player.health + 20);
    },
  },
  cooling: {
    name: "温度缓冲",
    description: "自然冷却速度提高 40%。",
    apply: (state) => {
      state.stats.cooling *= 1.4;
    },
  },
  dash: {
    name: "闪避电容",
    description: "冲刺冷却降低 25%。",
    apply: (state) => {
      state.stats.dashCooldown *= 0.75;
    },
  },
  armor: {
    name: "热能护盾",
    description: "受到伤害降低 12%。",
    apply: (state) => {
      state.stats.damageReduction = Math.min(0.6, state.stats.damageReduction + 0.12);
    },
  },
  shockDamage: {
    name: "过压脉冲",
    description: "右键脉冲伤害增加 18。",
    apply: (state) => {
      state.stats.pulseDamage += 18;
    },
  },
  shockCooldown: {
    name: "脉冲电容",
    description: "右键脉冲冷却降低 25%。",
    apply: (state) => {
      state.stats.pulseCooldown *= 0.75;
    },
  },
  shockRadius: {
    name: "扩散脉冲",
    description: "右键脉冲范围增加 24。",
    apply: (state) => {
      state.stats.pulseRadius += 24;
    },
  },
  siphon: {
    name: "余热回收",
    description: "每次击杀恢复 2 点生命。",
    apply: (state) => {
      state.stats.lifesteal += 2;
    },
  },
  heatMastery: {
    name: "热控核心",
    description: "热量增伤效果提高 50%。",
    apply: (state) => {
      state.stats.heatScale *= 1.5;
    },
  },
};

let state = createState();
let lastTime = performance.now();
let uiTimer = 0;

function createState() {
  return {
    mode: "menu",
    elapsed: 0,
    score: 0,
    kills: 0,
    overheatCount: 0,
    maxHeatReached: 0,
    wave: 1,
    waveActive: false,
    waveTransition: 0,
    screenShake: 0,
    build: [],
    classKey: "pulse",
    offer: [],
    stats: {
      damage: 12,
      fireInterval: 0.28,
      bulletSpeed: 720,
      pierce: 0,
      explosive: 0,
      maxHealth: 100,
      cooling: 4,
      dashCooldown: 2.2,
      damageReduction: 0,
      heatPerShot: 1.5,
      heatScale: 0.008,
      pulseDamage: 34,
      pulseCooldown: 3.5,
      pulseRadius: 118,
      lifesteal: 0,
    },
    player: {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      radius: 18,
      speed: 260,
      health: 100,
      heat: 0,
      aimX: 1,
      aimY: 0,
      fireTimer: 0,
      dashCooldown: 0,
      pulseCooldown: 0,
      dashTimer: 0,
      invulnerable: 0,
      overheatLock: 0,
    },
  };
}

function resetGame() {
  state = createState();
  bullets.length = 0;
  enemyBullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  pickups.length = 0;
  effects.length = 0;
  damageTexts.length = 0;
  spawnQueue.length = 0;
  keys.clear();
  mouse.down = false;
  mouse.rightDown = false;
  state.classKey = "pulse";
  showClassSelection();
  updateUI(true);
  lastTime = performance.now();
}

function startRun(classKey = "pulse") {
  state.classKey = classKey;
  CLASSES[classKey].apply(state);
  state.build = [`class:${classKey}`];
  state.mode = "running";
  state.wave = 1;
  beginWave(1);
  hideOverlay();
  renderBuild();
  lastTime = performance.now();
}

function beginWave(wave) {
  state.wave = wave;
  state.waveActive = true;
  state.waveTransition = 0;
  spawnQueue.length = 0;
  enemies.length = 0;
  bullets.length = 0;
  enemyBullets.length = 0;
  pickups.length = 0;

  const counts = {
    1: { hunter: 5 },
    2: { hunter: 5, heavy: 2 },
    3: { hunter: 4, ripper: 3, gunner: 2 },
    4: { hunter: 5, heavy: 3, ripper: 3, gunner: 3 },
    5: { hunter: 5, heavy: 4, ripper: 4, gunner: 4, elite: 1 },
  }[wave];
  state.waveTotalEnemies = Object.values(counts).reduce((total, count) => total + count, 0);

  for (const [type, count] of Object.entries(counts)) {
    for (let index = 0; index < count; index += 1) {
      spawnQueue.push(type);
    }
  }
  shuffle(spawnQueue);
  state.player.heat = Math.min(state.player.heat, 35);
}

function spawnEnemy(typeName) {
  const type = ENEMY_TYPES[typeName];
  const margin = 42;
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = Math.random() * WIDTH;
    y = margin;
  } else if (side === 1) {
    x = WIDTH - margin;
    y = Math.random() * HEIGHT;
  } else if (side === 2) {
    x = Math.random() * WIDTH;
    y = HEIGHT - margin;
  } else {
    x = margin;
    y = Math.random() * HEIGHT;
  }

  const heatFactor = state.player.heat / 100;
  const speedMultiplier = 1 + Math.max(0, heatFactor - 0.6) * 0.55;
  enemies.push({
    typeName,
    x,
    y,
    radius: type.radius,
    speed: type.speed * speedMultiplier,
    health: type.health,
    maxHealth: type.health,
    damage: type.damage,
    color: type.color,
    score: type.score,
    attackTimer: 0,
    specialTimer: typeName === "elite" ? 2.4 : 1.8 + Math.random() * 1.2,
    chargeTimer: 0,
    phaseIndex: 0,
    hitFlash: 0,
    attackFlash: 0,
    angle: Math.atan2(state.player.y - y, state.player.x - x),
    phase: Math.random() * Math.PI * 2,
  });
}

function scheduleSpawns(delta) {
  if (!state.waveActive || spawnQueue.length === 0) return;
  state.spawnTimer = (state.spawnTimer || 0) - delta;
  const activeLimit = 7 + state.wave;
  if (state.spawnTimer <= 0 && enemies.length < activeLimit) {
    spawnEnemy(spawnQueue.shift());
    state.spawnTimer = Math.max(0.22, 0.62 - state.wave * 0.05);
  }
}

function update(delta) {
  if (state.mode !== "running") return;
  state.elapsed += delta;
  state.screenShake = Math.max(0, state.screenShake - delta * 20);

  const player = state.player;
  player.fireTimer -= delta;
  player.dashCooldown = Math.max(0, player.dashCooldown - delta);
  player.pulseCooldown = Math.max(0, player.pulseCooldown - delta);
  player.dashTimer = Math.max(0, player.dashTimer - delta);
  player.invulnerable = Math.max(0, player.invulnerable - delta);
  player.overheatLock = Math.max(0, player.overheatLock - delta);

  const aimAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  player.aimX = Math.cos(aimAngle);
  player.aimY = Math.sin(aimAngle);

  let moveX = 0;
  let moveY = 0;
  if (keys.has("w") || keys.has("arrowup")) moveY -= 1;
  if (keys.has("s") || keys.has("arrowdown")) moveY += 1;
  if (keys.has("a") || keys.has("arrowleft")) moveX -= 1;
  if (keys.has("d") || keys.has("arrowright")) moveX += 1;
  const moveLength = Math.hypot(moveX, moveY) || 1;
  moveX /= moveLength;
  moveY /= moveLength;

  if ((keys.has(" ") || keys.has("space")) && player.dashCooldown <= 0) {
    let dashX = moveX;
    let dashY = moveY;
    if (dashX === 0 && dashY === 0) {
      dashX = player.aimX;
      dashY = player.aimY;
    }
    player.dashTimer = 0.18;
    player.dashCooldown = state.stats.dashCooldown;
    player.invulnerable = 0.24;
    player.heat = Math.max(0, player.heat - 18);
    player.dashX = dashX;
    player.dashY = dashY;
    burstParticles(player.x, player.y, "#56d8d0", 10, 120);
  }
  keys.delete(" ");
  keys.delete("space");

  const speedMultiplier = player.dashTimer > 0 ? 3.2 : 1;
  if (player.dashTimer > 0) {
    player.x += (player.dashX || 0) * player.speed * speedMultiplier * delta;
    player.y += (player.dashY || 0) * player.speed * speedMultiplier * delta;
  } else {
    player.x += moveX * player.speed * delta;
    player.y += moveY * player.speed * delta;
  }
  player.x = clamp(player.x, player.radius, WIDTH - player.radius);
  player.y = clamp(player.y, player.radius, HEIGHT - player.radius);

  if (mouse.down && player.fireTimer <= 0 && player.overheatLock <= 0) {
    fireBullet();
  }

  if (!mouse.down && player.heat > 0) {
    player.heat = Math.max(0, player.heat - state.stats.cooling * delta);
  } else if (player.heat > 0) {
    player.heat = Math.max(0, player.heat - state.stats.cooling * 0.18 * delta);
  }
  state.maxHeatReached = Math.max(state.maxHeatReached, player.heat);

  if (player.heat >= 100) triggerOverheat();
  if (mouse.rightDown && player.pulseCooldown <= 0) usePulseBlast();

  scheduleSpawns(delta);
  updateBullets(delta);
  updateEnemyBullets(delta);
  updateEnemies(delta);
  updatePickups(delta);
  updateEffects(delta);
  updateDamageTexts(delta);
  updateParticles(delta);
  checkWaveComplete();
  updateUI(false);
}

function fireBullet() {
  const player = state.player;
  const heatMultiplier = 1 + player.heat * state.stats.heatScale;
  const speed = state.stats.bulletSpeed;
  bullets.push({
    x: player.x + player.aimX * 24,
    y: player.y + player.aimY * 24,
    vx: player.aimX * speed,
    vy: player.aimY * speed,
    radius: 4,
    damage: state.stats.damage * heatMultiplier,
    life: 1.6,
    pierce: state.stats.pierce,
    explosive: state.stats.explosive,
    hitIds: new Set(),
  });
  player.fireTimer = state.stats.fireInterval * (1 - player.heat * 0.002);
  const heatGain = player.overheatLock > 0 ? state.stats.heatPerShot * 0.5 : state.stats.heatPerShot;
  player.heat = Math.min(100, player.heat + heatGain);
  state.screenShake = Math.min(4, state.screenShake + 0.5);
}

function usePulseBlast() {
  const player = state.player;
  const heatMultiplier = 1 + player.heat * state.stats.heatScale;
  const radius = state.stats.pulseRadius;
  const damage = state.stats.pulseDamage * heatMultiplier;

  player.pulseCooldown = state.stats.pulseCooldown;
  effects.push({
    type: "pulse",
    x: player.x,
    y: player.y,
    radius: 18,
    maxRadius: radius,
    life: 0.42,
    maxLife: 0.42,
  });
  state.screenShake = Math.min(10, state.screenShake + 3);
  burstParticles(player.x, player.y, "#56d8d0", 18, 190);

  for (let index = enemies.length - 1; index >= 0; index -= 1) {
    const enemy = enemies[index];
    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (distance > radius + enemy.radius) continue;
    damageEnemy(enemy, damage, index);
    const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
    enemy.x += Math.cos(angle) * 48;
    enemy.y += Math.sin(angle) * 48;
  }
}

function updateBullets(delta) {
  for (let index = bullets.length - 1; index >= 0; index -= 1) {
    const bullet = bullets[index];
    bullet.x += bullet.vx * delta;
    bullet.y += bullet.vy * delta;
    bullet.life -= delta;

    if (
      bullet.life <= 0 ||
      bullet.x < -20 ||
      bullet.x > WIDTH + 20 ||
      bullet.y < -20 ||
      bullet.y > HEIGHT + 20
    ) {
      bullets.splice(index, 1);
      continue;
    }

    let bulletRemoved = false;
    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = enemies[enemyIndex];
      if (bullet.hitIds.has(enemy)) continue;
      if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) <= bullet.radius + enemy.radius) {
        bullet.hitIds.add(enemy);
        damageEnemy(enemy, bullet.damage, enemyIndex);
        burstParticles(bullet.x, bullet.y, "#f1b55d", 5, 90);
        if (bullet.explosive > 0) {
          explodeBullet(bullet.x, bullet.y, bullet.explosive, enemy);
        }
        if (bullet.pierce > 0) {
          bullet.pierce -= 1;
        } else {
          bullets.splice(index, 1);
          bulletRemoved = true;
        }
        break;
      }
    }
    if (bulletRemoved) continue;
  }
}

function updateEnemyBullets(delta) {
  const player = state.player;
  for (let index = enemyBullets.length - 1; index >= 0; index -= 1) {
    const bullet = enemyBullets[index];
    bullet.x += bullet.vx * delta;
    bullet.y += bullet.vy * delta;
    bullet.life -= delta;
    if (
      bullet.life <= 0 ||
      bullet.x < -30 ||
      bullet.x > WIDTH + 30 ||
      bullet.y < -30 ||
      bullet.y > HEIGHT + 30
    ) {
      enemyBullets.splice(index, 1);
      continue;
    }
    if (
      player.invulnerable <= 0 &&
      Math.hypot(bullet.x - player.x, bullet.y - player.y) <= bullet.radius + player.radius
    ) {
      damagePlayer(bullet.damage);
      enemyBullets.splice(index, 1);
    }
  }
}

function explodeBullet(x, y, level, directTarget) {
  const radius = 42 + level * 14;
  const damage = 8 + level * 7;
  burstParticles(x, y, "#dd7fae", 12, 150);
  for (let index = enemies.length - 1; index >= 0; index -= 1) {
    const enemy = enemies[index];
    if (enemy === directTarget) continue;
    if (Math.hypot(x - enemy.x, y - enemy.y) <= radius + enemy.radius) {
      damageEnemy(enemy, damage, index);
    }
  }
}

function updateEnemies(delta) {
  const player = state.player;
  for (let index = enemies.length - 1; index >= 0; index -= 1) {
    const enemy = enemies[index];
    enemy.attackTimer = Math.max(0, enemy.attackTimer - delta);
    enemy.specialTimer = Math.max(0, enemy.specialTimer - delta);
    enemy.chargeTimer = Math.max(0, enemy.chargeTimer - delta);
    enemy.hitFlash = Math.max(0, enemy.hitFlash - delta * 6);
    enemy.attackFlash = Math.max(0, enemy.attackFlash - delta * 5);

    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    enemy.angle = angle;
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (enemy.typeName === "elite") {
      updateElite(enemy, angle, distance, delta);
    } else if (enemy.typeName === "gunner") {
      let moveAngle = angle;
      if (distance < 190) moveAngle = angle + Math.PI;
      else if (distance < 280) moveAngle = angle + Math.PI / 2;
      const strafe = distance >= 190 && distance <= 280 ? 1 : 0;
      enemy.x += Math.cos(moveAngle + strafe * Math.PI / 2) * enemy.speed * delta;
      enemy.y += Math.sin(moveAngle + strafe * Math.PI / 2) * enemy.speed * delta;
      if (enemy.attackTimer <= 0) {
        fireEnemyBullet(enemy, player.x, player.y, 255, enemy.damage);
        enemy.attackTimer = 2.1;
        enemy.attackFlash = 1;
      }
    } else {
      const speedBoost =
        enemy.typeName === "ripper" ? 1 + Math.sin(state.elapsed * 4 + enemy.phase) * 0.18 : 1;
      enemy.x += Math.cos(angle) * enemy.speed * speedBoost * delta;
      enemy.y += Math.sin(angle) * enemy.speed * speedBoost * delta;
    }
    enemy.x = clamp(enemy.x, enemy.radius, WIDTH - enemy.radius);
    enemy.y = clamp(enemy.y, enemy.radius, HEIGHT - enemy.radius);

    const collisionDistance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (
      collisionDistance <= player.radius + enemy.radius &&
      enemy.attackTimer <= 0 &&
      player.invulnerable <= 0
    ) {
      damagePlayer(enemy.damage);
      enemy.attackTimer = 0.75;
    }
  }
}

function updateElite(enemy, angle, distance, delta) {
  const healthRatio = enemy.health / enemy.maxHealth;
  const phaseIndex = healthRatio > 0.66 ? 1 : healthRatio > 0.33 ? 2 : 3;
  if (phaseIndex !== enemy.phaseIndex) {
    enemy.phaseIndex = phaseIndex;
    enemy.specialTimer = 0.7;
    effects.push({
      type: "pulse",
      x: enemy.x,
      y: enemy.y,
      radius: 20,
      maxRadius: 150,
      life: 0.5,
      maxLife: 0.5,
      color: "#f0b65a",
    });
  }

  if (phaseIndex === 1) {
    enemy.x += Math.cos(angle) * enemy.speed * delta;
    enemy.y += Math.sin(angle) * enemy.speed * delta;
    if (enemy.specialTimer <= 0) {
      for (let index = 0; index < 8; index += 1) {
        const spread = (Math.PI * 2 * index) / 8;
        fireEnemyBullet(enemy, enemy.x + Math.cos(spread), enemy.y + Math.sin(spread), 205, 8);
      }
      enemy.specialTimer = 2.8;
      enemy.attackFlash = 1;
    }
  } else if (phaseIndex === 2) {
    let moveAngle = angle;
    if (distance < 160) moveAngle = angle + Math.PI;
    else if (distance < 260) moveAngle = angle + Math.PI / 2;
    enemy.x += Math.cos(moveAngle) * enemy.speed * 0.9 * delta;
    enemy.y += Math.sin(moveAngle) * enemy.speed * 0.9 * delta;
    if (enemy.specialTimer <= 0) {
      const baseAngle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
      for (const offset of [-0.22, 0, 0.22]) {
        fireEnemyBullet(
          enemy,
          enemy.x + Math.cos(baseAngle + offset),
          enemy.y + Math.sin(baseAngle + offset),
          285,
          9
        );
      }
      enemy.specialTimer = 1.8;
      enemy.attackFlash = 1;
    }
  } else {
    if (enemy.chargeTimer > 0) {
      enemy.x += (enemy.chargeX || 0) * 310 * delta;
      enemy.y += (enemy.chargeY || 0) * 310 * delta;
    } else {
      enemy.x += Math.cos(angle) * enemy.speed * 0.72 * delta;
      enemy.y += Math.sin(angle) * enemy.speed * 0.72 * delta;
      if (enemy.specialTimer <= 0) {
        if (Math.random() < 0.5) {
          enemy.chargeX = Math.cos(angle);
          enemy.chargeY = Math.sin(angle);
          enemy.chargeTimer = 0.55;
          enemy.specialTimer = 5.2;
        } else {
          for (let index = 0; index < 2; index += 1) {
            spawnEnemy("hunter");
          }
          enemy.specialTimer = 5.2;
        }
        enemy.attackFlash = 1;
      }
    }
  }
}

function fireEnemyBullet(enemy, targetX, targetY, speed, damage) {
  const angle = Math.atan2(targetY - enemy.y, targetX - enemy.x);
  enemyBullets.push({
    x: enemy.x + Math.cos(angle) * enemy.radius,
    y: enemy.y + Math.sin(angle) * enemy.radius,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 6,
    damage,
    life: 4,
  });
}

function damagePlayer(rawDamage) {
  const player = state.player;
  if (player.invulnerable > 0) return;
  const damage = rawDamage * (1 - state.stats.damageReduction);
  player.health -= damage;
  player.invulnerable = 0.6;
  state.screenShake = 8;
  burstParticles(player.x, player.y, "#e86b63", 12, 170);
  addDamageText(player.x, player.y - 24, `-${damage.toFixed(0)}`, "#ff9b93");
  if (player.health <= 0) endRun(false);
}

function spawnPickup(x, y, type, guaranteed) {
  pickups.push({
    x: clamp(x, 24, WIDTH - 24),
    y: clamp(y, 24, HEIGHT - 24),
    type,
    guaranteed,
    radius: type === "repair" ? 12 : 10,
    life: 12,
    phase: Math.random() * Math.PI * 2,
  });
}

function updatePickups(delta) {
  const player = state.player;
  for (let index = pickups.length - 1; index >= 0; index -= 1) {
    const pickup = pickups[index];
    pickup.life -= delta;
    if (pickup.life <= 0) {
      pickups.splice(index, 1);
      continue;
    }
    const distance = Math.hypot(pickup.x - player.x, pickup.y - player.y);
    if (distance <= pickup.radius + player.radius + 8) {
      if (pickup.type === "cooling") {
        player.heat = Math.max(0, player.heat - 26);
        addDamageText(player.x, player.y - 24, "-26 热量", "#56d8d0");
        burstParticles(player.x, player.y, "#56d8d0", 12, 120);
      } else {
        const healed = Math.min(18, state.stats.maxHealth - player.health);
        player.health += healed;
        addDamageText(player.x, player.y - 24, `+${healed.toFixed(0)} 生命`, "#6cc891");
        burstParticles(player.x, player.y, "#6cc891", 12, 120);
      }
      pickups.splice(index, 1);
    }
  }
}

function updateEffects(delta) {
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    const effect = effects[index];
    effect.life -= delta;
    effect.radius += ((effect.maxRadius - effect.radius) / effect.maxLife) * delta;
    if (effect.life <= 0) effects.splice(index, 1);
  }
}

function updateDamageTexts(delta) {
  for (let index = damageTexts.length - 1; index >= 0; index -= 1) {
    const text = damageTexts[index];
    text.y -= 24 * delta;
    text.life -= delta;
    if (text.life <= 0) damageTexts.splice(index, 1);
  }
}

function addDamageText(x, y, text, color) {
  damageTexts.push({
    x,
    y,
    text,
    color,
    life: 0.65,
    maxLife: 0.65,
  });
}

function damageEnemy(enemy, damage, enemyIndex) {
  enemy.health -= damage;
  enemy.hitFlash = 1;
  if (enemy.health > 0) return;

  state.score += enemy.score;
  state.kills += 1;
  const heatGain = enemy.typeName === "elite" ? 12 : 5;
  state.player.heat = Math.min(100, state.player.heat + heatGain);
  if (state.stats.lifesteal > 0) {
    const healed = Math.min(
      state.stats.lifesteal,
      state.stats.maxHealth - state.player.health
    );
    state.player.health += healed;
    if (healed > 0) addDamageText(enemy.x, enemy.y, `+${healed.toFixed(0)}`, "#6cc891");
  }
  if (enemy.typeName === "elite") {
    spawnPickup(enemy.x, enemy.y, "repair", true);
    spawnPickup(enemy.x + 34, enemy.y, "cooling", true);
  } else if (Math.random() < 0.28) {
    spawnPickup(enemy.x, enemy.y, Math.random() < 0.55 ? "cooling" : "repair", false);
  }
  burstParticles(enemy.x, enemy.y, enemy.color, enemy.typeName === "elite" ? 28 : 14, 180);
  enemies.splice(enemyIndex, 1);
}

function triggerOverheat() {
  const player = state.player;
  player.health -= 12;
  player.heat = 55;
  player.overheatLock = 2;
  state.overheatCount += 1;
  state.screenShake = 14;
  burstParticles(player.x, player.y, "#f1b55d", 28, 230);
  for (const enemy of enemies) {
    enemy.speed *= 1.15;
  }
  if (player.health <= 0) endRun(false);
}

function checkWaveComplete() {
  if (!state.waveActive || spawnQueue.length > 0 || enemies.length > 0) return;
  state.waveActive = false;
  if (state.wave >= 5) {
    endRun(true);
    return;
  }
  state.mode = "upgrade";
  state.offer = chooseUpgradeOffer();
  showUpgradeOverlay();
}

function chooseUpgradeOffer() {
  const remaining = Object.keys(UPGRADES).filter((key) => !state.build.includes(key));
  shuffle(remaining);
  return remaining.slice(0, 3);
}

function chooseUpgrade(key) {
  const upgrade = UPGRADES[key];
  if (!upgrade) return;
  upgrade.apply(state);
  state.build.push(key);
  renderBuild();
  beginWave(state.wave + 1);
  state.mode = "running";
  hideOverlay();
  lastTime = performance.now();
}

function endRun(victory) {
  state.mode = victory ? "victory" : "gameover";
  const title = victory ? "区域肃清" : "作战失败";
  const text = victory
    ? `击杀 ${state.kills} 个敌人，最高热量 ${state.maxHeatReached.toFixed(0)}。`
    : `坚持到第 ${state.wave} 波，最高热量 ${state.maxHeatReached.toFixed(0)}。`;
  showOverlay(victory ? "任务完成" : "战斗报告", title, text, "重新开始");
}

function showClassSelection() {
  overlayEyebrow.textContent = "构筑选择";
  overlayTitle.textContent = "选择战斗回路";
  overlayText.textContent = "不同回路会改变开局生命、伤害、热量和构筑方向。";
  upgradeChoices.replaceChildren();
  for (const [key, classInfo] of Object.entries(CLASSES)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade-button";
    button.innerHTML = `<strong>${classInfo.name}</strong><span>${classInfo.description}</span>`;
    button.addEventListener("click", () => startRun(key));
    upgradeChoices.appendChild(button);
  }
  primaryAction.hidden = true;
  overlay.hidden = false;
}

function showUpgradeOverlay() {
  overlayEyebrow.textContent = `第 ${state.wave} 波结束`;
  overlayTitle.textContent = "选择一项构筑升级";
  overlayText.textContent = "升级会改变后续战斗中的热量和输出处理方式。";
  upgradeChoices.replaceChildren();
  for (const key of state.offer) {
    const upgrade = UPGRADES[key];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade-button";
    button.innerHTML = `<strong>${upgrade.name}</strong><span>${upgrade.description}</span>`;
    button.addEventListener("click", () => chooseUpgrade(key));
    upgradeChoices.appendChild(button);
  }
  primaryAction.hidden = true;
  overlay.hidden = false;
}

function showOverlay(eyebrow, title, text, actionLabel) {
  overlayEyebrow.textContent = eyebrow;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  upgradeChoices.replaceChildren();
  primaryAction.hidden = false;
  primaryAction.textContent = actionLabel;
  overlay.hidden = false;
}

function hideOverlay() {
  overlay.hidden = true;
}

function updateParticles(delta) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= 0.965;
    particle.vy *= 0.965;
    particle.life -= delta;
    if (particle.life <= 0) particles.splice(index, 1);
  }
}

function burstParticles(x, y, color, count, speed) {
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.25 + Math.random() * 0.75);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 0.25 + Math.random() * 0.45,
      maxLife: 0.7,
      radius: 1.5 + Math.random() * 3,
      color,
    });
  }
}

function draw() {
  ctx.save();
  if (state.screenShake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * state.screenShake,
      (Math.random() - 0.5) * state.screenShake
    );
  }
  drawArena();
  drawPickups();
  drawParticles();
  drawBullets();
  drawEnemyBullets();
  drawEnemies();
  drawPlayer();
  drawEffects();
  drawDamageTexts();
  ctx.restore();
  drawHud();
}

function drawArena() {
  ctx.fillStyle = "#081015";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "#14232c";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  const heat = state.player.heat / 100;
  if (heat > 0.7) {
    const pulse = 0.25 + Math.sin(state.elapsed * 9) * 0.12;
    ctx.strokeStyle = `rgba(236, 107, 99, ${heat * pulse})`;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, WIDTH - 8, HEIGHT - 8);
  }
}

function drawPlayer() {
  const player = state.player;
  const heat = player.heat / 100;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(Math.atan2(player.aimY, player.aimX));

  if (heat > 0.55) {
    ctx.beginPath();
    ctx.arc(0, 0, 31 + heat * 18, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(241, 181, 93, ${0.08 + heat * 0.12})`;
    ctx.fill();
  }

  ctx.shadowColor = "#56d8d0";
  ctx.shadowBlur = player.dashTimer > 0 ? 28 : 14;
  ctx.fillStyle = player.invulnerable > 0 ? "#c6fffb" : "#56d8d0";
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-15, -14);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-15, 14);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#071113";
  ctx.beginPath();
  ctx.arc(2, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle || 0);
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = enemy.typeName === "elite" ? 18 : 8;
    ctx.fillStyle = enemy.hitFlash > 0 ? "#ffffff" : enemy.color;

    if (enemy.typeName === "heavy" || enemy.typeName === "gunner") {
      ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
    } else if (enemy.typeName === "elite") {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
      ctx.rotate(-Math.PI / 4);
    } else {
      ctx.beginPath();
      ctx.moveTo(enemy.radius, 0);
      ctx.lineTo(-enemy.radius, -enemy.radius * 0.8);
      ctx.lineTo(-enemy.radius * 0.55, 0);
      ctx.lineTo(-enemy.radius, enemy.radius * 0.8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(238, 247, 250, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(enemy.radius * 0.55, 0);
    ctx.lineTo(enemy.radius * 1.2, 0);
    ctx.stroke();
    ctx.restore();

    if (enemy.attackFlash > 0) {
      ctx.save();
      ctx.globalAlpha = enemy.attackFlash * 0.55;
      ctx.strokeStyle = enemy.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (enemy.health < enemy.maxHealth) {
      const width = enemy.radius * 2;
      ctx.fillStyle = "#2a3339";
      ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 10, width, 4);
      ctx.fillStyle = enemy.color;
      ctx.fillRect(
        enemy.x - enemy.radius,
        enemy.y - enemy.radius - 10,
        width * (enemy.health / enemy.maxHealth),
        4
      );
    }
  }
}

function drawBullets() {
  ctx.save();
  ctx.shadowColor = "#f1b55d";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#ffd18c";
  for (const bullet of bullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemyBullets() {
  ctx.save();
  ctx.shadowColor = "#e86b63";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#ff8a80";
  for (const bullet of enemyBullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPickups() {
  for (const pickup of pickups) {
    const pulse = 1 + Math.sin(state.elapsed * 6 + pickup.phase) * 0.12;
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.rotate(state.elapsed * 0.8 + pickup.phase);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = pickup.type === "cooling" ? "#56d8d0" : "#6cc891";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.rect(-pickup.radius * 0.7, -pickup.radius * 0.7, pickup.radius * 1.4, pickup.radius * 1.4);
    ctx.fill();
    ctx.restore();
  }
}

function drawEffects() {
  for (const effect of effects) {
    const alpha = clamp(effect.life / effect.maxLife, 0, 1);
    ctx.save();
    ctx.strokeStyle = effect.color || "#56d8d0";
    ctx.globalAlpha = alpha * 0.9;
    ctx.lineWidth = 5;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawDamageTexts() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "500 14px ui-sans-serif, system-ui";
  for (const text of damageTexts) {
    ctx.globalAlpha = clamp(text.life / text.maxLife, 0, 1);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHud() {
  const player = state.player;
  const waveProgress =
    spawnQueue.length + enemies.length > 0
      ? 1 - (spawnQueue.length + enemies.length) / Math.max(1, state.waveTotalEnemies || 1)
      : 1;

  ctx.fillStyle = "rgba(8, 16, 21, 0.78)";
  ctx.fillRect(18, 18, 260, 54);
  ctx.strokeStyle = "#2b3d48";
  ctx.strokeRect(18, 18, 260, 54);

  ctx.fillStyle = "#9fb0ba";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText(`波次 ${state.wave} / 5`, 32, 38);
  ctx.fillText(`区域清除 ${Math.round(waveProgress * 100)}%`, 32, 58);

  ctx.fillStyle = "#22313a";
  ctx.fillRect(140, 29, 118, 7);
  ctx.fillStyle = "#56d8d0";
  ctx.fillRect(140, 29, 118 * clamp(waveProgress, 0, 1), 7);

  if (player.dashCooldown > 0) {
    ctx.fillStyle = "#9fb0ba";
    ctx.fillText(`冲刺冷却 ${player.dashCooldown.toFixed(1)} 秒`, 32, 92);
  } else {
    ctx.fillStyle = "#56d8d0";
    ctx.fillText("冲刺就绪", 32, 92);
  }
  drawBossBar();
}

function drawBossBar() {
  const boss = enemies.find((enemy) => enemy.typeName === "elite");
  if (!boss) return;
  const width = 420;
  const x = (WIDTH - width) / 2;
  const y = HEIGHT - 34;
  ctx.fillStyle = "rgba(8, 16, 21, 0.86)";
  ctx.fillRect(x - 12, y - 22, width + 24, 44);
  ctx.fillStyle = "#9fb0ba";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText(`炉心精英｜阶段 ${boss.phaseIndex || 1}`, x, y - 7);
  ctx.fillStyle = "#2a3339";
  ctx.fillRect(x, y, width, 8);
  ctx.fillStyle = "#f0b65a";
  ctx.fillRect(x, y, width * clamp(boss.health / boss.maxHealth, 0, 1), 8);
}

function updateUI(force) {
  uiTimer -= 1;
  if (!force && uiTimer > 0) return;
  uiTimer = 6;

  const player = state.player;
  const healthPercent = clamp(player.health / state.stats.maxHealth, 0, 1);
  const heatPercent = clamp(player.heat / 100, 0, 1);

  hpFill.style.width = `${healthPercent * 100}%`;
  heatFill.style.width = `${heatPercent * 100}%`;
  healthValue.textContent = `${Math.max(0, player.health).toFixed(0)} / ${state.stats.maxHealth}`;
  heatValue.textContent = `${player.heat.toFixed(0)} / 100`;
  waveValue.textContent = `${state.wave} / 5`;
  scoreValue.textContent = state.score;
  enemyValue.textContent = enemies.length + spawnQueue.length;
  killValue.textContent = state.kills;
  overheatValue.textContent = state.overheatCount;
  buildValue.textContent = Math.max(0, state.build.filter((key) => !key.startsWith("class:")).length);

  if (player.dashCooldown <= 0) {
    dashValue.textContent = "就绪";
  } else {
    dashValue.textContent = `${player.dashCooldown.toFixed(1)} 秒`;
  }
  if (player.pulseCooldown <= 0) {
    pulseValue.textContent = "就绪";
  } else {
    pulseValue.textContent = `${player.pulseCooldown.toFixed(1)} 秒`;
  }

  heatPanel.classList.toggle("hot", player.heat >= 85);
  heatWarning.classList.toggle("visible", player.heat >= 85 && state.mode === "running");
  document.body.dataset.mode = state.mode;
  document.body.dataset.wave = String(state.wave);
  document.body.dataset.playerX = player.x.toFixed(1);
  document.body.dataset.playerY = player.y.toFixed(1);
  document.body.dataset.heat = player.heat.toFixed(1);
  document.body.dataset.enemies = String(enemies.length + spawnQueue.length);
  document.body.dataset.health = player.health.toFixed(1);
  document.body.dataset.pulseCooldown = player.pulseCooldown.toFixed(2);
  const firstEnemy = enemies[0];
  document.body.dataset.enemy0X = firstEnemy ? firstEnemy.x.toFixed(1) : "";
  document.body.dataset.enemy0Y = firstEnemy ? firstEnemy.y.toFixed(1) : "";
  document.body.dataset.enemy0Angle = firstEnemy ? firstEnemy.angle.toFixed(4) : "";

  if (player.heat < 30) heatState.textContent = "冷区";
  else if (player.heat < 60) heatState.textContent = "温区";
  else if (player.heat < 85) heatState.textContent = "热区";
  else heatState.textContent = "临界区";
}

function renderBuild() {
  if (state.build.length === 0) {
    buildList.innerHTML = "<span>尚未选择升级</span>";
    return;
  }
  buildList.replaceChildren();
  for (const key of state.build) {
    const item = document.createElement("span");
    item.textContent = key.startsWith("class:")
      ? CLASSES[key.replace("class:", "")].name
      : UPGRADES[key].name;
    buildList.appendChild(item);
  }
}

function togglePause() {
  if (state.mode === "running") {
    state.mode = "paused";
    showOverlay("战斗暂停", "系统暂停", "按 P、Esc 或点击按钮继续战斗。", "继续战斗");
    pauseButton.textContent = "继续";
  } else if (state.mode === "paused") {
    state.mode = "running";
    hideOverlay();
    pauseButton.textContent = "暂停";
    lastTime = performance.now();
  }
}

primaryAction.addEventListener("click", () => {
  if (state.mode === "menu") startRun();
  else if (state.mode === "paused") togglePause();
  else resetGame();
});

pauseButton.addEventListener("click", togglePause);

canvas.addEventListener("pointerdown", (event) => {
  if (event.button === 0) {
    mouse.down = true;
    if (
      state.mode === "running" &&
      state.player.fireTimer <= 0 &&
      state.player.overheatLock <= 0
    ) {
      fireBullet();
    }
  }
  if (event.button === 2) {
    mouse.rightDown = true;
    if (state.mode === "running" && state.player.pulseCooldown <= 0) usePulseBlast();
  }
  setMouseFromEvent(event);
});

window.addEventListener("pointerup", (event) => {
  if (event.button === 0) mouse.down = false;
  if (event.button === 2) mouse.rightDown = false;
});

canvas.addEventListener("pointermove", setMouseFromEvent);
canvas.addEventListener("contextmenu", (event) => event.preventDefault());

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (key === "p" || key === "escape") {
    event.preventDefault();
    togglePause();
  }
  if (key === "r") resetGame();
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

function setMouseFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * WIDTH;
  mouse.y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
}

function frame(time) {
  const delta = Math.min(0.033, (time - lastTime) / 1000);
  lastTime = time;
  update(delta);
  draw();
  requestAnimationFrame(frame);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function shuffle(array) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [array[index], array[target]] = [array[target], array[index]];
  }
  return array;
}

resetGame();
renderBuild();
window.__overloadFrontline = {
  getState: () => state,
  start: startRun,
  reset: resetGame,
};
requestAnimationFrame(frame);
