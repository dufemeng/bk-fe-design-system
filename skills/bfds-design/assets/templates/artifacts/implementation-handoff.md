# <设计标题>

设计任务标识：`<slug>`
状态：`contract-ready`
更新时间：`<ISO 日期>`

## 1. 设计目标

说明这次要实现的前端设计目标。只描述已确认的设计表达和用户可见行为，不补产品范围、API、数据库或权限规则。

## 2. 选中方案与合并决策

- 选中方案：`<A/B/C 或合并>`
- 合并来源：`<例如 B 为主，导航采用 A，错误态采用 C>`
- 设计意图：`<信息层级、密度、状态表达、视觉签名>`
- 评审工作台：`docs/design/<slug>/workbench.html`
- 方案 A：`docs/design/<slug>/option-a.html`
- 方案 B：`docs/design/<slug>/option-b.html`
- 方案 C：`docs/design/<slug>/option-c.html`

## 3. 当前目标界面和改动类型

- 目标界面：`<页面/路由/组件/区域/弹窗/流程/空状态>`
- 当前来源：`<截图/Figma/URL/browser capture/Storybook/code inference/user description>`
- 证据置信度：`<verified/user-confirmed/code-inferred-unverified/low>`
- 改动类型：`<create/extend/modify/remove/replace/merge/restyle>`

如果实现时发现目标代码与这里描述的目标界面不一致，停止并重新确认，不要继续猜。

## 4. 必须保留

- `<布局、导航、业务逻辑、组件 API、品牌 tokens、数据流等>`

## 5. 允许改变

- `<层级、状态反馈、动效、密度、文案、局部结构等>`

## 6. 禁止改变

- 不新增未确认的产品能力。
- 不设计或改动 API、数据库、权限、后端架构。
- 不改变已标记为必须保留的路由、数据流、组件 API 或业务逻辑。
- 不凭聊天记忆、文件名或单张不匹配截图实现。

## 7. 视觉还原纪律

- 不编数据。有真实来源才写；没有就用明确标注的占位符。
- 不用填充文案凑页面。文案必须服务用户决策、状态理解或操作反馈。
- 不滥用强调色、渐变、玻璃拟态、装饰 blob、无意义阴影、指标英雄区、重复图标卡片网格。
- 不用占位图、emoji、文本符号、CSS art、手写 SVG 或近似图形替代真实资产。
- 图标风格统一：尺寸、线宽、颜色、语义、对齐、状态变化一致。
- 禁止廉价“圆角卡片 + 彩色左边框”模板化强调；圆角和左边框至少去掉一个。
- 80% 使用业内成熟模式，20% 做有产品个性的独特选择。独特选择必须服务产品表达。
- 必须检查字体、间距、颜色、资产、状态、交互、响应式、可访问性。
- 选中的评审工作台方案是 composition、hierarchy、density、atmosphere、signature motifs 的设计契约。

## 8. 数据与文案来源

- 真实数据来源：`<文件、接口、fixture、用户提供材料>`
- 占位数据：`<必须标注原因和替换条件>`
- 禁止文案：lorem、套话、营销废话、解释性 UI 文案。
- 未知项：`<未知内容必须列出，不得自行补全>`

## 9. 状态与交互

必须覆盖设计契约中列出的状态和交互。常见状态包括 default、hover、focus-visible、active、disabled、loading、error、success、empty、overflow、long/short text、first-run。

可见控件必须有真实行为或明确标注为原型占位。不要留下 fake controls、dead links、未连接按钮。

## 10. 响应式要求

- 桌面：`<规则>`
- 平板：`<规则>`
- 移动：`<规则>`

响应式不是整体缩小；不能出现重叠、裁切、破坏层级、文字溢出或不可用控件。

## 11. 资产与图标约束

- 图标来源：`<项目已有 icon set 或明确资产>`
- 图片来源：`<真实资产/用户提供/明确占位>`
- 禁止：用不匹配主题、裁切、比例、清晰度或艺术方向的图片替代设计目标。

## 12. 验收入口

- 设计契约：`docs/design/<slug>/design-contract.json`
- 验收计划：`docs/design/<slug>/qa-plan.json`
- 验收报告：`docs/design/<slug>/qa-report.md`

实现后运行自动化设计还原检查。P0/P1/P2 必须修复并复跑；P3 可以记录为 polish 风险。

## 13. 未决事项

- `<必须由用户或上游产品/工程材料确认的事项>`
