/* ===== 阿霖的溝通板 - 核心 JS ===== */

// ===== 全域狀態 =====
let vocabulary = null;
let currentCategory = null;
let currentSubcategory = null;
let sentenceItems = [];
let favorites = JSON.parse(localStorage.getItem('aac_favorites') || '[]');
let showFavorites = false;

// ===== 設定 =====
let settings = JSON.parse(localStorage.getItem('aac_settings') || '{}');
const defaultSettings = {
  speechRate: 0.9,
  speechPitch: 1.0,
  fontSize: 14,
  theme: 'warm'
};
settings = { ...defaultSettings, ...settings };

// ===== 快速詞 =====
const quickWords = [
  { text: "可以", emoji: "✅" },
  { text: "不要", emoji: "❌" },
  { text: "謝謝", emoji: "🙏" },
  { text: "幫我", emoji: "🆘" },
  { text: "還要", emoji: "➕" },
  { text: "夠了", emoji: "👌" },
  { text: "好", emoji: "👍" },
  { text: "不好", emoji: "👎" },
  { text: "喜歡", emoji: "❤️" },
  { text: "不喜歡", emoji: "💔" },
  { text: "等一下", emoji: "⏳" },
  { text: "對不起", emoji: "😔" }
];

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  loadVocabulary();
  applySettings();
  renderQuickBar();
  setupEventListeners();
});

// ===== 載入詞庫 =====
async function loadVocabulary() {
  try {
    const resp = await fetch('data/vocabulary.json');
    vocabulary = await resp.json();
    renderCategories();
  } catch (e) {
    console.error('Failed to load vocabulary:', e);
    showToast('詞庫載入失敗');
  }
}

// ===== 渲染分類導航 =====
function renderCategories() {
  const nav = document.getElementById('categoryNav');
  nav.innerHTML = '';
  vocabulary.categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
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
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.cat-btn[data-id="${cat.id}"]`).classList.add('active');

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

  cat.subcategories.forEach(sub => {
    const btn = document.createElement('button');
    btn.className = 'sub-btn';
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

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'icon-card';
    card.innerHTML = `
      <span class="card-emoji">${item.emoji}</span>
      <span class="card-text">${item.text}</span>
    `;
    card.onclick = () => addToSentence(item);
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
  quickWords.forEach(word => {
    const btn = document.createElement('button');
    btn.className = 'quick-btn';
    btn.innerHTML = `<span class="quick-emoji">${word.emoji}</span><span>${word.text}</span>`;
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

  // Add chips before actions
  const actions = bar.querySelector('.sentence-actions');
  sentenceItems.forEach((item, idx) => {
    const chip = document.createElement('div');
    chip.className = 'sentence-chip';
    chip.innerHTML = `
      <span class="chip-emoji">${item.emoji}</span>
      <span>${item.text}</span>
      <span class="chip-remove" onclick="removeFromSentence(${idx})">✕</span>
    `;
    bar.insertBefore(chip, actions);
  });
}

// ===== 從句子移除 =====
function removeFromSentence(idx) {
  sentenceItems.splice(idx, 1);
  renderSentence();
}

// ===== 語音輸出 =====
function speakItem(item) {
  if (!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(item.text);
  utter.lang = 'zh-TW';
  utter.rate = settings.speechRate;
  utter.pitch = settings.speechPitch;
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
  const text = sentenceItems.map(i => i.text).join(' ');
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-TW';
  utter.rate = settings.speechRate;
  utter.pitch = settings.speechPitch;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// ===== 清除句子 =====
function clearSentence() {
  sentenceItems = [];
  renderSentence();
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
  document.getElementById('fontSize').value = settings.fontSize;
  document.getElementById('fontSizeVal').textContent = settings.fontSize + 'px';
  document.getElementById('themeSelect').value = settings.theme;

  // Apply font size
  document.documentElement.style.setProperty('--font-size-sm', settings.fontSize + 'px');

  // Apply theme
  applyTheme(settings.theme);
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
    if (showFavorites) {
      renderFavorites();
      document.getElementById('favoritesBar').classList.add('has-favorites');
    } else {
      document.getElementById('favoritesBar').classList.remove('has-favorites');
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
