import { initGame } from "./core/game-core.js";
import { stages, defaultStageId } from "./stages/index.js";
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
];

const domRefs = Object.fromEntries(
  ids.map((id) => [id, document.getElementById(id)])
);

const requestedId = new URLSearchParams(location.search).get("stage");
const stageConfig = stages[requestedId] ?? stages[defaultStageId];

initGame(stageConfig, domRefs);
initKeyboardInput();

const hasMouthNotes = (stageConfig.specialNotes?.mouthNoteEvery ?? 0) > 0;
if (hasMouthNotes) {
  const statusEl = document.getElementById("mouthStatus");
  domRefs.startBtn.addEventListener(
    "click",
    async () => {
      statusEl.hidden = false;
      statusEl.textContent = "カメラを準備中...";
      try {
        const { initMouthInput } = await import("./core/input/mouth-input.js");
        await initMouthInput({
          onOpenChange: (open) => {
            statusEl.textContent = `カメラ: オン(口: ${open ? "開" : "閉"})`;
          },
        });
        statusEl.textContent = "カメラ: オン(口: 閉)";
      } catch (err) {
        console.error(err);
        statusEl.textContent =
          "カメラを使えないため、口ノーツはMissになります";
      }
    },
    { once: true }
  );
}
