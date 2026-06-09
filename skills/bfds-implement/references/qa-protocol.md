# 自动化设计还原检查协议

自动化设计还原检查是开发者无感阶段：读取 `qa-plan.json`，收集证据，运行检查，写 `qa-report.md`，必要时修复并复跑。

## 输入

- `docs/design/<slug>/design-contract.json`
- `docs/design/<slug>/implementation-handoff.md`
- `docs/design/<slug>/qa-plan.json`
- `docs/design/<slug>/workbench.html`
- 选中的方案 HTML
- 目标项目实现页面或组件

## 检查步骤

1. 运行项目已有检查：typecheck、lint、test、build。找不到命令时记录，不编造。
2. 按 `qa-plan.targetRoutes` 打开目标 route 或组件环境。
3. 按 `qa-plan.viewports` 捕获实现截图。
4. 按 `qa-plan.states` 和 `qa-plan.interactions` 覆盖关键状态/交互。
5. 尝试运行 Impeccable 反模式扫描。
6. 对照 `design-contract.json` 做设计契约一致性检查。
7. 执行视觉还原纪律检查。
8. 写 `docs/design/<slug>/qa-report.md`。
9. P0/P1/P2 修复后复跑；P3 可记录为 polish。

## Impeccable 反模式扫描

优先按 [impeccable-integration.md](impeccable-integration.md) 的反模式扫描发现顺序执行。开发态 BFDS repo 可尝试：

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json <target>
node .claude/skills/impeccable/scripts/detect.mjs --json <target>
node vendor/impeccable/cli/bin/cli.js detect <target>
```

如果依赖、Node 版本、CLI 子命令或已安装 skill 入口不可验证，记录为未运行。不要把未运行写成通过。

## 验收不等于截图

截图只是证据。报告必须把源视觉目标和实现结果放到同一判断里：

- 参考设计产物是哪个方案。
- 实现截图或浏览器观察是什么。
- 对应设计契约规则是什么。
- 问题等级是什么。
- 建议修复是什么。
- 复跑结果是什么。

## Issue 格式

```text
等级: P1
类别: spacing
证据: mobile screenshot shows action bar overlaps helper text
设计契约规则: responsive[mobile] requires action bar below helper
建议修复: stack actions under textarea at <= 720px
复跑: pending
```

## 阻塞等级

- P0：无法使用、无法截图、关键目标界面错误、设计交付包不一致。
- P1：主要视觉/交互目标不成立，可访问性严重问题。
- P2：状态、响应式、内容、资产或 token 明显偏离。
- P3：可接受但需要 polish 的细节。

P0/P1/P2 必须修复并复跑。P3 可以记录为剩余风险。
