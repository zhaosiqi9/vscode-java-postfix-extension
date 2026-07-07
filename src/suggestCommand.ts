import * as vscode from 'vscode';
import { ConfigManager } from './configManager';
import { PatternDetector } from './patternDetector';
import { ExprValidator } from './exprValidator';
import { TemplateEngine } from './templateEngine';
import { PostfixTemplate } from './types';
import { TypeInfo } from './types';
import { TypeResolver } from './typeResolver';
import { truncatePreview, computeReplaceRange } from './utils';

export class SuggestCommand {
  private configManager: ConfigManager;
  private patternDetector: PatternDetector;
  private exprValidator: ExprValidator;
  private templateEngine: TemplateEngine;
  private typeResolver: TypeResolver;

  constructor() {
    this.configManager = new ConfigManager();
    this.patternDetector = new PatternDetector();
    this.exprValidator = new ExprValidator();
    this.templateEngine = new TemplateEngine();
    this.typeResolver = new TypeResolver();
  }

  async triggerSuggest(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('Java Postfix: 没有活动的编辑器');
      return;
    }

    const document = editor.document;
    if (document.languageId !== 'java') {
      vscode.window.showInformationMessage('Java Postfix: 仅支持 Java 文件');
      return;
    }

    const position = editor.selection.active;
    const lineText = document.lineAt(position.line).text;

    // 步骤 1: 模式检测
    const extraction = this.patternDetector.extractExpression(lineText, position.character);

    let expr: string;
    let partialSuffix: string;

    if (extraction.valid) {
      expr = extraction.expr;
      partialSuffix = extraction.suffix;
    } else {
      // 尝试检测 "expr." 模式（刚输入点号）
      const dotResult = this.patternDetector.detectDotOnly(lineText, position.character);
      if (!dotResult) {
        vscode.window.showWarningMessage('Java Postfix: 未检测到有效的表达式');
        return;
      }
      expr = dotResult.expr;
      partialSuffix = '';
    }

    // 步骤 2: 词法验证
    if (!this.exprValidator.validateByLexicalRules(expr)) {
      vscode.window.showWarningMessage('Java Postfix: 表达式无效');
      return;
    }

    // 步骤 3: 加载模板
    const templates = await this.configManager.getAllTemplates();
    if (templates.length === 0) {
      vscode.window.showWarningMessage('Java Postfix: 没有可用的 postfix 模板');
      return;
    }

    // 步骤 4: 匹配模板
    const completionMode = vscode.workspace
      .getConfiguration('javaPostfixCompletion')
      .get<string>('completionMode', 'inline');

    let matchingTemplates: PostfixTemplate[];
    let typeInfo: TypeInfo | null = null;

    if (completionMode === 'manualWithType') {
      // 类型解析
      const resolution = await this.typeResolver.resolveType(
        document, expr, position.line, position.character
      );
      typeInfo = resolution.typeInfo;
      matchingTemplates = this.templateEngine.findBySuffix(partialSuffix, templates, typeInfo);
    } else {
      matchingTemplates = this.templateEngine.findBySuffix(partialSuffix, templates);
    }

    if (matchingTemplates.length === 0) {
      vscode.window.showWarningMessage('Java Postfix: 没有匹配的 postfix 模板');
      return;
    }

    // 步骤 5: 构建 QuickPick 选项
    const items: (vscode.QuickPickItem & { template: PostfixTemplate })[] = matchingTemplates.map((t) => ({
      label: t.suffix,
      description: truncatePreview(
        this.templateEngine.applyTemplate(t, expr, null).insertText
      ),
      detail: t.description || t.name,
      iconPath: new vscode.ThemeIcon('symbol-snippet'),
      template: t,
    }));

    // 步骤 6: 用 createQuickPick 弹出选择列表
    const qp = vscode.window.createQuickPick();
    qp.items = items;
    qp.placeholder = '选择 postfix 模板';
    qp.matchOnDescription = true;
    qp.matchOnDetail = true;

    // 自定义过滤：按后缀前缀匹配（模拟 CompletionItem.filterText 行为）
    qp.onDidChangeValue((value) => {
      if (!value) {
        qp.items = items;
        return;
      }
      qp.items = items.filter((item) =>
        item.label.startsWith(value)
      );
    });

    const selected = await new Promise<(typeof items)[number] | undefined>((resolve) => {
      qp.onDidAccept(() => {
        const picked = qp.selectedItems[0] as (typeof items)[number] | undefined;
        qp.hide();
        resolve(picked);
      });

      qp.onDidHide(() => {
        qp.dispose();
        resolve(undefined);
      });

      qp.show();
    });

    if (!selected) {
      return; // 用户取消
    }

    // 步骤 7: 展开模板并插入
    const result = this.templateEngine.applyTemplate(selected.template, expr, typeInfo);
    const range = computeReplaceRange(position, expr, partialSuffix);
    const insertPos = new vscode.Position(position.line, position.character - expr.length - partialSuffix.length - 1);

    await editor.edit((editBuilder) => {
      editBuilder.replace(range, '');
    });

    await editor.insertSnippet(
      new vscode.SnippetString(result.insertText),
      insertPos
    );
  }
}
