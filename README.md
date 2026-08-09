# AAC 圖形溝通軟體 - 視覺原型

為自閉兒童設計的圖形化增強替代溝通（AAC）軟體，讓使用者能點擊圖示組句並透過 TTS 語音輸出。

## 原型版本

| 版本 | 風格 | 適合對象 |
|------|------|---------|
| [001 - 柔和色彩版](001-calm-colorful/) | 溫暖柔和、低視覺壓力 | 3-7歲、高敏感兒童 |
| [002 - 結構網格版](002-structured-grid/) | 深色主題、結構明確 | 偏好規律、光敏感者 |
| [003 - 趣味故事版](003-playful-story/) | 童趣遊戲化、彩虹配色 | 需要動機激勵的兒童 |

## 如何使用

直接用瀏覽器打開各版本的 `index.html` 即可：

```bash
# Windows
start 001-calm-colorful/index.html
start 002-structured-grid/index.html
start 003-playful-story/index.html
```

## 核心功能（所有版本共通）

- **圖示點擊** → 加入句子
- **句子組建** → 多詞組合
- **TTS 語音** → 瀏覽器 SpeechSynthesis API（中文）
- **分類篩選** → 需求 / 情緒 / 人物 / 地點 / 動作
- **清除句子** → 一鍵重置

## 技術

- 純 HTML + CSS + Vanilla JavaScript
- 無需後端，離線可用
- Web Speech API 語音合成
