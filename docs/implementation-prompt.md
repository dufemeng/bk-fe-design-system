# BFDS MVP Implementation Prompt

你正在实现 BFDS MVP。先完整阅读 `README.md` 和 `docs/bfds-mvp-design-spec.md`，尤其是第 12 节「MVP 实施任务拆分」和第 13 节「反幻觉材料」。

## 目标

实现 BFDS Design Completion Layer。BFDS 不是产品规划、后端架构、API、数据库、权限、算法或通用工程实现框架。不要重新设计产品方向。

## 顺序

按 spec 第 12 节 T0-T12 顺序推进：

1. T0 项目骨架与 vendor
2. T1 Skill 骨架与触发描述
3. T2 Intent Router 与恢复协议
4. T3 Artifact schema 与模板
5. T4 Surface Change Framing 协议
6. T5 Design Brainstorm 协议
7. T6 Kami Workbench 模板
8. T7 Impeccable 适配层
9. T8 bfds-design 端到端串联
10. T9 bfds-implement 端到端串联
11. T10 QA 与 Live 双阶段协议
12. T11 Fixtures 与前向测试
13. T12 README 与实施提示词

## 禁止事项

- 不在 `vendor/impeccable/` 内做 BFDS 定制。
- 不 vendor Product Design。
- 不把所有前端工作都触发到 BFDS。
- 不缺用户选择就生成 contract pack。
- 不缺 contract pack 就凭记忆实现。
- 不编造 Impeccable 不存在的命令或入口。
- 不把核心设计判断写成脚本。
- 不编数据、不用填充文案凑页面、不滥用强调色和占位图。
- 不使用廉价“圆角卡片 + 彩色左边框”模板化强调。

## 必须有的文件

- `skills/bfds-design/SKILL.md`
- `skills/bfds-implement/SKILL.md`
- `templates/artifacts/design-contract.schema.json`
- `templates/artifacts/qa-plan.schema.json`
- `templates/artifacts/status.schema.json`
- `templates/artifacts/implementation-handoff.md`
- `templates/kami-workbench/workbench.html`
- `templates/kami-workbench/option.html`
- `templates/kami-workbench/workbench.css`
- `scripts/bfds-status.mjs`
- `scripts/validate-artifacts.mjs`
- `fixtures/docs-design-sample/<slug>/` 完整样例
- `tests/forward/` 前向测试

## 验收

- `bfds-design` 能从“这是 PRD，开始设计”进入 Design Context 和 Surface Change Framing。
- 现有 surface 改造必须先要求现状证据或用户确认。
- 三方案 workbench 使用 Kami 外壳和三个 iframe，iframe 内遵守目标项目 `DESIGN.md`。
- 用户选择后生成 contract pack。
- `bfds-implement` 能从 `status.json` 恢复 slug，读取三个 artifact 后实现。
- 缺 contract pack 时不写代码。
- Automatic QA 和 Live Region Iteration 分阶段。
- fixtures 能通过 artifact schema 校验。
- forward tests 至少可人工走读，最好有脚本结构校验。
