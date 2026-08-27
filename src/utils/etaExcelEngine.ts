/**
 * محرك استيراد وتصدير فواتير منظومة الضرائب المصرية عبر الإكسل وجميع الصيغ الممكنة
 * (ETA Multi-Format & Excel Import/Export Engine)
 * يدعم: Excel (.xlsx, .xls), CSV, ETA JSON (v1.0 / v0.9), ETA XML (UBL), و Printable Sheets.
 */

import * as XLSX from 'xlsx';
import { Invoice, InvoiceItem } from '../types';
import { etaService } from './etaSdkEngine';

export interface ParsedImportResult {
  success: boolean;
  invoices: Omit<Invoice, 'id' | 'createdAt'>[];
  errors: string[];
  warnings: string[];
  totalRowsRead: number;
}

export class EtaExcelEngine {
  // --- 1. Generate & Download Official Excel Import Template ---
  public static downloadEtaExcelTemplate() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Invoices & Items Data
    const templateData = [
      {
        'رقم الفاتورة': 'INV-2026-0101',
        'تاريخ الفاتورة (YYYY-MM-DD)': '2026-02-28',
        'نوع المستند (I:فاتورة / C:إشعار دائن / D:إشعار مدين / R:إيصال)': 'I',
        'نوع المستلم (B:شركة / P:فرد / F:أجنبي)': 'B',
        'اسم العميل / الشركة': 'شركة الأمل للصناعات الهندسية والتجارة',
        'الرقم الضريبي للعميل (9 أرقام)': '390-182-441',
        'الرقم القومي (للأفراد > 50 ألف)': '',
        'عنوان العميل': 'مدينة نصر - القاهرة',
        'كود الصنف (EGS / GS1)': 'EG-100200300-SRV001',
        'نوع التكويد (EGS / GS1)': 'EGS',
        'بيان ووصف الخدمة أو الصنف': 'أتعاب مراجعة واعتماد القوائم المالية السنوية 2025',
        'وحدة القياس (EA/C62/JOB/HUR)': 'JOB',
        'الكمية': 1,
        'سعر الوحدة (ج.م)': 45000,
        'نسبة الخصم %': 0,
        'نسبة ضريبة القيمة المضافة T1 %': 14,
        'نسبة الخصم والتحصيل T4 %': 1,
        'طريقة السداد (BANK / CASH / INSTAPAY)': 'BANK',
        'ملاحظات إضافية': 'فاتورة أتعاب مهنية متوافقة مع منظومة الفاتورة الإلكترونية',
      },
      {
        'رقم الفاتورة': 'INV-2026-0101',
        'تاريخ الفاتورة (YYYY-MM-DD)': '2026-02-28',
        'نوع المستند (I:فاتورة / C:إشعار دائن / D:إشعار مدين / R:إيصال)': 'I',
        'نوع المستلم (B:شركة / P:فرد / F:أجنبي)': 'B',
        'اسم العميل / الشركة': 'شركة الأمل للصناعات الهندسية والتجارة',
        'الرقم الضريبي للعميل (9 أرقام)': '390-182-441',
        'الرقم القومي (للأفراد > 50 ألف)': '',
        'عنوان العميل': 'مدينة نصر - القاهرة',
        'كود الصنف (EGS / GS1)': 'EG-100200300-SRV002',
        'نوع التكويد (EGS / GS1)': 'EGS',
        'بيان ووصف الخدمة أو الصنف': 'استشارات وإعداد ملف الفحص الضريبي لكسب العمل',
        'وحدة القياس (EA/C62/JOB/HUR)': 'JOB',
        'الكمية': 1,
        'سعر الوحدة (ج.م)': 15000,
        'نسبة الخصم %': 0,
        'نسبة ضريبة القيمة المضافة T1 %': 14,
        'نسبة الخصم والتحصيل T4 %': 1,
        'طريقة السداد (BANK / CASH / INSTAPAY)': 'BANK',
        'ملاحظات إضافية': 'بند ثاني على نفس الفاتورة رقم INV-2026-0101',
      },
      {
        'رقم الفاتورة': 'REC-2026-0005',
        'تاريخ الفاتورة (YYYY-MM-DD)': '2026-02-28',
        'نوع المستند (I:فاتورة / C:إشعار دائن / D:إشعار مدين / R:إيصال)': 'R',
        'نوع المستلم (B:شركة / P:فرد / F:أجنبي)': 'P',
        'اسم العميل / الشركة': 'د/ أحمد مصطفى السعيد',
        'الرقم الضريبي للعميل (9 أرقام)': '',
        'الرقم القومي (للأفراد > 50 ألف)': '28503120101992',
        'عنوان العميل': 'الدقي - الجيزة',
        'كود الصنف (EGS / GS1)': 'EG-100200300-CERT01',
        'نوع التكويد (EGS / GS1)': 'EGS',
        'بيان ووصف الخدمة أو الصنف': 'إصدار وتوثيق شهادة إثبات دخل محاسب قانوني معتمدة',
        'وحدة القياس (EA/C62/JOB/HUR)': 'EA',
        'الكمية': 1,
        'سعر الوحدة (ج.م)': 3500,
        'نسبة الخصم %': 0,
        'نسبة ضريبة القيمة المضافة T1 %': 14,
        'نسبة الخصم والتحصيل T4 %': 0,
        'طريقة السداد (BANK / CASH / INSTAPAY)': 'INSTAPAY',
        'ملاحظات إضافية': 'إيصال إلكتروني B2C لنقطة بيع معتمدة',
      },
    ];

