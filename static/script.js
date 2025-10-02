// --- データ初期化 ---
let words = [];
let editingIndex = null;
let isAZSort = true;       // true = A-Z, false = Z-A
let isShuffled = false;    // 現在ランダムソート中か
let activeFilters = new Set();
let displayMode = 0;        // 0=両方, 1=単語のみ, 2=意味のみ

const studyList = document.querySelector(".card-list");
const wordModal = document.getElementById("word-modal");
const materialSubject = document.getElementById("material-subject");
const wordText = document.getElementById("word-text");
const wordMeaning = document.getElementById("word-meaning");
const cancelAdd = document.getElementById("cancel-add");
const confirmAdd = document.getElementById("confirm-add");

const buttonGroup = document.querySelector(".button-group");
const sortBtn = document.getElementById("sort");
const shuffleBtn = document.getElementById("shuffle");
const clearBtn = document.getElementById("clear");
const filterBtn = document.getElementById("filter");
const rotateBtn = document.getElementById("rotate");

// フィルターモーダル
const filterModal = document.getElementById("filter-modal");
const confirmFilterBtn = document.getElementById("confirm-filter");
const cancelFilterBtn = document.getElementById("cancel-filter");
const filterCheckboxes = filterModal.querySelectorAll('input[name="filter-type"]');

// --- localStorage ---
function saveData() {
    localStorage.setItem("words", JSON.stringify(words));
}
function loadData() {
    const saved = localStorage.getItem("words");
    if (saved) {
        try { words = JSON.parse(saved); } 
        catch(e){ console.error(e); }
    }
}

// --- ユーティリティ ---
function shuffleArray(array){
    for(let i=array.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        [array[i],array[j]]=[array[j],array[i]];
    }
}

// --- 単語描画 ---
function renderWords() {
    let displayWords = [...words];

    // フィルター
    if (activeFilters.size > 0) {
        displayWords = displayWords.filter(w => activeFilters.has(w.subject));
    }

    // チェック済みを下
    const unchecked = displayWords.filter(w => !w.checked);
    const checked = displayWords.filter(w => w.checked);

    if (isShuffled && !isAZSort) {  // ランダム状態を維持
        shuffleArray(unchecked);
    } else {
        unchecked.sort((a,b) => isAZSort ? a.text.localeCompare(b.text) : b.text.localeCompare(a.text));
    }

    displayWords = [...unchecked, ...checked];

    studyList.innerHTML = "";
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < displayWords.length; i++) {
        const w = displayWords[i];
        const item = document.createElement("div");
        item.className = `word-card ${w.subject}`;
        if (w.checked) item.style.backgroundColor = "#f0f0f0";

        const iconDiv = document.createElement("div");
        iconDiv.className = "word-icon";
        iconDiv.innerHTML = '<i class="fa-solid fa-bookmark"></i>';
        if(w.checked) iconDiv.querySelector("i").style.color="#808080";

        const infoDiv = document.createElement("div");
        infoDiv.className = "word-info";

        const wordDiv = document.createElement("div"); 
        const meaningDiv = document.createElement("div"); 

        // rotateモードで「？」表示
        if (displayMode === 1) { // 単語のみ
            wordDiv.textContent = w.text;
            meaningDiv.innerHTML = `<i class="fa-solid fa-pencil"></i> ?`;
        } else if (displayMode === 2) { // 意味のみ
            wordDiv.textContent = "?";
            meaningDiv.innerHTML = `<i class="fa-solid fa-pencil"></i> ${w.meaning}`;
        } else { // 両方
            wordDiv.textContent = w.text;
            meaningDiv.innerHTML = `<i class="fa-solid fa-pencil"></i> ${w.meaning}`;
        }

        if(w.checked) {
            meaningDiv.querySelector("i").style.color="#808080";
        }

        const btnContainer = document.createElement("div");
        btnContainer.className="buttons";

        // チェックボタン
        const checkBtn = document.createElement("button");
        checkBtn.className = "check";
        checkBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
        checkBtn.style.color = w.checked ? "green" : "#808080";
        checkBtn.addEventListener("click", e => {
            e.stopPropagation();
            w.checked = !w.checked;
            saveData();
            renderWords();
        });

        // 編集ボタン
        const editBtn = document.createElement("button");
        editBtn.className="edit";
        editBtn.innerHTML='<i class="fa-solid fa-pen"></i>';
        editBtn.style.color = w.checked ? "#808080" : "#007bff";
        editBtn.addEventListener("click", e => {
            e.stopPropagation();
            materialSubject.value = w.subject;
            wordText.value = w.text;
            wordMeaning.value = w.meaning;
            editingIndex = words.indexOf(w);
            wordModal.classList.remove("hidden");
            document.body.style.overflow="hidden";
            buttonGroup.style.display="none";
        });

        // 削除ボタン
        const delBtn = document.createElement("button");
        delBtn.className="delete";
        delBtn.innerHTML='<i class="fa-solid fa-trash-can"></i>';
        delBtn.style.color = w.checked ? "#808080" : "red";
        delBtn.addEventListener("click", e=>{
            e.stopPropagation();
            if(confirm(`単語「${w.text}」を削除しますか？`)){
                words.splice(words.indexOf(w),1);
                saveData();
                renderWords();
            }
        });

        btnContainer.append(checkBtn, editBtn, delBtn);
        infoDiv.append(wordDiv, meaningDiv);
        item.append(iconDiv, infoDiv, btnContainer);

        item.addEventListener("click", e=>{
            if(e.target.closest("button")) return;
            item.classList.toggle("tapped");
        });

        fragment.appendChild(item);
    }

    studyList.appendChild(fragment);
}

