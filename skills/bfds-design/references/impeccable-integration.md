# Impeccable Integration for BFDS Design

BFDS 在设计阶段复用 Impeccable 的 context 和 live 纪律，不 fork Impeccable。

## Impeccable 发现顺序

按顺序尝试：

1. 当前环境已安装或已暴露 Impeccable skill：使用该 skill 的 `init`、`document`、`critique`、`live` references。
2. 当前目标仓库有 `vendor/impeccable/`：读取 `vendor/impeccable/skill/SKILL.src.md` 和对应 reference。
3. 当前目标仓库或全局命令可验证 `impeccable` CLI：只把它用于已确认支持的 CLI 子命令，例如 `detect`。
4. 找不到 Impeccable：如果 `PRODUCT.md` 和 `DESIGN.md` 已存在，可以继续 BFDS 设计；如果缺失，则停止并要求用户安装/链接 Impeccable 或提供设计上下文，不要伪造 `init` 结果。

在本 BFDS repo 的开发态中，已验证 `vendor/impeccable/cli/bin/cli.js` 支持 `detect` 和 `skills`，Impeccable skill reference 包含 `init`、`document`、`critique`、`live`。

## Design Context

优先复用 Impeccable `init` skill 流程：

1. 检查根目录是否已有 `PRODUCT.md` 和 `DESIGN.md`。
2. 如果缺失，按“Impeccable 发现顺序”找到 `init` reference。
3. 按 init 流程收集战略和视觉上下文。
4. 写入或刷新 `PRODUCT.md`、`DESIGN.md`。
5. 记录本次 design slug 引用了哪个 context 文件和更新时间。

不要直接复制 Impeccable `document` 流程替代 `init`，因为 `init` 才同时处理 PRODUCT、DESIGN 和 live config。

## Live 微调

用户对已生成或已实现设计提出局部微调时：

1. 恢复当前 BFDS slug。
2. 按“Impeccable 发现顺序”找到 `live` reference。
3. 确认目标项目有可运行页面或静态 HTML。
4. 如果入口、dev server 或 live config 未验证，停止并要求确认。
5. 将 live 结果记录回当前 slug 的 `status.json` 或 QA report。

## 不做

- 不 vendor Product Design。
- 不把 BFDS 产物写入 `.impeccable/`。
- 不在 `vendor/impeccable/` 内加入 BFDS 定制逻辑。
- 不假设存在未验证的 `impeccable init` 或 `impeccable live` CLI 子命令。
