import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

function makeMockContext(): vscode.ExtensionContext {
  const memento = {
    keys: () => [] as readonly string[],
    get: (_key: string) => undefined,
    update: (_key: string, _value: any) => Promise.resolve(),
  };
  return {
    subscriptions: [],
    extensionPath: '/test',
    globalState: memento as any,
    workspaceState: memento as any,
  } as any as vscode.ExtensionContext;
}

describe('Extension Activation', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should register CompletionItemProvider for java on activate', () => {
    const registerSpy = sandbox.spy(vscode.languages, 'registerCompletionItemProvider');
    const mockContext = makeMockContext();

    // Clear module cache to test fresh activation
    delete require.cache[require.resolve('../src/extension')];
    const ext = require('../src/extension');
    ext.activate(mockContext);

    expect(registerSpy.calledOnce).to.be.true;
    const args = registerSpy.getCall(0).args;
    // First arg should be the selector { language: 'java' }
    expect(args[0]).to.deep.equal({ language: 'java' });
    // Third arg should be '.' as trigger character
    expect(args[2]).to.equal('.');
    expect(mockContext.subscriptions.length).to.equal(2);
  });

  it('should register triggerSuggest command on activate', () => {
    const registerSpy = sandbox.spy(vscode.commands, 'registerCommand');
    const mockContext = makeMockContext();

    // 清除模块缓存以测试全新激活
    delete require.cache[require.resolve('../src/extension')];
    const ext = require('../src/extension');
    ext.activate(mockContext);

    const commandNames = registerSpy.getCalls().map(c => c.args[0]);
    expect(commandNames).to.include('java-postfix.triggerSuggest');
    // 验证 subscription 数量：CompletionItemProvider + triggerSuggest 命令 = 2
    expect(mockContext.subscriptions.length).to.equal(2);
  });
});
