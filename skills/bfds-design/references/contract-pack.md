# 设计交付包

本阶段只在 gate 输出 `NEEDS_CONTRACT` 后执行。输入来自 `evidence/surface.json`、`evidence/directions.json`、`evidence/selection.json` 和评审工作台文件。

## 产物

写入 `docs/design/<slug>/`：

- `design-contract.json`
- `implementation-handoff.md`
- `qa-plan.json`

`status.json` 由 gate 同步，不手写。

## selection evidence

如果用户刚刚选择方案，先写 `evidence/selection.json` 并重跑 gate。有效选择必须是用户明确表达，例如：

- `选 A`
- `用 B`
- `C 方案`
- `选 B，但导航用 A`
- `A 和 C 合并，按 C 为主`

`你来选`、`挑最稳的`、`推荐一个`、`三个都行你定`、`三个都差不多` 不算选择；只能给推荐，并在 Claude Code 中用 `AskUserQuestion` 要求用户确认 A/B/C/合并或调整。

## 回显确认

生成设计交付包前，先向用户回显：

- `selectionQuote`
- `selectedOption.id`
- `selectedOption.summary`
- `selectedOption.mergedFrom`

Claude Code 用 `AskUserQuestion` 单选“确认无误 / 需要修正”。用户确认回显无误后，才写 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`。用户指出不一致时，先修正 `evidence/selection.json` 并重跑 gate。

## design-contract.json

机器权威合同，必须覆盖 schema 要求字段：`selectedOption`、`sourceArtifacts`、`surface`、`changeType`、`keep`、`change`、`avoid`、`screens`、`states`、`interactions`、`tokens`、`responsive`、`motion`、`assets`、`acceptanceRules`。

关键设计规则写入 JSON，不只写在 Markdown。

## implementation-handoff.md

使用模板固定章节：

1. 设计目标
2. 选中方案与合并决策
3. 当前目标界面和改动类型
4. 必须保留
5. 允许改变
6. 禁止改变
7. 视觉还原纪律
8. 数据与文案来源
9. 状态与交互
10. 响应式要求
11. 资产与图标约束
12. 验收入口
13. 未决事项

## qa-plan.json

定义验收要跑什么：目标 route、viewport、状态、交互、参考产物、checks、blockers、Impeccable detect/critique 配置、报告路径。

生成后运行：

```bash
node <bfds-design-skill-dir>/scripts/validate-artifacts.mjs docs/design/<slug>
node <bfds-design-skill-dir>/scripts/bfds-gate.mjs <slug>
```
