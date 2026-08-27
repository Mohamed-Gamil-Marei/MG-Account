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
} from 'lucide-react';
import { ClientArchiveRecord, ClientDocument, ClientDocumentFolder } from '../types';
import { db } from '../db/localDatabase';

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

    const matchesSearch =
      d.title.toLowerCase().includes(searchDocQuery.toLowerCase()) ||
      (d.fileName && d.fileName.toLowerCase().includes(searchDocQuery.toLowerCase())) ||
      (d.tag && d.tag.toLowerCase().includes(searchDocQuery.toLowerCase())) ||
      (d.notes && d.notes.toLowerCase().includes(searchDocQuery.toLowerCase())) ||
      (d.folderName && d.folderName.toLowerCase().includes(searchDocQuery.toLowerCase()));

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

  return (
    <div className="space-y-4">
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
              return (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{doc.title}</span>
                        {doc.tag && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
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

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 font-mono">
                        <span>اسم الملف: {doc.fileName}</span>
                        <span>• الحجم: {doc.fileSize || '2 MB'}</span>
                        <span>• تاريخ الرفع: {doc.uploadedAt}</span>
                      </div>

                      {doc.notes && (
                        <p className="text-[11px] text-slate-600 mt-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block">
                          ملاحظات: {doc.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                    <button
                      onClick={() => handleOpenMoveModal(doc)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="نقل المستند إلى مجلد آخر"
                    >
                      <MoveRight className="w-3.5 h-3.5" />
                      <span>نقل</span>
                    </button>

                    <button
                      onClick={() => alert(`جاري تنزيل / معاينة المستند المرفق: [${doc.title}] (${doc.fileName})`)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تنزيل / معاينة</span>
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
    </div>
  );
};
