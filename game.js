const AUDIO_URL = "maou_inst_short_14_shining_star.mp3";
const LEAD_IN_SEC = 0.5;
const NOTE_LEAD_SEC = 1.1;
const PERFECT_WINDOW = 0.08;
const GOOD_WINDOW = 0.18;
const MIN_BEAT_GAP_SEC = 0.3;

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const characterEl = document.getElementById("character");
const judgmentEl = document.getElementById("judgment");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const noteLaneEl = document.getElementById("noteLane");
const hitLineEl = document.getElementById("hitLine");
const overlayEl = document.getElementById("overlay");
const overlayTitleEl = document.getElementById("overlayTitle");
const overlayScoreEl = document.getElementById("overlayScore");
const overlayRetryBtn = document.getElementById("overlayRetryBtn");

let audioCtx = null;
let audioBuffer = null;
let source = null;
let startTime = 0;
let beatOffsets = [];
let beatTimes = [];
let hitBeats = new Set();
let score = 0;
let combo = 0;
let rafId = null;
let lastBeatIndex = -1;
let spawnPointer = 0;
let noteEls = new Map();
let hitLineX = 0;
let spawnX = 0;

// "idle" -> "loading" -> "playing" <-> "paused" -> "ended"
let state = "idle";

// Simple energy-based onset detection: split the track into short windows,
// flag a window as a beat when its energy spikes well above the recent
// local average, with a minimum gap so we don't fire on every sample.
function detectBeats(buffer) {
  const sampleRate = buffer.sampleRate;
  const channelCount = buffer.numberOfChannels;
  const length = buffer.length;

  const mono = new Float32Array(length);
  for (let c = 0; c < channelCount; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      mono[i] += data[i] / channelCount;
    }
  }

  const windowSize = 1024;
  const windowCount = Math.ceil(length / windowSize);
  const energies = new Float32Array(windowCount);
  for (let w = 0; w < windowCount; w++) {
    const start = w * windowSize;
    const end = Math.min(start + windowSize, length);
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += mono[i] * mono[i];
    }
    energies[w] = sum;
  }

  const historyWindows = Math.round((1.0 * sampleRate) / windowSize);
  const minGapWindows = Math.round((MIN_BEAT_GAP_SEC * sampleRate) / windowSize);

  const beats = [];
  let lastBeatWindow = -Infinity;
  for (let w = 1; w < windowCount; w++) {
    const histStart = Math.max(0, w - historyWindows);
    let avg = 0;
    for (let k = histStart; k < w; k++) avg += energies[k];
    avg /= Math.max(1, w - histStart);

    const threshold = avg * 1.4;
    if (
      energies[w] > threshold &&
      energies[w] > 1e-6 &&
      w - lastBeatWindow > minGapWindows
    ) {
      beats.push((w * windowSize) / sampleRate);
      lastBeatWindow = w;
    }
  }
  return beats;
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

function flashCharacter(cls) {
  characterEl.classList.remove("hit-perfect", "hit-good", "hit-miss");
  void characterEl.offsetWidth;
  characterEl.classList.add(cls);
  setTimeout(() => characterEl.classList.remove(cls), 200);
}

function measureLane() {
  const laneRect = noteLaneEl.getBoundingClientRect();
  const hitRect = hitLineEl.getBoundingClientRect();
  hitLineX = hitRect.left - laneRect.left + hitRect.width / 2;
  spawnX = laneRect.width + 20;
}

function spawnNote(index) {
  const el = document.createElement("div");
  el.className = "note";
  noteLaneEl.appendChild(el);
  noteEls.set(index, el);
}

function removeNote(index, cls) {
  const el = noteEls.get(index);
  if (!el) return;
  noteEls.delete(index);
  if (cls) {
    el.classList.add(cls);
    setTimeout(() => el.remove(), 250);
  } else {
    el.remove();
  }
}

function clearAllNotes() {
  noteEls.forEach((el) => el.remove());
  noteEls.clear();
}

