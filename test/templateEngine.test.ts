import { describe, it } from 'mocha';
import { expect } from 'chai';
import { TemplateEngine } from '../src/templateEngine';
import { PostfixTemplate, TypeInfo, TemplateMatch } from '../src/types';

describe('TemplateEngine', () => {
  const engine = new TemplateEngine();

  const sampleTemplates: PostfixTemplate[] = [
    {
      name: 'null check',
      suffix: '.null',
      body: 'if ($EXPR$ != null) { $END$ }',
      types: ['java.lang.Object'],
    },
    {
      name: 'sout',
      suffix: '.sout',
      body: 'System.out.println($EXPR$);',
    },
    {
      name: 'string isEmpty',
      suffix: '.isEmpty',
      body: '$EXPR$.isEmpty()',
      types: ['java.lang.CharSequence'],
    },
    {
      name: 'var assign',
      suffix: '.var',
      body: '$TYPE_SIMPLE$ $VAR$ = $EXPR$;$END$',
    },
    {
      name: 'cast',
      suffix: '.cast',
      body: '(($TYPE_SIMPLE$) $EXPR$)',
    },
  ];

  describe('findMatchingTemplates', () => {
    it('should find template by suffix', () => {
      const matches = engine.findMatchingTemplates('.null', sampleTemplates, null);

      expect(matches).to.have.lengthOf(1);
      expect(matches[0].template.name).to.equal('null check');
    });

    it('should find all templates matching suffix', () => {
      const matches = engine.findMatchingTemplates('.var', sampleTemplates, null);

      expect(matches).to.have.lengthOf(1);
      expect(matches[0].template.name).to.equal('var assign');
    });

    it('should filter by type when typeInfo is provided', () => {
      const stringType: TypeInfo = {
        fqn: 'java.lang.String',
        simpleName: 'String',
        allTypes: ['java.lang.String', 'java.lang.CharSequence', 'java.lang.Object'],
      };

      const matches = engine.findMatchingTemplates('.isEmpty', sampleTemplates, stringType);

      expect(matches).to.have.lengthOf(1);
      expect(matches[0].template.name).to.equal('string isEmpty');
    });

    it('should exclude type-mismatched templates', () => {
      const listType: TypeInfo = {
        fqn: 'java.util.ArrayList',
        simpleName: 'ArrayList',
        allTypes: ['java.util.ArrayList', 'java.util.List', 'java.util.Collection', 'java.lang.Object'],
      };

      const matches = engine.findMatchingTemplates('.isEmpty', sampleTemplates, listType);

      expect(matches).to.have.lengthOf(0);
    });

    it('should match all types when template has no type filter', () => {
      const listType: TypeInfo = {
        fqn: 'java.util.ArrayList',
        simpleName: 'ArrayList',
        allTypes: ['java.util.ArrayList', 'java.lang.Object'],
      };

      const matches = engine.findMatchingTemplates('.sout', sampleTemplates, listType);

      expect(matches).to.have.lengthOf(1);
      expect(matches[0].template.name).to.equal('sout');
    });

    it('should return empty when no suffix matches', () => {
      const matches = engine.findMatchingTemplates('.nonexistent', sampleTemplates, null);

      expect(matches).to.have.lengthOf(0);
    });

    it('should match all templates when typeInfo is null (degraded mode)', () => {
      const matches = engine.findMatchingTemplates('.isEmpty', sampleTemplates, null);

      expect(matches).to.have.lengthOf(1);
      expect(matches[0].template.name).to.equal('string isEmpty');
    });

    it('should sort by priority (more specific type first)', () => {
      const multiTemplates: PostfixTemplate[] = [
        { name: 'object op', suffix: '.op', body: 'obj($EXPR$)', types: ['java.lang.Object'] },
        { name: 'string op', suffix: '.op', body: 'str($EXPR$)', types: ['java.lang.String'] },
        { name: 'charseq op', suffix: '.op', body: 'cs($EXPR$)', types: ['java.lang.CharSequence'] },
      ];

      const stringType: TypeInfo = {
        fqn: 'java.lang.String',
        simpleName: 'String',
        allTypes: ['java.lang.String', 'java.lang.CharSequence', 'java.lang.Object'],
      };

      const matches = engine.findMatchingTemplates('.op', multiTemplates, stringType);

      expect(matches).to.have.lengthOf(3);
      expect(matches[0].template.name).to.equal('string op');
      expect(matches[1].template.name).to.equal('charseq op');
      expect(matches[2].template.name).to.equal('object op');
    });
  });

  describe('findBySuffix', () => {
    it('should return all templates when partialSuffix is empty', () => {
      const results = engine.findBySuffix('', sampleTemplates);
      expect(results).to.have.lengthOf(sampleTemplates.length);
    });

    it('should match exact suffix', () => {
      const results = engine.findBySuffix('null', sampleTemplates);
      expect(results).to.have.lengthOf(1);
      expect(results[0].suffix).to.equal('.null');
    });

    it('should match partial suffix prefix', () => {
      const results = engine.findBySuffix('nu', sampleTemplates);
      expect(results).to.have.lengthOf(1);
      expect(results[0].suffix).to.equal('.null');
    });

    it('should be case-insensitive', () => {
      const results = engine.findBySuffix('SOUT', sampleTemplates);
      expect(results).to.have.lengthOf(1);
      expect(results[0].suffix).to.equal('.sout');
    });

    it('should return empty when no suffix matches', () => {
      const results = engine.findBySuffix('nonexistent', sampleTemplates);
      expect(results).to.have.lengthOf(0);
    });

    it('should match multiple templates with same prefix', () => {
      const multiSuffixTemplates: PostfixTemplate[] = [
        { name: 'null check', suffix: '.null', body: 'if ($EXPR$ != null)' },
        { name: 'nullable', suffix: '.nullable', body: '$EXPR$?' },
        { name: 'sout', suffix: '.sout', body: 'System.out.println($EXPR$)' },
      ];
      const results = engine.findBySuffix('null', multiSuffixTemplates);
      expect(results).to.have.lengthOf(2);
      expect(results.map(t => t.suffix)).to.contain('.null');
      expect(results.map(t => t.suffix)).to.contain('.nullable');
    });

    it('should handle empty templates array', () => {
      const results = engine.findBySuffix('nu', []);
      expect(results).to.have.lengthOf(0);
    });

    it('should filter by type when typeInfo is provided', () => {
      const stringType: TypeInfo = {
        fqn: 'java.lang.String',
        simpleName: 'String',
        allTypes: ['java.lang.String', 'java.lang.CharSequence', 'java.lang.Object'],
      };

      const results = engine.findBySuffix('', sampleTemplates, stringType);

      // .isEmpty 约束 CharSequence → String 匹配（通过 allTypes）
      // .null 约束 Object → String 匹配
      // .sout 无约束 → 通配
      // .var 无约束 → 通配
      // .cast 无约束 → 通配
      expect(results).to.have.lengthOf(5);
      expect(results.map(t => t.name)).to.contain('string isEmpty');
    });

    it('should filter out type-mismatched templates when typeInfo is provided', () => {
      const listType: TypeInfo = {
        fqn: 'java.util.ArrayList',
        simpleName: 'ArrayList',
        allTypes: ['java.util.ArrayList', 'java.util.List', 'java.util.Collection', 'java.lang.Object'],
      };

      const results = engine.findBySuffix('', sampleTemplates, listType);

      // .isEmpty 约束 CharSequence → ArrayList 不匹配（allTypes 无 CharSequence）
      expect(results.map(t => t.name)).to.not.contain('string isEmpty');
      // 其他 4 个模板应该都在
      expect(results.map(t => t.name)).to.contain('null check');
      expect(results.map(t => t.name)).to.contain('sout');
      expect(results.map(t => t.name)).to.contain('var assign');
      expect(results.map(t => t.name)).to.contain('cast');
    });
  });

  describe('applyTemplate', () => {
    it('should replace $EXPR$ placeholder', () => {
      const template = sampleTemplates[1]; // .sout
      const result = engine.applyTemplate(template, 'user.getName()', null);

      expect(result.insertText).to.equal('System.out.println(user.getName());');
    });

    it('should replace $TYPE_SIMPLE$ placeholder', () => {
      const template = sampleTemplates[3]; // .var
      const stringType: TypeInfo = {
        fqn: 'java.lang.String',
        simpleName: 'String',
        allTypes: ['java.lang.String'],
      };

      const result = engine.applyTemplate(template, 'user.getName()', stringType);

      expect(result.insertText).to.contain('String');
    });

    it('should replace $TYPE$ placeholder', () => {
      const template = sampleTemplates[4]; // .cast
      const stringType: TypeInfo = {
        fqn: 'java.lang.String',
        simpleName: 'String',
        allTypes: ['java.lang.String'],
      };

      const result = engine.applyTemplate(template, 'obj', stringType);

      expect(result.insertText).to.equal('((String) obj)');
    });

    it('should replace $VAR$ with first identifier from expression', () => {
      const template: PostfixTemplate = {
        name: 'var only',
        suffix: '.v',
        body: '$VAR$',
      };

      const result = engine.applyTemplate(template, 'user.getName()', null);

      expect(result.insertText).to.equal('user');
    });

    it('should replace $VAR$ with full expression when it starts with method call', () => {
      const template: PostfixTemplate = {
        name: 'var only',
        suffix: '.v',
        body: '$VAR$',
      };

      const result = engine.applyTemplate(template, 'getName()', null);

      expect(result.insertText).to.equal('getName');
    });

    it('should set cursorOffset from $END$ position', () => {
      const template = sampleTemplates[0]; // .null

      const result = engine.applyTemplate(template, 'foo', null);

      // $END$ is now replaced with $0
      expect(result.insertText).to.equal('if (foo != null) { $0 }');
      expect(result.cursorOffset).to.equal('if (foo != null) { '.length);
    });

    it('should set cursorOffset to end of text when no $END$', () => {
      const template = sampleTemplates[1]; // .sout

      const result = engine.applyTemplate(template, 'foo', null);

      expect(result.cursorOffset).to.equal(result.insertText.length);
    });

    it('should handle template with no placeholders', () => {
      const template: PostfixTemplate = {
        name: 'static',
        suffix: '.static',
        body: 'static replacement',
      };

      const result = engine.applyTemplate(template, 'foo', null);

      expect(result.insertText).to.equal('static replacement');
    });

    it('should handle multiple $END$ (use first occurrence)', () => {
      const template: PostfixTemplate = {
        name: 'multi end',
        suffix: '.me',
        body: 'if ($EXPR$) { $END$ } else { $END$ }',
      };

      const result = engine.applyTemplate(template, 'foo', null);

      expect(result.insertText).to.equal('if (foo) { $0 } else { $0 }');
      expect(result.cursorOffset).to.equal('if (foo) { '.length);
    });
  });

  describe('extractFirstIdentifier', () => {
    it('should extract identifier from simple expression', () => {
      expect(engine.extractFirstIdentifier('myVar')).to.equal('myVar');
    });

    it('should extract first identifier from chain', () => {
      expect(engine.extractFirstIdentifier('user.getName()')).to.equal('user');
    });

    it('should extract from field access', () => {
      expect(engine.extractFirstIdentifier('this.user.name')).to.equal('this');
    });

    it('should extract method name for method-only expression', () => {
      expect(engine.extractFirstIdentifier('getName()')).to.equal('getName');
    });
  });
});
