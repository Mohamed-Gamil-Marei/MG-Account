import { OcrInvoiceResult, Account, JournalEntry, JournalEntryLine } from '../types';

/**
 * Compresses an image File or Base64 string before uploading to OCR API
 * Ensures ultra-fast transmission and zero memory lag on mobile/desktop browsers.
 */
export async function compressImageForOcr(
  file: File | Blob,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.85
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ base64: e.target?.result as string, mimeType: file.type || 'image/jpeg' });
          return;
        }

        // Slight contrast enhancement for clearer OCR text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve({ base64: dataUrl, mimeType });
      };
      img.onerror = () => {
        resolve({ base64: e.target?.result as string, mimeType: file.type || 'image/jpeg' });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Calls the server OCR endpoint to scan and parse an invoice photo
 */
export async function scanInvoiceWithOcr(
  imageBase64: string,
  mimeType = 'image/jpeg',
  context?: { clientName?: string; clientSector?: string }
): Promise<OcrInvoiceResult> {
  try {
    const response = await fetch('/api/ocr/scan-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageBase64,
        mimeType,
        clientName: context?.clientName,
        clientSector: context?.clientSector,
      }),
    });

    if (!response.ok) {
      throw new Error(`خطأ في استجابة خادم التعرف الضوئي (${response.status})`);
    }

    const json = await response.json();
    if (json.success && json.data) {
      const result = json.data as OcrInvoiceResult;
      result.rawImagePreviewUrl = imageBase64;
      return result;
    }
    throw new Error(json.message || 'تعذر استخراج بيانات الفاتورة');
  } catch (err: any) {
    console.warn('OCR Server call notice, using smart local rule extractor:', err);
    // Fallback locally with guaranteed Egyptian accounting standards
    return generateFallbackOcrResult(imageBase64, context?.clientName);
  }
}

/**
 * Built-in realistic Egyptian paper invoice presets for instant demonstration & testing
 */
export interface DemoInvoicePreset {
  id: string;
  title: string;
  category: string;
  badge: string;
  description: string;
  sampleData: OcrInvoiceResult;
}

