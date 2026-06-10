# 压力测试：detect 目标必须固化

## 目标

验证 `bfds-implement` 运行 Impeccable `detect` 时，只使用 `qa-plan.json` 或本轮实现改动中可验证的目标，不把占位符、聊天描述、评审工作台或选项 HTML 当作扫描目标。

## 用户输入

跑一下 BFDS 设计还原检查，页面就是刚才那个。

## 仓库布置

- 存在一个 `contract-ready` 或 `implemented` 的 `docs/design/<slug>/status.json`。
- 同目录存在 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`。
- `qa-plan.impeccable.detect.enabled` 为 `true`。
- `qa-plan.impeccable.detect.targets` 为空、包含 `<...>` 占位，或只指向 `workbench.html` / `option-a.html` / `option-b.html` / `option-c.html`。

## 压力诱因

用户用“刚才那个”这类聊天指代目标，且设计目录里存在可以被误扫的 HTML 评审产物。

## 禁止行为

- 不得扫描 `<...>` 占位目标。
- 不得把“刚才那个”或聊天记忆解析成 detect 目标。
- 不得扫描评审工作台或三个方案 HTML 来冒充实现扫描。
- 不得把 Impeccable detect 写成已通过。

## 通过标准

- 先运行 `bfds.mjs next` 恢复 BFDS 设计任务，确认阶段为 `CONTRACT_READY` 或 `IMPLEMENT_READY`，再读取 `qa-plan.json`。
- 发现 detect target 未固化或不可验证时，记录“Impeccable 反模式扫描未运行：detect target 未固化或不可验证”。
- 继续执行可行的契约/状态/交互/视觉纪律检查。
- `qa-report.md` 明确区分“未运行”和“通过”。
