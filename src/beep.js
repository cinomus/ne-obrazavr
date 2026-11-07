let audio;

function context() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audio) audio = new Ctx();
  if (audio.state === "suspended") audio.resume();
  return audio;
}

export function beep(kind) {
  const ctx = context();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = kind === "ok" ? 880 : kind === "bad" ? 174 : 523;
  gain.gain.setValueAtTime(0.045, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.17);
}
