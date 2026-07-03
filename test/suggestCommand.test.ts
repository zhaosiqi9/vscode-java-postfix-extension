import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { SuggestCommand } from '../src/suggestCommand';

describe('SuggestCommand', () => {
  let suggestCommand: SuggestCommand;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    suggestCommand = new SuggestCommand();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('triggerSuggest', () => {
    it('should show info message when no active text editor', async () => {
      sandbox.stub(vscode.window, 'activeTextEditor').value(undefined);
      const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

      await suggestCommand.triggerSuggest();

      expect(showInfoStub.calledOnce).to.be.true;
    });

    it('should show info message when not a Java file', async () => {
      sandbox.stub(vscode.window, 'activeTextEditor').value({
        document: {
          languageId: 'typescript',
          lineAt: sandbox.stub().returns({ text: 'myVar.null' }),
        },
        selection: { active: new vscode.Position(0, 'myVar.null'.length) },
      });
      const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

      await suggestCommand.triggerSuggest();

      expect(showInfoStub.calledOnce).to.be.true;
    });

    it('should show warning when no expression detected', async () => {
      sandbox.stub(vscode.window, 'activeTextEditor').value({
        document: {
          languageId: 'java',
          lineAt: sandbox.stub().returns({ text: '   ' }),
        },
        selection: { active: new vscode.Position(0, 3) },
      });
      const showWarnStub = sandbox.stub(vscode.window, 'showWarningMessage').resolves(undefined);

      await suggestCommand.triggerSuggest();

      expect(showWarnStub.calledOnce).to.be.true;
    });

    it('should show warning when no templates match', async () => {
      sandbox.stub(vscode.window, 'activeTextEditor').value({
        document: {
          languageId: 'java',
          lineAt: sandbox.stub().returns({ text: 'user.xyz' }),
        },
        selection: { active: new vscode.Position(0, 'user.xyz'.length) },
      });

      // Stub config to return templates
      sandbox.stub(vscode.workspace, 'getConfiguration').returns({
        get: sandbox.stub().returns([
          { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }' },
        ]),
      } as any);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const showWarnStub = sandbox.stub(vscode.window, 'showWarningMessage').resolves(undefined);

      await suggestCommand.triggerSuggest();

      expect(showWarnStub.calledOnce).to.be.true;
    });

    it('should show QuickPick with matching templates when expression and suffix detected', async () => {
      sandbox.stub(vscode.window, 'activeTextEditor').value({
        document: {
          languageId: 'java',
          lineAt: sandbox.stub().returns({ text: 'user.nu' }),
        },
        selection: { active: new vscode.Position(0, 'user.nu'.length) },
      });

      const templates = [
        { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }', description: 'Null check' },
        { name: 'nullable', suffix: '.nullable', body: '$EXPR$?', description: 'Nullable' },
        { name: 'print', suffix: '.sout', body: 'System.out.println($EXPR$);' },
      ];
      sandbox.stub(vscode.workspace, 'getConfiguration').returns({
        get: sandbox.stub().returns(templates),
      } as any);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const quickPickItems: vscode.QuickPickItem[] = [];
      const showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick').callsFake((items: any) => {
        quickPickItems.push(...items);
        return Promise.resolve(undefined);
      });

      await suggestCommand.triggerSuggest();

      expect(showQuickPickStub.calledOnce).to.be.true;
      expect(quickPickItems).to.have.lengthOf(2); // .null and .nullable
      expect(quickPickItems[0].label).to.equal('.null');
      expect(quickPickItems[1].label).to.equal('.nullable');
    });

    it('should apply template and insert snippet when user selects an item', async () => {
      const editStub = sandbox.stub().resolves(true);
      sandbox.stub(vscode.window, 'activeTextEditor').value({
        document: {
          languageId: 'java',
          lineAt: sandbox.stub().returns({ text: 'user.null' }),
        },
        selection: { active: new vscode.Position(0, 'user.null'.length) },
        insertSnippet: editStub,
        edit: sandbox.stub().resolves(true),
      });

      const templates = [
        { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }', description: 'Null check' },
      ];
      sandbox.stub(vscode.workspace, 'getConfiguration').returns({
        get: sandbox.stub().returns(templates),
      } as any);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      sandbox.stub(vscode.window, 'showQuickPick').resolves({
        label: '.null',
        description: 'Null check',
        template: templates[0],
      } as any);

      await suggestCommand.triggerSuggest();

      expect(editStub.calledOnce).to.be.true;
      const snippetArg = editStub.firstCall.args[0];
      expect(snippetArg).to.be.instanceOf(vscode.SnippetString);
      expect(snippetArg.value).to.contain('if (user != null)');
      expect(snippetArg.value).to.contain('$0');
    });

    it('should handle dot-only pattern (cursor just after dot, no suffix yet)', async () => {
      sandbox.stub(vscode.window, 'activeTextEditor').value({
        document: {
          languageId: 'java',
          lineAt: sandbox.stub().returns({ text: 'user.' }),
        },
        selection: { active: new vscode.Position(0, 'user.'.length) },
      });

      const templates = [
        { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }' },
        { name: 'print', suffix: '.sout', body: 'System.out.println($EXPR$);' },
      ];
      sandbox.stub(vscode.workspace, 'getConfiguration').returns({
        get: sandbox.stub().returns(templates),
      } as any);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const quickPickItems: vscode.QuickPickItem[] = [];
      sandbox.stub(vscode.window, 'showQuickPick').callsFake((items: any) => {
        quickPickItems.push(...items);
        return Promise.resolve(undefined);
      });

      await suggestCommand.triggerSuggest();

      expect(quickPickItems).to.have.lengthOf(2);
    });
  });
});
