#!/usr/bin/env node

const bootstrap = `
<EXTREMELY_IMPORTANT>
当前仓库启用了 BFDS 护栏。

处理 BFDS 设计请求时：
- 使用 bfds-design skill，并在写任何 BFDS 产物前运行 bfds.mjs next <slug> --request "<用户请求摘要>"。
- 只接受 next-card 当前 phase，不从聊天记忆推断状态。
- status.json 和 evidence/gate-log.ndjson 只由 BFDS runtime 管理。
- Claude Code 中选择或确认类用户输入必须用 AskUserQuestion；Register 只问 product/brand 单选，不问名称或 ID。

硬阶段边界：
- CONTEXT_BLOCKED：父会话先扫描可推断信息，再每轮成组询问 2-3 个项目级 Impeccable init 问题。用 answer --stage init 记录多轮回答和确认；确认前不写 PRODUCT.md 或 DESIGN.md。PRODUCT.md 是战略上下文；DESIGN.md 是 Stitch 视觉设计系统文档，不是架构文档。
- NEEDS_SURFACE：只确认目标界面与变更边界，用 answer --stage surface 提交扁平字段。
- NEEDS_DIRECTIONS：父会话做苏格拉底式设计脑暴，一次只问一个设计表达问题。先用 answer --stage brainstorm 记录问答，再用 directions 提交 A/B/C 方向规格。
- NEEDS_WORKBENCH：用 workbench --scaffold 生成脚手架；真实方案填完后用 workbench --validate，含 BFDS_PLACEHOLDER 的文件不能进入选择。
- NEEDS_SELECTION：停止等待用户用 AskUserQuestion 明确选择；推荐方案或“你定”不算选择。
- NEEDS_CONTRACT：用 pack --add 提交 contract 判断字段；runtime 回显后，用 AskUserQuestion 确认，再用 pack --confirm 生成设计交付包。

如果 startup、clear 或 compact 丢失上下文，先重跑 bfds.mjs next <slug>，再从 next-card 报告的阶段继续。
</EXTREMELY_IMPORTANT>
`.trim();

process.stdout.write(`${JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: bootstrap
  }
})}\n`);
