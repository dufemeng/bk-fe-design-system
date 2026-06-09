# BFDS MVP 方案

日期：2026-06-08

## 1. 产品定位

BFDS 是 `Design Completion Layer`，不是完整产品研发流程，也不是通用实现框架。

它接在 OpenSpec、superpower、ce-brainstorm、Codex plan、PRD 或已有原型之后，负责把“需求大致明确”转成“可审阅、可实现、可验证、可微调”的前端设计产物。

### 负责

- 冷启动或刷新设计上下文：`PRODUCT.md`、`DESIGN.md`。
- 确认当前 surface 和本次改动范围。
- 围绕设计稿进行专业脑暴。
- 生成三方案可交互设计工作台。
- 固化设计契约和实现交接物。
- 运行设计还原检查。
- 支持局部 live 微调。
- 管理 `docs/design/<slug>/` 下的需求级设计产物。

### 不负责

- 决定产品是否要做。
- 重新定义用户、业务目标、核心流程。
- 设计后端接口、数据库、权限模型、架构取舍。
- 编造缺失数据、业务规则或产品状态。
- 替代 OpenSpec / superpower / ce-work / Codex plan。

如果缺失的是产品定义或工程方案，BFDS 退回上游；如果缺失的是设计表达，BFDS 继续问。

## 2. 目标用户视角

用户不需要知道内部文件名。理想输入是自然语言：

```text
这是 PRD，开始设计。
基于这个原型出三个高保真方案。
这个页面里的提示词输入组件重新设计一下。
选 B，合并 A 的导航。
实现这个方案。
跑一下设计还原检查。
这个区域再紧凑一点。
```

BFDS 内部将这些意图路由到两个 skill：

- `bfds-design`：开始或继续设计。
- `bfds-implement`：实现已确认的 BFDS 设计方案，并运行 QA。

## 3. MVP 流程

```text
Intent Router
→ Design Context
→ Surface Change Framing
→ Design Brainstorm
→ Static Kami Workbench
→ User Selection
→ Design Contract Pack
→ Implementation
→ Automatic QA
→ Live Region Iteration
```

### 3.1 Intent Router

Intent Router 是每个 BFDS skill 的开场步骤，不是独立 skill。

它读取用户输入、当前线程上下文、`docs/design/*/status.json`，判断下一步：

- 开始新设计：进入 `bfds-design`。
- 继续已有设计：恢复对应 slug。
- 实现已确认方案：进入 `bfds-implement`。
- 只有“实现这个方案”但没有已确认设计产物：不写代码，要求选择已有 slug 或回到设计。
- QA 已有实现：进入 `bfds-implement` 的 QA 子流程。
- 局部微调：调用 Impeccable `live`，并把结果关联回当前 slug。
- 缺产品定义：退回 OpenSpec / plan / superpower。

MVP 恢复策略：

- 如果当前线程刚选了方案，使用当前 slug。
- 如果新 session，扫描 `docs/design/*/status.json`。
- 如果只有一个 `contract-ready` slug，回放摘要并请用户确认。
- 如果多个，列出最近 2-5 个供用户选择。
- 如果没有，提示先生成设计 workbench。

### 3.2 Design Context

主能力使用 Impeccable `init`，而不是直接调用 `document`。

原因：

- `init` 同时建立 `PRODUCT.md` 和 `DESIGN.md`。
- `PRODUCT.md` 管战略、用户、语气、anti-reference。
- `DESIGN.md` 管视觉、组件、token、设计规则。
- `init` 会在有代码时引导 `document` 扫描已有视觉系统，在空项目时走 seed。
- `init` 还能配置 `.impeccable/live/config.json`，为后续 live 做准备。

BFDS 自己不重新实现这套能力，只包一层调用与结果记录。

### 3.3 Surface Change Framing

这是必须显式确认的阶段。没有确认，不生成 workbench。

需要确认五件事：

1. 当前 surface 是什么：页面、路由、组件、局部区域、弹窗、流程、空状态等。
2. 当前 surface 长什么样：截图、Figma、URL、当前运行页面、Storybook、代码推断或用户文字描述。
3. 本次改动类型：
   - `create`：新增页面/组件/流程。
   - `extend`：在当前页面增加一块。
   - `modify`：改当前页面某部分。
   - `remove`：删除或弱化某部分。
   - `replace`：用新结构替换旧结构。
   - `merge`：合并多个区域或方案。
   - `restyle`：功能不变，只改视觉表达。
4. 必须保留什么：布局、导航、业务逻辑、组件 API、品牌 token、数据流等。
5. 允许改变什么：层级、状态反馈、动效、密度、文案、局部结构等。

现状来源优先级：

1. 用户提供的截图 / Figma / 原型 / URL。
2. 可运行页面的浏览器捕获。
3. 本地代码、Storybook、组件库、tokens。
4. 用户文字描述。

仅靠代码推断时，必须标注“现状由代码推断，未视觉验证”，并要求用户确认。

确认示例：

```text
我先确认这次设计范围：

Surface: 现有 /settings 页面里的 prompt 输入组件
Current source: 用户截图 + 本地组件 src/components/PromptBox.tsx
Change type: modify
Keep: 页面布局、导航、提交逻辑、现有品牌 tokens
Change: 输入区层级、状态反馈、辅助提示、错误态
Remove/avoid: 不新增无关设置项，不改数据流

确认后我会生成 3 个可交互设计方案。
```

### 3.4 Design Brainstorm

只脑暴设计稿，不脑暴产品。

问题不是固定问卷，而是根据上游材料、`PRODUCT.md`、`DESIGN.md`、surface framing 自动推断最高不确定性。

可问的问题类型：

