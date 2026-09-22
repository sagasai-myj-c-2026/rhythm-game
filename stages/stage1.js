export default {
  id: "stage1",
  title: "Shining Star",
  audioUrl: "assets/songs/stage1.mp3",
  background: { type: "image", value: "assets/bg/back_dra.png" },
  character: {
    type: "sprite",
    offsetX: 0.9,
    frames: {
      normal: "assets/chars/dra_normal.png",
      normal2: "assets/chars/dra_normal2.png",
      perfect: "assets/chars/dra_perfect.png",
      miss: "assets/chars/dra_miss.png",
    },
  },
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
