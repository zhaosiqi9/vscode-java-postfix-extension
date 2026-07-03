import * as vscode from 'vscode';
import { CompletionProvider } from './completionProvider';
import { SuggestCommand } from './suggestCommand';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new CompletionProvider();

  const completionDisposable = vscode.languages.registerCompletionItemProvider(
    { language: 'java' },
    provider,
    '.'
  );

  const suggestCommand = new SuggestCommand();
  const commandDisposable = vscode.commands.registerCommand(
    'java-postfix.triggerSuggest',
    () => suggestCommand.triggerSuggest()
  );

  context.subscriptions.push(completionDisposable, commandDisposable);

  console.log('[Java Postfix] Extension activated');
}

export function deactivate(): void {
  console.log('[Java Postfix] Extension deactivated');
}
