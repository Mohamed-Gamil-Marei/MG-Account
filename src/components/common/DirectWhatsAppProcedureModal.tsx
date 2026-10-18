import React, { useState } from 'react';
import { DatabaseState, db } from '../../db/localDatabase';
import { MessageSquare, Send, X } from 'lucide-react';
import { getCairoTimestamp } from '../../utils/cairoTime';

export interface DirectWhatsAppContext {
  procedureType: string;
  title: string;
  clientName: string;
  referenceCode: string;
  amount?: number;
  periodOrDate?: string;
  customNotes?: string;
}

export interface DirectWhatsAppProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext: DirectWhatsAppContext;
  state: DatabaseState;
}

export const DirectWhatsAppProcedureModal: React.FC<DirectWhatsAppProcedureModalProps> = ({
  isOpen,
  onClose,
  initialContext,
  state,
}) => {
  const matchedClient = state.clients.find((c) => c.name === initialContext.clientName);
  const [phone, setPhone] = useState<string>(matchedClient?.whatsappPhone || matchedClient?.phone || '');
  const [messageText, setMessageText] = useState<string>(
    `السادة / ${initialContext.clientName}\nتحية طيبة،\nمرفق إشعار بخصوص: ${initialContext.title}\nمرجع: ${initialContext.referenceCode}${
      initialContext.amount ? `\nالمبلغ: ${initialContext.amount.toLocaleString('ar-EG')} ج.م` : ''
    }${initialContext.customNotes ? `\nالبيان: ${initialContext.customNotes}` : ''}`
  );
  const [sentStatus, setSentStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    db.sendWhatsAppMessage({
      clientId: matchedClient?.id,
      clientName: initialContext.clientName,
      phoneNumber: phone.trim(),
      category: 'GENERAL',
      messageBody: messageText,
      direction: 'OUTGOING',
      status: 'SENT',
      sentAt: getCairoTimestamp(),
    });

    setSentStatus('تم تسجيل وإرسال الرسالة بنجاح.');
    setTimeout(() => {
      setSentStatus(null);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">إرسال إشعار واتساب مباشر</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSend} className="space-y-3">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم واتساب العميل *</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="2010XXXXXXXX"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-mono"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">نص الإشعار *</label>
            <textarea
              rows={5}
              required
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700"
            />
          </div>

          {sentStatus && (
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold">{sentStatus}</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال الآن</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
