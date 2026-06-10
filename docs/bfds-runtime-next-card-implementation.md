# BFDS Runtime Next-Card 实施方案

日期：2026-06-10

本方案用于第一阶段改造：不合并现有设计产物文件，不改变 BFDS 用户交付流程，只把用户执行 skill 时的大模型热路径从“读协议、记步骤、手写结构”改为“读取当前阶段指令卡、提交当前阶段裸值、由 runtime 产结构”。

## 1. 目标

面向用户执行 skill 的大模型减负，而不是单纯给仓库瘦身。

成功标准：

- 保留完整用户价值链：设计上下文梳理、目标界面与变更边界确认、设计方向探索、三方案设计评审工作台、方案确认、设计交付包、实现、设计还原检查、局部实时微调。
- 常规热路径只要求读取 `SKILL.md` 和 `bfds next` 指令卡。
- 大模型不手写 `status.json`，不手写完整 schema JSON，不跨多个产物同步同一事实。
- 所有写入命令结束后自动返回下一张指令卡，减少工具往返。
- 阶段推进由 runtime/gate 裁决，不能靠聊天记忆跳步。

## 2. 非目标

- 第一阶段不合并 `docs/design/<slug>/` 产物文件。
- 不删除 init 问答、设计脑暴、三方案评审、用户选择、实现验收等用户价值环节。
- 不追求仓库 LOC 最小化。仓库和安装包可以为自包含可靠性保留重复。
- 不做向后兼容层。BFDS 仍在调试阶段，可以同步修改 fixtures、tests 和安装结构。
- 不引入事件 server、像素级 overlay diff 或 Product Design 深集成。

## 3. 关键原则

### 3.1 压缩流程载体，不压缩流程本身

不能减的用户交付环节：

```text
Impeccable init 问答
PRODUCT.md / DESIGN.md 建立和确认
目标界面与变更边界确认
设计方向探索和用户取舍
A/B/C 三方案评审
用户选择或合并方案
设计交付包
实现和设计还原检查
局部实时微调
```

可以减的是模型搬运工作：

```text
读长 reference 才知道下一步
手写完整 JSON 结构
手写 status
在 evidence / contract / handoff / qa-plan 之间同步同一事实
自己判断能不能进入下一阶段
让用户填写字段表单
```

### 3.2 用户是审查者和把关者

选择类、确认类、分支类优先使用 Codex / Claude Code 的问答 UI。runtime 不能机制性调用这些 UI，但 next-card 必须给出问答策略：

- 先由大模型基于材料归纳候选结论。
- 让用户确认、选择或修正。
- 不要求用户按 schema 填表。
- 开放式设计判断一次只问一个短问题。

few-shot 可以保留在 cold-path reference 中作为质量锚点，但不要把具体业务场景文案硬编码到 `SKILL.md` 或 runtime。

## 4. 目标架构

第一阶段采用“自包含 runtime + thin skill”。

```text
scripts/
  bfds.mjs                         # 仓库开发入口
  sync-bfds-runtime.mjs             # 将 runtime 打包到两个 skill
src/runtime/bfds/
  cli.mjs
  gate.mjs
  next-card.mjs
  answer.mjs
  contract-pack.mjs
  status.mjs
  validate.mjs
  schemas/
  templates/
skills/bfds-design/
  SKILL.md
  scripts/bfds.mjs                  # skill-local 入口，调用内置 runtime
  runtime/bfds/                     # 安装时自包含
skills/bfds-implement/
  SKILL.md
  scripts/bfds.mjs
  runtime/bfds/
```

仓库中的 `src/runtime/bfds/` 是源；两个 skill 内的 `runtime/bfds/` 是打包副本。`validate-artifacts.mjs` 或新增 parity 校验必须确保三处 runtime 关键文件不漂移。

### Trade-off：shared runtime vs skill-local runtime

选择 skill-local runtime。

收益：

- 安装后两个 skill 自包含，不依赖 BFDS 仓库路径。
- 不引入第三个 skill，降低触发和安装不确定性。
- Codex global skill 和 Claude project skill 都能用同一模式。

代价：

