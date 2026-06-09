# Surface Fixture: Create

## 用户输入

新增一个设置页，用来管理团队默认提示词。开始设计。

## 期望行为

- 触发 `bfds-design`。
- 判定 change type 为 `create`。
- 仍要确认 surface 是新页面还是现有设置页内新增 route。
- 询问或复用 `PRODUCT.md` / `DESIGN.md`。
- 不问 API、数据库或权限设计。

## Framing 摘要示例

Surface: 新增团队默认提示词设置页  
Current source: 用户文字描述，低置信度；无现有页面  
Change type: create  
Keep: 目标项目 DESIGN.md、现有导航和设置页路由模式  
Change: 页面信息层级、输入区结构、状态反馈、响应式密度  
Avoid: 不新增权限模型，不编造团队数据，不设计后端接口
