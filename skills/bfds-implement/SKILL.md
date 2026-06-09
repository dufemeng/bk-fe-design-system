---
name: bfds-implement
description: 当用户要求实现已经确认的 BFDS 设计方案时使用；也用于按 docs/design/<slug> 实现交接说明继续实现、从 status.json 恢复 BFDS 设计任务、运行 BFDS 设计还原检查或验收、以及实现后进入局部实时微调。该技能必须读取 design-contract.json、implementation-handoff.md 和 qa-plan.json；缺少已确认 BFDS 设计产物时不要凭记忆实现，应先引导用户选择已有设计产物或回到 bfds-design。不要用于 API、数据库、后端权限、算法、普通 bug 修复或纯重构。
---

# BFDS Implement

BFDS Implement 只实现已经确认并固化为设计交付包的 BFDS 设计方案。实现依据来自 `docs/design/<slug>/`，不是聊天记忆。

## 安装后路径约定

先定位本 skill 目录（包含当前 `SKILL.md` 的目录）。BFDS 自带资源优先从这里读取：

- 模板：`assets/templates/`
- 脚本：`scripts/`
- 协议：`references/`

如果当前仓库也有 repo-root `templates/`、`scripts/`、`vendor/impeccable/`，可以作为开发态 fallback。不要要求必须存在 repo-root BFDS 仓库才继续。

Impeccable 不嵌在 BFDS skill 内部。需要反模式扫描、设计评审增强或局部实时微调时，优先使用目标项目已安装的宿主同级 bundle：Codex / agents 为 `.agents/skills/impeccable/`，Claude Code 为 `.claude/skills/impeccable/`。

## 使用前先读

- 恢复设计任务和设计产物：读 [resume-design-artifacts.md](references/resume-design-artifacts.md)。
- 按实现交接说明实现代码：读 [implementation-protocol.md](references/implementation-protocol.md)。
- 视觉还原纪律：读 [visual-fidelity-discipline.md](references/visual-fidelity-discipline.md)。
- 自动化设计还原检查：读 [qa-protocol.md](references/qa-protocol.md)。
- 局部实时微调：读 [live-region-iteration.md](references/live-region-iteration.md)。
- Impeccable 反模式扫描/设计评审增强/局部实时微调入口：读 [impeccable-integration.md](references/impeccable-integration.md)。

## 主流程

1. 设计任务恢复：从当前线程或 `docs/design/*/status.json` 恢复目标设计任务。
2. 设计产物完整性校验：读取 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`。任一缺失就停止。
3. 项目上下文扫描：读取 `PRODUCT.md`、`DESIGN.md`，再扫描目标项目代码、路由、组件、tokens、icon set。
4. 代码实现：按实现交接说明实现代码，保留设计契约明确要求保留的布局、逻辑、组件 API 和数据流。
5. 自动化设计还原检查：运行项目检查，捕获证据，执行 Impeccable `detect` 和 BFDS 设计契约/状态/交互/视觉纪律检查。
6. 修复并复跑：P0/P1/P2 必须修复并复跑；P3 可记录为 polish 风险。
7. 局部实时微调：用户需要局部微调时，进入 Impeccable `live` 或等价局部微调流程，并更新当前设计任务的验收/状态记录。

## 硬停止条件

- 找不到 `docs/design/<slug>/design-contract.json`。
- 找不到 `docs/design/<slug>/implementation-handoff.md`。
- 找不到 `docs/design/<slug>/qa-plan.json`。
- `status.json` 不存在，且无法从用户指定设计任务定位完整设计交付包。
- 仓库有多个可实现设计任务，用户未选择具体设计任务。
- 目标代码和已确认目标界面与变更边界明显不一致。
- 无法运行或无法截图目标页面，导致视觉验收不成立。
- 当前任务必须调用 Impeccable，但入口或脚本路径无法本地验证。

## Few-Shot

触发：

- “实现这个 BFDS 方案。”
- “按刚才确认的设计稿落代码。”
- “用 docs/design/settings-prompt 的实现交接说明继续实现。”
- “跑一下 BFDS 设计还原检查。”

不触发：

- “实现这个 API 方案。”
- “实现这个算法。”
- “修后端权限。”
- “重构数据层。”
