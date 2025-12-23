// --- データ初期化 ---
let words = [];
let editingWord = null;
let activeFilters = new Set();
let isAZSort = false;
let isShuffled = false;
let displayWords = []; // 表示用コピー

// --- DOM要素の取得 ---
const wrapper = document.getElementById("wrapper");
const wordListSection = document.getElementById("word-list-section");
const optionSection = document.getElementById("option-section");
const wordList = document.getElementById("word-list");

const shuffleBtn = document.getElementById("shuffle-btn");
const clearBtn = document.getElementById("clear-btn");
const azSortBtn = document.getElementById("az-sort-btn");
const filterBtn = document.getElementById("filter-btn");
const wordSearch = document.getElementById("word-search");
const countWord = document.getElementById("count-word-found");
const operationLog = document.getElementById("operation-log");

// CSV関連
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const csvFileInput = document.getElementById("csv-file-input");

// 単語追加
const wordAdd = document.getElementById("word-add");
const wordText = document.getElementById("word-text");
const wordMeaning = document.getElementById("word-meaning");
const wordType = document.getElementById("word-type");

// 編集モーダル
const editModal = document.getElementById("edit-modal");
const editText = document.getElementById("edit-text");
const editMeaning = document.getElementById("edit-meaning");
const editWordType = document.getElementById("edit-word-type");
const cancelEdit = document.getElementById("cancel-edit");
const confirmEdit = document.getElementById("confirm-edit");

// フィルターモーダル
const filterModal = document.getElementById("filter-modal");
const confirmFilterBtn = document.getElementById("confirm-filter");
const cancelFilterBtn = document.getElementById("cancel-filter");
const filterCheckboxes = filterModal.querySelectorAll('input[name="filter-type"]');

// --- IndexedDB 設定 ---
const DB_NAME = "MelonWordsDB";
const DB_VERSION = 1;
const STORE_NAME = "melon_words";
let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
                store.createIndex("text", "text", { unique: false });
            }
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
        request.onerror = (event) => reject(event.target.error);
    });
}

function saveWord(word) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(word);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e);
    });
}

function getAllWords() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e);
    });
}

function deleteWordById(id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject(e);
    });
}

// --- データの読み込み ---
async function loadData() {
    words = await getAllWords();
    displayWords = [...words];
}

// 以前の localStorage 版からの移行処理
async function migrateFromLocalStorage() {
    const oldData = localStorage.getItem("words");
    if (!oldData) return;
    try {
        const parsed = JSON.parse(oldData);
        if (Array.isArray(parsed)) {
            for (const w of parsed) {
                delete w.id; // 自動採番に任せる
                await saveWord(w);
            }
            localStorage.removeItem("words");
        }
    } catch (e) { console.error("Migration failed", e); }
}

async function removeWord(word) {
    if (word.id) await deleteWordById(word.id);
    words = words.filter(w => w.id !== word.id);
    displayWords = displayWords.filter(w => w.id !== word.id);
}

// --- UI ユーティリティ ---
function toggleSections() {
    const wordVisible = !wordListSection.classList.contains("hidden");
    wordListSection.classList.toggle("hidden", wordVisible);
    optionSection.classList.toggle("hidden", !wordVisible);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function openModal(modal) {
    modal.classList.remove("hidden");
    wrapper.classList.add("full-height");
    document.body.style.overflow = "hidden";
    document.querySelector(".button-group").style.display = "none";
}

function closeModal(modal) {
    modal.classList.add("hidden");
    wrapper.classList.remove("full-height");
    document.body.style.overflow = "";
    document.querySelector(".button-group").style.display = "flex";
}

// --- 単語描画 ---
function renderWords() {
    let list = [...displayWords];

    // 品詞フィルター適用
    if (activeFilters.size > 0) {
        list = list.filter(w => activeFilters.has(w.subject));
    }

    // 基本は「チェック済みを下に」
    list.sort((a, b) => a.checked - b.checked);

    countWord.textContent = list.length > 0 ? `該当する単語： ${list.length} 件` : "該当する単語なし";
    wordList.innerHTML = "";

    list.forEach(w => {
        const item = document.createElement("div");
        item.className = `word-card ${w.subject}`;
        item.style.backgroundColor = w.checked ? "#f0f0f0" : `var(--bg-color-${w.subject})`;
        item.style.borderColor = w.checked ? "#808080" : `var(--main-color-${w.subject})`;

        const infoDiv = document.createElement("div");
        infoDiv.className = "word-info";
        infoDiv.innerHTML = `<div>${w.text}</div><div class="meaning">${w.meaning}</div>`;

        const btnContainer = document.createElement("div");
        btnContainer.className = "buttons";

        // チェックボタン
        const checkBtn = document.createElement("button");
        checkBtn.className = "check";
        checkBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
        checkBtn.style.color = w.checked ? "green" : "#808080";
        checkBtn.onclick = async (e) => {
            e.stopPropagation();
            w.checked = !w.checked;
            await saveWord(w);
            renderWords();
        };

        // 編集ボタン
        const editBtn = document.createElement("button");
        editBtn.className = "edit";
        editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editText.value = w.text;
            editMeaning.value = w.meaning;
            editWordType.value = w.subject;
            editingWord = w;
            openModal(editModal);
        };

        // 削除ボタン
        const delBtn = document.createElement("button");
        delBtn.className = "delete";
        delBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        delBtn.onclick = async (e) => {
            e.stopPropagation();
            if (confirm(`「${w.text}」を削除しますか？`)) {
                await removeWord(w);
                renderWords();
            }
        };

        btnContainer.append(checkBtn, editBtn, delBtn);
        item.append(infoDiv, btnContainer);

        // タップでボタン表示
        item.onclick = (e) => {
            if (e.target.closest("button")) return;
            const alreadyTapped = document.querySelector('.word-card.tapped');
            if (alreadyTapped && alreadyTapped !== item) alreadyTapped.classList.remove('tapped');
            item.classList.toggle("tapped");
        };

        wordList.appendChild(item);
    });
}

