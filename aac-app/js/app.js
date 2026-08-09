/* ===== 阿霖的溝通板 - 核心 JS ===== */

// ===== 全域狀態 =====
let vocabulary = null;
let currentCategory = null;
let currentSubcategory = null;
let sentenceItems = [];
let favorites = JSON.parse(localStorage.getItem('aac_favorites') || '[]');
let showFavorites = false;

// ===== 擴充包 =====
let extensionsData = null;
let enabledExtensions = JSON.parse(localStorage.getItem('aac_extensions') || '[]');

// ===== 設定 =====
let settings = JSON.parse(localStorage.getItem('aac_settings') || '{}');
const defaultSettings = {
  speechRate: 0.9,
  speechPitch: 1.0,
  specialVoice: 'normal',
  fontSize: 14,
  theme: 'warm',
  lang: 'zh'
};
settings = { ...defaultSettings, ...settings };

// ===== 特殊語調預設 =====
const specialVoices = {
  normal:   { rateMul: 1.0, pitchAdd: 0.0, label: '🗣️ 一般' },
  chipmunk: { rateMul: 2.0, pitchAdd: 1.0, label: '🐿️ 奇奇蒂蒂' },
  bear:     { rateMul: 0.6, pitchAdd: -0.5, label: '🐻 大熊' },
  robot:    { rateMul: 1.0, pitchAdd: 0.0, label: '🤖 機器人' },
  baby:     { rateMul: 1.3, pitchAdd: 0.8, label: '👶 寶寶' },
  monster:  { rateMul: 0.5, pitchAdd: -0.8, label: '👾 怪獸' },
  ninja:    { rateMul: 2.2, pitchAdd: -0.3, label: '🥷 忍者' },
  cartoon:  { rateMul: 1.5, pitchAdd: 0.6, label: '🎪 卡通' }
};

// ===== 系統語音列表 =====
let availableVoices = [];

// ===== 快速詞 =====
const quickWords = [
  { text: "要", emoji: "🫡", ja: "欲しい", ko: "하고 싶어" },
  { text: "不要", emoji: "❌", ja: "だめです", ko: "안돼" },
  { text: "可以", emoji: "✅", ja: "できます", ko: "될까요" },
  { text: "謝謝", emoji: "🙏", ja: "ありがとう", ko: "감사합니다" },
  { text: "幫我", emoji: "🆘", ja: "助けて", ko: "도와줘" },
  { text: "還要", emoji: "➕", ja: "もっと", ko: "더" },
  { text: "夠了", emoji: "👌", ja: "十分", ko: "됐어요" },
  { text: "好", emoji: "👍", ja: "いいね", ko: "좋아요" },
  { text: "不好", emoji: "👎", ja: "だめ", ko: "안좋아요" },
  { text: "喜歡", emoji: "❤️", ja: "好き", ko: "좋아해요" },
  { text: "不喜歡", emoji: "💔", ja: "好きじゃない", ko: "안좋아해요" },
  { text: "等一下", emoji: "⏳", ja: "ちょっと待って", ko: "잠깐만" },
  { text: "對不起", emoji: "😔", ja: "ごめん", ko: "미안해요" }
];

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  loadVocabulary();
  applySettings();
  renderQuickBar();
  setupEventListeners();
  setupPracticeEvents();

  // 載入系統語音
  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }

  // 載入版本訊息
  loadVersionInfo();
});

// ===== 版本訊息 =====
const APP_VERSION = '1.2.0';
const GITHUB_REPO = 'guderian44444/aac-communication-app';

