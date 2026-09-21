// stages/stage3.js
// TODO: 曲・見た目を差し替え。現状はプレースホルダーです。
export default {
  id: "stage3",
  title: "Stage 3 (仮)",
  audioUrl: "assets/songs/stage3.mp3",
  background: { type: "color", value: "#1a3e2e" },
  character: { type: "emoji", value: "🐻" },
  difficulty: {
    perfectWindow: 0.07,
    goodWindow: 0.16,
    noteLeadSec: 1.0,
    minBeatGapSec: 0.25,
    energyThreshold: 1.5,
  },
  specialNotes: {
    mouthNoteEvery: 4,
  },
};
