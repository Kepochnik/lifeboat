import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyWound,
  buildThirstQueue,
  createGame,
  hydrateGame,
  putOnBottom,
  resolveFight,
  resolveOverboard,
  resolveThirst,
  scoreGame,
  validateGame,
} from '../src/engine.js';
import { CHARACTER_BY_ID } from '../src/data.js';

function gameWith(characterIds = ['lauren', 'stephen', 'captain', 'mate']) {
  return createGame({
    names: characterIds.map((_, index) => `Player ${index + 1}`),
    characterIds,
    random: () => 0.37,
    now: 1_700_000_000_000,
  });
}

function byCharacter(game, id) {
  return game.players.find((player) => player.characterId === id);
}

test('creates a legal four-player game and deals one provision each', () => {
  const game = gameWith();
  assert.equal(game.players.length, 4);
  assert.equal(game.players.every((player) => player.hand.length === 1), true);
  assert.equal(game.provisions.length, 38);
  assert.equal(game.navigation.length, 24);
  assert.deepEqual(game.players.map((player) => player.position), [0, 1, 2, 3]);
  assert.equal(validateGame(game), true);

  const fullDeck = [...game.provisions, ...game.players.flatMap((player) => player.hand)];
  const counts = Object.fromEntries([...new Set(fullDeck.map((card) => card.id))].map((id) => [id, fullDeck.filter((card) => card.id === id).length]));
  assert.deepEqual(counts, {
    water: 16, cash: 6, jewels: 3, painting: 3, medkit: 3, oar: 2,
    blackjack: 1, knife: 1, hook: 1, flare: 1, chum: 2, life: 1,
    compass: 1, parasol: 1,
  });
  assert.equal(CHARACTER_BY_ID.frenchy.size, 6);
});

test('a character falls unconscious at size wounds and dies above size', () => {
  const game = gameWith();
  const lauren = byCharacter(game, 'lauren');
  lauren.wounds = CHARACTER_BY_ID.lauren.size - 1;

  const first = applyWound(lauren);
  assert.equal(first.becameUnconscious, true);
  assert.equal(lauren.conscious, false);
  assert.equal(lauren.alive, true);

  const second = applyWound(lauren);
  assert.equal(second.died, true);
  assert.equal(lauren.alive, false);
});

test('defender wins a tied fight and every participant is marked', () => {
  const game = gameWith();
  const lauren = byCharacter(game, 'lauren');
  const stephen = byCharacter(game, 'stephen');
  lauren.hand.push({ uid: 'oar-1', id: 'oar', category: 'weapon', power: 1, revealed: true });

  const result = resolveFight(game, {
    attackerId: lauren.id,
    defenderId: stephen.id,
    support: {},
  });

  assert.equal(result.attackerStrength, 5);
  assert.equal(result.defenderStrength, 5);
  assert.equal(result.winner, 'defender');
  assert.equal(lauren.wounds, 1);
  assert.equal(stephen.wounds, 0);
  assert.equal(lauren.fought, true);
  assert.equal(stephen.fought, true);
});

test('a revealed flare adds eight strength once and is discarded after the fight', () => {
  const game = gameWith();
  const lauren = byCharacter(game, 'lauren');
  const stephen = byCharacter(game, 'stephen');
  lauren.hand = [{ uid: 'flare-1', id: 'flare', category: 'weapon', power: 8, revealed: true }];

  const result = resolveFight(game, { attackerId: lauren.id, defenderId: stephen.id, support: {} });
  assert.equal(result.attackerStrength, 12);
  assert.equal(result.winner, 'attacker');
  assert.equal(result.spentFlares.length, 1);
  assert.equal(lauren.hand.some((card) => card.id === 'flare'), false);
});

test('named, rowing and fighting thirst are three separate requirements', () => {
  const game = gameWith();
  const captain = byCharacter(game, 'captain');
  captain.rowed = true;
  captain.fought = true;
  const tasks = buildThirstQueue(game, {
    thirsty: ['captain'],
    row: true,
    fight: true,
  }).filter((task) => task.playerId === captain.id);

  assert.deepEqual(tasks.map((task) => task.source), ['named', 'row', 'fight']);

  captain.hand = [
    { uid: 'water-1', id: 'water' },
    { uid: 'water-2', id: 'water' },
  ];
  assert.deepEqual(resolveThirst(game, tasks[0], 'water'), { water: true });
  assert.deepEqual(resolveThirst(game, tasks[1], 'water'), { water: true });
  const wound = resolveThirst(game, tasks[2], 'wound');
  assert.equal(wound.wound, true);
  assert.equal(captain.wounds, 1);
});

test('Frenchy swims without a normal wound but still loses face-up gear', () => {
  const game = gameWith(['lauren', 'stephen', 'captain', 'frenchy']);
  const frenchy = byCharacter(game, 'frenchy');
  frenchy.hand = [
    { uid: 'knife-1', id: 'knife', revealed: true },
    { uid: 'cash-1', id: 'cash', revealed: false },
  ];

  const [outcome] = resolveOverboard(game, { overboard: 'frenchy' });
  assert.equal(frenchy.wounds, 0);
  assert.equal(frenchy.inBoat, true);
  assert.equal(outcome.swimmer, true);
  assert.deepEqual(frenchy.hand.map((card) => card.id), ['cash']);
});

