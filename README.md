# Java Postfix Completion

VS Code 扩展，为 Java 语言提供 **postfix 补全**功能，支持**类型层级感知**。

输入 `表达式.后缀`，补全列表自动弹出匹配模板，选中后替换为模板展开结果。

## 功能

- **点号触发补全**：输入 `expr.` 后，VS Code 原生补全列表显示匹配的 postfix 模板
- **快捷键手动触发**：按 `Alt+S` 弹出 QuickPick 选择模板
- **类型层级感知**：`manualWithType` 模式下自动解析表达式类型，仅显示兼容模板，并将 `$TYPE$` 替换为真实类型名
- **双层配置**：全局（`settings.json`）+ 项目级（`.vscode/java-postfix.json`），项目模板优先级更高
- **自定义模板**：支持 `$EXPR$`、`$TYPE$`、`$TYPE_SIMPLE$`、`$VAR$`、`$END$` 占位符

## 安装

### 前置条件

- VS Code `^1.85.0`
- [Language Support for Java (redhat.java)](https://marketplace.visualstudio.com/items?itemName=redhat.java) 扩展（`extensionDependencies` 中声明，会自动安装）

### 安装方式

通过 VS Code 市场安装，或从 `.vsix` 文件侧载：

```bash
code --install-extension java-postfix-completion-0.0.3-fix.vsix
```

## 使用方式

### 补全模式

扩展提供三种补全模式，通过 `javaPostfixCompletion.completionMode` 配置：

| 模式 | 触发方式 | 类型检查 | 说明 |
|------|---------|---------|------|
| `inline`（默认） | 输入 `.` 触发系统补全列表 | ❌ 无 | 所有模板按后缀前缀匹配，始终显示 |
| `manual` | `Alt+S` 弹出 QuickPick | ❌ 无 | 不在系统补全列表中显示，仅手动触发 |
| `manualWithType` | `Alt+S` 弹出 QuickPick | ✅ 有 | 不在系统补全列表中显示，自动解析表达式类型，过滤不兼容模板，`$TYPE$` 替换为真实类型名 |

### 示例

```java
// 输入 user.getName().nu → 补全列表显示 .null 模板 → 选择后展开：
if (user.getName() != null) {  }

// 输入 name.sout → 选择 .sout → 展开：
System.out.println(name);

// 输入 result.var → 选择 .var → 展开（manualWithType 模式下 $TYPE_SIMPLE$ 为真实类型）：
String result = result;
```

## 配置参考

### `javaPostfixCompletion.templates`

- **类型**：`array`
- **默认值**：`[]`
- **说明**：自定义 postfix 模板数组

每个模板的结构：

```json
{
  "name": "模板名称（必填）",
  "suffix": ".触发后缀（必填，以 . 开头）",
  "body": "模板体，可含占位符（必填）",
  "types": ["java.lang.SomeType"],
  "description": "可选描述"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | 模板名称，用于日志和错误提示 |
| `suffix` | 是 | 触发后缀，必须以 `.` 开头（如 `.null`、`.sout`）。若未加 `.` 前缀，加载时自动补全 |
| `body` | 是 | 模板体，支持占位符。为空则跳过 |
| `types` | 否 | 适用的全限定类型名数组。`"java.lang.CharSequence"` 可匹配 `String`、`StringBuilder` 等子类型。空数组或未指定表示匹配所有类型 |
| `description` | 否 | 简短描述，显示在补全详情中 |

### `javaPostfixCompletion.completionMode`

- **类型**：`string`
- **可选值**：`"inline"` | `"manual"` | `"manualWithType"`
- **默认值**：`"inline"`
- **说明**：补全触发模式（详见上方表格）

## 占位符

模板 `body` 中支持以下占位符：

| 占位符 | 替换内容 | 示例 |
|--------|---------|------|
| `$EXPR$` | 原始表达式文本 | `user.getName()` |
| `$TYPE$` | 全限定类型名（`manualWithType` 模式）或 `Object`（其他模式） | `java.lang.String` |
| `$TYPE_SIMPLE$` | 简单类名（`manualWithType` 模式）或 `Object`（其他模式） | `String` |
| `$VAR$` | 表达式链的第一个标识符 | `user` |
| `$END$` | 补全后光标最终位置（内部转换为 `$0`） | — |

> **注意**：`$TYPE$` 和 `$TYPE_SIMPLE$` 仅在 `manualWithType` 模式下会替换为真实类型名。在 `inline` 和 `manual` 模式下，由于不执行类型解析，均替换为 `Object`。

## 类型匹配

`types` 字段利用 Java 的类型层级进行匹配：

```json
// 匹配 String、StringBuilder、StringBuffer 等所有 CharSequence 子类
{ "types": ["java.lang.CharSequence"] }

// 匹配 List、Set、Queue 等所有 Collection 子类
{ "types": ["java.util.Collection"] }

// 不填或空数组 → 匹配所有类型
{ "types": [] }
```

## 项目级配置

可在项目根目录下创建 `.vscode/java-postfix.json` 文件，格式与全局 `templates` 数组相同：

```json
[
  {
    "name": "project-specific null check",
    "suffix": ".null",
    "body": "if ($EXPR$ != null) { $END$ }",
    "description": "项目自定义 null 检查"
  }
]
```

**合并规则**：同名 `suffix` 的项目模板**覆盖**全局模板。不同 `suffix` 的模板合并使用。

## 命令与快捷键

| 命令 ID | 标题 | 默认快捷键 |
|---------|------|-----------|
| `java-postfix.triggerSuggest` | Java Postfix: Trigger Suggestion | `Alt+S`（仅 Java 文件） |

## 兼容模式降级

`manualWithType` 模式下，类型解析可能在以下情况失败：

- JDT LS 未就绪或超时
- 表达式无法解析类型

此时扩展会**静默降级**为 `manual` 模式行为：不做类型过滤，`$TYPE$` / `$TYPE_SIMPLE$` 替换为 `Object`。

## 内置模板示例

建议添加以下常用模板：

```json
[
  { "name": "null check", "suffix": ".null", "types": ["java.lang.Object"], "body": "if ($EXPR$ != null) { $END$ }" },
  { "name": "not null", "suffix": ".nn", "types": ["java.lang.Object"], "body": "java.util.Objects.requireNonNull($EXPR$)" },
  { "name": "sout", "suffix": ".sout", "body": "System.out.println($EXPR$);" },
  { "name": "var", "suffix": ".var", "body": "$TYPE_SIMPLE$ $VAR$ = $EXPR$;$END$" },
  { "name": "return", "suffix": ".return", "body": "return $EXPR$;" },
  { "name": "optional", "suffix": ".opt", "types": ["java.lang.Object"], "body": "java.util.Optional.ofNullable($EXPR$)" },
  { "name": "cast", "suffix": ".cast", "body": "(($TYPE_SIMPLE$) $EXPR$)" },
  { "name": "assert not null", "suffix": ".assert", "types": ["java.lang.Object"], "body": "assert $EXPR$ != null : \"$EXPR$ should not be null\";" },
  { "name": "string isBlank", "suffix": ".blank", "types": ["java.lang.CharSequence"], "body": "$EXPR$.isBlank()" },
  { "name": "string isEmpty", "suffix": ".empty", "types": ["java.lang.CharSequence"], "body": "$EXPR$.isEmpty()" },
  { "name": "list isEmpty", "suffix": ".empty", "types": ["java.util.Collection"], "body": "$EXPR$.isEmpty()" },
  { "name": "stream", "suffix": ".stream", "types": ["java.util.Collection"], "body": "$EXPR$.stream()" },
  { "name": "orElse", "suffix": ".orElse", "types": ["java.util.Optional"], "body": "$EXPR$.orElse(null)" },
  { "name": "orElseThrow", "suffix": ".throw", "types": ["java.util.Optional"], "body": "$EXPR$.orElseThrow()" }
]
```

## 架构

扩展通过 `vscode.languages.registerCompletionItemProvider` 注册，触发字符为 `.`。

### 内联模式流程

```
用户输入 "expr.suffix"
       │
  ┌────▼──────────┐
  │ 1. 模式检测     │ 检测 expr.suffix 模式，提取表达式边界
  └────┬──────────┘
       │
  ┌────▼──────────┐
  │ 2. 表达式验证   │ 词法规则快速过滤无效表达式
  └────┬──────────┘
       │
  ┌────▼──────────┐
  │ 3. 模板加载     │ 从全局配置 + 项目配置加载模板（内存缓存）
  └────┬──────────┘
       │
  ┌────▼──────────┐
  │ 4. 后缀匹配     │ findBySuffix() 按前缀过滤模板
  └────┬──────────┘
       │
  ┌────▼──────────┐
  │ 5. 构建补全项   │ 展开占位符 → SnippetString → CompletionItem
  └───────────────┘
```

### 手动模式流程（`Alt+S`）

```
用户按 Alt+S
       │
  ┌────▼──────────┐
  │ 1. 模式检测     │ 同内联模式
  └────┬──────────┘
       │
  ┌────▼──────────┐
  │ 2. 表达式验证   │ 同内联模式
  └────┬──────────┘
       │
  ┌────▼──────────┐
  │ 3. 模板加载     │ 同内联模式
  └────┬──────────┘
       │
  ┌────▼──────────┐
  │ 4. 类型解析     │ manualWithType 专属：JDT LS hover 获取表达式类型
  └────┬──────────┘
       │
  ┌────▼──────────┐
  │ 5. 模板匹配     │ 按后缀前缀匹配 + 类型层级过滤
  └────┬──────────┘
       │
  ┌────▼──────────┐
  │ 6. QuickPick   │ 弹出选择列表，支持输入过滤
  └────┬──────────┘
       │
  ┌────▼──────────┐
  │ 7. 展开插入     │ 替换占位符，插入编辑器
  └───────────────┘
```

### 模块列表

| 模块 | 职责 |
|------|------|
| `extension.ts` | 注册 `CompletionItemProvider`（`.` 触发）和 `triggerSuggest` 命令（`Alt+S`） |
| `completionProvider.ts` | 实现 `vscode.CompletionItemProvider`，编排内联补全流程 |
| `suggestCommand.ts` | 实现 `Alt+S` 手动触发流程，含 QuickPick 和类型解析 |
| `patternDetector.ts` | 从行文本提取表达式和后缀，处理 `expr.` 和 `expr.suffix` 两种情况 |
| `exprValidator.ts` | 快速词法规则验证表达式有效性 |
| `configManager.ts` | 加载、合并、缓存全局和项目级模板配置 |
| `templateEngine.ts` | 后缀前缀匹配（`findBySuffix`）、精确匹配（`findMatchingTemplates`）、模板展开（`applyTemplate`） |
| `typeResolver.ts` | JDT LS hover 类型解析，含 60 秒内存缓存 |
| `types.ts` | 核心类型定义 |
| `utils.ts` | 辅助函数：`truncatePreview`、`computeReplaceRange` |

## 错误处理

| 场景 | 行为 |
|------|------|
| 无效表达式 | 静默跳过，不干扰正常补全 |
| JDT LS 不可用 | 降级为匹配所有类型，`$TYPE$` 替换为 `Object` |
| 类型查询超时 | 降级为匹配所有类型 |
| 配置格式错误 | 跳过问题模板，输出警告日志 |

## 开发

```bash
npm install        # 安装依赖
npm run compile    # 编译 TypeScript
npm run watch      # 监视模式编译
npm test           # 运行单元测试（Mocha + Chai + Sinon，无需 VS Code）
npm run test:e2e   # 运行 E2E 测试（需要 VS Code）
npm run package    # 打包 .vsix
```

## 许可

MIT