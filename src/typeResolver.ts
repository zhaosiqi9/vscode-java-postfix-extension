import * as vscode from 'vscode';
import { TypeInfo, TypeResolution } from './types';

interface CacheEntry {
  typeInfo: TypeInfo | null;
  timestamp: number;
}

export class TypeResolver {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 60_000; // 60 seconds

  /**
   * Resolve the type of an expression using JDT LS hover.
   * Results are cached by (uri + line + col + expr) key for CACHE_TTL_MS.
   */
  async resolveType(
    document: vscode.TextDocument,
    expr: string,
    line: number,
    exprEndCol: number
  ): Promise<TypeResolution> {
    const cacheKey = `${document.uri.toString()}:${line}:${exprEndCol}:${expr}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return {
        typeInfo: cached.typeInfo,
        degraded: false,
      };
    }

    try {
      const position = new vscode.Position(line, exprEndCol - 1);
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        'vscode.executeHoverProvider',
        document.uri,
        position
      );

      if (!hovers || hovers.length === 0) {
        const entry: CacheEntry = { typeInfo: null, timestamp: Date.now() };
        this.cache.set(cacheKey, entry);
        return { typeInfo: null, degraded: false };
      }

      const hoverContent = hovers[0].contents;
      const typeInfo = this.parseTypeFromHover(hoverContent);

      const entry: CacheEntry = { typeInfo, timestamp: Date.now() };
      this.cache.set(cacheKey, entry);

      return { typeInfo, degraded: false };
    } catch {
      // Degraded: LS unavailable or timeout
      return { typeInfo: null, degraded: true };
    }
  }

  /**
   * Parse type FQN and simple name from hover contents.
   * Handles both markdown (```java...```) and plain text hover formats.
   */
  parseTypeFromHover(contents: readonly (vscode.MarkedString | vscode.MarkdownString)[]): TypeInfo | null {
    if (!contents || contents.length === 0) {
      return null;
    }

    let text = '';
    for (const content of contents) {
      if (typeof content === 'string') {
        text = content;
        break;
      } else if (content && typeof content === 'object' && 'value' in content) {
        text = content.value;
        break;
      }
    }

    if (!text) {
      return null;
    }

    // Remove markdown code block formatting
    text = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();

    // Parse the type string. JDT LS typically returns "SimpleName FQN" or just "FQN".
    const parts = text.split(/\s+/);
    let typeStr = parts.length >= 2 ? parts[parts.length - 1] : parts[0];

    // Strip generic parameters for the FQN
    const fqn = typeStr.replace(/<.*>/, '').trim();
    const simpleName = fqn.substring(fqn.lastIndexOf('.') + 1);

    return {
      fqn,
      simpleName,
      allTypes: [fqn], // Base set; hierarchy expansion is lazy
    };
  }

  /**
   * Check if a resolved type matches any of the target types.
   * Uses the allTypes set which includes the full hierarchy.
   */
  typeMatches(typeInfo: TypeInfo, targetTypes: string[]): boolean {
    if (!targetTypes || targetTypes.length === 0) {
      return true;
    }

    return targetTypes.some((target) => typeInfo.allTypes.includes(target));
  }

  /**
   * Clear the type resolution cache.
   */
  clearCache(): void {
    this.cache.clear();
  }
}