test('one revealed bucket of chum wounds everyone in the water, including Frenchy', () => {
  const game = gameWith(['lauren', 'stephen', 'captain', 'frenchy']);
  const captain = byCharacter(game, 'captain');
  const frenchy = byCharacter(game, 'frenchy');
  captain.hand.push({ uid: 'chum-1', id: 'chum', revealed: true });

  const outcomes = resolveOverboard(game, { overboard: 'all' });
  assert.equal(outcomes.length, 4);
  assert.equal(frenchy.wounds, 1);
  assert.equal(byCharacter(game, 'lauren').wounds, 2);
  assert.equal(outcomes.every((outcome) => outcome.shark), true);
});

test('an unconscious character is lost at sea without a revealed life preserver', () => {
  const game = gameWith();
  const lauren = byCharacter(game, 'lauren');
  lauren.wounds = CHARACTER_BY_ID.lauren.size;
  lauren.conscious = false;
  lauren.hand = [{ uid: 'jewels-1', id: 'jewels', value: 3, revealed: false }];

  const [outcome] = resolveOverboard(game, { overboard: 'lauren' });
  assert.equal(outcome.lost, true);
  assert.equal(lauren.alive, false);
  assert.equal(lauren.inBoat, false);
  assert.equal(lauren.hand.length, 0);
});

test('a revealed life preserver keeps an unconscious character and itself in the boat', () => {
  const game = gameWith();
  const lauren = byCharacter(game, 'lauren');
  lauren.wounds = CHARACTER_BY_ID.lauren.size;
  lauren.conscious = false;
  lauren.hand = [
    { uid: 'life-1', id: 'life', revealed: true },
    { uid: 'cash-1', id: 'cash', revealed: true },
  ];

  const [outcome] = resolveOverboard(game, { overboard: 'lauren' });
  assert.equal(outcome.protected, true);
  assert.equal(lauren.alive, true);
  assert.equal(lauren.inBoat, true);
  assert.deepEqual(lauren.hand.map((card) => card.id), ['life']);
});

test('a corpse in the boat keeps treasure points; a body lost at sea does not', () => {
  const game = gameWith();
  const lauren = byCharacter(game, 'lauren');
  lauren.alive = false;
  lauren.conscious = false;
  lauren.inBoat = true;
  lauren.hand = [{ uid: 'jewels-1', id: 'jewels', value: 3, revealed: false }];

  let result = scoreGame(game).find((row) => row.playerId === lauren.id);
  assert.equal(result.breakdown.some((item) => item.code === 'card' && item.value === 2), true);

  lauren.inBoat = false;
  result = scoreGame(game).find((row) => row.playerId === lauren.id);
  assert.equal(result.breakdown.some((item) => item.code === 'card'), false);
});

test('Jewels use set scoring and Lady Lauren doubles the set total', () => {
  const game = gameWith();
  const lauren = byCharacter(game, 'lauren');
  lauren.hand = [
    { uid: 'jewel-1', id: 'jewels', value: 0 },
    { uid: 'jewel-2', id: 'jewels', value: 0 },
    { uid: 'jewel-3', id: 'jewels', value: 0 },
  ];
  const result = scoreGame(game).find((row) => row.playerId === lauren.id);
  assert.equal(result.breakdown.some((item) => item.cardId === 'jewels' && item.value === 16), true);
});

test('a dead body is lost overboard even with a revealed life preserver', () => {
  const game = gameWith();
  const lauren = byCharacter(game, 'lauren');
  lauren.alive = false;
  lauren.conscious = false;
  lauren.hand = [{ uid: 'life-1', id: 'life', revealed: true }];
  const [outcome] = resolveOverboard(game, { overboard: 'lauren' });
  assert.equal(outcome.lost, true);
  assert.equal(lauren.inBoat, false);
  assert.equal(lauren.hand.length, 0);
});

test('resolved navigation cards return to the bottom in the supplied order', () => {
  const deck = ['old-bottom', 'top'];
  putOnBottom(deck, ['first', 'second']);
  assert.deepEqual(deck, ['first', 'second', 'old-bottom', 'top']);
  assert.equal(deck.pop(), 'top');
});

test('saved games validate and hydrate as independent objects', () => {
  const original = gameWith();
  const hydrated = hydrateGame(original);
  assert.equal(validateGame(hydrated), true);
  assert.notEqual(hydrated, original);
  hydrated.players[0].name = 'Changed';
  assert.notEqual(original.players[0].name, 'Changed');

  const corrupted = structuredClone(original);
  corrupted.players[0].hand.push({ uid: 'unknown-1', id: 'unknown' });
  assert.equal(validateGame(corrupted), false);
});
