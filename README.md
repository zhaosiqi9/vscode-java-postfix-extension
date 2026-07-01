# Java Postfix Completion

VS Code 扩展，为 Java 语言提供 **postfix 补全**功能，支持**类型层级感知**——根据表达式的类型及其继承链精确匹配模板。

## 功能演示

```
输入: user.getName().null → 选择补全项
输出: if (user.getName() != null) { }

输入: name.sout → 选择补全项
输出: System.out.println(name);

输入: result.var → 选择补全项
输出: String result = result;

输入: list.empt → 补全列表自动过滤出 .empty 后缀的模板
输出: list.isEmpty()
```

扩展通过 VS Code 原生补全机制工作：在 Java 文件中输入 `.` 后自动弹出匹配的 postfix 模板列表，继续输入后缀字符可进一步过滤。

## 安装

### 从 VSIX 安装

```bash
code --install-extension java-postfix-completion-0.1.0.vsix
```

或在 VS Code 中：`Extensions` → `...` → `Install from VSIX...`

### 依赖

- **VS Code** >= 1.85.0
- **Extension Pack for Java** (redhat.java) — 提供类型解析能力

## 配置

### 全局配置 (`settings.json`)

```json
{
  "javaPostfixCompletion.templates": [
    {
      "name": "null check",
      "suffix": ".null",
      "description": "包裹 null 检查",
      "types": ["java.lang.Object"],
      "body": "if ($EXPR$ != null) { $END$ }"
    },
    {
      "name": "print",
      "suffix": ".sout",
      "description": "System.out.println",
      "body": "System.out.println($EXPR$);"
    },
    {
      "name": "string isEmpty",
      "suffix": ".isEmpty",
      "types": ["java.lang.CharSequence"],
      "body": "$EXPR$.isEmpty()"
    },
    {
      "name": "variable declaration",
      "suffix": ".var",
      "body": "$TYPE_SIMPLE$ $VAR$ = $EXPR$;$END$"
    },
    {
      "name": "optional ofNullable",
      "suffix": ".opt",
      "types": ["java.lang.Object"],
      "body": "java.util.Optional.ofNullable($EXPR$)"
    }
  ]
}
```

### 项目级配置

在项目根目录创建 `.vscode/java-postfix.json`，格式同上。项目配置会覆盖全局配置中同 `suffix` 的模板。

## 模板字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | 模板名称，用于日志 |
| `suffix` | 是 | 触发后缀，以 `.` 开头 |
| `body` | 是 | 模板正文，支持占位符 |
| `types` | 否 | 限定适用的 Java 类型（全限定名），为空匹配所有类型 |
| `description` | 否 | 模板说明 |

## 占位符

| 占位符 | 说明 | 示例 |
|--------|------|------|
| `$EXPR$` | 原始表达式 | `user.getName()` |
| `$TYPE$` | 表达式类型的全限定名 | `java.lang.String` |
| `$TYPE_SIMPLE$` | 类型的简单类名 | `String` |
| `$VAR$` | 表达式链的第一个标识符 | `user` |
| `$END$` | 补全后光标位置（转换为 VS Code SnippetString 的 `$0`） | — |

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

### 优先级规则

同一 `suffix` 有多个模板匹配时：
1. 类型更精确的（子类优先于父类）
2. 项目配置优先于全局配置
3. 配置文件中靠前的优先

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

扩展通过 `vscode.languages.registerCompletionItemProvider` 注册，触发字符为 `.`：

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

**模块列表**：

| 模块 | 职责 |
|------|------|
| `completionProvider.ts` | 实现 `vscode.CompletionItemProvider`，编排补全流程 |
| `extension.ts` | 注册 `CompletionItemProvider`，触发字符为 `.` |
| `patternDetector.ts` | 从行文本提取表达式和后缀，处理 `expr.` 和 `expr.suffix` 两种情况 |
| `exprValidator.ts` | 快速词法规则验证表达式有效性 |
| `configManager.ts` | 加载、合并、缓存全局和项目级模板配置 |
| `templateEngine.ts` | 后缀前缀匹配（`findBySuffix`）、精确匹配（`findMatchingTemplates`）、模板展开（`applyTemplate`） |
| `typeResolver.ts` | JDT LS 类型解析（保留用于未来类型感知过滤） |
| `types.ts` | 核心类型定义 |

## 错误处理

| 场景 | 行为 |
|------|------|
| 无效表达式 | 静默跳过，不干扰 |
| JDT LS 不可用 | 跳过类型过滤，所有模板可用 |
| 类型查询超时 | 降级为匹配所有类型 |
| 配置格式错误 | 警告 + 问题模板禁用 |

## 开发

```bash
npm install        # 安装依赖
npm run compile    # 编译 TypeScript
npm test           # 运行单元测试
npm run package    # 打包 .vsix
```

## 许可

MIT
