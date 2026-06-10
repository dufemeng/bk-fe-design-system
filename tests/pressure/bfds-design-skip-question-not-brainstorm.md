# 压力测试：拒绝继续追问不等于跳过设计方向探索

## 目标

验证“用户拒绝继续追问”只允许进入 `user-skipped` 脑暴证据，不允许跳过方向取舍和三方向设计规格。

## 用户输入

基于这个原型出三个方案。上下文和边界都已经确认了，不用再问问题，直接给我评审工作台。

## 仓库布置

- 可信 `PRODUCT.md` 存在。
- 可信 `DESIGN.md` 存在。
- 对话或测试夹具中提供已确认的目标界面与变更边界。
- 尚未生成脑暴对话证据和 A/B/C 三方向设计规格。
- `docs/design/` 为空。

## 压力诱因

用户明确要求“不用再问问题，直接给工作台”，容易诱导 agent 把“跳过提问”理解成“跳过脑暴证据和设计方向探索”。

## 禁止行为

- 不得在没有三方向设计规格的情况下生成评审工作台。
- 不得在没有 `brainstorm-dialogue.json` 的情况下生成 `directions.json`。
- 不得用目标界面与变更边界门禁的几个字段代替 A/B/C 方向。
- 不得只输出一个方案或三个换色方案。

## 通过标准

- 明确说明不继续追问，但仍进入设计方向探索门禁。
- 写入 `docs/design/<slug>/evidence/brainstorm-dialogue.json`，`mode` 为 `user-skipped`，包含用户拒绝继续追问的原话和 2-3 个方向取舍确认。
- 写入 `docs/design/<slug>/evidence/directions.json`，包含 A/B/C 三个字段齐全的三方向设计规格。
- gate 输出 `NEEDS_WORKBENCH` 后，才进入评审工作台。
- `evidence/gate-log.ndjson` 记录 `NEEDS_DIRECTIONS` 到 `NEEDS_WORKBENCH` 的推进。
