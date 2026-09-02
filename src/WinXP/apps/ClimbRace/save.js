// The save game: best times per level key, and the XP already paid out
// per seed.
export function persist(game) {
  try {
    game.store.save(game.saveData);
  } catch (e) {}
}

export function loadBest(game) {
  const v = Number(game.saveData.best[game.L.bestKey]);
  return v > 0 ? v : null;
}

export function saveBest(game, tenths) {
  const prev = Number(game.saveData.best[game.L.bestKey]);
  if (!prev || tenths < prev) {
    game.saveData.best[game.L.bestKey] = tenths;
    persist(game);
    return true;
  }
  return false;
}

// the cup's dialogue box, church only
export function seedsCleared(game) {
  return Object.keys(game.saveData.paid).length;
}

export function endlessBest(game) {
  return Number(game.saveData.best.endless) || 0;
}
