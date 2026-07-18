import { CHARACTERS, CHARACTER_BY_ID, PHASES } from './data.js?v=3.1.0-r2';
import { createTranslator, getCardText, getCharacterText } from './i18n.js?v=3.1.0-r2';
import {
  activePlayers,
  addLog,
  applyWound,
  boatPlayers,
  buildThirstQueue,
  createGame,
  deepClone,
  discardCard,
  getPlayer,
  getPlayerByCharacter,
  healPlayer,
  hydrateGame,
  moveCard,
  navigationTargets,
  normalizePositions,
  playerStrength,
  putOnBottom,
  resetDayMarkers,
  resolveFight,
  resolveOverboard,
  resolveThirst,
  revealCard,
  scoreGame,
  swapPositions,
  takeRandomHidden,
  validateGame,
} from './engine.js?v=3.1.0-r2';

const SETTINGS_KEY = 'lifeboat-settings-v3';
const SAVE_KEY = 'lifeboat-game-v4';
const HISTORY_LIMIT = 12;

const defaultSettings = {
  language: 'ru',
  theme: 'dark',
  sound: true,
  vibration: true,
  motion: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  largeText: false,
};

let settings = loadJson(SETTINGS_KEY, defaultSettings);
let t = createTranslator(settings.language);
let game = null;
let history = [];
let passState = null;
let currentScreen = 'title';
let previousScreen = 'title';
let tutorialStep = 0;
let previousFocus = null;
let toastTimer = null;
let wakeLock = null;
let deferredInstallPrompt = null;
let audioContext = null;

const screens = [...document.querySelectorAll('[data-screen]')];
const modal = document.getElementById('modal');
const modalSheet = modal.querySelector('.modal__sheet');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const modalActions = document.getElementById('modal-actions');

function loadJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch {
    return fallback ? { ...fallback } : null;
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function iconMarkup(name, modifier = '') {
  return `<svg class="ui-icon${modifier ? ` ${modifier}` : ''}" aria-hidden="true"><use href="./assets/ui-icons.svg#${name}"></use></svg>`;
}

const CARD_ICON_IDS = Object.freeze({
  water: 'card-water',
  cash: 'card-cash',
  jewels: 'card-jewels',
  painting: 'card-painting',
  flare: 'card-flare',
  oar: 'card-oar',
  blackjack: 'card-blackjack',
  knife: 'card-knife',
  hook: 'card-hook',
  parasol: 'card-parasol',
  life: 'card-life',
  medkit: 'card-medkit',
  compass: 'card-compass',
  chum: 'card-chum',
});

function gameIconMarkup(name, modifier = '') {
  return `<svg class="game-icon${modifier ? ` ${modifier}` : ''}" aria-hidden="true"><use href="./assets/game-icons.svg#${name}"></use></svg>`;
}

function characterPortraitMarkup(characterId, modifier = '') {
  return `<span class="character-portrait character-portrait--${characterId}${modifier ? ` ${modifier}` : ''}" aria-hidden="true"></span>`;
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* storage is optional */ }
}

function setSetting(key, value) {
  settings[key] = value;
  saveSettings();
  applySettings();
  renderAll();
}

function applySettings() {
  t = createTranslator(settings.language);
  document.documentElement.lang = settings.language;
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.classList.toggle('reduce-motion', !settings.motion);
  document.documentElement.classList.toggle('large-text', settings.largeText);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.theme === 'dark' ? '#08171a' : '#d5c6a9');
  document.getElementById('theme-button').innerHTML = iconMarkup(settings.theme === 'dark' ? 'moon' : 'sun');
  document.getElementById('sound-button').innerHTML = iconMarkup(settings.sound ? 'volume-2' : 'volume-x');
  document.getElementById('language-button').textContent = settings.language === 'ru' ? 'EN' : 'RU';
  document.getElementById('home-button').setAttribute('aria-label', t('home'));
  document.getElementById('home-button').title = t('home');
  document.getElementById('sound-button').setAttribute('aria-label', t('sound'));
  document.getElementById('sound-button').title = t('sound');
  document.getElementById('theme-button').setAttribute('aria-label', t('changeTheme'));
  document.getElementById('theme-button').title = t('changeTheme');
  document.getElementById('save-menu-button').setAttribute('aria-label', t('more'));
  document.getElementById('toggle-log-button').setAttribute('aria-label', t('toggleLog'));
  modal.querySelector('[data-close-modal].icon-button')?.setAttribute('aria-label', t('close'));
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-theme-choice]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === settings.theme)));
  document.querySelectorAll('[data-language-choice]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.languageChoice === settings.language)));
  document.getElementById('setting-sound').checked = settings.sound;
  document.getElementById('setting-vibration').checked = settings.vibration;
  document.getElementById('setting-motion').checked = settings.motion;
  document.getElementById('setting-large-text').checked = settings.largeText;
}

function feedback(kind = 'tap') {
  if (settings.vibration && navigator.vibrate) navigator.vibrate(kind === 'danger' ? [35, 30, 55] : kind === 'success' ? [20, 20, 20] : 14);
  if (!settings.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = kind === 'danger' ? 'sawtooth' : 'sine';
    oscillator.frequency.value = kind === 'success' ? 660 : kind === 'danger' ? 150 : 310;
    gain.gain.setValueAtTime(.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .11);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + .12);
  } catch { /* audio feedback is optional */ }
}

function toast(message, tone = 'tap') {
  const element = document.getElementById('toast');
  element.textContent = message;
  element.hidden = false;
  feedback(tone);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { element.hidden = true; }, 2600);
}

function showScreen(name, { remember = true } = {}) {
  if (remember && ['rules', 'settings', 'tutorial'].includes(name)) previousScreen = currentScreen;
  currentScreen = name;
  document.body.dataset.screen = name;
  screens.forEach((screen) => {
    const active = screen.dataset.screen === name;
    screen.hidden = !active;
    screen.classList.toggle('screen--active', active);
  });
  window.scrollTo({ top: 0, behavior: settings.motion ? 'smooth' : 'auto' });
  if (name === 'title') renderTitle();
  if (name === 'setup') renderSetup();
  if (name === 'game') renderGame();
  if (name === 'rules') renderRules();
  if (name === 'tutorial') renderTutorial();
  if (name === 'score') renderScore();
  updateWakeLock();
}

function openModal(title, html, actions = [], { dismissible = true } = {}) {
  previousFocus = document.activeElement;
  modalTitle.textContent = title;
  modalContent.innerHTML = html;
  modalActions.replaceChildren();
  actions.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `button ${action.className || 'button--secondary'}`;
    button.textContent = action.label;
    button.addEventListener('click', () => {
      if (action.close !== false) closeModal();
      action.onClick?.();
    });
    modalActions.append(button);
  });
  modal.querySelectorAll('[data-close-modal]').forEach((element) => { element.hidden = !dismissible; });
  modal.hidden = false;
  modalSheet.focus();
}

function closeModal() {
  if (modal.hidden) return;
  modal.hidden = true;
  modalContent.replaceChildren();
  modalActions.replaceChildren();
  previousFocus?.focus?.();
}

function confirmModal(title, copy, onConfirm, danger = false) {
  openModal(title, `<p class="modal-copy">${escapeHtml(copy)}</p>`, [
    { label: t('cancel'), className: 'button--ghost' },
    { label: t('confirm'), className: danger ? 'button--danger' : 'button--gold', onClick: onConfirm },
  ]);
}

function pushHistory() {
  if (!game) return;
  history.push({ game: deepClone(game), passState: deepClone(passState), screen: currentScreen });
  if (history.length > HISTORY_LIMIT) history.shift();
}

function undo() {
  const snapshot = history.pop();
  if (!snapshot) return;
  game = snapshot.game;
  passState = snapshot.passState;
  autosave();
  showScreen(snapshot.screen === 'pass' ? 'pass' : 'game', { remember: false });
  if (snapshot.screen === 'pass') renderPass();
  toast(t('undo'), 'success');
}

function autosave() {
  if (!game || game.status !== 'active') return;
  game.updatedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: game.version, game, passState, history: history.slice(-4) }));
  } catch { /* save failure should not stop a local game */ }
  renderResumeCard();
}

function loadSavedEnvelope() {
  try {
    const envelope = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!envelope || !validateGame(envelope.game)) return null;
    return envelope;
  } catch { return null; }
}

function restoreSavedGame() {
  const envelope = loadSavedEnvelope();
  if (!envelope) return toast(t('invalidSave'), 'danger');
  try {
    game = hydrateGame(envelope.game);
    passState = envelope.passState || null;
    history = Array.isArray(envelope.history) ? envelope.history : [];
    showScreen(passState ? 'pass' : (game.status === 'finished' ? 'score' : 'game'), { remember: false });
    if (passState) renderPass();
  } catch { toast(t('invalidSave'), 'danger'); }
}

function clearSavedGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  renderResumeCard();
}