async function loadVersionInfo() {
  const versionText = document.getElementById('versionText');
  const updateDate = document.getElementById('updateDate');

  if (!versionText || !updateDate) return;

  versionText.textContent = `v${APP_VERSION}`;

  try {
    // 從 GitHub API 取得最新 commit 時間
    const resp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/commits/master?per_page=1`);
    if (resp.ok) {
      const data = await resp.json();
      const date = new Date(data.commit.committer.date);
      const formatted = date.toLocaleDateString('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
      updateDate.textContent = `📅 最後更新：${formatted}`;
    } else {
      updateDate.textContent = '📅 最後更新：v1.2.0';
    }
  } catch {
    updateDate.textContent = '📅 最後更新：v1.2.0';
  }
}

// ===== 載入詞庫 =====
async function loadVocabulary() {
  try {
    const resp = await fetch('data/vocabulary.json');
    vocabulary = await resp.json();
    // 載入擴充包
    await loadExtensions();
    renderCategories();
  } catch (e) {
    console.error('Failed to load vocabulary:', e);
    showToast('詞庫載入失敗');
  }
}

// ===== 載入擴充包 =====
async function loadExtensions() {
  try {
    const resp = await fetch('data/extensions.json');
    extensionsData = await resp.json();
    renderExtensionList();
  } catch (e) {
    console.error('Failed to load extensions:', e);
  }
}

// ===== 取得所有分類（基礎 + 擴充） =====
function getAllCategories() {
  if (!vocabulary) return [];
  let cats = [...vocabulary.categories];
  // 加入啟用的擴充包分類
  if (extensionsData) {
    extensionsData.extensions.forEach(ext => {
      if (enabledExtensions.includes(ext.id)) {
        cats.push(ext.category);
      }
    });
  }
  return cats;
}

// ===== 渲染擴充包列表 =====
function renderExtensionList() {
  const list = document.getElementById('extensionList');
  if (!list || !extensionsData) return;
  list.innerHTML = '';

  extensionsData.extensions.forEach(ext => {
    const item = document.createElement('label');
    item.className = 'extension-item' + (enabledExtensions.includes(ext.id) ? ' active' : '');
    item.innerHTML = `
      <input type="checkbox" ${enabledExtensions.includes(ext.id) ? 'checked' : ''} data-ext="${ext.id}">
      <span class="ext-icon">${ext.icon}</span>
      <div class="ext-info">
        <div class="ext-name">${ext.name}</div>
        <div class="ext-desc">${ext.description}</div>
      </div>
    `;
    const cb = item.querySelector('input');
    cb.onchange = () => {
      if (cb.checked) {
        if (!enabledExtensions.includes(ext.id)) {
          enabledExtensions.push(ext.id);
        }
      } else {
        enabledExtensions = enabledExtensions.filter(id => id !== ext.id);
        // 如果當前正在看這個擴充包分類，回到主畫面
        if (currentCategory && currentCategory.id === ext.id) {
          currentCategory = null;
          currentSubcategory = null;
          document.getElementById('backBtn').classList.remove('visible');
          document.getElementById('subcategoryNav').style.display = 'none';
          renderCategories();
          document.getElementById('iconGrid').innerHTML = '';
        }
      }
      localStorage.setItem('aac_extensions', JSON.stringify(enabledExtensions));
      item.classList.toggle('active', cb.checked);
      renderCategories();
      showToast(cb.checked ? `✅ 已啟用: ${ext.name}` : `❌ 已關閉: ${ext.name}`);
    };
    list.appendChild(item);
  });
}

// ===== 渲染分類導航 =====
function renderCategories() {
  const nav = document.getElementById('categoryNav');
  nav.innerHTML = '';
  const allCats = getAllCategories();
  allCats.forEach((cat, i) => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn slide-in';
    btn.style.animationDelay = (i * 0.05) + 's';
    btn.dataset.id = cat.id;
    btn.innerHTML = `<span class="cat-icon">${cat.icon}</span><span>${cat.name}</span>`;
    btn.onclick = () => selectCategory(cat);
    nav.appendChild(btn);
  });
}

// ===== 選擇分類 =====
function selectCategory(cat) {
  currentCategory = cat;
  currentSubcategory = null;
  showFavorites = false;
  document.getElementById('favoritesBar').classList.remove('has-favorites');

  // Update active state
  const allCats = getAllCategories();
  allCats.forEach(c => {
    const btn = document.querySelector(`.cat-btn[data-id="${c.id}"]`);
    if (btn) btn.classList.toggle('active', c.id === cat.id);
  });

  // Show subcategories
  renderSubcategories(cat);

  // Show back button
  document.getElementById('backBtn').classList.add('visible');

  // If only one subcategory, auto-select it
  if (cat.subcategories.length === 1) {
    selectSubcategory(cat.subcategories[0]);
  }
}

// ===== 渲染子分類導航 =====
function renderSubcategories(cat) {
  const nav = document.getElementById('subcategoryNav');
  nav.innerHTML = '';
  nav.style.display = 'flex';
  nav.classList.add('expand');
  setTimeout(() => nav.classList.remove('expand'), 300);

  cat.subcategories.forEach((sub, i) => {
    const btn = document.createElement('button');
    btn.className = 'sub-btn slide-in';
    btn.style.animationDelay = (i * 0.05) + 's';
    btn.dataset.id = sub.id;
    btn.innerHTML = `<span class="sub-icon">${sub.icon}</span><span>${sub.name}</span>`;
    btn.onclick = () => selectSubcategory(sub);
    nav.appendChild(btn);
  });
}

// ===== 選擇子分類 =====
function selectSubcategory(sub) {
  currentSubcategory = sub;

  // Update active state
  document.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.sub-btn[data-id="${sub.id}"]`).classList.add('active');

  // Render items
  renderItems(sub.items);
}

// ===== 渲染圖示項目 =====
function renderItems(items) {
  const grid = document.getElementById('iconGrid');
  grid.innerHTML = '';

  items.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'icon-card fade-in';
    card.style.animationDelay = (i * 0.03) + 's';
    card.innerHTML = `
      <span class="card-emoji">${item.emoji}</span>
      <span class="card-text">${item.text}</span>
    `;
    card.onclick = () => {
      // 水波動畫
      createRipple(card, event);
      // 彈跳動畫
      card.classList.add('bounce');
      setTimeout(() => card.classList.remove('bounce'), 400);
      addToSentence(item);
    };

    // 長按加入收藏
    let pressTimer;
    card.addEventListener('touchstart', (e) => {
      pressTimer = setTimeout(() => {
        toggleFavorite(item);
        // 震動回饋 (如果支援)
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    });
    card.addEventListener('touchend', () => clearTimeout(pressTimer));
    card.addEventListener('touchmove', () => clearTimeout(pressTimer));
    // 桌面版右鍵收藏
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      toggleFavorite(item);
    });

    grid.appendChild(card);
  });
}

// ===== 渲染收藏列 =====
function renderFavorites() {
  const bar = document.getElementById('favoritesBar');
  bar.innerHTML = '';

  if (favorites.length === 0) {
    bar.classList.remove('has-favorites');
    return;
  }

  bar.classList.add('has-favorites');
  favorites.forEach((fav, idx) => {
    const btn = document.createElement('button');
    btn.className = 'fav-btn';
    btn.innerHTML = `<span class="fav-emoji">${fav.emoji}</span><span>${fav.text}</span>`;
    btn.onclick = () => addToSentence(fav);
    bar.appendChild(btn);
  });
}

// ===== 渲染快速詞列 =====
function renderQuickBar() {
  const bar = document.getElementById('quickBar');
  bar.innerHTML = '';
  const lang = settings.lang || 'zh';
  quickWords.forEach(word => {
    const btn = document.createElement('button');
    btn.className = 'quick-btn';
    // 根據語言顯示翻譯
    let label = word.text;
    if (lang === 'ja' && word.ja) {
      label = `${word.text}（${word.ja}）`;
    } else if (lang === 'ko' && word.ko) {
      label = `${word.text}（${word.ko}）`;
    }
    btn.innerHTML = `<span class="quick-emoji">${word.emoji}</span><span>${label}</span>`;
    btn.onclick = () => addToSentence(word);
    bar.appendChild(btn);
  });
}

