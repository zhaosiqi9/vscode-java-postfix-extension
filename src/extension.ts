import * as vscode from 'vscode';
import { CompletionProvider } from './completionProvider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new CompletionProvider();

  const disposable = vscode.languages.registerCompletionItemProvider(
    { language: 'java' },
    provider,
    '.'
  );

  context.subscriptions.push(disposable);

  console.log('[Java Postfix] Extension activated');
}

export function deactivate(): void {
  console.log('[Java Postfix] Extension deactivated');
}
