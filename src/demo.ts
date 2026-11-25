import type { Language } from './settings';

const en = `---
title: Notes on making
author: "@PrismCard"
tag: THE MAKER’S NOTES
theme: editorial
---

# Good ideas deserve good cards.

> A small field guide to turning your notes into something worth sharing.

#Markdown #Design #OpenSource

---

## Give each card one job.

Start with the thing your reader should remember. Make it ==clear at a glance==.

1. **Lead with the point.** A strong heading earns the next second.
2. *Add one useful detail.* A concrete example makes it stick.
3. ~~Fill the space.~~ Give the good parts room to breathe.

#Writing #VisualThinking

---

## Show the recipe.

Use a fenced block to make a small idea reusable.

\`\`\`ts
const notes = ["Capture", "Edit", "Share"];
const cards = notes.map((title, i) => ({
  page: i + 1,
  title,
}));
\`\`\`

> Keep the snippet short enough to read on a phone.

#TypeScript #Workflow

---

## Ready to share?

| Format | Best for |
| :--- | :--- |
| Portrait | A swipeable series |
| Square | A single feed post |
| Wide | A slide or banner |

- [x] Pick a theme
- [x] Check each card
- [ ] Export your deck

#Publish #PrismCard`;

const zh = `---
title: 创作手记
author: "@PrismCard"
tag: 创作手记
theme: editorial
---

# 把好点子做成好卡片。

> 从一页笔记出发，做一组值得分享的卡片。

#Markdown #设计 #开源

---

## 一张卡，只讲一件事。

先想好读者应该记住什么，再把它写得==一眼就懂==。

1. **标题先说重点。** 让读者愿意多停留一秒。
2. *给一个具体例子。* 把抽象的想法讲清楚。
3. ~~把页面填满。~~ 给重要的内容留一点空间。

#写作 #视觉表达

---

## 把方法写下来。

短小的代码示例，让一个想法可以直接复用。

\`\`\`ts
const notes = ["记录", "整理", "分享"];
const cards = notes.map((title, i) => ({
  page: i + 1,
  title,
}));
\`\`\`

> 代码短一点，在手机上也能看清。

#TypeScript #工作流

---

## 准备好分享了吗？

| 比例 | 适合 |
| :--- | :--- |
| 竖版 | 滑动浏览的组图 |
| 方形 | 单张动态配图 |
| 横版 | 幻灯片或横幅 |

- [x] 选择主题
- [x] 检查每张卡片
- [ ] 导出整组图片

#发布 #PrismCard`;

export const demos: Record<Language, string> = { en, zh };
