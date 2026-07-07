import { PostfixTemplate, TypeInfo, TemplateMatch, CompletionResult, Placeholder } from './types';

export class TemplateEngine {
  /**
   * Find all templates matching the given suffix, filtered by type if available.
   * Results are sorted by priority (most specific type match first).
   */
  findMatchingTemplates(
    suffix: string,
    templates: PostfixTemplate[],
    typeInfo: TypeInfo | null
  ): TemplateMatch[] {
    const normalizedSuffix = suffix.startsWith('.') ? suffix : '.' + suffix;

    const matches: TemplateMatch[] = [];

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];

      if (template.suffix !== normalizedSuffix) {
        continue;
      }

      // If template has type constraints and we have type info, check compatibility
      if (template.types && template.types.length > 0 && typeInfo) {
        if (!this.typeMatchesConstraint(typeInfo, template.types)) {
          continue;
        }
      }

      // Calculate priority: lower = more specific
      const typePriority = typeInfo ? this.calculateTypePriority(typeInfo, template.types || []) : 100;
      const orderPriority = i;

      matches.push({
        template,
        typeInfo,
        priority: typePriority * 1000 + orderPriority,
      });
    }

    // Sort by priority (lower = better)
    matches.sort((a, b) => a.priority - b.priority);

    return matches;
  }

  /**
   * Find all templates whose suffix starts with the given partial suffix.
   * Used by the CompletionItemProvider for prefix-based filtering.
   * If partialSuffix is empty, returns all templates.
   */
  findBySuffix(partialSuffix: string, templates: PostfixTemplate[], typeInfo?: TypeInfo | null): PostfixTemplate[] {
    let matched = templates;
    if (partialSuffix && partialSuffix.length > 0) {
      const lowerPartial = partialSuffix.toLowerCase();
      matched = templates.filter((t) => {
        const suffixWithoutDot = t.suffix.startsWith('.') ? t.suffix.substring(1) : t.suffix;
        return suffixWithoutDot.startsWith(lowerPartial);
      });
    }

    // 如果提供了 typeInfo，在前缀匹配后追加类型过滤
    if (typeInfo) {
      matched = matched.filter((t) => {
        if (!t.types || t.types.length === 0) {
          return true; // 无类型约束 → 通配
        }
        return this.typeMatchesConstraint(typeInfo, t.types);
      });
    }

    return matched;
  }

  /**
   * Apply a template to an expression, replacing all placeholders.
   */
  applyTemplate(
    template: PostfixTemplate,
    expr: string,
    typeInfo: TypeInfo | null
  ): CompletionResult {
    let body = template.body;

    // Replace $EXPR$
    body = body.split(Placeholder.EXPR).join(expr);

    // Replace $TYPE$ and $TYPE_SIMPLE$
    if (typeInfo) {
      body = body.split(Placeholder.TYPE).join(typeInfo.fqn);
      body = body.split(Placeholder.TYPE_SIMPLE).join(typeInfo.simpleName);
    } else {
      body = body.split(Placeholder.TYPE).join('Object');
      body = body.split(Placeholder.TYPE_SIMPLE).join('Object');
    }

    // Replace $VAR$
    const varName = this.extractFirstIdentifier(expr);
    body = body.split(Placeholder.VAR).join(varName);

    // Handle $END$ — convert to $0 for VS Code SnippetString cursor positioning
    const endIndex = body.indexOf(Placeholder.END);
    if (endIndex !== -1) {
      body = body.split(Placeholder.END).join('$0');
    }

    return {
      insertText: body,
      range: { startLine: 0, startCol: 0, endLine: 0, endCol: 0 }, // Set by caller
      cursorOffset: endIndex !== -1 ? endIndex : body.length,
    };
  }

  /**
   * Extract the first identifier from a Java expression chain.
   */
  extractFirstIdentifier(expr: string): string {
    const trimmed = expr.trim();
    const match = trimmed.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (match) {
      return match[1];
    }
    return trimmed;
  }

  private typeMatchesConstraint(typeInfo: TypeInfo, targetTypes: string[]): boolean {
    if (!targetTypes || targetTypes.length === 0) {
      return true;
    }
    return targetTypes.some((target) => typeInfo.allTypes.includes(target));
  }

  private calculateTypePriority(typeInfo: TypeInfo, targetTypes: string[]): number {
    if (!targetTypes || targetTypes.length === 0) {
      return 100;
    }
    let bestPriority = 999;
    for (const target of targetTypes) {
      const index = typeInfo.allTypes.indexOf(target);
      if (index !== -1 && index < bestPriority) {
        bestPriority = index;
      }
    }
    return bestPriority;
  }
}
