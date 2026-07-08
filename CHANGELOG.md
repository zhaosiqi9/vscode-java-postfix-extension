# Changelog

## [0.0.3-fix] — 2026-07-07

### 新增
- `completionMode` 新增 `manualWithType` 枚举值：通过 `Alt+S` 触发，自动解析表达式类型，过滤不兼容模板，`$TYPE$` / `$TYPE_SIMPLE$` 替换为真实类型名
- `SuggestCommand` 在 `manualWithType` 模式下集成 `TypeResolver` 进行类型解析
- `CompletionProvider` 在 `manual` 和 `manualWithType` 模式下返回 `undefined`，不在系统补全列表中显示
- `findBySuffix` 新增可选 `typeInfo` 参数，支持按类型层级过滤模板

### 修复
- 模板数量警告日志中多余的空格

## [0.0.3] — 2026-07-03

### 新增
- `completionMode` 配置项：支持 `inline`（点号触发，默认）和 `manual`（仅快捷键）两种模式
- `SuggestCommand` 类：通过 `Alt+S` 快捷键触发 QuickPick 补全选择
- 命令 `java-postfix.triggerSuggest` 及快捷键绑定 `Alt+S`（仅 Java 文件生效）
- `detectDotOnly` 方法：处理用户刚输入 `.` 但尚未输入后缀字符的边界情况

### 变更
- 消除 `detectDotOnly`、`truncatePreview`、`computeReplaceRange` 在 `CompletionProvider` 和 `SuggestCommand` 之间的重复代码，提取到 `utils.ts`

## [0.0.2] — 2026-07-01

### 变更
- 架构迁移：从 `InlineCompletionItemProvider` 改为 `CompletionItemProvider`，模板直接出现在 VS Code 系统补全列表中
- 触发方式从 `Ctrl+Shift+Space` 改为点号 `.` 触发

### 新增
- `PatternDetector` 表达式提取与括号栈状态机
- `ExprValidator` 快速词法验证（在 LS 查询前过滤无效表达式）
- `ConfigManager` 双层配置加载（全局 + 项目级）
- `TemplateEngine` 后缀匹配与模板展开

## [0.0.1] — 2026-06-30

### 新增
- 初始版本：基础 postfix 补全功能
- 基于 `Ctrl+Shift+Space` 的命令触发方式
- 自定义模板占位符支持（`$EXPR$`、`$TYPE$`、`$VAR$`、`$END$`）