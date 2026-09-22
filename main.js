import { initGame } from "./core/game-core.js";
import { stages } from "./stages/index.js";
import { renderStageSelect } from "./stages/select.js";
import { initKeyboardInput } from "./core/input/keyboard-input.js";

const ids = [
  "stage",
  "stageTitle",
  "startBtn",
  "pauseBtn",
  "restartBtn",
  "character",
  "judgment",
  "score",
  "combo",
  "noteLane",
  "hitLine",
  "overlay",
  "overlayTitle",
  "overlayScore",
  "overlayRetryBtn",
  "volume",
  "timeline",
  "playbackSpeed",
];

const requestedId = new URLSearchParams(location.search).get("stage");
const stageConfig = stages[requestedId];

if (!stageConfig) {
  const selectScreen = document.getElementById("select-screen");
  renderStageSelect(
    Object.values(stages),
    document.getElementById("stage-list")
  );
  selectScreen.hidden = false;
} else {
  document.getElementById("game").hidden = false;

  const domRefs = Object.fromEntries(
    ids.map((id) => [id, document.getElementById(id)])
  );

  initGame(stageConfig, domRefs);
  initKeyboardInput();

  const hasMouthNotes = (stageConfig.specialNotes?.mouthNoteEvery ?? 0) > 0;
  if (hasMouthNotes) {
    const statusEl = document.getElementById("mouthStatus");
    const indicatorEl = document.getElementById("mouthIndicator");
    domRefs.startBtn.addEventListener(
      "click",
      async () => {
        statusEl.hidden = false;
        statusEl.textContent = "カメラを準備中...";
        try {
          const { initMouthInput } = await import(
            "./core/input/mouth-input.js"
          );
          await initMouthInput({
            onOpenChange: (open) => {
              indicatorEl.textContent = open ? "😮" : "😶";
              indicatorEl.classList.toggle("open", open);
            },
          });
          statusEl.textContent = "カメラ: オン";
          indicatorEl.hidden = false;
        } catch (err) {
          console.error(err);
          statusEl.textContent =
            "カメラを使えないため、口ノーツはMissになります";
        }
      },
      { once: true }
    );
  }
}
