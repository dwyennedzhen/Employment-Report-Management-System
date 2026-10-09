import React, { useState, useEffect, useMemo } from 'react';
import { Search, RotateCcw, Lock, Calendar } from 'lucide-react';
import { Campus, Qualification, ReportFilterState, User, UserRole } from '../types';

interface FilterBarProps {
  user: User;
  campuses: Campus[];
  qualifications: Qualification[];
  availableYears: number[];
  filters: ReportFilterState;
  onChange: (updated: Partial<ReportFilterState>) => void;
  onReset: () => void;
  showSearch?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  user,
  campuses,
  qualifications,
  availableYears,
  filters,
  onChange,
  onReset,
  showSearch = true,
}) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const currentSystemYear = new Date().getFullYear();

  // Dynamic & unlimited year suggestions: includes all database years + historical years + future years automatically
  const suggestedYears = useMemo(() => {
    const minDbYear = availableYears.length > 0 ? Math.min(...availableYears) : 2004;
    const maxDbYear = availableYears.length > 0 ? Math.max(...availableYears) : currentSystemYear;
    const start = Math.min(2000, minDbYear);
    const end = Math.max(currentSystemYear + 10, maxDbYear + 5);
    const set = new Set<number>(availableYears);
    for (let y = end; y >= start; y--) {
      set.add(y);
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [availableYears, currentSystemYear]);

  // Local input strings so user can smoothly type any 4-digit year (e.g. 2012, 2031, 2035) without clamping mid-keystroke
  const [singleYearInput, setSingleYearInput] = useState<string>(
    filters.year !== 'ALL' ? filters.year : String(currentSystemYear)
  );
  const [fromYearInput, setFromYearInput] = useState<string>(String(filters.startYear));
  const [toYearInput, setToYearInput] = useState<string>(String(filters.endYear));

  useEffect(() => {
    if (filters.year !== 'ALL') {
      setSingleYearInput(filters.year);
    }
  }, [filters.year]);

  useEffect(() => {
    setFromYearInput(String(filters.startYear));
  }, [filters.startYear]);

  useEffect(() => {
    setToYearInput(String(filters.endYear));
  }, [filters.endYear]);

  const isAllYearsMode = filters.yearMode === 'SINGLE' && filters.year === 'ALL';
  const isSingleYearMode = filters.yearMode === 'SINGLE' && filters.year !== 'ALL';
  const isRangeMode = filters.yearMode === 'RANGE';

  const minRecordedYear = availableYears.length > 0 ? Math.min(...availableYears) : null;
  const maxRecordedYear = availableYears.length > 0 ? Math.max(...availableYears) : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 no-print">
      <datalist id="dynamic-filter-years">
        {suggestedYears.map((y) => (
          <option key={y} value={y} />
        ))}
      </datalist>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3.5 items-end">
        {/* 1. Campus Filter */}
        <div className="xl:col-span-3">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Campus
          </label>
          {isAdmin ? (
            <select
              value={filters.campusId}
              onChange={(e) => onChange({ campusId: e.target.value })}
              className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">All Campuses (Combined 4 Campuses)</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.campusName}
                </option>
              ))}
            </select>
          ) : (
            <div
              title="Campus users are restricted to their assigned campus."
              className="w-full px-3 py-2 text-xs font-medium bg-slate-100 border border-slate-200 rounded-lg text-slate-800 flex items-center justify-between"
            >
              <span className="truncate">{user.campusName || user.campusId}</span>
              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-2" />
            </div>
          )}
        </div>

        {/* 2. Dynamic & Unlimited Year / Period Filter (All Years | Single Year | Custom Year Range) */}
        <div className="xl:col-span-4">
          <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-700" />
              <span>Year / Period Filter</span>
            </label>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
              <button
                type="button"
                onClick={() => onChange({ yearMode: 'SINGLE', year: 'ALL' })}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                  isAllYearsMode
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Years
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetY =
                    filters.year !== 'ALL' ? filters.year : singleYearInput || String(currentSystemYear);
                  setSingleYearInput(targetY);
                  onChange({ yearMode: 'SINGLE', year: targetY });
                }}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                  isSingleYearMode
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Single Year
              </button>
              <button
                type="button"
                onClick={() => onChange({ yearMode: 'RANGE' })}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                  isRangeMode
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {isAllYearsMode && (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 text-xs font-medium bg-blue-50/70 border border-blue-200 rounded-lg text-blue-900 flex items-center justify-between">
                <span>
                  All Available Years
                  {minRecordedYear && maxRecordedYear
                    ? minRecordedYear === maxRecordedYear
                      ? ` (${minRecordedYear})`
                      : ` (${minRecordedYear}–${maxRecordedYear})`
                    : ''}
                </span>
                <span className="text-[11px] text-blue-700 font-semibold">Unlimited</span>
              </div>
            </div>
          )}

          {isSingleYearMode && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={1900}
                  step={1}
                  list="dynamic-filter-years"
                  value={singleYearInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSingleYearInput(val);
                    const parsed = Number(val);
                    if (val.trim().length >= 4 && Number.isInteger(parsed) && parsed >= 1900) {
                      onChange({ yearMode: 'SINGLE', year: String(parsed) });
                    }
                  }}
                  onBlur={() => {
                    const parsed = Number(singleYearInput);
                    if (Number.isInteger(parsed) && parsed >= 1900) {
                      onChange({ yearMode: 'SINGLE', year: String(parsed) });
                    } else {
                      setSingleYearInput(filters.year !== 'ALL' ? filters.year : String(currentSystemYear));
                    }
                  }}
                  placeholder="Enter any year (e.g. 2012, 2026, 2032)..."
                  aria-label="Single Report Year"
                  className="w-full px-3 py-2 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                type="button"
                onClick={() => onChange({ yearMode: 'SINGLE', year: 'ALL' })}
                className="px-2.5 py-2 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                title="Show All Available Years"
              >
                All Years
              </button>
            </div>
          )}

          {isRangeMode && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-600">
                <span className="text-[11px] font-semibold text-slate-500 shrink-0">From:</span>
                <input
                  type="number"
                  min={1900}
                  step={1}
                  list="dynamic-filter-years"
                  value={fromYearInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFromYearInput(val);
                    const parsed = Number(val);
                    if (val.trim().length >= 4 && Number.isInteger(parsed) && parsed >= 1900) {
                      onChange({ startYear: parsed });
                    }
                  }}
                  onBlur={() => {
                    const parsed = Number(fromYearInput);
                    if (Number.isInteger(parsed) && parsed >= 1900) {
                      onChange({ startYear: parsed });
                    } else {
                      setFromYearInput(String(filters.startYear));
                    }
                  }}
                  placeholder="e.g. 2012"
                  aria-label="From Year"
                  className="w-full text-xs font-mono font-semibold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-600">
                <span className="text-[11px] font-semibold text-slate-500 shrink-0">To:</span>
                <input
                  type="number"
                  min={1900}
                  step={1}
                  list="dynamic-filter-years"
                  value={toYearInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setToYearInput(val);
                    const parsed = Number(val);
                    if (val.trim().length >= 4 && Number.isInteger(parsed) && parsed >= 1900) {
                      onChange({ endYear: parsed });
                    }
                  }}
                  onBlur={() => {
                    const parsed = Number(toYearInput);
                    if (Number.isInteger(parsed) && parsed >= 1900) {
                      onChange({ endYear: parsed });
                    } else {
                      setToYearInput(String(filters.endYear));
                    }
                  }}
                  placeholder="e.g. 2026"
                  aria-label="To Year"
                  className="w-full text-xs font-mono font-semibold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Qualification Filter */}
        <div className={showSearch ? 'xl:col-span-2' : 'xl:col-span-4'}>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Qualification
          </label>
          <select
            value={filters.qualificationId}
            onChange={(e) => onChange({ qualificationId: e.target.value })}
            className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Qualifications</option>
            {qualifications.map((q) => (
              <option key={q.id} value={q.id}>
                {q.code && q.qualificationName && q.code !== q.qualificationName
                  ? `${q.code} — ${q.qualificationName}`
                  : q.qualificationName || q.code}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Search & Reset */}
        {showSearch ? (
          <div className="xl:col-span-3 flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quick Search
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) => onChange({ searchQuery: e.target.value })}
                  placeholder="Qualification, year, campus..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={onReset}
              title="Reset Filters"
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        ) : (
          <div className="xl:col-span-1 flex justify-end">
            <button
              type="button"
              onClick={onReset}
              title="Reset Filters"
              className="w-full px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
