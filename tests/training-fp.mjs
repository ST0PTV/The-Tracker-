// Hilfe für tests/training-anim.test.js (kein Test selbst). Mit derselben Funktion wurde der Fingerabdruck
// aus dem Original (Workout-Tracker 3.14.0, js/) erzeugt: tests/fixtures/anim-fingerprints-wt-3.14.0.json.
import { createHash } from 'node:crypto';
export async function fingerprints(dir) {
  const D = await import(dir + '/anim-data.js');
  const M = await import(dir + '/motion.js');
  const out = {};
  for (const a of D.ANIMATIONS) {
    const vars = a.variants ? a.variants.map((v) => v.key) : [null];
    const parts = [];
    for (const v of vars) {
      const fr = M.resolveFrames(D.framesOf(a, v));
      const T = M.cycleLength(a.phases);
      for (let i = 0; i < 16; i++) {
        const { pose } = M.poseAt(fr, a.phases, (T * i) / 16);
        parts.push(JSON.stringify({ j: pose.joints, a: pose.angles, s: pose.scene }, (k, x) => (typeof x === 'number' ? Math.round(x * 100) / 100 : x)));
      }
    }
    out[a.ref] = createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
  }
  return out;
}
