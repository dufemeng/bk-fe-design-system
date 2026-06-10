# 目标界面与变更边界确认

本阶段只确认设计范围，并写 `docs/design/<slug>/evidence/surface.json`。不要生成三方向或评审工作台。

## 必填内容

- 目标界面：页面、路由、组件、局部区域、弹窗、流程或空状态。
- 现状来源：截图、Figma、原型、URL、浏览器捕获、Storybook、代码推断或用户文字描述。
- 改动类型：`create`、`extend`、`modify`、`remove`、`replace`、`merge`、`restyle`。
- 必须保留：布局、导航、业务逻辑、组件 API、品牌 token、数据流等。
- 允许改变：层级、状态反馈、动效、密度、文案、局部结构等。
- 必须避免：新增范围、误改、视觉套路、假数据、无关能力。
- 用户确认原话。

## 证据优先级

1. 截图/Figma/原型/URL。
2. 可运行页面的浏览器截图。
3. 代码、Storybook、组件库、tokens。
4. 用户文字描述。

仅从代码推断时，在确认文案和 `surface.json` 里写明“现状由代码推断，未视觉验证”。`modify/remove/replace/restyle` 需要视觉证据或用户确认。

## 写入后

写入 `evidence/surface.json`，然后运行：

```bash
node <bfds-design-skill-dir>/scripts/bfds-gate.mjs <slug> --sync-status
```
