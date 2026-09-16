import React, { useState, useEffect } from 'react';
import { Search, Building2, Users, CheckSquare, Plug, Calendar, FileText, ArrowRight, X, Radio } from 'lucide-react';
import { api } from '../../api/client';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>({
    branches: [],
    staff: [],
    tasks: [],
    connections: [],
    followups: [],
    instructions: [],
    noc: [],
  });

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ branches: [], staff: [], tasks: [], connections: [], followups: [], instructions: [], noc: [] });
      return;
    }

    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        try {
          const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
          if (res.success) {
            setResults(res.results);
          }
        } catch {}
        finally {
          setLoading(false);
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const totalResults =
    (results.branches?.length || 0) +
    (results.staff?.length || 0) +
    (results.tasks?.length || 0) +
    (results.connections?.length || 0) +
    (results.followups?.length || 0) +
    (results.instructions?.length || 0) +
    (results.noc?.length || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search branches, staff, tasks, customers..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent border-0 focus:outline-none text-slate-800 placeholder-slate-400 text-base"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600 mr-2">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[11px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">ESC</span>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {loading && <p className="text-center py-6 text-xs text-slate-400 font-medium">Searching records...</p>}

          {!loading && query.length >= 2 && totalResults === 0 && (
            <div className="text-center py-8">
              <p className="text-sm font-semibold text-slate-600">No results found for "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">Try searching by branch name, staff ID, or customer phone</p>
            </div>
          )}

          {/* Branches */}
          {results.branches?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Branches
              </p>
              <div className="space-y-1">
                {results.branches.map((b: any) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      onNavigate(`/branches/${b.id}`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <div>
                      <h5 className="font-semibold text-sm text-slate-900">{b.name}</h5>
                      <span className="text-xs text-slate-400">{b.code} • {b.city}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff */}
          {results.staff?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Staff
              </p>
              <div className="space-y-1">
                {results.staff.map((s: any) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      onNavigate(`/staff/${s.id}`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <div>
                      <h5 className="font-semibold text-sm text-slate-900">{s.title}</h5>
                      <span className="text-xs text-slate-400">@{s.subtitle} • {s.employee_id}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {results.tasks?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5" /> Tasks
              </p>
              <div className="space-y-1">
                {results.tasks.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onNavigate(`/tasks`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <div>
                      <h5 className="font-semibold text-sm text-slate-900">{t.title}</h5>
                      <span className="text-xs text-slate-400">{t.task_id} • Status: {t.status}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connections */}
          {results.connections?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                <Plug className="w-3.5 h-3.5" /> New Connections
              </p>
              <div className="space-y-1">
                {results.connections.map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onNavigate(`/connections`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <div>
                      <h5 className="font-semibold text-sm text-slate-900">{c.title}</h5>
                      <span className="text-xs text-slate-400">{c.connection_id} • {c.subtitle} • {c.status}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NOC Network Incidents */}
          {results.noc?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase text-rose-500 px-2 mb-1.5 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" /> NOC Network Incidents
              </p>
              <div className="space-y-1">
                {results.noc.map((n: any) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      onNavigate(`/noc`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-rose-50/60 cursor-pointer transition-colors border border-transparent hover:border-rose-100"
                  >
                    <div>
                      <h5 className="font-semibold text-sm text-slate-900">{n.title}</h5>
                      <span className="text-xs text-slate-500">
                        <strong className="text-rose-600">{n.incident_id}</strong> • {n.subtitle} • {n.priority} • {n.status}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