- 哪个信息应该最先被看见？
- 哪些内容要弱化或折叠？
- 这个 surface 应该更高效、更安静、更强提示，还是更具品牌表现？
- 动效是低存在感反馈，还是要承担引导/强调？
- 哪些状态必须高保真展示？
- 移动端、桌面端、嵌入场景哪个优先？
- 局部改动是否需要保留周边布局和节奏？

不该问的问题：

- 业务规则怎么设计。
- API 怎么设计。
- 数据模型怎么设计。
- 权限和角色怎么定义。
- 产品范围是否应该扩大。

借鉴 Superpowers 的做法：

- 一次只问一个问题。
- 先上下文扫描，再提问。
- 先发散，再收敛。
- 提供 2-3 个具体方案，而不是空泛建议。
- 浏览器用于视觉展示，对话用于文本沟通。

MVP 不做事件 server，但保留这个交互模型：workbench 展示视觉，对话承接反馈。

### 3.5 Static Kami Workbench

产物：

```text
docs/design/<slug>/workbench.html
docs/design/<slug>/option-a.html
docs/design/<slug>/option-b.html
docs/design/<slug>/option-c.html
```

`workbench.html` 使用 Kami 风格外壳，负责阅读体验、方案解释、决策区。

三个设计稿放在 iframe 中：

- `iframe src="option-a.html"`
- `iframe src="option-b.html"`
- `iframe src="option-c.html"`

iframe 里的设计稿必须服从目标项目 `DESIGN.md`，不能继承 Kami 的纸感样式。

Workbench 必须包含：

- 本次需求摘要。
- Surface Change Framing 摘要。
- `PRODUCT.md` / `DESIGN.md` 引用和版本。
- 三个方案的设计意图。
- 三个可交互模拟器。
- 每个方案的强调、弱化、风险、适用场景。
- 选择提示：选 A / B / C，合并某些部分，或要求重做。

MVP 中用户在对话里确认选择，例如：

```text
选 B，但导航用 A 的，错误态用 C 的。
```

### 3.6 Design Contract Pack

用户选择后，BFDS 写入：

```text
docs/design/<slug>/design-contract.json
docs/design/<slug>/implementation-handoff.md
docs/design/<slug>/qa-plan.json
docs/design/<slug>/status.json
```

#### design-contract.json

机器权威合同。

职责：

- 描述选中的设计目标。
- 记录 screens、states、interactions、tokens、assets、responsive rules、motion rules、acceptance rules。
- 给实现和 QA 提供稳定接口。

不负责：

- 解释业务为什么这样做。
- 存储完整 PRD。
- 记录聊天过程。

#### implementation-handoff.md

人类和 agent 可读的实现交接文档。

职责：

- 解释要实现什么。
- 指向 workbench 和选中方案。
- 写清楚必须保留、允许改变、禁止改变。
- 写清楚视觉还原纪律。
- 写清楚占位数据、真实数据、未知来源。
- 指导 `bfds-implement` 生码。

不负责：

- 详细工程任务拆解。
- 代替架构计划。
- 代替测试计划。

#### qa-plan.json

验证计划。

职责：

- 定义 viewport、route、state、interaction、截图目标、阻塞等级。
- 驱动自动 QA。
- 明确哪些检查来自 Impeccable，哪些来自 BFDS。

不负责：

- 存储设计决策。
- 存储实现方案。
- 记录用户选择。

#### status.json

需求级状态索引。

职责：

- 支持新 session 恢复。
- 标记阶段：`draft`、`workbench-ready`、`selected`、`contract-ready`、`implementing`、`implemented`、`qa-failed`、`qa-passed`、`live-iterating`、`done`。
- 记录 slug、title、lastUpdated、selectedOption、artifact paths、source summary。

## 4. Skill 设计

### 4.1 bfds-design

建议 frontmatter：

```yaml
---
name: bfds-design
description: 当用户明确要求从 PRD、产品方案、原型、截图、Figma、URL、现有页面或组件开始前端设计时使用。用于确认当前页面/组件现状、增删改范围，生成三方案可交互设计工作台，并在用户确认后写入 docs/design/<slug> 设计产物。不要用于后端、数据库、普通 bug 修复、纯代码重构、算法实现、接口实现或没有设计意图的请求。
---
```

触发例子：

```text
这是 PRD，开始设计。
基于这个原型做三个高保真方案。
这个页面的 prompt 输入组件重新设计一下。
给这个需求出设计稿。
选 B，合并 A 的导航。
继续刚才的设计。
```

不触发例子：

```text
实现登录接口。
修一下数据库 migration。
这个 React 组件报错了。
把这个函数重构一下。
```

边界规则：

- 没有 Surface Change Framing 确认，不生成 workbench。
- 没有用户选择，不生成 contract pack。
- 如果用户要求的是产品/工程方案，退回上游。

### 4.2 bfds-implement

建议 frontmatter：

```yaml
---
name: bfds-implement
description: 当用户要求实现已经确认的 BFDS 设计方案时使用。该技能会读取 docs/design/<slug> 下的设计契约、实现交接文档和 QA 计划，然后按设计实现代码并运行设计还原检查。如果缺少已确认设计产物，不要凭记忆实现，应先引导用户选择已有设计产物或回到 bfds-design。
---
```

触发例子：

```text
实现这个方案。
按刚才选的 B 做。
继续实现这个 BFDS 设计。
用已有 BFDS 设计继续开发。
跑一下设计还原检查。
```

不触发例子：

```text
实现这个 API 方案。
实现这个算法。
修后端权限。
重构数据层。
```

前置条件：

- 有已确认的 `docs/design/<slug>/design-contract.json`。
- 有 `implementation-handoff.md`。
- 有 `qa-plan.json`。

缺失处理：

