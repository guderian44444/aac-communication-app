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
  specialVoice: 'normal',
  fontSize: 14,
  theme: 'warm'
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
  
  // 載入系統語音
  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }
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
  vocabulary.categories.forEach((cat, i) => {
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
  const voiceSelect = document.getElementById('voiceSelect');
  if (!voiceSelect) return;
  
  voiceSelect.innerHTML = '<option value="">自動偵測</option>';
  
  // Windows 內建語音性別映射
  const voiceGender = {
    'Hanhan': 'female', 'Yating': 'female', 'Zhiwei': 'male',
    'Hsiao-Chen': 'female', 'Hsiao-Wen': 'female',
    'Microsoft Xiaoxiao': 'female', 'Microsoft Yunxi': 'male',
    'Microsoft Yunjian': 'male', 'Microsoft Yan': 'male'
  };
  
  const groups = { female: [], male: [], other: [] };
  availableVoices.forEach(voice => {
    if (!voice.lang.startsWith('zh')) return;
    
    let gender = 'other';
    for (const [name, g] of Object.entries(voiceGender)) {
      if (voice.name.toLowerCase().includes(name.toLowerCase())) {
        gender = g;
        break;
      }
    }
    
    const emoji = gender === 'female' ? '👩' : gender === 'male' ? '👨' : '🗣️';
    const opt = document.createElement('option');
    opt.value = voice.voiceURI;
    opt.textContent = `${emoji} ${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(opt);
    
    if (gender === 'female') groups.female.push(voice);
    else if (gender === 'male') groups.male.push(voice);
    else groups.other.push(voice);
  });
}

// ===== 語音輸出 =====
function speakItem(item) {
  if (!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(item.text);
  utter.lang = 'zh-TW';
  
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
  const text = sentenceItems.map(i => i.text).join(' ');
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-TW';
  
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
  const utter = new SpeechSynthesisUtterance('你好呀，我是阿霖的溝通板');
  utter.lang = 'zh-TW';
  
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
  const voiceSelect = document.getElementById('voiceSelect');
  if (!voiceSelect || !voiceSelect.value) return;
  const selected = availableVoices.find(v => v.voiceURI === voiceSelect.value);
  if (selected) {
    utter.voice = selected;
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

  // Special voice selector
  document.getElementById('specialVoice').onchange = (e) => {
    settings.specialVoice = e.target.value;
    const voice = specialVoices[e.target.value] || specialVoices.normal;
    showToast(`已切換：${voice.label}`);
    previewVoice();
    saveSettings();
  };

  // Voice select (男女聲)
  document.getElementById('voiceSelect').onchange = (e) => {
    settings.selectedVoiceURI = e.target.value;
    showToast('語音已切換');
    previewVoice();
    saveSettings();
  };

  // Preview button
  document.getElementById('previewBtn').onclick = previewVoice;
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
