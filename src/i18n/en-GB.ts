/**
 * English (en-GB) copy for every player-facing screen. Components read words from here
 * through `t` in `@/i18n`, never from inline JSX text, so a second language is one new
 * file that satisfies the `Messages` type (see src/i18n/index.ts).
 *
 * Conventions
 * - Grouped by area, then screen, then item (`area.screen.item`, docs/00-foundation/RULES.md).
 * - Text that takes values is a small typed function, e.g. `questionOf(3, 10)`. No template
 *   engine and no runtime dependency.
 * - Punctuation is part of the copy: curly and straight apostrophes are kept exactly as
 *   they were in the components, because tests assert the exact words.
 *
 * Deliberate exceptions (still inline, by design)
 * - The body prose of /privacy and /terms (src/pages/PrivacyPage.tsx, TermsPage.tsx). It is
 *   a legal notice whose sentences interleave links, lists and site facts, so it stays as
 *   structured JSX. Its meta, title, lead and every section heading live here. A
 *   translation of those pages is a translated copy of the two page files.
 * - Staff screens (src/pages/admin*) are not covered by this catalogue.
 * - Site facts in src/lib/site.ts (controller name, policy date, contact address) are data,
 *   not copy.
 * - Quiz content (titles, questions, explanations, category names) comes from the API.
 */
