# 局部实时微调

局部实时微调用于用户明确指定的局部区域。它不能扩大产品范围，不能改写全局设计契约。

## 流程

1. 通过 gate 恢复当前设计任务。
2. 读取 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`。
3. 确认用户选择的区域、页面 URL 或组件位置。
4. 按 [impeccable-integration.md](impeccable-integration.md) 进入 Impeccable live，前提是入口、dev server 或静态 HTML 可验证。
5. 用户接受结果后，在 `qa-report.md` 写局部契约补丁。

## 局部契约补丁

```text
局部契约补丁:
区域: <目标界面中的局部区域>
用户意图: <用户原话或等价摘要>
变更范围: <只影响哪些局部结构/状态/密度/动效/文案>
影响规则: <acceptanceRules/checks/states/interactions/responsive/motion>
保持不变: <仍然遵守的 keep/avoid/全局设计方向>
复跑要求: <需要复跑的 P0/P1/P2 检查，或说明仅 P3 polish>
```

如果微调影响 P0/P1/P2 检查，回到自动化设计还原检查复跑，并用 gate 标记状态。
