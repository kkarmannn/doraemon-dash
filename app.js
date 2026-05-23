const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const levelEl = document.getElementById("level");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const statusEl = document.getElementById("status");
const bossHealthEl = document.getElementById("bossHealth");
const messageEl = document.getElementById("message");
const playAgainBtn = document.getElementById("playAgainBtn");
const touchButtons = Array.from(document.querySelectorAll("[data-touch]"));

const GROUND_Y = 456;
const GRAVITY = 0.72;
const MOVE_SPEED = 4.2;
const JUMP_SPEED = 14;
const LEVEL_TIME = 90;

const keys = {
  left: false,
  right: false,
  jump: false,
};

let audioContext = null;
let musicTimerId = null;
let lastJumpSoundAt = 0;
let activeMusicStep = 0;

function createBoss(config) {
  return {
    x: config.x,
    baseY: config.baseY,
    y: config.baseY,
    width: config.width,
    height: config.height,
    vy: 0,
    health: config.health,
    maxHealth: config.health,
    minJumpDelay: config.minJumpDelay,
    maxJumpDelay: config.maxJumpDelay,
    jumpStrength: config.jumpStrength,
    nextJumpAt: 0,
    hitFlashUntil: 0,
  };
}

function createProjectile(x, y, direction = 1) {
  return {
    x,
    y,
    width: 20,
    height: 14,
    vx: 8.2 * direction,
    active: true,
  };
}

function createPlayer() {
  return {
    x: 70,
    y: 380,
    width: 54,
    height: 64,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
  };
}

function withCollectibles(points) {
  return points.map(([x, y]) => ({
    x,
    y,
    width: 28,
    height: 28,
    collected: false,
  }));
}

function withEnemies(items) {
  return items.map(([x, y, minX, maxX, speed, dir]) => ({
    x,
    y,
    width: 38,
    height: 28,
    minX,
    maxX,
    speed,
    dir,
  }));
}

