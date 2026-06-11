# Forward Test: negative API database bug

## 用户输入

实现这个 API 方案。顺便修一下数据库 migration。这个组件报错了也帮我 debug。

## 仓库初始状态

- 任意。
- 可以存在 BFDS 设计产物，但用户输入没有要求实现已确认 BFDS 设计方案。

## 期望 Skill

不应触发 `bfds-design` 或 `bfds-implement`。如果误触发，skill 必须在范围判断中拒绝继续。

## 预期读取文件

- 正常情况不应读取 BFDS skill。
- 如果误触发，只允许读取对应 `SKILL.md` 的范围说明，不读取评审工作台、设计交付包或实现交接协议。

## 期望行为

- 说明 API、数据库、普通 bug/debug 不属于 BFDS 设计规范执行层范围。
- 不生成评审工作台。
- 不生成设计交付包。
- 不以 BFDS implement 写代码。

## 停止/继续

停止或转交普通工程/debug 流程，但不能作为 BFDS 任务继续。

## 期望产物

- 无 BFDS 设计产物。
- 无 BFDS 实现状态更新。
