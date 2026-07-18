const dictionaries = {
  ru: {
    appName: 'Lifeboat', subtitle: 'За бортом', cardGame: 'Карточная игра о выживании и предательстве',
    titleLead: 'Шлюпка. Шесть характеров. Один берег — и слишком мало доверия.',
    passPlay: 'Локальная партия', continue: 'Продолжить партию', newGame: 'Новая партия', rules: 'Правила', tutorial: 'Обучение', settings: 'Настройки',
    players: 'Игроки', playerCount: 'Количество игроков', playerName: 'Имя игрока', character: 'Персонаж', randomize: 'Перемешать персонажей', setSail: 'Отчалить', back: 'Назад',
    day: 'День', birds: 'Птицы', phase: 'Фаза', quartermaster: 'Квартирмейстер', actions: 'Действия', navigation: 'Навигация',
    passPhone: 'Передай телефон', ready: 'Я готов', privateScreen: 'Этот экран видит только текущий игрок',
    hand: 'Карты на руке', reveal: 'Открыть', hidden: 'Закрытая', open: 'Открытая', permanent: 'Постоянная', noCards: 'Нет карт',
    rest: 'Ничего', restHint: 'Спокойно сидеть', row: 'Грести', rowHint: 'Посмотреть две карты навигации', swap: 'Пересесть', swapHint: 'Поменяться местами', mug: 'Ограбить', mugHint: 'Забрать припас', trade: 'Обмен', tradeHint: 'Не тратит действие',
    chooseAction: 'Выбери действие', choosePlayer: 'Выбери игрока', chooseCard: 'Выбери карту', confirm: 'Подтвердить', cancel: 'Отмена', decline: 'Отказаться', accept: 'Согласиться', fight: 'Драться', fightPrepare: 'Подготовься к драке', fightPrepareHint: 'Сейчас можно открыть оружие из руки. Затем передай телефон остальным.', fightReady: 'К драке готов', neutral: 'Не вмешиваться', supportAttacker: 'За нападающего', supportDefender: 'За защитника',
    useWater: 'Выпить воду', takeWound: 'Получить рану', useParasol: 'Укрыться зонтиком', thirst: 'Жажда', overboard: 'За бортом',
    thirstNamed: 'Указан на карте', thirstRow: 'За греблю', thirstFight: 'За участие в драке', everyone: 'Все в лодке',
    overboardPrep: 'Помощь перед падением', throwPreserver: 'Бросить спасательный круг', throwChum: 'Выбросить приманку', keepCards: 'Ничего не играть', sharksAttack: 'Акулы атакуют всех в воде', lifeThrown: 'Спасательный круг передан',
    score: 'Итоги путешествия', survived: 'Выжил', friend: 'Любимый', enemy: 'Враг', treasures: 'Сокровища', points: 'очков', secrets: 'Секреты раскрыты',
    save: 'Сохранено', restore: 'Восстановить', discardSave: 'Удалить сохранение', undo: 'Отменить последнее действие', exportSave: 'Экспорт сохранения', importSave: 'Импорт сохранения',
    sound: 'Звук', audio: 'Звук и музыка', music: 'Фоновая мелодия', musicHint: 'Тихая музыка после первого касания', vibration: 'Вибрация', theme: 'Тема', language: 'Язык', dark: 'Ночная', light: 'Дневная', motion: 'Анимации', textSize: 'Крупный текст', home: 'Главное меню', changeTheme: 'Сменить тему', more: 'Ещё', toggleLog: 'Свернуть или раскрыть журнал',
    install: 'Установить игру', offlineReady: 'Игра готова к работе без сети',
    rulesGoalTitle: 'Цель', rulesGoal: 'Дожить до четвёртой птицы и набрать больше очков: за собственное выживание, сокровища, выжившего любимого и погибшего врага.',
    rulesRoundTitle: 'Раунд', rulesRound: 'Каждый день состоит из раздачи квартирмейстера, одного действия каждого сознательного персонажа и навигации. Порядок действий фиксируется в начале фазы.',
    rulesFightTitle: 'Бой', rulesFight: 'Жертва ограбления или пересадки может начать бой. Остальные сознательные персонажи выбирают сторону. Силы складываются; защитник выигрывает ничью, а все на проигравшей стороне получают рану.',
    rulesThirstTitle: 'Жажда', rulesThirst: 'Персонаж может испытать до трёх жажд: по имени на карте, за греблю и за участие в бою. За каждую нужна отдельная вода или рана.',
    rulesOverboardTitle: 'За бортом', rulesOverboard: 'Открытые карты теряются, кроме спасательного круга. Круг можно бросить другому. Французик не получает обычную рану. Сыгранная приманка наносит всем в воде дополнительную рану; бессознательный без круга погибает.',
    rulesScoringTitle: 'Подсчёт', rulesScoring: 'Мёртвый в лодке всё ещё считает сокровища и тайные цели. Унесённый волнами теряет карты. Самовлюблённый и Психопат считаются по особым правилам; самоцветы дают 1/4/8 очков за комплект из 1/2/3 карт.',
    rulesCardsTitle: 'Карты и обмен', rulesCards: 'Сознательный персонаж может открыть карту в любой момент, но зонтик, аптечка и особый эффект ракетницы требуют действия. Во время действий можно свободно обмениваться, кроме драки. Открытые оружия усиливают только владельца; ракетница после боя сбрасывается. Весло даёт дополнительную карту при гребле, а компас можно открыть перед выбором навигации, чтобы добавить карту.',
    rulesStatusTitle: 'Раны и смерть', rulesStatus: 'При числе ран, равном Размеру, персонаж без сознания; при большем числе — мёртв. Он не действует и не дерётся, но тело в лодке сохраняет добычу. Падение мёртвого тела за борт удаляет его и все карты.',
    tutorialIntro: 'В каждой партии у тебя есть персонаж, тайный любимый и тайный враг.', tutorialDraft: 'На раздаче бери одну закрытую карту и передавай оставшиеся дальше по лодке.', tutorialAction: 'В свой ход можно грести, пересесть, ограбить, использовать особую карту или ничего не делать.', tutorialFight: 'Отказ от ограбления или пересадки начинает драку. Участники могут открыть оружие, остальные выбирают сторону, а защитник выигрывает ничью.', tutorialNav: 'На корме выбирают карту из стопки гребли. Затем считаются птицы, падения за борт и каждая отдельная жажда.', tutorialScore: 'После четвёртой птицы сложи выживание, любовь, гибель врага и сокровища. Даже погибший в лодке может победить.',
    close: 'Закрыть', next: 'Далее', finish: 'Готово', shipLog: 'Судовой журнал', boat: 'Порядок в лодке',
    statusAlive: 'В лодке', statusUnconscious: 'Без сознания', statusDead: 'Мёртв', statusLost: 'Унесён волнами', wounds: 'Раны', strength: 'Сила', survivalValue: 'Выживание',
    rowInstruction: 'Отметь карты, которые пойдут в стопку гребли. Остальные уйдут под колоду.', navInstruction: 'Выбери одну карту для навигации. Остальные уйдут под колоду.',
    tradeOffer: 'Что предложить?', tradeReturn: 'Выбери встречную карту или прими подарок', gift: 'Без встречной карты', completeTrade: 'Обмен завершён',
    confirmRestart: 'Начать новую партию? Текущее сохранение будет заменено.', invalidSave: 'Файл сохранения повреждён или несовместим.', copied: 'Сохранение загружено.',
    namesRequired: 'Введите имена всех игроков.', uniqueCharacters: 'У каждого игрока должен быть свой персонаж.',
    winner: 'Победитель', tie: 'Ничья', attacker: 'Нападающий', defender: 'Защитник', fightResult: 'Результат боя',
    chooseMugReward: 'Возьми открытую карту или случайную закрытую', kidMugChoice: 'Малыш может без драки взять случайную закрытую карту или попытаться забрать открытую.', randomHidden: 'Случайная закрытая', noTargetCards: 'У цели нет карт.',
    specialAction: 'Особое действие', healWhom: 'Кого лечить?', flareUsed: 'Ракетница проверяет птиц на трёх верхних картах навигации.', parasolOpened: 'Зонтик открыт и защищает от одной жажды за день.',
    useCompass: 'Открыть компас и добавить карту',
    resumePrompt: 'На этом устройстве есть незавершённая партия.',
    navCalm: 'Спокойная ночь', birdSeen: 'Птица на горизонте', birdLost: 'Туман сбил лодку с курса', land: 'Земля!',
    sourceNote: 'Фанатская цифровая адаптация настольной игры Jeff Siadek. Для публикации проверьте права на название и материалы.',
  },
  en: {
    appName: 'Lifeboat', subtitle: 'Adrift', cardGame: 'A card game of survival and betrayal',
    titleLead: 'One lifeboat. Six personalities. One shore — and far too little trust.',
    passPlay: 'Pass & Play', continue: 'Continue game', newGame: 'New game', rules: 'Rules', tutorial: 'Tutorial', settings: 'Settings',
    players: 'Players', playerCount: 'Number of players', playerName: 'Player name', character: 'Character', randomize: 'Shuffle characters', setSail: 'Set sail', back: 'Back',
    day: 'Day', birds: 'Birds', phase: 'Phase', quartermaster: 'Quartermaster', actions: 'Actions', navigation: 'Navigation',
    passPhone: 'Pass the phone', ready: "I'm ready", privateScreen: 'Only the current player should see this screen',
    hand: 'Your hand', reveal: 'Reveal', hidden: 'Hidden', open: 'Open', permanent: 'Permanent', noCards: 'No cards',
    rest: 'Do nothing', restHint: 'Sit calmly', row: 'Row', rowHint: 'Inspect two navigation cards', swap: 'Change seats', swapHint: 'Trade positions', mug: 'Mug', mugHint: 'Take a provision', trade: 'Trade', tradeHint: 'Does not spend the action',
    chooseAction: 'Choose an action', choosePlayer: 'Choose a player', chooseCard: 'Choose a card', confirm: 'Confirm', cancel: 'Cancel', decline: 'Decline', accept: 'Accept', fight: 'Fight', fightPrepare: 'Prepare for the fight', fightPrepareHint: 'You may reveal weapons from your hand now. Then pass the phone to the others.', fightReady: 'Ready to fight', neutral: 'Stay neutral', supportAttacker: 'Support attacker', supportDefender: 'Support defender',
    useWater: 'Drink water', takeWound: 'Take a wound', useParasol: 'Use parasol', thirst: 'Thirst', overboard: 'Overboard',
    thirstNamed: 'Named on the card', thirstRow: 'For rowing', thirstFight: 'For fighting', everyone: 'Everyone aboard',
    overboardPrep: 'Help before overboard', throwPreserver: 'Throw life preserver', throwChum: 'Throw bucket of chum', keepCards: 'Play nothing', sharksAttack: 'Sharks wound everyone in the water', lifeThrown: 'Life preserver transferred',
    score: 'Voyage results', survived: 'Survived', friend: 'Loved one', enemy: 'Enemy', treasures: 'Treasures', points: 'points', secrets: 'Secrets revealed',
    save: 'Saved', restore: 'Restore', discardSave: 'Delete save', undo: 'Undo last action', exportSave: 'Export save', importSave: 'Import save',
    sound: 'Sound', audio: 'Sound and music', music: 'Background music', musicHint: 'Quiet melody after the first tap', vibration: 'Vibration', theme: 'Theme', language: 'Language', dark: 'Night', light: 'Day', motion: 'Animations', textSize: 'Large text', home: 'Main menu', changeTheme: 'Change theme', more: 'More', toggleLog: 'Collapse or expand log',
    install: 'Install game', offlineReady: 'The game is ready offline',
    rulesGoalTitle: 'Goal', rulesGoal: 'Reach the fourth bird and score the most points from survival, treasures, your surviving loved one and your dead enemy.',
    rulesRoundTitle: 'Round', rulesRound: 'Each day has a quartermaster draft, one action for each conscious character, and navigation. Action order is fixed when the phase begins.',
    rulesFightTitle: 'Fights', rulesFight: 'A mugging or seat-change target may start a fight. Other conscious characters choose a side. Strength is added; defenders win ties and everyone on the losing side takes a wound.',
    rulesThirstTitle: 'Thirst', rulesThirst: 'A character may suffer up to three thirsts: by name, for rowing and for fighting. Each needs its own water or causes a wound.',
    rulesOverboardTitle: 'Overboard', rulesOverboard: 'Face-up cards are lost except a life preserver, which may be thrown to another character. Frenchy avoids the normal wound. Played chum wounds everyone in the water; an unconscious character without a preserver dies.',
    rulesScoringTitle: 'Scoring', rulesScoring: 'A corpse in the boat still scores treasure and secret goals. A body lost at sea loses its cards. Narcissist and Psychopath use special rules; one/two/three Jewel cards score 1/4/8 points.',
    rulesCardsTitle: 'Cards and trading', rulesCards: 'A conscious character may reveal a card at any time, but deploying a Parasol, using a Medical Kit, or firing a Flare as a special effect costs an action. Trade freely during Actions except during a fight. Revealed weapons support only their owner; a flare is discarded after fighting. An Oar adds a rowing card, and a Compass may be revealed before navigation to add a choice.',
    rulesStatusTitle: 'Wounds and death', rulesStatus: 'At wounds equal to Size a character is unconscious; above Size they are dead. They cannot act or fight, but a corpse in the boat keeps loot. A dead body sent overboard and all its cards are removed.',
    tutorialIntro: 'Every player has a character, a secret loved one and a secret enemy.', tutorialDraft: 'During the draft, choose one hidden card and pass the rest toward the stern.', tutorialAction: 'On your turn, row, change seats, mug, use a special card or do nothing.', tutorialFight: 'Refusing a mug or seat change starts a fight. Participants may reveal weapons, others choose sides, and the defender wins ties.', tutorialNav: 'The stern chooses from the row stack. Then resolve birds, overboard effects and every separate thirst.', tutorialScore: 'At the fourth bird, add survival, love, a dead enemy and treasure. Even a corpse in the boat can win.',
    close: 'Close', next: 'Next', finish: 'Done', shipLog: "Ship's log", boat: 'Boat order',
    statusAlive: 'In boat', statusUnconscious: 'Unconscious', statusDead: 'Dead', statusLost: 'Lost at sea', wounds: 'Wounds', strength: 'Strength', survivalValue: 'Survival',
    rowInstruction: 'Mark cards for the row stack. The rest go to the bottom of the deck.', navInstruction: 'Choose one navigation card. The rest go to the bottom of the deck.',
    tradeOffer: 'What do you offer?', tradeReturn: 'Choose a return card or accept the gift', gift: 'No return card', completeTrade: 'Trade completed',
    confirmRestart: 'Start a new game? The current save will be replaced.', invalidSave: 'The save file is damaged or incompatible.', copied: 'Save imported.',
    namesRequired: 'Enter every player name.', uniqueCharacters: 'Each player needs a unique character.',
    winner: 'Winner', tie: 'Tie', attacker: 'Attacker', defender: 'Defender', fightResult: 'Fight result',
    chooseMugReward: 'Take a face-up card or a random hidden one', kidMugChoice: 'The Kid may take a random hidden card without a fight or try to steal a face-up card.', randomHidden: 'Random hidden card', noTargetCards: 'The target has no cards.',
    specialAction: 'Special action', healWhom: 'Who gets healed?', flareUsed: 'The flare checks birds on the top three navigation cards.', parasolOpened: 'The parasol protects from one thirst each day.',
    useCompass: 'Reveal Compass and add a card',
    resumePrompt: 'An unfinished game is saved on this device.',
    navCalm: 'Calm night', birdSeen: 'A bird on the horizon', birdLost: 'Fog pushes the boat off course', land: 'Land!',
    sourceNote: 'Fan-made digital adaptation of Jeff Siadek’s board game. Verify rights to the name and materials before publication.',
  },
};

