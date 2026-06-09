# 设计交付包

设计交付包是用户选择方案后的唯一实现依据。没有用户明确选择，不写设计交付包。

## 目录

- [产物路径](#产物路径)
- [写入前检查](#写入前检查)
- [design-contract.json](#design-contractjson)
- [implementation-handoff.md](#implementation-handoffmd)
- [qa-plan.json](#qa-planjson)
- [status.json](#statusjson)
- [校验](#校验)

## 产物路径

写入 `docs/design/<slug>/`：

- `design-contract.json`
- `implementation-handoff.md`
- `qa-plan.json`
- `status.json`

参考模板：

- 优先使用本 skill 自带模板：`assets/templates/artifacts/design-contract.schema.json`
- 优先使用本 skill 自带模板：`assets/templates/artifacts/qa-plan.schema.json`
- 优先使用本 skill 自带模板：`assets/templates/artifacts/status.schema.json`
- 优先使用本 skill 自带模板：`assets/templates/artifacts/implementation-handoff.md`
- 开发态 repo-root fallback：`templates/artifacts/*`

## 写入前检查

必须已满足：

1. 目标界面与变更边界已确认。
2. 评审工作台已生成，含 `option-a.html`、`option-b.html`、`option-c.html`。
3. 用户在对话中明确选择 A/B/C，或明确说明合并方案。
4. 所有必须保留、允许改变、禁止改变已能写入合同。

任一缺失都停止并要求补齐，不根据记忆猜。

## 方案确认硬规则

写任何设计交付包文件前，必须能引用一条用户原话作为选择证据：

- 有效选择：`选 A`、`用 B`、`C 方案`、`选 B，但导航用 A`、`A 和 C 合并，按 C 为主`。
- 无效选择：`你来选`、`挑最稳的`、`推荐一个`、`三个都差不多`、`你觉得哪个好就用哪个`。

无效选择只能触发推荐回复：

1. 给出推荐方案和 1-3 条理由。
2. 明确要求用户回复“选 A/B/C”或给出合并方案。
3. 停止，不写 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`。
4. 不把 `status.json.state` 改成 `selected` 或 `contract-ready`。

agent 的推荐、判断、排序或“最稳”结论都不是用户选择证据。

## design-contract.json

机器权威合同。必须覆盖：

- `slug`
- `title`
- `selectedOption`
- `sourceArtifacts`
- `surface`
- `changeType`
- `keep`
- `change`
- `avoid`
- `screens`
- `states`
- `interactions`
- `tokens`
- `responsive`
- `motion`
- `assets`
- `acceptanceRules`

关键设计规则必须机器可读，不能只写在 Markdown。

## implementation-handoff.md

按模板固定 13 个章节：

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

必须写清：

- 不编数据，不用填充文案凑页面。
- 不滥用强调色和占位图。
- 图标风格统一。
- 禁止廉价“圆角卡片 + 彩色左边框”模板化强调。
- 80% 成熟模式，20% 独特选择。
- 必须检查字体、间距、颜色、资产、状态、交互、响应式、可访问性。

## qa-plan.json

验证计划必须包含：

- target routes
- viewports
- states
- interactions
- reference screenshots 或 reference artifacts
- checks
- blockers
- Impeccable 反模式扫描/设计评审增强配置
- 验收报告路径

验收计划不是设计契约，不存储聊天决策；它只负责验证要跑什么。

## status.json

`status.json` 是恢复索引，不是完整设计合同。

生成设计交付包后：

- `state` 设为 `contract-ready`
- `selectedOption` 记录用户选择或合并说明
- `artifacts.designContract`、`artifacts.implementationHandoff`、`artifacts.qaPlan` 填入路径
- `lastUpdated` 使用当前 ISO 时间

## 校验

生成后运行：

```bash
node <bfds-design-skill-dir>/scripts/validate-artifacts.mjs docs/design/<slug>
```

如果当前仓库有 repo-root 脚本，也可以运行 `node scripts/validate-artifacts.mjs docs/design/<slug>`。如果脚本不可用，至少人工确认四个文件存在、JSON 可解析、设计任务标识一致、必填字段齐全。
