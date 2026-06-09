---
name: bfds-implement
description: 当用户要求实现已经确认的 BFDS 设计方案时使用；也用于按 docs/design/<slug> handoff 继续实现、从 status.json 恢复 BFDS slug、运行 BFDS 设计还原检查或 QA、以及实现后进入局部 live 微调。该技能必须读取 design-contract.json、implementation-handoff.md 和 qa-plan.json；缺少已确认 BFDS 设计产物时不要凭记忆实现，应先引导用户选择已有设计产物或回到 bfds-design。不要用于 API、数据库、后端权限、算法、普通 bug 修复或纯重构。
---

# BFDS Implement

BFDS Implement 只实现已经确认并固化为 contract pack 的 BFDS 设计方案。实现依据来自 `docs/design/<slug>/`，不是聊天记忆。

## 安装后路径约定

先定位本 skill 目录（包含当前 `SKILL.md` 的目录）。BFDS 自带资源优先从这里读取：

- 模板：`assets/templates/`
- 脚本：`scripts/`
- 协议：`references/`

如果当前仓库也有 repo-root `templates/`、`scripts/`、`vendor/impeccable/`，可以作为开发态 fallback。不要要求必须存在 repo-root BFDS 仓库才继续。

Impeccable 不嵌在 BFDS skill 内部。需要 detect、critique 或 live 时，优先使用目标项目已安装的宿主同级 bundle：Codex / agents 为 `.agents/skills/impeccable/`，Claude Code 为 `.claude/skills/impeccable/`。

## 使用前先读

- 恢复 slug 和 artifact：读 [resume-design-artifacts.md](references/resume-design-artifacts.md)。
- 按 handoff 实现代码：读 [implementation-protocol.md](references/implementation-protocol.md)。
- 视觉还原纪律：读 [visual-fidelity-discipline.md](references/visual-fidelity-discipline.md)。
- Automatic QA：读 [qa-protocol.md](references/qa-protocol.md)。
- Live Region Iteration：读 [live-region-iteration.md](references/live-region-iteration.md)。
- Impeccable detect/critique/live 入口：读 [impeccable-integration.md](references/impeccable-integration.md)。

## 主流程

1. Intent Router：从当前线程或 `docs/design/*/status.json` 恢复目标 slug。
2. Artifact Gate：读取 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`。任一缺失就停止。
3. Context：读取 `PRODUCT.md`、`DESIGN.md`，再扫描目标项目代码、路由、组件、tokens、icon set。
4. Implement：按 handoff 实现代码，保留 contract 明确要求保留的布局、逻辑、组件 API 和数据流。
5. Automatic QA：运行项目检查，捕获证据，执行 Impeccable `detect` 和 BFDS contract/状态/交互/视觉纪律检查。
6. Fix and Rerun：P0/P1/P2 必须修复并复跑；P3 可记录为 polish 风险。
7. Live Region Iteration：用户需要局部微调时，进入 Impeccable `live` 或等价局部微调流程，并更新当前 slug 的 QA/状态记录。

## 硬停止条件

- 找不到 `docs/design/<slug>/design-contract.json`。
- 找不到 `docs/design/<slug>/implementation-handoff.md`。
- 找不到 `docs/design/<slug>/qa-plan.json`。
- `status.json` 不存在，且无法从用户指定 slug 定位完整 contract pack。
- 仓库有多个可实现 slug，用户未选择具体 slug。
- 目标代码和已确认 surface framing 明显不一致。
- 无法运行或无法截图目标页面，导致视觉 QA 不成立。
- 当前任务必须调用 Impeccable，但入口或脚本路径无法本地验证。

## Few-Shot

触发：

- “实现这个 BFDS 方案。”
- “按刚才确认的设计稿落代码。”
- “用 docs/design/settings-prompt 的 handoff 继续实现。”
- “跑一下 BFDS 设计还原检查。”

不触发：

- “实现这个 API 方案。”
- “实现这个算法。”
- “修后端权限。”
- “重构数据层。”
