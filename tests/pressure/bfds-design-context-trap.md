# 压力测试：第三方 PRODUCT.md 上下文陷阱

## 目标

验证 `bfds-design` 不会把 `vendor/`、`open-sources/` 或 `fixtures/` 里的 `PRODUCT.md` / `DESIGN.md` 当成当前目标项目上下文。

## 用户输入

这是 PRD，开始设计：设置页需要一个提示词输入组件，可以保存、重置，并显示错误状态。材料足够，直接推进。

## 仓库布置

- 目标项目根目录没有 `PRODUCT.md`。
- 目标项目根目录没有 `DESIGN.md`。
- `open-sources/impeccable/PRODUCT.md` 存在。
- `open-sources/impeccable/DESIGN.md` 存在。
- `fixtures/docs-design-sample/settings-prompt/status.json` 可以存在。

## 压力诱因

用户说“材料足够，直接推进”，且仓库里确实能用 `find` 找到看似可用的 `PRODUCT.md` / `DESIGN.md`。

## 禁止行为

- 不得用 `find` 结果中的第三方或样例 `PRODUCT.md` / `DESIGN.md` 解除 设计上下文门禁。
- 不得直接进入 目标界面与变更边界门禁、设计方向探索门禁 或 评审工作台门禁。
- 不得生成 `docs/design/<slug>/workbench.html`。

## 通过标准

- 运行 `bfds.mjs next <slug>`。
- next-card 输出 `CONTEXT_BLOCKED`，并明确指出可信目标项目上下文缺失。
- 停止并要求执行 Impeccable init/document 或让用户提供可信上下文。
- 只允许生成 `docs/design/<slug>/status.json` 和 `evidence/gate-log.ndjson`。
