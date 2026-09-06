import React, { useState } from 'react';
import { 
  Building2, FileText, Plus, Save, Search, Edit2, Trash2, 
  CheckCircle2, AlertCircle, Shield, Briefcase, MapPin, Hash, DollarSign, Check, Star
} from 'lucide-react';
import { DatabaseState, db } from '../db/localDatabase';
import { ClientArchiveRecord } from '../types';
import { QuickCompanyModal } from './common/QuickCompanyModal';

interface CreditDossierRegistryViewProps {
  state: DatabaseState;
}

export const CreditDossierRegistryView: React.FC<CreditDossierRegistryViewProps> = ({ state }) => {
  const activeClientId = state.activeClientContext?.clientId;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    activeClientId || state.clients[0]?.id || null
  );
  const [isQuickCompanyModalOpen, setIsQuickCompanyModalOpen] = useState(false);

  // Synchronize when activeClientContext changes
  React.useEffect(() => {
    if (activeClientId) {
      setSelectedClientId(activeClientId);
    }
  }, [activeClientId]);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    taxCardNo: '',
    address: '',
    activity: 'تصنيع وتجارة الأجهزة والمنتجات الهندسية',
    companyType: 'JOINT_STOCK' as ClientArchiveRecord['companyType'],
    commercialRegistrationNo: '',
    taxOffice: 'مأمورية ضرائب الشركات المساهمة بالقاهرة',
    capital: 5000000,
    contactPerson: '',
    phone: '',
    email: '',
  });

  const selectedClient = state.clients.find((c) => c.id === selectedClientId) || state.clients[0];

  const handleSelectClient = (client: ClientArchiveRecord) => {
    setSelectedClientId(client.id);
    setFormData({
      name: client.name,
      taxCardNo: client.taxCardNo || '',
      address: client.address || '',
      activity: client.activity || 'تجارة وتوريدات عامة',
      companyType: client.companyType || 'JOINT_STOCK',
      commercialRegistrationNo: client.commercialRegistrationNo || '',
      taxOffice: client.taxOffice || 'مأمورية الضرائب المختصة',
      capital: client.capital || 1000000,
      contactPerson: client.contactPerson || '',
      phone: client.phone || '',
      email: client.email || '',
    });
    setIsEditing(false);
  };

  const handleAddNew = () => {
    setSelectedClientId(null);
    setFormData({
      name: 'شركة جديدة للاستثمار والتوريدات',
      taxCardNo: '300-400-500',
      address: 'القاهرة، مصر',
      activity: 'صناعة وتجارة المقاولات العمومية',
      companyType: 'LLC',
      commercialRegistrationNo: '98765',
      taxOffice: 'مأمورية الاستثمار بالقاهرة',
      capital: 2000000,
      contactPerson: 'المدير التنفيذي',
      phone: '01000000000',
      email: 'info@newcompany.com',
    });
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (selectedClientId) {
      db.updateClient(selectedClientId, {
        name: formData.name,
        taxCardNo: formData.taxCardNo,
        address: formData.address,
        activity: formData.activity,
        companyType: formData.companyType,
        commercialRegistrationNo: formData.commercialRegistrationNo,
        taxOffice: formData.taxOffice,
        capital: Number(formData.capital),
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
      });
    } else {
      const newCl = db.addClient({
        name: formData.name,
        clientCode: `CL-${String(state.clients.length + 1).padStart(3, '0')}`,
        clientType: 'PRIMARY',
        companyType: formData.companyType,
        commercialRegistrationNo: formData.commercialRegistrationNo,
        taxCardNo: formData.taxCardNo,
        taxOffice: formData.taxOffice,
        incomeTaxFileNo: '123-456',
        vatRegistrationNo: formData.taxCardNo,
        socialInsuranceNo: '9876543',
        capital: Number(formData.capital),
        partners: [],
        activity: formData.activity,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        notes: 'تم التسجيل عبر سجل الملف الائتماني والربط المالي',
        procedures: [],
        documents: [],
        folders: [],
        tasksHistory: [],
      });
      setSelectedClientId(newCl.id);
    }
    setIsEditing(false);
  };

  const filteredClients = state.clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.taxCardNo && c.taxCardNo.includes(searchTerm)) ||
      (c.activity && c.activity.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Sidebar: Client List & Selector */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm">
                سجل الشركات والملفات الائتمانية
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsQuickCompanyModalOpen(true)}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="تأسيس سريع مع التحقق الضريبي"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تأسيس سريع</span>
              </button>
              <button
                onClick={handleAddNew}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>نموذج كامل</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم، الرقم الضريبي، أو القطاع..."
              className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredClients.map((client) => {
              const isSelected = client.id === selectedClientId;
              return (
                <div
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-200 shadow-xs'
                      : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                      {client.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {client.clientCode}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    القطاع/النشاط: {client.activity || 'تجارة وتوريدات'}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-400">
                    <span>الرقم الضريبي: {client.taxCardNo || 'غير مسجل'}</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">ملف معتمد</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right / Main Panel: Credit Dossier Registry Form & Details */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-black text-slate-900 dark:text-slate-100 text-base">
                  {selectedClient ? `الملف الائتماني والبيانات الأساسية لـ: ${selectedClient.name}` : 'إضافة شركة جديدة'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                حفظ بيانات الشركة، الرقم الضريبي، العنوان، وتصنيف القطاع للربط مع القوائم المالية وقاعدة البيانات المحلية.
              </p>
            </div>

            {selectedClient && !isEditing && (
              <div className="flex items-center gap-2 flex-wrap">
                {activeClientId === selectedClient.id ? (
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>الشركة النشطة حالياً بالنظام</span>
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      db.setActiveClient(selectedClient.id);
                    }}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="تفعيل هذه الشركة لتكون الهدف في القيود اليومية والقوائم المالية"
                  >
                    <Star className="w-3.5 h-3.5 text-indigo-500" />
                    <span>تعيين كشركة نشطة للنظام</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (selectedClient) handleSelectClient(selectedClient);
                    setIsEditing(true);
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-amber-200"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>تعديل البيانات</span>
                </button>
              </div>
            )}
          </div>

          {selectedClient && !isEditing ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold block">اسم العميل / الشركة</span>
                  <span className="font-black text-sm text-slate-900 dark:text-slate-100 block">{selectedClient.name}</span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold block">الرقم الضريبي الموحد</span>
                  <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 block">{selectedClient.taxCardNo || 'غير متوفر'}</span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold block">تصنيف القطاع / النشاط</span>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">{selectedClient.activity || 'تجارة وتوريدات عامة'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <MapPin className="w-4 h-4 text-indigo-500" />
                    <span>عنوان المركز الرئيسي:</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{selectedClient.address || 'القاهرة، جمهورية مصر العربية'}</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>الممورية والبيانات القانونية:</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    مأمورية الضرائب: {selectedClient.taxOffice || 'كبار الممولين'} | سجل تجاري: {selectedClient.commercialRegistrationNo || 'غير مسجل'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    تم ربط هذا الملف الائتماني بقاعدة البيانات المحلية وقوائم المركز المالي والدخل بنجاح.
                  </span>
                </div>
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 font-mono">
                  رأس المال: {selectedClient.capital ? Number(selectedClient.capital).toLocaleString() + ' ج.م' : 'غير محدد'}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم العميل / الشركة التجاري:
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                    placeholder="مثال: شركة النيل للصناعات الهندسية والتوريدات (ش.م.م)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الرقم الضريبي الموحد:
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.taxCardNo}
                    onChange={(e) => setFormData({ ...formData, taxCardNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono"
                    placeholder="مثال: 312-456-789"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تصنيف القطاع / النشاط الاقتصادي:
                  </label>
                  <input
                    type="text"
                    value={formData.activity}
                    onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                    placeholder="مثال: المقاولات العمومية والتجارة الإلكترونية"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم السجل التجاري:
                  </label>
                  <input
                    type="text"
                    value={formData.commercialRegistrationNo}
                    onChange={(e) => setFormData({ ...formData, commercialRegistrationNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono"
                    placeholder="مثال: 45218"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    عنوان الشركة الرئيسي:
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                    placeholder="مثال: 15 شارع الهرم، الجيزة، مصر"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    مأمورية الضرائب التابع لها:
                  </label>
                  <input
                    type="text"
                    value={formData.taxOffice}
                    onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                    placeholder="مثال: مأمورية ضرائب الشركات المساهمة بالقاهرة"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رأس المال المرخص به / المدفوع (ج.م):
                  </label>
                  <input
                    type="number"
                    value={formData.capital}
                    onChange={(e) => setFormData({ ...formData, capital: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ وتثبيت في قاعدة البيانات المحلية</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Quick Company Add Modal */}
      <QuickCompanyModal
        isOpen={isQuickCompanyModalOpen}
        onClose={() => setIsQuickCompanyModalOpen(false)}
        onCompanyCreated={(newCl) => {
          setSelectedClientId(newCl.id);
          db.setActiveClient(newCl.id);
        }}
      />
    </div>
  );
};