const LEVELS = [
  {
    name: "Gadget Garden",
    intro: "Collect all the dorayaki and reach the yellow door.",
    timeLimit: 90,
    width: 3200,
    theme: {
      skyTop: "#8be1ff",
      skyBottom: "#fff2b8",
      sun: "#ffe37b",
      hillA: "#8fd694",
      hillB: "#72c27a",
      cloud: "rgba(255,255,255,0.88)",
      mountain: null,
      stars: false,
    },
    platforms: [
      { x: 0, y: 500, width: 3200, height: 80, color: "#7fbf63" },
      { x: 240, y: 410, width: 170, height: 18, color: "#f4a261" },
      { x: 500, y: 360, width: 150, height: 18, color: "#f4a261" },
      { x: 740, y: 315, width: 140, height: 18, color: "#f4a261" },
      { x: 980, y: 395, width: 190, height: 18, color: "#e9c46a" },
      { x: 1250, y: 350, width: 210, height: 18, color: "#f4a261" },
      { x: 1520, y: 290, width: 140, height: 18, color: "#e76f51" },
      { x: 1710, y: 240, width: 130, height: 18, color: "#f4a261" },
      { x: 1940, y: 330, width: 220, height: 18, color: "#e9c46a" },
      { x: 2260, y: 385, width: 170, height: 18, color: "#f4a261" },
      { x: 2510, y: 340, width: 160, height: 18, color: "#f4a261" },
      { x: 2790, y: 280, width: 200, height: 18, color: "#e76f51" },
    ],
    collectibles: withCollectibles([
      [295, 368],
      [557, 318],
      [795, 273],
      [1045, 353],
      [1335, 308],
      [1578, 248],
      [1760, 198],
      [2035, 288],
      [2315, 343],
      [2868, 238],
    ]),
    enemies: withEnemies([
      [865, 472, 840, 1030, 1.3, 1],
      [1460, 472, 1380, 1580, 1.6, -1],
      [2140, 302, 1980, 2115, 1.1, -1],
      [2670, 472, 2580, 2800, 1.7, 1],
    ]),
    hazards: [
      { x: 680, y: 500, width: 64, height: 26 },
      { x: 1180, y: 500, width: 52, height: 26 },
      { x: 2445, y: 500, width: 58, height: 26 },
    ],
    goal: { x: 3050, y: 410, width: 56, height: 90 },
  },
  {
    name: "Sky Rail Sprint",
    intro: "Level 2: a broken bridge sprint with long gaps, stacked spikes, and less recovery space.",
    timeLimit: 78,
    width: 3500,
    theme: {
      skyTop: "#6cc9ff",
      skyBottom: "#f7c9ff",
      sun: "#fff1a8",
      hillA: "#9adf8c",
      hillB: "#62b96f",
      cloud: "rgba(255,255,255,0.85)",
      mountain: "#93b7ef",
      stars: false,
    },
    platforms: [
      { x: 0, y: 500, width: 3500, height: 80, color: "#6fb25a" },
      { x: 180, y: 430, width: 110, height: 18, color: "#f4a261" },
      { x: 360, y: 385, width: 90, height: 18, color: "#e9c46a" },
      { x: 520, y: 330, width: 85, height: 18, color: "#f4a261" },
      { x: 680, y: 275, width: 80, height: 18, color: "#e76f51" },
      { x: 860, y: 345, width: 130, height: 18, color: "#f4a261" },
      { x: 1060, y: 295, width: 88, height: 18, color: "#e9c46a" },
      { x: 1225, y: 240, width: 82, height: 18, color: "#f4a261" },
      { x: 1400, y: 370, width: 105, height: 18, color: "#e76f51" },
      { x: 1570, y: 320, width: 90, height: 18, color: "#f4a261" },
      { x: 1750, y: 265, width: 84, height: 18, color: "#e9c46a" },
      { x: 1940, y: 215, width: 80, height: 18, color: "#f4a261" },
      { x: 2145, y: 365, width: 120, height: 18, color: "#e76f51" },
      { x: 2350, y: 310, width: 92, height: 18, color: "#f4a261" },
      { x: 2535, y: 255, width: 86, height: 18, color: "#e9c46a" },
      { x: 2725, y: 205, width: 78, height: 18, color: "#f4a261" },
      { x: 2920, y: 355, width: 118, height: 18, color: "#e76f51" },
      { x: 3135, y: 300, width: 95, height: 18, color: "#f4a261" },
      { x: 3310, y: 245, width: 100, height: 18, color: "#e9c46a" },
    ],
    collectibles: withCollectibles([
      [216, 388],
      [390, 343],
      [548, 288],
      [705, 233],
      [905, 303],
      [1089, 253],
      [1248, 198],
      [1436, 328],
      [1780, 223],
      [1967, 173],
      [2380, 268],
      [3346, 203],
    ]),
    enemies: withEnemies([
      [470, 472, 410, 640, 1.65, 1],
      [980, 472, 900, 1120, 1.95, -1],
      [1510, 472, 1410, 1670, 1.9, 1],
      [2240, 337, 2160, 2325, 1.45, -1],
      [3050, 472, 2940, 3180, 2.05, 1],
    ]),
    hazards: [
      { x: 300, y: 500, width: 48, height: 26 },
      { x: 790, y: 500, width: 92, height: 26 },
      { x: 1160, y: 500, width: 52, height: 26 },
      { x: 1670, y: 500, width: 96, height: 26 },
      { x: 2060, y: 500, width: 56, height: 26 },
      { x: 2830, y: 500, width: 100, height: 26 },
      { x: 3235, y: 500, width: 64, height: 26 },
    ],
    goal: { x: 3420, y: 410, width: 56, height: 90 },
  },
  {
    name: "Moonlight Machine City",
    intro: "Final level: a gauntlet of tight landings, layered traps, and almost no breathing room.",
    timeLimit: 66,
    width: 3720,
    theme: {
      skyTop: "#18264f",
      skyBottom: "#4b4d8d",
      sun: "#f1f1ff",
      hillA: "#4f6f88",
      hillB: "#36556d",
      cloud: "rgba(225,232,255,0.58)",
      mountain: "#2b4169",
      stars: true,
    },
    platforms: [
      { x: 0, y: 500, width: 3720, height: 80, color: "#537e61" },
      { x: 160, y: 420, width: 100, height: 18, color: "#b08968" },
      { x: 330, y: 360, width: 80, height: 18, color: "#ddb892" },
      { x: 470, y: 300, width: 78, height: 18, color: "#b56576" },
      { x: 625, y: 240, width: 76, height: 18, color: "#ddb892" },
      { x: 810, y: 340, width: 120, height: 18, color: "#b08968" },
      { x: 980, y: 285, width: 80, height: 18, color: "#b56576" },
      { x: 1135, y: 230, width: 76, height: 18, color: "#ddb892" },
      { x: 1315, y: 390, width: 105, height: 18, color: "#b08968" },
      { x: 1485, y: 330, width: 78, height: 18, color: "#ddb892" },
      { x: 1640, y: 270, width: 76, height: 18, color: "#b56576" },
      { x: 1810, y: 215, width: 72, height: 18, color: "#ddb892" },
      { x: 2015, y: 365, width: 108, height: 18, color: "#b08968" },
      { x: 2190, y: 305, width: 80, height: 18, color: "#ddb892" },
      { x: 2345, y: 245, width: 76, height: 18, color: "#b56576" },
      { x: 2535, y: 190, width: 74, height: 18, color: "#ddb892" },
      { x: 2745, y: 350, width: 112, height: 18, color: "#b08968" },
      { x: 2930, y: 290, width: 82, height: 18, color: "#ddb892" },
      { x: 3090, y: 230, width: 76, height: 18, color: "#b56576" },
      { x: 3285, y: 305, width: 128, height: 18, color: "#ddb892" },
      { x: 3470, y: 245, width: 84, height: 18, color: "#b08968" },
    ],
    collectibles: withCollectibles([
      [192, 378],
      [353, 318],
      [492, 258],
      [647, 198],
      [850, 298],
      [1004, 243],
      [1156, 188],
      [1342, 348],
      [1830, 173],
      [2040, 323],
      [2214, 263],
      [2368, 203],
      [2560, 148],
      [2770, 308],
      [3308, 263],
      [3495, 203],
    ]),
    enemies: withEnemies([
      [420, 472, 310, 560, 1.75, 1],
      [910, 472, 790, 1035, 2, -1],
      [1435, 472, 1320, 1585, 2.05, 1],
      [2128, 337, 2030, 2195, 1.55, -1],
      [2870, 472, 2750, 3010, 2.1, 1],
      [3380, 472, 3295, 3520, 2.2, -1],
    ]),
    hazards: [
      { x: 275, y: 500, width: 42, height: 26 },
      { x: 565, y: 500, width: 56, height: 26 },
      { x: 740, y: 500, width: 58, height: 26 },
      { x: 1218, y: 500, width: 86, height: 26 },
      { x: 1725, y: 500, width: 84, height: 26 },
      { x: 2440, y: 500, width: 92, height: 26 },
      { x: 3175, y: 500, width: 88, height: 26 },
      { x: 3560, y: 500, width: 60, height: 26 },
    ],
    goal: { x: 3635, y: 410, width: 56, height: 90 },
  },
  {
    name: "Rat King Showdown",
    intro: "Boss level: survive the giant rat and let the dorayaki cannons do the firing for you.",
    timeLimit: 72,
    mode: "boss",
    width: 2200,
    theme: {
      skyTop: "#2d1839",
      skyBottom: "#7c3f58",
      sun: "#ffd6a5",
      hillA: "#7a5c61",
      hillB: "#5e434a",
      cloud: "rgba(255,228,237,0.38)",
      mountain: "#45253d",
      stars: true,
    },
    platforms: [
      { x: 0, y: 500, width: 2200, height: 80, color: "#6c7d5f" },
      { x: 240, y: 405, width: 220, height: 18, color: "#e9c46a" },
      { x: 640, y: 360, width: 180, height: 18, color: "#f4a261" },
      { x: 990, y: 405, width: 220, height: 18, color: "#e76f51" },
      { x: 1460, y: 360, width: 190, height: 18, color: "#f4a261" },
    ],
    collectibles: [],
    enemies: [],
    hazards: [],
    goal: null,
    boss: {
      x: 1785,
      baseY: 338,
      width: 128,
      height: 110,
      health: 12,
      minJumpDelay: 650,
      maxJumpDelay: 1400,
      jumpStrength: 15.5,
    },
    autoFireInterval: 520,
  },
];

