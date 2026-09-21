// stages/select.js
// ステージ選択画面のロジック(メンバー3担当)
//
// 注意: `stages/index.js`(全ステージ一覧のレジストリ)はメンバー1の担当ファイルのため、
// ここでは各ステージファイルを直接importしています。
// レジストリが完成したら `import stages from "./index.js"` に差し替えてください。
import stage1 from "./stage1.js";
import stage2 from "./stage2.js";
import stage3 from "./stage3.js";

const stages = [stage1, stage2, stage3];

const params = new URLSearchParams(location.search);
const selectedId = params.get("stage");

const selectScreen = document.getElementById("select-screen");
const gameScreen = document.getElementById("game");
const stageListEl = document.getElementById("stage-list");

function renderStageList() {
  stageListEl.innerHTML = "";
  stages.forEach((stage) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "stage-card";
    card.style.background =
      stage.background?.type === "color" ? stage.background.value : "#16213e";

    const charEl = document.createElement("div");
    charEl.className = "stage-card-char";
    charEl.textContent = stage.character?.value ?? "🎵";

    const titleEl = document.createElement("div");
    titleEl.className = "stage-card-title";
    titleEl.textContent = stage.title;

    card.appendChild(charEl);
    card.appendChild(titleEl);

    card.addEventListener("click", () => {
      location.href = `?stage=${encodeURIComponent(stage.id)}`;
    });

    stageListEl.appendChild(card);
  });
}

function showGameScreen(stage) {
  selectScreen.style.display = "none";
  gameScreen.style.display = "block";

  // 暫定ブリッジ: core/game-core.js の initGame(stageConfig) が完成するまでの間、
  // game.js が window.SELECTED_STAGE を参照できるように置いておく。
  // initGame() が実装されたら、この行と game.js 側の対応は不要になる想定。
  window.SELECTED_STAGE = stage;

  const titleEl = document.querySelector("#game h1");
  if (titleEl) titleEl.textContent = stage.title;
}

if (selectedId) {
  const stage = stages.find((s) => s.id === selectedId) ?? stages[0];
  showGameScreen(stage);
} else {
  renderStageList();
}