// ===== 加入句子 =====
function addToSentence(item) {
  sentenceItems.push(item);
  renderSentence();
  speakItem(item);
}

// ===== 渲染句子 =====
function renderSentence() {
  const bar = document.getElementById('sentenceBar');
  bar.querySelectorAll('.sentence-chip').forEach(c => c.remove());

  const lang = settings.lang || 'zh';

  const actions = bar.querySelector('.sentence-actions');
  sentenceItems.forEach((item, idx) => {
    const chip = document.createElement('div');
    chip.className = 'sentence-chip draggable-chip';
    chip.draggable = true;
    chip.dataset.index = idx;

    let displayText = item.text;
    if (lang === 'ja' && item.ja) {
      displayText = `${item.text}（${item.ja}）`;
    } else if (lang === 'ko' && item.ko) {
      displayText = `${item.text}（${item.ko}）`;
    }
    chip.innerHTML = `
      <span class="chip-grip">⠿</span>
      <span class="chip-emoji">${item.emoji}</span>
      <span>${displayText}</span>
      <span class="chip-remove" onclick="removeFromSentence(${idx})">✕</span>
    `;

    // Mouse drag events
    chip.addEventListener('dragstart', handleDragStart);
    chip.addEventListener('dragover', handleDragOver);
    chip.addEventListener('drop', handleDrop);
    chip.addEventListener('dragend', handleDragEnd);
    chip.addEventListener('dragenter', (e) => e.preventDefault());
    chip.addEventListener('dragleave', () => chip.classList.remove('drag-over'));

    // Touch events for mobile
    chip.addEventListener('touchstart', handleTouchStart, { passive: false });
    chip.addEventListener('touchmove', handleTouchMove, { passive: false });
    chip.addEventListener('touchend', handleTouchEnd);

    bar.insertBefore(chip, actions);
  });
}

// ===== 拖曳排序 (Mouse) =====
let dragIndex = null;

function handleDragStart(e) {
  dragIndex = +this.dataset.index;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  this.classList.remove('drag-over');
  const dropIndex = +this.dataset.index;
  if (dragIndex !== null && dragIndex !== dropIndex) {
    const moved = sentenceItems.splice(dragIndex, 1)[0];
    sentenceItems.splice(dropIndex, 0, moved);
    renderSentence();
  }
}

function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.sentence-chip').forEach(c => c.classList.remove('drag-over'));
  dragIndex = null;
}

// ===== 觸控拖曳排序 (Mobile) =====
let touchStartX = 0;
let touchStartY = 0;
let touchChip = null;
let touchClone = null;
let touchMoved = false;

function handleTouchStart(e) {
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchChip = this;
  touchMoved = false;
}

function handleTouchMove(e) {
  if (!touchChip) return;
  const t = e.touches[0];
  const dx = Math.abs(t.clientX - touchStartX);
  const dy = Math.abs(t.clientY - touchStartY);
  if (dx > 10 || dy > 10) {
    touchMoved = true;
    e.preventDefault();

    // Create floating clone if not already
    if (!touchClone) {
      touchClone = touchChip.cloneNode(true);
      touchClone.classList.add('touch-clone');
      document.body.appendChild(touchClone);
      touchChip.classList.add('touch-dragging');
    }
    touchClone.style.left = (t.clientX - 50) + 'px';
    touchClone.style.top = (t.clientY - 20) + 'px';

    // Highlight target
    const target = document.elementFromPoint(t.clientX, t.clientY);
    document.querySelectorAll('.sentence-chip').forEach(c => c.classList.remove('drag-over'));
    if (target && target.closest('.sentence-chip') && target.closest('.sentence-chip') !== touchChip) {
      target.closest('.sentence-chip').classList.add('drag-over');
    }
  }
}

function handleTouchEnd(e) {
  if (touchClone && touchMoved) {
    const t = e.changedTouches[0];
    const target = document.elementFromPoint(t.clientX, t.clientY);
    if (target && target.closest('.sentence-chip') && target.closest('.sentence-chip') !== touchChip) {
      const dropIndex = +target.closest('.sentence-chip').dataset.index;
      const fromIndex = +touchChip.dataset.index;
      if (fromIndex !== dropIndex) {
        const moved = sentenceItems.splice(fromIndex, 1)[0];
        sentenceItems.splice(dropIndex, 0, moved);
        renderSentence();
      }
    }
  }
  // Cleanup
  if (touchClone) {
    touchClone.remove();
    touchClone = null;
  }
  if (touchChip) {
    touchChip.classList.remove('touch-dragging');
    touchChip = null;
  }
  document.querySelectorAll('.sentence-chip').forEach(c => c.classList.remove('drag-over'));
}

// ===== 從句子移除 =====
function removeFromSentence(idx) {
  // 移除動畫
  const chips = document.querySelectorAll('.sentence-chip');
  if (chips[idx]) {
    chips[idx].classList.add('removing');
    setTimeout(() => {
      sentenceItems.splice(idx, 1);
      renderSentence();
    }, 250);
  } else {
    sentenceItems.splice(idx, 1);
    renderSentence();
  }
}

// ===== 載入系統語音 =====
function loadVoices() {
  availableVoices = speechSynthesis.getVoices();

  // 如果語音還沒載入，延遲再試
  if (availableVoices.length === 0) {
    setTimeout(loadVoices, 200);
    return;
  }

  console.log(`[TTS] 共載入 ${availableVoices.length} 個語音`);
}

