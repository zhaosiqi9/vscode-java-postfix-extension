/**
 * vscode mock for unit tests.
 * Provides stub objects that sinon can stub on top of.
 */

export type Thenable<T> = PromiseLike<T>;

export const workspace = {
  getConfiguration: (_section?: string, _scope?: any) => ({
    get: <T>(_section: string, _defaultValue?: T): T | undefined => undefined,
  }),
  workspaceFolders: undefined as any,
  fs: undefined as any,
  onDidChangeConfiguration: (_listener: (e: ConfigurationChangeEvent) => any) => ({ dispose: () => {} }),
};

export class Uri {
  static joinPath(_base: Uri, ..._pathSegments: string[]): Uri {
    return new Uri();
  }
  static file(_path: string): Uri {
    return new Uri();
  }
  static parse(_value: string): Uri {
    return new Uri();
  }
  fsPath!: string;
  scheme!: string;
  authority!: string;
  path!: string;
  query!: string;
  fragment!: string;
  toJSON(): any {
    return {};
  }
}

export interface WorkspaceConfiguration {
  get<T>(section: string, defaultValue?: T): T | undefined;
}

export const EventEmitter = class {
  event = () => ({ dispose: () => {} });
  fire = () => {};
  dispose = () => {};
};

export const window = {
  activeTextEditor: undefined as TextEditor | undefined,
  showInformationMessage: (_message: string, ..._items: any[]) => undefined,
  showWarningMessage: (_message: string, ..._items: any[]) => undefined,
  showErrorMessage: (_message: string, ..._items: any[]) => undefined,
  showQuickPick: (): Thenable<any> => Promise.resolve(undefined),
  createOutputChannel: () => ({ appendLine: () => {}, dispose: () => {}, show: () => {} }),
  createQuickPick: (): QuickPick => ({
    title: undefined as any,
    placeholder: undefined as any,
    items: [],
    selectedItems: [],
    value: '',
    busy: false,
    enabled: true,
    ignoreFocusOut: false,
    matchOnDescription: false,
    matchOnDetail: false,
    canSelectMany: false,
    step: undefined,
    totalSteps: undefined,
    buttons: [],
    onDidChangeValue: (_listener: (e: string) => any) => ({ dispose: () => {} }),
    onDidAccept: (_listener: () => any) => ({ dispose: () => {} }),
    onDidChangeSelection: (_listener: (e: readonly QuickPickItem[]) => any) => ({ dispose: () => {} }),
    onDidHide: (_listener: () => any) => ({ dispose: () => {} }),
    onDidTriggerButton: (_listener: (e: any) => any) => ({ dispose: () => {} }),
    show: () => {},
    hide: () => {},
    dispose: () => {},
  }),
};

export const commands = {
  executeCommand: () => undefined,
  registerCommand: (
    _command: string,
    _callback: (...args: any[]) => any
  ) => ({ dispose: () => {} }),
  registerTextEditorCommand: (
    _command: string,
    _callback: (textEditor: any, edit: any, ...args: any[]) => void
  ) => ({ dispose: () => {} }),
};

export class Position {
  constructor(_line: number, _character: number) {}
  line!: number;
  character!: number;
}

export class Selection extends Position {
  anchor!: Position;
  active!: Position;
  isReversed!: boolean;
  constructor(anchor: Position, active: Position) {
    super(anchor.line, anchor.character);
    this.anchor = anchor;
    this.active = active;
  }
}

export interface TextDocument {
  uri: Uri;
  fileName: string;
  isUntitled: boolean;
  languageId: string;
  version: number;
  isDirty: boolean;
  isClosed: boolean;
  save(): Thenable<boolean>;
  lineCount: number;
  lineAt(line: number): { text: string; range: Range };
  offsetAt(position: Position): number;
  positionAt(offset: number): Position;
  getText(range?: Range): string;
  getWordRangeAtPosition(position: Position): Range | undefined;
  validateRange(range: Range): Range;
  validatePosition(position: Position): Position;
}

export class Range {
  start!: Position;
  end!: Position;
  isEmpty!: boolean;
  isSingleLine!: boolean;

  constructor(start: Position, end: Position);
  constructor(startLine: number, startCol: number, endLine: number, endCol: number);
  constructor(a: Position | number, b: Position | number, c?: number, d?: number) {
    if (a instanceof Position && b instanceof Position) {
      this.start = a;
      this.end = b;
    } else if (typeof a === 'number' && typeof b === 'number') {
      this.start = new Position(a, b);
      this.end = new Position(c!, d!);
    }
  }
}

export type MarkedString = string | { language: string; value: string };

export interface MarkdownString {
  value: string;
  isTrusted?: boolean;
  supportThemeIcons?: boolean;
  supportHtml?: boolean;
  baseUri?: Uri;
}

export interface Hover {
  contents: Array<MarkdownString | MarkedString>;
  range?: Range;
}

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export class ConfigurationChangeEvent {
  affectsConfiguration(_section: string): boolean {
    return false;
  }
}

export class InlineCompletionItem {
  insertText!: string;
  filterText?: string;
  range?: Range;
  command?: any;

  constructor(insertText: string, range?: Range) {
    this.insertText = insertText;
    this.range = range;
  }
}

export enum InlineCompletionTriggerKind {
  Automatic = 0,
  Explicit = 1,
}

export interface InlineCompletionContext {
  triggerKind: InlineCompletionTriggerKind;
  selectedCompletionInfo?: { range: Range; text: string; completionKind: number };
}

