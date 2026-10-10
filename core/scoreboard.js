
const SUPABASE_URL = "https://shxsapqkiwngldjbjibv.supabase.co";
const SUPABASE_KEY = "sb_publishable_CRSrmpmvEJVgV6stWbTftQ_4kBh6-Sf";

const MAX_DISPLAY = 5;

const SCORES_URL = `${SUPABASE_URL}/rest/v1/scores`;

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

/**
 * Save a completed game score to the shared database.
 */
export async function saveScore(stageId, score) {
  const response = await fetch(SCORES_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      stage_id: stageId,
      score: Math.max(0, Math.floor(score)),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save score: ${response.status}`);
  }
}

/**
 * Get the top scores for one stage from the shared database.
 */
export async function getScores(stageId) {
  const params = new URLSearchParams({
    select: "score,created_at",
    stage_id: `eq.${stageId}`,
    order: "score.desc,created_at.asc",
    limit: String(MAX_DISPLAY),
  });

  const response = await fetch(`${SCORES_URL}?${params}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to load scores: ${response.status}`);
  }

  return response.json();
}

/**
 * Display the top 5 scores for the current stage.
 */
export async function renderScoreboard(stageId, scoreboardElement) {
  if (!scoreboardElement) return;

  scoreboardElement.replaceChildren();

  const message = document.createElement("li");
  message.textContent = "Loading scores...";
  scoreboardElement.appendChild(message);

  try {
    const scores = await getScores(stageId);
    scoreboardElement.replaceChildren();

    if (scores.length === 0) {
      message.textContent = "No scores yet";
      scoreboardElement.appendChild(message);
      return;
    }

    scores.forEach((entry) => {
      const item = document.createElement("li");
      const date = new Date(entry.created_at);
      const formattedDate = date.toLocaleDateString();

      item.textContent = `${entry.score} — ${formattedDate}`;
      scoreboardElement.appendChild(item);
    });
  } catch (error) {
    console.error("Failed to load scoreboard:", error);
    message.textContent = "Ranking unavailable";
    scoreboardElement.replaceChildren(message);
  }
}
