# 设计方向探索

本阶段只处理设计表达，不扩展产品能力。输出顺序固定：

1. `docs/design/<slug>/evidence/brainstorm-dialogue.json`
2. `docs/design/<slug>/evidence/directions.json`

写命令会自动返回 next-card；按返回卡片继续。只有恢复中断状态或卡片明确要求时，才额外运行 `bfds.mjs next`。next-card 没进入 `NEEDS_WORKBENCH` 前，不生成评审工作台或方案 HTML。

## 苏格拉底式问答

一次只问一个设计表达问题，并等待用户回答。问题只覆盖：

- 哪个信息应该最先被看见？
- 哪些内容要弱化、折叠或延后出现？
- 目标界面应该更高效、更安静、更强提示，还是更具品牌表现？
- 动效是低存在感反馈，还是承担引导/强调？
- 哪些状态必须高保真展示？
- 移动端、桌面端、嵌入场景哪个优先？
- 局部改动是否必须保留周边布局和节奏？

不要问 API、数据模型、权限、商业模式、后端架构，也不要在本阶段重新确认目标界面。

至少完成两轮有效设计问答后，提出 2-3 个方向及取舍；Claude Code 用 `AskUserQuestion` 让用户确认、合并或调整。用户确认后，写 `brainstorm-dialogue.json`。

如果用户明确拒绝继续追问，`brainstorm-dialogue.json` 使用 `mode: "user-skipped"`，记录 `skipReasonQuote`，仍要先提出 2-3 个方向取舍并取得用户确认。

## 方向规格

`directions.json` 必须引用同目录的 `surface.json` 和 `brainstorm-dialogue.json`：

```json
{
  "surfaceEvidence": "docs/design/<slug>/evidence/surface.json",
  "brainstormDialogueEvidence": "docs/design/<slug>/evidence/brainstorm-dialogue.json"
}
```

每个方案必须包含：

```json
{
  "optionId": "A",
  "name": "Quiet Precision",
  "designThesis": "用更安静的层级和明确状态减少输入焦虑。",
  "sourceConstraints": ["PRODUCT.md", "DESIGN.md"],
  "hierarchy": "主输入区第一优先。",
  "density": "snug",
  "motion": "低存在感 focus 和验证反馈。",
  "stateTreatment": "error/loading/success 都在输入区附近呈现。",
  "layoutStrategy": "保留周边布局，只重排输入和帮助信息。",
  "interactionModel": "输入、保存、重置和错误解释在同一局部完成。",
  "visualSignature": "细分隔、稳定基线、单一强调动作。",
  "differenceDimensions": ["hierarchy", "density"],
  "keep": ["页面导航"],
  "change": ["输入区层级"],
  "avoid": ["新增无关设置项"],
  "risks": ["视觉记忆点偏少"],
  "bestFor": "高频设置"
}
```

三个方案至少在两个维度上不同：信息架构、层级、密度、状态表达、交互模型、动效角色、局部保留范围、视觉签名。换色、换圆角、换阴影不算差异。

## 自检

写入 `directions.json` 前确认：

- 已写入并通过 `bfds.mjs next` 检查 `brainstorm-dialogue.json`。
- 使用了可信 `PRODUCT.md` / `DESIGN.md` 和 `surface.json`。
- 没有新增未确认产品能力。
- A/B/C 都包含 keep/change/avoid。
- 至少一个方案覆盖关键状态或关键交互。
