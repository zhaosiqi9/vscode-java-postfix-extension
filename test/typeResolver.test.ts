import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { TypeResolver } from '../src/typeResolver';

describe('TypeResolver', () => {
  let resolver: TypeResolver;
  let sandbox: sinon.SinonSandbox;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers();
    resolver = new TypeResolver();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('resolveType', () => {
    it('should resolve type from hover response', async () => {
      const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
      executeCommandStub.withArgs('vscode.executeHoverProvider').resolves([
        {
          contents: [
            {
              language: 'java',
              value:
                '```java\njava.lang.String\n```',
            },
          ],
        },
      ]);

      const doc = { uri: vscode.Uri.file('/test/Foo.java') } as vscode.TextDocument;
      const result = await resolver.resolveType(doc, 'myVar', 10, 5);

      expect(result.typeInfo).to.not.be.null;
      expect(result.typeInfo!.fqn).to.equal('java.lang.String');
      expect(result.typeInfo!.simpleName).to.equal('String');
      expect(result.degraded).to.be.false;
    });

    it('should parse hover with simple content string', async () => {
      const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
      executeCommandStub.withArgs('vscode.executeHoverProvider').resolves([
        { contents: ['String java.lang.String'] },
      ]);

      const doc = { uri: vscode.Uri.file('/test/Foo.java') } as vscode.TextDocument;
      const result = await resolver.resolveType(doc, 'myVar', 10, 5);

      expect(result.typeInfo).to.not.be.null;
      expect(result.typeInfo!.simpleName).to.equal('String');
    });

    it('should return degraded when hover fails', async () => {
      const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
      executeCommandStub.withArgs('vscode.executeHoverProvider').rejects(new Error('timeout'));

      const doc = { uri: vscode.Uri.file('/test/Foo.java') } as vscode.TextDocument;
      const result = await resolver.resolveType(doc, 'myVar', 10, 5);

      expect(result.typeInfo).to.be.null;
      expect(result.degraded).to.be.true;
    });

    it('should return degraded=false when hover returns empty', async () => {
      const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
      executeCommandStub.withArgs('vscode.executeHoverProvider').resolves([]);

      const doc = { uri: vscode.Uri.file('/test/Foo.java') } as vscode.TextDocument;
      const result = await resolver.resolveType(doc, 'myVar', 10, 5);

      expect(result.typeInfo).to.be.null;
      expect(result.degraded).to.be.false;
    });

    it('should cache type results', async () => {
      const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
      executeCommandStub.withArgs('vscode.executeHoverProvider').resolves([
        { contents: ['String java.lang.String'] },
      ]);

      const doc = { uri: vscode.Uri.file('/test/Foo.java') } as vscode.TextDocument;

      await resolver.resolveType(doc, 'myVar', 10, 5);
      const result2 = await resolver.resolveType(doc, 'myVar', 10, 5);

      expect(executeCommandStub.callCount).to.equal(1);
      expect(result2.typeInfo!.fqn).to.equal('java.lang.String');
    });

    it('should expire cache after TTL', async () => {
      const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
      executeCommandStub.withArgs('vscode.executeHoverProvider').resolves([
        { contents: ['String java.lang.String'] },
      ]);

      const doc = { uri: vscode.Uri.file('/test/Foo.java') } as vscode.TextDocument;

      await resolver.resolveType(doc, 'myVar', 10, 5);
      clock.tick(61_000);
      await resolver.resolveType(doc, 'myVar', 10, 5);

      expect(executeCommandStub.callCount).to.equal(2);
    });

    it('should clear cache', async () => {
      const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
      executeCommandStub.withArgs('vscode.executeHoverProvider').resolves([
        { contents: ['String java.lang.String'] },
      ]);

      const doc = { uri: vscode.Uri.file('/test/Foo.java') } as vscode.TextDocument;

      await resolver.resolveType(doc, 'myVar', 10, 5);
      resolver.clearCache();
      await resolver.resolveType(doc, 'myVar', 10, 5);

      expect(executeCommandStub.callCount).to.equal(2);
    });
  });

  describe('parseTypeFromHover', () => {
    it('should extract FQN and simple name from markdown hover', () => {
      const hoverContent: vscode.MarkedString[] = [{ language: 'java', value: '```java\njava.util.ArrayList<E>\n```' }];
      const result = resolver.parseTypeFromHover(hoverContent);

      expect(result).to.not.be.null;
      expect(result!.fqn).to.equal('java.util.ArrayList');
      expect(result!.simpleName).to.equal('ArrayList');
    });

    it('should extract from plain text hover', () => {
      const hoverContent = ['ArrayList<E> java.util.ArrayList<E>'];
      const result = resolver.parseTypeFromHover(hoverContent);

      expect(result).to.not.be.null;
      expect(result!.simpleName).to.equal('ArrayList');
    });

    it('should return null for unparseable content', () => {
      const result = resolver.parseTypeFromHover([]);
      expect(result).to.be.null;
    });
  });

  describe('typeMatches', () => {
    it('should match exact type', () => {
      const typeInfo = {
        fqn: 'java.lang.String',
        simpleName: 'String',
        allTypes: ['java.lang.String', 'java.lang.Object'],
      };
      expect(resolver.typeMatches(typeInfo, ['java.lang.String'])).to.be.true;
    });

    it('should match supertype', () => {
      const typeInfo = {
        fqn: 'java.lang.String',
        simpleName: 'String',
        allTypes: ['java.lang.String', 'java.lang.CharSequence', 'java.lang.Object'],
      };
      expect(resolver.typeMatches(typeInfo, ['java.lang.CharSequence'])).to.be.true;
    });

    it('should not match unrelated type', () => {
      const typeInfo = {
        fqn: 'java.lang.String',
        simpleName: 'String',
        allTypes: ['java.lang.String', 'java.lang.Object'],
      };
      expect(resolver.typeMatches(typeInfo, ['java.util.Collection'])).to.be.false;
    });

    it('should match when type list is empty (match all)', () => {
      const typeInfo = {
        fqn: 'java.lang.String',
        simpleName: 'String',
        allTypes: ['java.lang.String'],
      };
      expect(resolver.typeMatches(typeInfo, [])).to.be.true;
    });
  });
});
