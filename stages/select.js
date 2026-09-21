export function renderStageSelect(stageList, container) {
  container.innerHTML = "";
  stageList.forEach((stage) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "stage-card";
    card.style.background =
      stage.background?.type === "color" ? stage.background.value : "#16213e";

    const charEl = document.createElement("div");
    charEl.className = "stage-card-char";
    charEl.textContent =
      stage.character?.type === "emoji" ? stage.character.value : "🎵";

    const titleEl = document.createElement("div");
    titleEl.className = "stage-card-title";
    titleEl.textContent = stage.title;

    card.appendChild(charEl);
    card.appendChild(titleEl);
    card.addEventListener("click", () => {
      location.href = `?stage=${encodeURIComponent(stage.id)}`;
    });

    container.appendChild(card);
  });
}
