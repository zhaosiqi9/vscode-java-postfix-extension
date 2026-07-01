# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 概述

VS Code 扩展，为 Java 语言提供 **postfix 补全**功能，支持**类型层级感知**。用户输入 `表达式.后缀`（如 `user.getName().null`），VS Code 原生补全列表弹出匹配模板，选择后替换为模板展开结果（如 `if (user.getName() != null) { }`）。

扩展通过 `vscode.languages.registerCompletionItemProvider` 注册，触发字符为 `.`（点号）。用户输入 `.` 后即可看到匹配的 postfix 模板，继续输入后缀字符可进一步过滤。

## 命令

```bash
npm run compile       # 编译 TypeScript 到 out/
npm run watch         # 监视模式编译
npm test              # 运行单元测试（Mocha + Chai + Sinon，无需 VS Code）
npm run test:e2e      # 运行 E2E 测试（需要 VS Code，启动 Extension Dev Host）
npm run package       # 使用 vsce 打包 .vsix
```

## 架构

扩展通过 `CompletionProvider`（实现 `vscode.CompletionItemProvider`）响应 `.` 触发：

| 步骤 | 模块 | 职责 |
|------|------|------|
| 1. 模式检测 | `patternDetector.ts` | 从光标位置从右到左扫描行文本，查找 `expr.suffix` 模式，使用括号栈状态机提取表达式。也提供 `extractExpressionBeforeDot()` 处理刚输入 `.` 还未输入后缀的情况 |
| 2. 表达式验证 | `exprValidator.ts` | 快速词法规则（拒绝字面量、操作符等）——在昂贵的 LS 查询前的同步过滤 |
| 3. 模板加载 | `configManager.ts` | 从 `javaPostfixCompletion.templates` 设置 + `.vscode/java-postfix.json` 加载模板（项目配置按 suffix 覆盖全局）。通过 `vscode.workspace.fs.readFile` 读取项目配置。内存缓存；调用 `reload()` 使其失效 |
| 4. 后缀匹配 | `templateEngine.ts` | `findBySuffix()` 按前缀匹配过滤模板（如输入 `nu` 匹配 `.null`）。`findMatchingTemplates()` 做精确 suffix 匹配 + 类型层级过滤 |
| 5. 构建 CompletionItem | `completionProvider.ts` | 调用 `applyTemplate()` 展开占位符，构建 `vscode.CompletionItem`（使用 `SnippetString`，`$END$` 转换为 `$0`），设置 `filterText` 和 `range` |

**类型解析**（`typeResolver.ts`）目前未在补全流程中调用，保留用于未来类型感知过滤。当前补全流程仅按 suffix 前缀匹配，不做类型检查。

**核心类型**定义在 `src/types.ts`：`PostfixTemplate`、`ExpressionExtraction`、`TypeInfo`、`TemplateMatch`、`CompletionResult`。

## 测试

- **单元测试**使用 Mocha + Chai + Sinon，`vscode-mock.ts` 作为 VS Code API 桩（通过 tsconfig `paths`）。测试在 VS Code 外部运行。
- **E2E 测试**通过 `@vscode/test-electron` 在 VS Code Extension Dev Host 内运行。
- 测试文件与源文件对应：`test/patternDetector.test.ts`、`test/templateEngine.test.ts`、`test/completionProvider.test.ts`、`test/configManager.test.ts`、`test/exprValidator.test.ts`、`test/typeResolver.test.ts` 等。
- 扩展测试（`test/extension.test.ts`）验证 `registerCompletionItemProvider` 注册正确性。

## 扩展集成

- 依赖 **redhat.java**（JDT LS）进行类型解析（类型解析路径保留但当前补全流程未使用）。
- 通过 `vscode.languages.registerCompletionItemProvider({ language: 'java' }, provider, '.')` 注册。
- 触发字符为 `.`（点号），仅对 Java 文件生效。
- `filterText` 设置为 `expr + suffix`，使 VS Code 原生过滤在用户继续输入时生效。

## 模板占位符

| 占位符 | 替换内容 |
|--------|---------|
| `$EXPR$` | 原始表达式文本 |
| `$TYPE$` | 全限定类型名（如 `java.lang.String`） |
| `$TYPE_SIMPLE$` | 简单类名（如 `String`） |
| `$VAR$` | 表达式链的第一个标识符 |
| `$END$` | 最终光标位置（转换为 `$0` 以兼容 VS Code SnippetString） |
