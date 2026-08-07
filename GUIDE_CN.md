# PCB BOM Checker 完整部署与使用教程

这份教程按照“完全没有 GitHub 开发经验也可以完成”的方式编写。

目标不是单纯创建一个外链页面，而是发布一个真正可以在线使用的 PCB BOM 检查工具。用户打开网页后可以上传 BOM，检查常见数据问题，并导出检查报告。整个 BOM 分析过程在浏览器本地进行，项目本身不设置文件上传服务器。

---

## 一、最终你会得到什么

完成后会有两个公开地址。

### 1. GitHub 项目页

格式：

```text
https://github.com/你的用户名/pcbcool-pcb-bom-checker
```

这里用于展示：

- 源代码
- README 使用说明
- 开源协议
- 示例 BOM
- 修改记录
- Issue / Bug 反馈

### 2. GitHub Pages 在线工具

格式：

```text
https://你的用户名.github.io/pcbcool-pcb-bom-checker/
```

这个页面是真正可以使用的 PCB BOM Checker。

用户不需要安装软件。

---

# 二、工具目前能检查什么

## Reference Designator / RefDes

可以检查：

- 缺少 Reference Designator
- 同一行 RefDes 重复
- 不同行 RefDes 重复
- 同一个 RefDes 同时出现在正常贴装和 DNP 行
- `R1-R10` 这类连续范围
- `C1:C8`
- `U1..U4`
- 不常见或可疑的 RefDes 格式
- 超大 RefDes 范围

例如：

```text
R1-R4
```

会被识别为：

```text
R1, R2, R3, R4
```

因此 Qty 应该通常为 4。

---

## Quantity

可以检查：

- 空数量
- 非数字
- 小数数量
- 0
- 负数
- Qty 与 RefDes 数量不一致

例如：

```text
RefDes: C1, C2, C3
Qty: 2
```

会被标记为错误，因为实际检测到 3 个 Reference Designator。

如果你的 BOM 中 Qty 是“整批采购数量”而不是“单板用量”，可以关闭：

```text
Compare Qty with RefDes count
```

避免产生不适用的数量错误。

---

## Manufacturer / MPN

可以检查：

- Manufacturer 缺失
- Manufacturer Part Number 缺失
- `TBD`
- `N/A`
- `?`
- `Unknown`
- 同一个 MPN 对应多个 Manufacturer
- 同一个 MPN 对应多个 Footprint
- 同一个 MPN 对应多个 Value

这类问题对采购尤其重要。

---

## Footprint / Package

根据不同检查模式，可以检查：

- Footprint 是否存在
- 相同 MPN 是否被分配到冲突的 Footprint

但工具不会判断某个 Footprint 的物理尺寸是否真的匹配芯片封装。

这必须通过原厂 Datasheet、ECAD 库或制造工程审核完成。

---

## DNP / DNI / DNF

工具可以识别常见写法：

```text
DNP
DNI
DNF
Do Not Populate
Do Not Install
Do Not Fit
Not Fitted
No Fit
```

也支持正向字段，例如：

```text
Populate
Fitted
```

当列标题为 `Populate` 时：

```text
Yes = 正常安装
No = DNP
```

这和普通 DNP 列的 Yes / No 逻辑是相反的，工具会根据列标题处理。

---

## Internal Part Number / 企业内部料号

如果 BOM 包含 `Internal Part Number`、`IPN`、`Company Part Number`、`Material Code` 等字段，工具可以检查同一个内部料号是否映射到多个不同 Manufacturer + MPN。

这种情况不一定错误，因为企业的 AVL 可能允许一个内部料号对应多个 Approved Alternate，所以只作为 Warning 提醒人工确认。

---

## Lifecycle Status

如果 BOM 自己提供 Lifecycle 字段，工具可以识别并提醒：

```text
EOL
Obsolete
NRND
Last Time Buy
Discontinued
```

注意，这只是检查 BOM 里已经填写的状态，不会联网查询原厂实时生命周期信息。

---

## Supplier 信息

如果 BOM 提供：

```text
Supplier
Supplier Part Number
```

工具还会检查同一个供应商料号是否对应多个不同 MPN。

这有助于发现 ERP 或采购表里的映射错误。

---

## Duplicate BOM Lines

工具会检查：

- 完全重复的 BOM 行
- 相同零件被拆分到多个行、可能可以合并的情况

对于“可能可以合并”的情况，只提示 Info，不会自动修改。

因为部分 BOM 行虽然零件相同，但可能属于：

- 不同 Variant
- 不同装配选项
- 不同备注
- 不同 Approved Vendor List

所以自动合并可能破坏工程信息。

---

# 三、三种检查模式