export const enGB = {
  locale: 'en-GB',

  common: {
    siteName: 'Do You Know',
    loading: 'Loading…',
    tryAgain: 'Try again',
    findAQuiz: 'Find a quiz',
    allQuizzes: 'All quizzes',
    myGames: 'My games',
    todaysChallenge: 'Today’s challenge',
    fullLeaderboard: 'Full leaderboard',
    privacyNotice: 'privacy notice',
    whereThisComesFrom: 'Where this comes from',
    you: 'You',
    questionCount: (count: number): string => `${count} questions`,
    /** Answer time in seconds with one decimal place, e.g. "12.4 s". */
    seconds: (ms: number): string =>
      `${(ms / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })} s`,
    ageBands: {
      under_13: 'Under 13',
      '13_17': '13 to 17',
      '18_plus': '18 or over',
    },
    modes: {
      practice: 'Practice',
      ranked: 'Ranked',
      daily: 'Today’s challenge',
      challenge: 'Friend challenge',
    },
    difficulty: {
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Tricky',
    },
    ages: {
      range: (min: number, max: number): string => `Ages ${min}–${max}`,
      from: (min: number): string => `Ages ${min}+`,
      upTo: (max: number): string => `Up to age ${max}`,
    },
  },

  meta: {
    defaultDescription:
      'Fun, fair quizzes for all ages: daily challenges, friend battles and school-subject practice.',
    /** Page name followed by the site name, e.g. "Settings · Do You Know". */
    title: (page: string): string => `${page} · Do You Know`,
  },

  nav: {
    mainLabel: 'Main',
    skipToContent: 'Skip to content',
    homeLink: 'Do You Know home',
    quizzes: { label: 'Quizzes', short: 'Quizzes' },
    daily: { label: 'Today’s challenge', short: 'Today' },
    leaderboards: { label: 'Leaderboards', short: 'Boards' },
    me: { label: 'My games', short: 'Me' },
    signIn: 'Sign in',
    account: 'Account',
    accountHint: 'Parents, carers and staff',
  },

  footer: {
    label: 'Footer',
    tagline: 'Do You Know · quick quizzes for curious minds',
    links: {
      howToPlay: 'How to play',
      about: 'About',
      privacy: 'Privacy',
      terms: 'Terms',
      contact: 'Contact',
      settings: 'Settings',
      account: 'Parents and staff',
    },
  },

  pwa: {
    offline: 'You’re offline. Some things won’t load until you’re back online.',
    update: {
      label: 'App update',
      ready: 'There’s a new version ready.',
      action: 'Update now',
    },
    install: {
      label: 'Install the app',
      title: 'Install Do You Know',
      body: 'Opens like an app on your phone, tablet or computer. No app store needed.',
      notNow: 'Not now',
      action: 'Install',
    },
  },

  errors: {
    boundary: {
      title: 'Something went wrong',
      body: 'The error has been logged. Try reloading — if it keeps happening, please let us know.',
      reload: 'Reload app',
    },
    /** Friendly, child-safe copy for the short error codes raised by the PHP API. */
    game: {
      not_signed_in: 'Just a sec — getting you ready to play. Please try again.',
      invalid_mode: 'Something went wrong starting that game. Please try again.',
      too_many_attempts: 'Whoa, speedy! Take a breather and start again in a minute.',
      no_daily_today: "Today's challenge isn't ready yet. Try a quiz while you wait!",
      daily_already_played: "You've played today's challenge. Come back tomorrow for a new one!",
      challenge_not_found: 'This challenge link has expired or doesn’t exist.',
      own_challenge: "That's your own challenge — send it to a friend instead!",
      quiz_not_found: "We couldn't find that quiz.",
      attempt_not_found: "We couldn't find that game. Let's start a new one.",
      attempt_closed: 'That game has already finished.',
      no_more_questions: "That's all the questions — let's see your score!",
      question_not_shown: 'Hold on — loading the next question.',
      invalid_option: "That answer didn't go through. Please pick again.",
      invalid_value: 'Please pick a number on the slider.',
      not_all_answered: 'Answer every question to see your score.',
      attempt_not_finished: 'Finish the quiz first, then challenge a friend.',
      invalid_board: "We couldn't load that leaderboard.",
      invalid_age_band: 'Please choose an age group.',
      age_band_locked: 'Your age group is already set. Ask a grown-up to contact us to change it.',
      age_band_required: 'Please choose your age group first.',
      kids_use_generated_nickname: 'Pick one of our fun nicknames — tap shuffle to see more!',
      invalid_nickname: 'Nicknames need 3–20 letters or numbers.',
      nickname_not_allowed: "That nickname isn't allowed. Please try another.",
      invalid_avatar: 'That avatar isn’t available. Please pick another.',
      network_error: "We couldn't reach the game. Check your connection and try again.",
    },
    gameFallback: 'Oops, something went wrong. Please try again.',
    /** Shown by data hooks when a read fails. */
    load: {
      bestScores: "We couldn't load your best scores. Check your connection and try again.",
      continuePlaying: "We couldn't load your unfinished games.",
      session: "We couldn't get you ready to play. Check your connection and try again.",
      daily: "We couldn't load today's challenge. Check your connection and try again.",
      challenge: "We couldn't load this challenge. Check your connection and try again.",
      leaderboard: "We couldn't load the leaderboard. Check your connection and try again.",
      myGames: "We couldn't load your games. Check your connection and try again.",
      quiz: "We couldn't load this quiz. Check your connection and try again.",
      trending: "We couldn't load the trending quizzes. Check your connection and try again.",
      catalog: "We couldn't load the quizzes. Check your connection and try again.",
    },
  },

  notFound: {
    metaTitle: 'Page not found',
    title: 'We can’t find that page',
    body: 'The link might be old, or there might be a typo in it.',
  },

  home: {
    titleStart: 'Quick quizzes for',
    titleAccent: 'curious',
    titleEnd: 'minds',
    lead: 'Play in seconds with no sign-up. Every answer comes with a short explanation, so you learn something either way. Try today’s challenge, then dare a friend to beat you.',
    playAQuiz: 'Play a quiz',
    seeLeaderboards: 'See the leaderboards',
    safety: 'No account needed to play. Built to be safe for kids.',
    exampleLabel: 'Example question',
    // A taste of the game, not a live question: nothing here is marked right or wrong,
    // so no answer reaches the browser (see AGENTS.md §8).
    teaser: {
      category: 'Science & Nature',
      prompt: 'How many hearts does an octopus have?',
      options: ['One', 'Two', 'Three', 'Eight'],
    },
    streak: (days: number): string => `Streak: ${days} ${days === 1 ? 'day' : 'days'}`,
    doneToday: '✓ Done today',
    play: 'Play →',
    continueTitle: 'Continue playing',
    resume: 'Resume →',
    trendingTitle: 'Trending this week',
    trendingLoading: 'Loading trending quizzes…',
    pickTitle: 'Pick a quiz',
    pickCount: (shown: number, total: number): string =>
      shown === total
        ? `${total} ${total === 1 ? 'quiz' : 'quizzes'}`
        : `Showing ${shown} of ${total} quizzes`,
    showAll: (total: number): string => `Show all ${total} quizzes`,
    showFewer: 'Show fewer',
    kicker: 'Fun, fair quizzes for every age',
    scrollHint: 'Scroll to explore',
    whoTitle: 'Who’s playing?',
    whoLabel: 'Show quizzes for an age group',
    whoAll: 'Everyone',
    noneForAge: 'No quizzes for this age yet. Try another group!',
    subjectsTitle: 'Explore by subject',
    subjectGroups: { general: 'Everyday topics', school: 'School subjects' },
    stepsTitle: 'How it works',
    steps: [
      {
        emoji: '👆',
        title: 'Choose a subject',
        body: 'Find a topic you love, or try today’s challenge.',
      },
      {
        emoji: '🤔',
        title: 'Answer and learn',
        body: 'Every answer comes with a short, friendly “why”.',
      },
      {
        emoji: '🏆',
        title: 'Beat your best',
        body: 'New questions each round, then dare a friend.',
      },
    ],
    categoriesLabel: 'Categories',
    quizzesLoading: 'Loading quizzes…',
    empty: 'New quizzes are on their way. Pop back soon!',
  },

  category: {
    metaTitle: (name: string): string => `${name} quizzes`,
    fallbackTitle: 'Quizzes',
    ageLabel: 'Age',
    ageChips: {
      all: 'All ages',
      ages6to8: '6–8',
      ages9to11: '9–11',
      ages12to14: '12–14',
      ages15to16: '15–16',
      adult: 'Adult',
    },
    schoolYear: 'School year',
    anyYear: 'Any',
    loading: 'Loading quizzes…',
    empty: 'No quizzes here yet. Try another age, or pop back soon!',
  },

  quiz: {
    metaTitle: 'Quiz',
    loading: 'Loading quiz…',
    topPlayers: 'Top players',
    boardError: 'The leaderboard isn’t loading right now. Try again later.',
    timeLimit: (seconds: number): string => `${seconds} seconds a question`,
    noTimer: 'No timer',
    curriculumLabel: 'Curriculum',
    playNow: 'Play now',
    practise: 'Just practise',
    noSignUp: 'No sign-up needed. You’ll see the answer and why after every question.',
  },

  play: {
    dailyTitle: "Today's challenge",
    fallbackTitle: 'Quiz',
    leave: 'Leave',
    backToChallenge: 'Back to the challenge',
    backToQuiz: 'Back to quiz',
    moreInCategory: (category: string): string => `More ${category} quizzes`,
    offline: 'Playing needs an internet connection, because answers are checked on our server.',
    loading: 'Getting your quiz ready…',
    finishing: 'Adding up your score…',
    errorTitle: 'Uh-oh',
    dailyLeaderboard: "Today's leaderboard",
    home: 'Home',
    answersLabel: 'Answers',
    questionOf: (position: number, total: number): string => `Question ${position} of ${total}`,
    timer: {
      badge: (seconds: number): string => `${seconds}s`,
      announce: (seconds: number): string => `${seconds} seconds left`,
    },
    answer: {
      correct: 'Correct',
      answer: 'Answer',
      yourPick: 'Your pick',
    },
    slider: {
      lockIn: 'Lock it in',
      answerIs: 'The answer is',
      range: (min: string, max: string): string => `(anything from ${min} to ${max} counts)`,
    },
    feedback: {
      timeUp: "Time's up!",
      correct: 'Correct!',
      wrong: 'So close!',
      why: 'Why?',
      comingUp: 'Next question coming up…',
      stay: 'Stay here',
      seeScore: 'See my score',
      next: 'Next question',
    },
  },

  results: {
    correctSuffix: 'correct',
    cheer: {
      perfect: 'Perfect score! You really do know.',
      great: 'Brilliant work!',
      good: 'Nice going! Have a look at the ones you missed.',
      keepGoing: 'Every quiz teaches you something. Have a look at the answers below.',
    },
    accuracy: (percent: number): string => `Accuracy ${percent}%`,
    answerTime: (time: string): string => `Answer time ${time}`,
    nextQuiz: 'Next quiz',
    nextQuizNamed: (title: string): string => `Next quiz: ${title}`,
    playAgain: 'Play again',
    guestNote: 'Playing as a guest. Your games are saved on this device.',
    yourAnswers: 'Your answers',
    nextLabel: 'What next',
    nextTitle: 'What next?',
    review: {
      right: 'Right',
      timedOut: 'Time ran out',
      wrong: 'Not quite',
      youSaid: 'You said:',
      answer: 'Answer:',
      noAnswer: 'No answer',
    },
    board: {
      daily: "Today's leaderboard",
      allTime: 'Leaderboard',
      seeAll: 'See all',
    },
    share: {
      text: (correct: number, total: number, quiz: string): string =>
        `I scored ${correct}/${total} on ${quiz} on Do You Know!`,
      copied: 'Copied! Paste it anywhere you like.',
      action: 'Share result',
    },
    versus: {
      label: 'Head to head',
      tie: "It's a tie!",
      youWon: (friend: string): string => `You beat ${friend}!`,
      theyWon: (friend: string): string => `${friend} wins this time`,
      sameScore: 'Same score, so the faster time wins.',
    },
  },

  challenge: {
    metaTitle: 'Can you beat your friend?',
    loading: 'Loading the challenge…',
    notFound: 'Challenge not found',
    scored: (friend: string, correct: number, total: number): string =>
      `${friend} scored ${correct}/${total}.`,
    canYouBeatIt: 'Can you beat it?',
    sameQuestions: 'You’ll get the exact same questions in the same order. No sign-up needed.',
    accept: 'Accept the challenge',
    create: {
      text: (correct: number, total: number, quiz: string): string =>
        `I scored ${correct}/${total} on ${quiz}. Can you beat me?`,
      sent: 'Challenge sent!',
      copied: 'Link copied! Send it to a friend.',
      failed: 'Copy the link below and send it to a friend.',
      action: 'Challenge a friend',
      linkLabel: 'Challenge link: ',
    },
  },

  daily: {
    metaDescription:
      'One quiz a day, the same questions for everyone. Play once and climb today’s board.',
    today: 'Today',
    lead: 'Everyone gets the same questions in the same order. One go each, so make it count!',
    notReady: 'Today’s challenge isn’t ready yet. It usually appears just after midnight.',
    tryAQuiz: 'Try a quiz while you wait',
    yourStreak: 'Your streak:',
    dayUnit: (days: number): string => (days === 1 ? 'day' : 'days'),
    startStreak: 'Play today to start a streak.',
    done: 'Done for today. Come back tomorrow!',
    play: 'Play today’s challenge',
    topTen: 'Today’s top 10',
    boardEmpty: 'No scores yet today. Be the first!',
    boardError: 'Today’s board isn’t loading right now. Try again later.',
  },

  leaderboards: {
    title: 'Leaderboards',
    metaDescription: 'Top scores for every ranked quiz, this week’s best and today’s challenge.',
    lead: 'Most correct wins. If it’s a tie, the faster answer time goes first.',
    boardLabel: 'Board',
    tabs: {
      all_time: 'All time',
      weekly: 'This week',
      daily: "Today's challenge",
    },
    quizLabel: 'Quiz',
    noRanked: 'No ranked quizzes yet, so there’s no board to show.',
    dailyEmpty: 'No scores for today’s challenge yet. Be the first!',
    table: {
      empty: 'No one on this board yet. Be the first!',
      rank: 'Rank ',
      youAre: 'You’re',
      rankNumber: (rank: number): string => `#${rank}`,
      withScore: (correct: number, total: number): string => `with ${correct}/${total}`,
      yourBest: (correct: number, total: number): string =>
        `Your best: ${correct}/${total}. Pick a nickname to appear on the board.`,
    },
  },

  me: {
    title: 'My games',
    dayStreak: 'Day streak',
    gamesPlayed: 'Games played',
    guestNote: 'You play as a guest, so no email is needed and your games live on this device.',
    settings: 'Settings',
    accountLink: 'Parent and staff accounts',
    bestScores: 'Best scores',
    recentGames: 'Recent games',
    empty: 'No games yet. Pick a quiz and give it a go!',
    retiredQuiz: 'A retired quiz',
    /** Best-score time, e.g. "12.4s". */
    time: (ms: number): string => `${(ms / 1000).toFixed(1)}s`,
    profile: {
      avatarLabel: 'Your avatar',
      title: 'Your profile',
      changeAvatar: 'Change my avatar',
      pickAvatar: 'Pick my avatar',
      nickname: 'Leaderboard name:',
      ageGroup: 'Age group:',
      confirmDelete: 'Delete your account and every score? This can’t be undone.',
      keep: 'Keep my account',
      confirm: 'Yes, delete everything',
      delete: 'Delete my account',
    },
    ageBand: {
      title: 'How old are you?',
      body: 'This keeps the game safe for everyone. You can only choose once.',
    },
    nickname: {
      childTitle: 'Your leaderboard name',
      shuffle: 'Shuffle',
      useThis: 'Use this name',
      pickTitle: 'Pick a leaderboard name',
      label: 'Nickname',
      placeholder: 'e.g. QuizWhizz',
      hint: '3–20 letters or numbers. Please don’t use your real name.',
      save: 'Save name',
      random: 'Give me a random one',
    },
  },

  settings: {
    title: 'Settings',
    colours: 'Colours',
    themes: {
      light: { label: 'Light', hint: 'Bright and sunny' },
      dark: { label: 'Dark', hint: 'Easier on the eyes at night' },
    },
    profileHint: 'Your nickname, avatar and age group live on',
  },

  avatar: {
    title: 'Pick your avatar',
    lead: 'It shows next to your name on the leaderboards.',
    names: {
      fox: 'Fox',
      owl: 'Owl',
      panda: 'Panda',
      lion: 'Lion',
      frog: 'Frog',
      octopus: 'Octopus',
      penguin: 'Penguin',
      unicorn: 'Unicorn',
      dragon: 'Dragon',
      robot: 'Robot',
      rocket: 'Rocket',
      star: 'Star',
    },
  },

  account: {
    title: 'Parent and staff accounts',
    lead: 'This sign-in is for adults. Children can keep playing as guests without an account.',
    notConnected:
      'Game history is not connected to these accounts yet. Signing in here does not move your scores or give access to staff tools.',
    unavailable: 'Adult account sign-in is not available yet. You can still play quizzes.',
    continueAsAdult: 'Continue as an adult',
    back: 'Back to my games',
    loading: 'Loading account sign-in…',
    signedIn: 'You’re signed in to your adult account.',
    signIn: 'Sign in',
    signUp: 'Create an adult account',
  },

  info: {
    about: {
      metaTitle: 'About',
      metaDescription:
        'Do You Know is a free quiz app for all ages, including children: fair server-side marking, no ads and no trackers.',
      title: 'About Do You Know',
      lead: 'Quick, fun quizzes for curious minds of every age.',
      whatTitle: 'What it is',
      what: [
        'Do You Know is a quiz app you can play in your browser or install on a phone, tablet or computer. There are general knowledge quizzes, school-subject quizzes, a daily challenge and friend challenges.',
        'After every question you see the right answer and a short explanation, so each game teaches you something.',
      ],
      everyoneTitle: 'Made for everyone, including children',
      everyone: [
        'You can play straight away. There is no sign-up for players.',
        'Players never give a real name, email, photo or birthday.',
        'Players under 13 get a made-up nickname and pick a preset avatar.',
        'There is no chat and no way to message other players.',
      ],
      fairTitle: 'Fair play',
      fair: 'Answers stay on our server until you have answered. The server marks every answer and times every question, so scores on the leaderboards are fair for everyone.',
      noAdsTitle: 'No ads, no trackers',
      noAdsBefore:
        'There are no adverts, no advertising trackers and no analytics tools in the app. Read the',
      noAdsAfter: 'to see exactly what we keep and why.',
    },
    contact: {
      metaTitle: 'Contact',
      metaDescription: 'How parents, carers, teachers and players can contact Do You Know.',
      title: 'Contact',
      lead: 'For parents, carers, teachers and anyone who spots a mistake.',
      touchTitle: 'Get in touch',
      emailUs:
        'Email us about privacy, a question that looks wrong, or anything else about the app.',
      children: 'Children: please ask a grown-up to send the email for you.',
      settingUp:
        'Our contact details are being set up and will appear here soon. Thank you for your patience.',
      correctionsTitle: 'Content corrections',
      corrections:
        'Every question should have a short explanation and a source. If you think an answer is wrong or out of date, tell us the quiz name and the question, and we will check it.',
      deleteTitle: 'Deleting a player’s data',
      deleteStart: 'You do not need to contact us to delete a player. Open',
      deleteMiddle: 'on the device they play on and choose “Delete my account”. The',
      deleteEnd: 'explains what is removed.',
    },
    howToPlay: {
      metaTitle: 'How to play',
      metaDescription:
        'How Do You Know works: question types, practice and ranked play, the daily challenge, friend challenges and fair scoring.',
      title: 'How to play',
      lead: 'Pick a quiz, answer the questions, and see the answer and why after each one.',
      kindsTitle: 'Three kinds of question',
      kinds: [
        { name: 'Multiple choice:', text: 'pick the one answer you think is right.' },
        { name: 'True or false:', text: 'decide if the sentence is true or not.' },
        {
          name: 'Slider estimate:',
          text: 'slide to the number you think it is. You score if your guess lands close enough to the real answer.',
        },
      ],
      timer:
        'Some quizzes give you a set number of seconds for each question. If the time runs out, that question counts as not right, and the game moves on.',
      modesTitle: 'Practice or ranked',
      rankedName: 'Play now',
      ranked:
        'is a ranked game: your best result goes on that quiz’s all-time board and this week’s board. A new week starts on Monday, UK time.',
      practiceName: 'Just practise',
      practice:
        'is for fun and learning. Practice games never go on a leaderboard. A few quizzes are practice only.',
      dailyTitle: 'The daily challenge',
      daily: [
        'There is one daily challenge, and everyone gets the same questions in the same order.',
        'You get one go each day, and it counts as a ranked game.',
        'A new challenge starts each day, shortly after midnight UK time.',
        'Play on days in a row to grow your streak. Miss a day and your streak starts again from one.',
      ],
      dailyLink: 'Try today’s challenge',
      friendsTitle: 'Friend challenges',
      friends: [
        'After you finish a quiz, you can make a challenge link to share with a friend.',
        'The link ends in an 8-character code and works for 30 days.',
        'Your friend gets the same questions, in the same order, with the same timer. You cannot play your own challenge.',
        'The winner has more right answers. If it is a tie, the faster player wins.',
      ],
      scoringTitle: 'Fair scoring',
      scoring: [
        'First, the most right answers wins.',
        'If scores are level, the lower total answer time wins.',
        'If both are level, whoever got there first goes higher.',
      ],
      clock:
        'The clock only runs while a question is on screen. It stops the moment you answer, so time spent reading the answer and explanation never counts.',
      server:
        'All marking and timing happens on our server, not on your device. Nobody can see the answers before they play, and nobody can send in a made-up score.',
      boardsTitle: 'Leaderboards',
      boards:
        'Boards show a nickname, a preset avatar, the score and the time. Nothing else about a player is shown. You only appear once you have a nickname, and players under 13 get a made-up fun nickname instead of typing one.',
      boardsLink: 'See the leaderboards',
    },
    privacy: {
      metaTitle: 'Privacy notice',
      metaDescription:
        'What Do You Know keeps about players, why, for how long, and how to delete it. Written for children and grown-ups.',
      title: 'Privacy notice',
      lead: (updated: string): string =>
        `How we look after your information. Last updated ${updated}.`,
      headings: {
        forChildren: 'For children: the short version',
        whoWeAre: 'Who we are',
        server: 'What we keep on our server',
        device: 'What is kept on your device',
        public: 'What other people can see',
        why: 'Why we use it',
        adults: 'Grown-ups’ accounts',
        processors: 'Companies that help us',
        retention: 'How long we keep it',
        deleting: 'Deleting your information',
        rights: 'Your rights',
        changes: 'Changes to this notice',
      },
    },
    terms: {
      metaTitle: 'Terms of use',
      metaDescription: 'The short, fair rules for playing Do You Know.',
      title: 'Terms of use',
      lead: (updated: string): string =>
        `The fair-play rules for everyone. Last updated ${updated}.`,
      headings: {
        short: 'The short version',
        who: 'Who runs the app',
        fair: 'Fair play',
        content: 'Quiz content',
        player: 'Your player and deleting it',
        wrong: 'When things go wrong',
        changes: 'Changes to these terms',
      },
    },
  },
} as const;