// ===== 根據語言自動挑選最佳語音 =====
function getBestVoice(lang) {
  const voices = availableVoices;
  if (voices.length === 0) return null;

  const langMap = { zh: 'zh', ja: 'ja', ko: 'ko' };
  const prefix = langMap[lang] || 'zh';

  // 先找完全匹配的語系
  const matched = voices.filter(v => v.lang.toLowerCase().startsWith(prefix));
  if (matched.length === 0) return null;

  // 優先選女聲（關鍵字匹配）
  const femaleKeywords = ['hanhan', 'yating', 'xiaoxiao', 'huihui', 'hui-mei', 'tingting', 'female', '女', 'mei-jia', 'ting-ting', 'miku', 'haruka'];
  const maleKeywords = ['zhiwei', 'yunxi', 'yunjian', 'yan', 'male', '男', 'wei', 'chen', 'kunming', 'hanwei'];

  for (const v of matched) {
    const name = v.name.toLowerCase();
    for (const kw of femaleKeywords) {
      if (name.includes(kw)) return v;
    }
  }
  for (const v of matched) {
    const name = v.name.toLowerCase();
    for (const kw of maleKeywords) {
      if (name.includes(kw)) return v;
    }
  }

  // 沒有匹配的，回傳第一個
  return matched[0];
}

