# 视觉还原纪律

实现和验收都执行这些检查：

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

禁止把高保真设计稿降级成普通卡片、项目符号、占位图、CSS 背景块或通用 UI。
