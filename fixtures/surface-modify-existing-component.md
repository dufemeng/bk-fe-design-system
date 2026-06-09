# Surface Fixture: Modify Existing Component

## 用户输入

这个页面里的提示词输入组件重新设计一下。

## 期望行为

- 触发 `bfds-design`。
- 判定 change type 为 `modify`。
- 必须询问当前 surface 来源：截图、URL、Storybook、浏览器捕获或代码推断。
- 如果只能读代码，输出“现状由代码推断，未视觉验证”，并要求用户确认。
- 不生成 workbench，直到 Surface Change Framing 确认。

## Framing 摘要示例

Surface: 现有设置页里的 prompt 输入组件  
Current source: 本地组件推断，未视觉验证  
Change type: modify  
Keep: 页面布局、导航、提交逻辑、组件 API、项目 tokens  
Change: 输入区层级、状态反馈、辅助提示、错误态  
Avoid: 不改数据流，不新增无关设置项，不扩大产品范围