// --- 検索 ---
function applySearch() {
    const keyword = wordSearch.value.trim().toLowerCase();
    if (keyword === "") {
        displayWords = [...words];
    } else {
        const startsWith = [];
        const includes = [];
        for (const w of words) {
            const t = w.text.toLowerCase();
            const m = w.meaning.toLowerCase();
            if (!t.includes(keyword) && !m.includes(keyword)) continue;
            if (t.startsWith(keyword) || m.startsWith(keyword)) startsWith.push(w);
            else includes.push(w);
        }
        displayWords = [...startsWith, ...includes];
    }
    renderWords();
}

// --- CSV機能 ---

// CSVエクスポート
function exportAllToCsv() {
    if (!words.length) return alert("単語がありません。");
    function esc(v) {
        const s = String(v || "");
        return /["\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }
    let csv = "\uFEFF単語,意味,品詞,チェック\r\n";
    for (const w of words) {
        csv += `${esc(w.text)},${esc(w.meaning)},${esc(w.subject)},${w.checked}\r\n`;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `melon_backup_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// CSVインポート
importBtn.addEventListener("click", () => csvFileInput.click());

csvFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const rows = parseCSV(ev.target.result);
        if (rows.length < 2) return alert("データがありません。");

        const validTypes = ["noun", "t-verb", "i-verb", "adjective", "adverb", "idiom"];
        let count = 0;

        for (let i = 1; i < rows.length; i++) {
            const [text, meaning, subject, checkedStr] = rows[i];
            if (text && meaning) {
                const newWord = {
                    text: text.trim(),
                    meaning: meaning.trim(),
                    subject: validTypes.includes(subject) ? subject : "noun",
                    checked: checkedStr === "true"
                };
                const id = await saveWord(newWord);
                newWord.id = id;
                words.push(newWord);
                count++;
            }
        }
        alert(`${count}件インポートしました。`);
        displayWords = [...words];
        renderWords();
        csvFileInput.value = "";
    };
    reader.readAsText(file, "UTF-8");
});

function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    const res = [];
    for (let line of lines) {
        if (!line.trim()) continue;
        const m = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (m) res.push(m.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"')));
    }
    return res;
}

// --- イベントリスナー ---

// 単語追加
wordAdd.addEventListener("click", async (e) => {
    e.preventDefault();
    const text = wordText.value.trim();
    const meaning = wordMeaning.value.trim();
    const subject = wordType.value;
    if (!text || !meaning || !subject) return alert("すべて入力してください。");

    const newWord = { text, meaning, subject, checked: false };
    const id = await saveWord(newWord);
    newWord.id = id;
    words.push(newWord);
    displayWords.push(newWord);
    wordText.value = ""; wordMeaning.value = "";
    operationLog.textContent = "単語を追加しました。";
    renderWords();
});

// 編集確定
confirmEdit.onclick = async () => {
    if (!editingWord) return;
    editingWord.text = editText.value.trim();
    editingWord.meaning = editMeaning.value.trim();
    editingWord.subject = editWordType.value;
    await saveWord(editingWord);
    closeModal(editModal);
    renderWords();
};
cancelEdit.onclick = () => closeModal(editModal);

// シャッフル
shuffleBtn.onclick = () => {
    const unchecked = displayWords.filter(w => !w.checked);
    const checked = displayWords.filter(w => w.checked);
    shuffleArray(unchecked);
    displayWords = [...unchecked, ...checked];
    operationLog.textContent = "シャッフルしました。";
    renderWords();
};

// まとめて削除
clearBtn.onclick = async () => {
    const targets = words.filter(w => w.checked);
    if (!targets.length || !confirm("チェック済みの単語をすべて削除しますか？")) return;
    for (const w of targets) await removeWord(w);
    operationLog.textContent = "削除しました。";
    renderWords();
};

// A-Zソート
azSortBtn.onclick = () => {
    isAZSort = !isAZSort;
    const unchecked = displayWords.filter(w => !w.checked);
    const checked = displayWords.filter(w => w.checked);
    unchecked.sort((a, b) => isAZSort ? a.text.localeCompare(b.text) : b.text.localeCompare(a.text));
    displayWords = [...unchecked, ...checked];
    azSortBtn.innerHTML = isAZSort ? '<i class="fa-solid fa-arrow-down-z-a"></i> 降順に並び替え' : '<i class="fa-solid fa-arrow-down-a-z"></i> 昇順に並び替え';
    renderWords();
};

// フィルター
filterBtn.onclick = () => {
    filterCheckboxes.forEach(cb => cb.checked = activeFilters.has(cb.id));
    openModal(filterModal);
};
confirmFilterBtn.onclick = () => {
    activeFilters.clear();
    filterCheckboxes.forEach(cb => { if (cb.checked) activeFilters.add(cb.id); });
    closeModal(filterModal);
    renderWords();
};
cancelFilterBtn.onclick = () => closeModal(filterModal);

// 検索
wordSearch.oninput = applySearch;
document.getElementById("view-section").onclick = toggleSections;
exportBtn.onclick = exportAllToCsv;

// --- 初期化 ---
(async () => {
    await openDB();
    await migrateFromLocalStorage();
    await loadData();
    renderWords();
})();
