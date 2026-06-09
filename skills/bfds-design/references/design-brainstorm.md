# Design Brainstorm

Design Brainstorm 只脑暴设计稿，不脑暴产品能力。

## 输入

先读取：

- `PRODUCT.md`
- `DESIGN.md`
- PRD / 原型 / 截图 / URL / 用户材料
- Surface Change Framing

## 提问规则

- 一次只问一个最高价值问题。
- 先上下文扫描，再提问。
- 问题只围绕设计表达：信息优先级、弱化、密度、动效、状态表达、设备优先级、品牌边界、局部保留范围。
- 如果已有材料足够，跳过提问，直接生成 Three Direction Specs。

可问：

- 哪个信息应该最先被看见？
- 哪些内容要弱化或折叠？
- 这个 surface 应该更高效、更安静、更强提示，还是更具品牌表现？
- 动效是低存在感反馈，还是承担引导/强调？
- 哪些状态必须高保真展示？
- 移动端、桌面端、嵌入场景哪个优先？
- 局部改动是否必须保留周边布局和节奏？

不可问：

- API 怎么设计。
- 数据模型怎么设计。
- 权限和角色怎么定义。
- 商业模式或产品范围是否扩大。
- 后端架构怎么拆。

## Three Direction Specs

输出三个方向，字段必须齐全：

```json
{
  "optionId": "A",
  "name": "Quiet Precision",
  "designThesis": "用更安静的层级和明确状态减少输入焦虑。",
  "hierarchy": "主输入区第一优先，历史和说明弱化。",
  "density": "snug",
  "motion": "低存在感 focus 和验证反馈。",
  "stateTreatment": "error/loading/success 都在输入区附近明确呈现。",
  "layoutStrategy": "保留周边布局，只重排输入和帮助信息。",
  "visualSignature": "细分隔、稳定基线、单一强调动作。",
  "risks": ["视觉记忆点偏少"],
  "bestFor": "高频设置和需要降低认知负担的产品 UI"
}
```

三个方案必须在信息架构、层级、密度、状态处理或交互节奏上有明确差异，不能只是换色。

## 收敛

生成 workbench 前，把三个方向写入 workbench 页面说明。用户可以回复：

- “选 A”
- “选 B，但导航用 A 的”
- “C 的错误态加到 B”
- “都不对，重做方向”

用户选择后进入 Contract Pack。