- 仓库和安装包会保留重复 runtime。
- 需要同步脚本和 parity 校验防漂移。

这个代价可接受，因为目标是用户执行热路径减负，不是仓库 LOC 最小。

## 5. Runtime 命令面

所有命令支持：

```text
--json       输出机器可读结果
--root DIR   默认 docs/design
```

所有写命令成功、阻塞或字段非法时都打印 next-card。调用者不需要再手动运行一次 `next`；错误路径也必须返回缺口卡，避免大模型在报错处搁浅。

### 5.1 通用读取

```bash
node <skill-dir>/scripts/bfds.mjs next <slug> [--request "<用户原始请求摘要>"]
node <skill-dir>/scripts/bfds.mjs list --json --limit 4 [--state <state>]
node <skill-dir>/scripts/bfds.mjs validate <slug>
```

`list` 默认不过滤状态，按最近更新时间返回可恢复设计任务；`--state` 只作为显式过滤。这样实现侧可以恢复 `contract-ready`、`implementing`、`qa-failed` 等中断任务。

`next --request` 在 `CONTEXT_BLOCKED` 时写入挂起请求证据，隔离任务级请求，防止 init 阶段把当前设计需求写入项目级 `PRODUCT.md` / `DESIGN.md`。

### 5.2 阶段写入：answer

`answer` 是减负承重墙。它必须接受扁平裸值，而不是要求大模型先写完整 evidence JSON。

输入方式：

```bash
node <skill-dir>/scripts/bfds.mjs answer <slug> --stage surface \
  --field surface="..." \
  --field currentSource="..." \
  --field changeType="modify" \
  --field keep="..." \
  --field change="..." \
  --field avoid="..." \
  --field confirmationQuote="..."
```

规则：

- `--field key=value` 是主入口。
- 同名 `--field` 可重复，runtime 展开为数组。
- key 是阶段级扁平字段，不暴露 schema 内部深路径。
- runtime 负责补 `slug`、路径、时间、artifact references、默认空数组和 schema 结构。
- runtime 写入对应 evidence 文件后立即 gate，并打印下一张 next-card。
- 不允许要求大模型先写临时 JSON 再喂给命令。

长文本可用非 JSON 的 stdin line protocol，但只能作为 `--field` 的替代输入，不改变扁平字段契约：

```text
surface: ...
currentSource: ...
keep: ...
keep: ...
confirmationQuote: ...
designThesis<<END
多行设计判断。
可以包含换行、列表和用户原话。
END
```

stdin line protocol 支持 `key: value` 和 `key<<END ... END` 两种形式。禁止把 JSON 字符串塞进字段值绕过条目式契约；嵌套对象必须使用对应命令的 `--add <entry-type>` 分组提交。

### 5.3 init 阶段

init 也是多轮对话，和 brainstorm 一样支持逐轮追加。

逐轮追加：

```bash
node <skill-dir>/scripts/bfds.mjs answer <slug> --stage init \
  --append-round \
  --field question="..." \
  --field answerQuote="..."
```

收敛确认：

```bash
node <skill-dir>/scripts/bfds.mjs answer <slug> --stage init \
  --finalize \
  --field source="user-interview" \
  --field productPath="PRODUCT.md" \
  --field designPath="DESIGN.md" \
  --field productMode="created" \
  --field designMode="seed" \
  --field userConfirmationQuote="..."
```

init 的真实用户问答和 `PRODUCT.md` / `DESIGN.md` 写作仍由大模型按 Impeccable 纪律完成。runtime 只负责记录多轮访谈证据、验证项目级文档形状、阻止任务级需求污染项目级上下文。

### 5.4 surface 阶段

必填裸值：

```text
surface
currentSource
changeType
keep
change
avoid
confirmationQuote
```

runtime 展开为 `evidence/surface.json`，并校验：

- `changeType` 属于 `create`、`extend`、`modify`、`remove`、`replace`、`merge`、`restyle`。
- `modify`、`remove`、`replace`、`restyle` 必须有现状证据或用户确认。
- 仅代码推断时必须标记“现状由代码推断，未视觉验证”。

### 5.5 brainstorm 阶段

