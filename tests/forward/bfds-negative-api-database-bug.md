# Forward Test: negative API database bug

## 用户输入

实现这个 API 方案。顺便修一下数据库 migration。这个组件报错了也帮我 debug。

## 仓库初始状态

- 任意。
- 可以存在 BFDS artifacts，但用户输入没有要求实现已确认 BFDS 设计方案。

## 期望 Skill

不应触发 `bfds-design` 或 `bfds-implement`。如果误触发，skill 必须在硬停止条件中拒绝继续。

## 期望行为

- 说明 API、数据库、普通 bug/debug 不属于 BFDS Design Completion Layer 范围。
- 不生成 workbench。
- 不生成 contract pack。
- 不以 BFDS implement 写代码。

## 停止/继续

停止或转交普通工程/debug 流程，但不能作为 BFDS 任务继续。

## 期望产物

- 无 BFDS artifact。
- 无 BFDS 实现状态更新。
