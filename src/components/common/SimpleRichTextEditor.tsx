import React, { useRef, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Highlighter,
  Eraser,
  Undo,
  Redo,
  Sparkles,
  Eye,
  Edit3,
} from 'lucide-react';

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (htmlContent: string) => void;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
}

export const SimpleRichTextEditor: React.FC<SimpleRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'اكتب تفاصيل الإيضاح المحاسبي والملاحظات المهنية هنا...',
  minHeight = '140px',
  readOnly = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Sync internal HTML content when value changes externally (and editor not active)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Check if user is typing or if it's external update
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (readOnly) return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleApplyTemplate = (type: 'POLICY' | 'AUDIT' | 'BREAKDOWN') => {
    let tpl = '';
    if (type === 'POLICY') {
      tpl = `<p><strong>السياسة المحاسبية المتبعة:</strong></p><ul><li>يتم إثبات البند بالتكلفة التاريخية وفقاً لمعايير المحاسبة المصرية (EAS).</li><li>يتم تقييم الأرصدة في نهاية كل فترة مالية مع تكوين المخصصات اللازمة لمقابلة أي انخفاض متوقع.</li></ul>`;
    } else if (type === 'AUDIT') {
      tpl = `<p><strong>ملاحظة مراقب الحسابات والفحص الضريبي:</strong></p><blockquote>تمت مطابقة الأرصدة مع المصادقات الخارجية ومحاضر الجرد الفعلي المعتمدة حتى تاريخ إقفال المركز المالي دون وجود أية فروقات جوهرية.</blockquote>`;
    } else if (type === 'BREAKDOWN') {
      tpl = `<p><strong>بيان التحليل والتفصيل:</strong></p><p>تتكون هذه القيمة من الأرصدة القائمة والمستندات الثبوتية المؤيدة طرف المنشأة والمعتمدة من الإدارة المالية.</p>`;
    }

    if (editorRef.current) {
      const current = editorRef.current.innerHTML;
      const combined = current ? `${current}<br/>${tpl}` : tpl;
      editorRef.current.innerHTML = combined;
      onChange(combined);
    }
  };

  return (
    <div className={`rounded-xl border transition-all ${isFocused ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-300'} bg-white overflow-hidden text-right`} dir="rtl">
      {/* Toolbar */}
      {!readOnly && (
        <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center justify-between gap-1 select-none">
          <div className="flex flex-wrap items-center gap-1">
            {/* Text Styling */}
            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => executeCommand('bold')}
                title="خط عريض (Ctrl+B)"
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-blue-700 cursor-pointer"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('italic')}
                title="خط مائل (Ctrl+I)"
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-blue-700 cursor-pointer"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('underline')}
                title="تسطير (Ctrl+U)"
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-blue-700 cursor-pointer"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('strikeThrough')}
                title="يتوسطه خط"
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-blue-700 cursor-pointer"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Headings */}
            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => executeCommand('formatBlock', '<h2>')}
                title="عنوان رئيسي (H2)"
                className="px-2 py-1 hover:bg-slate-100 rounded text-slate-700 hover:text-blue-700 text-xs font-bold cursor-pointer"
              >
                عـنوان 1
              </button>
              <button
                type="button"
                onClick={() => executeCommand('formatBlock', '<h3>')}
                title="عنوان فرعي (H3)"
                className="px-2 py-1 hover:bg-slate-100 rounded text-slate-700 hover:text-blue-700 text-xs font-bold cursor-pointer"
              >
                عـنوان 2
              </button>
              <button
                type="button"
                onClick={() => executeCommand('formatBlock', '<p>')}
                title="فقرة عادية"
                className="px-2 py-1 hover:bg-slate-100 rounded text-slate-700 hover:text-blue-700 text-xs font-medium cursor-pointer"
              >
                فقرة
              </button>
            </div>

            {/* Lists & Quotes */}
            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => executeCommand('insertUnorderedList')}
                title="قائمة نقطية"
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-blue-700 cursor-pointer"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('insertOrderedList')}
                title="قائمة رقمية"
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-blue-700 cursor-pointer"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('formatBlock', '<blockquote>')}
                title="اقتباس أو إيضاح هام"
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-blue-700 cursor-pointer"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('hiliteColor', '#fef08a')}
                title="تمييز باللون الأصفر"
                className="p-1.5 hover:bg-slate-100 rounded text-amber-700 hover:text-amber-900 cursor-pointer"
              >
                <Highlighter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('removeFormat')}
                title="مسح التنسيق"
                className="p-1.5 hover:bg-slate-100 rounded text-rose-600 hover:text-rose-800 cursor-pointer"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Alignment */}
            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => executeCommand('justifyRight')}
                title="محاذاة لليمين"
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-blue-700 cursor-pointer"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('justifyCenter')}
                title="محاذاة للوسط"
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-blue-700 cursor-pointer"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('justifyLeft')}
                title="محاذاة لليسار"
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-blue-700 cursor-pointer"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Smart Templates */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-400 font-medium hidden sm:inline">نماذج سريعة:</span>
            <button
              type="button"
              onClick={() => handleApplyTemplate('POLICY')}
              className="px-2 py-1 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-md font-bold cursor-pointer transition-colors"
            >
              + سياسة محاسبية
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate('AUDIT')}
              className="px-2 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-md font-bold cursor-pointer transition-colors"
            >
              + ملاحظة مراجعة
            </button>
            <button
              type="button"
              onClick={() => setIsPreview(!isPreview)}
              className={`p-1.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors ${
                isPreview ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
              title={isPreview ? 'العودة للمحرر' : 'معاينة النتيجة'}
            >
              {isPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="text-[11px] font-bold">{isPreview ? 'تعديل' : 'معاينة'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Editor Content Area */}
      {isPreview ? (
        <div
          className="p-4 bg-slate-50/50 text-slate-900 leading-relaxed font-sans prose prose-slate max-w-none text-right"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: value || '<p class="text-slate-400 italic">لا توجد تفاصيل مكتوبة بعد...</p>' }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          dir="rtl"
          style={{ minHeight }}
          className="p-4 outline-none text-slate-900 font-sans leading-relaxed text-sm focus:ring-0 focus:border-transparent empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none selection:bg-blue-100 selection:text-blue-900"
          data-placeholder={placeholder}
        />
      )}
    </div>
  );
};
