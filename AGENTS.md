# BFDS Agent Guardrails

本文件约束在本仓库工作的后续 agent，防止 BFDS 方向漂移、术语跑偏和大范围误改。主协议仍写在 `skills/*/SKILL.md` 和对应 `references/` 中；本文件只做仓库级护栏。

## 开始前必须读取

1. `README.md`
2. `docs/bfds-mvp-design-spec.md`，重点读第 12 节「MVP 实施任务拆分」和第 13 节「反幻觉材料」
3. 相关 skill 的 `SKILL.md`
4. 相关 skill 的直接引用文件，不要深链式加载无关材料
5. 当前 `git status --short`

## 产品边界

- BFDS 是设计补全层（Design Completion Layer），不是产品规划、后端架构或通用工程实现框架。
- 不重新设计 BFDS 的产品方向，不把它扩展成通用 frontend framework。
- 按 `docs/bfds-mvp-design-spec.md` 的 T0-T12 顺序推进。发现 spec 与本地 Impeccable/Kami 结构不一致时，以本地代码为准，更新 BFDS adapter/reference，不编造不存在的命令或入口。
- 不深改 `vendor/impeccable/`。BFDS 适配逻辑放在 `src/adapters/impeccable/` 和 skill references 中。
- Product Design 不 vendor，只借鉴先确认 brief、再视觉探索、最后固定交接物的纪律。

## Skill 修改纪律

- `SKILL.md` 保持精简，只放触发范围、核心流程、硬停止和 references 导航。
- 复杂流程写入 `references/`，模板放 `assets/`，确定性辅助放 `scripts/`。
- 不在 skill 目录新增 README、安装指南、术语表、变更日志等额外文档。
- 不把主协议依赖 AGENTS.md；安装后的 skill 必须靠自身 `SKILL.md`、`references/`、`assets/`、`scripts/` 可用。
- 修改 skill 后同步检查 `agents/openai.yaml`，确保 `short_description` 和 `default_prompt` 与 skill 真实能力一致。

## Skill 减负原则

BFDS 当前首要目标是减轻用户执行 skill 时的大模型负担，而不是仓库瘦身。仓库 LOC 下降不算成功；用户执行 skill 时少读文件、少读长文档、少手写结构化 JSON、少跨文件同步、少重复确认、少因 context 丢失而跳步，才算成功。

- 不为“完整性”做加法。新增文件、长文档、长 reference、额外中间产物、额外状态源和跨文件同步，默认都是负担；只有能明确减少用户执行时的读取、生成、等待或返工，才允许引入。
- 不删关键交付环节。init 用户问答、`PRODUCT.md` / `DESIGN.md`、目标界面确认、设计脑暴、三方案评审、用户选择、实现验收都属于核心价值链；压缩只能压缩机械层，不能省略会影响设计判断的用户交互。
- 热路径要短，冷路径要稳。next-card / `SKILL.md` 放当前阶段必须行动和少量质量锚点；详细规范留在 reference，且只有卡片明确要求时读取。
- 模型只产判断和值，runtime 负责结构、校验和展开。不要让用户执行 skill 的 LLM 手写完整 JSON、status 或重复 schema。
- 修复 init 问答体验或 brainstorm 专业性时，也必须遵守减负原则：优先把高价值问题压缩到问答 UI 和 next-card，不新增长问卷或多份同步文档。
- 用户是审查者和方案把关者，不是结构化数据录入员。可用 `AskUserQuestion`、Codex structured user-input 或等价问答工具时优先使用；不要要求用户自己手写字段。
- 用户只要求定位、审查或脑暴方案时，不要直接改代码。先输出根因、取舍和最小改法，等用户确认再实施。

## 术语与用户交互

- 用户交互和 agent 可见流程文案优先使用专业中文术语。
- 不建立中英文术语映射文件，不添加“不要说某英文词”这类冗余规则；直接用正确中文写。
- 不机械替换代码标识、JSON key、schema 字段、状态枚举、文件名、CSS 变量、命令参数和产品名。
- 核心中文术语保持一致：
  - 需求意图识别
  - 设计上下文梳理
  - 目标界面与变更边界确认
  - 目标界面证据核验
  - 设计方向探索
  - 三方案设计评审工作台
  - 方案确认
  - 设计交付包
  - 设计产物完整性校验
  - 实现交接说明
  - 自动化设计还原检查
  - 局部实时微调
- `surface` 在说明性文案中写作“目标界面”或“目标区域”；保留 JSON/CSS/路径中的原始标识。
- `slug` 在说明性文案中写作“设计任务”或“设计任务标识”；保留 `<slug>` 路径占位和 JSON 字段。
- `workbench` 在说明性文案中写作“评审工作台”；保留 `workbench.html`、schema key 和路径。
- `option A/B/C` 在可见文案中写作“方案 A/B/C”；保留 `option-a.html` 等文件名。

## 变更范围控制

- 优先做最小可验证改动。不要为了“统一”而大范围重写无关文档。
- 不改 `docs/bfds-mvp-design-spec.md`、`docs/implementation-prompt.md` 等源设计/历史规格，除非用户明确要求。
- 修改 runtime schema 或模板时，只改 `src/runtime/bfds/`；安装脚本会把它注入到安装后的 skill。
- 修改示例设计产物时，保持 schema key、状态枚举和路径不变。
- 不用脚本承载核心设计判断；脚本只能做状态扫描、artifact 校验、安装、自检等确定性辅助。

## 验证要求

改动后至少运行能覆盖本次变更的校验：

```bash
git diff --check
node scripts/bfds.mjs validate fixtures/docs-design-sample/settings-prompt
node scripts/bfds.mjs validate --forward-tests
node skills/bfds-design/scripts/bfds.mjs validate fixtures/docs-design-sample/settings-prompt
node skills/bfds-implement/scripts/bfds.mjs validate fixtures/docs-design-sample/settings-prompt
```

如果修改 skill frontmatter 或 `agents/openai.yaml`，还要做 frontmatter/openai 元数据校验。若 `quick_validate.py` 因缺依赖无法运行，明确记录失败原因，不假装通过。

## 提交前检查

- `git status --short` 只包含本次任务相关文件。
- 没有意外改动 `vendor/impeccable/`。
- 没有新增术语映射文件或重复说明文件。
- 没有把用户可见流程术语改回内部英文阶段名。
- 验证结果和未能运行的验证项在最终回复中说明。
