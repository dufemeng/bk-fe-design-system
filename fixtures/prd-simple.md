# PRD Fixture: Simple Design Start

## 输入材料

团队需要一个设置页，允许管理员编辑“团队默认提示词”。提示词用于新建项目时预填。已有保存逻辑由目标项目决定，BFDS 不设计 API、数据库或权限。

## BFDS 期望

- 触发 `bfds-design`。
- 进入 Design Context。
- 进入 Surface Change Framing。
- 不生成 workbench，直到用户确认 surface framing。
- 不询问 API、数据库或权限。
