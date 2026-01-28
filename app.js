// === APPLICATIE STATE ===
let currentWordIndex = 0;
let remainingWords = [];
let progress = {};
let currentMode = 'flashcard'; // 'flashcard', 'typing' of 'speed'

// === SPEED MODE STATE ===
let speedScore = 0;
let speedTimer = null;
let speedTimeLeft = 15;
let speedWordCount = 0;
let speedHighScore = 0;
const SPEED_MAX_TIME = 15;
const SPEED_TOTAL_WORDS = 10;

// === TEKST NAAR SPRAAK ===
function speakWord(event) {
    // Stop event propagation zodat de flashcard niet flipt
    if (event) {
        event.stopPropagation();
    }

    // Haal het huidige Spaanse woord op - werkt voor alle modi
    const current = remainingWords[currentWordIndex];
    if (!current) return;

    const text = current.word.spanish;

    // Gebruik de Web Speech API
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES'; // Spaans (Spanje)
    utterance.rate = 0.9; // Iets langzamer voor duidelijkheid

    // Probeer een Spaanse stem te vinden
    const voices = speechSynthesis.getVoices();
    const spanishVoice = voices.find(voice => voice.lang.startsWith('es'));
    if (spanishVoice) {
        utterance.voice = spanishVoice;
    }

    speechSynthesis.speak(utterance);
}

// === INITIALISATIE ===
function init() {
    loadProgress();
    loadSpeedHighScore();
    setupEventListeners();
    setupSpeedEventListeners();
    updateStats();
    renderWordsList();
    // Start niet automatisch - wacht op moduskeuze
}

// === MODE SELECTIE ===
function startMode(mode) {
    currentMode = mode;

    // Verberg startscherm, toon main app
    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');

    // Verberg alle modes eerst
    document.getElementById('flashcardMode').style.display = 'none';
    document.getElementById('typingMode').style.display = 'none';
    document.getElementById('speedMode').style.display = 'none';
    document.getElementById('speedResult').classList.remove('active');

    // Toon juiste modus
    if (mode === 'flashcard') {
        document.getElementById('flashcardMode').style.display = 'block';
        startSession();
    } else if (mode === 'typing') {
        document.getElementById('typingMode').style.display = 'block';
        startSession();
    } else if (mode === 'speed') {
        document.getElementById('speedMode').style.display = 'block';
        startSpeedRound();
    }
}

function backToStart() {
    // Stop speed timer als die loopt
    if (speedTimer) {
        clearInterval(speedTimer);
        speedTimer = null;
    }

    document.getElementById('mainApp').classList.remove('active');
    document.getElementById('startScreen').classList.add('active');
    document.getElementById('completion').classList.remove('active');
    document.getElementById('speedResult').classList.remove('active');
}

// === LOCAL STORAGE ===
function loadProgress() {
    const saved = localStorage.getItem('spanishProgress');
    if (saved) {
        progress = JSON.parse(saved);
    } else {
        // Initialiseer progress voor alle woorden
        words.forEach((word, index) => {
            progress[index] = {
                correct: 0,
                wrong: 0,
                lastSeen: null
            };
        });
    }
}

function saveProgress() {
    localStorage.setItem('spanishProgress', JSON.stringify(progress));
}

// === SESSIE LOGICA ===
function startSession() {
    // Selecteer woorden voor deze sessie
    // Prioriteit: woorden die je nog niet kent of vaak fout had
    remainingWords = words
        .map((word, index) => ({ word, index }))
        .sort((a, b) => {
            const scoreA = getWordScore(a.index);
            const scoreB = getWordScore(b.index);
            return scoreA - scoreB; // Laagste score eerst
        })
        .slice(0, 20); // Max 20 woorden per sessie

    // Shuffle voor variatie
    shuffleArray(remainingWords);

    currentWordIndex = 0;
    showCurrentWord();
}