function renderResumeCard() {
  const card = document.getElementById('resume-card');
  const envelope = loadSavedEnvelope();
  card.hidden = !envelope;
  if (envelope) document.getElementById('resume-meta').textContent = `${t('day')} ${envelope.game.day} · ${envelope.game.players.length} ${t('players').toLowerCase()}`;
}

function renderTitle() { renderResumeCard(); }

let setupCount = 5;
let setupCharacters = CHARACTERS.slice(0, setupCount).map((item) => item.id);
const defaultNames = { ru: ['Анна', 'Борис', 'Вера', 'Глеб', 'Даша', 'Егор'], en: ['Anna', 'Ben', 'Clara', 'Daniel', 'Eva', 'Finn'] };

function renderSetup() {
  document.querySelectorAll('[data-player-count]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.playerCount) === setupCount)));
  while (setupCharacters.length < setupCount) setupCharacters.push(CHARACTERS.find((item) => !setupCharacters.includes(item.id)).id);
  setupCharacters = setupCharacters.slice(0, setupCount);
  const list = document.getElementById('setup-list');
  const existingNames = [...list.querySelectorAll('input')].map((input) => input.value);
  list.innerHTML = Array.from({ length: setupCount }, (_, index) => {
    const selectedId = setupCharacters[index];
    const selected = CHARACTER_BY_ID[selectedId];
    const text = getCharacterText(selectedId, settings.language);
    const options = CHARACTERS.map((item) => `<option value="${item.id}" ${item.id === selectedId ? 'selected' : ''}>${escapeHtml(getCharacterText(item.id, settings.language)[0])} · ${item.size}/${item.survival}</option>`).join('');
    return `<div class="setup-player surface" style="--player-color:${selected.color}">
      ${characterPortraitMarkup(selectedId, 'setup-player__portrait')}
      <div class="field"><label for="player-name-${index}">${t('playerName')} ${index + 1}</label><input id="player-name-${index}" name="player-name" maxlength="24" autocomplete="off" value="${escapeHtml(existingNames[index] || defaultNames[settings.language][index])}" required></div>
      <div class="field"><label for="player-character-${index}">${t('character')}</label><select id="player-character-${index}" data-character-index="${index}" aria-describedby="character-hint-${index}">${options}</select><span id="character-hint-${index}" hidden>${escapeHtml(text[2])}</span></div>
    </div>`;
  }).join('');
  document.getElementById('setup-error').textContent = '';
}

function randomizeCharacters() {
  setupCharacters = [...CHARACTERS].sort(() => Math.random() - .5).slice(0, setupCount).map((item) => item.id);
  renderSetup();
  feedback();
}

function startNewGameFromSetup() {
  const names = [...document.querySelectorAll('[name="player-name"]')].map((input) => input.value.trim());
  const characterIds = [...document.querySelectorAll('[data-character-index]')].map((select) => select.value);
  const error = document.getElementById('setup-error');
  if (names.some((name) => !name)) { error.textContent = t('namesRequired'); return; }
  if (new Set(characterIds).size !== characterIds.length) { error.textContent = t('uniqueCharacters'); return; }
  game = createGame({ names, characterIds });
  history = [];
  passState = null;
  startQuartermaster();
  autosave();
}

function passTo(playerId, title, message) {
  const player = getPlayer(game, playerId);
  game.currentPlayerId = playerId;
  passState = { playerId, title, message };
  autosave();
  showScreen('pass', { remember: false });
  renderPass();
}

function renderPass() {
  if (!passState || !game) return;
  const player = getPlayer(game, passState.playerId);
  document.getElementById('pass-heading').textContent = passState.title || player?.name || t('passPhone');
  document.getElementById('pass-message').textContent = passState.message || t('privateScreen');
}

function acceptPass() {
  passState = null;
  autosave();
  showScreen('game', { remember: false });
  feedback('success');
}

function renderAll() {
  applySettings();
  if (currentScreen === 'setup') renderSetup();
  if (currentScreen === 'game') renderGame();
  if (currentScreen === 'rules') renderRules();
  if (currentScreen === 'tutorial') renderTutorial();
  if (currentScreen === 'score') renderScore();
  renderResumeCard();
}

function statusFor(player) {
  if (!player.inBoat) return { label: t('statusLost'), className: 'bad' };
  if (!player.alive) return { label: t('statusDead'), className: 'bad' };
  if (!player.conscious) return { label: t('statusUnconscious'), className: 'bad' };
  return { label: t('statusAlive'), className: 'good' };
}

function phaseLabel(phase) {
  return t(phase || 'quartermaster');
}

function renderGame() {
  if (!game) return showScreen('title', { remember: false });
  const current = getPlayer(game, game.currentPlayerId) || boatPlayers(game)[0] || game.players[0];
  document.getElementById('hud-day').textContent = game.day;
  document.getElementById('hud-phase').textContent = phaseLabel(game.phase);
  document.getElementById('game-player-name').textContent = current?.name || '—';
  document.getElementById('hud-birds').textContent = `${'●'.repeat(game.birds)}${'○'.repeat(Math.max(0, 4 - game.birds))}`;
  document.getElementById('phase-track').innerHTML = PHASES.map((phase, index) => {
    const activeIndex = PHASES.indexOf(game.phase);
    return `<i class="${index < activeIndex ? 'done' : index === activeIndex ? 'active' : ''}" title="${escapeHtml(phaseLabel(phase))}"></i>`;
  }).join('');
  renderBoat(current);
  renderPrivatePanel(current);
  renderTurnPanel(current);
  renderLog();
  document.getElementById('trade-button').disabled = game.phase !== 'actions' || Boolean(game.pending) || !current?.alive || !current?.conscious;
  document.getElementById('undo-button').disabled = history.length === 0;
  autosave();
}

function renderBoat(current) {
  const boat = boatPlayers(game);
  const track = document.getElementById('boat-track');
  track.style.setProperty('--boat-count', boat.length);
  track.innerHTML = boat.map((player) => {
    const character = CHARACTER_BY_ID[player.characterId];
    const text = getCharacterText(player.characterId, settings.language);
    const status = statusFor(player);
    const markers = [
      player.rowed ? `<span class="mini-marker">${gameIconMarkup('card-oar')}</span>` : '',
      player.fought ? `<span class="mini-marker">${gameIconMarkup('marker-fight')}</span>` : '',
      player.hand.some((card) => card.id === 'life' && card.revealed) ? `<span class="mini-marker">${gameIconMarkup('card-life')}</span>` : '',
      player.hand.some((card) => card.id === 'parasol' && card.revealed) ? `<span class="mini-marker">${gameIconMarkup('card-parasol')}</span>` : '',
    ].join('');
    return `<article class="player-card ${player.id === current?.id ? 'current' : ''} ${!player.inBoat ? 'lost' : ''}" style="--player-color:${character.color}" aria-label="${escapeHtml(player.name)}, ${escapeHtml(status.label)}">
      ${characterPortraitMarkup(player.characterId, 'player-card__portrait')}
      <strong>${escapeHtml(player.name)}</strong><small>${escapeHtml(text[0])}</small>
      <small>${t('wounds')}: ${player.wounds}/${character.size}</small>
      <span class="status-pill ${status.className}">${escapeHtml(status.label)}</span><div class="mini-markers" aria-hidden="true">${markers}</div>
    </article>`;
  }).join('');
  document.getElementById('deck-status').textContent = `P ${game.provisions.length} · N ${game.navigation.length} · R ${game.rowStack.length}`;
}

function categoryColor(category) {
  return { provision: '#285e54', treasure: '#6d4a18', weapon: '#6d302b', protection: '#295276', gear: '#514372', special: '#6a3d61' }[category] || '#2d4652';
}

function cardMarkup(card, { selectable = false, selected = false, control = '', hiddenAllowed = true } = {}) {
  const [name, description] = getCardText(card.id, settings.language);
  const hidden = hiddenAllowed && !card.revealed;
  const classes = ['game-card', hidden ? 'hidden-card' : '', selectable ? 'selectable' : '', selected ? 'selected' : ''].filter(Boolean).join(' ');
  const accessible = hidden ? t('hidden') : `${name}. ${description}`;
  return `<article class="${classes}" style="--card-color:${categoryColor(card.category)}" ${selectable ? `role="button" tabindex="0" ${control}` : ''} aria-label="${escapeHtml(accessible)}">
    <span class="game-card__type">${hidden ? t('hidden') : escapeHtml(card.category)}</span>
    <span class="game-card__icon" aria-hidden="true">${gameIconMarkup(hidden ? 'card-back' : CARD_ICON_IDS[card.id] || 'card-back')}</span>
    <strong>${hidden ? 'LIFEBOAT' : escapeHtml(name)}</strong>
    <small>${hidden ? t('hidden') : escapeHtml(description)}</small>
  </article>`;
}

function navigationCardMarkup(card, { selectable = false, selected = false, control = '' } = {}) {
  const birdIcon = card.bird > 0 ? 'nav-bird' : card.bird < 0 ? 'nav-fog' : 'nav-calm';
  const birdDelta = card.bird > 0 ? '+1' : card.bird < 0 ? '−1' : '0';
  const overboardLabel = card.overboard === 'all'
    ? t('everyone')
    : card.overboard === 'allbut'
      ? t('everyone')
      : getCharacterText(card.overboard, settings.language)?.[0] || '';
  const effects = [
    card.overboard ? `${t('overboard')}: ${overboardLabel}` : '',
    card.thirsty?.length ? `${t('thirst')}: ${card.thirsty.length}` : '',
    card.row ? t('row') : '',
    card.fight ? t('fight') : '',
  ].filter(Boolean).join(' · ') || t('navCalm');
  return `<article class="game-card nav-card ${selectable ? 'selectable' : ''} ${selected ? 'selected' : ''}" style="--card-color:#16495c" ${selectable ? `role="button" tabindex="0" aria-pressed="${selected}" ${control}` : ''}>
    <span class="game-card__type">${t('navigation')}</span><span class="game-card__icon nav-card__icon" aria-hidden="true">${gameIconMarkup(birdIcon)}<b>${birdDelta}</b></span>
    <strong>${card.bird > 0 ? t('birdSeen') : card.bird < 0 ? t('birdLost') : t('navCalm')}</strong><small>${escapeHtml(effects)}</small>
  </article>`;
}

function renderPrivatePanel(current) {
  const panel = document.getElementById('private-panel');
  if (!current) { panel.hidden = true; return; }
  panel.hidden = false;
  const loved = getPlayerByCharacter(game, current.lovedCharacterId);
  const hated = getPlayerByCharacter(game, current.hatedCharacterId);
  document.getElementById('secret-strip').innerHTML = `<div class="secret secret--love"><small>${iconMarkup('heart', 'ui-icon--sm')} ${t('friend')}</small><strong>${escapeHtml(loved?.name || '—')}</strong></div><div class="secret secret--hate"><small>${iconMarkup('skull', 'ui-icon--sm')} ${t('enemy')}</small><strong>${escapeHtml(hated?.name || '—')}</strong></div>`;
  document.getElementById('hand-count').textContent = String(current.hand.length);
  const row = document.getElementById('hand-row');
  if (!current.hand.length) { row.innerHTML = `<p>${t('noCards')}</p>`; return; }
  row.innerHTML = current.hand.map((card) => {
    const [name, description] = getCardText(card.id, settings.language);
    const hidden = !card.revealed;
    const special = ['medkit', 'parasol', 'flare'].includes(card.id);
    const ownsPrivateScreen = current.id === game.currentPlayerId && current.alive && current.conscious;
    const canUseSpecial = ownsPrivateScreen && game.phase === 'actions' && !game.pending;
    const canReveal = ownsPrivateScreen;
    const label = hidden ? (special && canUseSpecial ? t('specialAction') : canReveal ? t('reveal') : '') : (special && canUseSpecial ? t('specialAction') : '');
    return `<article class="game-card ${hidden ? 'hidden-card' : ''}" style="--card-color:${categoryColor(card.category)}" aria-label="${escapeHtml(hidden ? t('hidden') : `${name}. ${description}`)}">
      <span class="game-card__type">${hidden ? t('hidden') : escapeHtml(card.category)}</span><span class="game-card__icon" aria-hidden="true">${gameIconMarkup(hidden ? 'card-back' : CARD_ICON_IDS[card.id] || 'card-back')}</span><strong>${hidden ? 'LIFEBOAT' : escapeHtml(name)}</strong><small>${hidden ? t('hidden') : escapeHtml(description)}</small>
      ${label ? `<button type="button" data-hand-action="${special && canUseSpecial ? 'special' : 'reveal'}" data-card-uid="${card.uid}">${escapeHtml(label)}</button>` : ''}
    </article>`;
  }).join('');
}

function renderTurnPanel(current) {
  const panel = document.getElementById('turn-panel');
  if (game.status === 'finished') return showScreen('score', { remember: false });
  if (game.pending?.type === 'draft') return renderDraft(panel, current);
  if (game.pending?.type === 'row') return renderRowChoice(panel);
  if (game.pending?.type === 'response') return renderResponse(panel);
  if (game.pending?.type === 'fight') return renderFightSupport(panel);
  if (game.pending?.type === 'fightResult') return renderFightResult(panel);
  if (game.pending?.type === 'mugReward') return renderMugReward(panel);
  if (game.pending?.type === 'tradeReturn') return renderTradeReturn(panel);
  if (game.pending?.type === 'tradeComplete' || game.pending?.type === 'postAction') return renderPostAction(panel);
  if (game.pending?.type === 'overboardPrep') return renderOverboardPrep(panel);
  if (game.pending?.type === 'navChoose') return renderNavigationChoice(panel);
  if (game.pending?.type === 'navResult') return renderNavigationResult(panel);
  if (game.pending?.type === 'thirst') return renderThirst(panel);
  if (game.phase === 'actions') return renderActionChoice(panel, current);
  panel.innerHTML = `<div class="turn-heading"><span>${phaseLabel(game.phase)}</span><h3>${t('privateScreen')}</h3></div>`;
}

function renderActionChoice(panel, current) {
  if (!current?.alive || !current?.conscious) return;
  panel.innerHTML = `<div class="turn-heading"><span>${t('actions')}</span><h3>${t('chooseAction')}</h3></div><div class="action-grid">
    <button class="action-button" type="button" data-game-action="rest" style="--action-tint:rgba(55,67,96,.7)"><span>${iconMarkup('moon')}</span><strong>${t('rest')}</strong><small>${t('restHint')}</small></button>
    <button class="action-button" type="button" data-game-action="row" style="--action-tint:rgba(20,91,111,.7)"><span>${iconMarkup('waves')}</span><strong>${t('row')}</strong><small>${t('rowHint')}</small></button>
    <button class="action-button" type="button" data-game-action="swap" style="--action-tint:rgba(76,47,103,.72)"><span>${iconMarkup('arrow-left-right')}</span><strong>${t('swap')}</strong><small>${t('swapHint')}</small></button>
    <button class="action-button" type="button" data-game-action="mug" style="--action-tint:rgba(108,45,36,.75)"><span>${iconMarkup('swords')}</span><strong>${t('mug')}</strong><small>${t('mugHint')}</small></button>
  </div>`;
}

function renderDraft(panel) {
  const pending = game.pending;
  const picker = getPlayer(game, pending.order[pending.index]);
  panel.innerHTML = `<div class="turn-heading"><span>${t('quartermaster')}</span><h3>${escapeHtml(picker?.name || '')}: ${t('chooseCard')}</h3><p>${pending.pile.length} · ${t('hidden')}</p></div><div class="card-row">${pending.pile.map((card) => cardMarkup(card, { selectable: true, hiddenAllowed: false, control: `data-draft-card="${card.uid}"` })).join('')}</div>`;
}

function renderRowChoice(panel) {
  const pending = game.pending;
  panel.innerHTML = `<div class="turn-heading"><span>${t('row')}</span><h3>${t('chooseCard')}</h3><p>${t('rowInstruction')}</p></div><div class="card-row">${pending.cards.map((card) => navigationCardMarkup(card, { selectable: true, selected: pending.selected.includes(card.uid), control: `data-row-card="${card.uid}"` })).join('')}</div><div class="button-row"><button class="button button--ghost" type="button" data-pending-action="cancel-row">${t('cancel')}</button><button class="button button--gold" type="button" data-pending-action="confirm-row">${t('confirm')}</button></div>`;
}

function renderResponse(panel) {
  const pending = game.pending;
  const attacker = getPlayer(game, pending.attackerId);
  panel.innerHTML = `<div class="turn-heading"><span>${pending.action === 'swap' ? t('swap') : t('mug')}</span><h3>${escapeHtml(attacker.name)}</h3><p>${pending.action === 'swap' ? t('swapHint') : t('mugHint')}</p></div><div class="button-row"><button class="button button--good" type="button" data-response="accept">${t('accept')}</button><button class="button button--danger" type="button" data-response="fight">${t('fight')}</button></div>`;
}

function renderFightSupport(panel) {
  const pending = game.pending;
  const supporterId = pending.supporters[pending.supportIndex];
  const supporter = getPlayer(game, supporterId);
  const attacker = getPlayer(game, pending.attackerId);
  const defender = getPlayer(game, pending.defenderId);
  panel.innerHTML = `<div class="turn-heading"><span>${t('fight')}</span><h3>${escapeHtml(supporter?.name || '')}: ${t('chooseAction')}</h3></div>${fightBoardMarkup(attacker, defender)}<div class="choice-grid"><button class="choice-button" type="button" data-fight-support="attacker"><strong>${t('supportAttacker')}</strong><small>${escapeHtml(attacker.name)}</small></button><button class="choice-button" type="button" data-fight-support="defender"><strong>${t('supportDefender')}</strong><small>${escapeHtml(defender.name)}</small></button><button class="choice-button" type="button" data-fight-support="neutral"><strong>${t('neutral')}</strong></button></div>`;
}

function fightBoardMarkup(attacker, defender, result = null) {
  const aStrength = result?.attackerStrength ?? playerStrength(attacker);
  const dStrength = result?.defenderStrength ?? playerStrength(defender);
  return `<div class="fight-board"><div class="fight-side"><small>${t('attacker')}</small><strong>${escapeHtml(attacker.name)}</strong><b>${aStrength}</b></div><div class="fight-versus">${iconMarkup('swords')}</div><div class="fight-side"><small>${t('defender')}</small><strong>${escapeHtml(defender.name)}</strong><b>${dStrength}</b></div></div>`;
}

function renderFightResult(panel) {
  const pending = game.pending;
  const attacker = getPlayer(game, pending.attackerId);
  const defender = getPlayer(game, pending.defenderId);
  const winner = pending.result.winner === 'attacker' ? attacker : defender;
  panel.innerHTML = `<div class="turn-heading"><span>${t('fightResult')}</span><h3>${t('winner')}: ${escapeHtml(winner.name)}</h3></div>${fightBoardMarkup(attacker, defender, pending.result)}<button class="button button--gold" type="button" data-pending-action="continue-fight">${t('next')}</button>`;
}

function renderMugReward(panel) {
  const pending = game.pending;
  const target = getPlayer(game, pending.targetId);
  const openCards = target.hand.filter((card) => card.revealed);
  const hidden = target.hand.filter((card) => !card.revealed);
  panel.innerHTML = `<div class="turn-heading"><span>${t('mug')}</span><h3>${t('chooseMugReward')}</h3></div><div class="card-row">${openCards.map((card) => cardMarkup(card, { selectable: true, hiddenAllowed: false, control: `data-mug-card="${card.uid}"` })).join('')}${hidden.length ? `<button class="game-card selectable hidden-card" type="button" data-mug-hidden><span class="game-card__type">${t('hidden')}</span><span class="game-card__icon">${gameIconMarkup('card-back')}</span><strong>${t('randomHidden')}</strong><small>${hidden.length}</small></button>` : ''}</div>`;
}

function renderTradeReturn(panel) {
  const pending = game.pending;
  const from = getPlayer(game, pending.fromId);
  const target = getPlayer(game, pending.targetId);
  const offer = from.hand.find((card) => card.uid === pending.offerUid);
  panel.innerHTML = `<div class="turn-heading"><span>${t('trade')}</span><h3>${escapeHtml(from.name)} → ${escapeHtml(target.name)}</h3><p>${t('tradeReturn')}</p></div><div class="card-row">${target.hand.map((card) => cardMarkup(card, { selectable: true, hiddenAllowed: false, control: `data-trade-return="${card.uid}"` })).join('')}</div><div class="button-row"><button class="button button--good" type="button" data-trade-return="gift">${t('gift')}</button><button class="button button--danger" type="button" data-trade-return="decline">${t('decline')}</button></div><p class="modal-copy">${escapeHtml(getCardText(offer.id, settings.language)[0])}</p>`;
}

function renderPostAction(panel) {
  panel.innerHTML = `<div class="turn-heading"><span>✓</span><h3>${escapeHtml(game.pending.message || t('completeTrade'))}</h3></div><button class="button button--gold" type="button" data-pending-action="finish-post">${t('next')}</button>`;
}

function renderOverboardPrep(panel) {
  const pending = game.pending;
  const helper = getPlayer(game, pending.candidates[pending.index]);
  if (!helper) return completeNavigationEffects(pending.card, pending.sharks);
  const canThrowLife = helper.hand.some((card) => card.id === 'life') && pending.targetIds.some((id) => {
    const target = getPlayer(game, id);
    return target?.alive && !target.hand.some((card) => card.id === 'life' && card.revealed);
  });
  const canThrowChum = helper.hand.some((card) => card.id === 'chum');
  const targets = pending.targetIds.map((id) => getPlayer(game, id)?.name).filter(Boolean).join(', ');
  panel.innerHTML = `<div class="turn-heading"><span>${t('overboard')}</span><h3>${t('overboardPrep')}</h3><p>${escapeHtml(targets)}</p></div><div class="button-row">${canThrowLife ? `<button class="button button--good" type="button" data-overboard-prep="life">${t('throwPreserver')}</button>` : ''}${canThrowChum ? `<button class="button button--danger" type="button" data-overboard-prep="chum">${t('throwChum')}</button>` : ''}<button class="button button--ghost" type="button" data-overboard-prep="continue">${t('keepCards')}</button></div>${pending.sharks ? `<p class="modal-copy">${t('sharksAttack')} × ${pending.sharks}</p>` : ''}`;
}

function renderNavigationChoice(panel) {
  const pending = game.pending;
  panel.innerHTML = `<div class="turn-heading"><span>${t('navigation')}</span><h3>${t('chooseCard')}</h3><p>${t('navInstruction')}</p></div><div class="card-row">${pending.cards.map((card) => navigationCardMarkup(card, { selectable: true, control: `data-nav-card="${card.uid}"` })).join('')}</div>`;
}

function renderNavigationResult(panel) {
  const pending = game.pending;
  const lines = pending.outcomes.map((outcome) => {
    const player = getPlayer(game, outcome.playerId);
    if (outcome.lost) return `${escapeHtml(player.name)} — ${t('statusLost')}`;
    const details = [
      outcome.protected ? t('throwPreserver') : '',
      outcome.swimmer ? t('survived') : '',
      outcome.shark ? t('sharksAttack') : '',
    ].filter(Boolean).join(' · ');
    return `${escapeHtml(player.name)}${details ? ` · ${details}` : ''}`;
  });
  panel.innerHTML = `<div class="turn-heading"><span>${t('navigation')}</span><h3>${pending.card.bird > 0 ? t('birdSeen') : pending.card.bird < 0 ? t('birdLost') : t('navCalm')}</h3><p>${lines.join('<br>') || t('navCalm')}</p></div>${navigationCardMarkup(pending.card)}<button class="button button--gold" type="button" data-pending-action="continue-navigation">${t('next')}</button>`;
}

function renderThirst(panel) {
  const pending = game.pending;
  const task = pending.queue[pending.index];
  const player = getPlayer(game, task?.playerId);
  if (!player) return;
  const water = player.hand.some((card) => card.id === 'water');
  const parasol = player.hand.some((card) => card.id === 'parasol' && card.revealed) && player.parasolDay !== game.day;
  const sourceLabel = { named: t('thirstNamed'), row: t('thirstRow'), fight: t('thirstFight') }[task.source] || task.source;
  panel.innerHTML = `<div class="turn-heading"><span>${t('thirst')}</span><h3>${escapeHtml(player.name)}</h3><p>${escapeHtml(sourceLabel)}</p></div><div class="button-row">${water ? `<button class="button button--good" type="button" data-thirst-choice="water">${t('useWater')}</button>` : ''}${parasol ? `<button class="button button--secondary" type="button" data-thirst-choice="parasol">${t('useParasol')}</button>` : ''}<button class="button button--danger" type="button" data-thirst-choice="wound">${t('takeWound')}</button></div>`;
}

function renderLog() {
  const list = document.getElementById('game-log');
  list.innerHTML = game.logs.slice(-40).map((entry) => `<li class="${entry.tone}">${escapeHtml(formatLog(entry))}</li>`).join('');
  list.scrollTop = list.scrollHeight;
}

function formatLog(entry) {
  const player = entry.data.playerId ? getPlayer(game, entry.data.playerId) : null;
  const target = entry.data.targetId ? getPlayer(game, entry.data.targetId) : null;
  const card = entry.data.cardId ? getCardText(entry.data.cardId, settings.language)[0] : null;
  const ru = settings.language === 'ru';
  const messages = {
    gameStarted: ru ? 'Шлюпка отчалила от тонущего корабля.' : 'The lifeboat pushes away from the sinking ship.',
    startingCards: ru ? 'Каждый получил закрытую стартовую карту.' : 'Everyone received a hidden starting card.',
    draft: ru ? `${player?.name} берёт закрытую карту.` : `${player?.name} takes a hidden card.`,
    suppliesGone: ru ? 'Колода припасов закончилась и не перемешивается заново.' : 'The supply deck is empty and is not reshuffled.',
    rest: ru ? `${player?.name} ничего не делает.` : `${player?.name} does nothing.`,
    row: ru ? `${player?.name} гребёт.` : `${player?.name} rows.`,
    swap: ru ? `${player?.name} и ${target?.name} меняются местами.` : `${player?.name} and ${target?.name} change seats.`,
    mug: ru ? `${player?.name} забирает ${card} у ${target?.name}.` : `${player?.name} takes ${card} from ${target?.name}.`,
    trade: ru ? `${player?.name} и ${target?.name} завершили обмен.` : `${player?.name} and ${target?.name} completed a trade.`,
    reveal: ru ? `${player?.name} открывает ${card}.` : `${player?.name} reveals ${card}.`,
    fight: ru ? `Бой: ${entry.data.attackerStrength} против ${entry.data.defenderStrength}.` : `Fight: ${entry.data.attackerStrength} vs ${entry.data.defenderStrength}.`,
    wound: ru ? `${player?.name} получает рану.` : `${player?.name} takes a wound.`,
    unconscious: ru ? `${player?.name} без сознания.` : `${player?.name} is unconscious.`,
    died: ru ? `${player?.name} погиб.` : `${player?.name} died.`,
    lost: ru ? `${player?.name} унесён волнами.` : `${player?.name} is lost at sea.`,
    bird: ru ? `Птицы: ${entry.data.birds}/4.` : `Birds: ${entry.data.birds}/4.`,
    water: ru ? `${player?.name} выпивает воду.` : `${player?.name} drinks water.`,
    parasol: ru ? `${player?.name} укрывается зонтиком.` : `${player?.name} uses the parasol.`,
    day: ru ? `Начинается день ${entry.data.day}.` : `Day ${entry.data.day} begins.`,
    flare: ru ? `${player?.name} стреляет из ракетницы: ${entry.data.birds >= 0 ? '+' : ''}${entry.data.birds} птиц.` : `${player?.name} fires the flare: ${entry.data.birds >= 0 ? '+' : ''}${entry.data.birds} birds.`,
    heal: ru ? `${player?.name} лечит ${target?.name}.` : `${player?.name} heals ${target?.name}.`,
    chum: ru ? `${player?.name} выбрасывает приманку — акулы идут к лодке.` : `${player?.name} throws chum — sharks close in.`,
    life: ru ? `${player?.name} бросает спасательный круг для ${target?.name}.` : `${player?.name} throws a life preserver to ${target?.name}.`,
  };
  return messages[entry.code] || entry.code;
}

function startQuartermaster() {
  game.phase = 'quartermaster';
  game.pending = null;
  const order = activePlayers(game).map((player) => player.id);
  if (!order.length) return startNavigation();
  const pile = [];
  while (pile.length < order.length && game.provisions.length) pile.push(game.provisions.pop());
  if (!pile.length) {
    addLog(game, 'suppliesGone', {}, 'danger');
    return startActions();
  }
  game.pending = { type: 'draft', pile, order, index: 0 };
  const picker = getPlayer(game, order[0]);
  passTo(picker.id, picker.name, t('quartermaster'));
}

function pickDraftCard(cardUid) {
  const pending = game.pending;
  if (!pending || pending.type !== 'draft') return;
  const picker = getPlayer(game, pending.order[pending.index]);
  const index = pending.pile.findIndex((card) => card.uid === cardUid);
  if (!picker || index < 0) return;
  pushHistory();
  const [card] = pending.pile.splice(index, 1);
  card.revealed = false;
  picker.hand.push(card);
  addLog(game, 'draft', { playerId: picker.id }, 'muted');
  pending.index += 1;
  if (pending.index >= pending.order.length || !pending.pile.length) {
    if (pending.pile.length) {
      const last = getPlayer(game, pending.order[pending.order.length - 1]);
      pending.pile.forEach((remaining) => { remaining.revealed = false; last.hand.push(remaining); });
    }
    return startActions();
  }
  const next = getPlayer(game, pending.order[pending.index]);
  passTo(next.id, next.name, t('quartermaster'));
}

function startActions() {
  game.phase = 'actions';
  game.pending = null;
  game.turnOrder = activePlayers(game).map((player) => player.id);
  game.turnIndex = 0;
  if (!game.turnOrder.length) return startNavigation();
  const first = getPlayer(game, game.turnOrder[0]);
  passTo(first.id, first.name, t('chooseAction'));
}

function advanceAction() {
  game.pending = null;
  game.turnIndex += 1;
  while (game.turnIndex < game.turnOrder.length) {
    const next = getPlayer(game, game.turnOrder[game.turnIndex]);
    if (next?.inBoat && next.alive && next.conscious) {
      return passTo(next.id, next.name, t('chooseAction'));
    }
    game.turnIndex += 1;
  }
  startNavigation();
}

function handleGameAction(action) {
  const actor = getPlayer(game, game.currentPlayerId);
  if (!actor || game.phase !== 'actions' || game.pending) return;
  if (action === 'rest') {
    pushHistory();
    addLog(game, 'rest', { playerId: actor.id });
    return advanceAction();
  }
  if (action === 'row') return beginRow(actor);
  if (action === 'swap' || action === 'mug') return chooseActionTarget(action, actor);
}

function beginRow(actor) {
  if (!game.navigation.length) return advanceAction();
  pushHistory();
  const cards = [];
  const oarBonus = actor.hand.filter((card) => card.id === 'oar' && card.revealed).length;
  while (cards.length < 2 + oarBonus && game.navigation.length) cards.push(game.navigation.pop());
  game.pending = { type: 'row', actorId: actor.id, cards, selected: [] };
  renderGame();
}

function toggleRowCard(cardUid) {
  const selected = game.pending.selected;
  const index = selected.indexOf(cardUid);
  if (index >= 0) selected.splice(index, 1); else selected.push(cardUid);
  renderGame();
}

function finishRow(confirmed) {
  const pending = game.pending;
  const actor = getPlayer(game, pending.actorId);
  const chosen = confirmed ? pending.cards.filter((card) => pending.selected.includes(card.uid)) : [];
  const rest = pending.cards.filter((card) => !chosen.includes(card));
  game.rowStack.push(...chosen);
  putOnBottom(game.navigation, rest);
  if (confirmed) {
    actor.rowed = true;
    addLog(game, 'row', { playerId: actor.id }, 'success');
  }
  advanceAction();
}

function chooseActionTarget(action, actor) {
  const targets = boatPlayers(game).filter((player) => player.id !== actor.id && (action !== 'mug' || player.hand.length));
  if (!targets.length) return toast(t('noTargetCards'), 'danger');
  openPlayerPicker(t('choosePlayer'), targets, (targetId) => initiateRequest(action, actor.id, targetId));
}

function openPlayerPicker(title, players, onPick) {
  const html = `<div class="choice-grid">${players.map((player) => {
    const status = statusFor(player);
    return `<button class="choice-button" type="button" data-modal-player="${player.id}"><strong>${escapeHtml(player.name)}</strong><small>${escapeHtml(getCharacterText(player.characterId, settings.language)[0])} · ${escapeHtml(status.label)}</small></button>`;
  }).join('')}</div>`;
  openModal(title, html, [{ label: t('cancel'), className: 'button--ghost' }]);
  modalContent.querySelectorAll('[data-modal-player]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.modalPlayer;
    closeModal();
    onPick(id);
  }));
}

