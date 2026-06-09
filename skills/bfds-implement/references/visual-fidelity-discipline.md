# Visual Fidelity Discipline

实现和 QA 都必须执行这些规则。

## 源证据和现状保真

- 先捕获源证据，再设计和实现。
- 不从记忆、文件名、聊天印象或单张不匹配截图实现。
- 同一设计对比必须匹配 viewport、设备、主题、route、认证状态、内容状态和交互状态。
- 局部修改默认保留周边布局、交互、业务逻辑、路由、数据流和已有组件 API。
- 如果现状和已确认 Surface Change Framing 不一致，停止并重新确认。

## 视觉目标保真

- 选中的 workbench 方案是 composition、hierarchy、density、atmosphere、signature motifs 的合同。
- 不要把高保真设计稿降级成普通卡片、项目符号、占位图、CSS 背景块或通用 UI。
- 字体必须检查 family、fallback、weight、size、line-height、letter-spacing、换行和截断。
- 间距必须检查 page margin、section gap、item gap、padding、grid、alignment、radius、shadow、divider、vertical rhythm。
- 颜色必须映射到 `DESIGN.md` 或项目 tokens。硬编码颜色、漂移状态色、错误透明度和低对比都要标出。
- 图标风格统一：尺寸、线宽、颜色、语义、对齐、状态变化一致。
- 图像和资产必须匹配主题、裁切、比例、清晰度、背景处理和艺术方向。
- 禁止“圆角卡片 + 彩色左边框”模板化强调。
- 不滥用强调色、渐变、玻璃拟态、装饰 blob、无意义阴影、指标英雄区、重复图标卡片网格。
- 80% 使用业内成熟模式，20% 做有产品个性的独特选择。独特选择必须服务产品表达。

## 内容和数据纪律

- 不编数据。
- 不用填充文案凑页面。
- 不用 lorem、套话、营销废话或解释性 UI 文案凑页面。
- 不留下 fake controls、dead links、未连接按钮。
- 不把应为可访问 UI 文本的内容栅格化成图片。

## 交互、状态和可访问性

- 必须覆盖实际需要的 default、hover、focus-visible、active、disabled、loading、error、success、empty、overflow、long/short text、first-run。
- tabs、dropdown、modal、drawer、tooltip、filter、toggle、form、carousel、nav、sidebar、button、input 不能只是静态 chrome。
- 不依赖 hover 完成功能。
- 移动端和键盘路径必须可达。
- 检查触控目标、焦点态、语义标签、表单关联、可访问名称、alt text、状态反馈和 reduced motion。
- 响应式不是整体缩小。桌面、平板、移动都不能出现重叠、裁切、破坏层级、文字溢出或不可用控件。

## QA 判定

- 截图只是证据，不是 QA 结论。
- 全屏比较不足以通过 QA；重要细节不可读时做局部区域比较。
- 必须显式检查字体/排版、间距/布局节奏、颜色/tokens、图像/资产质量、copy/content。
- 同时检查 icons、states/interactions、accessibility、responsiveness 和 AI shortcut artifacts。
- P0/P1/P2 必须修复并复跑；P3 可以作为 follow-up polish。
