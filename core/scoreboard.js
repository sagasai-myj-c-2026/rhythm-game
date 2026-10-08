const STORAGE_KEY = "space-rhythm-scores";
const MAX_DISPLAY = 5;

/**
 * Save a completed game score for a specific stage.
 */
export function saveScore(stageId, score) {
  const allScores = getAllScores();

  if (!allScores[stageId]) {
    allScores[stageId] = [];
  }

  allScores[stageId].push({
    score: score,
    date: new Date().toISOString(),
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(allScores));
}

/**
 * Get all saved scores for one stage,
 * sorted from highest to lowest.
 */
export function getScores(stageId) {
  const allScores = getAllScores();

  return (allScores[stageId] || []).sort((a, b) => b.score - a.score);
}

/**
 * Get everything stored in localStorage.
 */
function getAllScores() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return {};
    }

    return JSON.parse(saved);
  } catch (error) {
    console.error("Failed to load scoreboard:", error);
    return {};
  }
}

/**
 * Display the top 5 scores for the current stage.
 */
export function renderScoreboard(stageId, scoreboardElement) {
  if (!scoreboardElement) {
    return;
  }

  const scores = getScores(stageId);

  scoreboardElement.innerHTML = "";

  if (scores.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.textContent = "No scores yet";
    scoreboardElement.appendChild(emptyMessage);
    return;
  }

  scores.slice(0, MAX_DISPLAY).forEach((entry, index) => {
    const item = document.createElement("li");

    const date = new Date(entry.date);
    const formattedDate = date.toLocaleDateString();

    item.textContent = `${entry.score} — ${formattedDate}`;

    scoreboardElement.appendChild(item);
  });
}