function initiateRequest(action, attackerId, targetId) {
  const attacker = getPlayer(game, attackerId);
  const target = getPlayer(game, targetId);
  if (!attacker || !target) return;
  pushHistory();
  if (action === 'mug' && attacker.characterId === 'kid' && target.hand.some((card) => !card.revealed)) {
    const card = takeRandomHidden(game, target.id, attacker.id);
    addLog(game, 'mug', { playerId: attacker.id, targetId: target.id, cardId: card.id }, 'success');
    return setPostAction(attacker.id, `${t('mug')}: ${getCardText(card.id, settings.language)[0]}`);
  }
  if (!target.alive || !target.conscious) {
    if (action === 'swap') {
      swapPositions(game, attacker.id, target.id);
      addLog(game, 'swap', { playerId: attacker.id, targetId: target.id }, 'success');
      return setPostAction(attacker.id, t('swap'));
    }
    return prepareMugReward(attacker.id, target.id);
  }
  game.pending = { type: 'response', action, attackerId, targetId };
  passTo(target.id, target.name, action === 'swap' ? t('swap') : t('mug'));
}

function handleResponse(response) {
  const pending = game.pending;
  if (!pending || pending.type !== 'response') return;
  if (response === 'accept') {
    if (pending.action === 'swap') {
      swapPositions(game, pending.attackerId, pending.targetId);
      addLog(game, 'swap', { playerId: pending.attackerId, targetId: pending.targetId }, 'success');
      return setPostAction(pending.attackerId, t('swap'));
    }
    return prepareMugReward(pending.attackerId, pending.targetId);
  }
  beginFight(pending);
}

