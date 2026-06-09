# 前向测试：bfds-design 开始设计

## 用户输入

这是 PRD，开始设计。

## 仓库初始状态

- 有 README.md 和 docs/bfds-mvp-design-spec.md。
- 可能没有 `PRODUCT.md` 或 `DESIGN.md`。
- `docs/design/` 可以为空。

## 期望 Skill

`bfds-design`

## 预期读取文件

- `skills/bfds-design/SKILL.md`
- `skills/bfds-design/scripts/bfds-context.mjs`
- `skills/bfds-design/references/intent-router.md`
- `skills/bfds-design/references/impeccable-integration.md`
- `skills/bfds-design/references/surface-change-framing.md`
- `fixtures/prd-simple.md`

## 期望行为

- 读取 `intent-router.md`。
- 运行 `bfds-context.mjs --json`，只接受目标项目可信上下文位置里的 `PRODUCT.md`、`DESIGN.md`。
- 如果设计上下文缺失，进入 Impeccable `init` / `document`，或停止要求补齐可信上下文。
- 只有设计上下文门禁完成后，才进入目标界面与变更边界确认。
- 只确认前端目标界面和改动范围，不问 API、数据库或权限。

## 停止/继续

如果缺可信设计上下文，停在设计上下文门禁；如果设计上下文已完成，停在目标界面与变更边界确认。没有用户确认前不生成评审工作台。

## 期望产物

- 本轮不要求产物。
- 允许在用户确认后创建 `docs/design/<slug>/workbench.html` 和三个方案。
