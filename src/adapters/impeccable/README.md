# BFDS Impeccable Adapter

BFDS 只在 adapter 和 skill references 层复用 Impeccable，不修改 `vendor/impeccable/`。

## 边界

- `vendor/impeccable/` 保持 upstream-compatible 源码拷贝。
- BFDS 的需求级设计产物统一写入 `docs/design/<slug>/`。
- `.impeccable/` 可以作为 Impeccable live/config 的兼容目录保留，但不是 BFDS 主状态目录。
- Product Design 不 vendor；BFDS 只借鉴其先确认 brief、再做视觉探索、最后固定交接物的纪律。

## 复用能力

- Design Context：优先执行 Impeccable `init` skill 流程，建立或刷新 `PRODUCT.md`、`DESIGN.md` 和 live config。
- Automatic QA：使用 Impeccable CLI 的 `detect` 子命令扫描实现文件或页面证据。
- Design Review：需要额外设计评审时，读取 Impeccable `critique` reference，并标注为审查增强，不替代 BFDS contract QA。
- Live Region Iteration：局部微调时读取 Impeccable `live` reference，并把 live 结果关联回当前 BFDS slug。

## 已验证的本地入口

- `vendor/impeccable/package.json` 暴露 `bin.impeccable = cli/bin/cli.js`。
- `vendor/impeccable/cli/bin/cli.js` 支持 `detect` 和 `skills` 子命令。
- `vendor/impeccable/skill/SKILL.src.md` 的命令表包含 `init`、`document`、`critique`、`audit`、`polish`、`live` 等 skill sub-command。
- `live` 是 skill/script 协议，MVP 不假设存在稳定的 `impeccable live` CLI 子命令。

## 停止条件

如果当前任务必须调用 Impeccable，但本地入口、脚本路径或 skill 安装状态无法验证，BFDS 必须停止并要求用户确认或安装，不得假装已经运行。
