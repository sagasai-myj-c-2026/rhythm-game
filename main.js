import { initGame } from "./core/game-core.js";
import { stages, defaultStageId } from "./stages/index.js";

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