const game = {
  levelIndex: 0,
  level: structuredClone(LEVELS[0]),
  player: createPlayer(),
  cameraX: 0,
  score: 0,
  totalCollectibles: LEVELS[0].collectibles.length,
  lives: 3,
  timeLeft: LEVEL_TIME,
  state: "ready",
  lastFrame: 0,
  invulnerableUntil: 0,
  boss: null,
  projectiles: [],
  nextAutoShotAt: 0,
  cutscene: null,
};

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function currentLevelTemplate() {
  return LEVELS[game.levelIndex];
}

function currentWorldWidth() {
  return game.level.width;
}

function ensureAudio() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTone({
  frequency,
  duration = 0.12,
  type = "square",
  volume = 0.04,
  startTime = 0,
  endFrequency = null,
}) {
  const audio = ensureAudio();
  if (!audio) return;

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime + startTime;

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (endFrequency !== null) {
    osc.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playJumpSound() {
  const now = performance.now();
  if (now - lastJumpSoundAt < 120) return;
  lastJumpSoundAt = now;

  playTone({ frequency: 320, endFrequency: 520, duration: 0.09, volume: 0.05 });
  playTone({ frequency: 640, endFrequency: 760, duration: 0.05, volume: 0.03, startTime: 0.02 });
}

function playCollectSound() {
  playTone({ frequency: 660, duration: 0.06, volume: 0.05 });
  playTone({ frequency: 990, duration: 0.08, volume: 0.04, startTime: 0.05 });
}

function playStompSound() {
  playTone({ frequency: 210, endFrequency: 120, duration: 0.08, type: "triangle", volume: 0.05 });
}

function playHurtSound() {
  playTone({ frequency: 280, endFrequency: 160, duration: 0.18, type: "sawtooth", volume: 0.05 });
  playTone({ frequency: 200, endFrequency: 110, duration: 0.22, type: "square", volume: 0.025, startTime: 0.02 });
}

function playLoseSound() {
  playTone({ frequency: 330, duration: 0.12, type: "triangle", volume: 0.04 });
  playTone({ frequency: 247, duration: 0.16, type: "triangle", volume: 0.04, startTime: 0.12 });
  playTone({ frequency: 165, duration: 0.3, type: "sawtooth", volume: 0.04, startTime: 0.3 });
}

function playWinSound() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((note, index) => {
    playTone({
      frequency: note,
      duration: index === notes.length - 1 ? 0.22 : 0.12,
      type: "square",
      volume: 0.04,
      startTime: index * 0.11,
    });
  });
}

function playLevelClearSound() {
  const notes = [392, 523.25, 659.25];
  notes.forEach((note, index) => {
    playTone({
      frequency: note,
      duration: 0.1,
      type: "square",
      volume: 0.038,
      startTime: index * 0.09,
    });
  });
}

function playShootSound() {
  playTone({ frequency: 460, endFrequency: 620, duration: 0.06, type: "square", volume: 0.032 });
}

function playBossHitSound() {
  playTone({ frequency: 250, endFrequency: 160, duration: 0.08, type: "sawtooth", volume: 0.045 });
}

function playStartSound() {
  playTone({ frequency: 392, duration: 0.07, volume: 0.03 });
  playTone({ frequency: 523.25, duration: 0.09, volume: 0.04, startTime: 0.07 });
}

function stopMusic() {
  if (musicTimerId) {
    window.clearInterval(musicTimerId);
    musicTimerId = null;
  }
}

function startMusicLoop() {
  if (musicTimerId || !ensureAudio()) return;

  const bassPattern = [196, 196, 220, 196, 174.61, 196, 220, 261.63];
  const leadPattern = [392, 440, 392, 523.25, 493.88, 392, 349.23, 329.63];

  const tick = () => {
    const bass = bassPattern[activeMusicStep % bassPattern.length];
    const lead = leadPattern[activeMusicStep % leadPattern.length];

    playTone({ frequency: bass, duration: 0.14, type: "triangle", volume: 0.022 });
    playTone({ frequency: lead, duration: 0.07, type: "square", volume: 0.018, startTime: 0.02 });

    activeMusicStep += 1;
  };

  tick();
  musicTimerId = window.setInterval(tick, 220);
}

function fillRoundedRect(x, y, width, height, radius, color) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function loadLevel(index) {
  game.levelIndex = index;
  game.level = structuredClone(LEVELS[index]);
  game.totalCollectibles = game.level.collectibles.length;
  game.score = 0;
  game.player = createPlayer();
  game.cameraX = 0;
  game.timeLeft = game.level.timeLimit || LEVEL_TIME;
  game.invulnerableUntil = 0;
  game.lastFrame = 0;
  game.projectiles = [];
  game.nextAutoShotAt = performance.now() + 500;
  game.boss = game.level.boss ? createBoss(game.level.boss) : null;
  game.cutscene = null;
}

function startLevel() {
  game.state = "running";
  startMusicLoop();
  messageEl.textContent = currentLevelTemplate().intro;
}

function restartGame() {
  stopMusic();
  loadLevel(0);
  game.lives = 3;
  game.state = "ready";
  playAgainBtn.hidden = true;
  messageEl.textContent = "Press any movement key to begin Level 1.";
}

function startVictoryCutscene() {
  game.state = "won";
  game.cutscene = {
    startedAt: performance.now(),
    confetti: Array.from({ length: 36 }, (_, index) => ({
      x: (index * 31) % canvas.width,
      y: -((index * 27) % 220),
      speedY: 1.8 + (index % 5) * 0.35,
      drift: ((index % 6) - 3) * 0.22,
      size: 7 + (index % 4),
      color: ["#ffd166", "#ef476f", "#06d6a0", "#118ab2", "#f78c6b"][index % 5],
    })),
  };
  playAgainBtn.hidden = false;
  messageEl.textContent = "Congratulations. You beat Doraemon Dash and sent the Rat King flying.";
  playWinSound();
}

function markStarted() {
  if (game.state === "ready") {
    ensureAudio();
    playStartSound();
    startLevel();
  }
}

function prepareNextLevel() {
  if (game.levelIndex >= LEVELS.length - 1) {
    stopMusic();
    startVictoryCutscene();
    return;
  }

  playLevelClearSound();
  loadLevel(game.levelIndex + 1);
  game.state = "ready";
  messageEl.textContent = `Level ${game.levelIndex + 1} cleared. Press move or jump for Level ${game.levelIndex + 2}.`;
}

function loseLife(reason) {
  if (performance.now() < game.invulnerableUntil || game.state !== "running") {
    return;
  }

  game.lives -= 1;
  playHurtSound();

  if (game.lives <= 0) {
    stopMusic();
    game.state = "lost";
    playAgainBtn.hidden = false;
    messageEl.textContent = reason + " Press R to play again.";
    playLoseSound();
    return;
  }

  game.invulnerableUntil = performance.now() + 1200;
  game.player = createPlayer();
  game.cameraX = 0;
  messageEl.textContent = reason + " You bounced back. Keep going.";
}

function updatePlayer() {
  const player = game.player;

  if (keys.left && !keys.right) {
    player.vx = -MOVE_SPEED;
    player.facing = -1;
  } else if (keys.right && !keys.left) {
    player.vx = MOVE_SPEED;
    player.facing = 1;
  } else {
    player.vx *= 0.82;
    if (Math.abs(player.vx) < 0.08) player.vx = 0;
  }

  if (keys.jump && player.onGround) {
    player.vy = -JUMP_SPEED;
    player.onGround = false;
    playJumpSound();
  }

  player.vy += GRAVITY;
  player.x += player.vx;
  player.x = clamp(player.x, 0, currentWorldWidth() - player.width);

  const previousY = player.y;
  player.y += player.vy;
  player.onGround = false;

  for (const platform of game.level.platforms) {
    const fromAbove = previousY + player.height <= platform.y + 10;
    if (rectsOverlap(player, platform) && player.vy >= 0 && fromAbove) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.onGround = true;
    }
  }

  if (player.y > canvas.height + 140) {
    loseLife("You fell off the map.");
  }
}

