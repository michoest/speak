/**
 * Extracts a fundamental frequency (F0) pitch curve from an AudioBuffer.
 * Uses the autocorrelation (YIN-inspired) method on 20ms frames.
 * Returns an array of { time, freq } objects (freq = 0 means unvoiced/silence).
 */
export function extractPitchCurve(audioBuffer, { frameMs = 20, minHz = 75, maxHz = 600 } = {}) {
  const sampleRate = audioBuffer.sampleRate
  const data = audioBuffer.getChannelData(0)
  const frameSize = Math.round((frameMs / 1000) * sampleRate)
  const curve = []

  for (let offset = 0; offset + frameSize <= data.length; offset += frameSize) {
    const frame = data.slice(offset, offset + frameSize)
    const freq = autocorrelation(frame, sampleRate, minHz, maxHz)
    curve.push({ time: offset / sampleRate, freq })
  }

  return curve
}

function autocorrelation(frame, sampleRate, minHz, maxHz) {
  const n = frame.length
  const minPeriod = Math.floor(sampleRate / maxHz)
  const maxPeriod = Math.floor(sampleRate / minHz)

  // Compute r(0): signal energy, used for normalization
  let r0 = 0
  for (let i = 0; i < n; i++) r0 += frame[i] * frame[i]
  r0 /= n
  if (r0 < 1e-6) return 0  // silence

  let bestPeriod = 0
  let bestCorr = -1

  for (let lag = minPeriod; lag <= Math.min(maxPeriod, n - 1); lag++) {
    let corr = 0
    for (let i = 0; i < n - lag; i++) corr += frame[i] * frame[i + lag]
    // Normalize to [-1, 1] range so threshold is meaningful regardless of amplitude
    corr /= (n - lag) * r0
    if (corr > bestCorr) { bestCorr = corr; bestPeriod = lag }
  }

  // 0.3 is a reliable threshold for normalized autocorrelation on clean speech/TTS
  if (bestPeriod === 0 || bestCorr < 0.3) return 0
  return sampleRate / bestPeriod
}

/**
 * Decodes an audio blob or ArrayBuffer into an AudioBuffer.
 */
export async function decodeAudio(source) {
  const Ctx = window.AudioContext || window.webkitAudioContext
  const ctx = new Ctx()
  const ab = source instanceof Blob ? await source.arrayBuffer() : source
  return ctx.decodeAudioData(ab)
}

/**
 * Computes a DTW-based similarity score (0–100) between two pitch curves.
 * Ignores unvoiced frames (freq = 0) in both.
 */
export function computePitchSimilarity(curve1, curve2) {
  const voiced1 = curve1.filter((p) => p.freq > 0).map((p) => p.freq)
  const voiced2 = curve2.filter((p) => p.freq > 0).map((p) => p.freq)

  if (voiced1.length === 0 || voiced2.length === 0) return null

  // Normalize to semitones (log scale) relative to each speaker's mean
  const toSemitones = (freqs) => {
    const mean = freqs.reduce((a, b) => a + b, 0) / freqs.length
    return freqs.map((f) => 12 * Math.log2(f / mean))
  }

  const s1 = toSemitones(voiced1)
  const s2 = toSemitones(voiced2)

  const dist = dtw(s1, s2)
  const normDist = dist / Math.max(s1.length, s2.length)

  // Convert distance to 0-100 score (lower distance = higher score)
  const score = Math.max(0, Math.min(100, 100 - normDist * 8))
  return Math.round(score)
}

function dtw(a, b) {
  const n = a.length, m = b.length
  const D = Array.from({ length: n + 1 }, () => new Float32Array(m + 1).fill(Infinity))
  D[0][0] = 0
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(a[i - 1] - b[j - 1])
      D[i][j] = cost + Math.min(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1])
    }
  }
  return D[n][m]
}
