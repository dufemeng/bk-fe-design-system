# 轻量方案评审工作台

本阶段只生成静态评审工作台，用于让用户确认后续生码方向。工作台不是最终高保真设计稿资产；它承载方案卡、局部示意和实现约束摘要。

```text
docs/design/<slug>/
  workbench.html
  workbench.css
  option-a.html
  option-b.html
  option-c.html
```

用 `node <bfds-design-skill-dir>/scripts/bfds.mjs workbench <slug> --scaffold` 生成脚手架；runtime 模板在安装后随 skill 注入，模型不需要读取模板文件。

## 样式边界

- `workbench.html` 使用 Kami 风格外壳：纸感背景、serif-led hierarchy、ink-blue accent、克制阅读排版。
- 三个方案放在 iframe 中。
- iframe 内是目标区域的局部方案预览，服从目标项目 `DESIGN.md`，不能继承 Kami 纸感样式。
- 方案文件应自带目标产品 UI 样式，不依赖 `workbench.css`。
- 局部改造时，未改区域只能作为截图基底、结构上下文或锁定说明存在；不要重画整页。

## 质量基线

- 三个方案来自 `evidence/directions.json`，不得临时改方向。
- 三个方案必须有真实的信息架构、层级、密度、状态处理、交互节奏或实现策略差异。
- 每个方案至少体现一个关键交互或关键状态，并展示实现约束摘要。
- 每个方案必须标明 `DESIGN.md` 规则引用、会改什么、不会改什么、实现风险和自审检查点。
- 没真实数据时明确标注占位，不编数据。
- 不用占位图、emoji、文本符号、CSS art、手写 SVG 或近似图形替代真实资产。
- 文本不能溢出，移动和桌面模拟器不能互相挤压。
- 不承诺“完整页面高保真”，除非本阶段已有运行态页面证据和目标区域 baseline。

## 生成后

检查三个 iframe 可加载、可滚动，基础交互可点击。然后运行 `node <bfds-design-skill-dir>/scripts/bfds.mjs workbench <slug> --validate`，继续读取返回的 next-card。
