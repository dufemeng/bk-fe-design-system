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
- `skills/bfds-design/references/intent-router.md`
- `skills/bfds-design/references/surface-change-framing.md`
- `fixtures/current-surface-description.md`
- `fixtures/existing-component-change.md`

## 期望行为

- 读取 `surface-change-framing.md`。
- 判定改动类型为 `modify`。
- 要求当前目标界面视觉证据，或明确“现状由代码推断，未视觉验证”。
- 确认必须保留、允许改变、必须避免。

## 停止/继续

停止在目标界面证据和变更边界确认；不生成评审工作台。

## 期望产物

- 无设计产物。
- 用户确认后才允许生成 `workbench.html` 和 `option-a/b/c.html`。
