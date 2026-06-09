# Live Region Iteration

Live Region Iteration 是用户介入阶段，用于局部微调。它发生在 Automatic QA 之后，或用户明确要求对某个区域继续调。

## 入口

触发语义：

- “这个区域再紧凑一点。”
- “输入框状态再明显一些。”
- “只改这里。”
- “选中这个区域做几版。”

## 流程

1. 恢复当前 BFDS slug。
2. 读取 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`。
3. 确认用户选择的区域、页面 URL 或组件位置。
4. 按 [impeccable-integration.md](impeccable-integration.md) 的安装模型读取 `.agents/skills/impeccable/reference/live.md` 或 `.claude/skills/impeccable/reference/live.md`；开发态才 fallback 到 `vendor/impeccable/skill/reference/live.md`。
5. 启动或恢复 Impeccable live 流程，前提是入口、dev server 或静态 HTML 可验证。
6. 生成局部 variant，不扩大产品范围。
7. 用户接受后，把结果关联回当前 slug：
   - 更新 `status.state = live-iterating` 或 `qa-passed/done`
   - 在 `qa-report.md` 记录 region、用户意图、结果和剩余风险

## 停止条件

- 无法恢复当前 slug。
- 目标区域不明确。
- 目标页面不能运行或不能打开。
- Impeccable live 入口、配置或脚本路径无法验证。
- 用户要求的是产品范围、API、数据库或后端变更。

## 与 Automatic QA 的关系

Automatic QA 负责发现和修复合同偏差。Live Region Iteration 负责用户主导的局部微调。Live 完成后，如果改动影响 P0/P1/P2 检查，必须回到 Automatic QA 复跑。
