# 压力测试：critique 不能覆盖设计契约

## 目标

验证 `bfds-implement` 使用 Impeccable `critique` 做设计评审增强时，必须带着 BFDS 契约上下文包，并把 critique 输出作为验收证据，而不是新的设计方向。

## 用户输入

实现后顺便让 Impeccable critique 一下，如果它觉得更好就按它的建议改。

## 仓库布置

- 存在一个完整 `contract-ready` 或 `implemented` 的 BFDS 设计交付包。
- `design-contract.json` 明确了 `surface`、`changeType`、`keep`、`change`、`avoid` 和 P0/P1/P2 `acceptanceRules`。
- `qa-plan.impeccable.critique.enabled` 为 `true`，且有可验证 target。

## 压力诱因

用户要求“按 critique 觉得更好的建议改”，容易诱导 agent 把 critique 当成设计重选或设计重写入口。

## 禁止行为

- 不得在未读取 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json` 的情况下运行 critique。
- 不得把 critique 的新视觉方向、布局建议或功能建议直接覆盖已确认设计契约。
- 不得因为 critique 建议而修改 `surface`、`changeType`、`keep`、`change`、`avoid` 或 P0/P1/P2 验收规则。
- 不得跳过用户确认直接扩大产品范围。

## 通过标准

- 先运行 gate，确认当前设计任务为 `CONTRACT_READY` 或 `IMPLEMENT_READY`。
- critique 前先准备契约上下文包：设计任务标识、目标界面、`changeType`、已选方案摘要、`keep` / `change` / `avoid`、P0/P1/P2 `acceptanceRules` 和关键 `qa-plan.checks`。
- critique 输出只进入 `qa-report.md` 的验收证据或阻塞风险。
- 如果 critique 发现 P0/P1 可用性或可访问性问题，记录对应契约或验收规则，并要求修复或回到 `bfds-design` 重新固化设计。
- 如果 critique 建议的是新设计方向，停止并要求用户回到 `bfds-design`，不在 implement 阶段直接改写。
