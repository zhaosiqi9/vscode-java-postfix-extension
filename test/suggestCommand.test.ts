import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { SuggestCommand } from '../src/suggestCommand';

/** 创建一个可控的 QuickPick stub 对象 */
function createQuickPickStub(sandbox: sinon.SinonSandbox) {
  const listeners: Record<string, (...args: any[]) => void> = {};
  let showResolve: (() => void) | undefined;
  const shown = new Promise<void>((resolve) => { showResolve = resolve; });

  return {
    items: [] as any[],
    selectedItems: [] as any[],
    placeholder: '',
    matchOnDescription: false,
    matchOnDetail: false,
    value: '',
    busy: false,
    enabled: true,
    ignoreFocusOut: false,
    canSelectMany: false,
    step: undefined as any,
    totalSteps: undefined as any,
    buttons: [] as any[],
    show: sandbox.stub().callsFake(() => { showResolve?.(); }),
    hide: sandbox.stub(),
    dispose: sandbox.stub(),
    onDidChangeValue: sandbox.stub().callsFake((fn: (e: string) => void) => {
      listeners['changeValue'] = fn;
      return { dispose: () => {} };
    }),
    onDidAccept: sandbox.stub().callsFake((fn: () => void) => {
      listeners['accept'] = fn;
      return { dispose: () => {} };
    }),
    onDidChangeSelection: sandbox.stub().callsFake(() => ({ dispose: () => {} })),
    onDidHide: sandbox.stub().callsFake((fn: () => void) => {
      listeners['hide'] = fn;
      return { dispose: () => {} };
    }),
    onDidTriggerButton: sandbox.stub().callsFake(() => ({ dispose: () => {} })),
    // 暴露 listeners 和 shown promise 以便测试中手动触发
    _listeners: listeners,
    _shown: shown,
  };
}

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

    it('should create QuickPick with matching templates when expression and suffix detected', async () => {
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

      const qpStub = createQuickPickStub(sandbox);
      sandbox.stub(vscode.window, 'createQuickPick').returns(qpStub as any);

      const promise = suggestCommand.triggerSuggest();

      // 等待 QuickPick 显示（show() 被调用）
      await qpStub._shown;

      // 验证 QuickPick 配置
      expect(qpStub.matchOnDescription).to.be.true;
      expect(qpStub.matchOnDetail).to.be.true;
      expect(qpStub.placeholder).to.equal('选择 postfix 模板');
      expect(qpStub.items).to.have.lengthOf(2); // .null and .nullable
      expect(qpStub.items[0].label).to.equal('.null');
      expect(qpStub.items[1].label).to.equal('.nullable');
      // 验证有图标
      expect(qpStub.items[0].iconPath).to.be.instanceOf(vscode.ThemeIcon);
      expect((qpStub.items[0].iconPath as vscode.ThemeIcon).id).to.equal('symbol-snippet');
      // 验证 description 是预览文本（不是模板描述）
      expect(qpStub.items[0].description).to.contain('if (user != null)');
      // 验证 detail 是模板描述
      expect(qpStub.items[0].detail).to.equal('Null check');

      // 触发取消以完成 promise
      qpStub._listeners['hide']();
      await promise;
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

      const qpStub = createQuickPickStub(sandbox);
      sandbox.stub(vscode.window, 'createQuickPick').returns(qpStub as any);

      const promise = suggestCommand.triggerSuggest();

      // 等待 QuickPick 显示
      await qpStub._shown;

      // 模拟用户选择了第一个 item
      qpStub.selectedItems = [qpStub.items[0]];
      qpStub._listeners['accept']();

      await promise;

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

      const qpStub = createQuickPickStub(sandbox);
      sandbox.stub(vscode.window, 'createQuickPick').returns(qpStub as any);

      const promise = suggestCommand.triggerSuggest();

      // 等待 QuickPick 显示
      await qpStub._shown;

      expect(qpStub.items).to.have.lengthOf(2);

      // 取消
      qpStub._listeners['hide']();
      await promise;
    });

    it('should return early when user cancels QuickPick', async () => {
      sandbox.stub(vscode.window, 'activeTextEditor').value({
        document: {
          languageId: 'java',
          lineAt: sandbox.stub().returns({ text: 'user.null' }),
        },
        selection: { active: new vscode.Position(0, 'user.null'.length) },
      });

      const templates = [
        { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }' },
      ];
      sandbox.stub(vscode.workspace, 'getConfiguration').returns({
        get: sandbox.stub().returns(templates),
      } as any);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const qpStub = createQuickPickStub(sandbox);
      sandbox.stub(vscode.window, 'createQuickPick').returns(qpStub as any);

      const promise = suggestCommand.triggerSuggest();

      // 等待 QuickPick 显示
      await qpStub._shown;

      // 用户取消（onDidHide 先于 onDidAccept 触发）
      qpStub._listeners['hide']();

      const result = await promise;
      // 应该不抛异常，正常返回 undefined
      expect(result).to.be.undefined;
    });

    it('should filter items by suffix prefix when input value changes', async () => {
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

      const qpStub = createQuickPickStub(sandbox);
      sandbox.stub(vscode.window, 'createQuickPick').returns(qpStub as any);

      const promise = suggestCommand.triggerSuggest();

      // 等待 QuickPick 显示
      await qpStub._shown;

      // 初始应该有两个 item
      expect(qpStub.items).to.have.lengthOf(2);

      // 模拟用户输入 ".nu"
      qpStub._listeners['changeValue']('.nu');
      // 过滤后应该只剩 .null
      expect(qpStub.items).to.have.lengthOf(1);
      expect(qpStub.items[0].label).to.equal('.null');

      // 模拟用户清空输入
      qpStub._listeners['changeValue']('');
      // 应该恢复全部
      expect(qpStub.items).to.have.lengthOf(2);

      // 取消
      qpStub._listeners['hide']();
      await promise;
    });
  });
});