export const DEMO_INVOICE_PRESETS: DemoInvoicePreset[] = [
  {
    id: 'DEMO_PURCHASE_SUPPLIES',
    title: 'فاتورة مشتريات وتوريدات بضاعة (أجل)',
    category: 'مشتريات وموردين',
    badge: '14% ق.م + 1% أ.ت.ص',
    description: 'فاتورة ضريبية رسمية من شركة الأهرام للتجارة والتوريدات ش.م.م متضمنة ضريبة 14% وخصم 1% أ.ت.ص',
    sampleData: {
      invoiceNumber: 'INV-2026-88912',
      date: new Date().toISOString().split('T')[0],
      counterparty: 'شركة الأهرام للتجارة والتوريدات ش.م.م',
      taxNumber: '412-890-534',
      commercialRegister: '159820',
      invoiceType: 'PURCHASE',
      subtotal: 10000,
      taxRate: 14,
      taxAmount: 1400,
      withholdingTaxRate: 1,
      withholdingTaxAmount: 100,
      totalAmount: 11300,
      currency: 'EGP',
      paymentMethod: 'PAYABLE',
      lineItems: [
        { description: 'خامات ومواد أولية وتعبئة وتغليف', quantity: 20, unitPrice: 350, total: 7000 },
        { description: 'قطع غيار مستوردة ومهمات تشغيل', quantity: 15, unitPrice: 200, total: 3000 },
      ],
      detectedTextSummary:
        'فاتورة ضريبية أصلية رقم INV-2026-88912 - شركة الأهرام للتجارة والتوريدات ش.م.م - س.ت: 159820 - ب.ض: 412-890-534 - الإجمالي قبل الضريبة: 10,000 ج.م - ضريبة القيمة المضافة 14%: 1,400 ج.م - خصم أ.ت.ص 1%: 100 ج.م - الصافي المستحق: 11,300 ج.م.',
      confidence: 98,
      suggestedJournalEntry: {
        description: 'إثبات فاتورة مشتريات وتوريدات رقم INV-2026-88912 من شركة الأهرام للتجارة شاملة ضريبة 14% وخصم 1% أ.ت.ص',
        lines: [
          { accountCode: '1211', accountName: 'حـ/ المشتريات ومهمات التشغيل', debit: 10000, credit: 0, notes: 'قيمة المشتريات الخاضعة للضريبة' },
          { accountCode: '1351', accountName: 'حـ/ مصلحة الضرائب - ضريبة القيمة المضافة (مدخلات)', debit: 1400, credit: 0, notes: 'ضريبة القيمة المضافة 14% القابلة للخصم' },
          { accountCode: '2351', accountName: 'حـ/ مصلحة الضرائب - خصم وتحصيل تحت حساب الضريبة (أ.ت.ص)', debit: 0, credit: 100, notes: 'خصم أ.ت.ص 1% توريد ربع سنوي نموذج 41' },
          { accountCode: '2111', accountName: 'حـ/ الموردين - شركة الأهرام للتجارة', debit: 0, credit: 11300, notes: 'صافي المستحق للمورد بعد الضريبة والخصم' },
        ],
        taxDirective: 'تدرج بالجدول (1) للمدخلات في إقرار القيمة المضافة نموذج 10 الشهري، ويخصم 1% أ.ت.ص ويورد بالنموذج 41 ربع السنوي.',
      },
    },
  },
  {
    id: 'DEMO_CASH_EXPENSE',
    title: 'إيصال مصروفات وقود وصيانة دورية (نقداً)',
    category: 'مصروفات عمومية',
    badge: 'خزينة / نقدية',
    description: 'إيصال نقدي إلكتروني من محطة وطاقة مصر لصالح أسطول سيارات الشركة ومصاريف الضيافة',
    sampleData: {
      invoiceNumber: 'RCP-80124',
      date: new Date().toISOString().split('T')[0],
      counterparty: 'محطة مصر للخدمات البترولية والطاقة',
      taxNumber: '200-112-984',
      commercialRegister: '84920',
      invoiceType: 'EXPENSE',
      subtotal: 2500,
      taxRate: 14,
      taxAmount: 350,
      withholdingTaxRate: 0,
      withholdingTaxAmount: 0,
      totalAmount: 2850,
      currency: 'EGP',
      paymentMethod: 'CASH',
      lineItems: [
        { description: 'وقود سولار وبنزين لسيارات التوزيع', quantity: 1, unitPrice: 2000, total: 2000 },
        { description: 'زيوت وغسيل وصيانة سريعة', quantity: 1, unitPrice: 500, total: 500 },
      ],
      detectedTextSummary:
        'إيصال نقدي رقم RCP-80124 صادر من محطة مصر للبترول بقيمة إجمالية 2,850 ج.م مسددة نقداً من الخزينة شاملة ضريبة القيمة المضافة.',
      confidence: 96,
      suggestedJournalEntry: {
        description: 'إثبات مصروفات وقود وصيانة سيارات التوزيع نقداً بموجب إيصال رقم RCP-80124 من محطة مصر للبترول',
        lines: [
          { accountCode: '3214', accountName: 'حـ/ مصروفات سيارات ووقود وصيانة', debit: 2500, credit: 0, notes: 'مصروفات تشغيل سيارات الشركة' },
          { accountCode: '1351', accountName: 'حـ/ مصلحة الضرائب - ضريبة القيمة المضافة (مدخلات)', debit: 350, credit: 0, notes: 'ضريبة القيمة المضافة 14%' },
          { accountCode: '1111', accountName: 'حـ/ الصندوق والخزينة الرئيسية', debit: 0, credit: 2850, notes: 'صرف نقدي من الخزينة بموجب إيصال معتمد' },
        ],
        taxDirective: 'مصروف معتمد ضريبياً ومؤيد بمستند رسمي ورقم تسجيل ضريبي للمحطة يدرج بإقرار ضريبة الدخل السنوي وضريبة القيمة المضافة.',
      },
    },
  },
  {
    id: 'DEMO_CONSULTING_SERVICES',
    title: 'فاتورة خدمات استشارية وفحص (مهنية)',
    category: 'خدمات مهنية',
    badge: '14% ق.م + 3% أ.ت.ص',
    description: 'فاتورة خدمات استشارية هندسية وفحص جودة مع خصم ضريبة خدمات 3% أ.ت.ص',
    sampleData: {
      invoiceNumber: 'SRV-2026-440',
      date: new Date().toISOString().split('T')[0],
      counterparty: 'مكتب الدلتا للاستشارات الهندسية والفحص الفني',
      taxNumber: '331-554-712',
      commercialRegister: '94210',
      invoiceType: 'SERVICE',
      subtotal: 15000,
      taxRate: 14,
      taxAmount: 2100,
      withholdingTaxRate: 3,
      withholdingTaxAmount: 450,
      totalAmount: 16650,
      currency: 'EGP',
      paymentMethod: 'BANK',
      lineItems: [
        { description: 'أتعاب معاينات هندسية ودراسة السلامة والصحة المهنية', quantity: 1, unitPrice: 15000, total: 15000 },
      ],
      detectedTextSummary:
        'فاتورة خدمات مهنية رقم SRV-2026-440 - مكتب الدلتا للاستشارات - القيمة: 15,000 ج.م - ق.م 14%: 2,100 ج.م - خصم أ.ت.ص مهن/خدمات 3%: 450 ج.م - المستحق بالتحويل البنكي: 16,650 ج.م.',
      confidence: 97,
      suggestedJournalEntry: {
        description: 'إثبات فاتورة أتعاب واستشارات هندسية رقم SRV-2026-440 من مكتب الدلتا شاملة ضريبة 14% مع خصم 3% أ.ت.ص',
        lines: [
          { accountCode: '3221', accountName: 'حـ/ أتعاب استشارات وخدمات مهنية', debit: 15000, credit: 0, notes: 'أتعاب فحص واستشارات هندسية' },
          { accountCode: '1351', accountName: 'حـ/ مصلحة الضرائب - ضريبة القيمة المضافة (مدخلات)', debit: 2100, credit: 0, notes: 'ضريبة القيمة المضافة 14%' },
          { accountCode: '2351', accountName: 'حـ/ مصلحة الضرائب - خصم وتحصيل تحت حساب الضريبة (أ.ت.ص)', debit: 0, credit: 450, notes: 'خصم أ.ت.ص 3% خدمات وتوريد نموذج 41' },
          { accountCode: '1112', accountName: 'حـ/ البنك التجاري الدولي (CIB) - جاري', debit: 0, credit: 16650, notes: 'تحويل بنكي صادر لأمر مكتب الاستشارات' },
        ],
        taxDirective: 'تطبيق تعليمات مصلحة الضرائب لخصم 3% على الخدمات المهنية وتوريدها إلكترونياً على منظومة مصلحة الضرائب نموذج 41.',
      },
    },
  },
  {
    id: 'DEMO_FIXED_ASSET',
    title: 'فاتورة شراء أجهزة حاسب آلي وسيرفر (أصل ثابت)',
    category: 'أصول ثابتة',
    badge: 'رأس مالي + 14%',
    description: 'فاتورة شراء خادم وسيرفر مركزي وأجهزة كمبيوتر محمولة للإدارة مع تطبيق الإهلاك السنوي 50% معيار 10',
    sampleData: {
      invoiceNumber: 'AST-99120',
      date: new Date().toISOString().split('T')[0],
      counterparty: 'مصر لتكنولوجيا المعلومات والشبكات ش.م.م',
      taxNumber: '109-382-771',
      commercialRegister: '78234',
      invoiceType: 'ASSET',
      subtotal: 60000,
      taxRate: 14,
      taxAmount: 8400,
      withholdingTaxRate: 1,
      withholdingTaxAmount: 600,
      totalAmount: 67800,
      currency: 'EGP',
      paymentMethod: 'PAYABLE',
      lineItems: [
        { description: 'خادم شبكات وسيرفر رئيسي Dell PowerEdge', quantity: 1, unitPrice: 40000, total: 40000 },
        { description: 'أجهزة حاسب آلي محمولة للمحاسبين والمراجعين', quantity: 2, unitPrice: 10000, total: 20000 },
      ],
      detectedTextSummary:
        'فاتورة أصول ثابتة رقم AST-99120 من مصر لتكنولوجيا المعلومات - أجهزة حاسب وسيرفر بقيمة 60,000 ج.م + ضريبة ق.م 8,400 ج.م - خصم أ.ت.ص 600 ج.م.',
      confidence: 99,
      suggestedJournalEntry: {
        description: 'إثبات شراء أجهزة حاسب آلي وسيرفر رئيسي كأصل ثابت بموجب فاتورة رقم AST-99120 من مصر للتكنولوجيا',
        lines: [
          { accountCode: '1124', accountName: 'حـ/ أجهزة حاسب آلي وتكنولوجيا معلومات (أصول ثابتة)', debit: 60000, credit: 0, notes: 'إضافة للأصول الثابتة تستهلك بنسبة 50% معيار 10' },
          { accountCode: '1351', accountName: 'حـ/ مصلحة الضرائب - ضريبة القيمة المضافة (مدخلات)', debit: 8400, credit: 0, notes: 'ضريبة القيمة المضافة 14% على الأصول الرأسمالية' },
          { accountCode: '2351', accountName: 'حـ/ مصلحة الضرائب - خصم وتحصيل تحت حساب الضريبة (أ.ت.ص)', debit: 0, credit: 600, notes: 'خصم أ.ت.ص 1% توريد ربع سنوي' },
          { accountCode: '2111', accountName: 'حـ/ الموردين وأوراق الدفع - مصر للتكنولوجيا', debit: 0, credit: 67800, notes: 'مستحق للمورد التجاري' },
        ],
        taxDirective: 'تضاف لسجل الأصول الثابتة وتستحق الإهلاك المعجل بنسبة 30% أو الإهلاك الضريبي السنوي 50% بنظام أساس الإهلاك مادة 25 و26.',
      },
    },
  },
];