export interface InlineCompletionItemProvider {
  provideInlineCompletionItems(
    document: TextDocument,
    position: Position,
    context: InlineCompletionContext,
    token: CancellationToken
  ): any;
}

export class CancellationTokenSource {
  token: CancellationToken = {
    isCancellationRequested: false,
    onCancellationRequested: (_listener: any) => ({ dispose: () => {} }),
  };
  cancel(): void {}
  dispose(): void {}
}

export interface CancellationToken {
  isCancellationRequested: boolean;
  onCancellationRequested(listener: (e: any) => any): { dispose(): void };
}

export class ThemeIcon {
  id: string;
  color?: any;
  constructor(id: string, color?: any) {
    this.id = id;
    this.color = color;
  }
}

export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
  picked?: boolean;
  alwaysShow?: boolean;
  buttons?: readonly any[];
  iconPath?: ThemeIcon | Uri | { light: Uri; dark: Uri };
}

export interface QuickPick {
  title: string | undefined;
  placeholder: string | undefined;
  items: readonly QuickPickItem[];
  selectedItems: readonly QuickPickItem[];
  value: string;
  busy: boolean;
  enabled: boolean;
  ignoreFocusOut: boolean;
  matchOnDescription: boolean;
  matchOnDetail: boolean;
  canSelectMany: boolean;
  step: number | undefined;
  totalSteps: number | undefined;
  buttons: readonly any[];
  onDidChangeValue: (listener: (e: string) => any) => { dispose(): void };
  onDidAccept: (listener: () => any) => { dispose(): void };
  onDidChangeSelection: (listener: (e: readonly QuickPickItem[]) => any) => { dispose(): void };
  onDidHide: (listener: () => any) => { dispose(): void };
  onDidTriggerButton: (listener: (e: any) => any) => { dispose(): void };
  show(): void;
  hide(): void;
  dispose(): void;
}

export interface ExtensionContext {
  subscriptions: Array<{ dispose(): any }>;
  extensionPath: string;
  globalState: any;
  workspaceState: any;
}

export const languages = {
  registerInlineCompletionItemProvider: (
    _selector: any,
    _provider: InlineCompletionItemProvider
  ) => ({ dispose: () => {} }),
  registerCompletionItemProvider: (
    _selector: any,
    _provider: CompletionItemProvider,
    ..._triggerCharacters: string[]
  ) => ({ dispose: () => {} }),
};

export const Disposable = class {
  static from(..._disposables: any[]): void {}
};

export interface TextEditorEdit {
  replace(location: any, value: string): void;
  insert(location: any, value: string): void;
  delete(location: any): void;
  setEndOfLine(endOfLine: any): void;
}

export interface TextEditor {
  document: TextDocument;
  selection: { start: Position; end: Position; active: Position; anchor: Position; isEmpty: boolean };
  selections: readonly any[];
  visibleRanges: readonly Range[];
  options: any;
  viewColumn?: any;
  edit(callback: (editBuilder: TextEditorEdit) => void, options?: { undoStopBefore: boolean; undoStopAfter: boolean }): Thenable<boolean>;
  insertSnippet(snippet: any, location?: any, options?: { undoStopBefore: boolean; undoStopAfter: boolean }): Thenable<boolean>;
  setDecorations(decorationType: any, rangesOrOptions: readonly Range[] | any): void;
  revealRange(range: Range, revealType?: any): void;
  show(column?: any): void;
  hide(): void;
}

export enum CompletionItemKind {
  Text = 0,
  Method = 1,
  Function = 2,
  Constructor = 3,
  Field = 4,
  Variable = 5,
  Class = 6,
  Interface = 7,
  Module = 8,
  Property = 9,
  Unit = 10,
  Value = 11,
  Enum = 12,
  Keyword = 13,
  Snippet = 14,
  Color = 15,
  File = 16,
  Reference = 17,
  Folder = 18,
  EnumMember = 19,
  Constant = 20,
  Struct = 21,
  Event = 22,
  Operator = 23,
  TypeParameter = 24,
}

export class SnippetString {
  value: string;
  constructor(value: string) {
    this.value = value;
  }
}

export class CompletionItem {
  label!: string | CompletionItemLabel;
  kind?: CompletionItemKind;
  detail?: string;
  documentation?: string | MarkdownString;
  sortText?: string;
  filterText?: string;
  preselect?: boolean;
  insertText?: string | SnippetString;
  range?: Range | { inserting: Range; replacing: Range };
  command?: any;
  additionalTextEdits?: any[];
  commitCharacters?: string[];
  keepWhitespace?: boolean;
  constructor(label: string | CompletionItemLabel, kind?: CompletionItemKind) {
    this.label = label;
    this.kind = kind;
  }
}

export interface CompletionItemLabel {
  label: string;
  detail?: string;
  description?: string;
}

export interface CompletionItemProvider {
  provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext
  ): ProviderResult<CompletionItem[] | CompletionList>;
}

export interface CompletionContext {
  triggerKind: CompletionTriggerKind;
  triggerCharacter?: string;
}

export enum CompletionTriggerKind {
  Invoke = 0,
  TriggerCharacter = 1,
  TriggerForIncompleteCompletions = 2,
}

export interface CompletionList {
  isIncomplete?: boolean;
  items: CompletionItem[];
}

export type ProviderResult<T> = T | undefined | null | Thenable<T | undefined | null>;