// ===== 語音輸出 =====
function speakItem(item) {
  if (!('speechSynthesis' in window)) return;
  const lang = settings.lang || 'zh';
  let text = item.text;
  let langCode = 'zh-TW';

  if (lang === 'ja' && item.ja) {
    text = item.ja;
    langCode = 'ja-JP';
  } else if (lang === 'ko' && item.ko) {
    text = item.ko;
    langCode = 'ko-KR';
  }

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = langCode;
  
  // 套用特殊語調
  const voice = specialVoices[settings.specialVoice] || specialVoices.normal;
  utter.rate = clamp(settings.speechRate * voice.rateMul, 0.1, 10);
  utter.pitch = clamp(settings.speechPitch + voice.pitchAdd, 0, 2);
  
  // 套用選定語音
  applySelectedVoice(utter);
  
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// ===== 讀出完整句子 =====
function speakSentence() {
  if (sentenceItems.length === 0) return;
  if (!('speechSynthesis' in window)) {
    showToast('瀏覽器不支援語音');
    return;
  }
  const lang = settings.lang || 'zh';
  const texts = sentenceItems.map(i => {
    if (lang === 'ja' && i.ja) return i.ja;
    if (lang === 'ko' && i.ko) return i.ko;
    return i.text;
  });
  const text = texts.join(' ');
  let langCode = 'zh-TW';
  if (lang === 'ja') langCode = 'ja-JP';
  if (lang === 'ko') langCode = 'ko-KR';

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = langCode;
  
  // 套用特殊語調
  const voice = specialVoices[settings.specialVoice] || specialVoices.normal;
  utter.rate = clamp(settings.speechRate * voice.rateMul, 0.1, 10);
  utter.pitch = clamp(settings.speechPitch + voice.pitchAdd, 0, 2);
  
  // 套用選定語音
  applySelectedVoice(utter);
  
  // 語音播放動畫
  const speakBtn = document.getElementById('speakBtn');
  speakBtn.classList.add('speaking');
  utter.onend = () => speakBtn.classList.remove('speaking');
  
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// ===== 預覽語音 =====
function previewVoice() {
  if (!('speechSynthesis' in window)) return;

  const lang = settings.lang || 'zh';
  let previewText = '你好呀，我是阿霖的溝通板';
  let previewLang = 'zh-TW';

  if (lang === 'ja') {
    previewText = 'こんにちは、アリンのコミュニケーションボードです';
    previewLang = 'ja-JP';
  } else if (lang === 'ko') {
    previewText = '안녕하세요, 알린 의사소통 보드입니다';
    previewLang = 'ko-KR';
  }

  const utter = new SpeechSynthesisUtterance(previewText);
  utter.lang = previewLang;
  
  // 套用特殊語調
  const voice = specialVoices[settings.specialVoice] || specialVoices.normal;
  utter.rate = clamp(settings.speechRate * voice.rateMul, 0.1, 10);
  utter.pitch = clamp(settings.speechPitch + voice.pitchAdd, 0, 2);
  
  // 套用選定語音
  applySelectedVoice(utter);
  
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// ===== 套用選定語音 =====
function applySelectedVoice(utter) {
  const lang = settings.lang || 'zh';
  const voice = getBestVoice(lang);
  if (voice) {
    utter.voice = voice;
  }
}

// ===== Clamp helper =====
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// ===== 清除句子 =====
function clearSentence() {
  if (sentenceItems.length === 0) return;
  // 全部 chip 移除動畫
  const chips = document.querySelectorAll('.sentence-chip');
  chips.forEach((chip, i) => {
    setTimeout(() => chip.classList.add('removing'), i * 50);
  });
  setTimeout(() => {
    sentenceItems = [];
    renderSentence();
  }, chips.length * 50 + 250);
}

// ===== 水波動畫 =====
function createRipple(element, e) {
  const ripple = document.createElement('span');
  ripple.className = 'ripple-circle';
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
  element.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

// ===== 加入收藏 =====
function toggleFavorite(item) {
  const idx = favorites.findIndex(f => f.text === item.text);
  if (idx >= 0) {
    favorites.splice(idx, 1);
    showToast(`已移除「${item.text}」`);
  } else {
    favorites.push(item);
    showToast(`已收藏「${item.text}」`);
  }
  localStorage.setItem('aac_favorites', JSON.stringify(favorites));
  renderFavorites();
}

// ===== 返回 =====
function goBack() {
  if (currentSubcategory) {
    // Go back to subcategory view (just clear items grid)
    currentSubcategory = null;
    document.getElementById('subcategoryNav').style.display = 'flex';
    document.getElementById('iconGrid').innerHTML = '';
    document.getElementById('backBtn').classList.remove('visible');
  } else if (currentCategory) {
    // Go back to category list
    currentCategory = null;
    currentSubcategory = null;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('subcategoryNav').style.display = 'none';
    document.getElementById('iconGrid').innerHTML = '';
    document.getElementById('backBtn').classList.remove('visible');
  }
}

// ===== 設定面板 =====
function toggleSettings() {
  const panel = document.getElementById('settingsPanel');
  const overlay = document.getElementById('overlay');
  panel.classList.toggle('open');
  overlay.classList.toggle('open');
}

// ===== 套用設定 =====
function applySettings() {
  document.getElementById('speechRate').value = settings.speechRate;
  document.getElementById('speechRateVal').textContent = settings.speechRate;
  document.getElementById('speechPitch').value = settings.speechPitch;
  document.getElementById('speechPitchVal').textContent = settings.speechPitch.toFixed(1);
  document.getElementById('specialVoice').value = settings.specialVoice || 'normal';
  document.getElementById('fontSize').value = settings.fontSize;
  document.getElementById('fontSizeVal').textContent = settings.fontSize + 'px';
  document.getElementById('themeSelect').value = settings.theme;
  document.getElementById('langSelect').value = settings.lang || 'zh';

  // Apply font size
  document.documentElement.style.setProperty('--font-size-sm', settings.fontSize + 'px');

  // Apply theme
  applyTheme(settings.theme);

  // Reload voices for selected language
  if (availableVoices.length > 0) {
    loadVoices();
  }
}

// ===== 主題切換 =====
function applyTheme(theme) {
  const root = document.documentElement;
  const themes = {
    warm: { primary: '#FF8A65', primaryLight: '#FFAB91', primaryDark: '#FF7043', bg: '#FFF8F0' },
    blue: { primary: '#56B4FF', primaryLight: '#81D4FA', primaryDark: '#29B6F6', bg: '#F0F8FF' },
    green: { primary: '#7BD856', primaryLight: '#A5D6A7', primaryDark: '#66BB6A', bg: '#F0FFF0' },
    purple: { primary: '#CE93D8', primaryLight: '#E1BEE7', primaryDark: '#BA68C8', bg: '#F8F0FF' }
  };
  const t = themes[theme] || themes.warm;
  root.style.setProperty('--primary', t.primary);
  root.style.setProperty('--primary-light', t.primaryLight);
  root.style.setProperty('--primary-dark', t.primaryDark);
  root.style.setProperty('--bg', t.bg);
}

// ===== Toast 通知 =====
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ===== 設定事件監聽 =====
function setupEventListeners() {
  // Speak button
  document.getElementById('speakBtn').onclick = speakSentence;
  // Clear button
  document.getElementById('clearBtn').onclick = clearSentence;
  // Settings button
  document.getElementById('settingsBtn').onclick = toggleSettings;
  // Favorites toggle
  document.getElementById('favToggleBtn').onclick = () => {
    showFavorites = !showFavorites;
    const favBtn = document.getElementById('favToggleBtn');
    if (showFavorites) {
      renderFavorites();
      document.getElementById('favoritesBar').classList.add('has-favorites');
      favBtn.classList.add('active');
      favBtn.title = `收藏 (${favorites.length}項)`;
      showToast(`⭐ 收藏列開啟 (${favorites.length}項)`);
    } else {
      document.getElementById('favoritesBar').classList.remove('has-favorites');
      favBtn.classList.remove('active');
      favBtn.title = '我的收藏';
    }
  };

  // Speech rate slider
  document.getElementById('speechRate').oninput = (e) => {
    settings.speechRate = parseFloat(e.target.value);
    document.getElementById('speechRateVal').textContent = settings.speechRate;
    saveSettings();
  };

  // Speech pitch slider
  document.getElementById('speechPitch').oninput = (e) => {
    settings.speechPitch = parseFloat(e.target.value);
    document.getElementById('speechPitchVal').textContent = settings.speechPitch.toFixed(1);
    saveSettings();
  };

  // Font size slider
  document.getElementById('fontSize').oninput = (e) => {
    settings.fontSize = parseInt(e.target.value);
    document.getElementById('fontSizeVal').textContent = settings.fontSize + 'px';
    document.documentElement.style.setProperty('--font-size-sm', settings.fontSize + 'px');
    saveSettings();
  };

  // Theme select
  document.getElementById('themeSelect').onchange = (e) => {
    settings.theme = e.target.value;
    applyTheme(settings.theme);
    saveSettings();
  };

  // Language select (🌐 語言)
  document.getElementById('langSelect').onchange = (e) => {
    settings.lang = e.target.value;
    localStorage.setItem('aac_settings', JSON.stringify(settings));
    loadVoices();
    renderQuickBar();
    renderSentence();
    const langNames = { zh: '中文', ja: '日文', ko: '韓文' };
    showToast(`🌐 已切換為${langNames[settings.lang]}`);
  };

  // Special voice selector
  document.getElementById('specialVoice').onchange = (e) => {
    settings.specialVoice = e.target.value;
    const voice = specialVoices[e.target.value] || specialVoices.normal;
    showToast(`已切換：${voice.label}`);
    previewVoice();
    saveSettings();
  };

  // Preview button
  document.getElementById('previewBtn').onclick = previewVoice;

  // Clear cache button
  document.getElementById('clearCacheBtn').onclick = () => {
    if (confirm('確定要清除快取並重新載入嗎？')) {
      // 清除 Service Worker 快取
      if ('caches' in window) {
        caches.keys().then(names => {
          Promise.all(names.map(name => caches.delete(name)))
            .then(() => {
              showToast('快取已清除，重新載入中...');
              setTimeout(() => {
                location.reload(true);
              }, 1000);
            });
        });
      } else {
        location.reload(true);
      }
    }
  };
}

// ===== 儲存設定 =====
function saveSettings() {
  localStorage.setItem('aac_settings', JSON.stringify(settings));
}

// ===== PWA: 註冊 Service Worker =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then((reg) => {
        console.log('✅ PWA Service Worker 已註冊', reg.scope);
      })
      .catch((err) => {
        console.log('⚠️ PWA 註冊失敗:', err);
      });
  });
}

