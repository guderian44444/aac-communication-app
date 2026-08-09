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
  { text: "可以", emoji: "✅", ja: "できます", ko: "될까요" },
  { text: "不要", emoji: "❌", ja: "だめです", ko: "안돼" },
  { text: "謝謝", emoji: "🙏", ja: "ありがとう", ko: "감사합니다" },
  { text: "幫我", emoji: "🆘", ja: "助けて", ko: "도와줘" },
  { text: "要", emoji: "🫡", ja: "欲しい", ko: "하고 싶어" },
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
  // Remove existing chips
  bar.querySelectorAll('.sentence-chip').forEach(c => c.remove());

  const lang = settings.lang || 'zh';

  // Add chips before actions
  const actions = bar.querySelector('.sentence-actions');
  sentenceItems.forEach((item, idx) => {
    const chip = document.createElement('div');
    chip.className = 'sentence-chip';
    let displayText = item.text;
    if (lang === 'ja' && item.ja) {
      displayText = `${item.text}（${item.ja}）`;
    } else if (lang === 'ko' && item.ko) {
      displayText = `${item.text}（${item.ko}）`;
    }
    chip.innerHTML = `
      <span class="chip-emoji">${item.emoji}</span>
      <span>${displayText}</span>
      <span class="chip-remove" onclick="removeFromSentence(${idx})">✕</span>
    `;
    bar.insertBefore(chip, actions);
  });
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
