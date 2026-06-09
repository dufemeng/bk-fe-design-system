# 局部实时微调

局部实时微调是用户介入阶段，用于局部微调。它发生在自动化设计还原检查之后，或用户明确要求对某个区域继续调。

## 入口

触发语义：

- “这个区域再紧凑一点。”
- “输入框状态再明显一些。”
- “只改这里。”
- “选中这个区域做几版。”

## 流程

1. 恢复当前 BFDS 设计任务。
2. 读取 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`。
3. 确认用户选择的区域、页面 URL 或组件位置。
4. 按 [impeccable-integration.md](impeccable-integration.md) 的安装模型读取 `.agents/skills/impeccable/reference/live.md` 或 `.claude/skills/impeccable/reference/live.md`；开发态才 fallback 到 `vendor/impeccable/skill/reference/live.md`。
5. 启动或恢复 Impeccable live 流程，前提是入口、dev server 或静态 HTML 可验证。
6. 生成局部方案，不扩大产品范围，不改写未选中的全局设计方向。
7. 用户接受后，把结果关联回当前设计任务：
   - 更新 `status.state = live-iterating` 或 `qa-passed/done`
   - 在 `qa-report.md` 记录局部区域、用户意图、结果、影响的契约规则和剩余风险
   - 记录局部契约补丁，说明本次微调覆盖或补充了哪些 `acceptanceRules`、`states`、`interactions`、`responsive` 或 `motion` 约束

## 停止条件

- 无法恢复当前设计任务。
- 目标区域不明确。
- 目标页面不能运行或不能打开。
- Impeccable live 入口、配置或脚本路径无法验证。
- 用户要求的是产品范围、API、数据库或后端变更。
- 用户要求的微调会改变 `surface`、`changeType`、已选方案核心构图、`keep` / `change` / `avoid` 或 P0/P1 级验收规则；此时停止并回到 `bfds-design` 重新固化设计。

## 局部契约补丁

局部实时微调接受后，必须在 `qa-report.md` 或状态记录里写清：

```text
局部契约补丁:
区域: <目标界面中的局部区域>
用户意图: <用户原话或等价摘要>
变更范围: <只影响哪些局部结构/状态/密度/动效/文案>
影响规则: <acceptanceRules/checks/states/interactions/responsive/motion 的 id 或名称>
保持不变: <仍然遵守的 keep/avoid/全局设计方向>
复跑要求: <需要复跑的 P0/P1/P2 检查，或说明仅 P3 polish>
```

不要只写“用户接受了 live 结果”。没有局部契约补丁，后续 `bfds-implement` 新会话无法判断 live 结果是设计契约的一部分，还是一次未固化的临时修改。

## 与自动化设计还原检查的关系

自动化设计还原检查负责发现和修复设计契约偏差。局部实时微调负责用户主导的局部微调。局部实时微调完成后，如果改动影响 P0/P1/P2 检查，必须回到自动化设计还原检查复跑。
