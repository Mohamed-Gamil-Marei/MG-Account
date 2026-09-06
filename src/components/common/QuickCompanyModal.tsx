import React, { useState } from 'react';
import {
  Building2,
  Plus,
  X,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Briefcase,
  MapPin,
  DollarSign,
} from 'lucide-react';
import { db } from '../../db/localDatabase';
import { ClientArchiveRecord } from '../../types';

interface QuickCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyCreated: (newClient: ClientArchiveRecord) => void;
  initialName?: string;
}

export const QuickCompanyModal: React.FC<QuickCompanyModalProps> = ({
  isOpen,
  onClose,
  onCompanyCreated,
  initialName = '',
}) => {
  const [name, setName] = useState(initialName);
  const [companyType, setCompanyType] = useState<ClientArchiveRecord['companyType']>('JOINT_STOCK');
  const [taxCardNo, setTaxCardNo] = useState('');
  const [commercialRegNo, setCommercialRegNo] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [incomeTaxFileNo, setIncomeTaxFileNo] = useState('');
  const [socialInsuranceNo, setSocialInsuranceNo] = useState('');
  const [activity, setActivity] = useState('');
  const [capital, setCapital] = useState<number | ''>(5000000);
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [relationshipType, setRelationshipType] = useState<'PERMANENT' | 'TEMPORARY'>('PERMANENT');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('يرجى إدخال اسم الشركة أو المنشأة');
      return;
    }

    const currentYear = new Date().getFullYear();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const generatedCode = `CL-${currentYear}-${randomSuffix}`;
    const now = new Date().toISOString();

    const newClientData: Omit<ClientArchiveRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      clientCode: generatedCode,
      name: name.trim(),
      clientType: relationshipType === 'PERMANENT' ? 'PRIMARY' : 'CASUAL',
      relationshipType,
      companyType,
      taxCardNo: taxCardNo.trim() || 'غير مسجل',
      commercialRegistrationNo: commercialRegNo.trim() || 'غير مسجل',
      taxOffice: taxOffice.trim() || 'مأمورية ضرائب كبار الممولين',
      incomeTaxFileNo: incomeTaxFileNo.trim() || '',
      vatRegistrationNo: taxCardNo.trim() || '',
      socialInsuranceNo: socialInsuranceNo.trim() || '',
      activity: activity.trim() || 'أنشطة تجارية وصناعية عامة',
      capital: typeof capital === 'number' ? capital : 1000000,
      address: address.trim() || 'القاهرة، مصر',
      contactPerson: contactPerson.trim() || 'الإدارة المالية',
      phone: phone.trim() || '',
      email: '',
      partners: [],
      notes: 'تمت الإضافة السريعة عبر شاشة إدارة ومتابعة الشركات والقيود',
      procedures: [],
      documents: [],
      folders: [
        { id: `f-1-${Date.now()}`, clientId: '', name: 'القوائم المالية', createdAt: now },
        { id: `f-2-${Date.now()}`, clientId: '', name: 'قيود اليومية', createdAt: now },
        { id: `f-3-${Date.now()}`, clientId: '', name: 'الملف الائتماني', createdAt: now },
        { id: `f-4-${Date.now()}`, clientId: '', name: 'المستندات القانونية', createdAt: now },
      ],
      tasksHistory: [],
    };

    const createdClient = db.addClient(newClientData);
    db.setActiveClient(createdClient.id, { autoFilter: true });
    onCompanyCreated(createdClient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 text-right animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                إضافة وتأسيس شركة / عميل جديد
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تسجيل البيانات الرسمية لاعتمادها في القيود، القوائم المالية، والملف الائتماني
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                اسم الشركة / المنشأة بالكامل *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: شركة النيل للصناعات الهندسية والتوريدات (ش.م.م)"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                الشكل القانوني للشركة
              </label>
              <select
                value={companyType}
                onChange={(e) => setCompanyType(e.target.value as ClientArchiveRecord['companyType'])}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="JOINT_STOCK">شركة مساهمة مصرية (ش.م.م)</option>
                <option value="LLC">شركة ذات مسؤولية محدودة (ش.ذ.م.م)</option>
                <option value="SOLE_PROPRIETORSHIP">منشأة فردية</option>
                <option value="PARTNERSHIP">شركة أشخاص / تضامن وتوصية</option>
                <option value="INDIVIDUAL">مهني / شخص طبيعي</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                طبيعة التعاقد مع المكتب
              </label>
              <select
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PERMANENT">عميل دائم (إمساك دفاتر ومراجعة سنوية)</option>
                <option value="TEMPORARY">عميل مؤقت / استشارة وخدمة محددة</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                رقم التسجيل الضريبي (البطاقة الضريبية)
              </label>
              <input
                type="text"
                value={taxCardNo}
                onChange={(e) => setTaxCardNo(e.target.value)}
                placeholder="مثال: 492-817-302"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                رقم السجل التجاري
              </label>
              <input
                type="text"
                value={commercialRegNo}
                onChange={(e) => setCommercialRegNo(e.target.value)}
                placeholder="مثال: 109482 جنوب الجيزة"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                مأمورية الضرائب المختصة
              </label>
              <input
                type="text"
                value={taxOffice}
                onChange={(e) => setTaxOffice(e.target.value)}
                placeholder="مثال: مأمورية ضرائب كبار الممولين"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                رأس المال المصدر والمدفوع (ج.م)
              </label>
              <input
                type="number"
                value={capital}
                onChange={(e) => setCapital(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="5000000"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                النشاط الفعلي / القطاع
              </label>
              <input
                type="text"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                placeholder="مثال: تصنيع وتوريد المعدات الهندسية والمقاولات المتخصصة"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                عنوان المقر الرئيسي
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="مثال: المنطقة الصناعية - 6 أكتوبر - الجيزة"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                المسؤول / المفوض بالتوقيع
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="مثال: رئيس مجلس الإدارة / المدير المالي"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تأسيس الشركة وتعيينها كشركة نشطة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
