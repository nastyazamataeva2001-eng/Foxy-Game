const questions = [
  { question: "Hello!", answers: ["Goodbye!", "Hello!", "I'm Foxy!"], correctAnswer: "Hello!" },
  { question: "What's your name?", answers: ["I'm Foxy!", "Hello!", "I'm good!"], correctAnswer: "I'm Foxy!" },
  { question: "How are you?", answers: ["I'm good!", "Hello!", "I'm Foxy!"], correctAnswer: "I'm good!" },
  { question: "Goodbye!", answers: ["Hello!", "Goodbye!", "I'm good!"], correctAnswer: "Goodbye!" },
  { question: "What's your name?", answers: ["I am Leo!", "I am Mike!", "I am Polly!"], correctAnswer: "I am Leo!", character: "assets/characters/leo.png", animal: "lion" },
  { question: "What's your name?", answers: ["I am Gina!", "I am Mike!", "I am Leo!"], correctAnswer: "I am Mike!", character: "assets/characters/mike.png", animal: "monkey" },
  { question: "What's your name?", answers: ["I am Polly!", "I am Leo!", "I am Gina!"], correctAnswer: "I am Polly!", character: "assets/characters/polly.png", animal: "parrot" },
  { question: "What's your name?", answers: ["I am Mike!", "I am Gina!", "I am Polly!"], correctAnswer: "I am Gina!", character: "assets/characters/gina.png", animal: "giraffe" }
];

const matchingPairs = [
  ["Hello!", "Hello!"], ["What's your name?", "I'm Foxy!"],
  ["How are you?", "I'm good!"], ["Goodbye!", "Goodbye!"]
];

const screens = { start: document.querySelector('#startScreen'), game: document.querySelector('#gameScreen'), final: document.querySelector('#finalScreen') };
const questionArea = document.querySelector('#questionArea');
const gameFoxy = document.querySelector('#gameFoxy');
const foxyMessage = document.querySelector('#foxyMessage');
const soundToggle = document.querySelector('#soundToggle');
let currentQuestion = 0, soundOn = true, isLocked = false, englishVoice = null, audioContext = null;

function pickEnglishVoice() {
  const voices = speechSynthesis.getVoices();
  englishVoice = voices.find(v => v.lang === 'en-US') || voices.find(v => v.lang.startsWith('en-')) || null;
}
pickEnglishVoice();
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = pickEnglishVoice;