function updateEnemies() {
  for (const enemy of game.level.enemies) {
    enemy.x += enemy.speed * enemy.dir;
    if (enemy.x <= enemy.minX || enemy.x + enemy.width >= enemy.maxX) {
      enemy.dir *= -1;
    }
  }
}

function autoFireProjectiles(now) {
  if (game.level.mode !== "boss" || game.state !== "running") return;
  if (now < game.nextAutoShotAt) return;

  const direction = game.boss && game.boss.x >= game.player.x ? 1 : -1;
  const projectileX = direction === 1 ? game.player.x + game.player.width - 6 : game.player.x - 14;
  const projectileY = game.player.y + 28;

  game.projectiles.push(createProjectile(projectileX, projectileY, direction));
  game.nextAutoShotAt = now + (game.level.autoFireInterval || 520);
  playShootSound();
}

function updateProjectiles() {
  for (const projectile of game.projectiles) {
    projectile.x += projectile.vx;
    if (projectile.x < -80 || projectile.x > currentWorldWidth() + 80) {
      projectile.active = false;
    }
  }

  game.projectiles = game.projectiles.filter((projectile) => projectile.active);
}

function updateBoss(now) {
  if (!game.boss) return;

  if (now >= game.boss.nextJumpAt && game.boss.y >= game.boss.baseY) {
    game.boss.vy = -game.boss.jumpStrength;
    game.boss.nextJumpAt =
      now +
      game.boss.minJumpDelay +
      Math.random() * (game.boss.maxJumpDelay - game.boss.minJumpDelay);
  }

  game.boss.vy += GRAVITY * 0.95;
  game.boss.y += game.boss.vy;
  if (game.boss.y >= game.boss.baseY) {
    game.boss.y = game.boss.baseY;
    game.boss.vy = 0;
  }

  const bossRect = {
    x: game.boss.x,
    y: game.boss.y,
    width: game.boss.width,
    height: game.boss.height,
  };

  if (rectsOverlap(game.player, bossRect)) {
    loseLife("The giant rat body-slammed you.");
  }

  for (const projectile of game.projectiles) {
    if (!projectile.active) continue;
    if (rectsOverlap(projectile, bossRect)) {
      projectile.active = false;
      game.boss.health -= 1;
      game.boss.hitFlashUntil = now + 120;
      playBossHitSound();
      messageEl.textContent = `Boss hit. Rat King health ${Math.max(game.boss.health, 0)}/${game.boss.maxHealth}.`;

      if (game.boss.health <= 0) {
        game.boss.health = 0;
        prepareNextLevel();
        return;
      }
    }
  }
}

