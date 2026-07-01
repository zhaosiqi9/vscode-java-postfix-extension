/**
 * Core type definitions for the Java Postfix Completion extension.
 */

/** A single postfix template as defined by the user in configuration. */
export interface PostfixTemplate {
  /** Human-readable name, used in logs and error messages. */
  name: string;
  /** Trigger suffix, must start with '.' (e.g. ".null", ".sout"). */
  suffix: string;
  /** Template body with placeholders: $EXPR$, $TYPE$, $TYPE_SIMPLE$, $VAR$, $END$. */
  body: string;
  /** Fully-qualified type names this template applies to. Empty means match all. */
  types?: string[];
  /** Optional description of what this template does. */
  description?: string;
}

/** Result of extracting an expression and suffix from user input. */
export interface ExpressionExtraction {
  /** The expression text before the suffix, or empty string if invalid. */
  expr: string;
  /** The suffix text (without the leading dot). */
  suffix: string;
  /** Whether the extraction found a structurally valid pattern. */
  valid: boolean;
}

/** Result of validating that an expression is a real Java identifier/expression. */
export interface ValidationResult {
  /** Whether the expression is a valid, resolvable Java expression. */
  isValid: boolean;
  /** The expression text that was validated. */
  expr: string;
}

/** Cached type information for a Java type, including its full hierarchy. */
export interface TypeInfo {
  /** The fully-qualified name, e.g. "java.lang.String". */
  fqn: string;
  /** The simple class name, e.g. "String". */
  simpleName: string;
  /** All types in the hierarchy (self + all supertypes), as FQNs. */
  allTypes: string[];
}

/** Result of resolving type information for an expression. */
export interface TypeResolution {
  /** The type info if resolution succeeded, or null if unavailable. */
  typeInfo: TypeInfo | null;
  /** Whether the resolution was degraded (timeout, LS unavailable). */
  degraded: boolean;
}

/** Result of matching a template against an expression and its type. */
export interface TemplateMatch {
  /** The matched template. */
  template: PostfixTemplate;
  /** The resolved type info, or null if type resolution was not needed or unavailable. */
  typeInfo: TypeInfo | null;
  /** Priority score: lower = higher priority (more specific type match). */
  priority: number;
}

/** The final generated completion to insert. */
export interface CompletionResult {
  /** The text to insert, with all placeholders resolved. */
  insertText: string;
  /** The range of the original expression+suffix to replace. */
  range: { startLine: number; startCol: number; endLine: number; endCol: number };
  /** Cursor position after insertion, relative to the start of the inserted text. */
  cursorOffset: number;
}

/** Supported placeholder types in template bodies. */
export enum Placeholder {
  EXPR = '$EXPR$',
  TYPE = '$TYPE$',
  TYPE_SIMPLE = '$TYPE_SIMPLE$',
  VAR = '$VAR$',
  END = '$END$',
}