// ===== 練習模式 =====
let practiceData = null;
let practiceStars = parseInt(localStorage.getItem('practice_stars') || '0');
let currentLevel = null;
let currentQuiz = [];
let quizIndex = 0;
let quizCorrect = 0;
let quizTotal = 10;
let scenarioIndex = null;
let dialogueStep = 0;

// ===== Emoji 對照表 =====
const emojiMap = {
  // 食物飲料
  '水': '💧', '牛奶': '🥛', '蘋果': '🍎', '香蕉': '🍌', '餅乾': '🍪',
  '麵包': '🍞', '飯': '🍚', '麵': '🍜', '肉': '🥩', '菜': '🥬',
  '果汁': '🧃', '漢堡': '🍔', '飲料': '🥤', '藥': '💊',
  // 家人
  '媽媽': '👩', '爸爸': '👨', '哥哥': '👦', '姐姐': '👧',
  '老師': '👩‍🏫', '同學': '🧑‍🎓', '醫生': '👨‍⚕️', '我': '🙋',
  // 用品
  '玩具': '🧸', '書': '📖', '筆': '✏️', '衣服': '👕', '鞋子': '👟',
  '襪子': '🧦', '帽子': '🧢', '包包': '👜',
  // 身體
  '頭': '🗣️', '手': '✋', '腳': '🦶', '眼睛': '👀', '耳朵': '👂',
  '嘴巴': '👄', '鼻子': '👃', '肚子': '🤰',
  // 顏色
  '紅色': '🔴', '藍色': '🔵', '黃色': '🟡', '綠色': '🟢', '白色': '⚪', '黑色': '⚫',
  // 動詞
  '吃': '🍽️', '喝': '🥤', '玩': '🎮', '看': '👀', '聽': '👂',
  '拿': '✋', '放': '📦', '走': '🚶', '跑': '🏃', '坐': '🪑',
  '站': '🧍', '睡': '😴', '洗': '🚿', '穿': '👔',
  // 其他
  '星星': '⭐', '電視': '📺', '滑梯': '🛝', '鞦韆': '🎠',
  '故事': '📚', '公園': '🏞️', '學校': '🏫',
};

function getEmoji(text) {
  return emojiMap[text] || '📝';
}

// ===== 載入練習資料 =====
async function loadPracticeData() {
  try {
    const resp = await fetch('data/practice.json');
    practiceData = await resp.json();
    updateStarCount();
  } catch (e) {
    console.error('Failed to load practice data:', e);
  }
}

function updateStarCount() {
  const el = document.getElementById('starCount');
  if (el) el.textContent = practiceStars;
}

// ===== 開啟/關閉練習 =====
async function openPractice() {
  document.getElementById('practiceOverlay').classList.add('open');
  showPracticeLevels();
  if (!practiceData) {
    await loadPracticeData();
  }
}

function closePractice() {
  document.getElementById('practiceOverlay').classList.remove('open');
}

function showPracticeLevels() {
  document.getElementById('practiceLevels').style.display = 'block';
  document.getElementById('practiceQuiz').style.display = 'none';
  document.getElementById('practiceScenario').style.display = 'none';
  document.getElementById('practiceComplete').style.display = 'none';
}

// ===== 開始 L1-L4 練習 =====
async function startQuiz(level) {
  if (!practiceData) {
    await loadPracticeData();
  }
  if (!practiceData) return;

  currentLevel = level;
  quizIndex = 0;
  quizCorrect = 0;

  // 根據等級生成題目
  const levels = practiceData.levels;
  if (level === 'L5') {
    startScenario();
    return;
  }

  currentQuiz = generateQuiz(level, levels);

  document.getElementById('practiceLevels').style.display = 'none';
  document.getElementById('practiceQuiz').style.display = 'block';
  document.getElementById('practiceScenario').style.display = 'none';
  document.getElementById('practiceComplete').style.display = 'none';

  showQuestion();
}