function updateNotes(now) {
  while (
    spawnPointer < beatTimes.length &&
    beatTimes[spawnPointer] <= now + NOTE_LEAD_SEC
  ) {
    if (!hitBeats.has(spawnPointer)) spawnNote(spawnPointer);
    spawnPointer++;
  }

  noteEls.forEach((el, index) => {
    const t = beatTimes[index];
    const progress = (t - now) / NOTE_LEAD_SEC;
    const x = hitLineX + progress * (spawnX - hitLineX);
    el.style.transform = `translate(${x}px, -50%)`;
  });
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
  if (state !== "playing") return;
  const now = audioCtx.currentTime;
  const { index, diff } = findNearestBeat(now);
  if (index === null) return;

  if (diff <= PERFECT_WINDOW) {
    hitBeats.add(index);
    score += 100;
    combo += 1;
    showJudgment("Perfect", "perfect");
    flashCharacter("hit-perfect");
    removeNote(index, "perfect");
  } else if (diff <= GOOD_WINDOW) {
    hitBeats.add(index);
    score += 50;
    combo += 1;
    showJudgment("Good", "good");
    flashCharacter("hit-good");
    removeNote(index, "good");
  } else {
    combo = 0;
    showJudgment("Miss", "miss");
    flashCharacter("hit-miss");
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
      removeNote(i, "miss");
    }
  });
}

function tick() {
  const now = audioCtx.currentTime;
  checkMissedBeats(now);
  updateNotes(now);

  let currentBeatIndex = lastBeatIndex;
  for (let i = lastBeatIndex + 1; i < beatTimes.length; i++) {
    if (beatTimes[i] <= now) {
      currentBeatIndex = i;
    } else {
      break;
    }
  }
  if (currentBeatIndex !== lastBeatIndex) {
    lastBeatIndex = currentBeatIndex;
    bounceCharacter();
  }

  if (state === "playing") {
    rafId = requestAnimationFrame(tick);
  }
}

function setControlsForState() {
  if (state === "loading") {
    startBtn.hidden = false;
    startBtn.disabled = true;
    startBtn.textContent = "読み込み中...";
    pauseBtn.hidden = true;
    restartBtn.hidden = true;
  } else if (state === "playing" || state === "paused") {
    startBtn.hidden = true;
    pauseBtn.hidden = false;
    pauseBtn.disabled = false;
    pauseBtn.textContent = state === "paused" ? "再開" : "一時停止";
    restartBtn.hidden = false;
    restartBtn.disabled = false;
  } else {
    // idle or ended
    startBtn.hidden = true;
    pauseBtn.hidden = true;
    restartBtn.hidden = false;
    restartBtn.disabled = false;
  }
}

function endGame() {
  state = "ended";
  cancelAnimationFrame(rafId);
  clearAllNotes();
  setControlsForState();
  overlayTitleEl.textContent = "終了！";
  overlayScoreEl.textContent = `Score: ${score}`;
  overlayEl.hidden = false;
}

function pauseGame() {
  if (state !== "playing") return;
  audioCtx.suspend();
  cancelAnimationFrame(rafId);
  state = "paused";
  setControlsForState();
}

function resumeGame() {
  if (state !== "paused") return;
  audioCtx.resume();
  state = "playing";
  setControlsForState();
  rafId = requestAnimationFrame(tick);
}

async function loadAudio() {
  if (audioBuffer) return audioBuffer;
  const res = await fetch(AUDIO_URL);
  const arrayBuffer = await res.arrayBuffer();
  audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  return audioBuffer;
}

async function playGame() {
  if (state === "loading") return;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  if (source) {
    source.onended = null;
    try {
      source.stop();
    } catch (err) {
      // already stopped
    }
    source = null;
  }

  overlayEl.hidden = true;

  if (!audioBuffer) {
    state = "loading";
    setControlsForState();
  }

  try {
    const buffer = await loadAudio();
    if (!beatOffsets.length) {
      beatOffsets = detectBeats(buffer);
    }

    score = 0;
    combo = 0;
    hitBeats = new Set();
    lastBeatIndex = -1;
    spawnPointer = 0;
    clearAllNotes();
    scoreEl.textContent = "0";
    comboEl.textContent = "0";
    judgmentEl.className = "";
    judgmentEl.textContent = "";

    measureLane();

    startTime = audioCtx.currentTime + LEAD_IN_SEC;
    beatTimes = beatOffsets.map((t) => startTime + t);

    source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.onended = () => {
      if (state === "playing") endGame();
    };
    source.start(startTime);

    state = "playing";
    setControlsForState();

    rafId = requestAnimationFrame(tick);
  } catch (err) {
    console.error(err);
    state = "idle";
    setControlsForState();
    startBtn.hidden = false;
    startBtn.disabled = false;
    startBtn.textContent = "スタート";
    showJudgment("音楽の読み込みに失敗しました", "miss");
  }
}

startBtn.addEventListener("click", playGame);
restartBtn.addEventListener("click", playGame);
overlayRetryBtn.addEventListener("click", playGame);

pauseBtn.addEventListener("click", () => {
  if (state === "playing") pauseGame();
  else if (state === "paused") resumeGame();
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.key === " " || e.key === "Spacebar") {
    e.preventDefault();
    handleSpace();
  }
});