const characterText = {
  ru: {
    lauren: ['Леди Лорен', 'Светская дама', 'Самоцветы приносят двойные очки'], stephen: ['Сэр Стефан', 'Джентльмен', 'Картины приносят двойные очки'], captain: ['Капитан', 'Морской волк', 'Деньги приносят двойные очки'], mate: ['Боцман', 'Сильнейший в лодке', 'Размер 8 — опасный противник'], frenchy: ['Французик', 'Хороший пловец', 'Не получает обычную рану за бортом'], kid: ['Малыш', 'Тихий вор', 'Крадёт закрытую карту без боя'],
  },
  en: {
    lauren: ['Lady Lauren', 'Society lady', 'Jewels score double'], stephen: ['Sir Stephen', 'Gentleman', 'Paintings score double'], captain: ['Captain', 'Old sea dog', 'Cash scores double'], mate: ['First Mate', 'Strongest aboard', 'Size 8 makes a fearsome fighter'], frenchy: ['Frenchy', 'Strong swimmer', 'Avoids the normal overboard wound'], kid: ['Kid', 'Quiet thief', 'Steals a hidden card without a fight'],
  },
};

const cardText = {
  ru: {
    water: ['Вода', 'Утоляет одну жажду'], cash: ['Деньги', '+1 очко'], jewels: ['Самоцветы', 'Комплект: 1/4/8 очков'], painting: ['Картина', '+3 очка'], flare: ['Ракетница', '+8 силы или проверить 3 карты навигации'], oar: ['Весло', '+1 сила и +1 карта при гребле'], blackjack: ['Дубинка', '+2 силы'], knife: ['Нож', '+3 силы'], hook: ['Багор', '+4 силы'], parasol: ['Зонтик', 'Защита от одной жажды за день'], life: ['Спасательный круг', 'Защищает за бортом; можно бросить другому'], medkit: ['Аптечка', 'Лечит одну рану'], compass: ['Компас', 'Дополнительная карта навигации'], chum: ['Ведро приманки', 'Акулы ранят всех персонажей в воде'],
  },
  en: {
    water: ['Water', 'Cancels one thirst'], cash: ['Cash', '+1 point'], jewels: ['Jewels', 'Set scores 1/4/8 points'], painting: ['Painting', '+3 points'], flare: ['Flare gun', '+8 strength or check 3 navigation cards'], oar: ['Oar', '+1 strength and +1 rowing card'], blackjack: ['Blackjack', '+2 strength'], knife: ['Knife', '+3 strength'], hook: ['Gaffing hook', '+4 strength'], parasol: ['Parasol', 'Blocks one thirst per day'], life: ['Life preserver', 'Protects overboard; may be thrown'], medkit: ['Medical kit', 'Heals one wound'], compass: ['Compass', 'Extra navigation choice'], chum: ['Bucket of chum', 'Sharks wound everyone in the water'],
  },
};

export function createTranslator(language = 'ru') {
  const locale = dictionaries[language] ? language : 'ru';
  return (key, params = {}) => {
    let value = dictionaries[locale][key] ?? dictionaries.ru[key] ?? key;
    Object.entries(params).forEach(([name, replacement]) => {
      value = String(value).replaceAll(`{${name}}`, String(replacement));
    });
    return value;
  };
}

export function getCharacterText(id, language = 'ru') {
  return (characterText[language] || characterText.ru)[id] || characterText.ru[id];
}

export function getCardText(id, language = 'ru') {
  return (cardText[language] || cardText.ru)[id] || cardText.ru[id] || [id, ''];
}

export function getDictionary(language = 'ru') {
  return dictionaries[language] || dictionaries.ru;
}