    const ws1 = XLSX.utils.json_to_sheet(templateData);

    // Styling column widths for Arabic readability
    ws1['!cols'] = [
      { wch: 18 }, // رقم الفاتورة
      { wch: 16 }, // التاريخ
      { wch: 16 }, // نوع المستند
      { wch: 14 }, // نوع المستلم
      { wch: 36 }, // اسم العميل
      { wch: 18 }, // الرقم الضريبي
      { wch: 20 }, // الرقم القومي
      { wch: 25 }, // العنوان
      { wch: 24 }, // كود الصنف
      { wch: 12 }, // نوع التكويد
      { wch: 45 }, // البيان
      { wch: 14 }, // الوحدة
      { wch: 10 }, // الكمية
      { wch: 16 }, // سعر الوحدة
      { wch: 12 }, // نسبة الخصم
      { wch: 16 }, // ضريبة القيمة المضافة
      { wch: 16 }, // الخصم والتحصيل
      { wch: 14 }, // طريقة السداد
      { wch: 30 }, // ملاحظات
    ];

    XLSX.utils.book_append_sheet(wb, ws1, 'بيانات الفواتير والإيصالات');

    // Sheet 2: Tax Reference Table & Instructions
    const guideData = [
      { 'كود الضريبة': 'T1', 'اسم الضريبة': 'ضريبة القيمة المضافة (VAT)', 'النسبة الشائعة': '14%', 'ملاحظات': 'تطبق على السلع والخدمات الخاضعة' },
      { 'كود الضريبة': 'T4', 'اسم الضريبة': 'خصم وتحصيل تحت حساب الضريبة (WHT)', 'النسبة الشائعة': '1% (توريدات وخدمات) / 3% (مهن حرة)', 'ملاحظات': 'تخصم من قيمة الفاتورة لصالح مصلحة الضرائب' },
      { 'نوع المستند': 'I', 'المسمى': 'فاتورة مبيعات أصلية (Invoice)', 'النظام': 'الفاتورة الإلكترونية B2B', 'ملاحظات': 'تتطلب رقم ضريبي صالح للمستلم' },
      { 'نوع المستند': 'R', 'المسمى': 'إيصال إلكتروني (e-Receipt)', 'النظام': 'الإيصال الإلكتروني B2C', 'ملاحظات': 'للمستهلك النهائي أو الأفراد' },
      { 'نوع التكويد': 'EGS', 'المسمى': 'Egyptian Goods and Services', 'النمط': 'EG-[الرقم الضريبي]-[كود الصنف الداخلي]', 'ملاحظات': 'مربوط بكود التصنيف العالمي GPC' },
      { 'نوع التكويد': 'GS1', 'المسمى': 'Global Standard 1 Barcode', 'النمط': 'أرقام باركود دولية 13 رقم', 'ملاحظات': 'معتمد دولياً ومسجل تلقائياً' },
    ];
    const ws2 = XLSX.utils.json_to_sheet(guideData);
    ws2['!cols'] = [{ wch: 16 }, { wch: 32 }, { wch: 20 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'دليل أكواد ومحددات المنظومة');

    XLSX.writeFile(wb, `نموذج_استيراد_الفواتير_الإلكترونية_ETA_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // --- 2. Import & Parse Excel File into Invoices ---
  public static async parseExcelInvoiceFile(file: File): Promise<ParsedImportResult> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!rawRows || rawRows.length === 0) {
            resolve({
              success: false,
              invoices: [],
              errors: ['ملف الإكسل فارغ ولا يحتوي على أي صفوف بيانات.'],
              warnings: [],
              totalRowsRead: 0,
            });
            return;
          }

          const errors: string[] = [];
          const warnings: string[] = [];
          const groupedInvoices: Record<string, { header: any; items: InvoiceItem[] }> = {};

          // Group rows by invoice number
          rawRows.forEach((row, idx) => {
            const rowNum = idx + 2;

            // Extract fields with multiple possible column names (Arabic & English)
            const invNumber = String(row['رقم الفاتورة'] || row['Invoice Number'] || row['رقم المستند'] || row['ID'] || '').trim();
            const rawDate = row['تاريخ الفاتورة (YYYY-MM-DD)'] || row['تاريخ الفاتورة'] || row['Invoice Date'] || row['التاريخ'] || '';
            const docType = String(row['نوع المستند (I:فاتورة / C:إشعار دائن / D:إشعار مدين / R:إيصال)'] || row['نوع المستند'] || row['Doc Type'] || 'I').toUpperCase().trim();
            const receiverType = String(row['نوع المستلم (B:شركة / P:فرد / F:أجنبي)'] || row['نوع المستلم'] || row['Receiver Type'] || 'B').toUpperCase().trim();
            const partnerName = String(row['اسم العميل / الشركة'] || row['اسم العميل'] || row['Customer Name'] || row['العميل'] || '').trim();
            const partnerTaxNo = String(row['الرقم الضريبي للعميل (9 أرقام)'] || row['الرقم الضريبي'] || row['Tax ID'] || '').trim();
            const partnerNatId = String(row['الرقم القومي (للأفراد > 50 ألف)'] || row['الرقم القومي'] || row['National ID'] || '').trim();
            const partnerAddress = String(row['عنوان العميل'] || row['العنوان'] || row['Address'] || '').trim();

            const itemCode = String(row['كود الصنف (EGS / GS1)'] || row['كود الصنف'] || row['Item Code'] || `EG-SRV-${idx + 1}`).trim();
            const itemType = String(row['نوع التكويد (EGS / GS1)'] || row['نوع التكويد'] || (itemCode.startsWith('EG-') ? 'EGS' : 'GS1')).trim();
            const description = String(row['بيان ووصف الخدمة أو الصنف'] || row['وصف البند'] || row['Description'] || row['البيان'] || `خدمة استشارية ${idx + 1}`).trim();
            const unitType = String(row['وحدة القياس (EA/C62/JOB/HUR)'] || row['الوحدة'] || row['Unit'] || 'EA').trim();
            const quantity = Math.max(1, Number(row['الكمية'] || row['Quantity'] || row['العدد'] || 1));
            const unitPrice = Math.max(0, Number(row['سعر الوحدة (ج.م)'] || row['سعر الوحدة'] || row['Unit Price'] || row['السعر'] || 0));
            const discountRate = Math.max(0, Number(row['نسبة الخصم %'] || row['الخصم %'] || row['Discount %'] || 0));
            const vatRate = Number((row['نسبة ضريبة القيمة المضافة T1 %'] || row['ضريبة القيمة المضافة %'] || row['VAT %']) ?? 14);
            const whtRate = Number((row['نسبة الخصم والتحصيل T4 %'] || row['الخصم والتحصيل %'] || row['WHT %']) ?? 0);
            const paymentMethod = String(row['طريقة السداد (BANK / CASH / INSTAPAY)'] || row['طريقة السداد'] || row['Payment Method'] || 'BANK').toUpperCase().trim();
            const notes = String(row['ملاحظات إضافية'] || row['ملاحظات'] || row['Notes'] || '').trim();

            if (!invNumber) {
              errors.push(`صف (${rowNum}): حقل "رقم الفاتورة" إلزامي ولا يمكن تركه فارغاً.`);
              return;
            }

            if (!partnerName) {
              errors.push(`صف (${rowNum}) [فاتورة ${invNumber}]: اسم العميل / الشركة مطلوب.`);
              return;
            }

            // Parse Date
            let formattedDate = new Date().toISOString().slice(0, 10);
            if (rawDate instanceof Date) {
              formattedDate = rawDate.toISOString().slice(0, 10);
            } else if (typeof rawDate === 'string' && rawDate.trim()) {
              const d = new Date(rawDate);
              if (!isNaN(d.getTime())) {
                formattedDate = d.toISOString().slice(0, 10);
              }
            }

            // Calculations
            const salesTotal = quantity * unitPrice;
            const discountAmount = (salesTotal * discountRate) / 100;
            const totalBeforeTax = salesTotal - discountAmount;
            const vatAmount = (totalBeforeTax * vatRate) / 100;
            const whtAmount = (totalBeforeTax * whtRate) / 100;
            const netTotal = totalBeforeTax + vatAmount - whtAmount;

            const itemObj: InvoiceItem = {
              id: `itm-imp-${idx}-${Date.now()}`,
              itemCode,
              itemType: itemType === 'GS1' ? 'GS1' : 'EGS',
              description,
              unitType,
              quantity,
              unitPrice,
              discountRate,
              discountAmount,
              vatRate,
              whtRate,
              totalBeforeTax,
              salesTotal,
              vatAmount,
              whtAmount,
              netTotal,
            };

            if (!groupedInvoices[invNumber]) {
              groupedInvoices[invNumber] = {
                header: {
                  invoiceNumber: invNumber,
                  date: formattedDate,
                  docType: docType === 'R' ? 'R' : docType === 'C' ? 'C' : docType === 'D' ? 'D' : 'I',
                  isReceipt: docType === 'R',
                  receiverType: receiverType === 'P' ? 'P' : receiverType === 'F' ? 'F' : 'B',
                  partnerName,
                  partnerTaxNo,
                  partnerNationalId: partnerNatId,
                  partnerAddress,
                  paymentMethod: paymentMethod.includes('CASH') ? 'CASH' : paymentMethod.includes('INSTA') ? 'INSTAPAY' : 'BANK',
                  notes,
                },
                items: [],
              };
            }

            groupedInvoices[invNumber].items.push(itemObj);
          });

          // Compile into Invoice objects
          const compiledInvoices: Omit<Invoice, 'id' | 'createdAt'>[] = [];

          Object.keys(groupedInvoices).forEach((invKey) => {
            const group = groupedInvoices[invKey];
            const items = group.items;

            const subtotal = items.reduce((sum, it) => sum + (it.salesTotal || it.quantity * it.unitPrice), 0);
            const totalDiscount = items.reduce((sum, it) => sum + (it.discountAmount || 0), 0);
            const totalVat = items.reduce((sum, it) => sum + it.vatAmount, 0);
            const totalWht = items.reduce((sum, it) => sum + it.whtAmount, 0);
            const grandTotal = subtotal - totalDiscount + totalVat - totalWht;

            const qrPayload = `ETA-EGY|${group.header.invoiceNumber}|${group.header.date}|${grandTotal.toFixed(2)}|VAT_${totalVat.toFixed(2)}`;

            compiledInvoices.push({
              invoiceNumber: group.header.invoiceNumber,
              invoiceType: group.header.isReceipt ? 'OFFICE_SERVICE' : 'SALES',
              date: group.header.date,
              dueDate: new Date(new Date(group.header.date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              partnerName: group.header.partnerName,
              partnerTaxNo: group.header.partnerTaxNo,
              partnerNationalId: group.header.partnerNationalId,
              partnerAddress: group.header.partnerAddress,
              receiverType: group.header.receiverType,
              items: items,
              subtotal,
              totalDiscount,
              totalVat,
              totalWht,
              grandTotal,
              paidAmount: grandTotal,
              remainingAmount: 0,
              status: 'ISSUED',
              paymentMethod: group.header.paymentMethod as any,
              qrPayload,
              notes: group.header.notes || 'مستورد من شيت إكسل ومعتمد محاسبياً',
              isReceipt: group.header.isReceipt,
              etaDocumentType: group.header.docType,
              etaDocumentVersion: '1.0',
              etaStatus: 'NOT_SUBMITTED',
            });
          });

          resolve({
            success: errors.length === 0,
            invoices: compiledInvoices,
            errors,
            warnings,
            totalRowsRead: rawRows.length,
          });
        } catch (err: any) {
          resolve({
            success: false,
            invoices: [],
            errors: [`فشل في قراءة ومعالجة ملف الإكسل: ${err?.message || 'تنسيق الملف غير مدعوم'}`],
            warnings: [],
            totalRowsRead: 0,
          });
        }
      };

      reader.onerror = () => {
        resolve({
          success: false,
          invoices: [],
          errors: ['حدث خطأ أثناء تحميل وقراءة الملف من القرص.'],
          warnings: [],
          totalRowsRead: 0,
        });
      };

      reader.readAsArrayBuffer(file);
    });
  }

  // --- 3. Export Single Invoice to Official ETA JSON ---
  public static exportInvoiceToEtaJson(invoice: Invoice) {
    const signedData = etaService.generateFullSignedPayload(invoice);
    const jsonString = JSON.stringify(signedData.payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNumber}_ETA_Schema_v1.0.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- 4. Export Single e-Receipt to Official ETA JSON ---
  public static exportReceiptToEtaJson(invoice: Invoice) {
    const payload = etaService.generateReceiptPayload(invoice);
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNumber}_ETA_Receipt_v1.2.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- 5. Export Single Invoice to Official ETA XML (UBL) ---
  public static exportInvoiceToEtaXml(invoice: Invoice) {
    const xmlContent = etaService.generateEtaXml(invoice);
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNumber}_ETA_UBL_v1.0.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- 6. Export Single Invoice to Formatted Excel Sheet ---
  public static exportInvoiceToExcel(invoice: Invoice) {
    const wb = XLSX.utils.book_new();

    const headerData = [
      { 'البيان': 'رقم الفاتورة', 'القيمة': invoice.invoiceNumber },
      { 'البيان': 'تاريخ الإصدار', 'القيمة': invoice.date },
      { 'البيان': 'اسم العميل', 'القيمة': invoice.partnerName },
      { 'البيان': 'الرقم الضريبي للعميل', 'القيمة': invoice.partnerTaxNo || 'غير مسجل' },
      { 'البيان': 'نوع المستند', 'القيمة': invoice.isReceipt ? 'إيصال إلكتروني B2C' : 'فاتورة إلكترونية B2B' },
      { 'البيان': 'المعرف الفريد ETA UUID', 'القيمة': invoice.etaUuid || 'قيد الإرسال' },
      { 'البيان': 'حالة المنظومة', 'القيمة': invoice.etaStatus || 'غير مرسل' },
      { 'البيان': 'إجمالي المبيعات', 'القيمة': invoice.subtotal },
      { 'البيان': 'إجمالي الخصم', 'القيمة': invoice.totalDiscount },
      { 'البيان': 'ضريبة القيمة المضافة (14%)', 'القيمة': invoice.totalVat },
      { 'البيان': 'الخصم والتحصيل (1%)', 'القيمة': invoice.totalWht },
      { 'البيان': 'صافي المبلغ المستحق (ج.م)', 'القيمة': invoice.grandTotal },
    ];
    const wsHeader = XLSX.utils.json_to_sheet(headerData);
    wsHeader['!cols'] = [{ wch: 25 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsHeader, 'بيانات المستند الرئيسية');

    const linesData = invoice.items.map((it, idx) => ({
      'م': idx + 1,
      'كود الصنف': it.itemCode,
      'نوع التكويد': it.itemType || 'EGS',
      'وصف الصنف / الخدمة': it.description,
      'الوحدة': it.unitType || 'EA',
      'الكمية': it.quantity,
      'سعر الوحدة': it.unitPrice,
      'إجمالي قبل الضريبة': it.totalBeforeTax,
      'ضريبة القيمة المضافة (14%)': it.vatAmount,
      'الخصم والتحصيل': it.whtAmount,
      'الصافي الإجمالي': it.netTotal,
    }));
    const wsLines = XLSX.utils.json_to_sheet(linesData);
    wsLines['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 12 },
      { wch: 45 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsLines, 'بنود الفاتورة المفصلة');

    XLSX.writeFile(wb, `فاتورة_${invoice.invoiceNumber}_${invoice.partnerName.slice(0, 15)}.xlsx`);
  }

  // --- 7. Export All Invoices to Master Excel File ---
  public static exportAllInvoicesToExcel(invoices: Invoice[]) {
    const wb = XLSX.utils.book_new();

    const summaryRows = invoices.map((inv) => ({
      'رقم الفاتورة': inv.invoiceNumber,
      'التاريخ': inv.date,
      'نوع المستند': inv.isReceipt ? 'إيصال B2C' : 'فاتورة B2B',
      'اسم العميل': inv.partnerName,
      'الرقم الضريبي': inv.partnerTaxNo || '',
      'المعرف الضريبي ETA UUID': inv.etaUuid || '',
      'حالة مصلحة الضرائب':
        inv.etaStatus === 'VALID'
          ? 'معتمدة ومقبولة (Valid)'
          : inv.etaStatus === 'SUBMITTED'
          ? 'قيد المعالجة (Submitted)'
          : inv.etaStatus === 'INVALID'
          ? 'مرفوضة (Invalid)'
          : 'مسودة محلية',
      'إجمالي المبيعات': inv.subtotal,
      'الخصم': inv.totalDiscount,
      'ضريبة القيمة المضافة': inv.totalVat,
      'الخصم والتحصيل': inv.totalWht,
      'صافي الفاتورة (ج.م)': inv.grandTotal,
      'طريقة السداد': inv.paymentMethod,
    }));

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 35 },
      { wch: 16 },
      { wch: 38 },
      { wch: 24 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص سجل الفواتير');

    // Sheet 2: All line items flattened
    const allLines: any[] = [];
    invoices.forEach((inv) => {
      inv.items.forEach((it, idx) => {
        allLines.push({
          'رقم الفاتورة': inv.invoiceNumber,
          'تاريخ الفاتورة': inv.date,
          'العميل': inv.partnerName,
          'بند رقم': idx + 1,
          'كود الصنف': it.itemCode,
          'التكويد': it.itemType || 'EGS',
          'الوصف': it.description,
          'الكمية': it.quantity,
          'السعر': it.unitPrice,
          'القيمة قبل الضريبة': it.totalBeforeTax,
          'القيمة المضافة': it.vatAmount,
          'الخصم والتحصيل': it.whtAmount,
          'الإجمالي': it.netTotal,
        });
      });
    });

    const wsAllLines = XLSX.utils.json_to_sheet(allLines);
    XLSX.utils.book_append_sheet(wb, wsAllLines, 'كافة البنود التفصيلية');

    XLSX.writeFile(wb, `سجل_الفواتير_الإلكترونية_الشامل_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}
