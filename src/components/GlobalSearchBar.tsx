import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  BookOpen,
  Users,
  FileText,
  Percent,
  Clock,
  Wallet,
  Shield,
  Layers,
  FileCheck,
  ArrowRight,
  Sparkles,
  Command,
  CornerDownLeft,
} from 'lucide-react';
import { NavigationTab } from '../types';
import { DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';

interface SearchResultItem {
  id: string;
  category: 'JOURNAL' | 'CLIENT' | 'INVOICE' | 'TAX' | 'TREASURY' | 'ACCOUNT' | 'CERTIFICATE' | 'FIXED_ASSET';
  categoryLabel: string;
  title: string;
  subtitle: string;
  badge?: string;
  targetTab: NavigationTab;
  recordId?: string;
  icon: any;
}

interface GlobalSearchBarProps {
  state: DatabaseState;
  onNavigate: (tab: NavigationTab, recordId?: string) => void;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ state, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keyboard shortcut listener: Ctrl + / or Ctrl + Shift + F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.key) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.key.toLowerCase() === 'f')) {
        // If not typing in another input
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          searchInputRef.current?.focus();
          setIsOpen(true);
        }
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute Search Results across all database modules
  const computeResults = (): SearchResultItem[] => {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    const results: SearchResultItem[] = [];

    // 1. Journal Entries
    (state.journalEntries || []).forEach((entry) => {
      const matchDocNo = (entry.serialNumber || '').toLowerCase().includes(q) || (entry.referenceNumber || '').toLowerCase().includes(q);
      const matchDesc = (entry.description || '').toLowerCase().includes(q);
      const matchClient = (entry.clientName || '').toLowerCase().includes(q);
      const matchAccounts = (entry.lines || []).some(
        (l) => (l.accountName || '').toLowerCase().includes(q) || (l.accountCode || '').toLowerCase().includes(q)
      );

      if (matchDocNo || matchDesc || matchClient || matchAccounts) {
        results.push({
          id: `je-${entry.id}`,
          category: 'JOURNAL',
          categoryLabel: 'قيد يومية',
          title: `قيد رقم [${entry.serialNumber || entry.entryNumber || '-'}] - ${entry.description || ''}`,
          subtitle: `بتاريخ ${entry.date || '-'} • إجمالي ${formatEgyptianCurrency(entry.totalDebit || 0)} • ${entry.isPosted ? 'مرحل' : 'مسودة'} ${entry.clientName ? `• ${entry.clientName}` : ''}`,
          badge: entry.serialNumber || `قيد #${entry.entryNumber || ''}`,
          targetTab: 'JOURNAL_ENTRIES',
          recordId: entry.id,
          icon: BookOpen,
        });
      }
    });

    // 2. Clients Archive
    (state.clients || []).forEach((client) => {
      const matchName = (client.name || '').toLowerCase().includes(q);
      const matchCode = (client.clientCode || '').toLowerCase().includes(q);
      const matchTaxCard = (client.taxCardNo || '').toLowerCase().includes(q);
      const matchCR = (client.commercialRegistrationNo || '').toLowerCase().includes(q);
      const matchPhone = (client.phone || '').toLowerCase().includes(q);
      const matchActivity = (client.activity || '').toLowerCase().includes(q);

      if (matchName || matchCode || matchTaxCard || matchCR || matchPhone || matchActivity) {
        results.push({
          id: `cl-${client.id}`,
          category: 'CLIENT',
          categoryLabel: 'ملف عميل وموكل',
          title: `[${client.clientCode || '-'}] ${client.name || ''}`,
          subtitle: `بطاقة ضريبية: ${client.taxCardNo || '-'} • مأمورية: ${client.taxOffice || '-'} • هاتف: ${client.phone || '-'}`,
          badge: client.companyType === 'JOINT_STOCK' ? 'ش.م.م' : client.companyType === 'LLC' ? 'ش.ذ.م.م' : 'عميل',
          targetTab: 'CLIENTS_ARCHIVE',
          recordId: client.id,
          icon: Users,
        });
      }
    });

    // 3. Invoices
    (state.invoices || []).forEach((inv) => {
      const matchInvNo = (inv.invoiceNumber || '').toLowerCase().includes(q);
      const matchClient = (inv.partnerName || '').toLowerCase().includes(q);
      const matchQR = (inv.qrPayload || '').toLowerCase().includes(q);
      const matchItems = (inv.items || []).some((item) => (item.description || '').toLowerCase().includes(q));

      if (matchInvNo || matchClient || matchQR || matchItems) {
        results.push({
          id: `inv-${inv.id}`,
          category: 'INVOICE',
          categoryLabel: 'فاتورة مهنية / ضريبية',
          title: `فاتورة رقم [${inv.invoiceNumber || '-'}] - ${inv.partnerName || ''}`,
          subtitle: `تاريخ الإصدار: ${inv.date || '-'} • الإجمالي: ${formatEgyptianCurrency(inv.grandTotal || 0)} • ${inv.status === 'PAID' ? 'مدفوعة' : 'مستحقة'}`,
          badge: inv.invoiceNumber || 'فاتورة',
          targetTab: 'INVOICING',
          recordId: inv.id,
          icon: FileText,
        });
      }
    });

    // 4. Tax Mandates & Declarations
    (state.taxMandates || []).forEach((mandate) => {
      const matchCode = (mandate.mandateCode || '').toLowerCase().includes(q);
      const matchTitle = (mandate.mandateTitle || '').toLowerCase().includes(q);
      const matchClient = (mandate.clientName || '').toLowerCase().includes(q);
      const matchPeriod = (mandate.periodName || '').toLowerCase().includes(q);

      if (matchCode || matchTitle || matchClient || matchPeriod) {
        results.push({
          id: `mand-${mandate.id}`,
          category: 'TAX',
          categoryLabel: 'تكليف ضريبي وجدولة',
          title: `[${mandate.mandateCode || '-'}] ${mandate.mandateTitle || ''}`,
          subtitle: `العميل: ${mandate.clientName || '-'} • استحقاق: ${mandate.deadlineDate || '-'} • ${mandate.status || ''}`,
          badge: mandate.periodName || 'تكليف',
          targetTab: 'TAX_TRACKER',
          recordId: mandate.id,
          icon: Clock,
        });
      }
    });

    (state.taxDeclarations || []).forEach((tax) => {
      const matchClient = (tax.clientName || '').toLowerCase().includes(q);
      const matchPeriod = (tax.period || '').toLowerCase().includes(q);
      const matchNotes = (tax.notes || '').toLowerCase().includes(q);

      if (matchClient || matchPeriod || matchNotes) {
        results.push({
          id: `tax-${tax.id}`,
          category: 'TAX',
          categoryLabel: 'إقرار ضريبي',
          title: `إقرار ${tax.declarationType || ''} - ${tax.period || ''} للعميل: ${tax.clientName || ''}`,
          subtitle: `استحقاق: ${tax.dueDate || '-'} • ضريبة: ${formatEgyptianCurrency(tax.netTaxPayable || 0)} • ${tax.status || ''}`,
          badge: tax.period || 'إقرار',
          targetTab: 'TAX_TRACKER',
          recordId: tax.id,
          icon: Percent,
        });
      }
    });

    // 5. Office Treasury Transactions
    (state.treasuryTransactions || []).forEach((tx) => {
      const matchVoucher = (tx.voucherNumber || '').toLowerCase().includes(q);
      const matchCat = (tx.category || '').toLowerCase().includes(q);
      const matchDesc = (tx.description || '').toLowerCase().includes(q);
      const matchClient = (tx.clientName || '').toLowerCase().includes(q);

      if (matchVoucher || matchCat || matchDesc || matchClient) {
        results.push({
          id: `tx-${tx.id}`,
          category: 'TREASURY',
          categoryLabel: 'سند خزنة المكتب',
          title: `سند [${tx.voucherNumber || '-'}] - ${tx.category || ''}`,
          subtitle: `تاريخ: ${tx.date || '-'} • المبلغ: ${formatEgyptianCurrency(tx.amount || 0)} • ${tx.description || ''}`,
          badge: tx.voucherNumber || 'سند',
          targetTab: 'OFFICE_TREASURY',
          recordId: tx.id,
          icon: Wallet,
        });
      }
    });

    // 6. Professional Certificates
    (state.certificates || []).forEach((cert) => {
      const matchCertNo = (cert.certificateNumber || '').toLowerCase().includes(q);
      const matchClient = (cert.clientName || '').toLowerCase().includes(q);
      const matchRecipient = (cert.recipientEntity || '').toLowerCase().includes(q);

      if (matchCertNo || matchClient || matchRecipient) {
        results.push({
          id: `cert-${cert.id}`,
          category: 'CERTIFICATE',
          categoryLabel: 'شهادة محاسب قانوني',
          title: `شهادة [${cert.certificateNumber || '-'}] - ${cert.clientName || ''}`,
          subtitle: `الجهة: ${cert.recipientEntity || '-'} • المبلغ: ${formatEgyptianCurrency(cert.certifiedAmount || 0)} • تاريخ: ${cert.issueDate || '-'}`,
          badge: cert.certificateNumber || 'شهادة',
          targetTab: 'CERTIFICATES',
          recordId: cert.id,
          icon: FileCheck,
        });
      }
    });

    // 7. Chart of Accounts
    (state.accounts || []).forEach((acc) => {
      const matchCode = (acc.code || '').toLowerCase().includes(q);
      const matchName = (acc.name || '').toLowerCase().includes(q);
      const matchDesc = (acc.description || '').toLowerCase().includes(q);

      if (matchCode || matchName || matchDesc) {
        results.push({
          id: `acc-${acc.id}`,
          category: 'ACCOUNT',
          categoryLabel: 'دليل الحسابات',
          title: `حساب [${acc.code || '-'}] - ${acc.name || ''}`,
          subtitle: `طبيعة الحساب: ${acc.nature === 'DEBIT' ? 'مدين' : 'دائن'} • المستوى: ${acc.level || 1} • ${acc.category || ''}`,
          badge: acc.code || '',
          targetTab: 'CHART_OF_ACCOUNTS',
          recordId: acc.id,
          icon: Layers,
        });
      }
    });

    // 8. Fixed Assets & Depreciation
    (state.fixedAssets || []).forEach((ast) => {
      const matchCode = (ast.assetCode || '').toLowerCase().includes(q);
      const matchName = (ast.name || '').toLowerCase().includes(q);
      const matchCust = (ast.custodian || '').toLowerCase().includes(q);
      const matchLoc = (ast.location || '').toLowerCase().includes(q);

      if (matchCode || matchName || matchCust || matchLoc) {
        results.push({
          id: `ast-${ast.id}`,
          category: 'FIXED_ASSET',
          categoryLabel: 'أصل ثابت وإهلاك (معيار 10)',
          title: `[${ast.assetCode || '-'}] ${ast.name || ''}`,
          subtitle: `تكلفة الاقتناء: ${formatEgyptianCurrency(ast.acquisitionCost || 0)} • صافي الدفتري: ${formatEgyptianCurrency(ast.currentBookValue || 0)} • إهلاك: ${ast.accountingDepreciationRate || 0}%`,
          badge: ast.assetCode || '',
          targetTab: 'FIXED_ASSETS',
          recordId: ast.id,
          icon: BookOpen,
        });
      }
    });

    return results.slice(0, 15); // Return top 15 results
  };

  const results = computeResults();

  const handleSelectResult = (item: SearchResultItem) => {
    setIsOpen(false);
    setQuery('');
    onNavigate(item.targetTab, item.recordId);
  };

  // Keyboard navigation within results
  const handleKeyDownInInput = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelectResult(results[selectedIndex]);
      }
    }
  };

  const getCategoryBadgeClass = (cat: SearchResultItem['category']) => {
    switch (cat) {
      case 'JOURNAL':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CLIENT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'INVOICE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'TAX':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'TREASURY':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'CERTIFICATE':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'ACCOUNT':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDownInInput}
          placeholder="بحث شامل (قيود، عملاء، فواتير، ضرائب، خزنة)..."
          className="w-full pl-16 pr-10 py-1.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:outline-none transition-all shadow-2xs"
        />
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-400 bg-white dark:bg-slate-700/60 rounded border border-slate-200 dark:border-slate-600">
            Ctrl + /
          </kbd>
        </div>
      </div>

      {/* Live Dropdown Results */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full mt-2 right-0 w-full md:w-[540px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-xs text-right max-h-[500px] flex flex-col">
          {/* Header summary */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-800 text-xs">
              نتائج البحث الشامل: ({results.length} نتيجة)
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              استخدم الأسهم للتنقل و Enter للاختيار
            </span>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto p-2 space-y-1 flex-1">
            {results.length > 0 ? (
              results.map((item, idx) => {
                const IconComponent = item.icon;
                const isFocused = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectResult(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      isFocused
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-950'
                        : 'hover:bg-slate-50 border border-transparent text-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isFocused ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 block">{item.title}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getCategoryBadgeClass(item.category)}`}>
                            {item.categoryLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">{item.subtitle}</p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 self-center">
                      <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        انتقال ↵
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-xs text-slate-700">لا توجد نتائج مطابقة لكلمة البحث: "{query}"</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  جرب البحث برقم القيد، كود العميل، الرقم الضريبي، أو رقم الفاتورة.
                </p>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="p-2.5 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between font-mono">
            <span>البحث يشمل قيود اليومية، العملاء، الفواتير، الضرائب، الخزنة، والدليل المحاسبي</span>
            <span>ESC للإغلاق</span>
          </div>
        </div>
      )}
    </div>
  );
};
