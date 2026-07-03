import { ExpressionExtraction } from './types';

export class PatternDetector {
  /**
   * Extract the expression and suffix from a line of text at the given cursor column.
   * Uses a parenthesis-stack state machine scanning right-to-left from the cursor.
   */
  extractExpression(lineText: string, cursorCol: number): ExpressionExtraction {
    const beforeCursor = lineText.substring(0, cursorCol);

    // Find the last ".suffix" pattern
    const suffixMatch = beforeCursor.match(/\.(\w+)$/);
    if (!suffixMatch) {
      return { expr: '', suffix: '', valid: false };
    }

    const suffix = suffixMatch[1];
    const dotIndex = beforeCursor.length - suffixMatch[0].length;
    const leftPart = beforeCursor.substring(0, dotIndex);

    if (leftPart.length === 0) {
      return { expr: '', suffix, valid: false };
    }

    // Dot must directly follow the expression (no whitespace between expr and dot)
    if (leftPart.endsWith(' ') || leftPart.endsWith('\t')) {
      return { expr: '', suffix, valid: false };
    }

    const { expr, isValid } = this.scanExpressionBoundary(leftPart);
    return { expr, suffix, valid: isValid && expr.length > 0 };
  }

  /**
   * Scan leftwards from the end of text to find the expression boundary.
   * Used when the cursor is immediately after a dot (no suffix yet).
   * Returns the expression text and whether the scan found a valid boundary.
   */
  extractExpressionBeforeDot(text: string): { expr: string; isValid: boolean } {
    return this.scanExpressionBoundary(text);
  }

  /**
   * 检测 "expr." 模式（光标紧跟在点号后，尚未输入后缀字符）。
   * 返回表达式的文本，或 null 表示未检测到。
   */
  detectDotOnly(
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

    const boundary = this.extractExpressionBeforeDot(leftPart);
    if (!boundary.isValid || boundary.expr.length === 0) {
      return null;
    }

    return { expr: boundary.expr };
  }

  /**
   * Scan leftwards from the end of leftPart to find the expression boundary.
   * Uses a stack to track parentheses matching.
   */
  private scanExpressionBoundary(text: string): { expr: string; isValid: boolean } {
    const parenStack: string[] = [];
    let boundary = -1;

    for (let i = text.length - 1; i >= 0; i--) {
      const ch = text[i];

      if (ch === ')') {
        parenStack.push(')');
      } else if (ch === '(') {
        if (parenStack.length > 0 && parenStack[parenStack.length - 1] === ')') {
          parenStack.pop();
        } else {
          // Unmatched '(' — push it so we can detect the imbalance
          parenStack.push('(');
        }
      } else if (ch === ']') {
        parenStack.push(']');
      } else if (ch === '[') {
        if (parenStack.length > 0 && parenStack[parenStack.length - 1] === ']') {
          parenStack.pop();
        } else {
          // Unmatched '[' — push it so we can detect the imbalance
          parenStack.push('[');
        }
      } else if (parenStack.length === 0) {
        // Only check boundaries when the parenthesis stack is balanced
        if (ch === ';' || ch === '{' || ch === '}') {
          boundary = i + 1;
          break;
        } else if (ch === '=') {
          boundary = i + 1;
          break;
        }
      }
    }

    // If parenStack is not empty, parentheses are unmatched
    if (parenStack.length !== 0) {
      return { expr: '', isValid: false };
    }

    const expr = boundary >= 0 ? text.substring(boundary) : text;
    return { expr: expr.trim(), isValid: true };
  }
}
