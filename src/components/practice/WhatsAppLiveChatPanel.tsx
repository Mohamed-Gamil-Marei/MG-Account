import React, { useState } from 'react';
import { DatabaseState, db } from '../../db/localDatabase';
import { MessageSquare, Send } from 'lucide-react';

export interface WhatsAppLiveChatPanelProps {
  state: DatabaseState;
  initialPhone?: string;
  onNavigateToArchive?: (clientId?: string) => void;
}

export const WhatsAppLiveChatPanel: React.FC<WhatsAppLiveChatPanelProps> = ({
  state,
  initialPhone = '',
}) => {
  const [phone, setPhone] = useState(initialPhone || state.clients[0]?.whatsappPhone || '201003335360');
  const [text, setText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    db.sendWhatsAppMessage({
      phoneNumber: phone,
      messageBody: text.trim(),
      direction: 'OUTBOUND',
      status: 'SENT',
    });
    setText('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-black">محادثة واتساب المباشرة مع العملاء</h3>
        </div>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="رقم واتساب..."
          className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono"
        />
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
        {(state.whatsappMessages || []).slice(0, 15).map((m) => (
          <div key={m.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span className="font-bold text-slate-800 dark:text-slate-200">{m.clientName} ({m.phoneNumber})</span>
              <span>{m.sentAt?.slice(0, 16)}</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300">{m.messageBody}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب رسالة رسمية للعميل..."
          className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>إرسال</span>
        </button>
      </form>
    </div>
  );
};