function handleCollectibles() {
  if (game.level.mode === "boss") return;

  for (const item of game.level.collectibles) {
    if (!item.collected && rectsOverlap(game.player, item)) {
      item.collected = true;
      game.score += 1;
      playCollectSound();
      messageEl.textContent = `${currentLevelTemplate().name}: dorayaki ${game.score}/${game.totalCollectibles}.`;
    }
  }
}

function handleHazards() {
  if (game.level.mode === "boss") return;

  for (const spike of game.level.hazards) {
    if (rectsOverlap(game.player, spike)) {
      loseLife("Those spikes were not friendly.");
      return;
    }
  }

  for (const enemy of game.level.enemies) {
    if (rectsOverlap(game.player, enemy)) {
      const stomped =
        game.player.vy > 0 &&
        game.player.y + game.player.height - enemy.y < 24;

      if (stomped) {
        enemy.x = enemy.minX;
        enemy.dir *= -1;
        game.player.vy = -9;
        playStompSound();
        messageEl.textContent = "Boing. Robot mouse flattened.";
      } else {
        loseLife("A robot mouse tagged you.");
      }
      return;
    }
  }
}

function updateGoal() {
  if (game.level.mode === "boss") return;
  if (!rectsOverlap(game.player, game.level.goal)) return;

  if (game.score === game.totalCollectibles) {
    prepareNextLevel();
  } else {
    messageEl.textContent = "The door opens after you collect every dorayaki in this level.";
  }
}

function updateCamera() {
  game.cameraX = clamp(
    game.player.x - canvas.width * 0.35,
    0,
    currentWorldWidth() - canvas.width
  );
}

