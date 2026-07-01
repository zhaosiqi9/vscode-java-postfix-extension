import * as vscode from 'vscode';
import { PostfixTemplate } from './types';

export class ConfigManager {
  private templatesCache: PostfixTemplate[] | null = null;
  private projectConfigPath = '.vscode/java-postfix.json';

  async getAllTemplates(): Promise<PostfixTemplate[]> {
    if (this.templatesCache !== null) {
      console.log('[Java Postfix] ConfigManager: 使用缓存 (%d 个模板)', this.templatesCache.length);
      return this.templatesCache;
    }

    const globalTemplates = this.getGlobalTemplates();
    console.log('[Java Postfix] ConfigManager: 全局模板 %d 个', globalTemplates.length);

    const projectTemplates = await this.getProjectTemplates();
    console.log('[Java Postfix] ConfigManager: 项目模板 %d 个', projectTemplates.length);
    if (projectTemplates.length > 0) {
      projectTemplates.forEach(t => console.log('[Java Postfix]   项目模板: suffix="%s" name="%s"', t.suffix, t.name));
    }

    const merged = this.mergeTemplates(projectTemplates, globalTemplates);
    console.log('[Java Postfix] ConfigManager: 合并后 %d 个模板', merged.length);

    const validated = this.validateTemplates(merged);
    console.log('[Java Postfix] ConfigManager: 验证后 %d 个模板', validated.length);
    if (validated.length !== merged.length) {
      console.log('[Java Postfix] ConfigManager: 警告 — %d 个模板被过滤掉了!', merged.length - validated.length);
    }

    this.templatesCache = validated;
    return validated;
  }

  async reload(): Promise<void> {
    this.templatesCache = null;
  }

  private getGlobalTemplates(): PostfixTemplate[] {
    const config = vscode.workspace.getConfiguration('javaPostfixCompletion');
    return config.get<PostfixTemplate[]>('templates') ?? [];
  }

  private async getProjectTemplates(): Promise<PostfixTemplate[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }

    try {
      const projectConfigUri = vscode.Uri.joinPath(
        workspaceFolders[0].uri,
        this.projectConfigPath
      );
      const content = await vscode.workspace.fs.readFile(projectConfigUri);
      const text = new TextDecoder().decode(content);
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed as PostfixTemplate[];
      }
      return [];
    } catch {
      return [];
    }
  }

  private mergeTemplates(
    project: PostfixTemplate[],
    global: PostfixTemplate[]
  ): PostfixTemplate[] {
    const projectSuffixes = new Set(project.map((t) => t.suffix));
    const merged = [...project];
    for (const t of global) {
      if (!projectSuffixes.has(t.suffix)) {
        merged.push(t);
      }
    }
    return merged;
  }

  private validateTemplates(templates: PostfixTemplate[]): PostfixTemplate[] {
    const valid: PostfixTemplate[] = [];
    for (let t of templates) {
      if (t.suffix && !t.suffix.startsWith('.')) {
        console.warn(
          `[Java Postfix] Template "${t.name}": suffix "${t.suffix}" is missing leading dot, auto-prefixing.`
        );
        t = { ...t, suffix: '.' + t.suffix };
      }
      if (!t.body || t.body.trim().length === 0) {
        console.warn(
          `[Java Postfix] Template "${t.name}": body is empty, skipping.`
        );
        continue;
      }
      valid.push(t);
    }
    return valid;
  }
}
