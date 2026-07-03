import * as vscode from 'vscode';

/**
 * 截断文本用于预览显示，超出 maxLen 时末尾加 "..."。
 */
export function truncatePreview(text: string, maxLen: number = 40): string {
  if (text.length <= maxLen) {
    return text;
  }
  return text.substring(0, maxLen - 3) + '...';
}

/**
 * 计算需要替换的范围：从表达式起始位置到光标位置（含点号和部分后缀）。
 */
export function computeReplaceRange(
  position: vscode.Position,
  expr: string,
  partialSuffix: string
): vscode.Range {
  const suffixLength = partialSuffix.length > 0 ? partialSuffix.length + 1 : 1;
  const exprStartCol = position.character - expr.length - suffixLength;
  return new vscode.Range(position.line, exprStartCol, position.line, position.character);
}