- 当前线程有选中方案但文件缺失：提示回到 `bfds-design` 固化 contract。
- 仓库有多个可用 slug：列出最近 2-5 个让用户选。
- 仓库没有任何可用 slug：不实现，询问是否先生成设计 workbench。

## 5. 实现和 QA 的关系

BFDS MVP 先由 `bfds-implement` 自己实现，不强制调用 ce-work。

`bfds-implement` 执行流程：

1. Intent Router 恢复 slug。
2. 读取 design contract pack。
3. 读取 `PRODUCT.md`、`DESIGN.md`。
4. 扫描现有代码、路由、组件、tokens、icon set。
5. 按 handoff 实现。
6. 运行项目已有检查。
7. 根据 `qa-plan.json` 捕获页面。
8. 调用 Impeccable `detect`。
9. 做 BFDS 语义/状态/交互/视觉纪律检查。
10. 写 QA 报告。
11. 必要时修复并复跑。

### QA 能力来源

不是“BFDS 什么都不做，只调用 Impeccable”。

Impeccable 提供：

- `detect`：确定性 anti-pattern 检查。
- `critique`：设计评审能力，可作为人工/LLM 审查增强。
- `live`：局部微调能力。

BFDS 提供：

- QA plan。
- contract 对齐。
- 状态和交互覆盖检查。
- workbench 视觉目标与实现截图的对比组织。
- QA 报告、阻塞等级、恢复状态。
- 是否需要 Design Delta 的判断。

MVP 不承诺稳定像素级 diff，也不做 overlay diff 引擎。像素级视觉 diff 是 P1。

## 6. 视觉还原纪律

以下规则进入 `implementation-handoff.md` 和 QA：

### 6.1 源证据和现状保真

- 先捕获源证据，再设计和实现。源证据可以是用户截图、Figma、URL、当前运行页面、Storybook、现有代码和 tokens。
- 不从记忆、文件名、聊天印象或单张不匹配截图实现。现状不可打开、不可截图、不可对比时，QA 必须阻塞。
- 同一设计对比必须匹配 viewport、设备、主题、route、认证状态、内容状态和交互状态。
- 现有项目优先复用已有设计系统、tokens、组件、布局模式、icon set 和构建管线。不要为一个需求另起一套视觉系统或框架。
- 局部修改默认保留周边布局、交互、业务逻辑、路由、数据流和已有组件 API，除非用户明确要求 redesign。
- 如果实现中发现现状和已确认 surface framing 不一致，停止并重新确认，不要继续猜。

### 6.2 视觉目标保真

- 选中的 workbench 方案是 composition、hierarchy、density、atmosphere、signature motifs 的合同。实现缺失主要视觉成分时，视为阻塞。
- 不要把高保真设计稿降级成普通卡片、项目符号、占位图、CSS 背景块或“差不多”的通用 UI。
- 字体必须认真匹配：font family、fallback、weight、size、line-height、letter-spacing、抗锯齿、换行和截断都要检查。
- 间距必须认真匹配：page margin、section gap、item gap、padding、grid、alignment、radius、shadow、divider、vertical rhythm 都要检查。
- 颜色必须映射到 `DESIGN.md` 或项目 tokens。硬编码颜色、漂移的状态色、错误的透明度、低对比都要被 QA 标出。
- 图标风格统一：尺寸、线宽、颜色、语义、对齐、状态变化一致。MVP 记录约束，不深入图标系统。
- 图像和资产必须匹配主题、裁切、比例、清晰度、背景处理和艺术方向。不能用占位图、emoji、文本符号、CSS art、div art、手写 SVG 或近似图形替代真实资产。
- 禁止“圆角卡片 + 彩色左边框”这类双重廉价强调，圆角和左边框至少去掉一个。
- 不滥用强调色、渐变、玻璃拟态、装饰 blob、无意义阴影、指标英雄区、重复图标卡片网格。
- 80% 使用业内成熟模式，20% 做有产品个性的独特选择。成熟模式保证可用性，独特选择必须服务产品表达。

### 6.3 内容和数据纪律

- 不编数据。有真实来源才写；没有就用明确标注的占位符。
- 不用填充文案凑页面。空白要靠结构、节奏、内容优先级解决。
- 不用 lorem、套话、营销废话或解释性 UI 文案凑页面。文案必须服务用户决策、状态理解或操作反馈。
- 可见控件必须有真实行为或明确标注为原型占位。不要留下 fake controls、dead links、未连接按钮。
- 不把源设计里的图片文字错误地拆成 HTML 叠字；也不把应为可访问 UI 文本的内容栅格化成图片。

### 6.4 交互、状态和可访问性

- 必须覆盖 default、hover、focus-visible、active、disabled、loading、error、success、empty、overflow、long/short text、first-run 等实际需要的状态。
- 可见交互必须可用：tabs、dropdown、modal、drawer、tooltip、filter、toggle、form、carousel、nav、sidebar、button、input 不能只是静态 chrome。
- 不依赖 hover 完成功能。移动端和键盘路径必须可达。
- 触控目标、焦点态、语义标签、表单关联、可访问名称、alt text、状态反馈和 reduced motion 都要检查。
- 响应式不是整体缩小。桌面、平板、移动都不能出现重叠、裁切、破坏层级、文字溢出或不可用控件。

### 6.5 QA 判定纪律

- 截图不是 QA，本身只是一份证据。必须把源视觉目标和实现截图放到同一比较输入里判断。
- 全屏比较不足以通过 QA。重要细节不可读时，必须做局部区域比较。
- QA 必须显式检查五类保真面：字体/排版、间距/布局节奏、颜色/tokens、图像/资产质量、copy/content。
- 还要检查 icons、states/interactions、accessibility、responsiveness 和 AI shortcut artifacts。
- P0/P1/P2 必须修复并复跑；P3 可以作为 follow-up polish。
- detector 或 QA 输出只是缺陷证据，不是“完成证明”。最终仍要对 design contract 和视觉目标负责。