function drawCloud(x, y, scale, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 22 * scale, 0, Math.PI * 2);
  ctx.arc(x + 22 * scale, y - 8 * scale, 18 * scale, 0, Math.PI * 2);
  ctx.arc(x + 44 * scale, y, 24 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackground() {
  const { theme } = game.level;

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, theme.skyTop);
  gradient.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (theme.stars) {
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    for (let i = 0; i < 20; i += 1) {
      const x = ((i * 137) % canvas.width) + 6;
      const y = 40 + ((i * 53) % 140);
      ctx.fillRect(x, y, 2, 2);
    }
  }

  ctx.fillStyle = theme.sun;
  ctx.beginPath();
  ctx.arc(818, 88, 38, 0, Math.PI * 2);
  ctx.fill();

  if (theme.mountain) {
    for (let i = 0; i < 5; i += 1) {
      const x = i * 260 - (game.cameraX * 0.12) % 260;
      ctx.fillStyle = theme.mountain;
      ctx.beginPath();
      ctx.moveTo(x, canvas.height);
      ctx.lineTo(x + 110, 210);
      ctx.lineTo(x + 220, canvas.height);
      ctx.fill();
    }
  }

  drawCloud(120, 90, 1.2, theme.cloud);
  drawCloud(420, 120, 0.9, theme.cloud);
  drawCloud(690, 85, 1.1, theme.cloud);

  for (let i = 0; i < 7; i += 1) {
    const hillX = i * 240 - (game.cameraX * 0.18) % 240;
    ctx.fillStyle = i % 2 === 0 ? theme.hillA : theme.hillB;
    ctx.beginPath();
    ctx.moveTo(hillX, canvas.height);
    ctx.quadraticCurveTo(hillX + 120, 280, hillX + 240, canvas.height);
    ctx.fill();
  }
}

function drawPlatforms() {
  for (const platform of game.level.platforms) {
    const x = platform.x - game.cameraX;
    ctx.fillStyle = platform.color;
    ctx.fillRect(x, platform.y, platform.width, platform.height);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(x, platform.y, platform.width, 6);
  }
}