function beginFight(request) {
  const supporters = activePlayers(game).map((player) => player.id).filter((id) => id !== request.attackerId && id !== request.targetId);
  game.pending = { type: 'fight', action: request.action, attackerId: request.attackerId, defenderId: request.targetId, supporters, supportIndex: 0, support: {} };
  if (!supporters.length) return finishFight();
  const first = getPlayer(game, supporters[0]);
  passTo(first.id, first.name, t('fight'));
}

function chooseFightSupport(side) {
  const pending = game.pending;
  const supporterId = pending.supporters[pending.supportIndex];
  pending.support[supporterId] = side;
  pending.supportIndex += 1;
  if (pending.supportIndex >= pending.supporters.length) return finishFight();
  const next = getPlayer(game, pending.supporters[pending.supportIndex]);
  passTo(next.id, next.name, t('fight'));
}

function finishFight() {
  const pending = game.pending;
  const result = resolveFight(game, pending);
  addLog(game, 'fight', { attackerStrength: result.attackerStrength, defenderStrength: result.defenderStrength }, result.winner === 'attacker' ? 'success' : 'danger');
  result.wounds.forEach((wound) => {
    addLog(game, 'wound', { playerId: wound.playerId }, 'danger');
    if (wound.died) addLog(game, 'died', { playerId: wound.playerId }, 'danger');
    else if (wound.becameUnconscious) addLog(game, 'unconscious', { playerId: wound.playerId }, 'danger');
  });
  game.pending = { ...pending, type: 'fightResult', result };
  const attacker = getPlayer(game, pending.attackerId);
  passTo(attacker.id, attacker.name, t('fightResult'));
}

