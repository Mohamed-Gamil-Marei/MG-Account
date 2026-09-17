import React, { useState, useRef } from 'react';
import {
  Folder,
  FolderPlus,
  FileText,
  Upload,
  Search,
  Plus,
  Trash2,
  Edit2,
  MoveRight,
  Download,
  Eye,
  Tag,
  Shield,
  Percent,
  Scale,
  Briefcase,
  Layers,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  ArrowRight,
  Filter,
  Send,
  ShieldCheck,
  Clock,
  Sparkles,
  RotateCcw,
  Printer,
  ChevronDown,
  Award,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { ClientArchiveRecord, ClientDocument, ClientDocumentFolder } from '../types';
import { db } from '../db/localDatabase';
import { WhatsAppDocumentShareModal } from './archive/WhatsAppDocumentShareModal';
import { AutoArchiverService, HeaderVerificationResult } from '../services/AutoArchiver';
import { ArchivedSnapshotModal } from './archive/ArchivedSnapshotModal';
import { FinalFinancialReportViewerModal } from './archive/FinalFinancialReportViewerModal';

interface ClientDocumentManagerProps {
  client: ClientArchiveRecord;
}

export const ClientDocumentManager: React.FC<ClientDocumentManagerProps> = ({ client }) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('ALL');
  const [searchDocQuery, setSearchDocQuery] = useState('');
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [isMoveDocModalOpen, setIsMoveDocModalOpen] = useState(false);
  const [targetDocToMove, setTargetDocToMove] = useState<ClientDocument | null>(null);
  const [destinationFolderId, setDestinationFolderId] = useState<string>('');

  // WhatsApp Document Share Modal
  const [isDocShareModalOpen, setIsDocShareModalOpen] = useState(false);
  const [targetDocToShare, setTargetDocToShare] = useState<ClientDocument | null>(null);

  // AutoArchiver Snapshot Modal & Background Trigger
  const [selectedArchivedDoc, setSelectedArchivedDoc] = useState<ClientDocument | null>(null);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isAutoArchivingNow, setIsAutoArchivingNow] = useState(false);
  const [autoArchiveNotice, setAutoArchiveNotice] = useState<string | null>(null);

  // Final Financial Report Viewer Modal & Header Verification state
  const [selectedDocForFinalReport, setSelectedDocForFinalReport] = useState<ClientDocument | null>(null);
  const [isFinalReportModalOpen, setIsFinalReportModalOpen] = useState(false);
  const [openDropdownDocId, setOpenDropdownDocId] = useState<string | null>(null);
  const [verifiedHeaderToast, setVerifiedHeaderToast] = useState<{ title: string; result: HeaderVerificationResult } | null>(null);

  const handleVerifyHeader = (doc: ClientDocument) => {
    const result = AutoArchiverService.verifyDocumentHeaderPresence(doc, client);
    setVerifiedHeaderToast({ title: doc.title, result });
    setTimeout(() => {
      setVerifiedHeaderToast(null);
    }, 7000);
  };

  // Editing Folder
  const [editingFolder, setEditingFolder] = useState<ClientDocumentFolder | null>(null);

  // New Folder Form
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('blue');
  const [newFolderIcon, setNewFolderIcon] = useState('folder');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  // Upload Doc Form
  const [docTitle, setDocTitle] = useState('');
  const [docFolderId, setDocFolderId] = useState<string>('');
  const [docType, setDocType] = useState<ClientDocument['documentType']>('FINANCIAL_REPORT');
  const [docTag, setDocTag] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileSize, setSelectedFileSize] = useState('');
  const [selectedFileDataUrl, setSelectedFileDataUrl] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const folders = client.folders || [];
  const documents = client.documents || [];

  // Count documents per folder
  const getDocCountForFolder = (folderId: string) => {
    return documents.filter((d) => d.folderId === folderId).length;
  };

  const unassignedCount = documents.filter((d) => !d.folderId).length;

  // Filtered documents
  const filteredDocs = documents.filter((d) => {
    const matchesFolder =
      selectedFolderId === 'ALL'
        ? true
        : selectedFolderId === 'UNASSIGNED'
        ? !d.folderId
        : d.folderId === selectedFolderId;

    const q = (searchDocQuery || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (d.title || '').toLowerCase().includes(q) ||
      (d.fileName && d.fileName.toLowerCase().includes(q)) ||
      (d.tag && d.tag.toLowerCase().includes(q)) ||
      (d.notes && d.notes.toLowerCase().includes(q)) ||
      (d.folderName && d.folderName.toLowerCase().includes(q));

    return matchesFolder && matchesSearch;
  });

  // Handle folder creation / edit
  const handleSaveFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    if (editingFolder) {
      db.updateClientFolder(client.id, editingFolder.id, {
        name: newFolderName.trim(),
        color: newFolderColor,
        icon: newFolderIcon,
        description: newFolderDesc,
      });
    } else {
      db.addClientFolder(client.id, {
        name: newFolderName.trim(),
        color: newFolderColor,
        icon: newFolderIcon,
        description: newFolderDesc,
        isDefault: false,
      });
    }

    setEditingFolder(null);
    setNewFolderName('');
    setNewFolderDesc('');
    setIsAddFolderModalOpen(false);
  };

  const handleOpenEditFolder = (fld: ClientDocumentFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolder(fld);
    setNewFolderName(fld.name);
    setNewFolderColor(fld.color || 'blue');
    setNewFolderIcon(fld.icon || 'folder');
    setNewFolderDesc(fld.description || '');
    setIsAddFolderModalOpen(true);
  };

  const handleDeleteFolder = (fld: ClientDocumentFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`هل أنت متأكد من حذف المجلد [${fld.name}]؟ سيتم الاحتفاظ بالمستندات في الأرشيف العام دون حذفها.`)) {
      db.deleteClientFolder(client.id, fld.id);
      if (selectedFolderId === fld.id) {
        setSelectedFolderId('ALL');
      }
    }
  };

  // Handle File Input Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    setSelectedFileSize(`${sizeInMB} MB`);

    if (!docTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setDocTitle(cleanName);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedFileDataUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle File Upload Submit
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) {
      alert('يرجى كتابة عنوان للمستند');
      return;
    }

    const targetFolder = folders.find((f) => f.id === docFolderId);

    db.addClientDocument(client.id, {
      folderId: docFolderId || undefined,
      folderName: targetFolder ? targetFolder.name : undefined,
      title: docTitle.trim(),
      documentType: docType,
      fileDataUrl: selectedFileDataUrl || '#',
      fileName: selectedFileName || `${docTitle.trim()}.pdf`,
      fileSize: selectedFileSize || '1.5 MB',
      tag: docTag.trim() || undefined,
      notes: docNotes.trim() || undefined,
    });

    // Reset
    setDocTitle('');
    setSelectedFileName('');
    setSelectedFileSize('');
    setSelectedFileDataUrl('');
    setDocTag('');
    setDocNotes('');
    setIsUploadDocModalOpen(false);
  };

  const handleDeleteDoc = (docId: string, title: string) => {
    if (confirm(`هل تريد بالتأكيد حذف المستند [${title}] نهائياً من أرشيف العميل؟`)) {
      db.deleteClientDocument(client.id, docId);
    }
  };

  const handleOpenMoveModal = (doc: ClientDocument) => {
    setTargetDocToMove(doc);
    setDestinationFolderId(doc.folderId || '');
    setIsMoveDocModalOpen(true);
  };

  const handleExecuteMove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDocToMove) return;

    const targetFolder = folders.find((f) => f.id === destinationFolderId);
    db.moveClientDocument(
      client.id,
      targetDocToMove.id,
      destinationFolderId,
      targetFolder ? targetFolder.name : 'الأرشيف العام'
    );

    setIsMoveDocModalOpen(false);
    setTargetDocToMove(null);
  };

  const renderFolderIcon = (iconName?: string, color?: string) => {
    const colorClasses: Record<string, string> = {
      blue: 'text-blue-600 bg-blue-50 border-blue-200',
      emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      red: 'text-rose-600 bg-rose-50 border-rose-200',
      purple: 'text-purple-600 bg-purple-50 border-purple-200',
      amber: 'text-amber-600 bg-amber-50 border-amber-200',
      teal: 'text-teal-600 bg-teal-50 border-teal-200',
      indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    };
    const cClass = colorClasses[color || 'blue'] || colorClasses.blue;

    switch (iconName) {
      case 'shield':
        return <Shield className="w-5 h-5" />;
      case 'file-text':
        return <FileText className="w-5 h-5" />;
      case 'percent':
        return <Percent className="w-5 h-5" />;
      case 'scale':
        return <Scale className="w-5 h-5" />;
      case 'briefcase':
        return <Briefcase className="w-5 h-5" />;
      default:
        return <Folder className="w-5 h-5" />;
    }
  };

  const activeFolderObject = folders.find((f) => f.id === selectedFolderId);

  const handleTriggerAutoArchive = () => {
    setIsAutoArchivingNow(true);
    try {
      const res = AutoArchiverService.archiveCurrentActiveFinancials(
        undefined,
        undefined,
        `أرشفة آلية مباشرة من واجهة أرشيف العميل: ${client.name}`
      );
      if (res.success && res.timestampCode) {
        setAutoArchiveNotice(`تمت الأرشفة الآلية للمستند المالي بنجاح بكود توثيق معتمد: ${res.timestampCode}`);
        setTimeout(() => setAutoArchiveNotice(null), 6000);
      } else {
        alert('تعذر إتمام الأرشفة: ' + (res.error || 'خطأ غير معروف'));
      }
    } catch (err: any) {
      alert('خطأ: ' + err?.message);
    } finally {
      setIsAutoArchivingNow(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* AutoArchive Success Notice */}
      {autoArchiveNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-emerald-900 font-bold text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{autoArchiveNotice}</span>
          </div>
          <button
            onClick={() => setAutoArchiveNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">الأرشيف الإلكتروني وتصنيف المستندات</h4>
            <p className="text-[11px] text-slate-500">
              تنظيم وتصنيف القوائم المالية، السجلات، الإقرارات، وتقارير المراجعة لكل عميل بمجلدات متخصصة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleTriggerAutoArchive}
            disabled={isAutoArchivingNow}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 transition-all"
            title="أرشفة القوائم والتقارير المالية المعتمدة للعميل تلقائياً في الخلفية بترميز زمني"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>{isAutoArchivingNow ? 'جاري الأرشفة...' : 'أرشفة آلية فورية (AutoArchiver)'}</span>
          </button>

          <button
            onClick={() => {
              setEditingFolder(null);
              setNewFolderName('');
              setNewFolderDesc('');
              setIsAddFolderModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-indigo-600" />
            <span>إنشاء مجلد جديد</span>
          </button>

          <button
            onClick={() => {
              setDocFolderId(selectedFolderId !== 'ALL' && selectedFolderId !== 'UNASSIGNED' ? selectedFolderId : (folders[0]?.id || ''));
              setIsUploadDocModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>رفع وأرشفة مستند</span>
          </button>
        </div>
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* ALL Folder Tab */}
        <div
          onClick={() => setSelectedFolderId('ALL')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            selectedFolderId === 'ALL'
              ? 'bg-indigo-900 text-white border-indigo-900 shadow-md scale-[1.02]'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${selectedFolderId === 'ALL' ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-700'}`}>
              <Layers className="w-4 h-4" />
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${selectedFolderId === 'ALL' ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-100 text-slate-700'}`}>
              {documents.length}
            </span>
          </div>
          <div>
            <span className="font-bold text-xs block truncate">كافة المستندات</span>
            <span className={`text-[10px] block mt-0.5 ${selectedFolderId === 'ALL' ? 'text-indigo-200' : 'text-slate-400'}`}>
              جميع الأقسام ({documents.length})
            </span>
          </div>
        </div>

        {/* Custom Folders */}
        {folders.map((fld) => {
          const docCount = getDocCountForFolder(fld.id);
          const isSelected = selectedFolderId === fld.id;
          return (
            <div
              key={fld.id}
              onClick={() => setSelectedFolderId(fld.id)}
              className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${isSelected ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                  {renderFolderIcon(fld.icon, fld.color)}
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                    {docCount}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-bold text-xs block truncate" title={fld.name}>
                  {fld.name}
                </span>
                <span className={`text-[10px] block mt-0.5 truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                  {fld.description || `${docCount} ملفات`}
                </span>
              </div>

              {/* Folder quick actions */}
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 backdrop-blur-xs rounded-lg p-0.5 shadow-xs border border-slate-200">
                <button
                  type="button"
                  onClick={(e) => handleOpenEditFolder(fld, e)}
                  title="تعديل اسم وتصنيف المجلد"
                  className="p-1 hover:bg-slate-100 text-slate-600 rounded cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                {!fld.isDefault && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteFolder(fld, e)}
                    title="حذف المجلد"
                    className="p-1 hover:bg-rose-50 text-rose-600 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Unassigned Folder if any */}
        {unassignedCount > 0 && (
          <div
            onClick={() => setSelectedFolderId('UNASSIGNED')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              selectedFolderId === 'UNASSIGNED'
                ? 'bg-amber-900 text-white border-amber-900 shadow-md scale-[1.02]'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${selectedFolderId === 'UNASSIGNED' ? 'bg-amber-800 text-white' : 'bg-amber-50 text-amber-700'}`}>
                <Folder className="w-4 h-4" />
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${selectedFolderId === 'UNASSIGNED' ? 'bg-amber-800 text-amber-200' : 'bg-amber-100 text-amber-800'}`}>
                {unassignedCount}
              </span>
            </div>
            <div>
              <span className="font-bold text-xs block truncate">بدون تصنيف</span>
              <span className={`text-[10px] block mt-0.5 ${selectedFolderId === 'UNASSIGNED' ? 'text-amber-200' : 'text-slate-400'}`}>
                ملفات بحاجة للتصنيف
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Documents Section Header & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              المستندات في {selectedFolderId === 'ALL' ? 'كافة المجلدات' : activeFolderObject ? `مجلد: [${activeFolderObject.name}]` : 'المستندات العامة'}
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono font-bold">
              {filteredDocs.length} مستند
            </span>
          </div>

          {/* Search Bar within docs */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchDocQuery}
              onChange={(e) => setSearchDocQuery(e.target.value)}
              placeholder="بحث في أسماء المستندات والوسوم..."
              className="w-full pl-3 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-500 outline-none font-medium"
            />
          </div>
        </div>

        {/* Documents Table / Grid List */}
        {filteredDocs.length > 0 ? (
          <div className="space-y-2 pt-2">
            {filteredDocs.map((doc) => {
              const matchedFolder = folders.find((f) => f.id === doc.folderId);
              const isAutoArchived = AutoArchiverService.isAutoArchived(doc);
              const timestampCode = AutoArchiverService.extractTimestampCode(doc);
              const isHeaderVerified = AutoArchiverService.isHeaderVerified(doc);

              return (
                <div
                  key={doc.id}
                  className={`p-3.5 rounded-xl bg-white border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                    isAutoArchived
                      ? 'border-emerald-300 hover:border-emerald-500 bg-emerald-50/20 shadow-2xs'
                      : 'border-slate-200 hover:border-indigo-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                        isAutoArchived
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      {isAutoArchived ? <ShieldCheck className="w-5 h-5 text-emerald-700" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{doc.title}</span>
                        {isAutoArchived && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-300 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-emerald-700" />
                            <span>ترميز زمني: {timestampCode || 'معتمد'}</span>
                          </span>
                        )}

                        {/* خاصية التحقق من وجود الترويسة في كل مستند مالي */}
                        {isHeaderVerified ? (
                          <button
                            type="button"
                            onClick={() => handleVerifyHeader(doc)}
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-300 flex items-center gap-1 font-mono cursor-pointer hover:bg-emerald-200 transition-colors"
                            title="الترويسة الرسمية معتمدة ومحققة نظامياً (انقر لفحص تفاصيل الترويسة)"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-700" />
                            <span>ترويسة معتمدة ومحققة ✓</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleVerifyHeader(doc)}
                            className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-bold border border-amber-300 flex items-center gap-1 font-mono cursor-pointer hover:bg-amber-100 transition-colors"
                            title="انقر لفحص والتحقق من الترويسة"
                          >
                            <AlertCircle className="w-3 h-3 text-amber-700" />
                            <span>فحص الترويسة</span>
                          </button>
                        )}

                        {doc.tag && !isAutoArchived && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200">
                            {doc.tag}
                          </span>
                        )}
                        {matchedFolder && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium flex items-center gap-1">
                            <Folder className="w-3 h-3 text-slate-500" />
                            <span>{matchedFolder.name}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 font-mono flex-wrap">
                        <span>اسم الملف: {doc.fileName}</span>
                        <span>• الحجم: {doc.fileSize || '2 MB'}</span>
                        <span>• تاريخ الأرشفة: {doc.uploadedAt}</span>
                      </div>

                      {doc.notes && (
                        <p className="text-[11px] text-slate-600 mt-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block font-mono">
                          {doc.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Quick Dropdown */}
                  <div className="flex items-center gap-1.5 self-end md:self-center shrink-0 flex-wrap relative">
                    {/* قائمة إجراءات سريعة (Dropdown) فوق كل مستند */}
                    <div className="relative inline-block text-right">
                      <button
                        type="button"
                        onClick={() => setOpenDropdownDocId(openDropdownDocId === doc.id ? null : doc.id)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                        title="فتح قائمة الإجراءات السريعة للمستند"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdownDocId === doc.id ? 'rotate-180' : ''}`} />
                        <span>إجراءات سريعة</span>
                      </button>

                      {openDropdownDocId === doc.id && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setOpenDropdownDocId(null)}
                          />
                          <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                            {/* الخيار المطلوب: طباعة التقرير بالترويسة الرسمية */}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenDropdownDocId(null);
                                setSelectedDocForFinalReport(doc);
                                setIsFinalReportModalOpen(true);
                              }}
                              className="w-full px-3.5 py-2.5 text-right text-xs font-bold text-emerald-950 bg-emerald-50/80 hover:bg-emerald-100 flex items-center gap-2.5 cursor-pointer transition-colors border-b border-emerald-100"
                            >
                              <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div className="text-right">
                                <span className="block font-extrabold text-emerald-900">طباعة التقرير بالترويسة الرسمية</span>
                                <span className="block text-[10px] text-emerald-700 font-normal">تنسيق معتمد A4 مع بيانات المكتب والختم</span>
                              </div>
                            </button>

                            {/* عرض نموذج التقرير المالي الختامي المعتمد المخصص */}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenDropdownDocId(null);
                                setSelectedDocForFinalReport(doc);
                                setIsFinalReportModalOpen(true);
                              }}
                              className="w-full px-3.5 py-2 text-right text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span>عرض التقرير المالي الختامي المعتمد</span>
                            </button>

                            {/* فحص والتحقق من وجود الترويسة */}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenDropdownDocId(null);
                                handleVerifyHeader(doc);
                              }}
                              className="w-full px-3.5 py-2 text-right text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>فحص والتحقق من الترويسة والاعتماد</span>
                            </button>

                            {isAutoArchived && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenDropdownDocId(null);
                                  setSelectedArchivedDoc(doc);
                                  setIsSnapshotModalOpen(true);
                                }}
                                className="w-full px-3.5 py-2 text-right text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span>استرجاع لقطة الأرشيف المحاسبية</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setOpenDropdownDocId(null);
                                setTargetDocToShare(doc);
                                setIsDocShareModalOpen(true);
                              }}
                              className="w-full px-3.5 py-2 text-right text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Send className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>إرسال عبر WhatsApp للعميل</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenDropdownDocId(null);
                                handleOpenMoveModal(doc);
                              }}
                              className="w-full px-3.5 py-2 text-right text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <MoveRight className="w-4 h-4 text-slate-500 shrink-0" />
                              <span>نقل إلى مجلد آخر</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenDropdownDocId(null);
                                handleDeleteDoc(doc.id, doc.title);
                              }}
                              className="w-full px-3.5 py-2 text-right text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                              <span>حذف المستند من الأرشيف</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* زر مباشر وسريع لطباعة التقرير بالترويسة الرسمية */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDocForFinalReport(doc);
                        setIsFinalReportModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                      title="طباعة التقرير بالترويسة الرسمية"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">طباعة بالترويسة</span>
                    </button>

                    {isAutoArchived && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedArchivedDoc(doc);
                          setIsSnapshotModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="استرجاع وفحص لقطة البيانات المالية المؤرشفة"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                        <span className="hidden sm:inline">استرجاع</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setTargetDocToShare(doc);
                        setIsDocShareModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="إرسال المستند المالي للعميل عبر WhatsApp API"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">واتساب</span>
                    </button>

                    <button
                      onClick={() => {
                        if (isAutoArchived) {
                          setSelectedArchivedDoc(doc);
                          setIsSnapshotModalOpen(true);
                        } else {
                          alert(`جاري تنزيل / معاينة المستند المرفق: [${doc.title}] (${doc.fileName})`);
                        }
                      }}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="تنزيل / معاينة"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">تنزيل</span>
                    </button>

                    <button
                      onClick={() => handleDeleteDoc(doc.id, doc.title)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="حذف المستند"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Folder className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h5 className="text-xs font-bold text-slate-700">لا توجد مستندات في هذا المجلد</h5>
            <p className="text-[11px] text-slate-400 mt-1">
              انقر على زر "رفع وأرشفة مستند" لإضافة القوائم المالية، الفواتير، أو السجلات القانونية.
            </p>
            <button
              onClick={() => {
                setDocFolderId(selectedFolderId !== 'ALL' && selectedFolderId !== 'UNASSIGNED' ? selectedFolderId : (folders[0]?.id || ''));
                setIsUploadDocModalOpen(true);
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>رفع مستند الآن</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal 1: Add / Edit Folder */}
      {isAddFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-700" />
                <h4 className="text-sm font-bold text-slate-900">
                  {editingFolder ? 'تعديل مجلد المستندات' : 'إنشاء مجلد مستندات جديد'}
                </h4>
              </div>
              <button
                onClick={() => setIsAddFolderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFolder} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم المجلد والتصنيف *</label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="مثال: القوائم المالية المعتمدة 2025، فحص ضريبة الدمغة..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">أيقونة المجلد</label>
                  <select
                    value={newFolderIcon}
                    onChange={(e) => setNewFolderIcon(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="folder">📁 مجلد عام (Folder)</option>
                    <option value="file-text">📄 قوائم مالية (Statements)</option>
                    <option value="shield">🛡️ قانوني وتأسيسي (Legal)</option>
                    <option value="percent">% ضرائب وفواتير (Taxes)</option>
                    <option value="scale">⚖️ مراجعة ولجان (Audit)</option>
                    <option value="briefcase">💼 عقود وإداري (Contracts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">لون التمييز</label>
                  <select
                    value={newFolderColor}
                    onChange={(e) => setNewFolderColor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="blue">أزرق مالي</option>
                    <option value="emerald">أخضر قانوني</option>
                    <option value="red">أحمر ضريبي</option>
                    <option value="purple">بنفسجي رقابي</option>
                    <option value="amber">كهرماني إداري</option>
                    <option value="teal">سماوي / بترولي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">وصف المجلد والغرض منه</label>
                <textarea
                  rows={2}
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="وصف مختصر لمحتويات المجلد..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddFolderModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{editingFolder ? 'حفظ التعديلات' : 'إنشاء المجلد'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Upload Document */}
      {isUploadDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-700" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">أرشفة ورفع مستند جديد لملف العميل</h4>
                  <span className="text-slate-500 text-[11px]">{client.name}</span>
                </div>
              </div>
              <button
                onClick={() => setIsUploadDocModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 mt-4">
              {/* File Drop / Select Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl text-center cursor-pointer transition-all"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
                />
                <Upload className="w-8 h-8 text-emerald-700 mx-auto mb-2" />
                {selectedFileName ? (
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">{selectedFileName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">الحجم: {selectedFileSize}</span>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">اسحب الملف هنا أو انقر للاختيار</span>
                    <span className="text-[10px] text-slate-500">يدعم مستندات PDF، جداول Excel، والصور الممسوحة ضوئياً</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان المستند بالأرشيف *</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="مثال: القوائم المالية 2025 معتمدة، إشعار سداد القيمة المضافة..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المجلد / التصنيف المستهدف</label>
                  <select
                    value={docFolderId}
                    onChange={(e) => setDocFolderId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="">-- بدون مجلد (الأرشيف العام) --</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع الوثيقة</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="FINANCIAL_REPORT">قوائم مالية وميزانيات</option>
                    <option value="TAX_CARD">بطاقة ضريبية</option>
                    <option value="COMMERCIAL_REG">سجل تجاري</option>
                    <option value="AUDIT_REPORT">تقرير مراقب الحسابات</option>
                    <option value="TAX_RETURN">إقرار / إشعار ضريبي</option>
                    <option value="ARTICLES_OF_INC">عقد تأسيس / تعديل</option>
                    <option value="POWER_OF_ATTORNEY">توكيل رسمي عام / خاص</option>
                    <option value="CONTRACT">عقود واتفاقيات</option>
                    <option value="RECEIPT">إيصال سداد رسوم</option>
                    <option value="OTHER">مستند ومحرر رسمي آخر</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">وسم المستند (Tag)</label>
                  <input
                    type="text"
                    value={docTag}
                    onChange={(e) => setDocTag(e.target.value)}
                    placeholder="مثال: ساري، معتمد، نهائي 2025"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ملاحظات إضافية</label>
                  <input
                    type="text"
                    value={docNotes}
                    onChange={(e) => setDocNotes(e.target.value)}
                    placeholder="رقم القيد، جهة الإصدار..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadDocModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>حفظ وأرشفة المستند</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Move Document */}
      {isMoveDocModalOpen && targetDocToMove && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <MoveRight className="w-5 h-5 text-indigo-700" />
                <h4 className="text-sm font-bold text-slate-900">نقل المستند إلى مجلد آخر</h4>
              </div>
              <button
                onClick={() => setIsMoveDocModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteMove} className="space-y-4 mt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block">المستند المراد نقله:</span>
                <span className="font-bold text-slate-900 text-xs">{targetDocToMove.title}</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">اختر المجلد الجديد</label>
                <select
                  value={destinationFolderId}
                  onChange={(e) => setDestinationFolderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="">-- بدون تصنيف (الأرشيف العام) --</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMoveDocModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>تأكيد النقل</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Document Share Modal */}
      {isDocShareModalOpen && (
        <WhatsAppDocumentShareModal
          isOpen={isDocShareModalOpen}
          onClose={() => {
            setIsDocShareModalOpen(false);
            setTargetDocToShare(null);
          }}
          client={client}
          state={db.getState()}
          initialDoc={targetDocToShare}
        />
      )}

      {/* Archived Snapshot Inspect & Restore Modal */}
      {isSnapshotModalOpen && selectedArchivedDoc && (
        <ArchivedSnapshotModal
          isOpen={isSnapshotModalOpen}
          onClose={() => {
            setIsSnapshotModalOpen(false);
            setSelectedArchivedDoc(null);
          }}
          document={selectedArchivedDoc}
          onRestoreSuccess={(msg) => {
            setAutoArchiveNotice(msg);
            setTimeout(() => setAutoArchiveNotice(null), 7000);
          }}
        />
      )}

      {/* Final Financial Report Dedicated Certified View Modal */}
      {isFinalReportModalOpen && selectedDocForFinalReport && (
        <FinalFinancialReportViewerModal
          isOpen={isFinalReportModalOpen}
          onClose={() => {
            setIsFinalReportModalOpen(false);
            setSelectedDocForFinalReport(null);
          }}
          document={selectedDocForFinalReport}
          client={client}
          onRestoreSuccess={(msg) => {
            setAutoArchiveNotice(msg);
            setTimeout(() => setAutoArchiveNotice(null), 7000);
          }}
        />
      )}

      {/* Official Header Verification Toast / Dialog */}
      {verifiedHeaderToast && (
        <div className="fixed bottom-6 left-6 z-50 max-w-md bg-white border-2 border-emerald-500 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h5 className="font-extrabold text-xs text-slate-900">
                  نتيجة التحقق من الترويسة والاعتماد المهني
                </h5>
                <button
                  type="button"
                  onClick={() => setVerifiedHeaderToast(null)}
                  className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                المستند: <strong className="text-slate-900">{verifiedHeaderToast.title}</strong>
              </p>
              <div className="mt-2 p-2 bg-emerald-50/80 rounded-lg border border-emerald-200 text-[11px] space-y-1 text-emerald-950 font-mono">
                <div>• حالة الترويسة: <span className="font-bold text-emerald-800">{verifiedHeaderToast.result.statusText}</span></div>
                <div>• مراقب الحسابات: {verifiedHeaderToast.result.auditorName}</div>
                <div>• رقم القيد: {verifiedHeaderToast.result.licenseNumber}</div>
                <div>• منشأة العميل: {verifiedHeaderToast.result.clientLegalName}</div>
                <div>• البطاقة الضريبية: {verifiedHeaderToast.result.taxRegistrationNumber}</div>
                {verifiedHeaderToast.result.timestampCode && (
                  <div>• كود التوثيق: {verifiedHeaderToast.result.timestampCode}</div>
                )}
              </div>
              <div className="mt-2.5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const doc = documents.find((d) => d.title === verifiedHeaderToast.title) || selectedDocForFinalReport;
                    setVerifiedHeaderToast(null);
                    if (doc) {
                      setSelectedDocForFinalReport(doc);
                      setIsFinalReportModalOpen(true);
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3 h-3" />
                  <span>طباعة بالترويسة الرسمية</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
