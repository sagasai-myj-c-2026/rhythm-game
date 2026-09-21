import { initGame } from "./core/game-core.js";
import stage1 from "./stages/stage1.js";

const ids = [
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
];

const domRefs = Object.fromEntries(
  ids.map((id) => [id, document.getElementById(id)])
);

initGame(stage1, domRefs);