function speak(text) {
  if (!soundOn || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = englishVoice?.lang || 'en-US';
  utterance.voice = englishVoice; utterance.rate = .82; utterance.pitch = 1.18;
  utterance.onstart = () => setFoxy('listening', 'Listen carefully!');
  utterance.onend = () => { if (!isLocked) setFoxy('idle', 'Your turn!'); };
  speechSynthesis.speak(utterance);
}

function uiSound(kind) {
  if (!soundOn || !window.AudioContext && !window.webkitAudioContext) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.frequency.value = kind === 'good' ? 660 : 260;
  gain.gain.setValueAtTime(.035, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + (kind === 'good' ? .22 : .13));
  oscillator.start(); oscillator.stop(audioContext.currentTime + (kind === 'good' ? .22 : .13));
}

function setFoxy(state, message) { gameFoxy.className = `foxy-wrap game-foxy ${state}`; if (message) foxyMessage.textContent = message; }
function showScreen(name) { Object.entries(screens).forEach(([key, element]) => element.classList.toggle('hidden', key !== name)); }
function renderProgress() { const total = questions.length + 1; document.querySelector('#questionCount').textContent = `Question ${currentQuestion + 1} of ${total}`; document.querySelector('#progressDots').innerHTML = Array.from({length: total}, (_, i) => `<span class="progress-dot ${i < currentQuestion ? 'done' : i === currentQuestion ? 'current' : ''}"></span>`).join(''); }

function startGame() { currentQuestion = 0; isLocked = false; showScreen('game'); renderQuestion(); }
function renderQuestion() {
  renderProgress(); setFoxy('idle', 'Listen carefully!');
  if (currentQuestion === questions.length) return startMatchingGame();
  const item = questions[currentQuestion];
  const characterCard = item.character ? `<div class="character-card"><img src="${item.character}" alt="A friendly ${item.animal}" /><p>Who is this?</p></div>` : '';
  questionArea.innerHTML = `${characterCard}<h2 class="question-title">${item.question}<button class="listen-question" type="button" aria-label="Listen to question">🔊</button></h2><div class="answers">${item.answers.map(answer => `<div class="answer-card" data-answer="${answer}"><button class="answer-choice" type="button" aria-label="Choose ${answer}">${answer}</button><button class="mini-listen" type="button" data-listen="${answer}" aria-label="Listen to ${answer}">🔊</button></div>`).join('')}</div><p class="feedback" aria-live="assertive"></p>`;
  questionArea.querySelector('.listen-question').addEventListener('click', () => speak(item.question));
  questionArea.querySelectorAll('.answer-choice').forEach(button => button.addEventListener('click', () => handleAnswer(button.closest('.answer-card'), item)));
  questionArea.querySelectorAll('[data-listen]').forEach(button => button.addEventListener('click', () => speak(button.dataset.listen)));
  setTimeout(() => speak(item.question), 250);
}

function handleAnswer(button, item) {
  if (isLocked) return; speak(button.dataset.answer); setFoxy('thinking', 'Hmm, is that right?');
  const feedback = questionArea.querySelector('.feedback');
  if (button.dataset.answer === item.correctAnswer) {
    isLocked = true; button.classList.add('correct'); feedback.textContent = 'Great job! ✨'; uiSound('good'); setFoxy('happy', 'Wonderful!');
    setTimeout(nextQuestion, 1300);
  } else { button.classList.add('incorrect'); feedback.textContent = 'Try again! 💛'; uiSound('bad'); setFoxy('idle', 'Almost! Try again.'); setTimeout(() => button.classList.remove('incorrect'), 600); }
}
function nextQuestion() { currentQuestion++; isLocked = false; renderQuestion(); }

function startMatchingGame() {
  let selected = null, matched = 0, left = matchingPairs.map(pair => pair[0]), right = matchingPairs.map(pair => pair[1]);
  right = [right[2], right[0], right[3], right[1]];
  questionArea.innerHTML = `<h2 class="question-title">Match the pairs! <button class="listen-question" type="button" aria-label="Listen to instructions">🔊</button></h2><p class="matching-intro">Tap one card on each side.</p><div class="matching-board"><div class="match-column">${left.map((text,i) => matchButton(text, 'left', i)).join('')}</div><div class="match-column">${right.map((text,i) => matchButton(text, 'right', i)).join('')}</div></div><p class="feedback" aria-live="assertive"></p>`;
  const feedback = questionArea.querySelector('.feedback');
  questionArea.querySelector('.listen-question').addEventListener('click', () => speak('Match the pairs!'));
  questionArea.querySelectorAll('.match-choice').forEach(choice => choice.addEventListener('click', () => {
    const card = choice.closest('.match-card');
    if (isLocked || card.classList.contains('matched')) return; speak(card.dataset.text);
    if (!selected) { selected = card; card.classList.add('selected'); setFoxy('thinking', 'Pick a matching card!'); return; }
    if (selected.dataset.side === card.dataset.side) { selected.classList.remove('selected'); selected = card; card.classList.add('selected'); return; }
    const first = selected, second = card; const leftCard = first.dataset.side === 'left' ? first : second; const rightCard = first.dataset.side === 'right' ? first : second;
    selected = null;
    if (matchingPairs.some(pair => pair[0] === leftCard.dataset.text && pair[1] === rightCard.dataset.text)) {
      leftCard.classList.remove('selected'); leftCard.classList.add('matched'); rightCard.classList.add('matched'); matched++; feedback.textContent = 'Great match! ✨'; uiSound('good'); setFoxy('happy', 'You found a pair!');
      if (matched === 4) { isLocked = true; setTimeout(finishGame, 1200); }
    } else { leftCard.classList.add('shake'); rightCard.classList.add('shake'); feedback.textContent = 'Try again! 💛'; uiSound('bad'); setFoxy('idle', 'Try another pair!'); setTimeout(() => { leftCard.classList.remove('shake','selected'); rightCard.classList.remove('shake','selected'); }, 480); }
  }));
  questionArea.querySelectorAll('[data-match-listen]').forEach(button => button.addEventListener('click', () => speak(button.dataset.matchListen)));
  setTimeout(() => speak('Match the pairs!'), 250);
}
function matchButton(text, side, index) { return `<div class="match-card" data-side="${side}" data-index="${index}" data-text="${text}"><button class="match-choice" type="button" aria-label="Choose ${text}">${text}</button><button class="mini-listen" type="button" data-match-listen="${text}" aria-label="Listen to ${text}">🔊</button></div>`; }
function finishGame() { speechSynthesis.cancel(); showScreen('final'); document.querySelector('#finalFoxy').classList.add('celebration'); uiSound('good'); }
function goHome() { speechSynthesis.cancel(); showScreen('start'); }

document.querySelector('#startButton').addEventListener('click', startGame);
document.querySelector('#playAgain').addEventListener('click', startGame);
document.querySelector('#homeButton').addEventListener('click', goHome);
document.querySelector('#soundCheck').addEventListener('click', () => speak('Hello! I am Foxy. Let us learn English!'));
soundToggle.addEventListener('click', () => { soundOn = !soundOn; if (!soundOn) speechSynthesis.cancel(); soundToggle.textContent = soundOn ? '🔊' : '🔇'; soundToggle.setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on'); soundToggle.title = soundOn ? 'Sound on' : 'Sound off'; });
