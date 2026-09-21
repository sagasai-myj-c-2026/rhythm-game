// Simple energy-based onset detection: split the track into short windows,
// flag a window as a beat when its energy spikes well above the recent
// local average, with a minimum gap so we don't fire on every sample.
export function detectBeats(buffer, { minBeatGapSec, energyThreshold }) {
  const sampleRate = buffer.sampleRate;
  const channelCount = buffer.numberOfChannels;
  const length = buffer.length;

  const mono = new Float32Array(length);
  for (let c = 0; c < channelCount; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      mono[i] += data[i] / channelCount;
    }
  }

  const windowSize = 1024;
  const windowCount = Math.ceil(length / windowSize);
  const energies = new Float32Array(windowCount);
  for (let w = 0; w < windowCount; w++) {
    const start = w * windowSize;
    const end = Math.min(start + windowSize, length);
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += mono[i] * mono[i];
    }
    energies[w] = sum;
  }

  const historyWindows = Math.round((1.0 * sampleRate) / windowSize);
  const minGapWindows = Math.round((minBeatGapSec * sampleRate) / windowSize);

  const beats = [];
  let lastBeatWindow = -Infinity;
  for (let w = 1; w < windowCount; w++) {
    const histStart = Math.max(0, w - historyWindows);
    let avg = 0;
    for (let k = histStart; k < w; k++) avg += energies[k];
    avg /= Math.max(1, w - histStart);

    const threshold = avg * energyThreshold;
    if (
      energies[w] > threshold &&
      energies[w] > 1e-6 &&
      w - lastBeatWindow > minGapWindows
    ) {
      beats.push((w * windowSize) / sampleRate);
      lastBeatWindow = w;
    }
  }
  return beats;
}
