// --- データ初期化 ---
let words = [];
let editingWord = null;
let activeFilters = new Set();
let isAZSort = false;
let isShuffled = false;
let displayWords = []; // 表示用コピー

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

// --- IndexedDB 初期化 ---
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
                store.createIndex("subject", "subject", { unique: false });
            }
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
        request.onerror = (event) => reject(event.target.error);
    });
}

// --- IndexedDB CRUD ---
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

// --- データ読み込み・保存 ---
async function loadData() {
    await openDB();
    words = await getAllWords();
    displayWords = [...words];
}

// --- localStorage → IndexedDB 移行 ---
async function migrateFromLocalStorage() {
    const oldData = localStorage.getItem("words");
    if (!oldData) return; // 移行対象なし

    try {
        const parsed = JSON.parse(oldData);
        if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`[移行] ${parsed.length} 件の単語を IndexedDB に移行します...`);
            for (const w of parsed) {
                await saveWord(w);
            }
            localStorage.removeItem("words");
            console.log("[移行完了] localStorage のデータを削除しました。");
        }
    } catch (e) {
        console.error("[移行エラー]", e);
    }
}

async function removeWord(word) {
    if (!word.id) return;
    await deleteWordById(word.id);
    words = words.filter(w => w.id !== word.id);
    displayWords = displayWords.filter(w => w.id !== word.id);
}

// --- ユーティリティ ---
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
function addTapToggle(itemDiv) {
    itemDiv.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        const tapped = document.querySelector('.word-card.tapped');
        if (tapped && tapped !== itemDiv) tapped.classList.remove('tapped');
        itemDiv.classList.toggle("tapped");
    });
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

    if (activeFilters.size > 0) {
        list = list.filter(w => activeFilters.has(w.subject));
    }

    list.sort((a, b) => a.checked - b.checked);

    if (list.length) {
        countWord.textContent = `該当する単語： ${list.length} 件`;
    } else {
        countWord.textContent = "該当する単語なし";
    }
    setTimeout(() => operationLog.textContent = "―――", 3000);

    wordList.innerHTML = "";

    list.forEach(w => {
        const item = document.createElement("div");
        item.className = `word-card ${w.subject}`;
        item.style.backgroundColor = w.checked ? "#f0f0f0" : `var(--bg-color-${w.subject})`;
        item.style.borderColor = w.checked ? "#808080" : `var(--main-color-${w.subject})`;

        const infoDiv = document.createElement("div");
        infoDiv.className = "word-info";
        const wordDiv = document.createElement("div");
        wordDiv.textContent = w.text;
        const meaningDiv = document.createElement("div");
        meaningDiv.classList.add("meaning");
        meaningDiv.textContent = w.meaning;
        infoDiv.append(wordDiv, meaningDiv);

        const btnContainer = document.createElement("div");
        btnContainer.className = "buttons";

        const checkBtn = document.createElement("button");
        checkBtn.className = "check";
        checkBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
        checkBtn.style.color = w.checked ? "green" : "#808080";
        checkBtn.addEventListener("click", async e => {
            e.stopPropagation();
            w.checked = !w.checked;
            await saveWord(w); // ✅ 個別保存
            renderWords();
        });

        const editBtn = document.createElement("button");
        editBtn.className = "edit";
        editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
        editBtn.style.color = w.checked ? "#808080" : "#007bff";
        editBtn.addEventListener("click", e => {
            e.stopPropagation();
            editText.value = w.text;
            editMeaning.value = w.meaning;
            editWordType.value = w.subject;
            editingWord = w;
            openModal(editModal);
        });

        const delBtn = document.createElement("button");
        delBtn.className = "delete";
        delBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        delBtn.style.color = w.checked ? "#808080" : "red";
        delBtn.addEventListener("click", async e => {
            e.stopPropagation();
            if (confirm(`単語「${w.text}」を削除しますか？`)) {
                await removeWord(w); // ✅ IndexedDB削除
                renderWords();
            }
        });

        btnContainer.append(checkBtn, editBtn, delBtn);
        item.append(infoDiv, btnContainer);
        addTapToggle(item);
        wordList.appendChild(item);
    });
}

