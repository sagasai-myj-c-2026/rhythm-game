// stages/stage2.js
// TODO: 曲・見た目を差し替え。現状はプレースホルダーです。
export default {
  id: "stage2",
  title: "Burning Hearts",
  audioUrl: "assets/songs/stage2.mp3",
  background: { type: "image", value: "assets/bg/back_cappa.png" },
  character: {
    type: "sprite",
    offsetX: -1.5,
    frames: {
      normal: "assets/chars/cappa_normal.png",
      normal2: "assets/chars/cappa_normal2.png",
      perfect: "assets/chars/cappa_perfect.png",
      miss: "assets/chars/cappa_miss.png",
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
