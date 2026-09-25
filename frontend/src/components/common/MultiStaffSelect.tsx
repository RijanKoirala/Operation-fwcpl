import React, { useState, useRef, useEffect } from 'react';
import { User, Check, X, Search, ChevronDown, Users } from 'lucide-react';

export interface StaffOption {
  id: number;
  full_name: string;
  employee_id?: string | null;
  phone?: string | null;
  designation_name?: string | null;
  branch_id?: number | null;
  branch_name?: string | null;
  role?: string | null;
}

interface MultiStaffSelectProps {
  staff: StaffOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

export const MultiStaffSelect: React.FC<MultiStaffSelectProps> = ({
  staff,
  selectedIds,
  onChange,
  label,
  placeholder = 'Search & select staff member(s)...',
  required = false,
  disabled = false,
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedStaff = selectedIds
    .map(id => staff.find(s => s.id === id))
    .filter((s): s is StaffOption => s !== undefined);

  const filteredStaff = staff.filter(s => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;
    const nameMatch = s.full_name?.toLowerCase().includes(query);
    const empMatch = s.employee_id?.toLowerCase().includes(query);
    const desMatch = s.designation_name?.toLowerCase().includes(query);
    const phoneMatch = s.phone?.includes(query);
    return nameMatch || empMatch || desMatch || phoneMatch;
  });

  const handleToggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(item => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleRemove = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    onChange(selectedIds.filter(item => item !== id));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {selectedIds.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline"
            >
              Clear All ({selectedIds.length})
            </button>
          )}
        </div>
      )}

      {/* Main Container / Trigger */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`min-h-[42px] w-full bg-slate-50 border rounded-xl p-1.5 flex flex-wrap items-center gap-1.5 transition-colors cursor-pointer ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-slate-100 border-slate-200'
            : isOpen
            ? 'border-brand-500 ring-2 ring-brand-500/20 bg-white'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Selected Chips */}
        {selectedStaff.map(member => (
          <span
            key={member.id}
            className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-900 border border-brand-200/80 px-2 py-1 rounded-lg text-xs font-semibold shadow-2xs group animate-in fade-in zoom-in duration-100"
          >
            <span className="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
              {member.full_name?.charAt(0).toUpperCase() || 'U'}
            </span>
            <span className="max-w-[140px] truncate">{member.full_name}</span>
            {member.designation_name && (
              <span className="text-[10px] text-brand-600 font-medium">({member.designation_name})</span>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={e => handleRemove(e, member.id)}
                className="text-brand-400 hover:text-rose-600 hover:bg-rose-50 rounded p-0.5 transition-colors"
                title={`Remove ${member.full_name}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}

        {/* Placeholder / Prompt */}
        {selectedIds.length === 0 && (
          <span className="text-xs text-slate-400 font-normal px-2 py-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {placeholder}
          </span>
        )}

        {/* Dropdown Arrow */}
        <div className="ml-auto pr-1.5 flex items-center text-slate-400">
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="relative z-50">
          <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Search Input */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Filter by name, ID, or designation..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium text-slate-800"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 p-1">
              {filteredStaff.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-medium">
                  No staff members match "{searchTerm}".
                </div>
              ) : (
                filteredStaff.map(member => {
                  const isSelected = selectedIds.includes(member.id);
                  return (
                    <div
                      key={member.id}
                      onClick={e => {
                        e.stopPropagation();
                        handleToggle(member.id);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-brand-50/70 text-brand-950 font-bold'
                          : 'hover:bg-slate-50 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            isSelected
                              ? 'bg-brand-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {member.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{member.full_name}</span>
                            {member.employee_id && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                #{member.employee_id}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 font-normal">
                            {member.designation_name && <span>{member.designation_name}</span>}
                            {member.phone && <span>• {member.phone}</span>}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-brand-600 border-brand-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary */}
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {selectedIds.length} staff member{selectedIds.length === 1 ? '' : 's'} assigned
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="font-bold text-brand-600 hover:text-brand-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {helperText && <p className="text-[10px] text-slate-400 font-medium">{helperText}</p>}
    </div>
  );
};

/**
 * Clean compact badge list for table columns
 * Renders concise names: "Ram Bahadur, Shyam +2" with a popover tooltip
 */
export const AssignedStaffPills: React.FC<{
  staff?: { id: number; full_name: string; designation_name?: string | null; phone?: string | null }[];
  fallbackName?: string | null;
  maxDisplay?: number;
}> = ({ staff = [], fallbackName, maxDisplay = 2 }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Normalize items
  const items =
    staff && staff.length > 0
      ? staff
      : fallbackName
      ? [{ id: -1, full_name: fallbackName }]
      : [];

  if (items.length === 0) {
    return <span className="text-slate-400 text-xs italic">Unassigned</span>;
  }

  const visibleItems = items.slice(0, maxDisplay);
  const remainingCount = items.length - maxDisplay;

  return (
    <div
      className="relative inline-flex items-center gap-1 flex-wrap"
      onMouseEnter={() => remainingCount > 0 && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center gap-1 flex-wrap">
        {visibleItems.map((m, idx) => (
          <span
            key={m.id || idx}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/60"
          >
            <User className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="max-w-[110px] truncate">{m.full_name}</span>
          </span>
        ))}

        {remainingCount > 0 && (
          <span
            onClick={e => {
              e.stopPropagation();
              setShowTooltip(!showTooltip);
            }}
            className="inline-flex items-center text-[10px] font-black text-brand-700 bg-brand-50 border border-brand-200/80 px-1.5 py-0.5 rounded-md cursor-pointer hover:bg-brand-100 transition-colors"
          >
            +{remainingCount} more
          </span>
        )}
      </div>

      {/* Popover showing full staff list on hover or click */}
      {showTooltip && (
        <div className="absolute left-0 bottom-full mb-1.5 z-40 bg-slate-900 text-white p-2.5 rounded-xl shadow-xl min-w-[200px] text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-100 pointer-events-auto">
          <div className="font-bold text-[11px] text-slate-300 uppercase tracking-wider pb-1 border-b border-slate-800 flex items-center justify-between">
            <span>All Assigned Staff ({items.length})</span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {items.map((m, idx) => (
              <div key={m.id || idx} className="flex items-center justify-between gap-2">
                <span className="font-bold text-white truncate">{m.full_name}</span>
                {m.designation_name && (
                  <span className="text-[10px] text-slate-400 shrink-0">{m.designation_name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