brainstorm 是多轮对话，不是一次性表单。

逐轮追加：

```bash
node <skill-dir>/scripts/bfds.mjs answer <slug> --stage brainstorm \
  --append-round \
  --field question="..." \
  --field answer="..."
```

用户拒绝继续追问：

```bash
node <skill-dir>/scripts/bfds.mjs answer <slug> --stage brainstorm \
  --field mode="user-skipped" \
  --field skipReasonQuote="..."
```

收敛确认：

```bash
node <skill-dir>/scripts/bfds.mjs answer <slug> --stage brainstorm \
  --finalize \
  --field directionTradeoff="..." \
  --field confirmationQuote="..."
```

gate 要求：

- 正常模式至少两轮有效设计问答后才能 finalize。
- 用户明确拒绝继续追问时可进入 `user-skipped`，但仍必须提出 2-3 个方向取舍并获得用户确认。
- brainstorm 只处理设计表达，不扩展产品能力。

### 5.6 directions 阶段

directions 独立于 brainstorm-dialogue，不能被静默吞并。它是工作台不得临时改方向的依据。

```bash
node <skill-dir>/scripts/bfds.mjs directions <slug> \
  --option A \
  --field name="..." \
  --field designThesis="..." \
  --field hierarchy="..." \
  --field density="..." \
  --field motion="..." \
  --field stateTreatment="..." \
  --field layoutStrategy="..." \
  --field interactionModel="..." \
  --field visualSignature="..." \
  --field differenceDimension="hierarchy" \
  --field keep="..." \
  --field change="..." \
  --field avoid="..." \
  --field risks="..." \
  --field bestFor="..."
```

同一命令可重复 `--option A/B/C`，也可分三次提交。runtime 写入 `evidence/directions.json` 前校验：

- 必须有 A/B/C 三个方案。
- 每个方案必须引用 `surface.json` 和 `brainstorm-dialogue.json`。
- 三个方案至少在两个维度上不同。
- 换色、换圆角、换阴影不算有效差异。
- 每个方案包含 keep/change/avoid。
- 至少一个方案覆盖关键状态或关键交互。

### 5.7 workbench

```bash
node <skill-dir>/scripts/bfds.mjs workbench <slug> --scaffold
node <skill-dir>/scripts/bfds.mjs workbench <slug> --validate
```

三个 option 的真实内容是设计创作物，不能由 runtime 用占位文件冒充完成。runtime 只负责脚手架、模板、占位标记校验和 gate。

`--scaffold` 检查 `directions.json` 后生成或刷新：

```text
workbench.html
workbench.css
option-a.html
option-b.html
option-c.html
```

脚手架文件必须包含占位标记：

```html
<!-- BFDS_PLACEHOLDER -->
```

gate 和 `workbench --validate` 必须把含占位标记的文件视同缺失，不得推进到 `NEEDS_SELECTION`。大模型按 `directions.json` 和 next-card 指令填入真实三方案后，运行 `workbench --validate`：

- 检查四个 HTML 和 `workbench.css` 均存在。
- 检查没有 `BFDS_PLACEHOLDER`。
- 检查 `workbench.html` 能引用 A/B/C 三个 iframe。
- 检查 option 文件不依赖 `workbench.css` 才能呈现方案自身样式。
- 返回下一张 next-card。

该阶段 next-card 必须携带工作台质量底线：忠于 `directions.json`、方案自带目标产品 UI 样式、不临时改方向、不用假资产、不用 emoji/文本符号/CSS art 冒充真实资产、文本不溢出、移动和桌面模拟器不互相挤压。必要 reference 指向 `workbench-authoring.md`。

第一阶段不合并为单 HTML。保留现有 iframe 结构，降低视觉回归风险。

### 5.8 selection

```bash
node <skill-dir>/scripts/bfds.mjs select <slug> \
  --field selectionQuote="..." \
  --field selectedOption="B" \
  --field mergedFrom="A.navigation" \
  --field mergedFrom="C.errorState" \
  --field confirmationQuote="..."
```

runtime 做结构性校验：

