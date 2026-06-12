# 设计方向探索

本阶段是 BFDS 的核心设计判断层：把 `DESIGN.md`、`PRODUCT.md`、目标界面证据和当前代码/页面现状，蒸馏成可被用户选择、可被代码实现、可被实现后自审验证的设计方向。本阶段只处理设计表达和实现方向，不扩展产品能力。

输出顺序固定：

1. `docs/design/<slug>/evidence/brainstorm-dialogue.json`
2. `docs/design/<slug>/evidence/directions.json`

写命令会自动返回 next-card；按返回卡片继续。只有恢复中断状态或卡片明确要求时，才额外运行 `bfds.mjs next`。next-card 没进入 `NEEDS_WORKBENCH` 前，不生成评审工作台或方案 HTML。

## 苏格拉底式问答

本阶段复用 Impeccable `shape` 的设计发现纪律，但流程留在 BFDS：只做任务级设计方向探索，不写代码，不跳过 `brainstorm-dialogue.json` 和 `directions.json`。

至少完成 2 轮用户参与的判断校准，不固定上限。每轮只校准一个关键设计不确定性，并等待用户回答或确认。优先用已有 `PRODUCT.md`、`DESIGN.md`、PRD、`surface.json` 和目标源码/视觉证据做假设，再让用户确认或覆盖；答案明显时用“我判断为 X，确认吗？”而不是把所有菜单摊给用户。

每轮提问前先说明为什么问这一项，以及它会影响：

- 信息层级、密度、状态、动效、交互节奏或局部结构中的哪一项。
- `DESIGN.md` 中哪些 token、组件规则、状态语义或禁用项。
- 哪些现有组件/源码复用、允许变更边界或后续自审检查。

开始提问前先定位 grounding 证据：目标界面证据、`DESIGN.md` 具体 token/组件规则/小节、可复用源码文件或组件名。找不到源码证据时要明说“暂无可验证源码复用证据”，不能把“复用现有组件”写成无来源假设。

不要问 API、数据模型、权限、商业模式、后端架构，也不要在本阶段重新确认目标界面。不要把原型里已经能看见的布局事实再问一遍，例如“按钮放左边还是右边”这类肉眼可见问题。

上下文清楚时也不能静默跳过脑暴。第一轮可以压缩为判断式确认，例如：“我判断本次应采用低干扰状态提示，沿用 `DESIGN.md` 的 Tag/Badge 规则并只改列表行内标签区域。确认吗？”但仍必须完成第二轮判断校准或方向分叉确认，并写入 `brainstorm-dialogue.json`。

如果内容范围、关键状态、`DESIGN.md` 偏离边界、代码复用边界或 A/B/C 方向分叉仍不清楚，必须继续追问；不能为了满足 2 轮下限直接进入 `directions.json`。

## 专业维度

每条问答必须标注一个 `dimension`，并写清三个影响字段：

- `designImplication`：这条回答如何影响信息层级、密度、状态、动效或局部结构。
- `designSystemImplication`：这条回答如何约束 `DESIGN.md` 里的 token、组件规则、状态语义、字体、间距、动效或禁用项。
- `implementationImplication`：这条回答如何影响现有组件复用、允许变更边界、实现风险或后续自审检查。

至少覆盖两个不同维度，优先从以下维度动态选择：

- `primary-action`：用户到达目标界面后最先要理解或完成的动作；决定主视觉层级。
- `user-mindset`：用户当时是赶时间、焦虑、探索、复核还是高频操作；决定界面安静程度和反馈强度。
- `content-data-range`：真实内容和数据范围，包含 0 条、典型值、最大值、长文本、动态内容；决定密度、溢出和空状态。
- `state-edge-cases`：默认、空、加载、错误、成功、禁用、权限不足等必须高保真呈现的状态；决定状态表达方案。
- `visual-direction`：本目标界面的色彩策略、视觉承诺和是否允许偏离项目默认 `DESIGN.md`。
- `scene-sentence`：一句物理场景描述：谁在什么环境、光线和情绪下使用；逼出明暗、密度和动效取舍。
- `anchor-reference`：具名参考和反参考，必须说明具体借鉴点或避开的点，不接受“现代、干净、高级”这类形容词。
- `scope-fidelity`：本次要 sketch、mid-fi、高保真还是可实现级；覆盖一个组件、一个页面、一个流程还是整块目标区域。
- `constraints-accessibility`：响应式、键盘、对比度、减弱动效、长文本、本地化等约束。
- `local-preservation`：局部改造时哪些周边节奏、组件 API、导航、数据流和品牌 token 必须保留。

示例问法：