## 7. 项目结构

MVP 目标结构：

```text
README.md
docs/
  bfds-mvp-design-spec.md
  design/
    <slug>/
      workbench.html
      option-a.html
      option-b.html
      option-c.html
      design-contract.json
      implementation-handoff.md
      qa-plan.json
      status.json
skills/
  bfds-design/
    SKILL.md
  bfds-implement/
    SKILL.md
vendor/
  impeccable/
src/
  adapters/
    impeccable/
templates/
  kami-workbench/
```

`vendor/impeccable/` 直接复制 upstream。BFDS 不在 vendor 内做深改。需要适配时写在 `src/adapters/impeccable/`。

ADW/BFDS 需求级产物统一放 `docs/design/<slug>/`。

## 8. 验收标准

MVP 完成时应满足：

- 用户可以用中文自然输入“这是 PRD，开始设计”触发 `bfds-design`。
- BFDS 会显式确认 Surface Change Framing。
- BFDS 能生成一个静态 Kami workbench，含三个 iframe 交互设计稿。
- 用户能在对话里选择/合并方案。
- BFDS 能生成 contract pack。
- 用户说“实现这个方案”时，`bfds-implement` 能恢复 slug 并实现。
- 缺 contract 时不会凭记忆实现。
- 新 session 能从 `docs/design/*/status.json` 恢复。
- QA 至少覆盖 Impeccable detect、contract 对齐、状态/交互检查和视觉纪律。
- 局部微调路径能进入 Impeccable live。

## 9. 暂不做

- 事件记录 server。
- 像素级 overlay diff。
- Product Design 整体嵌入。
- 多人协作选择流程。
- 图标系统深度约束。
- 自动更新 `DESIGN.md`。
- 与 ce-work 的深集成。

## 10. 待实现前确认

当前已确认：

- 新项目：`bk-fe-design-system`。
- 缩写：`bfds`。
- skill 前缀：`bfds-`。
- Impeccable 直接复制到新项目。
- 需要 `status.json`。
- workbench 使用 iframe。
- 产物放 `docs/design/`。
- 能用中文就用中文。
- MVP 使用静态 workbench，用户对话确认。

仍需实现时自然决策：

- 是否初始化 git。
- 是否使用 npm/pnpm/bun。
- 是否先写纯 skill MVP，还是同时做 CLI/脚本。
- vendored Impeccable 是否作为普通目录提交，还是后续改 submodule。

## 11. Skill Creator 审查结论

本节按 Codex `skill-creator` 的原则审查 BFDS MVP 方案。

### 11.1 触发机制

`skill-creator` 明确指出：frontmatter `description` 是技能触发的主要机制，正文只会在触发后加载。因此 `bfds-design` 和 `bfds-implement` 的触发条件必须写在 description 里，不能只放在正文。

当前方向正确：两个 skill 而不是一个大 skill，降低误触发概率。

需要保持的约束：

- `bfds-design` 只触发“明确前端设计意图”。
- `bfds-implement` 只触发“实现已确认 BFDS 设计方案”。
- 普通实现、后端、数据库、算法、bug 修复不触发。
- “实现这个方案”但缺少 contract pack 时，不得从记忆实现。

### 11.2 渐进披露

未来实现时不能把这份 500 行方案直接塞进 `SKILL.md`。

建议 skill 结构：

```text
skills/
  bfds-design/
    SKILL.md
    references/
      intent-router.md
      surface-change-framing.md
      design-brainstorm.md
      workbench-authoring.md
      contract-pack.md
    assets/
      kami-workbench/
  bfds-implement/
    SKILL.md
    references/
      resume-design-artifacts.md
      implementation-protocol.md
      visual-fidelity-discipline.md
      qa-protocol.md
      impeccable-integration.md
```

`SKILL.md` 只放核心流程、硬 gate 和什么时候读取哪些 reference。详细视觉纪律、QA rubric、workbench 模板、恢复规则放 references/assets。

### 11.3 自由度设计

BFDS 需要混合自由度：

- 高自由度：设计脑暴问题根据上下文推断，不能固定问卷。
- 中自由度：Surface Change Framing 有固定字段，但证据来源和措辞可变。
- 低自由度：contract pack 文件名、状态机、QA 阻塞规则、缺失 artifact 处理必须固定。

这和 `skill-creator` 的自由度建议一致：创意判断给模型空间，易错协议给硬 guardrail。

### 11.4 可复用资源

方案具备实现条件，但需要把重复生成的内容资源化：

- Kami workbench 外壳应进入 `assets/` 或 `templates/`。
- contract、handoff、qa-plan、status 的 JSON/Markdown schema 应进入 `references/`。
- Impeccable 调用方式应封装在 `src/adapters/impeccable/`。
- 如果需要稳定生成 slug、读写状态、扫描 `docs/design/*`，应写脚本，不要每次让 agent 重写逻辑。

### 11.5 验证方式

按 `skill-creator` 建议，后续创建真实 skill 后必须运行：

- `quick_validate.py` 检查 skill frontmatter 和命名。
- 至少两组前向测试：
  - 用户输入“这是 PRD，开始设计”，应触发 `bfds-design`，且停在 Surface Change Framing 确认。
  - 用户新 session 输入“实现这个方案”，如果没有 contract pack，应拒绝凭记忆实现并要求选择/生成设计产物。
- 复杂测试再用 subagent 做独立前向验证，不向 subagent 泄露预期答案。

### 11.6 当前主要风险

