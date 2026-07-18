import {
  SAVE_VERSION,
  CHARACTERS,
  CHARACTER_BY_ID,
  PROVISION_TEMPLATES,
  buildNavigationDeck,
  buildProvisionDeck,
} from './data.js?v=3.1.0-r2';

export function createIdFactory(prefix = 'lb') {
  let serial = 0;
  return (label = 'id') => `${prefix}-${label}-${serial += 1}`;
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createGame({ names, characterIds, random = Math.random, now = Date.now() }) {
  if (!Array.isArray(names) || names.length < 4 || names.length > 6) throw new Error('players');
  if (new Set(characterIds).size !== names.length) throw new Error('characters');

  const makeId = createIdFactory(String(now));
  const chosenCharacters = characterIds.map((id) => CHARACTER_BY_ID[id]);
  if (chosenCharacters.some((item) => !item)) throw new Error('characters');

  const players = names.map((name, index) => ({
    id: makeId('player'),
    name: String(name).trim().slice(0, 24),
    characterId: chosenCharacters[index].id,
    position: chosenCharacters[index].seat,
    wounds: 0,
    alive: true,
    conscious: true,
    inBoat: true,
    rowed: false,
    fought: false,
    parasolDay: 0,
    hand: [],
    lovedCharacterId: null,
    hatedCharacterId: null,
  })).sort((a, b) => a.position - b.position);

  normalizePositions(players);
  const loveDeck = shuffle(players.map((player) => player.characterId), random);
  const hateDeck = shuffle(players.map((player) => player.characterId), random);
  players.forEach((player, index) => {
    player.lovedCharacterId = loveDeck[index];
    player.hatedCharacterId = hateDeck[index];
  });

  const provisions = shuffle(buildProvisionDeck(makeId), random);
  players.forEach((player) => {
    const card = provisions.pop();
    if (card) player.hand.push(card);
  });

  return {
    version: SAVE_VERSION,
    id: makeId('game'),
    createdAt: now,
    updatedAt: now,
    status: 'active',
    day: 1,
    birds: 0,
    phase: 'quartermaster',
    currentPlayerId: players[0]?.id ?? null,
    players,
    provisions,
    navigation: shuffle(buildNavigationDeck(makeId), random),
    rowStack: [],
    turnOrder: [],
    turnIndex: 0,
    pending: null,
    logs: [
      { id: makeId('log'), code: 'gameStarted', data: {}, tone: 'accent', at: now },
      { id: makeId('log'), code: 'startingCards', data: {}, tone: 'muted', at: now },
    ],
    serial: 1000,
  };
}

export function nextGameId(game, label = 'event') {
  game.serial = (game.serial || 1000) + 1;
  return `${game.id}-${label}-${game.serial}`;
}

export function addLog(game, code, data = {}, tone = 'muted') {
  game.logs.push({ id: nextGameId(game, 'log'), code, data, tone, at: Date.now() });
  if (game.logs.length > 160) game.logs.splice(0, game.logs.length - 160);
}

export function normalizePositions(players) {
  players.sort((a, b) => a.position - b.position);
  players.forEach((player, index) => { player.position = index; });
  return players;
}

export function boatPlayers(game) {
  return game.players.filter((player) => player.inBoat).sort((a, b) => a.position - b.position);
}

export function activePlayers(game) {
  return boatPlayers(game).filter((player) => player.alive && player.conscious);
}

export function getPlayer(game, playerId) {
  return game.players.find((player) => player.id === playerId) || null;
}

export function getPlayerByCharacter(game, characterId) {
  return game.players.find((player) => player.characterId === characterId) || null;
}

export function updateCondition(player) {
  if (!player.inBoat && !player.alive) {
    player.conscious = false;
    return player;
  }
  const size = CHARACTER_BY_ID[player.characterId].size;
  if (player.wounds > size) {
    player.alive = false;
    player.conscious = false;
  } else if (player.wounds === size) {
    player.conscious = false;
  } else if (player.alive) {
    player.conscious = true;
  }
  return player;
}

export function applyWound(player, count = 1) {
  if (!player.inBoat || !player.alive) return { becameUnconscious: false, died: false };
  const wasConscious = player.conscious;
  const wasAlive = player.alive;
  player.wounds += count;
  updateCondition(player);
  return { becameUnconscious: wasConscious && !player.conscious && player.alive, died: wasAlive && !player.alive };
}

export function healPlayer(player, count = 1) {
  if (!player.alive || !player.inBoat || player.wounds <= 0) return false;
  player.wounds = Math.max(0, player.wounds - count);
  updateCondition(player);
  return true;
}

export function cardPower(card) {
  return card.revealed && card.category === 'weapon' ? (card.power || 0) : 0;
}

export function playerStrength(player) {
  const base = CHARACTER_BY_ID[player.characterId].size;
  return base + player.hand.reduce((sum, card) => sum + cardPower(card), 0);
}

export function sideStrength(game, playerIds) {
  return playerIds.reduce((sum, id) => {
    const player = getPlayer(game, id);
    return sum + (player && player.inBoat && player.alive && player.conscious ? playerStrength(player) : 0);
  }, 0);
}

export function resolveFight(game, fight) {
  const attackerIds = [fight.attackerId, ...Object.entries(fight.support || {}).filter(([, side]) => side === 'attacker').map(([id]) => id)];
  const defenderIds = [fight.defenderId, ...Object.entries(fight.support || {}).filter(([, side]) => side === 'defender').map(([id]) => id)];
  const attackerStrength = sideStrength(game, attackerIds);
  const defenderStrength = sideStrength(game, defenderIds);
  const winner = attackerStrength > defenderStrength ? 'attacker' : 'defender';
  const losers = winner === 'attacker' ? defenderIds : attackerIds;
  const participantIds = [...attackerIds, ...defenderIds];
  const spentFlares = [];
  participantIds.forEach((id) => {
    const player = getPlayer(game, id);
    if (!player) return;
    player.fought = true;
    player.hand = player.hand.filter((card) => {
      const spent = card.id === 'flare' && card.revealed;
      if (spent) spentFlares.push({ playerId: player.id, cardUid: card.uid });
      return !spent;
    });
  });
  const wounds = losers.map((id) => {
    const player = getPlayer(game, id);
    return player ? { playerId: id, ...applyWound(player) } : null;
  }).filter(Boolean);
  return { winner, attackerStrength, defenderStrength, attackerIds, defenderIds, wounds, spentFlares };
}

export function swapPositions(game, firstId, secondId) {
  const first = getPlayer(game, firstId);
  const second = getPlayer(game, secondId);
  if (!first || !second || !first.inBoat || !second.inBoat) return false;
  [first.position, second.position] = [second.position, first.position];
  normalizePositions(game.players.filter((player) => player.inBoat));
  return true;
}

export function moveCard(game, fromId, toId, cardUid) {
  const from = getPlayer(game, fromId);
  const to = getPlayer(game, toId);
  if (!from || !to) return null;
  const index = from.hand.findIndex((card) => card.uid === cardUid);
  if (index < 0) return null;
  const [card] = from.hand.splice(index, 1);
  to.hand.push(card);
  return card;
}

export function takeRandomHidden(game, fromId, toId, random = Math.random) {
  const from = getPlayer(game, fromId);
  if (!from) return null;
  const hidden = from.hand.filter((card) => !card.revealed);
  if (!hidden.length) return null;
  const card = hidden[Math.floor(random() * hidden.length)];
  return moveCard(game, fromId, toId, card.uid);
}

export function revealCard(game, playerId, cardUid) {
  const player = getPlayer(game, playerId);
  const card = player?.hand.find((item) => item.uid === cardUid);
  if (!card || !player.alive || !player.conscious) return null;
  card.revealed = true;
  return card;
}

export function discardCard(game, playerId, cardUid) {
  const player = getPlayer(game, playerId);
  if (!player) return null;
  const index = player.hand.findIndex((card) => card.uid === cardUid);
  if (index < 0) return null;
  return player.hand.splice(index, 1)[0];
}

export function putOnBottom(deck, cards) {
  deck.unshift(...cards);
  return deck;
}

export function navigationTargets(game, card) {
  if (!card.overboard) return [];
  if (card.overboard === 'all') return boatPlayers(game);
  if (card.overboard === 'allbut') return boatPlayers(game).filter((player) => player.characterId !== card.overboardExcept);
  const player = getPlayerByCharacter(game, card.overboard);
  return player?.inBoat ? [player] : [];
}

export function resolveOverboard(game, card, { sharks = 0 } = {}) {
  const outcomes = [];
  const targets = navigationTargets(game, card);
  const automaticSharks = targets.reduce((count, player) => count + player.hand.filter((item) => item.id === 'chum' && item.revealed).length, 0);
  const sharkWounds = Math.max(0, Number(sharks) || 0) + automaticSharks;

  targets.forEach((player) => {
    const character = CHARACTER_BY_ID[player.characterId];
    const preserver = player.hand.find((item) => item.id === 'life' && item.revealed);
    const wasConscious = player.conscious;

    if (!player.alive) {
      player.conscious = false;
      player.inBoat = false;
      player.hand = [];
      outcomes.push({ playerId: player.id, lost: true, died: true, protected: false, shark: sharkWounds > 0 });
      return;
    }

    if (!player.conscious && !preserver) {
      player.alive = false;
      player.inBoat = false;
      player.hand = [];
      outcomes.push({ playerId: player.id, lost: true, died: true, protected: false, shark: sharkWounds > 0 });
      return;
    } else if (!preserver && !character.swimmer) {
      applyWound(player, 1);
    }

    for (let index = 0; index < sharkWounds && player.alive; index += 1) applyWound(player, 1);

    if (!player.alive || ((!player.conscious && wasConscious) && !preserver)) {
      player.alive = false;
      player.conscious = false;
      player.inBoat = false;
      player.hand = [];
      outcomes.push({ playerId: player.id, lost: true, died: true, protected: Boolean(preserver), shark: sharkWounds > 0 });
      return;
    }

    const lostCards = player.hand.filter((item) => item.revealed && item.id !== 'life');
    player.hand = player.hand.filter((item) => !item.revealed || item.id === 'life');
    outcomes.push({
      playerId: player.id,
      lost: false,
      died: !player.alive,
      protected: Boolean(preserver),
      swimmer: Boolean(character.swimmer),
      shark: sharkWounds > 0,
      sharkWounds,
      lostCards: lostCards.map((item) => item.id),
    });
  });
  normalizePositions(game.players.filter((player) => player.inBoat));
  return outcomes;
}

export function buildThirstQueue(game, card) {
  const queue = [];
  boatPlayers(game).forEach((player) => {
    if (!player.alive) return;
    if ((card.thirsty || []).includes(player.characterId)) queue.push({ playerId: player.id, source: 'named' });
    if (card.row && player.rowed) queue.push({ playerId: player.id, source: 'row' });
    if (card.fight && player.fought) queue.push({ playerId: player.id, source: 'fight' });
  });
  return queue;
}

export function resolveThirst(game, task, choice) {
  const player = getPlayer(game, task.playerId);
  if (!player || !player.alive || !player.inBoat) return { skipped: true };
  if (choice === 'water') {
    const water = player.hand.find((card) => card.id === 'water');
    if (!water) return { invalid: true };
    discardCard(game, player.id, water.uid);
    return { water: true };
  }
  if (choice === 'parasol') {
    const parasol = player.hand.find((card) => card.id === 'parasol' && card.revealed);
    if (!parasol || player.parasolDay === game.day) return { invalid: true };
    player.parasolDay = game.day;
    return { parasol: true };
  }
  return { wound: true, ...applyWound(player, 1) };
}

export function treasureValue(player, card) {
  if (!card.value) return 0;
  const character = CHARACTER_BY_ID[player.characterId];
  return character.affinity === card.id ? card.value * 2 : card.value;
}

export function scoreGame(game) {
  return game.players.map((player) => {
    const character = CHARACTER_BY_ID[player.characterId];
    const loved = getPlayerByCharacter(game, player.lovedCharacterId);
    const hated = getPlayerByCharacter(game, player.hatedCharacterId);
    const narcissist = player.lovedCharacterId === player.characterId;
    const psychopath = player.hatedCharacterId === player.characterId;
    const breakdown = [];
    let score = 0;

    if (player.alive && player.inBoat) {
      const ownSurvival = psychopath && !narcissist ? 0 : character.survival;
      score += ownSurvival;
      if (ownSurvival) breakdown.push({ code: 'survival', value: ownSurvival });
    }

    if (narcissist && !psychopath && player.alive && player.inBoat) {
      score += character.survival;
      breakdown.push({ code: 'narcissist', value: character.survival });
    } else if (!narcissist && loved?.alive && loved.inBoat) {
      const value = CHARACTER_BY_ID[loved.characterId].survival;
      score += value;
      breakdown.push({ code: 'love', value });
    }

    if (psychopath) {
      game.players.forEach((other) => {
        if (other.id !== player.id && other.characterId !== player.lovedCharacterId && !other.alive) {
          const value = CHARACTER_BY_ID[other.characterId].size;
          score += value;
          breakdown.push({ code: 'psychopath', value, playerId: other.id });
        }
      });
    } else if (hated && !hated.alive) {
      const value = CHARACTER_BY_ID[hated.characterId].size;
      score += value;
      breakdown.push({ code: 'hate', value });
    }

    if (player.inBoat) {
      const jewels = player.hand.filter((card) => card.id === 'jewels').length;
      if (jewels) {
        const base = [0, 1, 4, 8][Math.min(3, jewels)];
        const value = player.characterId === 'lauren' ? base * 2 : base;
        score += value;
        breakdown.push({ code: 'card', value, cardId: 'jewels' });
      }
      player.hand.filter((card) => card.id !== 'jewels').forEach((card) => {
        const value = treasureValue(player, card);
        if (value) {
          score += value;
          breakdown.push({ code: 'card', value, cardId: card.id });
        }
      });
    }

    return { playerId: player.id, score, breakdown };
  }).sort((a, b) => b.score - a.score);
}

export function resetDayMarkers(game) {
  game.players.forEach((player) => {
    player.rowed = false;
    player.fought = false;
    updateCondition(player);
  });
}

export function validateGame(game) {
  if (!game || game.version !== SAVE_VERSION || !Array.isArray(game.players)) return false;
  if (game.players.length < 4 || game.players.length > 6) return false;
  if (!Array.isArray(game.provisions) || !Array.isArray(game.navigation) || !Array.isArray(game.rowStack)) return false;
  if (!Number.isInteger(game.day) || game.day < 1 || !Number.isInteger(game.birds) || game.birds < 0 || game.birds > 4) return false;
  const cardIsValid = (card) => Boolean(card?.uid && PROVISION_TEMPLATES[card.id]);
  const navigationIsValid = (card) => Boolean(card?.uid && Number.isInteger(card.bird) && Array.isArray(card.thirsty));
  if (!game.provisions.every(cardIsValid) || !game.navigation.every(navigationIsValid) || !game.rowStack.every(navigationIsValid)) return false;
  const playerIds = new Set(game.players.map((player) => player.id));
  const characterIds = new Set(game.players.map((player) => player.characterId));
  if (playerIds.size !== game.players.length || characterIds.size !== game.players.length) return false;
  if (game.currentPlayerId && !playerIds.has(game.currentPlayerId)) return false;
  return game.players.every((player) => player.id && CHARACTER_BY_ID[player.characterId] && Array.isArray(player.hand) && player.hand.every(cardIsValid));
}

export function hydrateGame(value) {
  const game = deepClone(value);
  if (!validateGame(game)) throw new Error('invalid-save');
  game.updatedAt = Date.now();
  return game;
}

export { CHARACTERS };
