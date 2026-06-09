---
name: bfds-design
description: 当用户明确要求从 PRD、产品方案、原型、截图、Figma、URL、现有页面或组件开始 BFDS 前端设计时使用；也用于继续已有 BFDS 设计、在已有评审工作台/status.json 上选择 A/B/C 或合并方案、固化 docs/design/<slug> 设计交付包、以及对当前 BFDS 设计做局部实时微调。不要用于后端、数据库、普通 bug 修复、纯代码重构、算法实现、接口实现、没有设计意图的请求，或未关联 BFDS 评审工作台/status.json 的泛泛前端工作。
---

# BFDS Design

BFDS 是设计补全层（Design Completion Layer）。它只在需求大致明确后补齐前端设计产物，不重新做产品规划、后端架构、API、数据库、权限或通用工程实现。

## 安装后路径约定

先定位本 skill 目录（包含当前 `SKILL.md` 的目录）。BFDS 自带资源优先从这里读取：

- 模板：`assets/templates/`
- 脚本：`scripts/`
- 协议：`references/`

如果当前仓库也有 repo-root `templates/`、`scripts/`、`vendor/impeccable/`，可以作为开发态 fallback。不要要求必须存在 repo-root BFDS 仓库才继续。

Impeccable 不嵌在 BFDS skill 内部。需要设计上下文或 live 时，优先使用目标项目已安装的宿主同级 bundle：Codex / agents 为 `.agents/skills/impeccable/`，Claude Code 为 `.claude/skills/impeccable/`。

## 使用前先读

- 每次触发先读 [intent-router.md](references/intent-router.md)，并运行 `node <bfds-design-skill-dir>/scripts/bfds-context.mjs --json`。
- 设计上下文缺失或需要 Impeccable：读 [impeccable-integration.md](references/impeccable-integration.md)。
- 进入目标界面确认：读 [surface-change-framing.md](references/surface-change-framing.md)。
- 进入设计方向探索：读 [design-brainstorm.md](references/design-brainstorm.md)。
- 进入评审工作台生成：读 [workbench-authoring.md](references/workbench-authoring.md)。
- 用户选择方案后：读 [contract-pack.md](references/contract-pack.md)。

## 执行合同

BFDS Design 是状态机，不是可跳步清单。每次执行都先建立并维护一个阶段检查清单；第 N 步的完成证据不存在时，禁止进入第 N+1 步。

可信目标项目上下文只来自：

- 目标项目根目录下的 `PRODUCT.md` / `DESIGN.md`
- 目标项目 `.agents/context/PRODUCT.md` / `.agents/context/DESIGN.md`
- 目标项目 `docs/PRODUCT.md` / `docs/DESIGN.md`

`vendor/`、`open-sources/`、`fixtures/`、第三方源码、样例仓库、测试夹具里的 `PRODUCT.md` / `DESIGN.md` 永远不算当前目标项目上下文。

## 状态机

| 状态 | 进入条件 | 完成证据 | 下一步 |
|---|---|---|---|
| `intent-routed` | 已读需求意图识别协议，确认是 BFDS 设计范围 | 用户意图分类明确 | `context-ready` |
| `context-ready` | `bfds-context.mjs` 返回 `CONTEXT_READY`，或已按 Impeccable init/document 补齐可信上下文 | 可信 `PRODUCT.md` 和 `DESIGN.md` 路径 | `surface-confirmed` |
| `surface-confirmed` | 已读目标界面与变更边界确认协议 | 目标界面、现状来源、改动类型、必须保留、允许改变、必须避免都已确认 | `directions-ready` |
| `directions-ready` | 已读设计方向探索协议，且设计上下文与目标界面确认已完成 | A/B/C 三个三方向设计规格，字段齐全且差异真实 | `workbench-ready` |
| `workbench-ready` | 已读评审工作台生成协议 | `docs/design/<slug>/workbench.html` 和 `option-a/b/c.html` 存在 | `selection-confirmed` |
| `selection-confirmed` | 用户在对话中明确选择 A/B/C 或明确给出合并方案 | 可引用用户原话的选择证据；agent 推荐不算选择 | `contract-ready` |
| `contract-ready` | 已读设计交付包协议 | `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`、`status.json` 校验通过 | 停止，等待实现请求 |

## 主流程门禁

1. **需求意图识别门禁**：判断是新设计、继续设计、方案选择、局部实时微调，还是应退回上游。非 BFDS 设计范围立即停止。
2. **设计上下文门禁**：运行 `bfds-context.mjs`。如果不是 `CONTEXT_READY`，按 Impeccable `init` / `document` 补齐可信 `PRODUCT.md` / `DESIGN.md`；无法补齐就停止。禁止用 `find` 搜到的第三方/样例上下文替代。
3. **目标界面与变更边界门禁**：显式确认目标界面、现状来源、改动类型、必须保留、允许改变、必须避免。对 modify/remove/replace/restyle，缺视觉证据或用户确认时停止。
4. **设计方向探索门禁**：只脑暴设计稿。可以跳过提问，但不能跳过脑暴；必须产出 A/B/C 三个三方向设计规格。
5. **评审工作台门禁**：只有设计上下文梳理、目标界面与变更边界确认、设计方向探索三个门禁都完成，才能生成 `docs/design/<slug>/workbench.html` 和三个 iframe 方案。
6. **方案确认门禁**：等待用户在对话中选择 A/B/C 或提出合并意见。用户说“你来选”“挑最稳的”“推荐一个”只允许给推荐并要求确认，不算选择；没有可引用的用户选择原话，不写设计交付包。
7. **设计交付包门禁**：写入 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`、`status.json`，并运行 `validate-artifacts.mjs` 或人工等价校验。

## 硬停止条件

- 当前工作目录或用户指定路径不是目标项目根目录，且无法确认目标项目根目录。
- `bfds-context.mjs` 未返回 `CONTEXT_READY`，且 Impeccable init/document 无法补齐可信上下文。
- 只在 `vendor/`、`open-sources/`、`fixtures/` 或第三方源码里找到 `PRODUCT.md` / `DESIGN.md`。
- 缺产品定义到无法判断用户目标：停止，退回 PRD/OpenSpec/plan/superpower 等上游。
- 对 modify/remove/replace/restyle 缺当前目标界面证据或用户确认：停止，不生成评审工作台。
- 用户未确认目标界面与变更边界：停止，不生成评审工作台。
- 未产出三个三方向设计规格：停止，不生成评审工作台。
- 用户未选择方案：停止，不生成设计交付包。
- 用户把方案选择委托给 agent：停止在方案确认门禁；可以推荐，但不能替用户确认，也不能把 `status.json.state` 改成 `selected` 或 `contract-ready`。
- 用户要求 API、数据库、权限、架构、算法或普通 bug 修复：停止并说明这不是 BFDS 设计范围。
- 只凭聊天记忆、文件名或代码猜测现状：停止，要求证据或确认。

## Few-Shot

触发：

- “这是 PRD，开始设计。”
- “基于这个原型出三个高保真方案。”
- “这个页面里的提示词输入组件重新设计一下。”
- “选 B，但导航用 A 的。”

不触发：

- “实现这个 API 方案。”
- “修一下数据库 migration。”
- “重构这个 hook。”
- “这个组件报错了，帮我 debug。”
