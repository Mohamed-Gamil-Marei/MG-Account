import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Award,
  LineChart,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  FileText,
  Settings,
  Briefcase,
  Play,
  Smartphone,
  Printer,
} from 'lucide-react';
import { MgBrandBadge } from '../common/MgBrandBadge';
import { DatabaseState, db } from '../../db/localDatabase';
import { ClientsArchiveView } from '../ClientsArchiveView';
import { OfficeTreasuryView } from '../OfficeTreasuryView';
import { CreditDossierRegistryView } from '../CreditDossierRegistryView';
import { PracticeManagementHubView } from '../practice/PracticeManagementHubView';
import { WhatsAppBusinessApiView } from '../practice/WhatsAppBusinessApiView';
import { AccessRestrictedGate } from '../AccessRestrictedGate';
import { ClientSelector } from '../common/ClientSelector';
import { PrintExportControlModal } from '../common/PrintExportControlModal';
import { ResponsiveSubTabBar } from '../common/ThemeUIComponents';

export type OfficePracticeSubTab =
  | 'CLIENTS_ARCHIVE'
  | 'PRACTICE_MANAGEMENT'
  | 'CREDIT_DOSSIER_REGISTRY'
  | 'WHATSAPP_BUSINESS_API'
  | 'WHATSAPP_SETTINGS'
  | 'WHATSAPP_BOT'
  | 'OFFICE_TREASURY';

interface OfficePracticeHubViewProps {
  state: DatabaseState;
  initialSubTab?: OfficePracticeSubTab;
  onOpenPromoModal?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const OfficePracticeHubView: React.FC<OfficePracticeHubViewProps> = ({
  state,
  initialSubTab = 'CLIENTS_ARCHIVE',
  onOpenPromoModal,
  onNavigateToTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<OfficePracticeSubTab>(initialSubTab);
  const [treasuryUnlocked, setTreasuryUnlocked] = useState<boolean>(false);
  const [isPrintSettingsModalOpen, setIsPrintSettingsModalOpen] = useState<boolean>(false);
  const currentUser = db.getCurrentUser();

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const tabs: {
    id: OfficePracticeSubTab;
    label: string;
    icon: any;
    badge?: string | number;
    badgeColor?: string;
    isTreasury?: boolean;
  }[] = [
    {
      id: 'CLIENTS_ARCHIVE',
      label: 'ملفات العملاء',
      icon: Users,
      badge: state.clients.length,
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
    {
      id: 'PRACTICE_MANAGEMENT',
      label: 'عقود المراجعة والارتباط',
      icon: Briefcase,
    },
    {
      id: 'CREDIT_DOSSIER_REGISTRY',
      label: 'الملف الائتماني',
      icon: FileText,
    },
    {
      id: 'WHATSAPP_BUSINESS_API',
      label: 'مركز المراسلات والواتساب',
      icon: Smartphone,
      badge: 'متصل ومباشر',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold',
    },
    {
      id: 'OFFICE_TREASURY',
      label: 'خزينة وحسابات المكتب',
      icon: Building2,
      badge: state.treasuryTransactions.length,
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      isTreasury: true,
    },
  ];

  const canAccessTreasury = currentUser.role === 'ADMIN' || currentUser.canAccessTreasury || treasuryUnlocked;

  return (
    <div className="space-y-2.5">
      {/* Central Active Client Context Selector */}
      <ClientSelector state={state} />

      {/* Responsive Sub-Tabs Toolbar (ما يتسع وضع الباقي في زر المزيد ▾، وعلى الموبايل زر عريض) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <ResponsiveSubTabBar
          tabs={tabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            icon: React.createElement(tab.icon, { className: 'w-4 h-4 shrink-0' }),
            badge: tab.badge !== undefined ? (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono ${tab.badgeColor || ''}`}>
                {tab.badge}
              </span>
            ) : undefined,
          }))}
          activeTab={activeSubTab}
          onTabChange={(id) => setActiveSubTab(id as OfficePracticeSubTab)}
          maxVisibleTabs={4}
          className="flex-1"
        />

        <div className="hidden sm:flex items-center gap-2 text-xs shrink-0 pl-1">
          <button
            type="button"
            onClick={() => setIsPrintSettingsModalOpen(true)}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            title="إعدادات وأساليب الطباعة، إظهار/إخفاء الـ QR، شكل الختم والهوامش"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>إعدادات الطباعة</span>
          </button>
        </div>
      </div>

      {/* Render Active Sub-View */}
      <div>
        {activeSubTab === 'CLIENTS_ARCHIVE' && <ClientsArchiveView state={state} onNavigateToTab={onNavigateToTab} />}
        {activeSubTab === 'PRACTICE_MANAGEMENT' && <PracticeManagementHubView state={state} />}
        {activeSubTab === 'CREDIT_DOSSIER_REGISTRY' && <CreditDossierRegistryView state={state} />}
        {activeSubTab === 'WHATSAPP_BUSINESS_API' && (
          <WhatsAppBusinessApiView
            state={state}
            onNavigateToArchive={() => setActiveSubTab('CLIENTS_ARCHIVE')}
          />
        )}
        {activeSubTab === 'WHATSAPP_SETTINGS' && (
          <WhatsAppBusinessApiView
            state={state}
            initialTab="TEMPLATES"
            onNavigateToArchive={() => setActiveSubTab('CLIENTS_ARCHIVE')}
          />
        )}
        {activeSubTab === 'WHATSAPP_BOT' && (
          <WhatsAppBusinessApiView
            state={state}
            initialTab="LIVE_CHAT"
            onNavigateToArchive={() => setActiveSubTab('CLIENTS_ARCHIVE')}
          />
        )}
        {activeSubTab === 'OFFICE_TREASURY' && (
          canAccessTreasury ? (
            <OfficeTreasuryView state={state} />
          ) : (
            <AccessRestrictedGate
              currentUser={currentUser}
              targetTabName="خزنة وحسابات أتعاب المكتب المستقلة"
              onOverrideSuccess={() => setTreasuryUnlocked(true)}
              onNavigateHome={() => setActiveSubTab('CLIENTS_ARCHIVE')}
            />
          )
        )}
      </div>

      {/* Print, Export & QR Master Control Modal */}
      <PrintExportControlModal
        isOpen={isPrintSettingsModalOpen}
        onClose={() => setIsPrintSettingsModalOpen(false)}
      />
    </div>
  );
};

export default OfficePracticeHubView;


