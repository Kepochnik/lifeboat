export const SAVE_VERSION = 4;

export const CHARACTERS = [
  { id: 'lauren', seat: 0, size: 4, survival: 8, icon: '♛', color: '#8d55c7', accent: '#d7b8ff', affinity: 'jewels' },
  { id: 'stephen', seat: 1, size: 5, survival: 7, icon: '♞', color: '#477eaa', accent: '#b9dcff', affinity: 'painting' },
  { id: 'captain', seat: 2, size: 7, survival: 5, icon: '⚓', color: '#35765f', accent: '#afe7d3', affinity: 'cash' },
  { id: 'mate', seat: 3, size: 8, survival: 4, icon: '✦', color: '#9c4b32', accent: '#ffc4a8' },
  { id: 'frenchy', seat: 4, size: 6, survival: 6, icon: '≈', color: '#9d781f', accent: '#ffe19a', swimmer: true },
  { id: 'kid', seat: 5, size: 3, survival: 9, icon: '★', color: '#686b9e', accent: '#d6d8ff', silentSteal: true },
];

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((character) => [character.id, character]));

export const PROVISION_TEMPLATES = {
  water: { id: 'water', category: 'provision', icon: '💧', value: 0, consumable: true },
  cash: { id: 'cash', category: 'treasure', icon: '🪙', value: 1 },
  jewels: { id: 'jewels', category: 'treasure', icon: '💎', value: 0, setValue: true },
  painting: { id: 'painting', category: 'treasure', icon: '🖼️', value: 3 },
  flare: { id: 'flare', category: 'weapon', icon: '🚨', value: 0, power: 8, special: 'flare' },
  oar: { id: 'oar', category: 'weapon', icon: '🪵', value: 0, power: 1 },
  blackjack: { id: 'blackjack', category: 'weapon', icon: '♣', value: 0, power: 2 },
  knife: { id: 'knife', category: 'weapon', icon: '🔪', value: 0, power: 3 },
  hook: { id: 'hook', category: 'weapon', icon: '🪝', value: 0, power: 4 },
  parasol: { id: 'parasol', category: 'protection', icon: '☂️', value: 0, special: 'parasol' },
  life: { id: 'life', category: 'protection', icon: '🛟', value: 0 },
  medkit: { id: 'medkit', category: 'special', icon: '🩹', value: 0, consumable: true, special: 'medkit' },
  compass: { id: 'compass', category: 'gear', icon: '🧭', value: 0 },
  chum: { id: 'chum', category: 'special', icon: '🦈', value: 0, special: 'chum' },
};

export const PROVISION_COUNTS = {
  water: 16,
  cash: 6,
  jewels: 3,
  painting: 3,
  medkit: 3,
  oar: 2,
  blackjack: 1,
  knife: 1,
  hook: 1,
  flare: 1,
  chum: 2,
  life: 1,
  compass: 1,
  parasol: 1,
};

export const NAVIGATION_TEMPLATES = [
  { bird: 1, overboard: null, thirsty: [], row: false, fight: false },
  { bird: 1, overboard: null, thirsty: ['captain'], row: false, fight: false },
  { bird: 1, overboard: 'frenchy', thirsty: [], row: false, fight: false },
  { bird: 1, overboard: null, thirsty: [], row: true, fight: false },
  { bird: -1, overboard: null, thirsty: ['kid'], row: false, fight: false },
  { bird: 0, overboard: 'kid', thirsty: [], row: false, fight: false },
  { bird: 0, overboard: 'lauren', thirsty: ['stephen'], row: true, fight: true },
  { bird: 0, overboard: null, thirsty: ['captain', 'mate'], row: true, fight: false },
  { bird: 0, overboard: 'stephen', thirsty: [], row: false, fight: true },
  { bird: 0, overboard: null, thirsty: ['frenchy'], row: true, fight: true },
  { bird: 0, overboard: 'captain', thirsty: ['kid'], row: false, fight: false },
  { bird: 0, overboard: null, thirsty: [], row: true, fight: true },
  { bird: 0, overboard: 'mate', thirsty: ['lauren'], row: false, fight: true },
  { bird: 0, overboard: 'frenchy', thirsty: [], row: true, fight: false },
  { bird: 0, overboard: null, thirsty: ['stephen', 'kid'], row: false, fight: false },
  { bird: 0, overboard: 'lauren', thirsty: [], row: true, fight: true },
  { bird: 0, overboard: null, thirsty: ['mate'], row: true, fight: false },
  { bird: 0, overboard: 'kid', thirsty: ['captain'], row: false, fight: true },
  { bird: 0, overboard: null, thirsty: [], row: true, fight: true },
  { bird: 0, overboard: 'stephen', thirsty: ['frenchy'], row: true, fight: false },
  { bird: 0, overboard: 'captain', thirsty: [], row: false, fight: false },
  { bird: 0, overboard: null, thirsty: ['lauren', 'mate'], row: false, fight: true },
  { bird: 0, overboard: 'mate', thirsty: [], row: true, fight: true },
  { bird: 0, overboard: 'frenchy', thirsty: ['stephen', 'captain'], row: false, fight: true },
];

export const PHASES = ['quartermaster', 'actions', 'navigation'];

export function character(id) {
  return CHARACTER_BY_ID[id];
}

export function buildProvisionDeck(makeId) {
  const deck = [];
  Object.entries(PROVISION_COUNTS).forEach(([id, count]) => {
    for (let index = 0; index < count; index += 1) {
      deck.push({ ...PROVISION_TEMPLATES[id], uid: makeId(`p-${id}`), revealed: false });
    }
  });
  return deck;
}

export function buildNavigationDeck(makeId) {
  return NAVIGATION_TEMPLATES.map((card, index) => ({ ...card, uid: makeId(`n-${index}`) }));
}
