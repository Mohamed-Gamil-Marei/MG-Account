import React, { useState, useMemo } from 'react';
import { DatabaseState, db } from '../db/localDatabase';
import { NavigationTab, SystemUser } from '../types';
import { Search } from 'lucide-react';
import { getVisibleClients } from '../config/screenScope';

export interface GlobalSearchBarProps {
  state: DatabaseState;
  onNavigate: (tab: NavigationTab) => void;
  currentUser?: SystemUser | null;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  state,
  onNavigate,
  currentUser,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const visibleClients = useMemo(
    () => getVisibleClients(state, currentUser),
    [state.clients, state.users, state.currentUserId, currentUser]
  );

  const trimmed = query.trim().toLowerCase();
  const matchedClients = trimmed
    ? visibleClients
        .filter(
          (c) =>
            c.name.toLowerCase().includes(trimmed) ||
            (c.taxId && c.taxId.toLowerCase().includes(trimmed)) ||
            (c.taxCardNo && c.taxCardNo.toLowerCase().includes(trimmed)) ||
            (c.code && c.code.toLowerCase().includes(trimmed)) ||
            (c.clientCode && c.clientCode.toLowerCase().includes(trimmed))
        )
        .slice(0, 6)
    : [];

  return (
    <div className="relative w-full max-w-md" dir="rtl">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder="بحث سريع عن عميل، رقم تسجيل ضريبي، أو قيد..."
          className="w-full pr-9 pl-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {open && matchedClients.length > 0 && (
        <div className="absolute top-full mt-1 inset-x-0 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          {matchedClients.map((client) => (
            <button
              key={client.id}
              type="button"
              onMouseDown={() => {
                db.setActiveClient(client.id);
                onNavigate('CLIENTS_ARCHIVE');
                setOpen(false);
                setQuery('');
              }}
              className="w-full px-3 py-2 text-right hover:bg-slate-800 flex items-center justify-between text-xs text-white border-b border-slate-800 last:border-b-0"
            >
              <span className="font-bold">{client.name}</span>
              <span className="font-mono text-[11px] text-emerald-400">
                {client.taxCardNo || client.taxId}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