- `bfds-design` description 仍可能因为“功能需求”触发过宽，已在本方案中收窄为“明确要求开始前端设计”。
- `bfds-implement` 需要强依赖 `status.json` 和 contract pack，否则“实现这个方案”容易误触发。
- 静态 workbench 无点击事件记录，MVP 依赖用户在对话里表达选择；这是可接受的 MVP tradeoff，但必须在 workbench 上写清楚。
- 视觉质量不能仅靠规则保证，必须在实现后用浏览器截图和 QA 循环验证。
- 未来如果 `SKILL.md` 过长，触发后会消耗大量上下文，影响真实实现质量；必须拆 references。

### 11.7 审查判断

具备进入实现的条件。方案的产品边界、两个 skill 拆分、artifact 结构、恢复机制和 MVP 降级策略都成立。

实现前最重要的工程化动作不是继续扩写方案，而是把方案拆成可执行的 skill 资源结构，并用真实 few-shot 做前向测试。

## 12. MVP 实施任务拆分

本节面向实施 LLM。目标不是重新讨论产品方向，而是把已经确认的 MVP 方案拆成可执行、可验收、可恢复的任务。

执行原则：

- 以 skill 为主，脚本为辅。脚本只承担确定性工作：slug、状态扫描、模板复制、schema 校验、fixture 校验等。
- 所有文件路径使用 repo-relative path。
- 不在 `vendor/impeccable/` 内做深改；适配逻辑放在 `src/adapters/impeccable/` 或 skill references。
- Product Design 只借鉴纪律和流程，不 vendor。
- 每个任务完成后，至少用对应 fixture 或人工前向测试验证触发、边界和恢复行为。
- 遇到缺产品定义、缺当前 surface、缺用户选择、缺 contract pack 时停止，不凭记忆补全。

### 12.1 依赖顺序

```text
T0 项目骨架与 vendor
→ T1 Skill 骨架与触发描述
→ T2 Intent Router 与恢复协议
→ T3 Artifact schema 与模板
→ T4 Surface Change Framing 协议
→ T5 Design Brainstorm 协议
→ T6 Kami Workbench 模板
→ T7 Impeccable 适配层
→ T8 bfds-design 端到端串联
→ T9 bfds-implement 端到端串联
→ T10 QA 与 Live 双阶段协议
→ T11 Fixtures 与前向测试
→ T12 README 与实施提示词
```

T2、T3、T4、T5 可以并行推进，但 T8 必须在它们完成后再收口。T9 依赖 T3、T7、T10。T11 是验收任务，不应跳过。

### T0. 项目骨架与 vendor

目标：建立 BFDS 项目最小目录，并把 Impeccable 作为 upstream-compatible vendor 放入项目。

涉及文件：

```text
README.md
docs/bfds-mvp-design-spec.md
vendor/impeccable/
src/adapters/impeccable/
skills/
templates/
fixtures/
tests/forward/
```

实施要求：

- 复制本地 Impeccable 源码到 `vendor/impeccable/`。
- `vendor/impeccable/` 保持 upstream 原样，不混入 BFDS 定制逻辑。
- 新建 `src/adapters/impeccable/README.md`，说明 BFDS 只在 adapter/reference 层调用 Impeccable。
- 如果初始化 package manager，只添加 MVP 必需依赖；不要引入重型前端框架来生成静态 workbench。

验收：

- 目录结构存在。
- README 能解释 BFDS 是 Design Completion Layer。
- `vendor/impeccable/` 和 `src/adapters/impeccable/` 边界清楚。

### T1. Skill 骨架与触发描述

目标：创建两个中文优先、触发边界清晰的 skill。

涉及文件：

```text
skills/bfds-design/SKILL.md
skills/bfds-design/references/
skills/bfds-design/assets/
skills/bfds-implement/SKILL.md
skills/bfds-implement/references/
skills/bfds-implement/assets/
```

实施要求：

- `SKILL.md` 只放核心流程、硬 gate、什么时候读取哪个 reference。
- 详细规则放入 `references/`，模板放入 `assets/` 或 `templates/`。
- frontmatter `description` 使用中文，明确触发和不触发范围。
- description 不要写成“所有前端工作都触发”。必须包含“明确要求前端设计”或“实现已确认 BFDS 设计方案”这类限制。

必须包含的 few-shot：

```text
触发 bfds-design：这是 PRD，开始设计。
触发 bfds-design：基于这个原型出三个高保真方案。
触发 bfds-design：这个页面里的提示词输入组件重新设计一下。
触发 bfds-design：选 B，但导航用 A 的。

触发 bfds-implement：实现这个 BFDS 方案。
触发 bfds-implement：按刚才确认的设计稿落代码。
触发 bfds-implement：用 docs/design/settings-prompt 的 handoff 继续实现。
触发 bfds-implement：跑一下 BFDS 设计还原检查。

不触发：实现这个 API 方案。
不触发：修一下数据库 migration。
不触发：重构这个 hook。
不触发：这个组件报错了，帮我 debug。
```

验收：

- skill frontmatter 可被 `quick_validate.py` 通过。
- 新人只读 `SKILL.md` 能知道主流程和停止条件。
- 误触发 case 在正文中有明确处理。

### T2. Intent Router 与恢复协议

目标：让“开始设计、继续设计、实现、QA、live、新 session 恢复”不靠聊天记忆。

涉及文件：

```text
skills/bfds-design/references/intent-router.md
skills/bfds-implement/references/resume-design-artifacts.md
templates/artifacts/status.schema.json
scripts/bfds-status.mjs
```

实施要求：

