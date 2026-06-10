# 实现阶段的 Impeccable 集成

BFDS 实现阶段只复用 Impeccable 的 detect、critique 和 live；设计契约仍由 BFDS 控制。

## detect

优先使用目标项目同级宿主 bundle：

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json <target>
node .claude/skills/impeccable/scripts/detect.mjs --json <target>
node vendor/impeccable/cli/bin/cli.js detect <target>
```

目标只能来自 `qa-plan.json` 或本轮实现源码文件。入口不可验证时记录未运行，不阻塞其他可行验收。

## critique

critique 只能作为验收增强。传入上下文必须包含设计任务标识、目标界面、`changeType`、已选方案摘要、`keep/change/avoid`、P0/P1/P2 验收规则和实现截图。

critique 不能替代 `design-contract.json`，也不能把新视觉方向直接变成实现目标。

## live

live 只作用于当前 BFDS 设计任务的局部区域。接受结果后必须按 `live-region-iteration.md` 写局部契约补丁。