// ===== 生成題目 =====
function generateQuiz(level, levels) {
  const quizzes = [];
  // 映射 level key
  const levelKeys = {
    'L1': 'L1_單詞表達',
    'L2': 'L2_短語組合',
    'L3': 'L3_完整短句',
    'L4': 'L4_問句與連接'
  };
  const data = levels[levelKeys[level]];

  if (level === 'L1') {
    // L1: 看 emoji 選單詞
    const allWords = [];
    const nouns = data.nouns;
    for (const cat in nouns) {
      nouns[cat].forEach(w => allWords.push(w));
    }
    data.verbs.forEach(w => allWords.push(w));
    data.adjectives.forEach(w => allWords.push(w));

    // 隨機選 10 題
    const shuffled = allWords.sort(() => Math.random() - 0.5).slice(0, quizTotal);
    shuffled.forEach(word => {
      // 生成干擾選項
      const wrongOptions = allWords.filter(w => w !== word).sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [...wrongOptions, word].sort(() => Math.random() - 0.5);
      quizzes.push({
        type: 'l1',
        emoji: getEmoji(word),
        word: word,
        options: options,
        answer: word
      });
    });
  } else if (level === 'L2') {
    // L2: 短語填空
    const allPhrases = [];
    for (const cat in data.phrases) {
      data.phrases[cat].forEach(p => allPhrases.push(p));
    }
    const shuffled = allPhrases.sort(() => Math.random() - 0.5).slice(0, quizTotal);
    shuffled.forEach(phrase => {
      // 把最後 1-2 字挖空
      const blankLen = phrase.length >= 4 ? 2 : 1;
      const blank = phrase.slice(-blankLen);
      const visible = phrase.slice(0, -blankLen);
      // 從所有短語中取干擾選項
      const wrongOptions = allPhrases.filter(p => p !== phrase).sort(() => Math.random() - 0.5).slice(0, 3);
      // 取對應字數的結尾作為干擾
      const distractors = wrongOptions.map(p => p.slice(-blankLen)).filter(d => d !== blank);
      const options = [...distractors.slice(0, 3), blank].sort(() => Math.random() - 0.5);
      quizzes.push({
        type: 'fill',
        visible: visible,
        blank: blank,
        full: phrase,
        options: options,
        answer: blank
      });
    });
  } else if (level === 'L3' || level === 'L4') {
    // L3/L4: 句型選擇
    const allSentences = [];
    for (const cat in data.sentence_patterns) {
      data.sentence_patterns[cat].forEach(s => allSentences.push({ text: s, category: cat }));
    }
    const shuffled = allSentences.sort(() => Math.random() - 0.5).slice(0, quizTotal);
    shuffled.forEach(item => {
      // 挖空關鍵詞（最後 2-4 字）
      const text = item.text;
      const blankLen = Math.min(text.length - 2, Math.max(2, Math.floor(Math.random() * 3) + 2));
      const blank = text.slice(-blankLen);
      const visible = text.slice(0, -blankLen);
      // 干擾選項
      const wrongOptions = allSentences.filter(s => s.text !== text).sort(() => Math.random() - 0.5).slice(0, 3);
      const distractors = wrongOptions.map(s => s.text.slice(-blankLen)).filter(d => d !== blank);
      const options = [...distractors.slice(0, 3), blank].sort(() => Math.random() - 0.5);
      quizzes.push({
        type: 'fill',
        visible: visible,
        blank: blank,
        full: text,
        options: options,
        answer: blank,
        category: item.category
      });
    });
  }

  return quizzes;
}

// ===== 顯示題目 =====
function showQuestion() {
  if (quizIndex >= currentQuiz.length) {
    showComplete();
    return;
  }

  const q = currentQuiz[quizIndex];
  const content = document.getElementById('quizContent');
  const feedback = document.getElementById('quizFeedback');
  const nextBtn = document.getElementById('nextBtn');

  // 更新進度
  const progress = ((quizIndex) / currentQuiz.length) * 100;
  document.getElementById('progressFill').style.width = progress + '%';
  document.getElementById('progressText').textContent = `${quizIndex + 1}/${currentQuiz.length}`;

  feedback.style.display = 'none';
  nextBtn.style.display = 'none';

  if (q.type === 'l1') {
    // L1: 看 emoji 選詞
    content.innerHTML = `
      <div class="l1-prompt">${q.emoji}</div>
      <div class="l1-instruction">這個是什麼？</div>
      <div class="l1-options">
        ${q.options.map((opt, i) => `<button class="l1-option" data-value="${opt}">${opt}</button>`).join('')}
      </div>
    `;
    // 語音提示
    practiceSpeak(q.word);

    content.querySelectorAll('.l1-option').forEach(btn => {
      btn.onclick = () => checkAnswer(btn, btn.dataset.value, q.answer, q.word);
    });
  } else {
    // L2-L4: 填空
    content.innerHTML = `
      <div class="quiz-sentence">${q.visible}<span class="quiz-blank">____</span></div>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `<button class="quiz-option" data-value="${opt}">${opt}</button>`).join('')}
      </div>
    `;

    content.querySelectorAll('.quiz-option').forEach(btn => {
      btn.onclick = () => checkAnswer(btn, btn.dataset.value, q.answer, q.full);
    });
  }
}

// ===== 檢查答案 =====
function checkAnswer(btn, selected, answer, fullText) {
  const feedback = document.getElementById('quizFeedback');
  const nextBtn = document.getElementById('nextBtn');
  const allBtns = btn.parentElement.querySelectorAll('button');

  // 禁用所有按鈕
  allBtns.forEach(b => b.style.pointerEvents = 'none');

  if (selected === answer) {
    // 正確
    btn.classList.add('correct');
    quizCorrect++;
    practiceStars++;
    updateStarCount();
    localStorage.setItem('practice_stars', practiceStars.toString());

    const encouragements = practiceData.reward_phrases.encouragement;
    const msg = encouragements[Math.floor(Math.random() * encouragements.length)];
    feedback.className = 'quiz-feedback correct';
    feedback.innerHTML = `✅ ${msg}<br>🔊 ${fullText}`;
    feedback.style.display = 'block';

    practiceSpeak(fullText);
  } else {
    // 錯誤 - 標記正確答案
    allBtns.forEach(b => {
      if (b.dataset.value === answer) b.classList.add('correct');
    });
    btn.classList.add('wrong');

    const retries = practiceData.reward_phrases.retry;
    const msg = retries[Math.floor(Math.random() * retries.length)];
    feedback.className = 'quiz-feedback wrong';
    feedback.innerHTML = `💪 ${msg}<br>答案是：${answer}`;
    feedback.style.display = 'block';

    practiceSpeak(answer);
  }

  nextBtn.style.display = 'block';
}

// ===== 下一題 =====
function nextQuestion() {
  quizIndex++;
  showQuestion();
}

// ===== 完成畫面 =====
function showComplete() {
  document.getElementById('practiceQuiz').style.display = 'none';
  document.getElementById('practiceComplete').style.display = 'block';

  const score = document.getElementById('completeScore');
  const stars = document.getElementById('completeStars');

  score.textContent = `答對 ${quizCorrect}/${currentQuiz.length} 題`;

  // 星星評級
  const ratio = quizCorrect / currentQuiz.length;
  let starCount = 0;
  if (ratio >= 0.9) starCount = 3;
  else if (ratio >= 0.7) starCount = 2;
  else if (ratio >= 0.4) starCount = 1;

  stars.textContent = '⭐'.repeat(starCount) + '☆'.repeat(3 - starCount);

  // 語音回饋
  if (ratio >= 0.7) {
    practiceSpeak('太棒了，你做得很好！');
  } else {
    practiceSpeak('繼續加油，你可以的！');
  }
}

