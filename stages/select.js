export function renderStageSelect(stageList, container) {
  container.innerHTML = "";
  stageList.forEach((stage) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "stage-card";

    const bg = stage.background;
    if (bg?.type === "image") {
      card.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.45)), url("${bg.value}")`;
    } else {
      card.style.background = bg?.value ?? "#16213e";
    }

    const titleEl = document.createElement("div");
    titleEl.className = "stage-card-title";
    titleEl.textContent = stage.title;

    card.appendChild(titleEl);
    card.addEventListener("click", () => {
      location.href = `?stage=${encodeURIComponent(stage.id)}`;
    });

    container.appendChild(card);
  });
}
