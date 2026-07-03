import * as vscode from 'vscode';
import { ConfigManager } from './configManager';
import { PatternDetector } from './patternDetector';
import { ExprValidator } from './exprValidator';
import { TemplateEngine } from './templateEngine';
import { PostfixTemplate, CompletionResult } from './types';
import { truncatePreview, computeReplaceRange } from './utils';

export class CompletionProvider implements vscode.CompletionItemProvider {

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

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | undefined> {
    if (document.languageId !== 'java') {
      return undefined;
    }

    // 检查补全模式：manual 模式下不在系统补全列表中显示
    const config = vscode.workspace.getConfiguration('javaPostfixCompletion');
    const completionMode = config.get<string>('completionMode', 'inline');
    if (completionMode === 'manual') {
      return undefined;
    }

    const lineText = document.lineAt(position.line).text;

    // Step 1: Pattern detection
    const extraction = this.patternDetector.extractExpression(lineText, position.character);

    // Handle case: user just typed "." (no suffix yet)
    // Check if cursor is right after a dot
    let expr: string;
    let partialSuffix: string;

    if (extraction.valid) {
      expr = extraction.expr;
      partialSuffix = extraction.suffix;
    } else {
      // Try to detect "expr." pattern (dot at cursor, no suffix yet)
      const dotResult = this.patternDetector.detectDotOnly(lineText, position.character);
      if (!dotResult) {
        return undefined;
      }
      expr = dotResult.expr;
      partialSuffix = '';
    }

    console.log('[Java Postfix] 步骤1-2: expr="%s", partialSuffix="%s"', expr, partialSuffix);

    // Step 2: Quick lexical validation
    if (!this.exprValidator.validateByLexicalRules(expr)) {
      console.log('[Java Postfix] 步骤2 失败: 词法验证未通过 expr="%s"', expr);
      return undefined;
    }

    // Step 3: Load templates (async, cached after first load)
    const templates = await this.configManager.getAllTemplates();
    console.log('[Java Postfix] 步骤3: 加载了 %d 个模板', templates.length);
    if (templates.length === 0) {
      return undefined;
    }

    // Step 4: Find matching templates by suffix prefix
    const matchingTemplates = this.templateEngine.findBySuffix(partialSuffix, templates);
    console.log('[Java Postfix] 步骤4: partialSuffix="%s" 匹配到 %d 个模板', partialSuffix, matchingTemplates.length);
    matchingTemplates.forEach(t => console.log('[Java Postfix]   - suffix="%s" name="%s"', t.suffix, t.name));
    if (matchingTemplates.length === 0) {
      return undefined;
    }

    // Step 5: Build CompletionItems
    const items = this.buildCompletionItems(matchingTemplates, expr, position, partialSuffix);
    console.log('[Java Postfix] 步骤5: 构建了 %d 个 CompletionItem', items.length);
    items.forEach(i => console.log('[Java Postfix]   - label="%s" filterText="%s" insertText="%s"',
      i.label, i.filterText, i.insertText instanceof vscode.SnippetString ? (i.insertText as vscode.SnippetString).value : i.insertText));
    return items;
  }

  /**
   * Build VS Code CompletionItems from matching templates.
   */
  private buildCompletionItems(
    templates: PostfixTemplate[],
    expr: string,
    position: vscode.Position,
    partialSuffix: string
  ): vscode.CompletionItem[] {
    const range = computeReplaceRange(position, expr, partialSuffix);

    return templates.map((template) => {
      const result: CompletionResult = this.templateEngine.applyTemplate(template, expr, null);

      const item = new vscode.CompletionItem(
        template.suffix,
        vscode.CompletionItemKind.Snippet
      );

      item.detail = truncatePreview(result.insertText);
      item.filterText = expr + template.suffix;
      item.insertText = new vscode.SnippetString(result.insertText);
      item.range = range;
      item.documentation = template.description || `Java Postfix: ${template.name}`;

      return item;
    });
  }
}
