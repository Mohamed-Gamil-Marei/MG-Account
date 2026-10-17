export interface RenderNoteResult {
  renderedText: string;
  warnings: string[];
}

export function renderNote(
  template: string,
  context: Record<string, string | number | undefined | null> = {}
): RenderNoteResult {
  if (!template) {
    return { renderedText: '', warnings: [] };
  }

  const warnings: string[] = [];
  const renderedText = template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, varName) => {
    const key = String(varName).trim();
    const val = context[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val);
    }
    warnings.push(`المتغير غير معرّف أو فارغ: ${key}`);
    return match;
  });

  return { renderedText, warnings };
}
