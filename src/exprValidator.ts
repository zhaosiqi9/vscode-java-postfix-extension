import * as vscode from 'vscode';
import { ValidationResult } from './types';

export class ExprValidator {
  /**
   * Quick lexical check to filter out obviously invalid expressions.
   * Runs synchronously before the expensive JDT LS query.
   */
  validateByLexicalRules(expr: string): boolean {
    if (!expr || expr.trim().length === 0) {
      return false;
    }

    const trimmed = expr.trim();

    // Reject expressions that start with a closing paren or standalone operator
    if (/^[)}\]]/.test(trimmed)) {
      return false;
    }

    // Reject standalone numeric literals (primitives are not objects for postfix)
    if (/^\d+(\.\d+)?[fFdDlL]?$/.test(trimmed)) {
      return false;
    }

    // Reject boolean literals
    if (trimmed === 'true' || trimmed === 'false') {
      return false;
    }

    // Reject null literal
    if (trimmed === 'null') {
      return false;
    }

    // Must look like a Java expression: starts with identifier, @, (, ", or 'new'
    if (!/^[a-zA-Z_$@("'\[]/.test(trimmed)) {
      return false;
    }

    return true;
  }

  /**
   * Validate the expression using JDT LS hover provider.
   * If the hover returns type information, the expression is valid.
   */
  async validateWithJdtLs(
    document: vscode.TextDocument,
    expr: string,
    line: number,
    exprEndCol: number
  ): Promise<ValidationResult> {
    try {
      const position = new vscode.Position(line, exprEndCol - 1);
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        'vscode.executeHoverProvider',
        document.uri,
        position
      );

      if (hovers && hovers.length > 0) {
        return { isValid: true, expr };
      }

      return { isValid: false, expr };
    } catch {
      return { isValid: false, expr };
    }
  }
}
