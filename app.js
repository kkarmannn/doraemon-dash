const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");
const touchButtons = Array.from(document.querySelectorAll("[data-touch]"));

const WORLD_WIDTH = 3200;
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

function createLevel() {
  const platforms = [
    { x: 0, y: 500, width: WORLD_WIDTH, height: 80, color: "#7fbf63" },
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
  ];

  const collectibles = [
    { x: 295, y: 368, width: 28, height: 28, collected: false },
    { x: 557, y: 318, width: 28, height: 28, collected: false },
    { x: 795, y: 273, width: 28, height: 28, collected: false },
    { x: 1045, y: 353, width: 28, height: 28, collected: false },
    { x: 1335, y: 308, width: 28, height: 28, collected: false },
    { x: 1578, y: 248, width: 28, height: 28, collected: false },
    { x: 1760, y: 198, width: 28, height: 28, collected: false },
    { x: 2035, y: 288, width: 28, height: 28, collected: false },
    { x: 2315, y: 343, width: 28, height: 28, collected: false },
    { x: 2868, y: 238, width: 28, height: 28, collected: false },
  ];

  const enemies = [
    { x: 865, y: 472, width: 38, height: 28, minX: 840, maxX: 1030, speed: 1.3, dir: 1 },
    { x: 1460, y: 472, width: 38, height: 28, minX: 1380, maxX: 1580, speed: 1.6, dir: -1 },
    { x: 2140, y: 302, width: 38, height: 28, minX: 1980, maxX: 2115, speed: 1.1, dir: -1 },
    { x: 2670, y: 472, width: 38, height: 28, minX: 2580, maxX: 2800, speed: 1.7, dir: 1 },
  ];

  const hazards = [
    { x: 680, y: 500, width: 64, height: 26 },
    { x: 1180, y: 500, width: 52, height: 26 },
    { x: 2445, y: 500, width: 58, height: 26 },
  ];

  const goal = { x: 3050, y: 410, width: 56, height: 90 };

  return { platforms, collectibles, enemies, hazards, goal };
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

const game = {
  level: createLevel(),
  player: createPlayer(),
  cameraX: 0,
  score: 0,
  totalCollectibles: 10,
  lives: 3,
  timeLeft: LEVEL_TIME,
  state: "ready",
  startedAt: 0,
  lastFrame: 0,
  invulnerableUntil: 0,
};

function resetRound(keepScore = true) {
  game.player = createPlayer();
  game.cameraX = 0;
  game.state = "running";
  game.lastFrame = 0;
  game.startedAt = performance.now();
  game.timeLeft = LEVEL_TIME;
  game.invulnerableUntil = 0;

  if (!keepScore) {
    game.level = createLevel();
    game.score = 0;
  }

  startMusicLoop();
  messageEl.textContent = "Collect all the dorayaki and reach the yellow door.";
}

function restartGame() {
  stopMusic();
  game.level = createLevel();
  game.player = createPlayer();
  game.cameraX = 0;
  game.score = 0;
  game.lives = 3;
  game.timeLeft = LEVEL_TIME;
  game.state = "ready";
  game.startedAt = 0;
  game.lastFrame = 0;
  game.invulnerableUntil = 0;
  messageEl.textContent = "Press any movement key to begin.";
}

function markStarted() {
  if (game.state === "ready") {
    ensureAudio();
    playStartSound();
    resetRound(false);
  }
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
    statusEl.textContent = "Game Over";
    messageEl.textContent = reason + " Press R to play again.";
    playLoseSound();
    return;
  }

  game.invulnerableUntil = performance.now() + 1200;
  game.player = createPlayer();
  game.cameraX = 0;
  messageEl.textContent = reason + " You bounced back. Keep going.";
}

function winGame() {
  stopMusic();
  game.state = "won";
  messageEl.textContent = "You made it to the door. Doraemon Dash complete!";
  playWinSound();
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
  player.x = clamp(player.x, 0, WORLD_WIDTH - player.width);

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

function handleCollectibles() {
  for (const item of game.level.collectibles) {
    if (!item.collected && rectsOverlap(game.player, item)) {
      item.collected = true;
      game.score += 1;
      playCollectSound();
      messageEl.textContent = "Nice. Dorayaki collected.";
    }
  }
}

function handleHazards() {
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
  if (rectsOverlap(game.player, game.level.goal)) {
    if (game.score === game.totalCollectibles) {
      winGame();
    } else {
      messageEl.textContent = "The door opens after you collect every dorayaki.";
    }
  }
}

function updateCamera() {
  game.cameraX = clamp(
    game.player.x - canvas.width * 0.35,
    0,
    WORLD_WIDTH - canvas.width
  );
}

function drawCloud(x, y, scale) {
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.beginPath();
  ctx.arc(x, y, 22 * scale, 0, Math.PI * 2);
  ctx.arc(x + 22 * scale, y - 8 * scale, 18 * scale, 0, Math.PI * 2);
  ctx.arc(x + 44 * scale, y, 24 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffe37b";
  ctx.beginPath();
  ctx.arc(818, 88, 38, 0, Math.PI * 2);
  ctx.fill();

  drawCloud(120, 90, 1.2);
  drawCloud(420, 120, 0.9);
  drawCloud(690, 85, 1.1);

  for (let i = 0; i < 7; i += 1) {
    const hillX = i * 240 - (game.cameraX * 0.18) % 240;
    ctx.fillStyle = i % 2 === 0 ? "#8fd694" : "#72c27a";
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

  drawGoal();
  drawPlayer();
}

function updateHud() {
  scoreEl.textContent = `${game.score} / ${game.totalCollectibles}`;
  livesEl.textContent = String(game.lives);

  if (game.state === "ready") {
    statusEl.textContent = "Ready";
  } else if (game.state === "running") {
    statusEl.textContent = `Time ${Math.ceil(game.timeLeft)}s`;
  } else if (game.state === "won") {
    statusEl.textContent = "You Win";
  } else {
    statusEl.textContent = "Game Over";
  }
}

function update(deltaMs) {
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

  updatePlayer();
  updateEnemies();
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