页面中的 `Check profile` 有三种模式。

## 1. Assembly-ready

适合装配前快速检查。

重点关注：

- RefDes
- Qty
- Value / Description
- Footprint

Manufacturer 和 MPN 会更多作为补充信息。

---

## 2. Procurement-ready

建议大多数情况下使用这个模式。

重点关注：

- RefDes
- Qty
- MPN
- Manufacturer
- Description
- Footprint

如果准备向 PCBA 厂商询价，这个模式比较合适。

---

## 3. Engineering release

更加严格。

核心字段包括：

- RefDes
- Qty
- MPN
- Manufacturer
- Footprint

同时会更关注：

- Description
- Value
- Supplier Part Number
- Alternate MPN

需要注意：这只是工具内部的“严格模式”，不是 IPC 或其他标准定义的正式 BOM Release 等级。

不同企业的 PLM / ERP / AVL 流程不同，最终应以企业自己的工程规范为准。

---

# 四、支持的文件格式

目前支持：

```text
.csv
.tsv
.txt
.xlsx
.xls
.xlsm
.xlsb
```

还可以直接从 Excel / Google Sheets 中复制单元格，然后点击：

```text
Paste from Excel
```

粘贴进去分析。

---

# 五、创建新的 GitHub Repository

如果已经登录 GitHub：

```text
https://github.com/
```

点击右上角：

```text
+
```

选择：

```text
New repository
```

填写：

## Repository name

```text
pcbcool-pcb-bom-checker
```

## Description

```text
Free browser-based PCB BOM checker for RefDes, quantities, MPNs, footprints, DNP rows, duplicates, and sourcing consistency.
```

## Visibility

选择：

```text
Public
```

不要勾选自动创建 README，因为项目包已经包含 README。

点击：

```text
Create repository
```

---

# 六、上传项目文件

下载并解压我提供的：

```text
pcbcool-pcb-bom-checker.zip
```

进入解压后的最里面一层目录。

你应该看到：

```text
.github
.nojekyll
app.js
bom-core.js
index.html
styles.css
sample-bom-clean.csv
sample-bom-with-issues.csv
README.md
GUIDE_CN.md
CONTRIBUTING.md
SECURITY.md
LICENSE
tests
```

在 GitHub 空仓库中点击：

```text
uploading an existing file
```

或者：

```text
Add file → Upload files
```

重要：

不要把整个外层文件夹作为一个目录再次套进去。

正确结果应该是：

```text
/index.html
/app.js
/bom-core.js
```

而不是：

```text
/pcbcool-pcb-bom-checker/index.html
```

选择项目文件夹内部的全部内容上传。

Commit message 可以填：

```text
Initial release of PCB BOM Checker
```

点击：

```text
Commit changes
```

---

# 七、确认 GitHub Actions 文件已经上传

进入仓库后确认存在：

```text
.github/workflows/pages.yml
```

这是 GitHub Pages 自动发布配置。

它会在每次 `main` 分支发生更新时自动重新部署网站。

---

# 八、开启 GitHub Pages

进入仓库顶部：

```text
Settings
```

在左侧找到：

```text
Pages
```

在：

```text
Build and deployment
```

将 Source 设置为：

```text
GitHub Actions
```

项目已经包含部署 Workflow，所以通常不需要再写代码。

---

# 九、运行第一次部署

点击仓库顶部：

```text
Actions
```

左侧应该看到：

```text
Deploy PCB BOM Checker to GitHub Pages
```

如果它已经自动运行，等待它完成即可。

成功后会出现绿色勾：

```text
✓
```

如果没有自动运行：

点击：

```text
Deploy PCB BOM Checker to GitHub Pages
```

然后点击：

```text
Run workflow
```

Branch 保持：

```text
main
```

再次点击：

```text
Run workflow
```

---

# 十、打开在线 PCB BOM Checker

部署完成后，通常地址为：

```text
https://你的GitHub用户名.github.io/pcbcool-pcb-bom-checker/
```

例如 GitHub 用户名是：

```text
LokiZhan0
```

那么地址通常为：

```text
https://lokizhan0.github.io/pcbcool-pcb-bom-checker/
```

GitHub URL 不区分用户名显示时的大小写，但建议分享时全部使用小写形式。

---

# 十一、第一次测试

不需要准备自己的 BOM。

页面上有：

```text
Load problem sample
```

点击以后会加载一个故意包含错误的 BOM。

你应该看到错误和警告，例如：

- Quantity mismatch
- Duplicate RefDes
- Placeholder MPN
- Same MPN / different footprint
- Zero quantity
- Negative quantity
- DNP conflict

然后点击：

```text
load clean sample
```

可以查看一个相对干净的 BOM。

