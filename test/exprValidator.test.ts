import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { ExprValidator } from '../src/exprValidator';

describe('ExprValidator', () => {
  let validator: ExprValidator;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    validator = new ExprValidator();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('validateByLexicalRules', () => {
    it('should accept a simple identifier', () => {
      expect(validator.validateByLexicalRules('myVar')).to.be.true;
    });

    it('should accept a method call', () => {
      expect(validator.validateByLexicalRules('getUser()')).to.be.true;
    });

    it('should accept a chained method call', () => {
      expect(validator.validateByLexicalRules('user.getName().toUpperCase()')).to.be.true;
    });

    it('should accept field access', () => {
      expect(validator.validateByLexicalRules('this.user.name')).to.be.true;
    });

    it('should accept string literal', () => {
      expect(validator.validateByLexicalRules('"hello"')).to.be.true;
    });

    it('should accept new expression', () => {
      expect(validator.validateByLexicalRules('new Foo()')).to.be.true;
    });

    it('should accept array access', () => {
      expect(validator.validateByLexicalRules('users[0]')).to.be.true;
    });

    it('should reject empty string', () => {
      expect(validator.validateByLexicalRules('')).to.be.false;
    });

    it('should reject whitespace only', () => {
      expect(validator.validateByLexicalRules('   ')).to.be.false;
    });

    it('should reject a single closing paren', () => {
      expect(validator.validateByLexicalRules(')')).to.be.false;
    });

    it('should reject numeric literal (primitive)', () => {
      expect(validator.validateByLexicalRules('123')).to.be.false;
    });

    it('should reject boolean literal', () => {
      expect(validator.validateByLexicalRules('true')).to.be.false;
      expect(validator.validateByLexicalRules('false')).to.be.false;
    });
  });

  describe('validateWithJdtLs', () => {
    it('should return valid when hover returns type info', async () => {
      const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
      executeCommandStub.withArgs('vscode.executeHoverProvider').resolves([
        { contents: ['String java.lang.String'] },
      ]);

      const doc = {} as vscode.TextDocument;
      const result = await validator.validateWithJdtLs(doc, 'myVar', 10, 5);

      expect(result.isValid).to.be.true;
      expect(result.expr).to.equal('myVar');
    });

    it('should return invalid when hover returns empty', async () => {
      const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
      executeCommandStub.withArgs('vscode.executeHoverProvider').resolves([]);

      const doc = {} as vscode.TextDocument;
      const result = await validator.validateWithJdtLs(doc, 'invalidExpr', 10, 5);

      expect(result.isValid).to.be.false;
    });

    it('should return invalid when hover command fails', async () => {
      const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
      executeCommandStub.withArgs('vscode.executeHoverProvider').rejects(new Error('no provider'));

      const doc = {} as vscode.TextDocument;
      const result = await validator.validateWithJdtLs(doc, 'myVar', 10, 5);

      expect(result.isValid).to.be.false;
    });
  });
});