function getWordScore(index) {
    const p = progress[index];
    if (!p || p.correct + p.wrong === 0) return -1; // Nieuwe woorden eerst
    return p.correct / (p.correct + p.wrong); // Ratio correct/totaal
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// === WOORD WEERGAVE ===
function showCurrentWord() {
    const completionEl = document.getElementById('completion');

    if (currentWordIndex >= remainingWords.length) {
        // Sessie voltooid
        document.getElementById('flashcardMode').style.display = 'none';
        document.getElementById('typingMode').style.display = 'none';
        completionEl.classList.add('active');
        return;
    }

    completionEl.classList.remove('active');
    const current = remainingWords[currentWordIndex];

    if (currentMode === 'flashcard') {
        showFlashcard(current);
    } else {
        showTypingWord(current);
    }
}

// === FLASHCARD MODUS ===
function showFlashcard(current) {
    const flashcardEl = document.getElementById('flashcard');
    const buttonsEl = document.getElementById('buttons');

    document.getElementById('flashcardMode').style.display = 'block';
    flashcardEl.parentElement.style.display = 'block';
    buttonsEl.style.display = 'flex';

    document.getElementById('spanishWord').textContent = current.word.spanish;
    document.getElementById('dutchWord').textContent = current.word.dutch;

    // Reset flip state
    flashcardEl.classList.remove('flipped');
}

function flipCard() {
    if (currentMode !== 'flashcard') return;
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.toggle('flipped');
}

// === TYPING MODUS ===
function showTypingWord(current) {
    document.getElementById('typingMode').style.display = 'block';
    document.getElementById('typingSpanishWord').textContent = current.word.spanish;

    // Reset input
    const input = document.getElementById('typingInput');
    input.value = '';
    input.className = 'typing-input';
    input.disabled = false;
    input.focus();

    // Reset feedback
    document.getElementById('typingFeedback').textContent = '';
    document.getElementById('typingFeedback').className = 'typing-feedback';

    // Verberg/toon knoppen
    document.getElementById('btnCheck').style.display = 'inline-block';
    document.getElementById('btnNextWord').style.display = 'none';
}

function checkTypingAnswer() {
    const current = remainingWords[currentWordIndex];
    const input = document.getElementById('typingInput');
    const feedback = document.getElementById('typingFeedback');
    const userAnswer = input.value.trim().toLowerCase();
    const correctAnswer = current.word.dutch.toLowerCase();

    // Verberg check knop, toon next knop
    document.getElementById('btnCheck').style.display = 'none';
    document.getElementById('btnNextWord').style.display = 'inline-block';
    input.disabled = true;

    // Eenvoudige vergelijking (kan later verbeterd worden met fuzzy matching)
    // Accepteer ook antwoorden zonder lidwoord
    const correctWithoutArticle = correctAnswer.replace(/^(de|het|een)\s+/, '');
    const userWithoutArticle = userAnswer.replace(/^(de|het|een)\s+/, '');

    if (userAnswer === correctAnswer || userWithoutArticle === correctWithoutArticle) {
        // Correct!
        input.className = 'typing-input correct';
        feedback.textContent = 'Correct!';
        feedback.className = 'typing-feedback correct';
        progress[current.index].correct++;
    } else {
        // Fout
        input.className = 'typing-input wrong';
        feedback.innerHTML = `Fout! Het juiste antwoord is: <strong>${current.word.dutch}</strong>`;
        feedback.className = 'typing-feedback wrong';
        progress[current.index].wrong++;
        // Voeg woord opnieuw toe aan de lijst
        remainingWords.push(current);
    }

    progress[current.index].lastSeen = Date.now();
    saveProgress();
    updateStats();
    renderWordsList();
}

function goToNextWord() {
    currentWordIndex++;
    showCurrentWord();
}

// === ANTWOORD VERWERKING (FLASHCARD) ===
function markCorrect() {
    if (currentMode !== 'flashcard') return;
    const current = remainingWords[currentWordIndex];
    progress[current.index].correct++;
    progress[current.index].lastSeen = Date.now();
    saveProgress();
    nextWord();
}

function markWrong() {
    if (currentMode !== 'flashcard') return;
    const current = remainingWords[currentWordIndex];
    progress[current.index].wrong++;
    progress[current.index].lastSeen = Date.now();

    // Voeg woord opnieuw toe aan de lijst (komt later terug)
    remainingWords.push(current);

    saveProgress();
    nextWord();
}

function nextWord() {
    currentWordIndex++;
    updateStats();
    renderWordsList();
    showCurrentWord();
}

// === STATISTIEKEN ===
function updateStats() {
    let known = 0;
    let learning = 0;
    let newWords = 0;

    words.forEach((word, index) => {
        const status = getWordStatus(index);
        if (status === 'known') known++;
        else if (status === 'learning') learning++;
        else newWords++;
    });

    document.getElementById('statKnown').textContent = known;
    document.getElementById('statLearning').textContent = learning;
    document.getElementById('statNew').textContent = newWords;

    // Update progress bar
    const percentage = Math.round((known / words.length) * 100);
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = percentage + '%';
    progressBar.textContent = percentage + '%';
}

function getWordStatus(index) {
    const p = progress[index];
    if (!p || p.correct + p.wrong === 0) return 'new';
    if (p.correct >= 1) return 'known';
    return 'learning';
}

// === WOORDEN LIJST ===
function renderWordsList() {
    const list = document.getElementById('wordsList');
    list.innerHTML = '';

    words.forEach((word, index) => {
        const status = getWordStatus(index);
        const statusText = {
            'new': 'Nieuw',
            'learning': 'Aan het leren',
            'known': 'Gekend'
        };
        const statusClass = {
            'new': 'status-new',
            'learning': 'status-learning',
            'known': 'status-known'
        };

        const item = document.createElement('div');
        item.className = 'word-item';
        item.innerHTML = `
            <div class="word-text">
                <div class="word-spanish">${word.spanish}</div>
                <div class="word-dutch">${word.dutch}</div>
            </div>
            <span class="word-status ${statusClass[status]}">${statusText[status]}</span>
        `;
        list.appendChild(item);
    });
}

// === NAVIGATIE ===
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach((btn, index) => {
        btn.classList.remove('active');
        if (index === 0 && tabName === 'practice') btn.classList.add('active');
        if (index === 1 && tabName === 'progress') btn.classList.add('active');
    });

    // Update pages
    document.getElementById('practicePage').classList.remove('active');
    document.getElementById('progressPage').classList.remove('active');

    if (tabName === 'practice') {
        document.getElementById('practicePage').classList.add('active');
    } else {
        document.getElementById('progressPage').classList.add('active');
    }
}

