<template>
  <canvas ref="canvas" :width="width" :height="height" class="pitch-canvas" />
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  nativeCurve: { type: Array, default: () => [] },   // [{ time, freq }]
  userCurve:   { type: Array, default: () => [] },
  width:       { type: Number, default: 320 },
  height:      { type: Number, default: 120 },
})

const canvas = ref(null)

function draw() {
  const el = canvas.value
  if (!el) return
  const ctx = el.getContext('2d')
  ctx.clearRect(0, 0, props.width, props.height)

  const allFreqs = [
    ...props.nativeCurve.filter(p => p.freq > 0).map(p => p.freq),
    ...props.userCurve.filter(p => p.freq > 0).map(p => p.freq),
  ]
  if (allFreqs.length === 0) return

  const minF = Math.min(...allFreqs) * 0.85
  const maxF = Math.max(...allFreqs) * 1.15
  const pad = { top: 8, bottom: 8, left: 4, right: 4 }
  const W = props.width - pad.left - pad.right
  const H = props.height - pad.top - pad.bottom

  function freqY(f) {
    return pad.top + H - ((f - minF) / (maxF - minF)) * H
  }

  function drawCurve(curve, color) {
    if (curve.length === 0) return
    const duration = curve[curve.length - 1].time || 1
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    let started = false
    for (const p of curve) {
      if (p.freq === 0) { started = false; continue }
      const x = pad.left + (p.time / duration) * W
      const y = freqY(p.freq)
      if (!started) { ctx.moveTo(x, y); started = true } else { ctx.lineTo(x, y) }
    }
    ctx.stroke()

    // Dots at voiced points
    ctx.fillStyle = color
    for (const p of curve) {
      if (p.freq === 0) continue
      const x = pad.left + (p.time / duration) * W
      const y = freqY(p.freq)
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Grid line at midpoint
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad.left, props.height / 2)
  ctx.lineTo(props.width - pad.right, props.height / 2)
  ctx.stroke()

  drawCurve(props.nativeCurve, '#22d3ee')   // cyan = native
  drawCurve(props.userCurve,   '#a78bfa')   // purple = user
}

onMounted(draw)
watch(() => [props.nativeCurve, props.userCurve], draw, { deep: true })
</script>

<style scoped>
.pitch-canvas {
  width: 100%;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
</style>