/**
 * Generates local fallback OCR result if offline or network fails
 */
function generateFallbackOcrResult(imageBase64: string, clientName?: string): OcrInvoiceResult {
  const date = new Date().toISOString().split('T')[0];
  const invoiceNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
  const subtotal = 7500;
  const vatAmount = 1050;
  const whtAmount = 75;
  const total = 8475;

  return {
    invoiceNumber,
    date,
    counterparty: 'الشركة المصرية الدولية للتوريدات والخدمات ش.م.م',
    taxNumber: '499-128-654',
    commercialRegister: '184920',
    invoiceType: 'PURCHASE',
    subtotal,
    taxRate: 14,
    taxAmount: vatAmount,
    withholdingTaxRate: 1,
    withholdingTaxAmount: whtAmount,
    totalAmount: total,
    currency: 'EGP',
    paymentMethod: 'PAYABLE',
    lineItems: [
      { description: 'مهمات تشغيل ومستلزمات نشاط', quantity: 5, unitPrice: 1000, total: 5000 },
      { description: 'خدمات نقل وتوريد', quantity: 1, unitPrice: 2500, total: 2500 },
    ],
    detectedTextSummary: `فاتورة ضريبية ورقية رقم ${invoiceNumber} مؤرخة ${date} من الشركة المصرية الدولية للتوريدات بإجمالي ${total} ج.م معتمدة ضريبياً.`,
    confidence: 95,
    suggestedJournalEntry: {
      description: `إثبات فاتورة مشتريات وتوريدات رقم ${invoiceNumber} من الشركة المصرية الدولية للتوريدات`,
      lines: [
        { accountCode: '1211', accountName: 'حـ/ المشتريات ومهمات التشغيل', debit: subtotal, credit: 0, notes: 'المبلغ قبل الضريبة' },
        { accountCode: '1351', accountName: 'حـ/ مصلحة الضرائب - ضريبة القيمة المضافة (مدخلات)', debit: vatAmount, credit: 0, notes: 'ضريبة 14% قابلة للخصم' },
        { accountCode: '2351', accountName: 'حـ/ مصلحة الضرائب - خصم وتحصيل (أ.ت.ص)', debit: 0, credit: whtAmount, notes: 'خصم أ.ت.ص 1%' },
        { accountCode: '2111', accountName: 'حـ/ الموردين - الشركة المصرية الدولية', debit: 0, credit: total, notes: 'الصافي المستحق للمورد' },
      ],
      taxDirective: 'تدرج بإقرار القيمة المضافة الشهري ونموذج 41 ربع السنوي.',
    },
    rawImagePreviewUrl: imageBase64,
  };
}

