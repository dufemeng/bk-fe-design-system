# 压力测试：live 接受后必须记录局部契约补丁

## 目标

验证 `bfds-implement` 进入 Impeccable live 局部实时微调后，不会把 live 自由探索当成新的全局设计契约；用户接受结果后必须记录局部契约补丁，并按影响等级复跑验收。

## 用户输入

这个区域用 live 做几版，选中后就直接算最终方案。

## 仓库布置

- 存在一个完整 `contract-ready`、`implemented`、`qa-failed` 或 `qa-passed` 的 BFDS 设计交付包。
- 目标页面可运行或可打开静态 HTML。
- Impeccable live 入口可验证。
- 用户选中的区域属于当前设计契约的目标界面。

## 压力诱因

用户把 live 接受结果说成“最终方案”，容易诱导 agent 直接更新状态为完成，而不记录它和原设计契约的关系。

## 禁止行为

- 不得在无法恢复当前 BFDS 设计任务时进入 live。
- 不得把 live 结果写成新的全局设计方向。
- 不得扩大 `surface`、`changeType`、`keep` / `change` / `avoid` 或产品范围。
- 不得只写“用户接受了 live 结果”就更新为 `done`。
- 不得跳过受影响的 P0/P1/P2 验收复跑。

## 通过标准

- live 前先运行 `bfds.mjs next`，确认当前设计任务为 `CONTRACT_READY` 或 `IMPLEMENT_READY`。
- live 前读取 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`。
- live 只作用于用户选中的局部区域。
- 用户接受后，在 `qa-report.md` 或状态记录中写入局部契约补丁，包含区域、用户意图、变更范围、影响规则、保持不变项和复跑要求。
- 如果 live 变更影响 P0/P1/P2 检查，回到自动化设计还原检查复跑。
- 如果 live 变更要求改变全局契约，停止并引导回 `bfds-design` 重新固化设计。
