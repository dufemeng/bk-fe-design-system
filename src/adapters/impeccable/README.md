# BFDS Impeccable Adapter

BFDS 只在 adapter 和 skill references 层复用 Impeccable，不修改 `vendor/impeccable/`。

## 边界

- `vendor/impeccable/` 保持 upstream-compatible 源码拷贝。
- 安装时把 `vendor/impeccable/.agents/skills/impeccable/` 或 `vendor/impeccable/.claude/skills/impeccable/` 复制成目标项目宿主同级 skill，不复制进 BFDS skill 内部。
- BFDS 的需求级设计产物统一写入 `docs/design/<slug>/`。
- `.impeccable/` 可以作为 Impeccable live/config 的兼容目录保留，但不是 BFDS 主状态目录。
- Product Design 不 vendor；BFDS 只借鉴其先确认 brief、再做视觉探索、最后固定交接物的纪律。

## 复用能力

- 设计上下文梳理：优先执行 Impeccable `init` skill 流程，建立或刷新 `PRODUCT.md`、`DESIGN.md` 和 live config。进入 init 前必须挂起当前 BFDS 任务级设计请求，init 只问项目级上下文，完成后再恢复任务。
- 自动化设计还原检查：使用 Impeccable CLI 的 `detect` 子命令扫描实现文件或页面证据。扫描目标必须来自 `qa-plan.json` 或本轮实现改动文件，不能从聊天描述或占位符临时猜测。
- 设计评审增强：需要额外设计评审时，读取 Impeccable `critique` reference，并标注为审查增强，不替代 BFDS 设计契约验收。critique 必须消费 BFDS 契约上下文包，输出只能作为验收证据或阻塞风险。
- 局部实时微调：局部微调时读取 Impeccable `live` reference，并把 live 结果关联回当前 BFDS 设计任务。接受 live 结果后必须记录局部契约补丁，不能改写全局设计契约或扩大产品范围。

## 已验证的本地入口

- `vendor/impeccable/.agents/skills/impeccable/` 是 Codex / agents 宿主 bundle，脚本路径以 `.agents/skills/impeccable/` 为项目根相对路径。
- `vendor/impeccable/.claude/skills/impeccable/` 是 Claude Code 宿主 bundle，脚本路径以 `.claude/skills/impeccable/` 为项目根相对路径。
- `vendor/impeccable/package.json` 暴露 `bin.impeccable = cli/bin/cli.js`。
- `vendor/impeccable/cli/bin/cli.js` 支持 `detect` 和 `skills` 子命令。
- `vendor/impeccable/skill/SKILL.src.md` 的命令表包含 `init`、`document`、`critique`、`audit`、`polish`、`live` 等 skill sub-command。
- `live` 是 skill/script 协议，MVP 不假设存在稳定的 `impeccable live` CLI 子命令。

## 停止条件

如果当前任务必须调用 Impeccable，但本地入口、脚本路径或 skill 安装状态无法验证，BFDS 必须停止并要求用户确认或安装，不得假装已经运行。
