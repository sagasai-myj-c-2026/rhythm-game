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

// Optional tidy-up for songs with a steady tempo: finds the beat grid from
// the audio itself, then pulls each detected beat onto it when it is already
// close. Off-grid beats are left alone, so nothing is invented.
export function snapBeatsToGrid(buffer, beats, { subdivision, minBeatGapSec }) {
  if (beats.length < 8) return beats;

  const sampleRate = buffer.sampleRate;
  const hop = 512;
  const frames = Math.floor(buffer.length / hop);
  const energy = new Float32Array(frames);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let f = 0; f < frames; f++) {
      let sum = 0;
      for (let i = f * hop; i < (f + 1) * hop; i++) sum += data[i] * data[i];
      energy[f] += Math.sqrt(sum / hop) / buffer.numberOfChannels;
    }
  }
  const flux = new Float32Array(frames);
  for (let f = 1; f < frames; f++) flux[f] = Math.max(0, energy[f] - energy[f - 1]);

  const hopSec = hop / sampleRate;
  let beatLag = 0;
  let bestScore = -1;
  for (let lag = Math.round(0.25 / hopSec); lag <= Math.round(1.0 / hopSec); lag++) {
    let score = 0;
    for (let i = 0; i + lag < frames; i++) score += flux[i] * flux[i + lag];
    score /= frames - lag;
    if (score > bestScore) {
      bestScore = score;
      beatLag = lag;
    }
  }

  const step0 = (beatLag * hopSec) / subdivision;
  const tolerance = Math.min(0.06, step0 * 0.33);
  let best = { err: Infinity, step: step0, phase: 0 };
  for (let step = step0 * 0.97; step <= step0 * 1.03; step += step0 * 0.0006) {
    for (let phase = 0; phase < step; phase += 0.004) {
      let err = 0;
      for (const t of beats) {
        let r = (((t - phase) % step) + step) % step;
        if (r > step / 2) r -= step;
        err += Math.min(Math.abs(r), tolerance);
      }
      if (err < best.err) best = { err, step, phase };
    }
  }

  const snapped = [];
  for (const t of beats) {
    const grid = best.phase + Math.round((t - best.phase) / best.step) * best.step;
    const v = Math.abs(t - grid) <= tolerance ? grid : t;
    if (v >= 0 && (snapped.length === 0 || v - snapped[snapped.length - 1] >= minBeatGapSec - 1e-6)) {
      snapped.push(v);
    }
  }
  return snapped;
}
