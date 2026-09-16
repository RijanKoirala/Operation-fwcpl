import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Branch } from '../types';
import { 
  FileText, Download, Filter, Calendar, Building2, 
  RefreshCw, CheckCircle2, AlertTriangle, ArrowDownToLine
} from 'lucide-react';

interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
}

const REPORT_DEFINITIONS: ReportDefinition[] = [
  { id: 'branch-performance', name: 'Branch Performance & Podium Scores', description: 'Overall scores, target completion, and ranking of all 20+ branches', category: 'Executive' },
  { id: 'staff-productivity', name: 'Staff Task Productivity & Leaderboard', description: 'Total tasks completed, on-time delivery %, and staff ranking', category: 'Human Resources' },
  { id: 'connections-pipeline', name: 'Customer Connection Funnel & Conversions', description: 'Detailed breakdown across 8 installation pipeline stages', category: 'Sales & Field' },
  { id: 'goods-requisitions', name: 'Goods Requisitions & Stock Dispatches', description: 'Branch material requisitions, approval ratios, and fulfillment statuses', category: 'Supply Chain' },
  { id: 'followups-conversion', name: 'Follow-ups Status & Lead Conversion', description: 'Pipeline follow-up outcomes, won/lost ratios, and pending calls', category: 'Sales' },
  { id: 'overdue-audit', name: 'Critical Overdue Audit (Tasks, SLAs, Follow-ups)', description: 'Immediate operational bottlenecks and overdue action items', category: 'Compliance' },
  { id: 'directives-compliance', name: 'Management Directives Acknowledgment Audit', description: 'Top-down instructions status and branch response times', category: 'Executive' },
  { id: 'targets-kpis', name: 'Target & KPI Achievement Matrix', description: 'Goal vs achieved comparison for branches and individual personnel', category: 'Performance' },
  { id: 'audit-trail', name: 'Complete System Activity & Audit Log', description: 'Timestamped record of all user operations and entity modifications', category: 'Security' }
];

export const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState(REPORT_DEFINITIONS[0].id);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Filters
  const [branchId, setBranchId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Report State
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadBranches();
    fetchReport(REPORT_DEFINITIONS[0].id);
  }, []);

  const loadBranches = async () => {
    try {
      const res = await api.branches.getAll();
      setBranches(res.branches || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReport = async (reportId = selectedReport) => {
    try {
      setLoading(true);
      const params: any = {};
      if (branchId) params.branch_id = branchId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await api.reports.get(reportId, params);
      setReportData(res.report || res);
    } catch (err: any) {
      console.error('Failed to fetch report', err);
      alert(err.message || 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params: any = {};
      if (branchId) params.branch_id = branchId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const blob = await api.reports.exportCsv(selectedReport, params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const currentDef = REPORT_DEFINITIONS.find(r => r.id === selectedReport);

  // Helper to extract table rows & headers
  const getTableContent = () => {
    if (!reportData) return { headers: [], rows: [] };
    
    // Check if reportData is array or has a data/items property
    let items: any[] = [];
    if (Array.isArray(reportData)) {
      items = reportData;
    } else if (Array.isArray(reportData.items)) {
      items = reportData.items;
    } else if (Array.isArray(reportData.data)) {
      items = reportData.data;
    } else if (Array.isArray(reportData.records)) {
      items = reportData.records;
    } else {
      // Key-value summary
      return {
        headers: ['Metric / Dimension', 'Value'],
        rows: Object.entries(reportData)
          .filter(([k]) => typeof reportData[k] !== 'object')
          .map(([k, v]) => [k.replace(/_/g, ' ').toUpperCase(), String(v)])
      };
    }

    if (items.length === 0) return { headers: [], rows: [] };

    const rawHeaders = Object.keys(items[0]).filter(k => k !== 'id' && !k.endsWith('_id'));
    const headers = rawHeaders.map(h => h.replace(/_/g, ' ').toUpperCase());
    const rows = items.map(item => rawHeaders.map(h => {
      const val = item[h];
      if (val === null || val === undefined) return '-';
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    }));

    return { headers, rows };
  };

  const { headers, rows } = getTableContent();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600" />
            Operational & Executive Reports
          </h1>
          <p className="text-gray-500 text-sm">
            Generate audited reports, calculate organization-wide KPIs, and export raw data for management reviews.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchReport(selectedReport)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exporting || rows.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> 
            {exporting ? 'Exporting...' : 'Export to CSV'}
          </button>
        </div>
      </div>

      {/* Report Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {REPORT_DEFINITIONS.map(r => (
          <button
            key={r.id}
            onClick={() => {
              setSelectedReport(r.id);
              fetchReport(r.id);
            }}
            className={`p-4 rounded-xl border text-left transition ${
              selectedReport === r.id
                ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100">
                {r.category}
              </span>
              {selectedReport === r.id && (
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              )}
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">{r.name}</h3>
            <p className="text-xs text-gray-500 line-clamp-2">{r.description}</p>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <select
              value={branchId}
              onChange={e => setBranchId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Start"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="End"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchReport()}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
        >
          Apply Filters
        </button>
      </div>

      {/* Report Content Display */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-base">{currentDef?.name}</h2>
            <p className="text-xs text-gray-500">{currentDef?.description}</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-gray-600">
            {rows.length} records found
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
            Compiling report data...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            No records match the current filter parameters.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="px-4 py-3 font-bold text-gray-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-gray-50/80 transition">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 text-gray-700 whitespace-nowrap font-medium">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