// === RESET ===
function resetProgress() {
    if (confirm('Weet je zeker dat je alle voortgang wilt wissen?')) {
        localStorage.removeItem('spanishProgress');
        progress = {};
        words.forEach((word, index) => {
            progress[index] = {
                correct: 0,
                wrong: 0,
                lastSeen: null
            };
        });
        saveProgress();
        updateStats();
        renderWordsList();
        startSession();
    }
}

function restartSession() {
    document.getElementById('completion').classList.remove('active');
    if (currentMode === 'flashcard') {
        document.getElementById('flashcardMode').style.display = 'block';
    } else {
        document.getElementById('typingMode').style.display = 'block';
    }
    startSession();
}

// === EVENT LISTENERS ===
function setupEventListeners() {
    document.getElementById('flashcard').addEventListener('click', flipCard);
    document.getElementById('btnWrong').addEventListener('click', markWrong);
    document.getElementById('btnCorrect').addEventListener('click', markCorrect);
    document.getElementById('btnRestart').addEventListener('click', restartSession);
    document.getElementById('btnReset').addEventListener('click', resetProgress);
    document.getElementById('btnCheck').addEventListener('click', checkTypingAnswer);
    document.getElementById('btnNextWord').addEventListener('click', goToNextWord);

    // Enter voor typing modus (document level zodat het ook werkt na disable)
    document.addEventListener('keydown', (e) => {
        if (currentMode !== 'typing') return;
        if (e.key === 'Enter') {
            e.preventDefault();
            const checkBtn = document.getElementById('btnCheck');
            const nextBtn = document.getElementById('btnNextWord');
            if (checkBtn.style.display !== 'none') {
                checkTypingAnswer();
            } else if (nextBtn.style.display !== 'none') {
                goToNextWord();
            }
        }
    });

    // Keyboard shortcuts (alleen voor flashcard modus)
    document.addEventListener('keydown', (e) => {
        // Negeer als we in een input veld zitten
        if (e.target.tagName === 'INPUT') return;

        if (currentMode === 'flashcard') {
            if (e.key === ' ' || e.key === 'Enter') {
                flipCard();
                e.preventDefault();
            } else if (e.key === 'ArrowLeft' || e.key === '1') {
                markWrong();
            } else if (e.key === 'ArrowRight' || e.key === '2') {
                markCorrect();
            }
        }
    });
}

// === SPEED MODE ===
function loadSpeedHighScore() {
    const saved = localStorage.getItem('speedHighScore');
    if (saved) {
        speedHighScore = parseInt(saved, 10);
    }
}

function saveSpeedHighScore() {
    localStorage.setItem('speedHighScore', speedHighScore.toString());
}

function startSpeedRound() {
    loadSpeedHighScore();
    speedScore = 0;
    speedWordCount = 0;

    // Selecteer 10 willekeurige woorden
    remainingWords = words
        .map((word, index) => ({ word, index }))
        .sort(() => Math.random() - 0.5)
        .slice(0, SPEED_TOTAL_WORDS);

    currentWordIndex = 0;
    updateSpeedDisplay();
    showSpeedWord();
}

