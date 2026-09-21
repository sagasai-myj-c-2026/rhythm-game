export default {
  id: "stage1",
  title: "Shining Star",
  audioUrl: "assets/songs/stage1.mp3",
  background: { type: "color", value: "#16213e" },
  character: { type: "emoji", value: "🐰" },
  difficulty: {
    perfectWindow: 0.08,
    goodWindow: 0.18,
    noteLeadSec: 1.1,
    minBeatGapSec: 0.3,
    energyThreshold: 1.4,
  },
  specialNotes: {
    mouthNoteEvery: 8,
  },
};
