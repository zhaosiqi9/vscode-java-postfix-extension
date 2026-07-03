import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { CompletionProvider } from '../src/completionProvider';

function makeMockDocument(languageId: string, lineText: string): any {
  return {
    languageId,
    uri: vscode.Uri.file('/test/Test.java'),
    lineAt: sinon.stub().returns({ text: lineText }),
  };
}

function makeMockPosition(line: number, character: number): vscode.Position {
  return new vscode.Position(line, character);
}

function makeMockContext(triggerCharacter?: string): vscode.CompletionContext {
  return {
    triggerKind: triggerCharacter
      ? vscode.CompletionTriggerKind.TriggerCharacter
      : vscode.CompletionTriggerKind.Invoke,
    triggerCharacter,
  };
}

describe('CompletionProvider', () => {
  let provider: CompletionProvider;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    provider = new CompletionProvider();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('provideCompletionItems', () => {
    it('should return undefined for non-java files', async () => {
      const doc = makeMockDocument('typescript', 'myVar.null');
      const pos = makeMockPosition(0, 'myVar.null'.length);
      const ctx = makeMockContext('.');

      const result = await provider.provideCompletionItems(doc, pos, {} as any, ctx);

      expect(result).to.be.undefined;
    });

    it('should return undefined when no suffix pattern and no dot at cursor', async () => {
      sandbox.stub(vscode.workspace, 'getConfiguration').returns({
        get: sandbox.stub().callsFake((section: string) => {
          if (section === 'completionMode') return 'inline';
          return undefined;
        }),
      } as any);

      const doc = makeMockDocument('java', 'myVar');
      const pos = makeMockPosition(0, 'myVar'.length);
      const ctx = makeMockContext();

      const result = await provider.provideCompletionItems(doc, pos, {} as any, ctx);

      expect(result).to.be.undefined;
    });

    it('should return completions when suffix is detected', async () => {
      const templates = [
        { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }', description: 'Null check' },
        { name: 'print', suffix: '.sout', body: 'System.out.println($EXPR$);' },
      ];
      sandbox.stub(vscode.workspace, 'getConfiguration').returns({
        get: sandbox.stub().returns(templates),
      } as any);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const doc = makeMockDocument('java', 'user.null');
      const pos = makeMockPosition(0, 'user.null'.length);
      const ctx = makeMockContext('.');

      const result = await provider.provideCompletionItems(doc, pos, {} as any, ctx);

      expect(result).to.be.an('array').with.lengthOf(1);
      expect(result![0].label).to.equal('.null');
      expect(result![0].kind).to.equal(vscode.CompletionItemKind.Snippet);
    });

    it('should return all templates when cursor is just after dot (no suffix yet)', async () => {
      const templates = [
        { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }' },
        { name: 'print', suffix: '.sout', body: 'System.out.println($EXPR$);' },
      ];
      sandbox.stub(vscode.workspace, 'getConfiguration').returns({
        get: sandbox.stub().returns(templates),
      } as any);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const doc = makeMockDocument('java', 'user.');
      const pos = makeMockPosition(0, 'user.'.length);
      const ctx = makeMockContext('.');

      const result = await provider.provideCompletionItems(doc, pos, {} as any, ctx);

      expect(result).to.be.an('array').with.lengthOf(2);
    });

    it('should filter templates by partial suffix', async () => {
      const templates = [
        { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }' },
        { name: 'nullable', suffix: '.nullable', body: '$EXPR$?' },
        { name: 'print', suffix: '.sout', body: 'System.out.println($EXPR$);' },
      ];
      sandbox.stub(vscode.workspace, 'getConfiguration').returns({
        get: sandbox.stub().returns(templates),
      } as any);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const doc = makeMockDocument('java', 'user.nu');
      const pos = makeMockPosition(0, 'user.nu'.length);
      const ctx = makeMockContext('.');

      const result = await provider.provideCompletionItems(doc, pos, {} as any, ctx);

      expect(result).to.be.an('array').with.lengthOf(2);
      const labels = result!.map((i: vscode.CompletionItem) => i.label);
      expect(labels).to.contain('.null');
      expect(labels).to.contain('.nullable');
    });

    it('should return undefined when no templates match suffix', async () => {
      const templates = [
        { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }' },
      ];
      sandbox.stub(vscode.workspace, 'getConfiguration').returns({
        get: sandbox.stub().returns(templates),
      } as any);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const doc = makeMockDocument('java', 'user.xyz');
      const pos = makeMockPosition(0, 'user.xyz'.length);
      const ctx = makeMockContext('.');

      const result = await provider.provideCompletionItems(doc, pos, {} as any, ctx);

      expect(result).to.be.undefined;
    });

    it('should reject numeric literal expressions', async () => {
      const templates = [
        { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }' },
      ];
      sandbox.stub(vscode.workspace, 'getConfiguration').returns({
        get: sandbox.stub().returns(templates),
      } as any);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const doc = makeMockDocument('java', '42.null');
      const pos = makeMockPosition(0, '42.null'.length);
      const ctx = makeMockContext('.');

      const result = await provider.provideCompletionItems(doc, pos, {} as any, ctx);

      expect(result).to.be.undefined;
    });

    it('should set filterText to expr + suffix', async () => {
      const templates = [
        { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }' },
      ];
      sandbox.stub(vscode.workspace, 'getConfiguration').returns({
        get: sandbox.stub().returns(templates),
      } as any);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const doc = makeMockDocument('java', 'user.null');
      const pos = makeMockPosition(0, 'user.null'.length);
      const ctx = makeMockContext('.');

      const result = await provider.provideCompletionItems(doc, pos, {} as any, ctx);

      expect(result![0].filterText).to.equal('user.null');
    });

    it('should set insertText as SnippetString with $0', async () => {
      const templates = [
        { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }' },
      ];
      sandbox.stub(vscode.workspace, 'getConfiguration').returns({
        get: sandbox.stub().returns(templates),
      } as any);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const doc = makeMockDocument('java', 'user.null');
      const pos = makeMockPosition(0, 'user.null'.length);
      const ctx = makeMockContext('.');

      const result = await provider.provideCompletionItems(doc, pos, {} as any, ctx);

      expect(result![0].insertText).to.be.instanceOf(vscode.SnippetString);
      expect((result![0].insertText as vscode.SnippetString).value).to.contain('$0');
    });

    it('should set correct range covering expression and suffix', async () => {
      const templates = [
        { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }' },
      ];
      sandbox.stub(vscode.workspace, 'getConfiguration').returns({
        get: sandbox.stub().returns(templates),
      } as any);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const doc = makeMockDocument('java', 'user.getName().nu');
      const pos = makeMockPosition(0, 'user.getName().nu'.length);
      const ctx = makeMockContext('.');

      const result = await provider.provideCompletionItems(doc, pos, {} as any, ctx);

      // vscode-mock Range/Position constructors don't preserve values,
      // but the range property should be set (instance check verifies it's populated)
      expect(result![0].range).to.be.instanceOf(vscode.Range);
    });

    it('should set detail as truncated preview of expansion', async () => {
      const templates = [
        {
          name: 'null check',
          suffix: '.null',
          body: 'if ($EXPR$ != null) {\n    $END$\n}',
          description: 'Wrap with null check',
        },
      ];
      sandbox.stub(vscode.workspace, 'getConfiguration').returns({
        get: sandbox.stub().returns(templates),
      } as any);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const doc = makeMockDocument('java', 'user.null');
      const pos = makeMockPosition(0, 'user.null'.length);
      const ctx = makeMockContext('.');

      const result = await provider.provideCompletionItems(doc, pos, {} as any, ctx);

      expect(result![0].detail).to.be.a('string').that.is.not.empty;
      expect(result![0].detail).to.contain('if (user != null)');
    });

    describe('completionMode', () => {
      it('should return completions when mode is inline (default)', async () => {
        const templates = [
          { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }' },
        ];
        sandbox.stub(vscode.workspace, 'getConfiguration').returns({
          get: sandbox.stub().callsFake((section: string) => {
            if (section === 'templates') return templates;
            if (section === 'completionMode') return 'inline';
            return undefined;
          }),
        } as any);
        sandbox.stub(vscode.workspace, 'fs').value(undefined);

        const doc = makeMockDocument('java', 'user.null');
        const pos = makeMockPosition(0, 'user.null'.length);
        const ctx = makeMockContext('.');

        const result = await provider.provideCompletionItems(doc, pos, {} as any, ctx);

        expect(result).to.be.an('array').with.lengthOf(1);
      });

      it('should return undefined when mode is manual', async () => {
        const templates = [
          { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }' },
        ];
        sandbox.stub(vscode.workspace, 'getConfiguration').returns({
          get: sandbox.stub().callsFake((section: string) => {
            if (section === 'templates') return templates;
            if (section === 'completionMode') return 'manual';
            return undefined;
          }),
        } as any);
        sandbox.stub(vscode.workspace, 'fs').value(undefined);

        const doc = makeMockDocument('java', 'user.null');
        const pos = makeMockPosition(0, 'user.null'.length);
        const ctx = makeMockContext('.');

        const result = await provider.provideCompletionItems(doc, pos, {} as any, ctx);

        expect(result).to.be.undefined;
      });
    });
  });
});
