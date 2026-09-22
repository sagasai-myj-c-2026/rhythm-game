// stages/stage3.js
// TODO: 曲・見た目を差し替え。現状はプレースホルダーです。
export default {
  id: "stage3",
  title: "みっくみくにしてやんよ",
  audioUrl: "assets/songs/stage3.mp3",
  background: { type: "image", value: "assets/bg/back_miku.png" },
  character: {
    type: "sprite",
    offsetX: 0,
    frames: {
      normal: "assets/chars/miku_normal.png",
      normal2: "assets/chars/miku_normal2.png",
      perfect: "assets/chars/miku_perfect.png",
      miss: "assets/chars/miku_miss.png",
    },
  },
  difficulty: {
    perfectWindow: 0.07,
    goodWindow: 0.16,
    noteLeadSec: 1.0,
    minBeatGapSec: 0.25,
    energyThreshold: 1.5,
    gridSubdivision: 2,
  },
  specialNotes: {
    mouthNoteEvery: 4,
  },
  // Manual timing patch. Use ?debug=1 in the URL to see note index + seconds
  // above each note. Add bad-feeling note times to "remove" (±0.08s tolerance)
  // and any missing beats to "add". Example:
  //   notesPatch: { remove: [12.45, 24.90], add: [13.10] }
  notesPatch: { remove: [], add: [] },
};