---

# 十二、如何检查自己的 BOM

最简单方法：

点击：

```text
Choose BOM file
```

选择文件。

也可以直接把 BOM 拖到页面的上传区域。

---

# 十三、一定要检查 Column Mapping

这是非常重要的一步。

工具会自动识别：

```text
RefDes
Qty
Manufacturer
MPN
Description
Value
Footprint
DNP
Supplier
Supplier P/N
Alternate MPN
Notes
```

但 ERP、PLM 和不同 CAD 工具使用的名称差异非常大。

例如：

```text
Locations
```

可能代表 RefDes。

```text
Part No.
```

可能是 MPN，也可能是公司内部物料编号。

所以自动识别完成后，应人工确认一次。

如果自动映射错误，在下拉菜单里重新选择正确字段即可。

---

# 十四、Header Row 是什么

很多 Excel BOM 不是第一行直接开始表格。

例如：

```text
Row 1: Project: Gas Monitor
Row 2: Revision: 2.1
Row 3: Date: 2026-08-07
Row 4: Reference Designator | Qty | MPN | ...
```

工具会尝试自动判断第 4 行才是真正 Header。

页面会显示：

```text
Header row
```

如果判断错误，可以手动输入正确行号。

---

# 十五、Excel 多 Worksheet

如果上传 XLSX / XLS 文件，并且里面有多个 Sheet，页面会出现：

```text
Worksheet
```

可以切换：

```text
Main BOM
Variant A
Variant B
Mechanical
```

每次切换后都会重新分析当前 Worksheet。

---

# 十六、如何理解 Error / Warning / Info

## Error

通常应该优先修复。

例如：

```text
Duplicate RefDes
Qty mismatch
Invalid quantity
Missing required MPN
Same MPN assigned to multiple manufacturers
```

这些问题比较容易造成采购或装配歧义。

---

## Warning

需要人工检查，但不一定代表 BOM 错误。

例如：

```text
Missing footprint
Same MPN with different value
Exact duplicate lines
Unusual RefDes format
```

有些项目中可能是合理设计。

---

## Info

主要是提醒。

例如：

```text
DNP row has positive quantity
Same part appears on multiple rows
Optional field not mapped
```

不应把 Info 当成错误自动修改。

---

# 十七、DNP 设置怎么用

默认开启：

```text
Exclude DNP from required-field checks
```

含义是：

DNP 元件仍然会参与：

- Duplicate RefDes 检查
- Placed vs DNP 冲突检查
- DNP 状态检查

但不会因为缺少 MPN 等字段而按正常贴装件处理。

通常建议保持开启。

---

# 十八、什么时候关闭 Qty vs RefDes 检查

默认：

```text
Compare Qty with RefDes count = ON
```

例如：

```text
R1, R2, R3, R4
Qty = 4
```

是合理的。

但是有的采购 BOM Qty 是：

```text
4000
```

因为计划生产 1000 块板。

这时 RefDes 只有 4 个，Qty 是 4000。

如果你的 BOM 属于这种情况，应关闭：

```text
Compare Qty with RefDes count
```

否则会产生大量无意义错误。

---

# 十九、什么时候开启 Allow rows without RefDes

PCB BOM 有时会包含：

- Screw
- Label
- Thermal pad
- Cable
- Enclosure
- Adhesive
- Packaging material
- Off-board antenna

这些东西可能没有：

```text
R1
C1
U1
```

这类 PCB Reference Designator。

如果 BOM 确实包含这类项目，可以开启：

```text
Allow rows without RefDes
```

这样它们不会仅仅因为没有 RefDes 被判为错误。

---

# 二十、三个下载按钮有什么用

## Issue report CSV

下载完整问题列表。

适合：

- 发给工程师修改
- 发给采购确认
- 内部 Review
- 保存问题记录

---

## Reviewed BOM CSV

不会直接篡改原 BOM。

它在原始字段后增加：

```text
Checker Status
Checker Issues
Normalized Designators
Detected Reference Count
DNP Detected
```

非常适合作为 Review 副本。

---

## Full report JSON

输出结构化 JSON。

适合以后：

- 接 CI
- 做自动流程
- 与内部系统整合
- 二次开发

---

# 二十一、这个工具不会检查什么

不要把网页显示：

```text
No issues detected
```

理解成：

```text
这个 BOM 已经 100% 可以生产
```

两者完全不同。

目前工具不会验证：

- MPN 是否停产
- 实时库存
- 元器件是否正品
- 是否来自授权代理
- 电压是否正确
- 电流是否正确
- 温度等级是否正确
- 电容耐压是否满足设计
- 芯片封装实际尺寸
- Footprint 是否画对
- PCB 网络是否正确
- 极性
- Pick-and-Place 坐标
- 钢网
- AOI 覆盖率
- DFM
- DFA
- AVL / AML
- 法规合规
- 最终量产可制造性