function continueAfterFight() {
  const pending = game.pending;
  if (pending.result.winner === 'attacker') {
    if (pending.action === 'swap') {
      swapPositions(game, pending.attackerId, pending.defenderId);
      addLog(game, 'swap', { playerId: pending.attackerId, targetId: pending.defenderId }, 'success');
      return setPostAction(pending.attackerId, t('swap'));
    }
    return prepareMugReward(pending.attackerId, pending.defenderId);
  }
  setPostAction(pending.attackerId, t('fightResult'));
}

function prepareMugReward(attackerId, targetId) {
  const target = getPlayer(game, targetId);
  if (!target?.hand.length) return setPostAction(attackerId, t('noTargetCards'));
  game.pending = { type: 'mugReward', attackerId, targetId };
  const attacker = getPlayer(game, attackerId);
  passTo(attacker.id, attacker.name, t('chooseMugReward'));
}

function takeMugReward(cardUid = null) {
  const pending = game.pending;
  const attacker = getPlayer(game, pending.attackerId);
  const target = getPlayer(game, pending.targetId);
  const card = cardUid ? moveCard(game, target.id, attacker.id, cardUid) : takeRandomHidden(game, target.id, attacker.id);
  if (!card) return toast(t('noTargetCards'), 'danger');
  addLog(game, 'mug', { playerId: attacker.id, targetId: target.id, cardId: card.id }, 'success');
  setPostAction(attacker.id, `${t('mug')}: ${getCardText(card.id, settings.language)[0]}`);
}

