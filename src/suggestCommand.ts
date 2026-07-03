import * as vscode from 'vscode';
import { ConfigManager } from './configManager';
import { PatternDetector } from './patternDetector';
import { ExprValidator } from './exprValidator';
import { TemplateEngine } from './templateEngine';
import { PostfixTemplate } from './types';

export class SuggestCommand {
  private configManager: ConfigManager;
  private patternDetector: PatternDetector;
  private exprValidator: ExprValidator;
  private templateEngine: TemplateEngine;

  constructor() {
    this.configManager = new ConfigManager();
    this.patternDetector = new PatternDetector();
    this.exprValidator = new ExprValidator();
    this.templateEngine = new TemplateEngine();
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
      const dotResult = this.detectDotOnly(lineText, position.character);
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
    const matchingTemplates = this.templateEngine.findBySuffix(partialSuffix, templates);
    if (matchingTemplates.length === 0) {
      vscode.window.showWarningMessage('Java Postfix: 没有匹配的 postfix 模板');
      return;
    }

    // 步骤 5: 构建 QuickPick 选项
    const items: (vscode.QuickPickItem & { template: PostfixTemplate })[] = matchingTemplates.map((t) => ({
      label: t.suffix,
      description: t.description || t.name,
      detail: this.truncatePreview(
        this.templateEngine.applyTemplate(t, expr, null).insertText
      ),
      template: t,
    }));

    // 步骤 6: 弹出 QuickPick
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '选择 postfix 模板',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selected) {
      return; // 用户取消
    }

    // 步骤 7: 展开模板并插入
    const result = this.templateEngine.applyTemplate(selected.template, expr, null);

    // 计算替换范围
    const suffixLength = partialSuffix.length > 0 ? partialSuffix.length + 1 : 1;
    const exprStartCol = position.character - expr.length - suffixLength;
    const range = new vscode.Range(
      position.line,
      exprStartCol,
      position.line,
      position.character
    );

    await editor.edit((editBuilder) => {
      editBuilder.replace(range, '');
    });

    await editor.insertSnippet(
      new vscode.SnippetString(result.insertText),
      new vscode.Position(position.line, exprStartCol)
    );
  }

  /**
   * 检测 "expr." 模式（光标紧跟在点号后，尚未输入后缀字符）
   */
  private detectDotOnly(
    lineText: string,
    cursorCol: number
  ): { expr: string } | null {
    const beforeCursor = lineText.substring(0, cursorCol);
    if (!beforeCursor.endsWith('.')) {
      return null;
    }

    const leftPart = beforeCursor.substring(0, beforeCursor.length - 1);
    if (leftPart.length === 0 || leftPart.endsWith(' ') || leftPart.endsWith('\t')) {
      return null;
    }

    const boundary = this.patternDetector.extractExpressionBeforeDot(leftPart);
    if (!boundary.isValid || boundary.expr.length === 0) {
      return null;
    }

    return { expr: boundary.expr };
  }

  private truncatePreview(text: string, maxLen: number = 40): string {
    if (text.length <= maxLen) {
      return text;
    }
    return text.substring(0, maxLen - 3) + '...';
  }
}
