import churchRoom from './rooms/churchclimb5';

const TILE = 40;
const COLS = 32;
const WALL_L = 7;
const WALL_R = 25;

function makeRng(seed) {
  let a = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let churchGrid = null;
export function getChurchTiles() {
  if (churchGrid) return churchGrid;
  const layer = churchRoom.tileLayers[0];
  const w = layer.tw;
  const flat = [];
  const rle = layer.rle;
  for (let i = 0; i < rle.length; i += 2) {
    const count = rle[i];
    const val = rle[i + 1];
    for (let k = 0; k < count; k++) flat.push(val);
  }
  const rows = [];
  for (let r = 0; r * w < flat.length; r++)
    rows.push(flat.slice(r * w, (r + 1) * w));
  churchGrid = { rows, meta: layer.meta, w, h: rows.length };
  return churchGrid;
}

const key = (c, r) => `${c},${r}`;

export function generateLevel(seed) {
  const seedNum = Number(seed) || 0;
  const rng = makeRng(seedNum * 7919 + 1237);
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const irange = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

  const rows = 52 + irange(0, 14);
  const topRow = 9;
  const ledgeRow = rows - 8;
  const startCol = irange(12, 20);

  const climb = new Set();
  const reserved = new Set();
  const brittle = [];
  const appearGroups = [];
  const coins = [];
  const generators = [];
  const buckets = [];

  const startTop = ledgeRow - 3;
  const noGlow = [
    { x: startCol * TILE, y: startTop * TILE, w: TILE, h: TILE * 3 },
  ];

  const addCell = (c, r) => {
    if (c < WALL_L || c > WALL_R) return;
    if (reserved.has(key(c, r))) return;
    climb.add(key(c, r));
  };
  const startPin = (c, r) =>
    c === startCol && r >= startTop && r < startTop + 3;
  const stampRect = (c0, rTop, w, h) => {
    for (let c = c0; c < c0 + w; c++)
      for (let r = rTop; r < rTop + h; r++) addCell(c, r);
    return { c0, rTop, w, h };
  };

  let prev = stampRect(startCol, startTop - 3, 1, 3);
  let anchorC = startCol;
  const waterZones = [];
  const wetCells = new Set();
  const nearWater = (zc0, zc1, zr0, zr1) =>
    waterZones.some(
      z =>
        zc0 - 3 <= z.c1 &&
        zc1 + 3 >= z.c0 &&
        zr0 - 4 <= z.r1 &&
        zr1 + 4 >= z.r0,
    );
  let waterShelves = 0;
  let crumbleShelves = 0;
  let slabCount = 0;
  let wantShelf = true;
  let branchTop = null;
  const columns = [];

  while (prev.rTop > topRow + 4) {
    slabCount += 1;
    const progress = 1 - (prev.rTop - topRow) / (startTop - topRow);
    const roomAbove = prev.rTop - (topRow + 2);
    let gap = 0;
    if (rng() < 0.3) gap = rng() < 0.65 ? 1 : 2;

    if (
      wantShelf &&
      waterShelves === 0 &&
      progress > 0.35 &&
      progress < 0.85 &&
      roomAbove > 9 &&
      rng() < 0.4
    ) {
      const w = irange(5, 7);
      const shelfTop = prev.rTop - 1 - gap;
      let c0 = rng() < 0.5 ? anchorC : anchorC - (w - 1);
      c0 = Math.max(WALL_L, Math.min(WALL_R - (w - 1), c0));
      const spoutRow = shelfTop - irange(3, 4);
      const bucketRow = shelfTop + irange(2, 3);
      const aC = anchorC;
      const isClean = cc0 => {
        if (aC < cc0 || aC > cc0 + w - 1) return false;
        for (let c = cc0; c <= cc0 + w - 1; c++)
          if (reserved.has(key(c, shelfTop))) return false;
        for (let c = cc0 + 1; c <= cc0 + w - 2; c++)
          for (let r = spoutRow; r <= bucketRow; r++) {
            if (r === shelfTop) continue;
            if (
              climb.has(key(c, r)) ||
              reserved.has(key(c, r)) ||
              startPin(c, r)
            )
              return false;
          }
        return true;
      };
      let clean = false;
      for (const dc of [0, -1, 1, -2, 2, -3, 3]) {
        const cand = Math.max(WALL_L, Math.min(WALL_R - (w - 1), c0 + dc));
        if (
          isClean(cand) &&
          !nearWater(cand + 1, cand + w - 2, spoutRow, bucketRow)
        ) {
          c0 = cand;
          clean = true;
          break;
        }
      }
      if (clean) {
        stampRect(c0, shelfTop, w, 1);
        const exitEnd = aC - c0 < c0 + w - 1 - aC ? c0 + w - 1 : c0;
        const towardExit = exitEnd > aC ? 1 : -1;
        const base = irange(0, 30);
        const wcols = [];
        for (let c = c0 + 1; c <= c0 + w - 2; c++) wcols.push(c);
        if (towardExit < 0) wcols.reverse();
        wcols.forEach((c, i) => {
          generators.push({
            x: c * TILE,
            y: spoutRow * TILE,
            waittime: 50,
            waitoff: base + 5 * i,
            endY: bucketRow * TILE + 20,
          });
          buckets.push({ x: c * TILE, y: bucketRow * TILE + 20 });
          for (let r = spoutRow; r <= bucketRow; r++) {
            if (r !== shelfTop) reserved.add(key(c, r));
          }
        });
        waterShelves += 1;
        waterZones.push({
          c0: c0 + 1,
          c1: c0 + w - 2,
          r0: spoutRow,
          r1: bucketRow,
        });
        for (let c = c0; c <= c0 + w - 1; c++) wetCells.add(key(c, shelfTop));
        prev = stampRect(exitEnd, spoutRow - 1, 1, shelfTop - spoutRow + 1);
        anchorC = exitEnd;
        branchTop = null;
        wantShelf = false;
        continue;
      }
    }

    if (wantShelf) {
      let lo = anchorC;
      let hi = anchorC;
      if (branchTop && Math.abs(branchTop.c - anchorC) <= 6) {
        lo = Math.min(lo, branchTop.c);
        hi = Math.max(hi, branchTop.c);
      }
      const extra = irange(1, 3);
      let c0 = lo - irange(0, extra);
      let w = hi - lo + 1 + extra + irange(0, 2);
      c0 = Math.max(WALL_L, c0);
      w = Math.min(w, WALL_R - c0 + 1);
      const shelfTop = prev.rTop - 1 - gap;
      const placed = stampRect(c0, shelfTop, w, 1);
      if (crumbleShelves < 2 && w >= 4 && rng() < 0.25) {
        crumbleShelves += 1;
        for (let c = c0 + 1; c <= c0 + w - 2; c++) {
          if (climb.has(key(c, shelfTop)))
            brittle.push({ c, r: shelfTop, dangerous: false });
        }
      }
      if (gap > 0 && rng() < 0.6) {
        coins.push({
          x: anchorC * TILE + 20,
          y: (prev.rTop - 1) * TILE + 20,
        });
      }
      anchorC = c0 + irange(0, placed.w - 1);
      prev = placed;
      branchTop = null;
      wantShelf = false;
    } else if (rng() < 0.18) {
      const hGap = rng() < 0.6 ? 1 : 2;
      const w = irange(2, 3);
      const dir = anchorC < (WALL_L + WALL_R) / 2 ? 1 : -1;
      let c0 = dir > 0 ? anchorC + 1 + hGap : anchorC - hGap - w;
      c0 = Math.max(WALL_L, Math.min(WALL_R - (w - 1), c0));
      const near = dir > 0 ? c0 : c0 + w - 1;
      if (Math.abs(near - anchorC) > 3 || Math.abs(near - anchorC) < 1) {
        wantShelf = true;
        continue;
      }
      const rTop = Math.max(topRow + 2, prev.rTop);
      const placed = stampRect(c0, rTop, w, 1);
      anchorC = c0 + irange(0, placed.w - 1);
      prev = placed;
      wantShelf = true;
    } else {
      const h = Math.min(irange(3, 5), roomAbove);
      const cTop = prev.rTop - h - gap;
      const placed = stampRect(anchorC, cTop, 1, h);
      columns.push({ c: anchorC, rTop: cTop, rBot: cTop + h - 1 });
      if (prev.w >= 4 && rng() < 0.55) {
        const others = [];
        for (let c = prev.c0; c < prev.c0 + prev.w; c++)
          if (Math.abs(c - anchorC) >= 2) others.push(c);
        if (others.length) {
          const bc = pick(others);
          const bh = Math.min(h + irange(-1, 1), roomAbove);
          if (bh >= 2) {
            const bTop = prev.rTop - bh;
            stampRect(bc, bTop, 1, bh);
            columns.push({ c: bc, rTop: bTop, rBot: bTop + bh - 1 });
            branchTop = { c: bc, rTop: bTop };
          }
        }
      }
      if (gap > 0 && rng() < 0.6) {
        coins.push({
          x: anchorC * TILE + 20,
          y: (prev.rTop - 1) * TILE + 20,
        });
      }
      prev = placed;
      wantShelf = true;
    }
  }

  const exitCol = Math.max(WALL_L, Math.min(WALL_R, anchorC));
  for (let rr = prev.rTop - 1; rr >= topRow + 1; rr--) addCell(exitCol, rr);
  noGlow.push({
    x: exitCol * TILE,
    y: (topRow - 2) * TILE,
    w: TILE,
    h: TILE * 3,
  });

  const refugeCells = new Set();
  const emberSet = new Set(brittle.map(b => key(b.c, b.r)));
  const placeGates = (budget, reach, cap, slowWait) => {
    let placed = 0;
    const shuffledCols = [...columns].sort(() => rng() - 0.5);
    for (const col of shuffledCols) {
      if (placed >= budget) break;
      const { c, rTop, rBot } = col;
      let spoutRow = 0;
      for (let sr = rTop - 1; sr >= rTop - reach; sr--) {
        if (sr <= topRow + 1) break;
        if (
          !climb.has(key(c, sr)) &&
          !reserved.has(key(c, sr)) &&
          !startPin(c, sr)
        ) {
          spoutRow = sr;
          break;
        }
      }
      let bucketRow = 0;
      for (let br = rBot + 1; br <= rBot + reach; br++) {
        if (br >= ledgeRow - 1) break;
        if (
          !climb.has(key(c, br)) &&
          !reserved.has(key(c, br)) &&
          !startPin(c, br)
        ) {
          bucketRow = br;
          break;
        }
      }
      if (!spoutRow || !bucketRow) continue;
      if (bucketRow - spoutRow > 12) continue;
      if (nearWater(c, c, spoutRow, bucketRow)) continue;
      const hosedRows = [];
      for (let r = spoutRow; r <= bucketRow; r++)
        if (climb.has(key(c, r))) hosedRows.push(r);
      if (hosedRows.length > cap) continue;
      if (hosedRows.some(r => emberSet.has(key(c, r)))) continue;
      if (hosedRows.length >= 2) {
        const er = hosedRows[0];
        let refuge = null;
        for (const side of [1, -1]) {
          const ec = c + side;
          if (ec < WALL_L || ec > WALL_R) continue;
          if (climb.has(key(ec, er))) {
            refuge = key(ec, er);
            break;
          }
        }
        if (!refuge) {
          for (const side of [1, -1]) {
            const ec = c + side;
            if (ec < WALL_L || ec > WALL_R) continue;
            if (reserved.has(key(ec, er)) || startPin(ec, er)) continue;
            climb.add(key(ec, er));
            refuge = key(ec, er);
            break;
          }
        }
        if (!refuge) continue;
        refugeCells.add(refuge);
      }
      generators.push({
        x: c * TILE,
        y: spoutRow * TILE,
        waittime: slowWait || (rng() < 0.5 ? 70 : 80),
        waitoff: irange(5, 45),
        endY: bucketRow * TILE + 20,
      });
      buckets.push({ x: c * TILE, y: bucketRow * TILE + 20 });
      waterZones.push({ c0: c, c1: c, r0: spoutRow, r1: bucketRow });
      hosedRows.forEach(r => wetCells.add(key(c, r)));
      for (let r = spoutRow; r <= bucketRow; r++)
        if (!climb.has(key(c, r))) reserved.add(key(c, r));
      placed += 1;
    }
    return placed;
  };
  let gates = placeGates(waterShelves > 0 ? (rng() < 0.45 ? 1 : 0) : 2, 3, 4);
  if (waterShelves === 0 && gates === 0) gates = placeGates(1, 5, 5, 95);

  const cellList = [...climb].map(k2 => k2.split(',').map(Number));
  for (let i = 0; i < 3; i++) {
    if (rng() < 0.4) continue;
    const [c, r] = pick(cellList);
    const dir = pick([
      [2, 0],
      [-2, 0],
      [3, 0],
      [0, -2],
      [0, -3],
    ]);
    const pc = c + dir[0];
    const pr = r + dir[1];
    if (pc < WALL_L || pc > WALL_R || pr < topRow + 2 || pr > startTop - 2)
      continue;
    if (climb.has(key(pc, pr)) || reserved.has(key(pc, pr))) continue;
    climb.add(key(pc, pr));
    coins.push({ x: pc * TILE + 20, y: pr * TILE + 20 });
  }
  const redSet = new Set();
  const solvableWithoutReds = () => {
    const stand = k2 => climb.has(k2) && !redSet.has(k2);
    const seen = new Set([key(startCol, startTop)]);
    const stack = [[startCol, startTop]];
    while (stack.length) {
      const [c, r] = stack.pop();
      if (r <= topRow + 1) return true;
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        for (let d = 1; d <= 3; d++) {
          const k2 = key(c + dc * d, r + dr * d);
          if (stand(k2) && !seen.has(k2)) {
            seen.add(k2);
            stack.push([c + dc * d, r + dr * d]);
          }
        }
    }
    return false;
  };
  let reds = 1 + Math.floor(rows / 20);
  for (let tries = 0; tries < 60 && reds > 0; tries++) {
    const [c, r] = pick(cellList);
    const k2 = key(c, r);
    if (redSet.has(k2) || reserved.has(k2)) continue;
    if (refugeCells.has(k2) || wetCells.has(k2)) continue;
    if (c === startCol && r >= startTop - 3) continue;
    if (brittle.some(b => b.c === c && b.r === r)) continue;
    redSet.add(k2);
    if (!solvableWithoutReds()) {
      redSet.delete(k2);
      continue;
    }
    brittle.push({ c, r, dangerous: true });
    reds -= 1;
  }
  let sprinkle = 5 + Math.floor(rows / 10);
  for (let tries = 0; tries < 80 && sprinkle > 0; tries++) {
    const [c, r] = pick(cellList);
    if (coins.some(cn => cn.x === c * TILE + 20 && cn.y === r * TILE + 20))
      continue;
    coins.push({ x: c * TILE + 20, y: r * TILE + 20 });
    sprinkle -= 1;
  }
  if (columns.length > 3 && rng() < 0.7) {
    const free = (c, r) =>
      c >= WALL_L &&
      c <= WALL_R &&
      r > topRow + 2 &&
      r < startTop - 1 &&
      !climb.has(key(c, r)) &&
      !reserved.has(key(c, r)) &&
      !startPin(c, r);
    const shuffledCols = [...columns].sort(() => rng() - 0.5);
    let done = false;
    for (const col of shuffledCols) {
      if (done) break;
      if (col.rTop < topRow + 9 || col.rBot > startTop - 5) continue;
      const side = col.c < (WALL_L + WALL_R) / 2 ? 1 : -1;
      const dist = rng() < 0.5 ? 3 : 2;
      const pc = col.c + side * dist;
      const pr = col.rBot;
      let clear = free(pc, pr);
      for (let k2 = 1; k2 < dist && clear; k2++)
        if (climb.has(key(col.c + side * k2, pr))) clear = false;
      if (!clear) continue;
      const ladder = [];
      let lr = pr - 1;
      while (ladder.length < irange(3, 5) && free(pc, lr)) {
        ladder.push({ c: pc, r: lr });
        lr -= 1;
      }
      if (ladder.length < 2) continue;
      const rt = ladder[ladder.length - 1].r;
      const shelf = [];
      let merged = false;
      for (let k2 = 1; k2 <= 5; k2++) {
        const sc = pc - side * k2;
        if (climb.has(key(sc, rt))) {
          merged = true;
          break;
        }
        if (!free(sc, rt)) break;
        shelf.push({ c: sc, r: rt });
      }
      if (!merged) continue;
      climb.add(key(pc, pr));
      const hidden = [...ladder, ...shelf];
      hidden.forEach(p => climb.add(key(p.c, p.r)));
      appearGroups.push({
        cells: hidden.map(p => key(p.c, p.r)),
        bell: { x: pc * TILE + 20, y: (pr - 1) * TILE + 10 },
      });
      ladder.forEach((p, i) => {
        if (i % 2 === 0)
          coins.push({
            x: p.c * TILE + 20,
            y: p.r * TILE + 20,
            hiddenBy: appearGroups.length - 1,
          });
      });
      done = true;
    }
  }

  const w = COLS * TILE;
  const h = rows * TILE;
  const slab = {
    x: (WALL_L - 2) * TILE,
    y: (topRow - 3) * TILE,
    w: (WALL_R - WALL_L + 5) * TILE,
    h: (ledgeRow - topRow + 8) * TILE,
  };
  const landing = { x: slab.x, y: ledgeRow * TILE, w: slab.w, h: 10 };
  const boothY = (topRow - 3) * TILE + 16;
  const zones = {
    bottom: {
      xMin: slab.x + 24,
      xMax: slab.x + slab.w - 24,
      yMin: (ledgeRow + 1) * TILE + 6,
      yMax: ledgeRow * TILE + 150,
      floorY: ledgeRow * TILE + 60,
    },
    top: {
      xMin: slab.x + 24,
      xMax: slab.x + slab.w - 24,
      yMin: boothY - 40,
      yMax: boothY + 16,
      floorY: boothY,
    },
  };

  const climbRects = [...climb].map(k2 => {
    const [cc, rr] = k2.split(',').map(Number);
    return { x: cc * TILE, y: rr * TILE, w: TILE, h: TILE };
  });

  const par = slabCount * 16 + waterShelves * 50 + gates * 25 + 100;

  return {
    kind: 'generated',
    seed: String(seed).padStart(4, '0'),
    w,
    h,
    rows,
    slab,
    climb: climbRects,
    noGlow,
    brittle,
    appearGroups,
    coins,
    generators,
    buckets,
    landing,
    zones,
    spawn: { x: slab.x + slab.w / 2 - 60, y: zones.bottom.floorY },
    wallswitchPos: { x: startCol * TILE, y: startTop * TILE },
    mountStarter: { x: startCol * TILE, y: (ledgeRow - 1) * TILE },
    topStarter: { x: exitCol * TILE, y: (topRow - 2) * TILE },
    startTrig: {
      x: startCol * TILE,
      y: startTop * TILE,
      w: TILE,
      h: TILE,
    },
    finishTrig: {
      x: exitCol * TILE - 20,
      y: (topRow - 2) * TILE - 20,
      w: 80,
      h: 100,
    },
    par,
  };
}