- `status.json` 是需求级索引，不是完整设计合同。
- router 先读当前线程上下文，再扫描 `docs/design/*/status.json`。
- MVP 扫描逻辑可以用简单脚本，但 skill 必须写明脚本失败时的人工 fallback。
- 多 slug 时只展示最近 2-5 个，包含 title、state、lastUpdated、selectedOption。
- “实现这个方案”但没有 `contract-ready` slug 时，不实现代码。

状态最小集合：

```text
draft
workbench-ready
selected
contract-ready
implementing
implemented
qa-failed
qa-passed
live-iterating
done
```

验收场景：

- 新 session 输入“继续实现这个方案”，仓库只有一个 `contract-ready` slug：回放摘要并要求确认。
- 新 session 输入“继续实现这个方案”，仓库有多个 slug：列出选项。
- 没有任何 slug：引导回 `bfds-design`，不写代码。
- 当前线程刚选择方案但文件未固化：要求先生成 contract pack。

### T3. Artifact schema 与模板

目标：把 `docs/design/<slug>/` 的文件格式固定下来，降低后续 skill 幻觉。

涉及文件：

```text
templates/artifacts/design-contract.schema.json
templates/artifacts/qa-plan.schema.json
templates/artifacts/status.schema.json
templates/artifacts/implementation-handoff.md
skills/bfds-design/references/contract-pack.md
```

实施要求：

- schema 不追求复杂，但必须覆盖必填字段。
- `implementation-handoff.md` 必须包含视觉还原纪律、未知/占位数据标注、保留/允许/禁止改动。
- `design-contract.json` 必须机器可读，不能把关键规则只写在 Markdown 里。
- `qa-plan.json` 必须定义 route、viewport、state、interaction、reference artifact、blocking level。

最小必填字段：

```text
design-contract.json:
  slug, title, selectedOption, sourceArtifacts, surface, changeType,
  keep, change, avoid, screens, states, interactions, tokens,
  responsive, motion, assets, acceptanceRules

qa-plan.json:
  slug, targetRoutes, viewports, states, interactions,
  referenceScreenshots, checks, blockers, impeccable, reports

status.json:
  slug, title, state, lastUpdated, selectedOption,
  artifacts, sourceSummary, currentSurface, changeType
```

验收：

- 有一个 `fixtures/docs-design-sample/<slug>/` 能通过 schema 校验。
- 执行者无需翻聊天记录也能从 contract pack 理解要实现什么。

### T4. Surface Change Framing 协议

目标：显式确认当前页面/组件长什么样，以及本次是新增、删改、替换还是局部重设计。

涉及文件：

```text
skills/bfds-design/references/surface-change-framing.md
fixtures/surface-create.md
fixtures/surface-modify-existing-component.md
fixtures/surface-remove-section.md
```

实施要求：

- 固定字段：surface、current source、change type、keep、change、avoid。
- 支持 `create`、`extend`、`modify`、`remove`、`replace`、`merge`、`restyle`。
- 如果是修改/删除/替换现有 surface，必须先获得当前 surface 的视觉证据或用户确认。
- 仅从代码推断时，必须标注“未视觉验证”，并要求用户确认。
- 如果上游 PRD 没给当前 surface，BFDS 问设计所需缺口，不补产品方案。

验收场景：

- “新增设置页”：可进入 create framing。
- “改当前 prompt 组件”：必须问当前 surface 来源。
- “删掉这个区域”：必须确认删除对象、周边保留范围、空出后的结构处理。
- “基于现有页面做一版更现代的”：必须判定为 restyle 或 replace，并要求现状证据。

### T5. Design Brainstorm 协议

目标：让 BFDS 能专业地产生三个设计方向，但不越界做产品 brainstorming。

涉及文件：

```text
skills/bfds-design/references/design-brainstorm.md
fixtures/design-brainstorm-empty-style.md
fixtures/design-brainstorm-with-reference.md
fixtures/design-brainstorm-existing-design-system.md
```

实施要求：

- 问题动态推断，不写死为固定问卷。
- 一次只问一个最高价值问题。
- 问题只围绕视觉强调、弱化、密度、动效、状态表达、设备优先级、品牌边界、局部保留范围。
- 如果 `PRODUCT.md`、`DESIGN.md`、PRD、surface framing 已足够，可以不问，直接给出三方向。
- 输出不是纯文本建议，而是进入 workbench 的 Three Direction Specs。

Three Direction Specs 最小字段：

```text
optionId
name
designThesis
hierarchy
density
motion
stateTreatment
layoutStrategy
visualSignature
risks
bestFor
```

验收：

- 设计脑暴不会问 API、数据库、权限、商业模式。
- 三个方向都落在 `DESIGN.md` 约束内。
- 三个方向不是换颜色，而是信息层级、密度、状态表达、交互节奏上有明确差异。

### T6. Kami Workbench 模板

目标：生成一个静态 HTML 工作台，内嵌三个可点、可滚动的设计模拟器。

涉及文件：

```text
templates/kami-workbench/workbench.html
templates/kami-workbench/option.html
templates/kami-workbench/workbench.css
skills/bfds-design/references/workbench-authoring.md
```

实施要求：

- `workbench.html` 使用 Kami 的排版气质和阅读外壳。
- 三个设计稿放入 iframe：`option-a.html`、`option-b.html`、`option-c.html`。
- iframe 内设计稿服从目标项目 `DESIGN.md`，不继承 Kami 纸感样式。
- 每个 option 至少包含关键状态或关键交互，不只是静态截图。
- workbench 页面写清楚“在对话中回复选 A/B/C 或合并意见”。

验收：

- `fixtures/docs-design-sample/<slug>/workbench.html` 可直接在浏览器打开。
- 三个 iframe 尺寸稳定，可滚动，可点击基础交互。
- 移动/桌面模拟器不互相挤压，文本不溢出。

### T7. Impeccable 适配层

