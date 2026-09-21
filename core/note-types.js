export function assignNoteTypes(beatOffsets, stageConfig) {
  const every = stageConfig.specialNotes?.mouthNoteEvery ?? 0;
  return beatOffsets.map((time, i) => ({
    time,
    type: every > 0 && (i + 1) % every === 0 ? "mouth" : "keyboard",
  }));
}
