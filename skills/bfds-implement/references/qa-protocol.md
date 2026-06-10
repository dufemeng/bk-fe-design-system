# 自动化设计还原检查

本阶段读取 `qa-plan.json`，收集证据，写 `docs/design/<slug>/qa-report.md`。截图只是证据，不是验收结论。

## 检查步骤

1. 运行项目已有检查：typecheck、lint、test、build。找不到命令就记录，不编造。
2. 按 `qa-plan.targetRoutes` 打开目标 route 或组件环境。
3. 按 `qa-plan.viewports` 捕获实现截图。
4. 按 `qa-plan.states` 和 `qa-plan.interactions` 覆盖关键状态/交互。
5. 运行可验证的 Impeccable detect；目标只能来自 `qa-plan.impeccable.detect.targets`、`qa-plan.targetRoutes` 或本轮实现源码文件。
6. 对照 `design-contract.json` 做契约、状态、交互、响应式、可访问性和视觉纪律检查。
7. 写 `qa-report.md`。

不得把聊天描述、评审工作台、选项 HTML、`<...>` 占位目标当作 detect target。未运行要写“未运行”，不能写成通过。

## Issue 格式

```text
等级: P1
类别: spacing
证据: mobile screenshot shows action bar overlaps helper text
设计契约规则: responsive[mobile] requires action bar below helper
建议修复: stack actions under textarea at <= 720px
复跑: pending
```

P0/P1/P2 修复后复跑；P3 可记录为剩余风险。写完报告后用 gate `--mark qa-failed` 或 `--mark qa-passed`。
