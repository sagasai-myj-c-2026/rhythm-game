// stages/stage2.js
// TODO: 曲・見た目を差し替え。現状はプレースホルダーです。
export default {
  id: "stage2",
  title: "Burning Hearts",
  audioUrl: "assets/songs/stage2.mp3",
  background: { type: "color", value: "#2e1a3e" },
  character: { type: "emoji", value: "🐱" },
  difficulty: {
    perfectWindow: 0.08,
    goodWindow: 0.18,
    noteLeadSec: 1.1,
    minBeatGapSec: 0.3,
    energyThreshold: 1.4,
  },
  specialNotes: {
    mouthNoteEvery: 0,
  },
};