- “这个目标区域看起来是高频设置流，我判断用户更需要快速复核而不是探索。确认吗？这会让实现优先保留 `SettingsPromptPanel.tsx` 的表单节奏，并按 `DESIGN.md` 的 `spacing.sm/md` 调整输入区，而不是新增展示型卡片。”
- “真实内容范围我还缺一项：典型情况下有多少条、最长文案多长、空状态是否常见？这会决定密度、溢出处理和自审时必须覆盖的长文案检查。”
- “从 `DESIGN.md` 看默认应保持 restrained 产品 UI；这次是否允许单个状态使用更强提示色，还是必须完全沿用现有 token？”
- “请给 1-2 个具名参考或反参考，并说明具体借鉴点，例如状态反馈、表单密度、列表节奏，而不是只说现代或清爽。”

至少完成两轮有效判断校准后，提出 2-3 个方向及取舍，并说明每个方向会在哪些设计维度上分叉；可以给出推荐和理由，但不能替用户选择。Claude Code 用 `AskUserQuestion` 让用户确认、合并或调整。用户确认后，写 `brainstorm-dialogue.json`。

如果用户明确拒绝继续追问，仍要做一轮压缩设计判断确认：记录用户拒绝追问的原话、当前判断的 `designImplication`、`designSystemImplication` 和 `implementationImplication`。随后 `brainstorm-dialogue.json` 使用 `mode: "user-skipped"`，记录 `skipReasonQuote`，并先提出 2-3 个方向取舍取得用户确认。

## 方向规格

`directions.json` 必须引用同目录的 `surface.json` 和 `brainstorm-dialogue.json`：

```json
{
  "surfaceEvidence": "docs/design/<slug>/evidence/surface.json",
  "brainstormDialogueEvidence": "docs/design/<slug>/evidence/brainstorm-dialogue.json"
}
```

每个方案必须包含：

```json
{
  "optionId": "A",
  "name": "Quiet Precision",
  "designThesis": "用更安静的层级和明确状态减少输入焦虑。",
  "sourceConstraints": ["PRODUCT.md: 高频设置场景", "DESIGN.md: colors.primary / spacing.sm / components.button-primary"],
  "designSystemRules": [
    "DESIGN.md: colors.primary 只用于 durable actions 和 selected states；本方案只把保存主动作映射到该 token。",
    "DESIGN.md: spacing.sm/md 与 rounded.sm 控制输入区、帮助信息和按钮间距；不新增展示型卡片阴影。"
  ],
  "codeReuseHypothesis": [
    "src/pages/settings/SettingsPromptPanel.tsx: 保留 route shell、保存数据流和组件 API。",
    "src/components/forms/PromptTextarea.tsx + src/components/InlineStatus.tsx: 复用输入、校验和保存反馈。"
  ],
  "allowedChangeBoundary": "只改提示词输入区、帮助信息和局部状态反馈，不改页面导航和保存数据流。",
  "hierarchy": "主输入区第一优先。",
  "density": "snug",
  "motion": "低存在感 focus 和验证反馈。",
  "stateTreatment": "error/loading/success 都在输入区附近呈现。",
  "layoutStrategy": "保留周边布局，只重排输入和帮助信息。",
  "interactionModel": "输入、保存、重置和错误解释在同一局部完成。",
  "visualSignature": "细分隔、稳定基线、单一强调动作。",
  "differenceDimensions": ["hierarchy", "density"],
  "implementationRisk": "low",
  "selfReviewChecks": [
    "保存主动作仍是唯一使用 colors.primary 的控件，错误/成功状态不硬编码新颜色。",
    "diff 不触及 SettingsPromptPanel.tsx 的 route、保存数据流和公开组件 API。",
    "PromptTextarea.tsx 在 long text、error、loading、success 下不破坏输入区层级。"
  ],
  "keep": ["页面导航"],
  "change": ["输入区层级"],
  "avoid": ["新增无关设置项"],
  "risks": ["视觉记忆点偏少"],
  "bestFor": "高频设置"
}
```

三个方案至少在两个维度上不同：信息架构、层级、密度、状态表达、交互模型、动效角色、局部保留范围、视觉签名。换色、换圆角、换阴影不算差异。

每个方向都必须能回答“实现阶段怎么做”和“实现后怎么自审”。只写审美方向、不写 `designSystemRules`、`codeReuseHypothesis`、`allowedChangeBoundary`、`implementationRisk` 或 `selfReviewChecks` 的方向不能进入评审工作台。

## 自检

写入 `directions.json` 前确认：

- 已写入并通过 `bfds.mjs next` 检查 `brainstorm-dialogue.json`。
- 使用了可信 `PRODUCT.md` / `DESIGN.md` 和 `surface.json`。
- 每轮问答都写清 `designSystemImplication` 和 `implementationImplication`。
- 没有新增未确认产品能力。
- A/B/C 都包含 keep/change/avoid。
- A/B/C 都包含具体 `DESIGN.md` token/组件规则/小节引用、带源码路径或组件名的代码复用假设、允许变更边界、实现风险和自审检查点。
- 至少一个方案覆盖关键状态或关键交互。
- 没有“沿用 DESIGN.md 规则”“复用现有组件”“现代、清爽、高级”这类无法落地的空泛句。
