import { describe, it } from 'mocha';
import { expect } from 'chai';
import { PatternDetector } from '../src/patternDetector';

describe('PatternDetector', () => {
  const detector = new PatternDetector();

  describe('extractExpression', () => {
    it('should extract simple identifier with suffix', () => {
      const result = detector.extractExpression('myVar.null', 'myVar.null'.length);
      expect(result.valid).to.be.true;
      expect(result.expr).to.equal('myVar');
      expect(result.suffix).to.equal('null');
    });

    it('should extract method call chain with suffix', () => {
      const result = detector.extractExpression(
        'user.getName().null',
        'user.getName().null'.length
      );
      expect(result.valid).to.be.true;
      expect(result.expr).to.equal('user.getName()');
      expect(result.suffix).to.equal('null');
    });

    it('should extract field access chain with suffix', () => {
      const result = detector.extractExpression(
        'this.user.name.null',
        'this.user.name.null'.length
      );
      expect(result.valid).to.be.true;
      expect(result.expr).to.equal('this.user.name');
      expect(result.suffix).to.equal('null');
    });

    it('should handle array access in expression', () => {
      const result = detector.extractExpression(
        'users[0].getName().null',
        'users[0].getName().null'.length
      );
      expect(result.valid).to.be.true;
      expect(result.expr).to.equal('users[0].getName()');
      expect(result.suffix).to.equal('null');
    });

    it('should handle new expression', () => {
      const result = detector.extractExpression(
        'new Foo().null',
        'new Foo().null'.length
      );
      expect(result.valid).to.be.true;
      expect(result.expr).to.equal('new Foo()');
      expect(result.suffix).to.equal('null');
    });

    it('should handle multi-arg method calls', () => {
      const result = detector.extractExpression(
        'builder.setName("a").setAge(1).build().var',
        'builder.setName("a").setAge(1).build().var'.length
      );
      expect(result.valid).to.be.true;
      expect(result.expr).to.equal('builder.setName("a").setAge(1).build()');
      expect(result.suffix).to.equal('var');
    });

    it('should handle lambda in method chain', () => {
      const result = detector.extractExpression(
        'list.stream().filter(u -> u.age > 18).list',
        'list.stream().filter(u -> u.age > 18).list'.length
      );
      expect(result.valid).to.be.true;
      expect(result.expr).to.equal('list.stream().filter(u -> u.age > 18)');
      expect(result.suffix).to.equal('list');
    });

    it('should reject empty expression before suffix', () => {
      const result = detector.extractExpression('.null', '.null'.length);
      expect(result.valid).to.be.false;
    });

    it('should reject closing paren as expression', () => {
      const result = detector.extractExpression(').null', ').null'.length);
      expect(result.valid).to.be.false;
    });

    it('should reject unmatched parentheses', () => {
      const result = detector.extractExpression('method(.suffix', 'method('.length + '.suffix'.length);
      expect(result.valid).to.be.false;
    });

    it('should stop at semicolon boundary', () => {
      const result = detector.extractExpression(
        'int x = foo.bar().null',
        'int x = foo.bar().null'.length
      );
      expect(result.valid).to.be.true;
      expect(result.expr).to.equal('foo.bar()');
      expect(result.suffix).to.equal('null');
    });

    it('should stop at equals sign boundary', () => {
      const result = detector.extractExpression(
        'x=expr.null',
        'x=expr.null'.length
      );
      expect(result.valid).to.be.true;
      expect(result.expr).to.equal('expr');
      expect(result.suffix).to.equal('null');
    });

    it('should handle string literal expression', () => {
      const result = detector.extractExpression(
        '"hello".null',
        '"hello".null'.length
      );
      expect(result.valid).to.be.true;
      expect(result.expr).to.equal('"hello"');
      expect(result.suffix).to.equal('null');
    });

    it('should handle cursor not at end of line (text after cursor)', () => {
      const result = detector.extractExpression(
        'myVar.null;',
        'myVar.null'.length
      );
      expect(result.valid).to.be.true;
      expect(result.expr).to.equal('myVar');
      expect(result.suffix).to.equal('null');
    });

    it('should handle whitespace before suffix', () => {
      const result = detector.extractExpression('myVar .null', 'myVar .null'.length);
      expect(result.valid).to.be.false;
    });

    it('should handle no suffix at all', () => {
      const result = detector.extractExpression('myVar', 'myVar'.length);
      expect(result.valid).to.be.false;
    });
  });
});