目标：复用 Impeccable 的 `init`、`detect`、`critique`、`live`，但不把 BFDS 写成 Impeccable fork。

涉及文件：

```text
src/adapters/impeccable/README.md
skills/bfds-design/references/impeccable-integration.md
skills/bfds-implement/references/impeccable-integration.md
```

实施要求：

- 写清楚 BFDS 在 Design Context 阶段优先调用 Impeccable `init`。
- 写清楚 QA 阶段如何调用 `detect`，何时可调用 `critique`。
- 写清楚 live region iteration 如何进入 Impeccable `live`。
- 如果实际命令、入口或 skill 名称无法自动验证，必须标注“待本地验证”，不能编造命令。
- 适配文档要说明 `.impeccable/` 可兼容保留，但 BFDS 主产物放 `docs/design/`。

验收：

- 执行者能从 adapter 文档知道哪些能力来自 Impeccable，哪些来自 BFDS。
- 没有在 vendor 内修改 Impeccable 源文件。
- 找不到 Impeccable 入口时，流程会停止要求验证，而不是假装已调用。

### T8. bfds-design 端到端串联

目标：让用户一句自然语言即可进入设计流程，并最终得到 workbench 和 contract pack。

涉及文件：

```text
skills/bfds-design/SKILL.md
skills/bfds-design/references/intent-router.md
skills/bfds-design/references/surface-change-framing.md
skills/bfds-design/references/design-brainstorm.md
skills/bfds-design/references/workbench-authoring.md
skills/bfds-design/references/contract-pack.md
```

实施要求：

- 流程必须是：router → context → surface framing → brainstorm → workbench → selection → contract pack。
- 没有用户确认 surface framing，不生成 workbench。
- 没有用户选择，不生成 `design-contract.json`。
- 用户选择可以是“选 B”“选 B 合并 A/C 部分”，skill 要把合并结果固化为 selected design。
- 用户要求扩大产品能力时，退回上游，而不是在 BFDS 内继续产品规划。

验收场景：

- “这是 PRD，开始设计”：停在 surface framing 确认。
- “确认，生成三个方案”：生成 workbench。
- “选 B，但导航用 A 的”：生成 contract pack，`status.json` 进入 `contract-ready`。
- “顺便把权限系统也设计了”：提示这属于上游产品/架构范围。

### T9. bfds-implement 端到端串联

目标：让用户用简单输入触发实现，但实现依据来自已确认的 BFDS 产物，而不是聊天记忆。

涉及文件：

```text
skills/bfds-implement/SKILL.md
skills/bfds-implement/references/resume-design-artifacts.md
skills/bfds-implement/references/implementation-protocol.md
skills/bfds-implement/references/visual-fidelity-discipline.md
skills/bfds-implement/references/qa-protocol.md
```

实施要求：

- 先恢复 slug，再读取 contract pack，再扫描目标项目代码。
- `implementation-handoff.md` 是给 Codex/Claude/code agent 的实现入口；`design-contract.json` 是机器约束；`qa-plan.json` 是验证约束。
- 如果 contract pack 缺失，不实现。
- 如果目标代码和 surface framing 不一致，停止重新确认。
- MVP 可以由 `bfds-implement` 自己写代码；后续可把实现委托给 ce-work，但 BFDS 仍提供设计合同和 QA。

验收场景：

- “实现这个方案”，当前线程有 contract-ready slug：读取并实现。
- “实现这个方案”，新 session 只有一个 slug：回放摘要并要求确认。
- “实现这个方案”，没有 slug：拒绝凭记忆实现，回到设计/选择。
- “按 docs/design/settings-prompt 实现”：直接使用指定 slug。

### T10. QA 与 Live 双阶段协议

目标：把“开发者无感的自动比对”和“开发者介入的局部微调”拆开。

涉及文件：

```text
skills/bfds-implement/references/qa-protocol.md
skills/bfds-implement/references/live-region-iteration.md
skills/bfds-implement/references/visual-fidelity-discipline.md
templates/artifacts/qa-report.md
```

实施要求：

- Automatic QA：开发者无感，读取 `qa-plan.json`，捕获实现截图，运行 Impeccable `detect`，做 contract/semantic/state/interaction/visual discipline 检查。
- Live Region Iteration：开发者介入，用户选中区域或描述区域后，调用 Impeccable `live` 或等价局部微调能力。
- QA 不等于截图。截图只是证据，必须对照 contract 和 visual target。
- MVP 不做稳定像素级 overlay diff，不承诺自动 semantic diff 引擎。
- P0/P1/P2 必须修复并复跑；P3 可记录为 polish。

验收：

- `qa-plan.json` 能驱动至少一个 viewport、一个关键状态、一个交互检查。
- QA 报告能列出 issue、severity、evidence、contract rule、recommended fix、rerun result。
- live 流程会记录本次微调关联的 slug、区域、用户意图和结果。

### T11. Fixtures 与前向测试

目标：用真实输入验证 skill 触发、边界、恢复和 artifact 质量。

涉及文件：

```text
fixtures/prd-simple.md
fixtures/current-surface-description.md
fixtures/existing-component-change.md
fixtures/docs-design-sample/settings-prompt/
tests/forward/bfds-design-start.md
tests/forward/bfds-design-existing-surface.md
tests/forward/bfds-design-selection.md
tests/forward/bfds-implement-no-artifacts.md
tests/forward/bfds-implement-resume-one-slug.md
tests/forward/bfds-implement-resume-many-slugs.md
scripts/validate-artifacts.mjs
```

实施要求：

- 前向测试不是单元测试，而是给 agent/skill 的输入和期望行为。
- 每个测试写清：用户输入、仓库初始状态、应该触发哪个 skill、应该读取哪些文件、应该停止还是继续、期望产物。
- 至少覆盖开始设计、现有 surface 改造、用户选择、缺 artifact 实现、新 session 恢复、多 slug 恢复。
- schema 校验脚本只验证 artifact 结构，不替代设计质量判断。

