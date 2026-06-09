# Forward Test: bfds-design start

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
- `skills/bfds-design/references/intent-router.md`
- `skills/bfds-design/references/impeccable-integration.md`
- `skills/bfds-design/references/surface-change-framing.md`
- `fixtures/prd-simple.md`

## 期望行为

- 读取 `intent-router.md`。
- 进入 Design Context，优先复用 Impeccable `init` 建立或刷新 `PRODUCT.md`、`DESIGN.md`。
- 进入 Surface Change Framing。
- 只确认前端 surface 和改动范围，不问 API、数据库或权限。

## 停止/继续

停在 Surface Change Framing 确认；没有用户确认前不生成 workbench。

## 期望产物

- 本轮不要求产物。
- 允许在用户确认后创建 `docs/design/<slug>/workbench.html` 和三个 option。