function setPostAction(actorId, message, type = 'postAction') {
  game.pending = { type, actorId, message };
  const actor = getPlayer(game, actorId);
  passTo(actor.id, actor.name, message);
}

function finishPostAction() {
  const pending = game.pending;
  if (pending.type === 'tradeComplete') {
    game.pending = null;
    game.currentPlayerId = pending.actorId;
    renderGame();
  } else {
    advanceAction();
  }
}

function beginTrade() {
  const actor = getPlayer(game, game.currentPlayerId);
  if (!actor?.hand.length) return toast(t('noCards'), 'danger');
  const targets = activePlayers(game).filter((player) => player.id !== actor.id);
  if (!targets.length) return;
  openPlayerPicker(t('trade'), targets, (targetId) => chooseTradeOffer(actor.id, targetId));
}

function chooseTradeOffer(fromId, targetId) {
  const from = getPlayer(game, fromId);
  const html = `<p class="modal-copy">${t('tradeOffer')}</p><div class="modal-card-grid">${from.hand.map((card) => cardMarkup(card, { selectable: true, hiddenAllowed: false, control: `data-trade-offer="${card.uid}"` })).join('')}</div>`;
  openModal(t('trade'), html, [{ label: t('cancel'), className: 'button--ghost' }]);
  modalContent.querySelectorAll('[data-trade-offer]').forEach((card) => card.addEventListener('click', () => {
    closeModal();
    pushHistory();
    game.pending = { type: 'tradeReturn', fromId, targetId, offerUid: card.dataset.tradeOffer };
    const target = getPlayer(game, targetId);
    passTo(target.id, target.name, t('trade'));
  }));
}

function finishTrade(returnUid) {
  const pending = game.pending;
  if (returnUid === 'decline') return setPostAction(pending.fromId, t('decline'), 'tradeComplete');
  const from = getPlayer(game, pending.fromId);
  const target = getPlayer(game, pending.targetId);
  const offered = from.hand.find((card) => card.uid === pending.offerUid);
  const returned = returnUid !== 'gift' ? target.hand.find((card) => card.uid === returnUid) : null;
  if (!offered || (returnUid !== 'gift' && !returned)) return;
  moveCard(game, from.id, target.id, offered.uid);
  if (returned) moveCard(game, target.id, from.id, returned.uid);
  addLog(game, 'trade', { playerId: from.id, targetId: target.id }, 'success');
  setPostAction(from.id, t('completeTrade'), 'tradeComplete');
}

function startNavigation() {
  game.phase = 'navigation';
  game.pending = null;
  const active = activePlayers(game);
  const navigator = active[active.length - 1] || null;
  let cards = [];
  if (game.rowStack.length) {
    cards = game.rowStack.splice(0);
  } else if (game.navigation.length) {
    cards.push(game.navigation.pop());
  }
  if (!cards.length) return finishDay();
  const compass = navigator?.hand.some((card) => card.id === 'compass' && card.revealed);
  if (compass && game.navigation.length) cards.push(game.navigation.pop());
  if (cards.length === 1 || !navigator) return resolveNavigation(cards[0]);
  game.pending = { type: 'navChoose', cards, navigatorId: navigator.id };
  passTo(navigator.id, navigator.name, t('navigation'));
}

function chooseNavigationCard(cardUid) {
  const pending = game.pending;
  const chosen = pending.cards.find((card) => card.uid === cardUid);
  if (!chosen) return;
  pushHistory();
  putOnBottom(game.navigation, pending.cards.filter((card) => card.uid !== cardUid));
  resolveNavigation(chosen);
}

function resolveNavigation(card) {
  pushHistory();
  game.birds = Math.max(0, game.birds + (card.bird || 0));
  if (card.bird) addLog(game, 'bird', { birds: game.birds }, card.bird > 0 ? 'success' : 'danger');
  putOnBottom(game.navigation, [card]);
  if (game.birds >= 4) return finishGame();
  const targets = navigationTargets(game, card);
  const candidates = activePlayers(game)
    .filter((player) => player.hand.some((item) => item.id === 'life' || item.id === 'chum'))
    .map((player) => player.id);
  if (targets.length && candidates.length) {
    game.pending = { type: 'overboardPrep', card, targetIds: targets.map((player) => player.id), candidates, index: 0, sharks: 0 };
    const first = getPlayer(game, candidates[0]);
    return passTo(first.id, first.name, t('overboardPrep'));
  }
  completeNavigationEffects(card, 0);
}

function completeNavigationEffects(card, sharks = 0) {
  const outcomes = resolveOverboard(game, card, { sharks });
  outcomes.forEach((outcome) => {
    if (outcome.lost) addLog(game, 'lost', { playerId: outcome.playerId }, 'danger');
    else if (outcome.died) addLog(game, 'died', { playerId: outcome.playerId }, 'danger');
  });
  const queue = buildThirstQueue(game, card);
  game.pending = { type: 'navResult', card, outcomes, queue };
  const navigator = activePlayers(game).at(-1) || boatPlayers(game)[0] || game.players[0];
  game.currentPlayerId = navigator.id;
  showScreen('game', { remember: false });
}

function handleOverboardPrep(action) {
  const pending = game.pending;
  if (!pending || pending.type !== 'overboardPrep') return;
  const helper = getPlayer(game, pending.candidates[pending.index]);
  if (!helper) return completeNavigationEffects(pending.card, pending.sharks);

  if (action === 'chum') {
    const chum = helper.hand.find((card) => card.id === 'chum');
    if (!chum) return;
    discardCard(game, helper.id, chum.uid);
    pending.sharks += 1;
    addLog(game, 'chum', { playerId: helper.id }, 'danger');
    renderGame();
    return;
  }

  if (action === 'life') {
    const life = helper.hand.find((card) => card.id === 'life');
    if (!life) return;
    const targets = pending.targetIds.map((id) => getPlayer(game, id)).filter((target) => target?.alive && !target.hand.some((card) => card.id === 'life' && card.revealed));
    if (!targets.length) return renderGame();
    return openPlayerPicker(t('throwPreserver'), targets, (targetId) => {
      const card = moveCard(game, helper.id, targetId, life.uid);
      if (card) {
        card.revealed = true;
        addLog(game, 'life', { playerId: helper.id, targetId }, 'success');
      }
      renderGame();
    });
  }

  pending.index += 1;
  if (pending.index >= pending.candidates.length) return completeNavigationEffects(pending.card, pending.sharks);
  const next = getPlayer(game, pending.candidates[pending.index]);
  passTo(next.id, next.name, t('overboardPrep'));
}

