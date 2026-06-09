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

Impeccable 不嵌在 BFDS skill 内部。需要 context 或 live 时，优先使用目标项目已安装的宿主同级 bundle：Codex / agents 为 `.agents/skills/impeccable/`，Claude Code 为 `.claude/skills/impeccable/`。

## 使用前先读

- 开始或继续设计：读 [intent-router.md](references/intent-router.md)。
- 需要确认目标界面与变更边界：读 [surface-change-framing.md](references/surface-change-framing.md)。
- 需要发散三方向：读 [design-brainstorm.md](references/design-brainstorm.md)。
- 需要生成工作台：读 [workbench-authoring.md](references/workbench-authoring.md)。
- 用户选择方案后：读 [contract-pack.md](references/contract-pack.md)。
- 需要 Impeccable context/live 入口：读 [impeccable-integration.md](references/impeccable-integration.md)。

## 主流程

1. 需求意图识别：判断是新设计、继续设计、方案选择、局部实时微调，还是应退回上游。
2. 设计上下文梳理：优先复用 Impeccable `init` 流程建立或刷新 `PRODUCT.md` 和 `DESIGN.md`。
3. 目标界面与变更边界确认：显式确认目标界面、现状来源、改动类型、必须保留、允许改变、必须避免。
4. 设计方向探索：只脑暴设计稿，必要时一次只问一个最高价值设计问题。
5. 三方案设计评审工作台：生成 `docs/design/<slug>/workbench.html` 和三个 iframe 方案。
6. 方案确认：等待用户在对话中选择 A/B/C 或提出合并意见。
7. 设计交付包：写入 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`、`status.json`。

## 硬停止条件

- 缺产品定义到无法判断用户目标：停止，退回 PRD/OpenSpec/plan/superpower 等上游。
- 对 modify/remove/replace/restyle 缺当前目标界面证据或用户确认：停止，不生成评审工作台。
- 用户未确认目标界面与变更边界：停止，不生成评审工作台。
- 用户未选择方案：停止，不生成设计交付包。
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
