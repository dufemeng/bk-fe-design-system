# 实现交接协议

实现从 `implementation-handoff.md` 开始，但必须同时读取 `design-contract.json` 和 `qa-plan.json`。

## 顺序

1. 通过 [resume-design-artifacts.md](resume-design-artifacts.md) 恢复设计任务。
2. 读取：
   - `docs/design/<slug>/design-contract.json`
   - `docs/design/<slug>/implementation-handoff.md`
   - `docs/design/<slug>/qa-plan.json`
   - `PRODUCT.md`
   - `DESIGN.md`
3. 扫描目标项目代码、路由、组件、tokens、icon set、测试和构建命令。
4. 对照设计契约的 `surface` 和 `changeType`，确认目标代码与已确认目标界面一致。
5. 按实现交接说明实现代码。
6. 运行项目已有检查。
7. 进入自动化设计还原检查。

## 实现原则

- 保留实现交接说明中 `必须保留` 的布局、导航、业务逻辑、组件 API、品牌 tokens 和数据流。
- 只改变实现交接说明中 `允许改变` 的层级、状态反馈、动效、密度、文案或局部结构。
- 不新增未确认的产品能力。
- 不设计 API、数据库、权限或后端架构。
- 优先复用项目现有设计系统、tokens、组件、icon set 和构建管线。
- 如果实现中发现当前代码和已确认目标界面与变更边界不一致，停止并重新确认。

## 数据和文案

- 有真实来源才写真实数据。
- 没有真实来源时使用明确标注的占位，不把占位伪装成真实数据。
- 不用 lorem、套话、营销废话或解释性 UI 文案凑页面。
- 可见控件必须有真实行为或明确标注为原型占位。

## 测试和检查

根据项目实际运行：

- 类型检查
- lint
- 单元测试
- 组件测试
- e2e 或浏览器检查
- build

找不到项目检查命令时，不编造命令；记录未发现，并继续做可行的静态/人工验收。

## 状态写回

- 开始实现：`status.state = implementing`
- 基础实现完成：`status.state = implemented`
- 验收失败：`status.state = qa-failed`
- 验收通过：`status.state = qa-passed`
- 局部实时微调：`status.state = live-iterating`
- 完成：`status.state = done`

每次写回更新 `lastUpdated`。