function updateSpeedDisplay() {
    document.getElementById('speedScore').textContent = speedScore;
    document.getElementById('speedWordNum').textContent = speedWordCount + 1;
}

function showSpeedWord() {
    if (currentWordIndex >= remainingWords.length) {
        endSpeedSession();
        return;
    }

    const current = remainingWords[currentWordIndex];
    document.getElementById('speedSpanishWord').textContent = current.word.spanish;

    // Reset input
    const input = document.getElementById('speedInput');
    input.value = '';
    input.className = 'typing-input';
    input.disabled = false;
    input.focus();

    // Start timer
    speedTimeLeft = SPEED_MAX_TIME;
    updateTimerDisplay();
    startSpeedTimer();
}

function startSpeedTimer() {
    if (speedTimer) {
        clearInterval(speedTimer);
    }

    speedTimer = setInterval(() => {
        speedTimeLeft--;
        updateTimerDisplay();

        if (speedTimeLeft <= 0) {
            clearInterval(speedTimer);
            speedTimer = null;
            speedTimeUp();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('speedTimer');
    timerEl.textContent = speedTimeLeft;

    if (speedTimeLeft <= 5) {
        timerEl.classList.add('warning');
    } else {
        timerEl.classList.remove('warning');
    }
}

function speedTimeUp() {
    // Tijd is op - 0 punten, ga naar volgende woord
    const input = document.getElementById('speedInput');
    input.disabled = true;
    input.className = 'typing-input wrong';

    speedWordCount++;
    currentWordIndex++;

    setTimeout(() => {
        showSpeedWord();
    }, 800);
}

function checkSpeedAnswer() {
    if (currentMode !== 'speed') return;

    const current = remainingWords[currentWordIndex];
    const input = document.getElementById('speedInput');
    const userAnswer = input.value.trim().toLowerCase();
    const correctAnswer = current.word.dutch.toLowerCase();

    // Stop timer
    if (speedTimer) {
        clearInterval(speedTimer);
        speedTimer = null;
    }

    // Accepteer ook antwoorden zonder lidwoord
    const correctWithoutArticle = correctAnswer.replace(/^(de|het|een)\s+/, '');
    const userWithoutArticle = userAnswer.replace(/^(de|het|een)\s+/, '');

    input.disabled = true;

    if (userAnswer === correctAnswer || userWithoutArticle === correctWithoutArticle) {
        // Correct! Bereken punten op basis van resterende tijd
        const points = Math.floor((speedTimeLeft / SPEED_MAX_TIME) * 100);
        speedScore += points;
        input.className = 'typing-input correct';
    } else {
        // Fout - 0 punten
        input.className = 'typing-input wrong';
    }

    speedWordCount++;
    currentWordIndex++;
    updateSpeedDisplay();

    setTimeout(() => {
        showSpeedWord();
    }, 600);
}

function endSpeedSession() {
    // Stop timer als die nog loopt
    if (speedTimer) {
        clearInterval(speedTimer);
        speedTimer = null;
    }

    // Verberg speed card, toon resultaat
    document.getElementById('speedMode').style.display = 'none';
    document.getElementById('speedResult').classList.add('active');

    // Toon score
    document.getElementById('speedFinalScore').textContent = speedScore;
    document.getElementById('speedHighScoreDisplay').textContent = speedHighScore;

    // Check voor nieuw record
    const newRecordEl = document.getElementById('speedNewRecord');
    if (speedScore > speedHighScore) {
        speedHighScore = speedScore;
        saveSpeedHighScore();
        document.getElementById('speedHighScoreDisplay').textContent = speedHighScore;
        newRecordEl.style.display = 'inline-block';
    } else {
        newRecordEl.style.display = 'none';
    }
}

function restartSpeedSession() {
    document.getElementById('speedResult').classList.remove('active');
    document.getElementById('speedMode').style.display = 'block';
    startSpeedRound();
}

// === EVENT LISTENERS SPEED MODE ===
function setupSpeedEventListeners() {
    document.getElementById('btnSpeedRestart').addEventListener('click', restartSpeedSession);
    document.getElementById('btnSpeedHome').addEventListener('click', backToStart);

    // Enter voor speed mode
    document.getElementById('speedInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && currentMode === 'speed') {
            e.preventDefault();
            const input = document.getElementById('speedInput');
            if (!input.disabled && input.value.trim() !== '') {
                checkSpeedAnswer();
            }
        }
    });
}

// Start de app
document.addEventListener('DOMContentLoaded', init);
