// 要素取得
const testWord = document.getElementById('test-word');
const testWordtype = document.getElementById('test-wordtype');
const testJudge = document.getElementById('test-judge');
const currentNumber = document.getElementById('current-number');
const resultScore = document.getElementById('result-score');
const resultAccuracy = document.getElementById('result-accuracy');
const answeringButtons = document.getElementById('answering-buttons');
const wordListTested = document.getElementById('word-list-tested');
const startBtn = document.getElementById('start-btn');

// データベース関連
const DB_NAME = 'MelonWordsDB';
const DB_VERSION = 1;
const STORE_NAME = 'melon_words';
let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = () => reject('データベースの読み込みに失敗しました。');
    });
}

async function getAllWords() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject('データの取得に失敗しました。');
    });
}

function updateWord(id, updatedData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = (event) => {
            const data = event.target.result;
            Object.assign(data, updatedData);
            const updateRequest = store.put(data);
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => reject('更新に失敗しました。');
        };
        request.onerror = () => reject('更新対象の取得に失敗しました。');
    });
}

function addTapToggle(itemDiv) {
    itemDiv.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        const tapped = document.querySelector('.word-card.tapped');
        if (tapped && tapped !== itemDiv) tapped.classList.remove('tapped');
        itemDiv.classList.toggle("tapped");
    });
}

// 配列をシャッフルする関数
function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}


// データ初期化
let allWords = [];
let usedWords = [];
let score = 0;
let totalQuestions = 0;
let currentQuestion = 0;
const subjects = {
    "noun": '名詞',
    "t-verb": '他動詞',
    "i-verb": '自動詞',
    "adjective": '形容詞',
    "adverb": '副詞',
    "idiom": '熟語'
};

// クイズの初期化
function resetQuiz() {
    score = 0;
    currentQuestion = 0;
    usedWords = [];
    currentNumber.textContent = '';
    testWord.textContent = '';
    testWordtype.textContent = '';
    testJudge.textContent = '';
    resultScore.textContent = '';
    resultAccuracy.textContent = '';
    answeringButtons.innerHTML = '';
    wordListTested.innerHTML = '';
}

// クイズ開始
async function startQuiz() {
    startBtn.disabled = true;
    resetQuiz();

    allWords = await getAllWords();
    if (allWords.length === 0) {
        alert('単語が登録されていません。');
        startBtn.disabled = false;
        return;
    }

    totalQuestions = Math.min(10, allWords.length);
    nextQuestion();
}

// 次の問題を生成
function nextQuestion() {
    if (currentQuestion >= totalQuestions) {
        finishQuiz();
        return;
    }

    const remainingWords = allWords.filter(w => !usedWords.includes(w.id));
    if (remainingWords.length === 0) {
        finishQuiz();
        return;
    }

    currentNumber.textContent = `No. ${currentQuestion + 1}`;

    const randomWord = remainingWords[Math.floor(Math.random() * remainingWords.length)];
    const targetSubject = randomWord.subject;

    const sameSubjectWords = remainingWords.filter(w => w.subject === targetSubject);
    const choiceCount = Math.min(4, sameSubjectWords.length);

    const selectedWords = shuffle(sameSubjectWords).slice(0, choiceCount);
    const correctWord = selectedWords[Math.floor(Math.random() * selectedWords.length)];

    // 表示更新
    testWord.textContent = correctWord.text;
    testWordtype.textContent = subjects[correctWord.subject];
    testJudge.textContent = '―――';
    answeringButtons.innerHTML = '';

    const shuffledChoices = shuffle(selectedWords.map(w => ({
        meaning: w.meaning,
        id: w.id,
        isCorrect: w.id === correctWord.id
    })));

    shuffledChoices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'bottom-button';
        btn.textContent = choice.meaning;
        btn.value = choice.isCorrect ? 'right' : 'wrong';
        btn.addEventListener('click', () => handleAnswer(choice, correctWord));
        answeringButtons.appendChild(btn);
    });

    // 「―― スキップ ――」ボタンを末尾に追加
    const skipBtn = document.createElement('button');
    skipBtn.className = 'bottom-button';
    skipBtn.textContent = '―― スキップ ――';
    skipBtn.value = 'wrong';
    skipBtn.addEventListener('click', () => handleAnswer({ isCorrect: false }, correctWord));
    answeringButtons.appendChild(skipBtn);

    usedWords.push(correctWord.id);
    currentQuestion++;
}

// 回答処理（修正版）
async function handleAnswer(selectedChoice, correctWord) {
    const isCorrect = selectedChoice.isCorrect;

    // すべての選択肢ボタンを無効化
    const buttons = answeringButtons.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);

    // 正誤判定表示、DB更新
    if (isCorrect) {
        testJudge.textContent = '正解！';
        correctWord.checked = true;
        await updateWord(correctWord.id, { checked: true });
        score++;
    } else {
        testJudge.textContent = '不正解です。';
        correctWord.checked = false;
        await updateWord(correctWord.id, { checked: false });
    }

    // #word-list-tested に追加
    const item = document.createElement("div");
    item.className = `word-card ${correctWord.subject}`;

    // 正解ならチェック済み、灰色にする

    item.style.backgroundColor = correctWord.checked ? "#f0f0f0" : `var(--bg-color-${correctWord.subject})`;
    item.style.borderColor = correctWord.checked ? "#808080" : `var(--main-color-${correctWord.subject})`;

    const infoDiv = document.createElement("div");
    infoDiv.className = "word-info";

    const wordDiv = document.createElement("div");
    wordDiv.textContent = correctWord.text;

    const meaningDiv = document.createElement("div");
    meaningDiv.classList.add("meaning");
    meaningDiv.textContent = correctWord.meaning;

    infoDiv.append(wordDiv, meaningDiv);

    const btnContainer = document.createElement("div");
    btnContainer.className = "buttons";

    const checkBtn = document.createElement("button");
    checkBtn.className = "check";
    checkBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    checkBtn.style.color = "green";

    // ボタンクリックでチェック状態切替（ユーザー操作用）
    checkBtn.addEventListener("click", async e => {
        e.stopPropagation();
        correctWord.checked = !correctWord.checked;

        item.style.backgroundColor = correctWord.checked ? "#f0f0f0" : `var(--bg-color-${correctWord.subject})`;
        item.style.borderColor = correctWord.checked ? "#808080" : `var(--main-color-${correctWord.subject})`;

        // DB更新
        await updateWord(correctWord.id, { checked: correctWord.checked });
    });

    btnContainer.appendChild(checkBtn);
    item.append(infoDiv, btnContainer);

    addTapToggle(item);
    wordListTested.prepend(item);

    // 次の問題へ（少し間を置く）
    setTimeout(nextQuestion, 500);
}

// クイズ終了
function finishQuiz() {
    answeringButtons.innerHTML = '';
    currentNumber.textContent = '終了！';
    testWord.textContent = '';
    testWordtype.textContent = '';
    testJudge.textContent = '';

    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    resultScore.textContent = `結果： ${score} / ${totalQuestions}問`;
    const accuracy = Math.round((score / totalQuestions) * 100);
    resultAccuracy.textContent = `正答率：${accuracy}%`;

    startBtn.disabled = false;
}

startBtn.addEventListener('click', startQuiz);

(async () => {
    db = await openDB();
})();