function continueNavigation() {
  const pending = game.pending;
  if (!pending.queue.length) return finishDay();
  const next = pending.queue.find((task) => {
    const player = getPlayer(game, task.playerId);
    return player?.alive && player.inBoat;
  });
  if (!next) return finishDay();
  game.pending = { type: 'thirst', card: pending.card, outcomes: pending.outcomes, queue: pending.queue, index: pending.queue.indexOf(next) };
  const player = getPlayer(game, next.playerId);
  passTo(player.id, player.name, t('thirst'));
}

function handleThirst(choice) {
  const pending = game.pending;
  const task = pending.queue[pending.index];
  const result = resolveThirst(game, task, choice);
  const player = getPlayer(game, task.playerId);
  if (result.invalid) return;
  if (result.water) addLog(game, 'water', { playerId: player.id }, 'success');
  if (result.parasol) addLog(game, 'parasol', { playerId: player.id }, 'success');
  if (result.wound) {
    addLog(game, 'wound', { playerId: player.id }, 'danger');
    if (result.died) addLog(game, 'died', { playerId: player.id }, 'danger');
    else if (result.becameUnconscious) addLog(game, 'unconscious', { playerId: player.id }, 'danger');
  }
  let index = pending.index + 1;
  while (index < pending.queue.length) {
    const next = getPlayer(game, pending.queue[index].playerId);
    if (next?.alive && next.inBoat) break;
    index += 1;
  }
  if (index >= pending.queue.length) return finishDay();
  pending.index = index;
  const next = getPlayer(game, pending.queue[index].playerId);
  passTo(next.id, next.name, t('thirst'));
}

function finishDay() {
  resetDayMarkers(game);
  game.day += 1;
  addLog(game, 'day', { day: game.day }, 'accent');
  game.pending = null;
  startQuartermaster();
}

function handleHandAction(action, cardUid) {
  const player = getPlayer(game, game.currentPlayerId);
  const card = player?.hand.find((item) => item.uid === cardUid);
  if (!player || !card) return;
  if (action === 'reveal') {
    pushHistory();
    const revealed = revealCard(game, player.id, card.uid);
    if (!revealed) return;
    addLog(game, 'reveal', { playerId: player.id, cardId: card.id }, 'success');
    renderGame();
    return;
  }
  if (action === 'special') useSpecialCard(player, card);
}

function useSpecialCard(player, card) {
  if (game.phase !== 'actions' || game.pending || game.currentPlayerId !== player.id) return;
  if (card.id === 'parasol') {
    pushHistory();
    card.revealed = true;
    addLog(game, 'parasol', { playerId: player.id }, 'success');
    return setPostAction(player.id, t('parasolOpened'));
  }
  if (card.id === 'flare') {
    pushHistory();
    discardCard(game, player.id, card.uid);
    const revealed = [];
    while (revealed.length < 3 && game.navigation.length) revealed.push(game.navigation.pop());
    const birds = revealed.reduce((sum, navigationCard) => sum + (navigationCard.bird || 0), 0);
    game.birds = Math.max(0, game.birds + birds);
    putOnBottom(game.navigation, revealed);
    addLog(game, 'flare', { playerId: player.id, birds, total: game.birds }, birds >= 0 ? 'success' : 'danger');
    if (game.birds >= 4) return finishGame();
    return setPostAction(player.id, `${t('flareUsed')} ${birds >= 0 ? '+' : ''}${birds} · ${game.birds}/4`);
  }
  if (card.id === 'medkit') {
    const targets = boatPlayers(game).filter((target) => target.alive && target.wounds > 0);
    if (!targets.length) return toast(t('healWhom'), 'danger');
    openPlayerPicker(t('healWhom'), targets, (targetId) => {
      pushHistory();
      const target = getPlayer(game, targetId);
      if (healPlayer(target)) {
        discardCard(game, player.id, card.uid);
        addLog(game, 'heal', { playerId: player.id, targetId }, 'success');
        setPostAction(player.id, t('specialAction'));
      }
    });
  }
}

function finishGame() {
  game.status = 'finished';
  game.phase = 'score';
  game.pending = null;
  passState = null;
  game.scores = scoreGame(game);
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  showScreen('score', { remember: false });
  feedback('success');
}

function breakdownText(item) {
  if (item.code === 'card') return `${getCardText(item.cardId, settings.language)[0]} +${item.value}`;
  const labels = {
    survival: t('survived'), narcissist: settings.language === 'ru' ? 'Самовлюблённый' : 'Narcissist', love: t('friend'), hate: t('enemy'), psychopath: settings.language === 'ru' ? 'Психопат' : 'Psychopath',
  };
  return `${labels[item.code] || item.code} +${item.value}`;
}

function renderScore() {
  if (!game) return;
  game.scores ||= scoreGame(game);
  const reveal = document.getElementById('secrets-reveal');
  reveal.innerHTML = `<h3>${t('secrets')}</h3>${game.players.map((player) => {
    const loved = getPlayerByCharacter(game, player.lovedCharacterId);
    const hated = getPlayerByCharacter(game, player.hatedCharacterId);
    return `<p><strong>${escapeHtml(player.name)}</strong> · ${iconMarkup('heart', 'ui-icon--sm')} ${escapeHtml(loved?.name || '—')} · ${iconMarkup('skull', 'ui-icon--sm')} ${escapeHtml(hated?.name || '—')}</p>`;
  }).join('')}`;
  document.getElementById('score-list').innerHTML = game.scores.map((score, index) => {
    const player = getPlayer(game, score.playerId);
    return `<article class="score-entry surface"><div class="score-entry__rank">${['Ⅰ','Ⅱ','Ⅲ'][index] || index + 1}</div><div><h3>${escapeHtml(player.name)}</h3><p>${score.breakdown.map(breakdownText).join(' · ') || '—'}</p></div><div class="score-entry__points">${score.score}</div></article>`;
  }).join('');
}

function renderRules() {
  const rules = [
    ['compass', 'rulesGoalTitle', 'rulesGoal'], ['sun', 'rulesRoundTitle', 'rulesRound'], ['swords', 'rulesFightTitle', 'rulesFight'], ['cards', 'rulesCardsTitle', 'rulesCards'], ['shield', 'rulesStatusTitle', 'rulesStatus'], ['droplet', 'rulesThirstTitle', 'rulesThirst'], ['waves', 'rulesOverboardTitle', 'rulesOverboard'], ['trophy', 'rulesScoringTitle', 'rulesScoring'],
  ];
  document.getElementById('rules-grid').innerHTML = rules.map(([icon, title, copy]) => `<article class="rule-card surface"><span aria-hidden="true">${iconMarkup(icon, 'ui-icon--lg')}</span><h3>${t(title)}</h3><p>${t(copy)}</p></article>`).join('');
  document.getElementById('quick-reference').innerHTML = `<h3>${t('rulesRoundTitle')}</h3><ol><li><strong>1 · ${t('quartermaster')}</strong><br>${settings.language === 'ru' ? 'Взять карту и передать остальные к корме.' : 'Take one card and pass the rest toward the stern.'}</li><li><strong>2 · ${t('actions')}</strong><br>${settings.language === 'ru' ? 'По одному действию от носа к корме.' : 'One action each from bow to stern.'}</li><li><strong>3 · ${t('navigation')}</strong><br>${settings.language === 'ru' ? 'Птицы → за бортом → жажда.' : 'Birds → overboard → thirst.'}</li></ol>`;
}

function renderTutorial() {
  const steps = [
    ['users', t('players'), t('tutorialIntro')], ['layers', t('quartermaster'), t('tutorialDraft')], ['anchor', t('actions'), t('tutorialAction')], ['swords', t('fight'), t('tutorialFight')], ['compass', t('navigation'), t('tutorialNav')], ['trophy', t('score'), t('tutorialScore')],
  ];
  const [icon, title, copy] = steps[tutorialStep];
  document.getElementById('tutorial-stage').innerHTML = `<div class="tutorial-stage__visual" aria-hidden="true">${iconMarkup(icon, 'ui-icon--xl')}</div><h3>${title}</h3><p>${copy}</p>`;
  document.getElementById('tutorial-dots').innerHTML = steps.map((_, index) => `<i class="${index === tutorialStep ? 'active' : ''}"></i>`).join('');
  document.getElementById('tutorial-prev').disabled = tutorialStep === 0;
  document.getElementById('tutorial-next').textContent = tutorialStep === steps.length - 1 ? t('finish') : t('next');
}

