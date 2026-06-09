# 三方案设计评审工作台

评审工作台是静态 HTML 审阅台，不是事件 server。用户在对话中回复“选 A/B/C”或合并意见。

## 文件

生成到 `docs/design/<slug>/`：

- `workbench.html`
- `option-a.html`
- `option-b.html`
- `option-c.html`

模板来源：

- 优先使用本 skill 自带模板：`assets/templates/kami-workbench/workbench.html`
- 优先使用本 skill 自带模板：`assets/templates/kami-workbench/option.html`
- 优先使用本 skill 自带模板：`assets/templates/kami-workbench/workbench.css`
- 开发态 repo-root fallback：`templates/kami-workbench/*`

## 样式边界

- `workbench.html` 使用 Kami 风格外壳：纸感背景、serif-led hierarchy、ink-blue accent、克制阅读排版。
- 三个方案必须放在 iframe 中。
- iframe 内设计稿必须服从目标项目 `DESIGN.md`，不能继承 Kami 的纸感样式。
- 方案文件应内联或链接自己的目标项目样式，不依赖 workbench.css。

## 评审工作台必须包含

- 本次需求摘要。
- 目标界面与变更边界摘要。
- `PRODUCT.md` / `DESIGN.md` 引用和版本或读取日期。
- 三个方案的设计意图。
- 三个可交互模拟器。
- 每个方案的强调、弱化、风险、适用场景。
- 选择提示：在对话中回复选 A/B/C，合并某些部分，或要求重做。

## 方案质量基线

- 三个方案必须是真正不同的信息架构、层级、密度、状态处理或交互节奏，不是换色。
- 每个方案至少体现一个关键交互或关键状态。
- 没真实数据时明确标注占位，不编数据。
- 不能用“圆角卡片 + 彩色左边框”等廉价模板化强调。
- 不用占位图、emoji、文本符号、CSS art、手写 SVG 或近似图形替代真实资产。
- 文本不能溢出，移动和桌面模拟器不能互相挤压。

## 静态交互

允许在方案内使用少量内联 JS 做本地状态切换，例如：

- tabs
- toggle
- focus/error/success 状态按钮
- disclosure

不要创建事件记录 server。选择仍由用户在对话中表达。

## 输出后检查

生成后人工或浏览器打开 `workbench.html`：

- 三个 iframe 都加载。
- iframe 尺寸稳定，可滚动。
- 基础交互可点击。
- 文案说明不会遮挡模拟器。
- 外壳像审阅文档，方案像目标产品 UI。
