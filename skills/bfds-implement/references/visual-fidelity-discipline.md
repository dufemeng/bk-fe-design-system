# 视觉还原纪律

实现和验收都执行这些检查：

- `DESIGN.md` 是唯一设计规范事实源；设计稿和局部示意只用于方向校准。
- `design-contract.json` 的 `implementationConstraints` 是本次需求的实现约束，必须逐项自审。
- 对比必须匹配 viewport、设备、主题、route、认证状态、内容状态和交互状态。
- 局部修改默认保留周边布局、交互、业务逻辑、路由、数据流和组件 API。
- 字体检查 family、fallback、weight、size、line-height、letter-spacing、换行和截断。
- 间距检查 page margin、section gap、item gap、padding、grid、alignment、radius、shadow、divider、vertical rhythm。
- 颜色映射到 `DESIGN.md` 或项目 tokens；标出硬编码颜色、漂移状态色、低对比。
- 图标风格统一：尺寸、线宽、颜色、语义、对齐、状态变化一致。
- 不编数据，不用 lorem、套话、营销废话或解释性 UI 文案凑页面。
- 不留下 fake controls、dead links、未连接按钮。
- 覆盖实际需要的 default、hover、focus-visible、active、disabled、loading、error、success、empty、overflow、long/short text。
- 响应式不能重叠、裁切、破坏层级、文字溢出或让控件不可用。

禁止把选中方向降级成普通卡片、项目符号、占位图、CSS 背景块或通用 UI。也禁止把局部方案示意当成可任意重画整页的许可。

## 自审输出

实现完成前至少在工作记录或 `qa-report.md` 中覆盖：

- `DESIGN.md` 规则是否遵守。
- `selfReviewChecks` 是否逐项通过。
- `keep/change/avoid` 是否被遵守。
- 未改区域是否保持。
- 无法运行或无法截图的原因。
