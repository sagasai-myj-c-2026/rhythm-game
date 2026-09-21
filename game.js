const AUDIO_URL = "maou_inst_short_14_shining_star.mp3";
const LEAD_IN_SEC = 0.5;
const PERFECT_WINDOW = 0.08;
const GOOD_WINDOW = 0.18;
const MIN_BEAT_GAP_SEC = 0.3;

const startBtn = document.getElementById("startBtn");
const characterEl = document.getElementById("character");
const judgmentEl = document.getElementById("judgment");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");

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
let playing = false;

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
  if (!playing) return;
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

function tick() {
  const now = audioCtx.currentTime;
  checkMissedBeats(now);

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

  if (playing) {
    rafId = requestAnimationFrame(tick);
  }
}

function endGame() {
  playing = false;
  cancelAnimationFrame(rafId);
  startBtn.disabled = false;
  startBtn.textContent = "もう一度プレイ";
  showJudgment(`終了！ Score: ${score}`, "perfect");
}

async function loadAudio() {
  if (audioBuffer) return audioBuffer;
  const res = await fetch(AUDIO_URL);
  const arrayBuffer = await res.arrayBuffer();
  audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  return audioBuffer;
}

async function startGame() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  startBtn.disabled = true;
  startBtn.textContent = "読み込み中...";

  try {
    const buffer = await loadAudio();
    if (!beatOffsets.length) {
      beatOffsets = detectBeats(buffer);
    }

    score = 0;
    combo = 0;
    hitBeats = new Set();
    lastBeatIndex = -1;
    scoreEl.textContent = "0";
    comboEl.textContent = "0";
    judgmentEl.className = "";
    judgmentEl.textContent = "";

    startTime = audioCtx.currentTime + LEAD_IN_SEC;
    beatTimes = beatOffsets.map((t) => startTime + t);

    source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.onended = () => {
      if (playing) endGame();
    };
    source.start(startTime);

    playing = true;
    startBtn.textContent = "プレイ中...";

    rafId = requestAnimationFrame(tick);
  } catch (err) {
    console.error(err);
    startBtn.disabled = false;
    startBtn.textContent = "スタート";
    showJudgment("音楽の読み込みに失敗しました", "miss");
  }
}

startBtn.addEventListener("click", startGame);

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.key === " " || e.key === "Spacebar") {
    e.preventDefault();
    handleSpace();
  }
});