function exportSave() {
  if (!game) return;
  const blob = new Blob([JSON.stringify({ version: game.version, game, passState }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lifeboat-day-${game.day}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importSave(file) {
  try {
    const envelope = JSON.parse(await file.text());
    game = hydrateGame(envelope.game);
    passState = envelope.passState || null;
    history = [];
    autosave();
    showScreen(passState ? 'pass' : 'game', { remember: false });
    if (passState) renderPass();
    toast(t('copied'), 'success');
  } catch { toast(t('invalidSave'), 'danger'); }
}

function openSaveMenu() {
  openModal('Lifeboat', `<p class="modal-copy">${t('save')}</p>`, [
    { label: t('exportSave'), onClick: exportSave },
    { label: t('importSave'), onClick: () => document.getElementById('import-input').click() },
    { label: t('newGame'), className: 'button--danger', onClick: () => startFreshGame(true) },
    { label: t('close'), className: 'button--ghost' },
  ]);
}

function startFreshGame(force = false) {
  const proceed = () => {
    game = null; passState = null; history = []; clearSavedGame(); showScreen('setup', { remember: false });
  };
  if (game && game.status === 'active' && !force) confirmModal(t('newGame'), t('confirmRestart'), proceed, true); else proceed();
}

async function updateWakeLock() {
  if (currentScreen === 'game' || currentScreen === 'pass') {
    try { wakeLock ||= await navigator.wakeLock?.request('screen'); } catch { /* unsupported or denied */ }
  } else if (wakeLock) {
    try { await wakeLock.release(); } catch { /* already released */ }
    wakeLock = null;
  }
}

document.addEventListener('click', (event) => {
  const openScreenButton = event.target.closest('[data-open-screen]');
  if (openScreenButton) {
    const destination = openScreenButton.dataset.openScreen;
    if (destination === 'setup' && game?.status === 'active') return startFreshGame();
    showScreen(destination);
    return;
  }

  const countButton = event.target.closest('[data-player-count]');
  if (countButton) {
    setupCount = Number(countButton.dataset.playerCount);
    setupCharacters = setupCharacters.slice(0, setupCount);
    renderSetup();
    return;
  }

  const themeChoice = event.target.closest('[data-theme-choice]');
  if (themeChoice) return setSetting('theme', themeChoice.dataset.themeChoice);
  const languageChoice = event.target.closest('[data-language-choice]');
  if (languageChoice) return setSetting('language', languageChoice.dataset.languageChoice);

  const action = event.target.closest('[data-game-action]');
  if (action) return handleGameAction(action.dataset.gameAction);
  const draftCard = event.target.closest('[data-draft-card]');
  if (draftCard) return pickDraftCard(draftCard.dataset.draftCard);
  const rowCard = event.target.closest('[data-row-card]');
  if (rowCard) return toggleRowCard(rowCard.dataset.rowCard);
  const response = event.target.closest('[data-response]');
  if (response) return handleResponse(response.dataset.response);
  const support = event.target.closest('[data-fight-support]');
  if (support) return chooseFightSupport(support.dataset.fightSupport);
  const mugCard = event.target.closest('[data-mug-card]');
  if (mugCard) return takeMugReward(mugCard.dataset.mugCard);
  if (event.target.closest('[data-mug-hidden]')) return takeMugReward();
  const tradeReturn = event.target.closest('[data-trade-return]');
  if (tradeReturn) return finishTrade(tradeReturn.dataset.tradeReturn);
  const navCard = event.target.closest('[data-nav-card]');
  if (navCard) return chooseNavigationCard(navCard.dataset.navCard);
  const overboardPrep = event.target.closest('[data-overboard-prep]');
  if (overboardPrep) return handleOverboardPrep(overboardPrep.dataset.overboardPrep);
  const thirstChoice = event.target.closest('[data-thirst-choice]');
  if (thirstChoice) return handleThirst(thirstChoice.dataset.thirstChoice);
  const handAction = event.target.closest('[data-hand-action]');
  if (handAction) return handleHandAction(handAction.dataset.handAction, handAction.dataset.cardUid);

  const pendingAction = event.target.closest('[data-pending-action]')?.dataset.pendingAction;
  if (pendingAction === 'cancel-row') return undo();
  if (pendingAction === 'confirm-row') return finishRow(true);
  if (pendingAction === 'continue-fight') return continueAfterFight();
  if (pendingAction === 'finish-post') return finishPostAction();
  if (pendingAction === 'continue-navigation') return continueNavigation();
});

document.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[role="button"][tabindex="0"]')) {
    event.preventDefault();
    event.target.click();
  }
  if (!modal.hidden && event.key === 'Escape') closeModal();
  if (!modal.hidden && event.key === 'Tab') {
    const focusable = [...modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), [tabindex="0"]')].filter((element) => !element.hidden);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

document.querySelectorAll('[data-close-modal]').forEach((element) => element.addEventListener('click', closeModal));
document.getElementById('theme-button').addEventListener('click', () => setSetting('theme', settings.theme === 'dark' ? 'light' : 'dark'));
document.getElementById('language-button').addEventListener('click', () => setSetting('language', settings.language === 'ru' ? 'en' : 'ru'));
document.getElementById('sound-button').addEventListener('click', () => setSetting('sound', !settings.sound));
document.getElementById('home-button').addEventListener('click', () => showScreen('title'));
document.getElementById('continue-button').addEventListener('click', restoreSavedGame);
document.getElementById('discard-save-button').addEventListener('click', () => confirmModal(t('discardSave'), t('confirmRestart'), clearSavedGame, true));
document.getElementById('randomize-button').addEventListener('click', randomizeCharacters);
document.getElementById('setup-form').addEventListener('submit', (event) => { event.preventDefault(); startNewGameFromSetup(); });
document.getElementById('setup-list').addEventListener('change', (event) => {
  const select = event.target.closest('[data-character-index]');
  if (!select) return;
  setupCharacters[Number(select.dataset.characterIndex)] = select.value;
  renderSetup();
});
document.getElementById('pass-ready-button').addEventListener('click', acceptPass);
document.getElementById('trade-button').addEventListener('click', beginTrade);
document.getElementById('undo-button').addEventListener('click', () => confirmModal(t('undo'), t('undo'), undo));
document.getElementById('save-menu-button').addEventListener('click', openSaveMenu);
document.getElementById('toggle-log-button').addEventListener('click', (event) => {
  const panel = document.querySelector('.log-panel');
  panel.classList.toggle('collapsed');
  event.currentTarget.setAttribute('aria-expanded', String(!panel.classList.contains('collapsed')));
  event.currentTarget.textContent = panel.classList.contains('collapsed') ? '+' : '−';
});
document.getElementById('rules-back-button').addEventListener('click', () => showScreen(previousScreen === 'pass' ? 'game' : previousScreen, { remember: false }));
document.getElementById('tutorial-prev').addEventListener('click', () => { tutorialStep = Math.max(0, tutorialStep - 1); renderTutorial(); });
document.getElementById('tutorial-next').addEventListener('click', () => {
  if (tutorialStep >= 3) { tutorialStep = 0; showScreen('title', { remember: false }); }
  else { tutorialStep += 1; renderTutorial(); }
});
document.getElementById('score-new-game-button').addEventListener('click', () => startFreshGame(true));
document.getElementById('setting-sound').addEventListener('change', (event) => setSetting('sound', event.target.checked));
document.getElementById('setting-vibration').addEventListener('change', (event) => setSetting('vibration', event.target.checked));
document.getElementById('setting-motion').addEventListener('change', (event) => setSetting('motion', event.target.checked));
document.getElementById('setting-large-text').addEventListener('change', (event) => setSetting('largeText', event.target.checked));
document.getElementById('import-input').addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (file) importSave(file);
  event.target.value = '';
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  document.getElementById('install-button').hidden = false;
});
document.getElementById('install-button').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById('install-button').hidden = true;
});
window.addEventListener('beforeunload', (event) => {
  if (game?.status === 'active') { event.preventDefault(); event.returnValue = ''; }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updateWakeLock(); });

function startOcean() {
  const canvas = document.getElementById('ocean');
  const context = canvas.getContext('2d');
  let frame = 0;
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * ratio);
    canvas.height = Math.round(innerHeight * ratio);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function draw() {
    context.clearRect(0, 0, innerWidth, innerHeight);
    const dark = settings.theme === 'dark';
    for (let index = 0; index < 5; index += 1) {
      context.beginPath();
      const y = innerHeight * (.55 + index * .1);
      context.moveTo(0, y);
      for (let x = 0; x <= innerWidth + 30; x += 30) {
        const wave = Math.sin((x * .012) + (frame * .006) + index) * (7 + index * 2);
        context.lineTo(x, y + wave);
      }
      context.lineTo(innerWidth, innerHeight);
      context.lineTo(0, innerHeight);
      context.closePath();
      context.fillStyle = dark ? `rgba(13, ${45 + index * 8}, ${61 + index * 11}, ${.11 + index * .025})` : `rgba(72, ${135 + index * 7}, ${144 + index * 6}, ${.08 + index * .02})`;
      context.fill();
    }
    frame += settings.motion ? 1 : 0;
    requestAnimationFrame(draw);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });
  draw();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

applySettings();
startOcean();
showScreen('title', { remember: false });
