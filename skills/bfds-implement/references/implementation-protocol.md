# 实现交接协议

实现前必须已经通过 `bfds.mjs next` 阶段确认，且 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json` 存在并校验通过。

## 权威输入

按优先级读取：

1. 设计契约引用的 `DESIGN.md`
2. `docs/design/<slug>/design-contract.json`
3. `docs/design/<slug>/implementation-handoff.md`
4. `docs/design/<slug>/qa-plan.json`
5. 设计契约引用的 `PRODUCT.md`
6. 当前目标项目代码和运行证据

用户在实现阶段追加的聊天描述、Impeccable critique/live 输出、浏览器观察和检测器结果，都不能直接改写已确认设计契约。冲突时停止，要求回到 `bfds-design` 重新固化或记录为验收风险。

## 实现原则

- 保留 `keep` 中的布局、导航、业务逻辑、组件 API、品牌 tokens 和数据流。
- 只改变 `change` 中的层级、状态反馈、动效、密度、文案或局部结构。
- 遵守 `avoid`，不新增未确认产品能力。
- 优先复用现有设计系统、tokens、组件、icon set 和构建管线。
- 遵守 `design-contract.json` 的 `implementationConstraints`：`designSystemRules`、`codeReuseHypothesis`、`allowedChangeBoundary`、`implementationRisk`、`selfReviewChecks`。
- 有真实来源才写真实数据；占位必须明确标注。
- 可见控件必须有真实行为或明确标注为原型占位。

## 代码层设计自审

基础实现完成后，标记 `implemented` 前先做代码层设计自审：

- 对照 `DESIGN.md` 检查颜色、字体、间距、圆角、阴影、动效、组件语气和状态 token。
- 对照 `implementationConstraints.selfReviewChecks` 逐项检查。
- 检查 diff 是否只触及 `allowedChangeBoundary` 和 `change` 范围。
- 检查是否复用现有组件、tokens、icon set 和数据流，没有重复造组件或引入新视觉系统。
- 检查 default、loading、error、success、empty、long text、disabled、focus-visible 和 responsive 是否按合同覆盖。

P0/P1/P2 偏差必须修正后再标记实现完成；无法验证的项写入 `qa-report.md`，不能写成通过。标记实现完成时必须写 `selfReviewNote`，一句话概括 `implementationConstraints.selfReviewChecks` 的逐项结论和剩余风险；runtime 会写入 `evidence/implementation-self-review.json`。

开始实现前用 gate `--mark implementing`，基础实现和代码层设计自审完成后用 `--mark implemented --field selfReviewNote="..."`。
