import React, { useState, useMemo } from 'react';
import {
  Building,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Calculator,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  FileSpreadsheet,
  Trash2,
  Edit,
  TrendingDown,
  FileCheck2,
  DollarSign,
  Layers,
  ChevronDown,
  Info,
  ShieldCheck,
  Check,
  X,
  Printer,
  Sparkles,
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';
import { FixedAsset, FixedAssetCategory, DepreciationMethod } from '../types';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';

interface FixedAssetsViewProps {
  state: DatabaseState;
  fiscalYear?: number;
}

const CATEGORY_NAMES: Record<FixedAssetCategory, { label: string; taxRate: number; color: string }> = {
  BUILDINGS: { label: 'مباني وإنشاءات', taxRate: 5, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  MACHINERY_EQUIPMENT: { label: 'آلات ومعدات وماكينات', taxRate: 25, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  VEHICLES: { label: 'سيارات ووسائل نقل', taxRate: 25, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  FURNITURE_FIXTURES: { label: 'أثاث وتجهيزات مكاتب', taxRate: 25, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  COMPUTERS_SOFTWARE: { label: 'حواسب آلية وبرمجيات', taxRate: 50, color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  INTANGIBLE_ASSETS: { label: 'أصول غير ملموسة وشهرة', taxRate: 10, color: 'bg-rose-100 text-rose-800 border-rose-200' },
  LANDS: { label: 'أراضي (غير قابلة للإهلاك)', taxRate: 0, color: 'bg-slate-100 text-slate-800 border-slate-200' },
};

const METHOD_NAMES: Record<DepreciationMethod, string> = {
  STRAIGHT_LINE: 'القسط الثابت (معيار 10)',
  DECLINING_BALANCE: 'القسط المتناقص',
  SUM_OF_YEARS_DIGITS: 'مجموع أرقام السنوات',
  TAX_LAW_91: 'أساس الإهلاك (قانون 91 لسنة 2005)',
};

export const FixedAssetsView: React.FC<FixedAssetsViewProps> = ({ state, fiscalYear = 2026 }) => {
  const assets: FixedAsset[] = state.fixedAssets || [];
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'SCHEDULE' | 'TAX_LAW_COMPARISON'>('REGISTER');

  // Add/Edit Asset Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    assetCode: `AST-${fiscalYear}-${String(assets.length + 1).padStart(3, '0')}`,
    name: '',
    category: 'MACHINERY_EQUIPMENT' as FixedAssetCategory,
    purchaseDate: `${fiscalYear}-01-01`,
    operationDate: `${fiscalYear}-01-01`,
    acquisitionCost: 0,
    scrapValue: 0,
    usefulLifeYears: 5,
    accountingDepreciationRate: 20,
    depreciationMethod: 'STRAIGHT_LINE' as DepreciationMethod,
    taxDepreciationRate: 25,
    isEligibleForAcceleratedDepreciation: false,
    location: '',
    custodian: '',
    costCenter: '',
    invoiceRef: '',
    serialNumber: '',
    assetAccountId: '122',
    depreciationExpenseAccountId: '334',
    accumulatedDepreciationAccountId: '231',
    initialAccumulatedDepreciation: 0,
    notes: '',
  });

  // Depreciation Posting Modal
  const [isPostingModalOpen, setIsPostingModalOpen] = useState<boolean>(false);
  const [postingPeriod, setPostingPeriod] = useState<'ANNUAL' | 'MONTHLY'>('ANNUAL');
  const [postingMonth, setPostingMonth] = useState<number>(12);
  const [postedSuccessMessage, setPostedSuccessMessage] = useState<string | null>(null);

  // Disposal Modal
  const [disposalAsset, setDisposalAsset] = useState<FixedAsset | null>(null);
  const [disposalData, setDisposalData] = useState({
    disposalDate: new Date().toISOString().slice(0, 10),
    disposalAmount: 0,
    disposalReason: 'بيع الأصل خردة أو استبدال',
  });

  // Calculate Aggregates
  const summary = useMemo(() => {
    let totalCost = 0;
    let totalAccumDep = 0;
    let totalBookValue = 0;
    let periodAccountingDep = 0;
    let periodTaxDep = 0;

    assets.forEach((ast) => {
      if (ast.status !== 'DISPOSED') {
        totalCost += Number(ast.acquisitionCost) || 0;
        totalAccumDep += Number(ast.currentAccumulatedDepreciation) || 0;
        totalBookValue += Number(ast.currentBookValue) || 0;

        // Accounting annual depreciation
        if (ast.category !== 'LANDS') {
          const depreciable = Math.max(0, (Number(ast.acquisitionCost) || 0) - (Number(ast.scrapValue) || 0));
          const rate = (Number(ast.accountingDepreciationRate) || 10) / 100;
          const dep = Math.min(ast.currentBookValue, depreciable * rate);
          periodAccountingDep += dep;

          // Egyptian Tax Law (قانون 91 لسنة 2005)
          let taxRate = (Number(ast.taxDepreciationRate) || 25) / 100;
          let taxDep = (Number(ast.acquisitionCost) || 0) * taxRate;
          if (ast.isEligibleForAcceleratedDepreciation && !ast.acceleratedDepreciationClaimed) {
            taxDep += (Number(ast.acquisitionCost) || 0) * 0.3; // 30% accelerated
          }
          periodTaxDep += taxDep;
        }
      }
    });

    return {
      totalCost,
      totalAccumDep,
      totalBookValue,
      periodAccountingDep,
      periodTaxDep,
      taxDifference: periodTaxDep - periodAccountingDep,
    };
  }, [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.custodian && asset.custodian.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (asset.location && asset.location.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = selectedCategory === 'ALL' || asset.category === selectedCategory;
      const matchesStat = selectedStatus === 'ALL' || asset.status === selectedStatus;

      return matchesSearch && matchesCat && matchesStat;
    });
  }, [assets, searchTerm, selectedCategory, selectedStatus]);

  const handleOpenAddModal = (assetToEdit?: FixedAsset) => {
    if (assetToEdit) {
      setEditingAsset(assetToEdit);
      setFormData({
        assetCode: assetToEdit.assetCode,
        name: assetToEdit.name,
        category: assetToEdit.category,
        purchaseDate: assetToEdit.purchaseDate,
        operationDate: assetToEdit.operationDate,
        acquisitionCost: assetToEdit.acquisitionCost,
        scrapValue: assetToEdit.scrapValue,
        usefulLifeYears: assetToEdit.usefulLifeYears,
        accountingDepreciationRate: assetToEdit.accountingDepreciationRate,
        depreciationMethod: assetToEdit.depreciationMethod,
        taxDepreciationRate: assetToEdit.taxDepreciationRate,
        isEligibleForAcceleratedDepreciation: assetToEdit.isEligibleForAcceleratedDepreciation || false,
        location: assetToEdit.location || '',
        custodian: assetToEdit.custodian || '',
        costCenter: assetToEdit.costCenter || '',
        invoiceRef: assetToEdit.invoiceRef || '',
        serialNumber: assetToEdit.serialNumber || '',
        assetAccountId: assetToEdit.assetAccountId || '122',
        depreciationExpenseAccountId: assetToEdit.depreciationExpenseAccountId || '334',
        accumulatedDepreciationAccountId: assetToEdit.accumulatedDepreciationAccountId || '231',
        initialAccumulatedDepreciation: assetToEdit.currentAccumulatedDepreciation || 0,
        notes: assetToEdit.notes || '',
      });
    } else {
      setEditingAsset(null);
      const nextCode = `AST-${fiscalYear}-${String(assets.length + 1).padStart(3, '0')}`;
      setFormData({
        assetCode: nextCode,
        name: '',
        category: 'MACHINERY_EQUIPMENT',
        purchaseDate: `${fiscalYear}-01-01`,
        operationDate: `${fiscalYear}-01-01`,
        acquisitionCost: 0,
        scrapValue: 0,
        usefulLifeYears: 5,
        accountingDepreciationRate: 20,
        depreciationMethod: 'STRAIGHT_LINE',
        taxDepreciationRate: 25,
        isEligibleForAcceleratedDepreciation: false,
        location: '',
        custodian: '',
        costCenter: '',
        invoiceRef: '',
        serialNumber: '',
        assetAccountId: '122',
        depreciationExpenseAccountId: '334',
        accumulatedDepreciationAccountId: '231',
        initialAccumulatedDepreciation: 0,
        notes: '',
      });
    }
    setIsAddModalOpen(true);
  };

  const handleCategoryChange = (cat: FixedAssetCategory) => {
    let life = 5;
    let accRate = 20;
    let taxRate = 25;
    let isAccel = false;

    if (cat === 'BUILDINGS') {
      life = 20;
      accRate = 5;
      taxRate = 5;
    } else if (cat === 'COMPUTERS_SOFTWARE') {
      life = 3;
      accRate = 33.33;
      taxRate = 50;
    } else if (cat === 'VEHICLES') {
      life = 5;
      accRate = 20;
      taxRate = 25;
    } else if (cat === 'FURNITURE_FIXTURES') {
      life = 5;
      accRate = 20;
      taxRate = 25;
    } else if (cat === 'MACHINERY_EQUIPMENT') {
      life = 4;
      accRate = 25;
      taxRate = 25;
      isAccel = true;
    } else if (cat === 'INTANGIBLE_ASSETS') {
      life = 10;
      accRate = 10;
      taxRate = 10;
    } else if (cat === 'LANDS') {
      life = 0;
      accRate = 0;
      taxRate = 0;
    }

    setFormData((prev) => ({
      ...prev,
      category: cat,
      usefulLifeYears: life,
      accountingDepreciationRate: accRate,
      taxDepreciationRate: taxRate,
      isEligibleForAcceleratedDepreciation: isAccel,
    }));
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('يرجى كتابة اسم الأصل الثابت');
      return;
    }
    if (formData.acquisitionCost <= 0 && formData.category !== 'LANDS') {
      alert('يرجى تحديد تكلفة الاقتناء بشكل صحيح');
      return;
    }

    if (editingAsset) {
      db.updateFixedAsset(editingAsset.id, {
        assetCode: formData.assetCode,
        name: formData.name,
        category: formData.category,
        purchaseDate: formData.purchaseDate,
        operationDate: formData.operationDate,
        acquisitionCost: Number(formData.acquisitionCost),
        scrapValue: Number(formData.scrapValue),
        usefulLifeYears: Number(formData.usefulLifeYears),
        accountingDepreciationRate: Number(formData.accountingDepreciationRate),
        depreciationMethod: formData.depreciationMethod,
        taxDepreciationRate: Number(formData.taxDepreciationRate),
        isEligibleForAcceleratedDepreciation: formData.isEligibleForAcceleratedDepreciation,
        location: formData.location,
        custodian: formData.custodian,
        costCenter: formData.costCenter,
        invoiceRef: formData.invoiceRef,
        serialNumber: formData.serialNumber,
        assetAccountId: formData.assetAccountId,
        depreciationExpenseAccountId: formData.depreciationExpenseAccountId,
        accumulatedDepreciationAccountId: formData.accumulatedDepreciationAccountId,
        notes: formData.notes,
      });
    } else {
      db.addFixedAsset({
        assetCode: formData.assetCode,
        name: formData.name,
        category: formData.category,
        purchaseDate: formData.purchaseDate,
        operationDate: formData.operationDate,
        acquisitionCost: Number(formData.acquisitionCost),
        scrapValue: Number(formData.scrapValue),
        usefulLifeYears: Number(formData.usefulLifeYears),
        accountingDepreciationRate: Number(formData.accountingDepreciationRate),
        depreciationMethod: formData.depreciationMethod,
        taxDepreciationRate: Number(formData.taxDepreciationRate),
        isEligibleForAcceleratedDepreciation: formData.isEligibleForAcceleratedDepreciation,
        location: formData.location,
        custodian: formData.custodian,
        costCenter: formData.costCenter,
        invoiceRef: formData.invoiceRef,
        serialNumber: formData.serialNumber,
        assetAccountId: formData.assetAccountId,
        depreciationExpenseAccountId: formData.depreciationExpenseAccountId,
        accumulatedDepreciationAccountId: formData.accumulatedDepreciationAccountId,
        initialAccumulatedDepreciation: Number(formData.initialAccumulatedDepreciation),
        notes: formData.notes,
      });
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteAsset = (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الأصل [${name}] نهائياً من السجل؟`)) {
      db.deleteFixedAsset(id);
    }
  };

  const handleOpenDisposalModal = (asset: FixedAsset) => {
    setDisposalAsset(asset);
    setDisposalData({
      disposalDate: new Date().toISOString().slice(0, 10),
      disposalAmount: 0,
      disposalReason: 'بيع الأصل خردة أو استبدال أصل جديد',
    });
  };

  const handleConfirmDisposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disposalAsset) return;

    db.disposeFixedAsset(disposalAsset.id, {
      disposalDate: disposalData.disposalDate,
      disposalAmount: Number(disposalData.disposalAmount),
      disposalReason: disposalData.disposalReason,
    });

    setDisposalAsset(null);
  };

  const handlePostDepreciation = () => {
    const activeDepreciableAssets = assets.filter(
      (a) => a.status === 'ACTIVE' && a.category !== 'LANDS' && a.currentBookValue > (a.scrapValue || 0)
    );

    if (activeDepreciableAssets.length === 0) {
      alert('لا توجد أصول نشطة قابلة للإهلاك في هذه الفترة.');
      return;
    }

    const factor = postingPeriod === 'MONTHLY' ? 1 / 12 : 1;
    const periodLabel = postingPeriod === 'MONTHLY' ? `شهر ${postingMonth} لسنة ${fiscalYear}` : `عن السنة المالية ${fiscalYear}`;

    let totalDep = 0;
    activeDepreciableAssets.forEach((ast) => {
      const depreciable = Math.max(0, ast.acquisitionCost - (ast.scrapValue || 0));
      const annualRate = (ast.accountingDepreciationRate || 10) / 100;
      const periodDep = Math.min(ast.currentBookValue - (ast.scrapValue || 0), Math.round(depreciable * annualRate * factor));
      totalDep += periodDep;
    });

    if (totalDep <= 0) {
      alert('مبلغ الإهلاك المحسوب للفترة يساوي صفر، جميع الأصول مهلكة دفترياً.');
      return;
    }

    const entry = db.postDepreciationJournalEntry({
      year: fiscalYear,
      month: postingPeriod === 'MONTHLY' ? postingMonth : undefined,
      periodLabel,
      totalDepreciationAmount: totalDep,
      depreciatedAssetIds: activeDepreciableAssets.map((a) => a.id),
    });

    setIsPostingModalOpen(false);
    setPostedSuccessMessage(
      `تم توليد وترحيل قيد إهلاك الأصول الثابتة بنجاح برقم (${entry.entryNumber}) وبمبلغ إجمالي ${totalDep.toLocaleString()} ج.م إلى دفتر اليومية العامة.`
    );
    setTimeout(() => setPostedSuccessMessage(null), 8000);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Success Notification */}
      {postedSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start gap-3 shadow-xs animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm font-semibold leading-relaxed">
            {postedSuccessMessage}
          </div>
          <button
            onClick={() => setPostedSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI & Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">إجمالي تكلفة اقتناء الأصول</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {summary.totalCost.toLocaleString('ar-EG')} <span className="text-xs text-slate-500 font-normal">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>عدد الأصول المسجلة:</span>
            <span className="font-bold text-slate-800">{assets.length} أصل</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">مجمع الإهلاك المتراكم</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-700 font-mono">
            {summary.totalAccumDep.toLocaleString('ar-EG')} <span className="text-xs text-slate-500 font-normal">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            نسبة الإهلاك التراكمي: {summary.totalCost > 0 ? ((summary.totalAccumDep / summary.totalCost) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">صافي القيمة الدفترية (Book Value)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono">
            {summary.totalBookValue.toLocaleString('ar-EG')} <span className="text-xs text-slate-500 font-normal">ج.م</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تظهر بالميزانية العمومية معيار (10)</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">إهلاك الفترة المتوقع (محاسبي / ضريبي)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-black text-slate-800 font-mono flex items-center justify-between">
            <span>محاسبي: {summary.periodAccountingDep.toLocaleString()}</span>
            <span className="text-purple-700 font-bold">ضريبي: {summary.periodTaxDep.toLocaleString()}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            الفروق الضريبية المؤقتة: <span className="font-bold text-slate-800">{summary.taxDifference.toLocaleString()} ج.م</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        {/* Controls & Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          {/* Sub-view Navigation */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('REGISTER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'REGISTER'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              سجل تفصيلي للأصول ({filteredAssets.length})
            </button>
            <button
              onClick={() => setActiveTab('SCHEDULE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'SCHEDULE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              جدول وكشف الإهلاك الدوري
            </button>
            <button
              onClick={() => setActiveTab('TAX_LAW_COMPARISON')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'TAX_LAW_COMPARISON'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مطابقة الإهلاك الضريبي (قانون 91)
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsPostingModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              توليد وترحيل قيد الإهلاك لليومية
            </button>
            <button
              onClick={() => handleOpenAddModal()}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة أصل ثابت جديد
            </button>
            <ScreenActionToolbar
              modelType="FIXED_ASSETS"
              title="سجل الأصول الثابتة وإهلاكها"
              count={filteredAssets.length}
            />
          </div>
        </div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 py-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث بالاسم، الكود، الموقع، العهدة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">جميع فئات وتصنيفات الأصول</option>
              <option value="BUILDINGS">مباني وإنشاءات (5%)</option>
              <option value="MACHINERY_EQUIPMENT">آلات ومعدات وماكينات (25%)</option>
              <option value="VEHICLES">سيارات ووسائل نقل (25%)</option>
              <option value="FURNITURE_FIXTURES">أثاث وتجهيزات مكتبية (25%)</option>
              <option value="COMPUTERS_SOFTWARE">حواسب آلية وبرمجيات (50%)</option>
              <option value="INTANGIBLE_ASSETS">أصول غير ملموسة (10%)</option>
              <option value="LANDS">أراضي (غير قابلة للإهلاك)</option>
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">جميع الحالات التشغيلية</option>
              <option value="ACTIVE">أصل نشط قيد التشغيل</option>
              <option value="FULLY_DEPRECIATED">مهلك دفترياً بالكامل</option>
              <option value="DISPOSED">مستبعد / تم بيعه وتكهينه</option>
              <option value="UNDER_MAINTENANCE">تحت الصيانة والإصلاح</option>
            </select>
          </div>

          <div className="flex items-center justify-end text-xs text-slate-500">
            <span>عدد النتائج المعروضة: </span>
            <span className="font-bold text-slate-800 mr-1">{filteredAssets.length}</span>
          </div>
        </div>

        {/* Tab 1: Fixed Assets Detailed Register */}
        {activeTab === 'REGISTER' && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                  <th className="p-3">كود الأصل</th>
                  <th className="p-3">اسم الأصل والتوصيف</th>
                  <th className="p-3">الفئة والتصنيف</th>
                  <th className="p-3">تاريخ الشراء / التشغيل</th>
                  <th className="p-3">تكلفة الاقتناء</th>
                  <th className="p-3">مجمع الإهلاك</th>
                  <th className="p-3">صافي القيمة الدفترية</th>
                  <th className="p-3">طريقة ونسبة الإهلاك</th>
                  <th className="p-3">الموقع / العهدة</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      لا توجد أصول ثابتة مطابقة لمعايير البحث الحالية
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const catInfo = CATEGORY_NAMES[asset.category] || {
                      label: asset.category,
                      color: 'bg-slate-100 text-slate-800 border-slate-200',
                    };
                    const isFullyDepreciated = asset.currentBookValue <= (asset.scrapValue || 0) && asset.currentAccumulatedDepreciation > 0;

                    return (
                      <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-blue-700">
                          {asset.assetCode}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{asset.name}</div>
                          {asset.serialNumber && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              S/N: {asset.serialNumber}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${catInfo.color}`}
                          >
                            {catInfo.label}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          <div>{asset.purchaseDate}</div>
                          <div className="text-[10px] text-slate-400">تشغيل: {asset.operationDate}</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {asset.acquisitionCost.toLocaleString()} ج.م
                        </td>
                        <td className="p-3 font-mono text-amber-700 font-semibold">
                          {asset.currentAccumulatedDepreciation.toLocaleString()} ج.م
                        </td>
                        <td className="p-3 font-mono font-black text-emerald-700">
                          {asset.currentBookValue.toLocaleString()} ج.م
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">
                            {asset.accountingDepreciationRate}% سنوي
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {METHOD_NAMES[asset.depreciationMethod]}
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 text-[11px]">
                          <div>{asset.location || '—'}</div>
                          {asset.custodian && (
                            <div className="text-slate-400 text-[10px]">عهدة: {asset.custodian}</div>
                          )}
                        </td>
                        <td className="p-3">
                          {asset.status === 'DISPOSED' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                              مستبعد / تم البيع
                            </span>
                          ) : isFullyDepreciated ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                              مهلك دفترياً
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                              نشط قيد الاستخدام
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenAddModal(asset)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              title="تعديل بيانات الأصل"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {asset.status !== 'DISPOSED' && (
                              <button
                                onClick={() => handleOpenDisposalModal(asset)}
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                                title="استبعاد / بيع الأصل وتكهينه"
                              >
                                <TrendingDown className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAsset(asset.id, asset.name)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              title="حذف الأصل من السجل"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Depreciation Schedule */}
        {activeTab === 'SCHEDULE' && (
          <div className="space-y-4 mt-4">
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span>
                  كشف وجدول استهلاك الأصول الثابتة السنوي وفقاً لمعيار المحاسبة المصري رقم (10) للأصول الثابتة وإهلاكها.
                </span>
              </div>
              <span className="font-bold">السنة المالية: {fiscalYear}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="p-3">كود الأصل</th>
                    <th className="p-3">اسم الأصل</th>
                    <th className="p-3">رصيد أول المدة (التكلفة)</th>
                    <th className="p-3">مجمع إهلاك أول المدة</th>
                    <th className="p-3">إهلاك السنة المالية ({fiscalYear})</th>
                    <th className="p-3">مجمع إهلاك آخر المدة</th>
                    <th className="p-3">صافي القيمة الدفترية آخر المدة</th>
                    <th className="p-3">الحساب المدين / الدائن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssets.map((asset) => {
                    const depreciableAmount = Math.max(0, asset.acquisitionCost - (asset.scrapValue || 0));
                    const annualRate = (asset.accountingDepreciationRate || 10) / 100;
                    const annualDep =
                      asset.category === 'LANDS' || asset.status === 'DISPOSED'
                        ? 0
                        : Math.min(asset.currentBookValue, Math.round(depreciableAmount * annualRate));

                    const closingAccum = asset.currentAccumulatedDepreciation;
                    const closingBook = asset.currentBookValue;

                    return (
                      <tr key={asset.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-800">{asset.assetCode}</td>
                        <td className="p-3 font-bold text-slate-900">{asset.name}</td>
                        <td className="p-3 font-mono">{asset.acquisitionCost.toLocaleString()} ج.م</td>
                        <td className="p-3 font-mono text-amber-700">
                          {Math.max(0, closingAccum - annualDep).toLocaleString()} ج.م
                        </td>
                        <td className="p-3 font-mono font-black text-rose-700 bg-rose-50/40">
                          {annualDep.toLocaleString()} ج.م
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-800">
                          {closingAccum.toLocaleString()} ج.م
                        </td>
                        <td className="p-3 font-mono font-black text-emerald-800 bg-emerald-50/40">
                          {closingBook.toLocaleString()} ج.م
                        </td>
                        <td className="p-3 text-[10px] text-slate-500 font-mono">
                          من حـ/{asset.depreciationExpenseAccountId || '334'} إلى حـ/{asset.accumulatedDepreciationAccountId || '231'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Egyptian Tax Law 91/2005 Reconciliation */}
        {activeTab === 'TAX_LAW_COMPARISON' && (
          <div className="space-y-4 mt-4">
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>أحكام الإهلاك الضريبي وفق المواد (25، 26، 27) من قانون الضريبة على الدخل رقم 91 لسنة 2005:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700 mr-2 text-[11px]">
                <li><strong>المباني والمنشآت والسفن والطائرات:</strong> 5% سنوياً بطريقة القسط الثابت (مادة 25).</li>
                <li><strong>الأصول المعنوية (شهرة، برامج ونظم مشتراة):</strong> 10% سنوياً بطريقة القسط الثابت (مادة 25).</li>
                <li><strong>الحواسب الآلية ونظم المعلومات والبرمجيات:</strong> 50% سنوياً بطريقة أساس الإهلاك (مادة 25).</li>
                <li><strong>الآلات والمعدات والسيارات وباقي الأصول:</strong> 25% سنوياً بطريقة أساس الإهلاك (مادة 25).</li>
                <li><strong>الإهلاك المعجل (الإضافي 30%):</strong> يُخصم 30% من تكلفة الآلات والمعدات الجديدة المشتراة والمستخدمة في الإنتاج في أول فترة ضريبية (مادة 27).</li>
              </ul>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="p-3">اسم وتصنيف الأصل</th>
                    <th className="p-3">تكلفة الاقتناء</th>
                    <th className="p-3">الإهلاك المحاسبي (معيار 10)</th>
                    <th className="p-3">نسبة الإهلاك الضريبي</th>
                    <th className="p-3">إهلاك معجل (30%)</th>
                    <th className="p-3">الإهلاك الضريبي المعتمد</th>
                    <th className="p-3">الفروق المؤقتة (معيار 24)</th>
                    <th className="p-3">الأثر على الوعاء الخاضع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssets.map((asset) => {
                    const accDep =
                      asset.category === 'LANDS'
                        ? 0
                        : Math.round(
                            Math.max(0, asset.acquisitionCost - (asset.scrapValue || 0)) *
                              ((asset.accountingDepreciationRate || 10) / 100)
                          );

                    const taxRate = (asset.taxDepreciationRate || 25) / 100;
                    const accelDep =
                      asset.isEligibleForAcceleratedDepreciation && !asset.acceleratedDepreciationClaimed
                        ? Math.round(asset.acquisitionCost * 0.3)
                        : 0;

                    const taxBaseDep = Math.round(asset.acquisitionCost * taxRate);
                    const totalTaxDep = taxBaseDep + accelDep;
                    const diff = totalTaxDep - accDep;

                    return (
                      <tr key={asset.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{asset.name}</div>
                          <div className="text-[10px] text-slate-500">{asset.assetCode}</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800">
                          {asset.acquisitionCost.toLocaleString()} ج.م
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {accDep.toLocaleString()} ج.م ({asset.accountingDepreciationRate}%)
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-700">
                          {asset.taxDepreciationRate}%
                        </td>
                        <td className="p-3 font-mono text-amber-700 font-bold">
                          {accelDep > 0 ? `${accelDep.toLocaleString()} ج.م (30%)` : '—'}
                        </td>
                        <td className="p-3 font-mono font-black text-purple-800 bg-purple-50/30">
                          {totalTaxDep.toLocaleString()} ج.م
                        </td>
                        <td
                          className={`p-3 font-mono font-bold ${
                            diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-600'
                          }`}
                        >
                          {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} ج.م
                        </td>
                        <td className="p-3 text-[11px]">
                          {diff > 0 ? (
                            <span className="text-emerald-700 font-semibold">يُخصم من الوعاء الضريبي</span>
                          ) : diff < 0 ? (
                            <span className="text-rose-700 font-semibold">يُرد إلى الوعاء الضريبي</span>
                          ) : (
                            <span className="text-slate-500">لا يوجد أثر</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Asset Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingAsset ? 'تعديل بيانات أصل ثابت' : 'إضافة أصل ثابت جديد للسجل'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    كود الأصل *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.assetCode}
                    onChange={(e) => setFormData({ ...formData, assetCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تصنيف وفئة الأصل (المعيار المصري) *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleCategoryChange(e.target.value as FixedAssetCategory)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="BUILDINGS">مباني وإنشاءات (5% قسط ثابت)</option>
                    <option value="MACHINERY_EQUIPMENT">آلات ومعدات وماكينات (25% أساس إهلاك)</option>
                    <option value="VEHICLES">سيارات ووسائل نقل وانتقال (25% أساس إهلاك)</option>
                    <option value="FURNITURE_FIXTURES">أثاث ومفروشات وتجهيزات مكاتب (25%)</option>
                    <option value="COMPUTERS_SOFTWARE">حواسب وبرمجيات ونظم معلومات (50%)</option>
                    <option value="INTANGIBLE_ASSETS">أصول غير ملموسة وشهرة (10% قسط ثابت)</option>
                    <option value="LANDS">أراضي (لا تهلك دفترياً)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم وتوصيف الأصل بالكامل *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: خادم رئيسي Dell PowerEdge R750 + وحدات تخزين"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الشراء والاقتناء *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ بدء التشغيل والاستخدام *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.operationDate}
                    onChange={(e) => setFormData({ ...formData, operationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تكلفة الاقتناء والشراء (ج.م) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formData.acquisitionCost}
                    onChange={(e) => setFormData({ ...formData, acquisitionCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    القيمة التخريدية المقدرة (الخردة)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.scrapValue}
                    onChange={(e) => setFormData({ ...formData, scrapValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    العمر الإنتاجي التقديري (بالسنوات)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.usefulLifeYears}
                    onChange={(e) => {
                      const years = Number(e.target.value);
                      const rate = years > 0 ? +(100 / years).toFixed(2) : 0;
                      setFormData({ ...formData, usefulLifeYears: years, accountingDepreciationRate: rate });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نسبة الإهلاك المحاسبي السنوية %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.accountingDepreciationRate}
                    onChange={(e) => setFormData({ ...formData, accountingDepreciationRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    طريقة الإهلاك المحاسبي
                  </label>
                  <select
                    value={formData.depreciationMethod}
                    onChange={(e) => setFormData({ ...formData, depreciationMethod: e.target.value as DepreciationMethod })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="STRAIGHT_LINE">القسط الثابت (Straight Line)</option>
                    <option value="DECLINING_BALANCE">القسط المتناقص (Declining Balance)</option>
                    <option value="SUM_OF_YEARS_DIGITS">مجموع أرقام السنوات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نسبة الإهلاك الضريبي (قانون 91) %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.taxDepreciationRate}
                    onChange={(e) => setFormData({ ...formData, taxDepreciationRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {!editingAsset && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      مجمع إهلاك افتتاحي سابق (إن وجد)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.initialAccumulatedDepreciation}
                      onChange={(e) => setFormData({ ...formData, initialAccumulatedDepreciation: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الموقع والمقر
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: الفرع الرئيسي - غرفة السيرفرات"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المسؤول والعهدة
                  </label>
                  <input
                    type="text"
                    placeholder="اسم الموظف أو المراجع المستلم للعهدة"
                    value={formData.custodian}
                    onChange={(e) => setFormData({ ...formData, custodian: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الفاتورة أو المستند
                  </label>
                  <input
                    type="text"
                    placeholder="INV-2026-..."
                    value={formData.invoiceRef}
                    onChange={(e) => setFormData({ ...formData, invoiceRef: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الرقم التسلسلي (Serial No)
                  </label>
                  <input
                    type="text"
                    placeholder="S/N..."
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {formData.category === 'MACHINERY_EQUIPMENT' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAccel"
                    checked={formData.isEligibleForAcceleratedDepreciation}
                    onChange={(e) => setFormData({ ...formData, isEligibleForAcceleratedDepreciation: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isAccel" className="text-xs font-bold text-amber-900 cursor-pointer">
                    تطبيق الإهلاك المعجل الإضافي (30%) وفق المادة 27 من قانون الضرائب (آلات ومعدات إنتاجية جديدة)
                  </label>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                >
                  {editingAsset ? 'حفظ التعديلات' : 'إضافة الأصل للسجل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Depreciation Posting Modal */}
      {isPostingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-right">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  توليد وترحيل قيد إهلاك الأصول لليومية
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  إثبات قيد التسوية المحاسبي التلقائي لدفتر اليومية العامة
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-800">تفاصيل القيد المحاسبي المتولد:</div>
                <div className="font-mono text-emerald-800 bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                  <div>من حـ/ مصروف إهلاك الأصول الثابتة (334)</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;إلى حـ/ مجمع إهلاك الأصول الثابتة (231)</div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">دورية الترحيل:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPostingPeriod('ANNUAL')}
                    className={`p-2.5 rounded-xl border text-center font-bold ${
                      postingPeriod === 'ANNUAL'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    قسط إهلاك سنوي ({fiscalYear})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostingPeriod('MONTHLY')}
                    className={`p-2.5 rounded-xl border text-center font-bold ${
                      postingPeriod === 'MONTHLY'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    قسط إهلاك شهري (1/12)
                  </button>
                </div>
              </div>

              {postingPeriod === 'MONTHLY' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الشهر المحاسبي:</label>
                  <select
                    value={postingMonth}
                    onChange={(e) => setPostingMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        شهر {m} / {fiscalYear}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                <div className="flex justify-between items-center">
                  <span>إجمالي مبلغ قيد الإهلاك المحسوب:</span>
                  <span className="font-mono font-black text-sm text-emerald-800">
                    {postingPeriod === 'ANNUAL'
                      ? summary.periodAccountingDep.toLocaleString()
                      : Math.round(summary.periodAccountingDep / 12).toLocaleString()}{' '}
                    ج.م
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsPostingModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handlePostDepreciation}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                تأكيد الترحيل لدفتر اليومية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disposal Modal */}
      {disposalAsset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-right">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              استبعاد أو بيع أصل ثابت
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              الأصل: <span className="font-bold text-slate-800">{disposalAsset.name}</span> (كود: {disposalAsset.assetCode})
            </p>

            <form onSubmit={handleConfirmDisposal} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">تكلفة الاقتناء الأصلية:</span>
                  <span className="font-mono font-bold">{disposalAsset.acquisitionCost.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">مجمع الإهلاك حتى تاريخه:</span>
                  <span className="font-mono font-bold text-amber-700">{disposalAsset.currentAccumulatedDepreciation.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-700 font-bold">صافي القيمة الدفترية:</span>
                  <span className="font-mono font-bold text-emerald-700">{disposalAsset.currentBookValue.toLocaleString()} ج.م</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ الاستبعاد / البيع *</label>
                <input
                  type="date"
                  required
                  value={disposalData.disposalDate}
                  onChange={(e) => setDisposalData({ ...disposalData, disposalDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">قيمة البيع / التعويض المحصل (ج.م) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={disposalData.disposalAmount}
                  onChange={(e) => setDisposalData({ ...disposalData, disposalAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">سبب الاستبعاد وملاحظات التكهين</label>
                <input
                  type="text"
                  value={disposalData.disposalReason}
                  onChange={(e) => setDisposalData({ ...disposalData, disposalReason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {disposalData.disposalAmount > 0 && (
                <div className={`p-3 rounded-xl border text-xs font-bold ${
                  disposalData.disposalAmount - disposalAsset.currentBookValue >= 0
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border-rose-200'
                }`}>
                  {disposalData.disposalAmount - disposalAsset.currentBookValue >= 0
                    ? `أرباح رأسمالية محققة: ${(disposalData.disposalAmount - disposalAsset.currentBookValue).toLocaleString()} ج.م`
                    : `خسائر رأسمالية محققة: ${Math.abs(disposalData.disposalAmount - disposalAsset.currentBookValue).toLocaleString()} ج.م`}
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDisposalAsset(null)}
                  className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
                >
                  تأكيد الاستبعاد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