// --- 検索 ---
function applySearch() {
    const keyword = wordSearch.value.trim().toLowerCase();
    countWord.textContent = "検索中";
    setTimeout(() => {
        if (keyword === "") {
            displayWords = [...words];
        } else {
            const startsWith = [];
            const includes = [];
            for (const w of words) {
                const text = w.text.toLowerCase();
                const meaning = w.meaning.toLowerCase();
                if (!text.includes(keyword) && !meaning.includes(keyword)) continue;
                if (text.startsWith(keyword) || meaning.startsWith(keyword)) startsWith.push(w);
                else includes.push(w);
            }
            displayWords = [...startsWith, ...includes];
        }
        renderWords();
    }, 10);
}

// --- CSV出力 ---
function exportAllToCsv() {
    if (!words || words.length === 0) {
        alert("出力する単語がありません。");
        return;
    }
    function esc(v) {
        if (v == null) return "";
        const s = String(v);
        return /["\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }
    let csv = "\uFEFF" + "単語,意味\r\n";
    for (const w of words) csv += `${esc(w.text)},${esc(w.meaning)}\r\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my_words_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}

// --- ボタン ---
document.getElementById("export-btn").addEventListener("click", exportAllToCsv);
document.getElementById("view-section").addEventListener("click", toggleSections);

// --- モーダル操作 ---
wordAdd.addEventListener("click", async () => {
    const text = wordText.value.trim();
    const meaning = wordMeaning.value.trim();
    const subject = wordType.value;
    if (!text) return alert("単語を入力してください。");
    if (!meaning) return alert("意味を入力してください。");

    const newWord = { text, meaning, subject, checked: false };
    const id = await saveWord(newWord); // ✅ IndexedDB保存
    newWord.id = id;
    words.push(newWord);
    displayWords.push(newWord);
    renderWords();
});

cancelEdit.addEventListener("click", () => closeModal(editModal));
confirmEdit.addEventListener("click", async () => {
    const text = editText.value.trim();
    const meaning = editMeaning.value.trim();
    const subject = editWordType.value;
    if (!text) return alert("単語を入力してください。");
    if (!meaning) return alert("意味を入力してください。");

    if (editingWord) {
        editingWord.text = text;
        editingWord.meaning = meaning;
        editingWord.subject = subject;
        await saveWord(editingWord); // ✅ 編集保存
        editingWord = null;
    }
    closeModal(editModal);
    renderWords();
});

shuffleBtn.addEventListener("click", () => {
    isShuffled = true;
    const unchecked = displayWords.filter(w => !w.checked);
    const checked = displayWords.filter(w => w.checked);
    shuffleArray(unchecked);
    displayWords = [...unchecked, ...checked];
    operationLog.textContent = "シャッフルされました。";
    renderWords();
});

clearBtn.addEventListener("click", async () => {
    const hasChecked = words.some(w => w.checked);
    if (!hasChecked) return alert("チェック済み単語はありません");
    if (!confirm("チェック済み単語を削除しますか？")) return;

    const checked = words.filter(w => w.checked);
    for (const w of checked) await removeWord(w);
    operationLog.textContent = "チェック済み単語は削除されました。";
    renderWords();
});

azSortBtn.addEventListener("click", () => {
    isAZSort = !isAZSort;
    isShuffled = false;
    const unchecked = displayWords.filter(w => !w.checked);
    const checked = displayWords.filter(w => w.checked);
    unchecked.sort((a, b) => isAZSort ? a.text.localeCompare(b.text) : b.text.localeCompare(a.text));
    displayWords = [...unchecked, ...checked];
    azSortBtn.innerHTML = isAZSort
        ? '<i class="fa-solid fa-arrow-down-z-a"></i> 降順に並び替え'
        : '<i class="fa-solid fa-arrow-down-a-z"></i> 昇順に並び替え';
    operationLog.textContent = isAZSort ? "昇順に並び替えられました。" : "降順に並び替えられました。";
    renderWords();
});

filterBtn.addEventListener("click", () => {
    filterCheckboxes.forEach(cb => cb.checked = activeFilters.has(cb.id));
    openModal(filterModal);
});
cancelFilterBtn.addEventListener("click", () => closeModal(filterModal));
confirmFilterBtn.addEventListener("click", () => {
    activeFilters.clear();
    filterCheckboxes.forEach(cb => { if (cb.checked) activeFilters.add(cb.id); });
    operationLog.textContent = "フィルターが適用されました。";
    closeModal(filterModal);
    renderWords();
});

// --- 検索イベント ---
wordSearch.addEventListener("input", applySearch);
wordSearch.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); applySearch(); }
});

// --- 初期読み込み ---
(async () => {
    await openDB();
    await migrateFromLocalStorage();
    await loadData();
    renderWords();
})();