- `selectedOption` 必须是 `A`、`B`、`C` 或显式合并结构。
- `selectionQuote` 和 `confirmationQuote` 必须非空。
- 合并方案必须声明来源和合并点。

短语黑名单只作为警告绊线和 pressure test，不作为唯一硬拒绝依据，避免误伤“我选 B，不用你推荐一个”这类合法表达。大模型可以给推荐，但必须用问答 UI 让用户明确确认 A/B/C 或合并方案。

### 5.9 contract pack

```bash
node <skill-dir>/scripts/bfds.mjs pack <slug> \
  --add screen \
  --field id="settings-prompt-default" \
  --field description="..." \
  --field composition="..." \
  --field hierarchy="..." \
  --field density="..."
node <skill-dir>/scripts/bfds.mjs pack <slug> \
  --add state \
  --field name="error" \
  --field expectation="..." \
  --field priority="P1"
node <skill-dir>/scripts/bfds.mjs pack <slug> \
  --add interaction \
  --field trigger="..." \
  --field result="..." \
  --field accessibility="..."
node <skill-dir>/scripts/bfds.mjs pack <slug> \
  --add acceptanceRule \
  --field id="BFDS-AC-01" \
  --field rule="..." \
  --field severity="P1"
node <skill-dir>/scripts/bfds.mjs pack <slug> \
  --confirm \
  --field echoConfirmQuote="..."
```

`design-contract.json` 不能假装完全自动生成。生成策略：

机械预填：

```text
slug
title
selectedOption
sourceArtifacts
surface
changeType
keep
change
avoid
selectionQuote
workbench paths
```

大模型判断字段：

```text
screens             # 必填非空，条目式提交
states              # 必填非空，条目式提交
interactions        # 必填非空，条目式提交
acceptanceRules     # 必填非空，条目式提交
tokens              # 必须显式提交规则或 none
responsive          # 必须显式提交规则或 none
motion              # 必须显式提交规则或 none
assets              # 必须显式提交规则或 none
```

可置空字段必须显式声明：

```bash
node <skill-dir>/scripts/bfds.mjs pack <slug> --set tokens=none --field reason="无新增 token，全部映射到 DESIGN.md 或项目现有 token"
node <skill-dir>/scripts/bfds.mjs pack <slug> --set motion=none --field reason="无新增动效，复用现有 focus/transition 规则"
node <skill-dir>/scripts/bfds.mjs pack <slug> --set assets=none --field reason="不新增图片或图标资产"
```

`tokens=none` 不能省略 `tokens` 对象。runtime 应写入 `source: "DESIGN.md or existing project tokens"` 和一条说明性 rule。`responsive`、`motion`、`assets` 的 `none` 可落为空数组，但 reason 必须进入 `implementation-handoff.md` 或生成日志，避免把“未判断”伪装成“无需规则”。

runtime 行为：

- 先从 evidence 预填机械字段。
- 检查判断字段缺口。
- 缺字段时返回 `NEEDS_CONTRACT_JUDGMENT` next-card，列出缺口和扁平字段提交示例。
- 禁止用 `--field screen="{...}"` 等 JSON 字符串绕过条目式提交。
- 判断字段齐全后返回 `NEEDS_CONTRACT_ECHO` next-card，回显 `selectionQuote`、`selectedOption`、合并来源、主要 screen/state/interaction/acceptanceRules 摘要，并要求大模型用问答 UI 取得用户确认。
- 只有收到 `pack --confirm --field echoConfirmQuote="..."` 后，才生成 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`。
- 生成后运行 artifact 校验并打印下一张 next-card。

### 5.10 implement 状态推进

```bash
node <skill-dir>/scripts/bfds.mjs mark <slug> --state implementing
node <skill-dir>/scripts/bfds.mjs mark <slug> --state implemented
node <skill-dir>/scripts/bfds.mjs mark <slug> --state qa-failed
node <skill-dir>/scripts/bfds.mjs mark <slug> --state live-iterating
node <skill-dir>/scripts/bfds.mjs mark <slug> --state done
```

规则：

- 只有 `CONTRACT_READY` / `IMPLEMENT_READY` 可进入实现。
- `qa-failed` 和 `done` 需要 `qa-report.md` 已存在。
- `qa-passed` 只能通过 `qa --pass` 进入，避免双入口漂移。
- 标记后自动打印 next-card。

### 5.11 QA 和 live

```bash
node <skill-dir>/scripts/bfds.mjs qa <slug> --start
node <skill-dir>/scripts/bfds.mjs qa <slug> --check <check-id> --field result="pass|fail" --field evidence="..." --field notes="..."
node <skill-dir>/scripts/bfds.mjs qa <slug> --pass
node <skill-dir>/scripts/bfds.mjs live <slug> --field region="..." --field intent="..." --field result="..."
```

QA 仍由 `bfds-implement` 消费 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`，实现代码、捕获证据、运行 Impeccable detect，并写 `qa-report.md`。runtime 负责阶段、报告结构和状态标记，不替代设计判断。

