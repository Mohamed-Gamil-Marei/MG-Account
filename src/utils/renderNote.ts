export interface RenderNoteResult {
  renderedText: string;
  warnings: string[];
}

export interface NoteVariableContext {
  اسم_الشركة?: string;
  السنة?: string | number;
  تاريخ_القوائم?: string;
  [key: string]: any;
}

export function renderNote(templateBody: string, context: NoteVariableContext = {}): RenderNoteResult {
  const warnings: string[] = [];
  const regex = /\{\{([^}]+)\}\}/g;

  const renderedText = templateBody.replace(regex, (match, p1) => {
    const key = p1.trim();
    if (Object.prototype.hasOwnProperty.call(context, key) && context[key] !== undefined && context[key] !== null) {
      return String(context[key]);
    } else {
      warnings.push(`متغير غير معروف: {{${key}}}`);
      return match;
    }
  });

  return {
    renderedText,
    warnings,
  };
}
