import { detectBeats, snapBeatsToGrid } from "./beat-detector.js";
import { inputBus } from "./input/input-bus.js";
import { assignNoteTypes } from "./note-types.js";

const LEAD_IN_SEC = 0.5;
const IDLE_FRAME_SEC = 0.3;
const HIT_FRAME_SEC = 0.3;

export function initGame(stageConfig, domRefs) {
  const AUDIO_URL = stageConfig.audioUrl;
  const {
    perfectWindow: PERFECT_WINDOW,
    goodWindow: GOOD_WINDOW,
    noteLeadSec: NOTE_LEAD_SEC,
    minBeatGapSec,
    energyThreshold,
    gridSubdivision = 0,
  } = stageConfig.difficulty;

  const DEBUG_NOTES = new URLSearchParams(location.search).get("debug") === "1";

  const {
    stage: stageEl,
    stageTitle: stageTitleEl,
    startBtn,
    pauseBtn,
    restartBtn,
    character: characterEl,
    judgment: judgmentEl,
    score: scoreEl,
    combo: comboEl,
    noteLane: noteLaneEl,
    hitLine: hitLineEl,
    overlay: overlayEl,
    overlayTitle: overlayTitleEl,
    overlayScore: overlayScoreEl,
    overlayRetryBtn,
    volume: volumeEl,
  } = domRefs;

  let audioCtx = null;
  let gainNode = null;
  let audioBuffer = null;
  let source = null;
  let startTime = 0;
  let beatOffsets = [];
  let beatTimes = [];
  let noteTypes = [];
  let hitBeats = new Set();
  let score = 0;
  let combo = 0;
  let rafId = null;
  let hitFrameUntil = 0;
  let spawnPointer = 0;
  let noteEls = new Map();
  let hitLineX = 0;
  let spawnX = 0;
  let recordedTimes = [];

  // "idle" -> "loading" -> "playing" <-> "paused" -> "ended"
  let state = "idle";

  function applyStageLook() {
    stageTitleEl.textContent = stageConfig.title;
    document.title = `${stageConfig.title} - Space Rhythm`;

    const { background, character } = stageConfig;
    if (background.type === "image") {
      stageEl.style.backgroundImage = `url("${background.value}")`;
      stageEl.style.backgroundSize = "cover";
      stageEl.style.backgroundPosition = "center";
    } else {
      stageEl.style.background = background.value;
    }

    characterEl.style.setProperty("--char-offset", `${character.offsetX ?? 0}%`);
    characterEl.replaceChildren(
      ...Object.entries(character.frames).map(([name, url]) => {
        const img = document.createElement("img");
        img.className = `frame-${name}`;
        img.src = url;
        img.alt = "";
        return img;
      })
    );
    setCharacterFrame("normal");
  }

  function showLoadError() {
    overlayTitleEl.textContent = "読み込みエラー";
    overlayScoreEl.textContent =
      "ファイルが設定されていないため音楽の読み込みに失敗しました";
    overlayEl.hidden = false;
  }

  function showJudgment(text, cls) {
    judgmentEl.textContent = text;
    judgmentEl.className = cls;
    void judgmentEl.offsetWidth;
    judgmentEl.classList.add("show");
  }

  function setCharacterFrame(name) {
    if (characterEl.dataset.frame !== name) characterEl.dataset.frame = name;
  }

  function showHitFrame(name, now) {
    setCharacterFrame(name);
    hitFrameUntil = now + HIT_FRAME_SEC;
  }

  // Swaps normal/normal2 on the audio clock, so it freezes while paused.
  function updateCharacterFrame(now) {
    if (now < hitFrameUntil) return;
    const phase = Math.floor(now / IDLE_FRAME_SEC) % 2;
    setCharacterFrame(phase === 0 ? "normal" : "normal2");
  }

  function measureLane() {
    const laneRect = noteLaneEl.getBoundingClientRect();
    const hitRect = hitLineEl.getBoundingClientRect();
    hitLineX = hitRect.left - laneRect.left + hitRect.width / 2;
    spawnX = -laneRect.width * 0.05;
  }

  function spawnNote(index) {
    const el = document.createElement("div");
    el.className = noteTypes[index] === "mouth" ? "note mouth" : "note";
    if (DEBUG_NOTES) {
      const label = document.createElement("div");
      label.className = "note-debug-label";
      label.textContent = `#${index} ${beatOffsets[index].toFixed(2)}s`;
      el.appendChild(label);
    }
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

  function findNearestBeat(now, type) {
    let nearest = null;
    let nearestDiff = Infinity;
    for (let i = 0; i < beatTimes.length; i++) {
      if (hitBeats.has(i) || noteTypes[i] !== type) continue;
      const diff = Math.abs(beatTimes[i] - now);
      if (diff < nearestDiff) {
        nearestDiff = diff;
        nearest = i;
      }
    }
    return { index: nearest, diff: nearestDiff };
  }

  // Short synthesized blip on every press; pitch says how it went.
  function playPressSound(type, result) {
    const pitch = { perfect: 1175, good: 880, miss: 196 }[result];
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    osc.type = type === "mouth" ? "triangle" : "sine";
    osc.frequency.value = type === "mouth" ? pitch * 0.75 : pitch;
    env.gain.setValueAtTime(0.3, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(env).connect(gainNode);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  function handleAction(type) {
    if (state !== "playing") return;
    const now = audioCtx.currentTime;
    if (RECORD_MODE) {
      const t = +(Math.max(0, now - startTime).toFixed(3));
      recordedTimes.push(t);
      scoreEl.textContent = `● ${recordedTimes.length}`;
      playPressSound(type, "perfect");
      return;
    }
    const { index, diff } = findNearestBeat(now, type);
    if (index === null) {
      playPressSound(type, "miss");
      return;
    }

    if (diff <= PERFECT_WINDOW) {
      hitBeats.add(index);
      score += 100;
      combo += 1;
      showJudgment("Perfect", "perfect");
      playPressSound(type, "perfect");
      showHitFrame("perfect", now);
      removeNote(index, "perfect");
    } else if (diff <= GOOD_WINDOW) {
      hitBeats.add(index);
      score += 50;
      combo += 1;
      showJudgment("Good", "good");
      playPressSound(type, "good");
      showHitFrame("perfect", now);
      removeNote(index, "good");
    } else {
      combo = 0;
      showJudgment("Miss", "miss");
      playPressSound(type, "miss");
      showHitFrame("miss", now);
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

    updateCharacterFrame(now);

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
    setCharacterFrame("normal");
    clearAllNotes();
    setControlsForState();
    if (RECORD_MODE && recordedTimes.length) {
      const line = `noteTimes: ${JSON.stringify(recordedTimes)},`;
      navigator.clipboard.writeText(line).catch(() => {});
      overlayTitleEl.textContent = `${recordedTimes.length}音録音完了`;
      overlayScoreEl.textContent = "クリップボードにコピーしました！stage3.jsに貼り付けてください。";
      console.log(line);
    } else {
      overlayTitleEl.textContent = "終了！";
      overlayScoreEl.textContent = `Score: ${score}`;
    }
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
    if (!res.ok) throw new Error(`Audio not found: ${AUDIO_URL}`);
    const arrayBuffer = await res.arrayBuffer();
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  }

  async function playGame() {
    if (state === "loading") return;

    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = volumeEl.value / 100;
      gainNode.connect(audioCtx.destination);
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
      if (!RECORD_MODE && !beatOffsets.length) {
        beatOffsets = detectBeats(buffer, { minBeatGapSec, energyThreshold });
        if (gridSubdivision > 0) {
          beatOffsets = snapBeatsToGrid(buffer, beatOffsets, {
            subdivision: gridSubdivision,
            minBeatGapSec,
          });
        }
        // Apply manual patch: remove unwanted beats, then add extras, then sort.
        const patch = stageConfig.notesPatch;
        if (patch) {
          const PATCH_TOLERANCE = 0.08;
          if (patch.remove?.length) {
            beatOffsets = beatOffsets.filter(
              (t) => !patch.remove.some((r) => Math.abs(t - r) <= PATCH_TOLERANCE)
            );
          }
          if (patch.add?.length) {
            beatOffsets = [...beatOffsets, ...patch.add].sort((a, b) => a - b);
          }
        }
        if (DEBUG_NOTES) {
          console.table(beatOffsets.map((t, i) => ({ i, t: t.toFixed(3) })));
        }
      }

      score = 0;
      combo = 0;
      recordedTimes = [];
      beatOffsets = RECORD_MODE ? [] : beatOffsets;
      hitBeats = new Set();
      hitFrameUntil = 0;
      setCharacterFrame("normal");
      spawnPointer = 0;
      clearAllNotes();
      scoreEl.textContent = RECORD_MODE ? "● 0" : "0";
      comboEl.textContent = "0";
      judgmentEl.className = "";
      judgmentEl.textContent = "";

      measureLane();

      startTime = audioCtx.currentTime + LEAD_IN_SEC;
      const notes = assignNoteTypes(beatOffsets, stageConfig);
      beatTimes = notes.map((n) => startTime + n.time);
      noteTypes = notes.map((n) => n.type);

      source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(gainNode);
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
      showLoadError();
    }
  }

  applyStageLook();
  window.addEventListener("resize", measureLane);

  startBtn.addEventListener("click", playGame);
  restartBtn.addEventListener("click", playGame);
  overlayRetryBtn.addEventListener("click", playGame);

  volumeEl.addEventListener("input", () => {
    if (gainNode) gainNode.gain.value = volumeEl.value / 100;
  });

  pauseBtn.addEventListener("click", () => {
    if (state === "playing") pauseGame();
    else if (state === "paused") resumeGame();
  });

  inputBus.addEventListener("action", (e) => handleAction(e.detail.type));
}
