import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { ConfigManager } from '../src/configManager';
import { PostfixTemplate } from '../src/types';

describe('ConfigManager', () => {
  let sandbox: sinon.SinonSandbox;
  let configManager: ConfigManager;

  const globalTemplates: PostfixTemplate[] = [
    { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null) { $END$ }', types: ['java.lang.Object'] },
    { name: 'print', suffix: '.sout', body: 'System.out.println($EXPR$);' },
  ];

  const projectTemplates: PostfixTemplate[] = [
    { name: 'custom log', suffix: '.log', body: 'logger.info($EXPR$);' },
    { name: 'override null', suffix: '.null', body: 'Optional.ofNullable($EXPR$);', types: ['java.lang.Object'] },
  ];

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    configManager = new ConfigManager();
  });

  afterEach(() => {
    sandbox.restore();
  });

  function mockConfig(templates: PostfixTemplate[]): void {
    const config = {
      get: sandbox.stub().withArgs('templates').returns(templates),
    };
    sandbox.stub(vscode.workspace, 'getConfiguration')
      .returns(config as unknown as vscode.WorkspaceConfiguration);
  }

  describe('getAllTemplates', () => {
    it('should return global templates when no project config exists', async () => {
      mockConfig(globalTemplates);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const templates = await configManager.getAllTemplates();

      expect(templates).to.have.lengthOf(2);
      expect(templates[0].name).to.equal('null check');
      expect(templates[1].name).to.equal('print');
    });

    it('should merge project templates overriding by suffix', async () => {
      mockConfig(globalTemplates);
      // Set workspaceFolders so getProjectTemplates() can find the project config
      sandbox.stub(vscode.workspace, 'workspaceFolders').value([
        { uri: vscode.Uri.file('/test'), name: 'test', index: 0 },
      ]);
      const readFileStub = sandbox.stub();
      readFileStub.resolves(Buffer.from(JSON.stringify(projectTemplates)));
      sandbox.stub(vscode.workspace, 'fs').value({
        readFile: readFileStub,
      });

      const templates = await configManager.getAllTemplates();

      expect(templates).to.have.lengthOf(3);
      expect(templates[0].name).to.equal('custom log');
      expect(templates[1].name).to.equal('override null');
      expect(templates[2].name).to.equal('print');
    });

    it('should return empty array when no templates configured', async () => {
      mockConfig([]);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const templates = await configManager.getAllTemplates();

      expect(templates).to.be.an('array').that.is.empty;
    });

    it('should filter out templates with empty body', async () => {
      const badTemplates: PostfixTemplate[] = [
        { name: 'valid', suffix: '.ok', body: 'valid' },
        { name: 'invalid', suffix: '.bad', body: '' },
      ];
      mockConfig(badTemplates);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const templates = await configManager.getAllTemplates();

      expect(templates).to.have.lengthOf(1);
      expect(templates[0].name).to.equal('valid');
    });

    it('should auto-prefix suffix with dot if missing', async () => {
      const badSuffix: PostfixTemplate[] = [
        { name: 'missing dot', suffix: 'null', body: 'if ($EXPR$ != null)' },
      ];
      mockConfig(badSuffix);
      sandbox.stub(vscode.workspace, 'fs').value(undefined);

      const templates = await configManager.getAllTemplates();

      expect(templates[0].suffix).to.equal('.null');
    });

    it('should return global-only templates when project file is unreadable', async () => {
      mockConfig(globalTemplates);
      const readFileStub = sandbox.stub().rejects(new Error('ENOENT'));
      sandbox.stub(vscode.workspace, 'fs').value({
        readFile: readFileStub,
      });

      const templates = await configManager.getAllTemplates();

      expect(templates).to.have.lengthOf(2);
    });
  });

  describe('reload', () => {
    it('should clear cached templates and re-read config', async () => {
      sandbox.stub(vscode.workspace, 'fs').value(undefined);
      // Use a stub that returns different values on successive calls
      const configStub = sandbox.stub();
      configStub.withArgs('templates')
        .onFirstCall().returns(globalTemplates)
        .onSecondCall().returns([{ name: 'new', suffix: '.new', body: 'newBody' }]);
      sandbox.stub(vscode.workspace, 'getConfiguration')
        .returns({ get: configStub } as unknown as vscode.WorkspaceConfiguration);

      await configManager.getAllTemplates();

      await configManager.reload();
      const templates = await configManager.getAllTemplates();

      expect(templates).to.have.lengthOf(1);
      expect(templates[0].name).to.equal('new');
    });
  });
});
