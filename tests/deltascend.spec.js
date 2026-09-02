import { test, expect } from './fixtures';

/*
 * DELTASCEND, driven frame by frame. The engine runs on a fixed 1/30 step
 * under requestAnimationFrame; here both the clock and the frame callback
 * are ours, Math.random is pinned by the fixture, and every scenario ends
 * in a hash of the canvas. The hashes are the game's behaviour: a refactor
 * must reproduce them, a real change updates them.
 */

const SCENARIOS = [
  // [name, steps...]: 'f<n>' runs n frames, 'd<key>'/'u<key>' press and
  // release, 'p<key>' taps (down, one frame, up)
  ['menu idle', 'f30'],
  ['menu moves', 'pArrowDown', 'f5', 'pArrowDown', 'f5', 'pArrowUp', 'f10'],
  [
    'church: walk and mount',
    'pz',
    'f20',
    'dArrowRight',
    'f60',
    'uArrowRight',
    'f10',
    'pz',
    'f40',
  ],
  [
    'church: climb and charge',
    'pz',
    'f20',
    'dArrowRight',
    'f60',
    'uArrowRight',
    'f5',
    'pz',
    'f40',
    'pArrowUp',
    'f15',
    'pArrowUp',
    'f15',
    'dz',
    'f25',
    'uz',
    'f30',
    'pArrowLeft',
    'f15',
    'dx',
    'f35',
    'ux',
    'f60',
  ],
  [
    'church: talk to the cup',
    'pz',
    'f20',
    'dArrowLeft',
    'f90',
    'uArrowLeft',
    'pz',
    'f40',
    'pz',
    'f40',
    'pz',
    'f10',
  ],
  [
    'random seed level',
    'pArrowDown',
    'f2',
    'pz',
    'f30',
    'dArrowRight',
    'f30',
    'uArrowRight',
    'pz',
    'f40',
    'pArrowUp',
    'f20',
    'pArrowUp',
    'f20',
    'dz',
    'f30',
    'uz',
    'f40',
  ],
  [
    'enter seed screen',
    'pArrowDown',
    'pArrowDown',
    'f2',
    'pz',
    'f10',
    'dArrowUp',
    'f12',
    'uArrowUp',
    'pArrowRight',
    'f5',
    'dArrowDown',
    'f7',
    'uArrowDown',
    'f5',
  ],
  [
    'seed 0000 climbed',
    'pArrowDown',
    'pArrowDown',
    'f2',
    'pz',
    'f10',
    'pz',
    'f45',
    'dArrowRight',
    'f40',
    'uArrowRight',
    'pz',
    'f40',
    'pArrowUp',
    'f20',
    'dz',
    'f30',
    'uz',
    'f30',
  ],
  [
    'the flood',
    'pArrowDown',
    'pArrowDown',
    'pArrowDown',
    'f2',
    'pz',
    'f130',
    'pArrowUp',
    'f12',
    'pArrowUp',
    'f12',
    'dz',
    'f30',
    'uz',
    'f40',
    'pArrowRight',
    'f20',
    'f120',
  ],
  [
    'secret room 6453',
    'pArrowDown',
    'pArrowDown',
    'f2',
    'pz',
    'f10',
    'dArrowUp',
    'f31',
    'uArrowUp',
    'pArrowRight',
    'dArrowUp',
    'f21',
    'uArrowUp',
    'pArrowRight',
    'dArrowUp',
    'f26',
    'uArrowUp',
    'pArrowRight',
    'dArrowUp',
    'f16',
    'uArrowUp',
    'pz',
    'f40',
    'dArrowUp',
    'f60',
    'uArrowUp',
    'pz',
    'f30',
    'pz',
    'f30',
  ],
  ['escape back to menu', 'pz', 'f30', 'pEscape', 'f10'],
];

// Recorded from the engine as it was before the module split
const GOLDEN = {
  'menu idle': '80851672',
  'menu moves': 'd0a16f5b',
  'church: walk and mount': '20855f25',
  'church: climb and charge': '4f2971db',
  'church: talk to the cup': '242097aa',
  'random seed level': 'd2d1e66f',
  'enter seed screen': '13bd31fe',
  'seed 0000 climbed': 'f86e4561',
  'the flood': '8c9af126',
  'secret room 6453': '8d932772',
  'escape back to menu': '2852edfb',
};

async function runScenario(page, steps) {
  return page.evaluate(async steps => {
    const { createGame } = await import('/src/WinXP/apps/ClimbRace/engine.js');
    // A frame loop we drive by hand
    let queued = null;
    let now = 0;
    window.requestAnimationFrame = cb => {
      queued = cb;
      return 1;
    };
    window.cancelAnimationFrame = () => {};
    performance.now = () => now;
    const wrap = document.createElement('div');
    wrap.tabIndex = 0;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    wrap.appendChild(canvas);
    document.body.appendChild(wrap);
    const game = createGame(canvas, {
      getVolume: () => 0,
      keyTarget: wrap,
      store: { load: () => ({}), save: () => {} },
      awardPoints: () => {},
    });
    // assets load, then the engine asks for its first frame
    for (let i = 0; i < 400 && !queued; i++)
      await new Promise(r => setTimeout(r, 25));
    if (!queued) throw new Error('the engine never started');
    const frame = () => {
      const cb = queued;
      queued = null;
      now += 1000 / 30;
      cb(now);
    };
    const key = (type, k) =>
      wrap.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
    for (const step of steps) {
      const op = step[0];
      const arg = step.slice(1);
      if (op === 'f') for (let i = 0; i < Number(arg); i++) frame();
      else if (op === 'd') key('keydown', arg);
      else if (op === 'u') key('keyup', arg);
      else if (op === 'p') {
        key('keydown', arg);
        frame();
        key('keyup', arg);
      }
    }
    // FNV-1a over the rendered frame
    const data = canvas.toDataURL();
    let h = 0x811c9dc5;
    for (let i = 0; i < data.length; i++) {
      h ^= data.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    game.destroy();
    wrap.remove();
    return h.toString(16);
  }, steps);
}

for (const [name, ...steps] of SCENARIOS) {
  test(`DELTASCEND renders the same frame: ${name}`, async ({ page }) => {
    await page.goto('/');
    const hash = await runScenario(page, steps);
    expect(hash).toBe(GOLDEN[name]);
    expect(page.__errors).toEqual([]);
  });
}
