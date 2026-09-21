const BPM = 100;
const BEAT_SEC = 60 / BPM;
const TOTAL_BEATS = 32;
const PERFECT_WINDOW = 0.08;
const GOOD_WINDOW = 0.18;

const startBtn = document.getElementById("startBtn");
const characterEl = document.getElementById("character");
const judgmentEl = document.getElementById("judgment");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");

let audioCtx = null;
let startTime = 0;
let beatTimes = [];
let hitBeats = new Set();
let score = 0;
let combo = 0;
let rafId = null;

function playClick(ctx, time) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.05);
}

function scheduleBeats() {
  beatTimes = [];
  for (let i = 0; i < TOTAL_BEATS; i++) {
    const t = startTime + i * BEAT_SEC;
    beatTimes.push(t);
    playClick(audioCtx, t);
  }
}

function showJudgment(text, cls) {
  judgmentEl.textContent = text;
  judgmentEl.className = cls;
  void judgmentEl.offsetWidth;
  judgmentEl.classList.add("show");
}

function bounceCharacter() {
  characterEl.classList.add("beat");
  setTimeout(() => characterEl.classList.remove("beat"), 90);
}

function findNearestBeat(now) {
  let nearest = null;
  let nearestDiff = Infinity;
  for (let i = 0; i < beatTimes.length; i++) {
    if (hitBeats.has(i)) continue;
    const diff = Math.abs(beatTimes[i] - now);
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearest = i;
    }
  }
  return { index: nearest, diff: nearestDiff };
}

function handleSpace() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const { index, diff } = findNearestBeat(now);

  if (index === null) return;

  if (diff <= PERFECT_WINDOW) {
    hitBeats.add(index);
    score += 100;
    combo += 1;
    showJudgment("Perfect", "perfect");
  } else if (diff <= GOOD_WINDOW) {
    hitBeats.add(index);
    score += 50;
    combo += 1;
    showJudgment("Good", "good");
  } else {
    combo = 0;
    showJudgment("Miss", "miss");
  }

  scoreEl.textContent = score;
  comboEl.textContent = combo;
}

function checkMissedBeats(now) {
  beatTimes.forEach((t, i) => {
    if (!hitBeats.has(i) && now > t + GOOD_WINDOW) {
      hitBeats.add(i);
      combo = 0;
      comboEl.textContent = combo;
    }
  });
}

let lastBeatIndex = -1;
function tick() {
  const now = audioCtx.currentTime;
  checkMissedBeats(now);

  const currentBeatIndex = Math.floor((now - startTime) / BEAT_SEC);
  if (currentBeatIndex !== lastBeatIndex && currentBeatIndex >= 0 && currentBeatIndex < TOTAL_BEATS) {
    lastBeatIndex = currentBeatIndex;
    bounceCharacter();
  }

  if (now - startTime < TOTAL_BEATS * BEAT_SEC + 1) {
    rafId = requestAnimationFrame(tick);
  } else {
    endGame();
  }
}

function endGame() {
  startBtn.disabled = false;
  startBtn.textContent = "もう一度プレイ";
  showJudgment(`終了！ Score: ${score}`, "perfect");
  cancelAnimationFrame(rafId);
}

function startGame() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  score = 0;
  combo = 0;
  hitBeats = new Set();
  lastBeatIndex = -1;
  scoreEl.textContent = "0";
  comboEl.textContent = "0";
  judgmentEl.className = "";
  judgmentEl.textContent = "";

  startTime = audioCtx.currentTime + 1;
  scheduleBeats();

  startBtn.disabled = true;
  startBtn.textContent = "プレイ中...";

  rafId = requestAnimationFrame(tick);
}

startBtn.addEventListener("click", startGame);

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.key === " " || e.key === "Spacebar") {
    e.preventDefault();
    handleSpace();
  }
});