function drawCollectible(item) {
  const x = item.x - game.cameraX;
  const y = item.y;

  ctx.fillStyle = "#b67332";
  ctx.beginPath();
  ctx.ellipse(x + 14, y + 14, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f7d48c";
  ctx.beginPath();
  ctx.ellipse(x + 14, y + 14, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(183, 110, 32, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 14);
  ctx.lineTo(x + 21, y + 14);
  ctx.stroke();
}

function drawProjectile(projectile) {
  const x = projectile.x - game.cameraX;
  const y = projectile.y;

  ctx.fillStyle = "#b67332";
  ctx.beginPath();
  ctx.ellipse(x + 10, y + 7, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f7d48c";
  ctx.beginPath();
  ctx.ellipse(x + 10, y + 7, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHazards() {
  for (const spike of game.level.hazards) {
    const x = spike.x - game.cameraX;
    ctx.fillStyle = "#d94841";
    for (let i = 0; i < spike.width; i += 16) {
      ctx.beginPath();
      ctx.moveTo(x + i, spike.y + spike.height);
      ctx.lineTo(x + i + 8, spike.y);
      ctx.lineTo(x + i + 16, spike.y + spike.height);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawEnemy(enemy) {
  const x = enemy.x - game.cameraX;
  const y = enemy.y;

  ctx.fillStyle = "#7b5e57";
  ctx.fillRect(x, y + 8, enemy.width, enemy.height - 8);
  ctx.fillStyle = "#c9b29b";
  ctx.fillRect(x + 4, y, enemy.width - 8, 16);
  ctx.fillStyle = "#2f241f";
  ctx.fillRect(x + 9, y + 6, 5, 5);
  ctx.fillRect(x + enemy.width - 14, y + 6, 5, 5);
}

function drawGoal() {
  if (!game.level.goal) return;
  const { goal } = game.level;
  const x = goal.x - game.cameraX;

  ctx.fillStyle = "#f7d447";
  ctx.fillRect(x, goal.y, goal.width, goal.height);
  ctx.fillStyle = "#c94f28";
  ctx.fillRect(x + 8, goal.y + 14, goal.width - 16, goal.height - 14);
  ctx.fillStyle = "#ffeeb6";
  ctx.beginPath();
  ctx.arc(x + goal.width - 16, goal.y + goal.height / 2, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBoss() {
  if (!game.boss) return;

  const x = game.boss.x - game.cameraX;
  const y = game.boss.y;
  const flashing = performance.now() < game.boss.hitFlashUntil;

  ctx.save();
  ctx.fillStyle = flashing ? "#f9a8a8" : "#7b5e57";
  ctx.beginPath();
  ctx.ellipse(x + 64, y + 58, 64, 50, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = flashing ? "#ffd7d7" : "#c9b29b";
  ctx.beginPath();
  ctx.ellipse(x + 65, y + 48, 48, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e8b1ba";
  ctx.beginPath();
  ctx.ellipse(x + 26, y + 18, 15, 18, -0.4, 0, Math.PI * 2);
  ctx.ellipse(x + 104, y + 18, 15, 18, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#271d1a";
  ctx.beginPath();
  ctx.arc(x + 48, y + 42, 5, 0, Math.PI * 2);
  ctx.arc(x + 84, y + 42, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d94c4c";
  ctx.beginPath();
  ctx.arc(x + 66, y + 56, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#271d1a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 20, y + 56);
  ctx.lineTo(x - 6, y + 49);
  ctx.moveTo(x + 22, y + 66);
  ctx.lineTo(x - 7, y + 68);
  ctx.moveTo(x + 112, y + 56);
  ctx.lineTo(x + 138, y + 49);
  ctx.moveTo(x + 110, y + 66);
  ctx.lineTo(x + 139, y + 68);
  ctx.stroke();

  ctx.fillStyle = "#fff8ee";
  ctx.fillRect(x + 54, y + 74, 7, 16);
  ctx.fillRect(x + 70, y + 74, 7, 16);
  ctx.restore();

  const barX = x + 8;
  const barY = y - 20;
  const barWidth = 112;
  ctx.fillStyle = "rgba(35, 20, 26, 0.55)";
  ctx.fillRect(barX, barY, barWidth, 10);
  ctx.fillStyle = "#f87171";
  ctx.fillRect(barX, barY, barWidth * (game.boss.health / game.boss.maxHealth), 10);
}

function drawVictoryCutscene() {
  if (!game.cutscene) return;

  const elapsed = performance.now() - game.cutscene.startedAt;
  const overlayAlpha = Math.min(0.78, 0.32 + elapsed / 2400);

  ctx.fillStyle = `rgba(21, 18, 38, ${overlayAlpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const piece of game.cutscene.confetti) {
    ctx.fillStyle = piece.color;
    ctx.fillRect(piece.x, piece.y, piece.size, piece.size * 0.7);
  }

  ctx.fillStyle = "#fff7ea";
  ctx.font = "700 40px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("Congratulations!", canvas.width / 2, 158);

  ctx.font = "700 24px Trebuchet MS";
  ctx.fillStyle = "#ffe08a";
  ctx.fillText("You completed Doraemon Dash", canvas.width / 2, 204);

  ctx.font = "600 18px Trebuchet MS";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("The Rat King is defeated and the city is safe again.", canvas.width / 2, 252);
  ctx.fillText("Doraemon celebrates with a mountain of dorayaki.", canvas.width / 2, 282);

  ctx.fillStyle = "#1296d4";
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 372, 66, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 366, 58, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1296d4";
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 366, 62, Math.PI * 0.1, Math.PI * 1.9);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(canvas.width / 2 - 18, 356, 17, 0, Math.PI * 2);
  ctx.arc(canvas.width / 2 + 18, 356, 17, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.arc(canvas.width / 2 - 16, 356, 4, 0, Math.PI * 2);
  ctx.arc(canvas.width / 2 + 16, 356, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#de4040";
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 377, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 392, 24, 0, Math.PI);
  ctx.stroke();

  ctx.textAlign = "start";
}

function drawPlayer() {
  const player = game.player;
  const x = player.x - game.cameraX;
  const y = player.y;
  const blink = Math.floor(performance.now() / 200) % 8 === 0;

  if (performance.now() < game.invulnerableUntil && Math.floor(performance.now() / 90) % 2) {
    return;
  }

  ctx.save();
  if (player.facing === -1) {
    ctx.translate(x + player.width / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(x + player.width / 2), 0);
  }

  fillRoundedRect(x + 6, y + 18, 42, 38, 14, "#1296d4");

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x + 27, y + 22, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1296d4";
  ctx.beginPath();
  ctx.arc(x + 27, y + 22, 26, Math.PI * 0.1, Math.PI * 1.9);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x + 20, y + 18, 8, 0, Math.PI * 2);
  ctx.arc(x + 34, y + 18, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111111";
  if (!blink) {
    ctx.beginPath();
    ctx.arc(x + 21, y + 18, 2.2, 0, Math.PI * 2);
    ctx.arc(x + 33, y + 18, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 27, y + 18);
  ctx.lineTo(x + 27, y + 28);
  ctx.stroke();

  ctx.fillStyle = "#de4040";
  ctx.beginPath();
  ctx.arc(x + 27, y + 28, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x + 27, y + 32, 16, 0, Math.PI);
  ctx.fill();

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 26);
  ctx.lineTo(x + 2, y + 23);
  ctx.moveTo(x + 12, y + 30);
  ctx.lineTo(x + 1, y + 30);
  ctx.moveTo(x + 12, y + 34);
  ctx.lineTo(x + 2, y + 38);
  ctx.moveTo(x + 42, y + 26);
  ctx.lineTo(x + 52, y + 23);
  ctx.moveTo(x + 42, y + 30);
  ctx.lineTo(x + 53, y + 30);
  ctx.moveTo(x + 42, y + 34);
  ctx.lineTo(x + 52, y + 38);
  ctx.stroke();

  ctx.fillStyle = "#d82626";
  ctx.fillRect(x + 13, y + 39, 28, 7);
  ctx.fillStyle = "#ffd34d";
  ctx.beginPath();
  ctx.arc(x + 27, y + 43, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 11, y + 50, 14, 11);
  ctx.fillRect(x + 29, y + 50, 14, 11);
  ctx.fillStyle = "#d82626";
  ctx.fillRect(x + 8, y + 54, 10, 8);
  ctx.fillRect(x + 36, y + 54, 10, 8);
  ctx.restore();
}

function drawLevelBanner() {
  ctx.fillStyle = "rgba(16, 28, 48, 0.16)";
  ctx.fillRect(16, 16, 220, 44);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 18px Trebuchet MS";
  ctx.fillText(`Level ${game.levelIndex + 1}: ${currentLevelTemplate().name}`, 26, 44);
}

function draw() {
  drawBackground();
  drawPlatforms();
  drawHazards();

  for (const item of game.level.collectibles) {
    if (!item.collected) drawCollectible(item);
  }

  for (const enemy of game.level.enemies) {
    drawEnemy(enemy);
  }

  for (const projectile of game.projectiles) {
    drawProjectile(projectile);
  }

  drawGoal();
  drawBoss();
  drawPlayer();
  drawLevelBanner();

  if (game.state === "won") {
    drawVictoryCutscene();
  }
}

function updateHud() {
  levelEl.textContent = `${game.levelIndex + 1} / ${LEVELS.length}`;
  scoreEl.textContent =
    game.level.mode === "boss" ? "Auto-fire" : `${game.score} / ${game.totalCollectibles}`;
  livesEl.textContent = String(game.lives);
  bossHealthEl.textContent = game.boss ? `${game.boss.health} / ${game.boss.maxHealth}` : "--";

  if (game.state === "ready") {
    statusEl.textContent = "Ready";
  } else if (game.state === "running") {
    statusEl.textContent = `Time ${Math.ceil(game.timeLeft)}s`;
  } else if (game.state === "won") {
    statusEl.textContent = "Victory";
  } else {
    statusEl.textContent = "Game Over";
  }
}

function updateVictoryCutscene() {
  if (!game.cutscene) return;

  for (const piece of game.cutscene.confetti) {
    piece.y += piece.speedY;
    piece.x += piece.drift;

    if (piece.y > canvas.height + 20) {
      piece.y = -20;
      piece.x = 40 + Math.random() * (canvas.width - 80);
    }
  }
}

function update(deltaMs) {
  if (game.state === "won") {
    updateVictoryCutscene();
    return;
  }

  if (game.state !== "running") return;

  game.timeLeft -= deltaMs / 1000;
  if (game.timeLeft <= 0) {
    game.timeLeft = 0;
    stopMusic();
    game.state = "lost";
    messageEl.textContent = "Time ran out. Press R to try again.";
    playLoseSound();
    return;
  }

  const now = performance.now();
  updatePlayer();
  autoFireProjectiles(now);
  updateProjectiles();
  updateEnemies();
  updateBoss(now);
  handleCollectibles();
  handleHazards();
  updateGoal();
  updateCamera();
}

function loop(timestamp) {
  if (!game.lastFrame) game.lastFrame = timestamp;
  const deltaMs = Math.min(timestamp - game.lastFrame, 32);
  game.lastFrame = timestamp;

  update(deltaMs);
  draw();
  updateHud();

  requestAnimationFrame(loop);
}

function setKeyState(code, pressed) {
  if (code === "ArrowLeft" || code === "KeyA") keys.left = pressed;
  if (code === "ArrowRight" || code === "KeyD") keys.right = pressed;
  if (code === "ArrowUp" || code === "KeyW" || code === "Space") keys.jump = pressed;
}

function setTouchState(control, pressed) {
  if (control === "left") keys.left = pressed;
  if (control === "right") keys.right = pressed;
  if (control === "jump") keys.jump = pressed;
}

function handleTouchPress(button, pressed) {
  const control = button.dataset.touch;
  if (!control) return;

  ensureAudio();
  button.classList.toggle("is-pressed", pressed);
  setTouchState(control, pressed);

  if (pressed && game.state === "ready") {
    markStarted();
  }
}

window.addEventListener("keydown", (event) => {
  ensureAudio();

  if (event.code === "KeyR") {
    restartGame();
    return;
  }

  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) {
    event.preventDefault();
  }

  setKeyState(event.code, true);

  if (
    game.state === "ready" &&
    ["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW"].includes(event.code)
  ) {
    markStarted();
  }
});

window.addEventListener("keyup", (event) => {
  setKeyState(event.code, false);
});

playAgainBtn.addEventListener("click", () => {
  ensureAudio();
  restartGame();
});

touchButtons.forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    handleTouchPress(button, true);
  });

  button.addEventListener("pointerup", (event) => {
    if (button.hasPointerCapture(event.pointerId)) {
      button.releasePointerCapture(event.pointerId);
    }
    handleTouchPress(button, false);
  });

  button.addEventListener("pointercancel", () => {
    handleTouchPress(button, false);
  });

  button.addEventListener("lostpointercapture", () => {
    handleTouchPress(button, false);
  });
});

window.addEventListener("blur", () => {
  keys.left = false;
  keys.right = false;
  keys.jump = false;
  touchButtons.forEach((button) => button.classList.remove("is-pressed"));
});

restartGame();
requestAnimationFrame(loop);