// ===== L5 情境對話 =====
async function startScenario() {
  if (!practiceData) {
    await loadPracticeData();
  }
  if (!practiceData) return;

  document.getElementById('practiceLevels').style.display = 'none';
  document.getElementById('practiceQuiz').style.display = 'none';
  document.getElementById('practiceScenario').style.display = 'block';
  document.getElementById('practiceComplete').style.display = 'none';

  const scenarios = practiceData.levels['L5_情境對話'].scenarios;
  const grid = document.getElementById('scenarioGrid');
  grid.innerHTML = '';

  const scenarioIcons = {
    '餐廳點餐': '🍔',
    '學校上課': '🏫',
    '商店買東西': '🛒',
    '身體不舒服': '🏥',
    '公園玩耍': '🎠',
    '洗澡睡覺': '🛁'
  };

  Object.keys(scenarios).forEach(name => {
    const card = document.createElement('button');
    card.className = 'scenario-card';
    card.innerHTML = `
      <span class="scenario-icon">${scenarioIcons[name] || '💬'}</span>
      <span class="scenario-name">${name}</span>
    `;
    card.onclick = () => startDialogue(name, scenarios[name]);
    grid.appendChild(card);
  });

  document.getElementById('scenarioSelect').style.display = 'block';
  document.getElementById('scenarioDialogue').style.display = 'none';
}

function startDialogue(name, scenario) {
  scenarioIndex = name;
  dialogueStep = 0;

  document.getElementById('scenarioSelect').style.display = 'none';
  document.getElementById('scenarioDialogue').style.display = 'block';

  document.getElementById('dialogueLocation').textContent = `📍 ${scenario.location}`;
  document.getElementById('dialogueMessages').innerHTML = '';

  showDialogueStep(scenario);
}

function showDialogueStep(scenario) {
  const messages = document.getElementById('dialogueMessages');
  const choices = document.getElementById('dialogueChoices');
  choices.innerHTML = '';

  // 顯示對話
  const dialogue = scenario.dialogue;
  for (let i = 0; i <= dialogueStep && i < dialogue.length; i++) {
    const msg = dialogue[i];
    const isSelf = msg.speaker === '阿霖';

    if (!msg.options) {
      // NPC 的台詞
      const div = document.createElement('div');
      div.className = `dialogue-msg ${isSelf ? 'self' : 'other'}`;
      div.innerHTML = `
        <div class="msg-bubble">
          ${!isSelf ? `<div class="msg-speaker">${msg.speaker}</div>` : ''}
          ${msg.text}
        </div>
      `;
      messages.appendChild(div);

      // NPC 語音
      if (!isSelf) {
        practiceSpeak(msg.text);
      }
    } else {
      // 阿霖的選擇 - 顯示選項
      msg.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'dialogue-choice';
        btn.textContent = opt;
        btn.onclick = () => {
          // 加入選擇到對話
          const div = document.createElement('div');
          div.className = 'dialogue-msg self';
          div.innerHTML = `<div class="msg-bubble">${opt}</div>`;
          messages.appendChild(div);

          // 語音
          practiceSpeak(opt);

          // 加分
          practiceStars++;
          updateStarCount();
          localStorage.setItem('practice_stars', practiceStars.toString());

          // 隱藏選項，進到下一步
          choices.innerHTML = '';
          dialogueStep++;

          if (dialogueStep < dialogue.length) {
            setTimeout(() => showDialogueStep(scenario), 500);
          } else {
            // 對話完成
            setTimeout(() => {
              showScenarioComplete();
            }, 800);
          }
        };
        choices.appendChild(btn);
      });
      break;
    }
  }

  // 滾動到底部
  messages.scrollTop = messages.scrollHeight;
}

function showScenarioComplete() {
  document.getElementById('scenarioDialogue').style.display = 'none';
  document.getElementById('practiceComplete').style.display = 'block';

  const score = document.getElementById('completeScore');
  const stars = document.getElementById('completeStars');

  score.textContent = `${scenarioIndex} 對話完成！`;
  stars.textContent = '⭐⭐⭐';

  practiceSpeak('對話完成，你做得很好！');
}

function backToScenarios() {
  document.getElementById('scenarioDialogue').style.display = 'none';
  document.getElementById('scenarioSelect').style.display = 'block';
}

// ===== 練習語音 =====
function practiceSpeak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-TW';
  const voice = specialVoices[settings.specialVoice] || specialVoices.normal;
  utter.rate = clamp(settings.speechRate * voice.rateMul, 0.1, 10);
  utter.pitch = clamp(settings.speechPitch + voice.pitchAdd, 0, 2);
  applySelectedVoice(utter);
  speechSynthesis.speak(utter);
}

// ===== 練習模式事件監聽 =====
function setupPracticeEvents() {
  // 開啟練習
  document.getElementById('practiceBtn').onclick = openPractice;

  // 關閉
  document.getElementById('practiceCloseBtn').onclick = closePractice;

  // 等級選擇
  document.querySelectorAll('.level-card').forEach(card => {
    card.onclick = () => startQuiz(card.dataset.level);
  });

  // 下一題
  document.getElementById('nextBtn').onclick = nextQuestion;

  // 完成畫面按鈕
  document.getElementById('completeRestartBtn').onclick = () => {
    if (currentLevel === 'L5') {
      startScenario();
    } else {
      startQuiz(currentLevel);
    }
  };

  document.getElementById('completeBackBtn').onclick = () => {
    if (currentLevel === 'L5') {
      startScenario();
    } else {
      showPracticeLevels();
    }
  };

  // 對話返回
  document.getElementById('dialogueBackBtn').onclick = backToScenarios;
}