所以它是：

```text
BOM Data Quality Checker
```

而不是：

```text
Automatic Production Approval System
```

---

# 二十二、关于 BOM 隐私

这个工具的主要设计原则之一是：

```text
BOM 在浏览器中分析
```

项目没有建立自己的上传 API。

CSV / TSV 分析完全由本地 JavaScript 执行。

Excel 文件使用 SheetJS Community Edition 在浏览器中解析。

项目当前从 SheetJS 官方 CDN 加载 Excel 解析脚本。

如果企业有非常严格的安全要求，可以将 SheetJS 脚本下载后放进项目本地目录，实现依赖自托管。

---

# 二十三、以后如何更新工具

修改：

```text
index.html
styles.css
app.js
bom-core.js
```

然后 Commit 到：

```text
main
```

GitHub Actions 会自动重新部署 GitHub Pages。

不需要每次重新建立 Pages。

---

# 二十四、如何添加新的 Header 别名

假设以后遇到一个 ERP，把 RefDes 写成：

```text
Component Locations
```

打开：

```text
bom-core.js
```

找到：

```javascript
designator: [
```

把：

```text
component locations
```

加入别名列表。

提交后即可自动更新在线工具。

---

# 二十五、如何增加一个新的检查规则

所有核心分析逻辑主要在：

```text
bom-core.js
```

UI 主要在：

```text
app.js
```

样式在：

```text
styles.css
```

后续建议可以加入的高级功能：

- Internal Part Number 映射
- AVL / AML 列检查
- Component lifecycle API（需要外部数据源）
- Octopart / SiliconExpert / distributor enrichment（需要授权/API）
- BOM cost comparison
- RoHS / REACH 字段
- Moisture Sensitivity Level
- Temperature grade
- Alternate source policy
- Customer-specific BOM templates
- KiCad / Altium BOM preset
- JLC / generic EMS export presets
- Pick-and-Place 文件交叉检查

这些功能中有一些需要第三方实时数据，不能只靠离线 BOM 推断。

---

# 二十六、运行项目自带测试

这一部分不是发布工具必须做的。

如果电脑安装了 Node.js，可以在项目目录执行：

```bash
node tests/core.test.js
```

成功时会看到测试通过信息。

如果你完全不懂 Node.js，可以忽略这一项，不影响 GitHub Pages 在线工具。

---

# 二十七、推荐 GitHub About 信息

仓库首页右侧找到：

```text
About
```

Description：

```text
Free browser-based PCB BOM checker for RefDes, quantities, MPNs, footprints, DNP rows, duplicates, and sourcing consistency.
```

Website：

发布成功以后填写 GitHub Pages 地址，例如：

```text
https://lokizhan0.github.io/pcbcool-pcb-bom-checker/
```

Topics 建议：

```text
pcb
bom
pcb-assembly
pcba
electronics
hardware
manufacturing
gerber
electronics-manufacturing
bom-checker
developer-tools
javascript
github-pages
open-source
```

不要为了 SEO 堆积不相关关键词。

---

# 二十八、推荐 Release

项目稳定运行后可以建立：

```text
v1.0.0
```

Release Title：

```text
PCB BOM Checker v1.0.0
```

Description：

```text
Initial public release of PCB BOM Checker.

The browser-based tool checks common PCB BOM data issues including reference-designator duplication, quantity mismatches, missing MPN/manufacturer data, DNP conflicts, footprint inconsistencies, supplier P/N mapping conflicts, duplicate BOM rows, and field coverage.

Supported input includes CSV, TSV, pasted tables, XLSX, XLS, XLSM, and XLSB.
```

---

# 二十九、PCBCool 在这里应该怎么出现

这个工具不需要大量宣传 PCBCool。

建议保留现在这种方式：

```text
Open-source utility maintained by PCBCool
```

README 最后有一小段 Maintainer 信息即可。

工具是否有价值应该首先取决于：

```text
它能不能真的帮助用户发现 BOM 问题
```

而不是 PCBCool 出现了多少次。

---

# 三十、建议后续维护方式

不需要每天修改。

更合理的是：

1. 真正遇到某种 BOM 格式无法识别时，增加 Header Alias。
2. 用户报告误报时，调整规则。
3. 出现明确的新需求时，再加入新的检查。
4. 每次较大功能升级发布新的 GitHub Release。
5. README 中持续记录工具能做什么、不能做什么。

这样这个仓库随着时间会变成一个真正有使用价值的 PCB 工程工具，而不是一次性发布页面。
