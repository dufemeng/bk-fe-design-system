# Settings Prompt Input Redesign

设计任务标识：`settings-prompt`
状态：`contract-ready`
更新时间：`2026-06-09T12:00:00.000Z`

## 1. 设计目标

实现设置页里的团队默认提示词输入组件改造。目标是让高频编辑、模板选择、预览和错误恢复更清晰，同时保留现有设置页路由、导航、提交逻辑、组件 API、tokens 和数据流。

## 2. 选中方案与合并决策

- 选中方案：`B+A+C`
- 合并来源：B 为主，采用 A 的安静 topbar 和低干扰周边节奏，采用 C 的显性错误状态。
- 设计意图：操作型 console，编辑区优先，模板和预览作为辅助上下文，错误反馈靠近编辑区。
- 评审工作台：`fixtures/docs-design-sample/settings-prompt/workbench.html`
- 方案 A：`fixtures/docs-design-sample/settings-prompt/option-a.html`
- 方案 B：`fixtures/docs-design-sample/settings-prompt/option-b.html`
- 方案 C：`fixtures/docs-design-sample/settings-prompt/option-c.html`

## 3. 当前目标界面和改动类型

- 目标界面：`/settings prompt input component`
- 当前来源：用户文字描述 + 代码推断；已在 fixture 中标注未视觉验证，用户确认后才固化。
- 证据置信度：`user-confirmed`
- 改动类型：`modify`

如果实现时发现目标代码与这里描述的目标界面不一致，停止并重新确认，不要继续猜。

## 4. 必须保留

- 现有设置页 route 和导航。
- 现有提交逻辑和组件 API。
- 现有项目 tokens 和 icon set。
- 已有保存提示词的数据流。

## 5. 允许改变

- 输入区信息层级。
- 模板入口和预览位置。
- 验证、错误、成功状态反馈。
- 局部密度、帮助信息和行动区布局。

## 6. 禁止改变

- 不新增权限、API、数据库或后端架构。
- 不编造团队默认提示词真实数据。
- 不引入新的视觉系统、字体体系、图标体系或框架。
- 不改动必须保留的路由、数据流、组件 API 或业务逻辑。

## 7. 视觉还原纪律

- `DESIGN.md` 是唯一设计规范事实源，不得引入合同外的新颜色、字体、圆角、阴影、动效或组件语气。
- 设计系统规则：沿用 restrained 产品 UI、现有输入控件、按钮、面板、分隔、语义状态 token、焦点和可访问性规则。
- 代码复用假设：复用现有设置页 route、表单布局、输入组件、按钮组件、错误提示、保存反馈逻辑和组件 API。
- 允许变更边界：只改提示词输入区、模板/预览相对位置、局部保存反馈、错误说明和恢复动作；不改导航、数据流、权限或新增配置项。
- 实现风险：`medium`
- 不编数据。有真实来源才写；没有就用明确标注的占位符。
- 不用填充文案凑页面。文案必须服务用户决策、状态理解或操作反馈。
- 不滥用强调色、渐变、玻璃拟态、装饰 blob、无意义阴影、指标英雄区、重复图标卡片网格。
- 不用占位图、emoji、文本符号、CSS art、手写 SVG 或近似图形替代真实资产。
- 图标风格统一：尺寸、线宽、颜色、语义、对齐、状态变化一致。
- 禁止廉价“圆角卡片 + 彩色左边框”模板化强调；圆角和左边框至少去掉一个。
- 80% 使用业内成熟模式，20% 做有产品个性的独特选择。独特选择必须服务产品表达。
- 必须检查字体、间距、颜色、资产、状态、交互、响应式、可访问性。

自审检查：

- 未新增 `DESIGN.md` 之外的颜色、圆角、阴影或字体。
- 未改变设置导航、提交逻辑和组件 API。
- 小屏折叠后输入区仍是第一优先且无文字溢出。
- 错误、成功、加载状态均有可访问文本和焦点反馈。

## 8. 数据与文案来源

- 真实数据来源：现有设置页保存的 prompt 内容。
- 占位数据：fixture 中的 `[占位]` 只用于说明结构，实现时必须替换为真实配置或明确占位状态。
- 禁止文案：lorem、套话、营销废话、解释性 UI 文案。
- 未知项：真实最小长度、保存错误来源和模板内容由目标项目现有逻辑决定，BFDS 不补。

## 9. 状态与交互

必须覆盖 default、error、success、long text、keyboard focus、mobile stack。

交互包括：

- Validate 或 save 后状态更新。
- Textarea 可键盘聚焦和编辑。
- 长文本不溢出容器。
- 移动端不依赖 hover。

## 10. 响应式要求

- 桌面：可使用模板 rail、中央 editor、预览/status panel 三列。
- 平板：模板和预览可下移，但 editor 仍为第一优先。
- 移动：单列布局，行动按钮可触达，状态信息不遮挡输入。

响应式不是整体缩小；不能出现重叠、裁切、破坏层级、文字溢出或不可用控件。

## 11. 资产与图标约束

- 图标来源：项目已有 icon set；本设计不强制新增图标。
- 图片来源：无图片需求。
- 禁止：使用占位图、emoji、手写 SVG 或不匹配的装饰图形。

## 12. 验收入口

- 设计契约：`fixtures/docs-design-sample/settings-prompt/design-contract.json`
- 验收计划：`fixtures/docs-design-sample/settings-prompt/qa-plan.json`
- 验收报告：`fixtures/docs-design-sample/settings-prompt/qa-report.md`

实现后运行自动化设计还原检查。P0/P1/P2 必须修复并复跑；P3 可以记录为 polish 风险。

## 13. 未决事项

- 目标项目真实 prompt 校验规则。
- 目标项目真实模板来源。
- 目标项目现有 icon set 和 token 名称。