验收：

- 执行者能用 fixtures 手动跑通 MVP 主路径。
- 至少一个负例证明不会把“实现 API 方案”误当成 BFDS 实现。
- 至少一个负例证明没有 contract pack 时不会写代码。

### T12. README 与实施提示词

目标：让新 session 的实施者无需阅读全部聊天历史，也能按同一方案执行。

涉及文件：

```text
README.md
docs/bfds-mvp-design-spec.md
docs/implementation-prompt.md
```

实施要求：

- README 面向使用者，解释 BFDS 做什么、不做什么、如何触发两个 skill。
- `docs/implementation-prompt.md` 面向实施 LLM，包含项目目标、实施顺序、禁止事项、验收标准。
- 提示词必须要求先读 `docs/bfds-mvp-design-spec.md`，再实施。
- 不把 prompt 写成“自由发挥做一个设计系统”，必须绑定本 spec 的任务和文件。

验收：

- 新 session 只拿 README、spec、implementation prompt，也能继续实施。
- prompt 能明确要求复制 Impeccable、创建两个 skill、生成 templates/fixtures/tests，而不是只写概念文档。

## 13. 实施前还应补齐的反幻觉材料

当前方案具备实施条件，但为了让实施 LLM 达到更高确定性，建议先补齐以下材料。它们不是新的产品需求，而是执行 guardrail。

### 13.1 Artifact 示例包

需要一个完整样例：

```text
fixtures/docs-design-sample/settings-prompt/
  workbench.html
  option-a.html
  option-b.html
  option-c.html
  design-contract.json
  implementation-handoff.md
  qa-plan.json
  status.json
```

作用：

- 让执行者知道文件粒度和字段深度。
- 让 `bfds-implement` 有可恢复样例。
- 让 schema 和 QA 协议有真实输入。

### 13.2 Router 决策矩阵

需要在 `skills/*/references/intent-router.md` 中写一个决策矩阵：

```text
用户输入类型
当前线程是否有 slug
仓库是否有 contract-ready slug
是否指定 docs/design/<slug>
应该触发/继续/停止/退回哪里
```

尤其要覆盖：

- “实现这个方案”但无 artifacts。
- “实现这个方案”但有多个 artifacts。
- 用户指定旧 slug。
- 用户说“继续刚才的设计”但当前 session 没上下文。
- 用户需求其实是 API、数据库、重构、bug 修复。

### 13.3 Surface Evidence Checklist

需要在 `surface-change-framing.md` 中加入证据检查：

```text
已有截图/Figma/原型/URL → 作为视觉真相
可运行页面 → 浏览器截图作为当前 surface
只有代码 → 代码推断 + 未视觉验证标记 + 用户确认
只有文字 → 用户描述 + 低置信度标记 + 必要追问
```

这样可以避免执行者在“删改现有页面局部区域”时直接凭代码或想象出稿。

### 13.4 Workbench 质量基线

需要给 workbench 写清楚最低质量线：

- 三个方案必须是真正不同的信息架构/层级/密度/状态处理，不是换色。
- 每个方案至少体现一个关键交互或关键状态。
- iframe 里不能用 Kami 样式偷懒，必须遵守目标 `DESIGN.md`。
- 没真实数据时明确标注占位，不编数据。
- 不能用“圆角卡片 + 彩色左边框”等廉价模板化强调。

### 13.5 Implementation Handoff 固定章节

`implementation-handoff.md` 应固定这些章节：

```text
1. 设计目标
2. 选中方案与合并决策
3. 当前 surface 和改动类型
4. 必须保留
5. 允许改变
6. 禁止改变
7. 视觉还原纪律
8. 数据与文案来源
9. 状态与交互
10. 响应式要求
11. 资产与图标约束
12. QA 入口
13. 未决事项
```

这能让 Codex/Claude/code agent 明确“按 handoff 生码”具体读什么，而不是依赖 skill 隐式理解。

### 13.6 QA 报告格式

需要固定 QA report：

```text
docs/design/<slug>/qa-report.md
```

最小字段：

```text
runId
date
implementation target
reference artifacts
viewports
states
checks run
issues by severity
screenshots/evidence
fixes applied
rerun result
remaining risks
```

### 13.7 明确停止条件

两个 skill 都必须有停止条件。

`bfds-design` 停止：

- 缺产品定义到无法判断用户目标。
- 缺当前 surface，且本次是 modify/remove/replace/restyle。
- 用户没有确认 surface framing。
- 用户没有选择 workbench 方案。
- 用户要求 BFDS 做 API、数据库、权限、架构取舍。

`bfds-implement` 停止：

- 找不到 `design-contract.json`。
- 找不到 `implementation-handoff.md`。
- 找不到 `qa-plan.json`。
- 目标代码和已确认 surface framing 明显不一致。
- 无法运行或无法截图目标页面，导致视觉 QA 不成立。
- Impeccable 入口未验证且该步骤是当前任务必需项。

### 13.8 实施完成定义

MVP 不是“写完两个 SKILL.md”就完成。完成定义：

- `bfds-design` 和 `bfds-implement` 都通过 skill frontmatter 校验。
- `templates/` 有可复用 workbench 和 artifact 模板。
- `fixtures/` 有一个完整 contract-ready 示例。
- `tests/forward/` 覆盖主路径和关键负例。
- `scripts/validate-artifacts.mjs` 能校验样例 artifact。
- README 能让用户知道如何开始设计、继续设计、实现、QA、live。
- spec 中第 8 节验收标准逐项可演示。
