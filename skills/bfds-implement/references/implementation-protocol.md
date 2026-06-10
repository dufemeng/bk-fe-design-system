# 实现交接协议

实现前必须已经通过 gate，且 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json` 存在并校验通过。

## 权威输入

按优先级读取：

1. `docs/design/<slug>/design-contract.json`
2. `docs/design/<slug>/implementation-handoff.md`
3. `docs/design/<slug>/qa-plan.json`
4. 设计契约引用的 `PRODUCT.md` / `DESIGN.md`
5. 当前目标项目代码和运行证据

用户在实现阶段追加的聊天描述、Impeccable critique/live 输出、浏览器观察和检测器结果，都不能直接改写已确认设计契约。冲突时停止，要求回到 `bfds-design` 重新固化或记录为验收风险。

## 实现原则

- 保留 `keep` 中的布局、导航、业务逻辑、组件 API、品牌 tokens 和数据流。
- 只改变 `change` 中的层级、状态反馈、动效、密度、文案或局部结构。
- 遵守 `avoid`，不新增未确认产品能力。
- 优先复用现有设计系统、tokens、组件、icon set 和构建管线。
- 有真实来源才写真实数据；占位必须明确标注。
- 可见控件必须有真实行为或明确标注为原型占位。

开始实现前用 gate `--mark implementing`，基础实现完成后用 `--mark implemented`。