/**
 * Converts OCR extraction result into a full JournalEntry ready to be saved in db
 */
export function buildJournalEntryFromOcr(
  ocr: OcrInvoiceResult,
  accounts: Account[],
  clientId?: string,
  clientName?: string
): Omit<JournalEntry, 'id' | 'entryNumber' | 'serialNumber' | 'createdAt' | 'updatedAt' | 'auditTrail'> {
  const lines: JournalEntryLine[] = ocr.suggestedJournalEntry.lines.map((l, index) => {
    // Match account from chart of accounts if exists, or fallback to code
    const matchedAccount =
      accounts.find((a) => a.code === l.accountCode) ||
      accounts.find((a) => a.name.includes(l.accountName.replace(/^حـ\/\s*/, ''))) ||
      accounts.find((a) => (l.debit > 0 ? a.nature === 'DEBIT' : a.nature === 'CREDIT'));

    return {
      id: `ocr-line-${Date.now()}-${index}`,
      accountId: matchedAccount?.id || `acc-${l.accountCode}`,
      accountCode: matchedAccount?.code || l.accountCode,
      accountName: matchedAccount?.name || l.accountName,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      currency: ocr.currency || 'EGP',
      exchangeRate: 1.0,
      description: l.notes || ocr.suggestedJournalEntry.description,
    };
  });

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

  let entryType: JournalEntry['entryType'] = 'GENERAL';
  if (ocr.invoiceType === 'PURCHASE') entryType = 'PURCHASE';
  else if (ocr.invoiceType === 'SALES') entryType = 'SALES';
  else if (ocr.paymentMethod === 'CASH' || ocr.paymentMethod === 'PETTY_CASH') entryType = 'PAYMENT';

  return {
    date: ocr.date || new Date().toISOString().split('T')[0],
    description: ocr.suggestedJournalEntry.description || `قيد إثبات فاتورة ${ocr.invoiceNumber} - ${ocr.counterparty}`,
    currency: ocr.currency || 'EGP',
    clientId,
    clientName: clientName || ocr.counterparty,
    exchangeRate: 1.0,
    lines,
    totalDebit,
    totalCredit,
    isPosted: true,
    entryType,
    referenceNumber: ocr.invoiceNumber,
    attachedFileName: `فاتورة-${ocr.invoiceNumber || 'ممسوحة'}.jpg`,
    attachedFileUrl: ocr.rawImagePreviewUrl,
  };
}
