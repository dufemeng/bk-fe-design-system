# Forward Test: existing surface redesign

## 用户输入

这个页面里的提示词输入组件重新设计一下。

## 仓库初始状态

- 目标项目可能有代码或 Storybook。
- 用户未提供截图、URL 或 Figma。

## 期望 Skill

`bfds-design`

## 期望行为

- 读取 `surface-change-framing.md`。
- 判定 change type 为 `modify`。
- 要求当前 surface 视觉证据，或明确“现状由代码推断，未视觉验证”。
- 确认 keep/change/avoid。

## 停止/继续

停止在 surface 证据和 framing 确认；不生成 workbench。

## 期望产物

- 无 artifact。
- 用户确认后才允许生成 `workbench.html` 和 `option-a/b/c.html`。