`qa --pass` 内部完成 `qa-passed` 状态迁移，且必须先验证 `qa-report.md` 对 `qa-plan.json` 每个 check ID 都有逐条裁决。runtime 不判断语义质量，但可以拒绝结构上没有逐项裁决的“只截图”报告。

## 6. Next-Card 格式

next-card 是用户执行热路径的主界面。

目标行数：

- 常规卡片目标不超过 40 行。
- 硬上限 80 行。
- 超过上限视为测试失败，必须把细节移到 reference 或缺口列表压缩。

文本格式：

```text
BFDS_NEXT_CARD v1
slug: settings-prompt
phase: NEEDS_SURFACE
state: draft

本阶段必须获得:
- 目标界面
- 现状来源
- 改动类型
- 必须保留
- 允许改变
- 必须避免
- 用户确认原话

建议问法:
- 先归纳候选边界，再让用户确认或修正。
- 选择/确认类优先使用问答 UI。

禁止:
- 生成三方案
- 生成评审工作台
- 生成设计交付包

完成后运行:
node <skill-dir>/scripts/bfds.mjs answer <slug> --stage surface --field ...

必要 reference:
无
```

`--json` 输出必须包含同等信息，便于测试。

## 7. Skill 改造

### 7.1 bfds-design

`SKILL.md` 保持薄入口：

- 定位 skill 目录。
- 为本次设计确定 `<slug>`。
- 立刻运行 `node <skill-dir>/scripts/bfds.mjs next <slug> --request "<用户请求摘要>"`。
- 只按 next-card 当前阶段行动。
- 写命令后读取命令自动返回的 next-card。
- 选择/确认类输入优先使用问答 UI。
- 不主动读取 references，除非 next-card 指明需要。

### 7.2 bfds-implement

`SKILL.md` 保持薄入口：

