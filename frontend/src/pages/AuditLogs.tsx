import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Modal } from '../components/common/Modal';
import { 
  History, Search, Filter, ShieldCheck, 
  Clock, User, Laptop, Eye, RefreshCw
} from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  
  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    loadLogs();
  }, [actionFilter, entityFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 100 };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity_type = entityFilter;

      const res = await api.audit.getAll(params);
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes('CREATE') || a.includes('INSERT')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">CREATE</span>;
    }
    if (a.includes('UPDATE') || a.includes('EDIT') || a.includes('ADVANCE')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">UPDATE</span>;
    }
    if (a.includes('DELETE') || a.includes('REMOVE')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">DELETE</span>;
    }
    if (a.includes('LOGIN') || a.includes('AUTH')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">AUTH</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-800">{action}</span>;
  };

  const filteredLogs = logs.filter(l => 
    (l.user_name && l.user_name.toLowerCase().includes(search.toLowerCase())) ||
    (l.action && l.action.toLowerCase().includes(search.toLowerCase())) ||
    (l.entity_type && l.entity_type.toLowerCase().includes(search.toLowerCase())) ||
    (l.description && l.description.toLowerCase().includes(search.toLowerCase())) ||
    (l.details && JSON.stringify(l.details).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="w-7 h-7 text-indigo-600" />
            Activity & Security Audit Trail
          </h1>
          <p className="text-gray-500 text-sm">
            Immutable chronological record of all administrative operations, entity changes, and system access.
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Trail
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search activity by user, action, detail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
            </select>
          </div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Entities</option>
            <option value="tasks">Tasks</option>
            <option value="connections">Connections</option>
            <option value="tickets">Tickets</option>
            <option value="branches">Branches</option>
            <option value="users">Staff / Users</option>
            <option value="instructions">Instructions</option>
            <option value="targets">Targets</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-400">Loading audit records...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-gray-400">No audit events match criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target Entity</th>
                  <th className="px-4 py-3">Summary Description</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        {log.user_name || 'System / Automated'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-600">
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px]">
                        {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                      {log.description || (log.details ? JSON.stringify(log.details) : '-')}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded transition"
                        title="View payload"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payload Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Payload: ${selectedLog.action} on ${selectedLog.entity_type}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <span className="text-gray-500">Performed by:</span>
                <p className="font-bold text-gray-900">{selectedLog.user_name || 'System'}</p>
              </div>
              <div>
                <span className="text-gray-500">Timestamp:</span>
                <p className="font-bold text-gray-900">{new Date(selectedLog.created_at).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500">IP Address:</span>
                <p className="font-mono text-gray-800">{selectedLog.ip_address || '127.0.0.1'}</p>
              </div>
              <div>
                <span className="text-gray-500">Entity:</span>
                <p className="font-mono text-gray-800">{selectedLog.entity_type} #{selectedLog.entity_id}</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-700 mb-1">Raw Payload & Changes</h4>
              <pre className="p-3 bg-gray-900 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto max-h-60 leading-tight">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
