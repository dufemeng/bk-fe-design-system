# 三方案设计评审工作台

本阶段只生成静态评审工作台：

```text
docs/design/<slug>/
  workbench.html
  option-a.html
  option-b.html
  option-c.html
```

模板优先使用本 skill 自带 `assets/templates/kami-workbench/`，开发态可用 repo-root `templates/kami-workbench/`。

## 样式边界

- `workbench.html` 使用 Kami 风格外壳：纸感背景、serif-led hierarchy、ink-blue accent、克制阅读排版。
- 三个方案放在 iframe 中。
- iframe 内设计稿服从目标项目 `DESIGN.md`，不能继承 Kami 纸感样式。
- 方案文件应自带目标产品 UI 样式，不依赖 `workbench.css`。

## 质量基线

- 三个方案来自 `evidence/directions.json`，不得临时改方向。
- 三个方案必须有真实的信息架构、层级、密度、状态处理或交互节奏差异。
- 每个方案至少体现一个关键交互或关键状态。
- 没真实数据时明确标注占位，不编数据。
- 不用占位图、emoji、文本符号、CSS art、手写 SVG 或近似图形替代真实资产。
- 文本不能溢出，移动和桌面模拟器不能互相挤压。

## 生成后

检查三个 iframe 可加载、可滚动，基础交互可点击。然后重跑 gate。
