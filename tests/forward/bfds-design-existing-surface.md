# Forward Test: existing target UI redesign

## 用户输入

这个页面里的提示词输入组件重新设计一下。

## 仓库初始状态

- 目标项目可能有代码或 Storybook。
- 用户未提供截图、URL 或 Figma。

## 期望 Skill

`bfds-design`

## 预期读取文件

- `skills/bfds-design/SKILL.md`
- `skills/bfds-design/scripts/bfds.mjs`
- `skills/bfds-design/references/impeccable-integration.md`
- `skills/bfds-design/references/surface-change-framing.md`
- `fixtures/current-surface-description.md`
- `fixtures/existing-component-change.md`

## 期望行为

- 先运行 `bfds.mjs next <slug>`，只接受 next-card 从可信位置识别出的 `PRODUCT.md`、`DESIGN.md`。
- 如果 next-card 输出 `CONTEXT_BLOCKED`，停在设计上下文梳理，不进入页面重设计。
- next-card 输出 `NEEDS_SURFACE` 后，读取 `surface-change-framing.md`。
- 判定改动类型为 `modify`。
- 要求当前目标界面视觉证据，或明确“现状由代码推断，未视觉验证”。
- 确认必须保留、允许改变、必须避免。
- 用户结构化确认后用 `bfds.mjs answer --stage surface` 提交证据，并读取返回的 next-card。

## 停止/继续

如果缺可信 context，停在 设计上下文梳理；否则停止在目标界面证据和变更边界确认。不生成评审工作台。

## 期望产物

- 最多生成 `status.json` 和 `evidence/gate-log.ndjson`。
- 用户结构化确认后允许生成 `evidence/surface.json`。
- 只有完成 `surface.json`、带设计系统/实现影响的 `brainstorm-dialogue.json` 和带实现约束的 `directions.json` 后，才允许生成 `workbench.html` 和 `option-a/b/c.html` 局部方案预览。