- 用户未指定 `<slug>` 时运行 `list --json --limit 4`，默认列出最近可恢复设计任务；只有用户明确要求某类状态时才加 `--state`。
- 用问答 UI 让用户选择设计任务。
- 对目标设计任务运行 `next`。
- 只有 next-card 允许实现、QA 或 live 时继续。
- 实现时读取 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`。

## 8. 硬约束

runtime/gate 必须强制：

- 无可信 `PRODUCT.md` / `DESIGN.md`，不进入目标界面确认。
- `CONTEXT_BLOCKED` 时只做项目级 init，不处理任务级设计请求。
- 无 `surface.json` 用户确认，不进入设计方向探索。
- 无有效 `brainstorm-dialogue.json` 或用户明确拒绝继续追问记录，不生成方向规格。
- 无 A/B/C `directions.json`，不生成评审工作台。
- A/B/C 差异不足，不生成评审工作台。
- 评审工作台或 option 文件含 `BFDS_PLACEHOLDER` 时，不进入方案确认。
- 无用户明确选择或合并确认，不生成设计交付包。
- `selectedOption` 不属于 A/B/C 或显式合并结构时，不生成设计交付包。
- contract 判断字段缺失时，不生成 `design-contract.json`。
- `echoConfirmQuote` 缺失时，不生成 `design-contract.json`。
- 无设计交付包，不实现。
- `qa-report.md` 未覆盖 `qa-plan.json` 每个 check ID 时，不允许 `qa --pass`。

## 9. 软约束

这些不应写死为 gate：

- 每阶段必须问几个问题，除 brainstorm 正常模式至少两轮外。
- 用户必须按固定自然语言格式回答。
- 确认文案必须使用固定模板。
- 三方案必须套固定风格模板。
- 每次都必须读取某个 reference。

注意：三方案差异性不是软约束。固定维度清单可以开放，差异性底线必须硬校验。

## 10. 安装打包

`install-bfds-skills.mjs` 必须安装可运行的自包含 skill。

Codex：

```text
${CODEX_HOME:-$HOME/.codex}/skills/bfds-design/
${CODEX_HOME:-$HOME/.codex}/skills/bfds-implement/
<target-project>/.agents/skills/impeccable/
```

Claude Code：

```text
<target-project>/.claude/skills/bfds-design/
<target-project>/.claude/skills/bfds-implement/
<target-project>/.claude/skills/impeccable/
<target-project>/.claude/agents/
<target-project>/.claude/hooks/
```

每个 BFDS skill 目录必须包含：

```text
SKILL.md
scripts/bfds.mjs
runtime/bfds/
references/
```

schema 和模板的权威来源迁入 `runtime/bfds/schemas/` 与 `runtime/bfds/templates/`。skill 内不再保留第二套 schema/template 家；如保留 `assets/`，只能用于非权威冷路径材料，不能存放 artifact schema 或工作台模板。

安装 dry-run 需要显示 runtime 被复制。安装自测需要检查：

```bash
test -f <installed-skill>/scripts/bfds.mjs
test -d <installed-skill>/runtime/bfds
```

## 11. 测试与回归

改造前先跑当前基线并记录结果。改造后每个阶段至少跑：

```bash
git diff --check
node scripts/validate-artifacts.mjs fixtures/docs-design-sample/settings-prompt
node scripts/validate-artifacts.mjs --forward-tests
node scripts/validate-artifacts.mjs --pressure-tests
node scripts/validate-artifacts.mjs --gate-tests
node skills/bfds-design/scripts/validate-artifacts.mjs fixtures/docs-design-sample/settings-prompt
node skills/bfds-implement/scripts/validate-artifacts.mjs fixtures/docs-design-sample/settings-prompt
```

如果修改 skill frontmatter 或 `agents/openai.yaml`，还要运行 skill frontmatter / OpenAI metadata 校验。

新增测试要求：

- `next-card` 行数上限测试。
- 所有写命令自动返回 next-card。
- 字段非法或缺字段时返回缺口卡。
- stdin line protocol 支持 `key<<END ... END` 多行块。
- init 逐轮追加和 finalize。
- `answer --stage surface` 用扁平字段生成合法 `surface.json`。
- brainstorm 逐轮追加和 finalize。
- directions 三方案差异性硬校验。
- `workbench --scaffold` 产物带占位标记，gate 不推进；`workbench --validate` 拒绝占位标记并检查 `workbench.css`。
- `pack` 机械字段预填，判断字段缺失时返回缺口卡。
- `pack --add screen/state/interaction/acceptanceRule` 用条目式字段生成对象数组，并拒绝 JSON 字符串后门。
- `pack` 要求 `screens`、`states`、`interactions`、`acceptanceRules` 非空；`tokens`、`responsive`、`motion`、`assets` 必须提交规则或显式 `none`。
- `pack` 判断字段齐全后返回 contract 回显卡；缺 `echoConfirmQuote` 时不生成设计交付包。
- `list --json --limit 4` 默认支持 implement 恢复选单，不遗漏 `implementing` / `qa-failed`。
- `mark` 状态推进遵守 QA 报告前置条件，且不接受 `qa-passed`。
- `qa --pass` 要求 `qa-report.md` 覆盖所有 qa-plan check ID，并内部标记 `qa-passed`。
- `next --request` 在 `CONTEXT_BLOCKED` 时写入挂起请求并隔离任务级请求。
- 安装后的 skill-local `scripts/bfds.mjs` 能脱离 repo-root 运行。

人工前向检查仍保留：

- 开始设计。
- 现有目标界面改造。
- 用户选择和合并方案。
- 无设计产物时拒绝实现。
- 新 session 单设计任务恢复。
- 新 session 多设计任务恢复。
- API、数据库、重构、bug 修复负例不触发 BFDS。

## 12. 实施顺序

1. 新增 runtime 源目录和 `bfds.mjs` CLI，复用现有 gate/validate 逻辑。
2. 实现 next-card，并让现有 gate 结果映射到卡片。
3. 实现 `answer` 扁平字段输入和 surface/init/brainstorm evidence 写入。
4. 实现 `directions`、差异性校验和 `workbench --scaffold/--validate` 命令，确保占位文件不会推进 gate。
5. 实现 `select` 和 `pack`，其中 contract 使用机械预填加条目式判断字段提交。
6. 实现 `list`、`mark`、`qa`、`live` 的 implement 侧命令。
7. 增加 runtime 同步/打包脚本，更新安装脚本和安装自测。
8. 精简两个 `SKILL.md` 为 next-card 驱动入口，并同步删除或替换旧入口 `bfds-gate.mjs`、`bfds-status.mjs` 及 skill 内旧拷贝，避免安装后出现两套半入口。
9. 更新 forward / pressure 测试和新增 next-card 测试。
10. 跑完整验证，记录无法运行项和原因。

## 13. 主要 trade-off

### 13.1 保留 artifact 文件 vs 合并为单状态文件

选择：第一阶段保留现有文件。

收益：

- 视觉和实现回归风险低。
- 现有 fixture、校验和测试迁移成本低。
- 不会让大模型每轮读取一个越来越大的状态文件。

代价：

- 文件数暂时不下降。
- 需要 runtime 防止同一事实跨文件漂移。

### 13.2 扁平字段 CLI vs JSON 输入

选择：扁平字段 CLI，必要时支持非 JSON stdin line protocol。

收益：

- 大模型不再手写 schema 结构。
- runtime 可以集中补齐路径、状态、默认值和引用。
- 缺口可以被 next-card 精准提示。

代价：

- CLI parser 更复杂。
- 长设计判断字段的命令行会变长，需要 stdin line protocol 兜底。

### 13.3 强 gate vs 灵活推进

选择：用户价值链相关阶段使用强 gate。

收益：

- 防跳步、防凭记忆实现、防工作台临时改方向。
- context 缺失时更容易恢复。

代价：

- 合法但表达模糊的用户请求可能被阻塞。
- next-card 必须把缺口说清楚，否则用户会感觉被流程卡住。

### 13.4 自包含重复 vs shared runtime

选择：自包含重复。

收益：

- 安装后不依赖 BFDS 仓库路径。
- Codex / Claude Code 分发更稳。

代价：

- 仓库和安装包存在重复。
- 必须用同步脚本和 parity 测试管理漂移。

### 13.5 问答 UI 指导 vs 机制强制

选择：next-card 输出问答 UI 指导，skill 明确要求选择/确认优先使用问答 UI。

收益：

- 用户保持审查者角色。
- 不把用户变成字段填写者。

代价：

- runtime 无法真正强制 agent 使用某个 UI 工具。
- 需要 pressure tests 验证 skill 行为。

## 14. 定稿决策

1. `next-card` 常规目标 40 行、硬上限 80 行。不要再收紧；`CONTEXT_BLOCKED` 和 Impeccable init 卡片需要容纳必要子流程。
2. 第一阶段采用 skill-local runtime，不新增第三个 `bfds-runtime` skill。判据是安装后的 `skills/` 需要不依赖构建即可运行，因此接受 runtime 拷贝和 parity 校验。
3. directions 继续使用 `--option` 分组提交。长文本用 stdin block 兜底。
4. `pack` 使用 `--add <entry-type>` 条目式提交。`screens`、`states`、`interactions`、`acceptanceRules` 必填非空；`tokens`、`responsive`、`motion`、`assets` 必须提交规则或显式 `none`。
5. brainstorm 正常模式保持至少两轮有效问答。用户明确拒绝继续追问时走 `user-skipped`，但仍需方向取舍确认；不允许大模型按“材料足够”自行跳过。