// --- モーダル操作 ---
document.getElementById("add-word").addEventListener("click", ()=> {
    wordText.value = "";
    wordMeaning.value = "";
    materialSubject.value = "";
    editingIndex = null;
    wordModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    buttonGroup.style.display = "none";
});
cancelAdd.addEventListener("click", ()=> {
    wordModal.classList.add("hidden");
    document.body.style.overflow = "";
    buttonGroup.style.display = "flex";
});
confirmAdd.addEventListener("click", ()=> {
    const text = wordText.value.trim();
    const meaning = wordMeaning.value.trim();
    const subject = materialSubject.value;
    if(!text) return alert("単語を入力してください");
    if(editingIndex !== null){
        const w = words[editingIndex];
        w.text = text; w.meaning = meaning; w.subject = subject;
        editingIndex = null;
    } else {
        words.push({text, meaning, subject, checked:false});
    }
    saveData();
    wordModal.classList.add("hidden");
    document.body.style.overflow = "";
    buttonGroup.style.display = "flex";
    renderWords();
});

// --- ソート・シャッフル・チェック済み削除・フィルター ---
sortBtn.addEventListener("click", ()=>{
    isAZSort = !isAZSort;
    isShuffled = false;
    sortBtn.innerHTML = isAZSort ? '<i class="fa-solid fa-arrow-down-a-z"></i>' : '<i class="fa-solid fa-arrow-down-z-a"></i>';
    renderWords();
});
shuffleBtn.addEventListener("click", ()=>{
    isShuffled = true;
    isAZSort = false;  // ランダム状態
    renderWords();
});
clearBtn.addEventListener("click", ()=>{
    const hasChecked = words.some(w=>w.checked);
    if(!hasChecked) return alert("チェック済み単語はありません");
    if(confirm("チェック済み単語を削除しますか？")){
        words = words.filter(w=>!w.checked);
        saveData();
        renderWords();
    }
});
filterBtn.addEventListener("click", ()=>{
    filterCheckboxes.forEach(cb => cb.checked = activeFilters.has(cb.id));
    filterModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    buttonGroup.style.display = "none";
});
cancelFilterBtn.addEventListener("click", ()=>{
    filterModal.classList.add("hidden");
    document.body.style.overflow = "";
    buttonGroup.style.display = "flex";
});
confirmFilterBtn.addEventListener("click", ()=>{
    activeFilters.clear();
    filterCheckboxes.forEach(cb => { if(cb.checked) activeFilters.add(cb.id); });
    filterModal.classList.add("hidden");
    document.body.style.overflow = "";
    buttonGroup.style.display = "flex";
    renderWords();
});

// --- rotate機能 ---
rotateBtn.addEventListener("click", ()=>{
    displayMode = (displayMode + 1) % 3; 
    renderWords();
});

// --- Enterキー送信 ---
wordModal.addEventListener("keydown", e=>{
    if(e.key==="Enter"){ e.preventDefault(); confirmAdd.click(); }
});
filterModal.addEventListener("keydown", e=>{
    if(e.key==="Enter"){ e.preventDefault(); confirmFilterBtn.click(); }
});

// --- 初期読み込み ---
loadData();
renderWords();
