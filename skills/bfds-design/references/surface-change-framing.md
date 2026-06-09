# Surface Change Framing

没有 Surface Change Framing 确认，不生成 workbench。

## 固定字段

每次必须确认：

- `surface`：页面、路由、组件、局部区域、弹窗、流程、空状态等。
- `current source`：截图、Figma、原型、URL、浏览器捕获、Storybook、代码推断、用户文字描述。
- `change type`：`create`、`extend`、`modify`、`remove`、`replace`、`merge`、`restyle`。
- `keep`：必须保留的布局、导航、业务逻辑、组件 API、品牌 token、数据流等。
- `change`：允许改变的层级、状态反馈、动效、密度、文案、局部结构等。
- `avoid`：必须避免的新增范围、误改、视觉套路、假数据、无关能力。

## Surface Evidence Checklist

按优先级处理证据：

1. 用户提供截图/Figma/原型/URL：作为视觉真相，记录路径或链接。
2. 可运行页面：用浏览器截图作为当前 surface 证据。
3. 本地代码、Storybook、组件库、tokens：只能作为代码推断。
4. 用户文字描述：低置信度，必要时追问。

只从代码推断时，必须标注：

```text
现状由代码推断，未视觉验证。
```

并要求用户确认。对 modify/remove/replace/restyle，未确认前不能生成 workbench。

## 改动类型判定

- `create`：新增页面、组件、流程或空状态。
- `extend`：保留当前 surface，在其中新增一个区域。
- `modify`：局部改变当前 surface。
- `remove`：删除或弱化某部分，并处理空出的结构。
- `replace`：用新结构替换旧结构。
- `merge`：合并多个区域或多个方案。
- `restyle`：功能和结构基本不变，只改变视觉表达。

如果用户说“更现代”“高级一点”“重新设计”，必须判定是 `restyle` 还是 `replace`，并要求当前 surface 证据。

## 确认模板

```text
我先确认这次设计范围：

Surface: <当前 surface>
Current source: <证据来源；如仅代码推断，标注未视觉验证>
Change type: <create/extend/modify/remove/replace/merge/restyle>
Keep: <必须保留>
Change: <允许改变>
Avoid: <禁止改变或避免>

确认后我会生成 3 个可交互设计方案。
```

## 停止条件

- 缺当前 surface，且本次不是 create。
- 删除/替换对象不明确。
- 周边布局和保留范围不明确。
- 用户要求补产品能力、API、数据库、权限或架构方案。
- 证据来源互相冲突，无法确定现状。
