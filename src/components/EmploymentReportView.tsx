import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Printer,
  FileSpreadsheet,
  FileText,
  Edit3,
  Trash2,
  Eye,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  AlertCircle,
  Lock,
  Upload,
} from 'lucide-react';
import {
  AutomatedSummaryResponse,
  Campus,
  EmploymentReport,
  EntityStatus,
  Qualification,
  ReportFilterState,
  ReportInputPayload,
  ReportTotals,
  User,
  UserRole,
} from '../types';
import { FilterBar } from './FilterBar';
import {
  buildDetailedExportConfig,
  exportReportToExcel,
  exportReportToPDF,
} from '../utils/exportUtils';

interface EmploymentReportViewProps {
  user: User;
  campuses: Campus[];
  qualifications: Qualification[];
  availableYears: number[];
  filters: ReportFilterState;
  reports: EmploymentReport[];
  totals: ReportTotals;
  summary: AutomatedSummaryResponse | null;
  loading: boolean;
  onFilterChange: (updated: Partial<ReportFilterState>) => void;
  onResetFilters: () => void;
  onOpenCreate: () => void;
  onOpenEdit: (record: EmploymentReport) => void;
  onOpenImport: () => void;
  onDeleteRecord: (id: string) => Promise<void>;
  onSaveRecord: (payload: ReportInputPayload, editId?: string) => Promise<void>;
}

interface InlineRowValues {
  year: string;
  numberEnrolled: string;
  employed: string;
  numberGraduates: string;
  numberAssessed: string;
  numberCompetent: string;
  numberNYC: string;
}

export const EmploymentReportView: React.FC<EmploymentReportViewProps> = ({
  user,
  campuses,
  qualifications,
  availableYears,
  filters,
  reports,
  totals,
  summary,
  loading,
  onFilterChange,
  onResetFilters,
  onOpenCreate,
  onOpenEdit,
  onOpenImport,
  onDeleteRecord,
  onSaveRecord,
}) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const currentSystemYear = new Date().getFullYear();

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // View Details Modal state
  const [selectedRecord, setSelectedRecord] = useState<EmploymentReport | null>(null);

  // Delete Confirmation Modal state
  const [recordToDelete, setRecordToDelete] = useState<EmploymentReport | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Inline Data Entry Form state (All 7 fields editable; numerical fields default to 0; NYC manually encoded; unlimited years)
  const activeQualifications = qualifications.filter((q) => q.status === EntityStatus.ACTIVE);
  const [entryCampusId, setEntryCampusId] = useState<string>(
    isAdmin ? campuses[0]?.id || 'BIGA' : user.campusId || 'BIGA'
  );
  const [entryYear, setEntryYear] = useState<string>(String(currentSystemYear));
  const [entryQualId, setEntryQualId] = useState<string>(
    activeQualifications[0]?.id || 'QUAL_BPP'
  );
  const [entryCustomQual, setEntryCustomQual] = useState<string>('');
  const [entryEnrolled, setEntryEnrolled] = useState<string>('0');
  const [entryEmployed, setEntryEmployed] = useState<string>('0');
  const [entryGraduates, setEntryGraduates] = useState<string>('0');
  const [entryAssessed, setEntryAssessed] = useState<string>('0');
  const [entryCompetent, setEntryCompetent] = useState<string>('0');
  const [entryNYC, setEntryNYC] = useState<string>('0');
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entrySaving, setEntrySaving] = useState<boolean>(false);

  // Refs for Enter key navigation in Data Entry bar
  const entryCustomQualRef = useRef<HTMLInputElement | null>(null);
  const entryEnrolledRef = useRef<HTMLInputElement | null>(null);
  const entryEmployedRef = useRef<HTMLInputElement | null>(null);
  const entryGraduatesRef = useRef<HTMLInputElement | null>(null);
  const entryAssessedRef = useRef<HTMLInputElement | null>(null);
  const entryCompetentRef = useRef<HTMLInputElement | null>(null);
  const entryNYCRef = useRef<HTMLInputElement | null>(null);
  const entrySaveBtnRef = useRef<HTMLButtonElement | null>(null);

  // Inline table row state so authorized users can directly replace 0 with actual numbers in the table
  const [rowDrafts, setRowDrafts] = useState<Record<string, InlineRowValues>>({});
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [savedRowId, setSavedRowId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    if (!isAdmin && user.campusId) {
      setEntryCampusId(user.campusId);
    } else if (isAdmin && filters.campusId !== 'ALL') {
      setEntryCampusId(filters.campusId);
    }
  }, [isAdmin, user.campusId, filters.campusId]);

  useEffect(() => {
    if (
      entryQualId !== 'OTHERS' &&
      activeQualifications.length > 0 &&
      !activeQualifications.some((q) => q.id === entryQualId)
    ) {
      setEntryQualId(activeQualifications[0].id);
    }
  }, [activeQualifications, entryQualId]);

  // Sync row drafts when reports change (including year and manually encoded numberNYC)
  useEffect(() => {
    const nextDrafts: Record<string, InlineRowValues> = {};
    for (const r of reports) {
      nextDrafts[r.id] = {
        year: String(r.year ?? currentSystemYear),
        numberEnrolled: String(r.numberEnrolled ?? 0),
        employed: String(r.employed ?? 0),
        numberGraduates: String(r.numberGraduates ?? 0),
        numberAssessed: String(r.numberAssessed ?? 0),
        numberCompetent: String(r.numberCompetent ?? 0),
        numberNYC: String(r.numberNYC ?? 0),
      };
    }
    setRowDrafts(nextDrafts);
  }, [reports, currentSystemYear]);

  const parsedEntryYear = Number(entryYear);
  const parsedEntryEnrolled = Number(entryEnrolled);
  const parsedEntryEmployed = Number(entryEmployed);
  const parsedEntryGraduates = Number(entryGraduates);
  const parsedEntryAssessed = Number(entryAssessed);
  const parsedEntryCompetent = Number(entryCompetent);
  const parsedEntryNYC = Number(entryNYC);

  const validateNumbers = (vals: {
    enrolled: number;
    employed: number;
    graduates: number;
    assessed: number;
    competent: number;
    nyc: number;
  }): string | null => {
    const { enrolled, employed, graduates, assessed, competent, nyc } = vals;
    const list = [
      { name: 'Number of Enrolled', v: enrolled },
      { name: 'Employed', v: employed },
      { name: 'Number of Graduates', v: graduates },
      { name: 'Number of Assessed', v: assessed },
      { name: 'Number of Competent', v: competent },
      { name: 'Number of NYC', v: nyc },
    ];
    for (const item of list) {
      if (Number.isNaN(item.v) || !Number.isInteger(item.v)) {
        return `${item.name} must be a valid whole number.`;
      }
      if (item.v < 0) {
        return `${item.name} cannot be negative.`;
      }
    }
    return null;
  };

  const moveFocusOnEnter = (
    e: React.KeyboardEvent<HTMLInputElement>,
    nextRef: React.RefObject<HTMLInputElement | HTMLButtonElement | null>
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef.current) {
        nextRef.current.focus();
        if ('select' in nextRef.current && typeof nextRef.current.select === 'function') {
          nextRef.current.select();
        }
      }
    }
  };

  const handleInlineEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError(null);

    if (entryYear.trim() === '' || !Number.isInteger(parsedEntryYear) || parsedEntryYear < 1900) {
      setEntryError('Year must be a valid 4-digit year (e.g., 2004, 2012, 2026, 2031, or any future year).');
      return;
    }

    if (entryQualId === 'OTHERS' && !entryCustomQual.trim()) {
      setEntryError('Please specify the qualification name for "Others".');
      return;
    }

    const validationMsg = validateNumbers({
      enrolled: parsedEntryEnrolled,
      employed: parsedEntryEmployed,
      graduates: parsedEntryGraduates,
      assessed: parsedEntryAssessed,
      competent: parsedEntryCompetent,
      nyc: parsedEntryNYC,
    });

    if (validationMsg) {
      setEntryError(validationMsg);
      return;
    }

    const targetCampus = isAdmin ? entryCampusId : user.campusId || 'BIGA';

    setEntrySaving(true);
    try {
      // Always create a new entry (repeated qualifications like BPP, BPP, BPP are allowed!)
      await onSaveRecord({
        campusId: targetCampus,
        year: parsedEntryYear,
        qualificationId: entryQualId,
        customQualificationName:
          entryQualId === 'OTHERS' ? entryCustomQual.trim() : undefined,
        numberEnrolled: parsedEntryEnrolled,
        employed: parsedEntryEmployed,
        numberGraduates: parsedEntryGraduates,
        numberAssessed: parsedEntryAssessed,
        numberCompetent: parsedEntryCompetent,
        numberNYC: parsedEntryNYC,
      });
      // Reset numerical fields back to 0 after saving
      setEntryEnrolled('0');
      setEntryEmployed('0');
      setEntryGraduates('0');
      setEntryAssessed('0');
      setEntryCompetent('0');
      setEntryNYC('0');
      if (entryQualId === 'OTHERS') {
        setEntryCustomQual('');
      }
      setTimeout(() => {
        entryEnrolledRef.current?.focus();
        entryEnrolledRef.current?.select();
      }, 50);
    } catch (err: any) {
      setEntryError(err.message || 'Failed to save employment report.');
    } finally {
      setEntrySaving(false);
    }
  };

  const updateRowDraft = (id: string, field: keyof InlineRowValues, rawValue: string) => {
    const cleaned =
      rawValue.length > 1 && rawValue.startsWith('0')
        ? rawValue.replace(/^0+/, '') || '0'
        : rawValue;
    setRowError((prev) => (prev?.id === id ? null : prev));
    setRowDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {
          year: String(currentSystemYear),
          numberEnrolled: '0',
          employed: '0',
          numberGraduates: '0',
          numberAssessed: '0',
          numberCompetent: '0',
          numberNYC: '0',
        }),
        [field]: cleaned,
      },
    }));
  };

  const handleRowBlur = (id: string, field: keyof InlineRowValues) => {
    const current = rowDrafts[id]?.[field] ?? (field === 'year' ? String(currentSystemYear) : '0');
    if (current.trim() === '') {
      updateRowDraft(id, field, field === 'year' ? String(currentSystemYear) : '0');
    }
  };

  const handleRowKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    record: EmploymentReport,
    nextFieldId?: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextFieldId) {
        const nextEl = document.getElementById(nextFieldId) as HTMLInputElement | null;
        if (nextEl) {
          nextEl.focus();
          nextEl.select();
        }
      } else {
        handleSaveInlineRow(record);
      }
    }
  };

  const handleSaveInlineRow = async (record: EmploymentReport) => {
    const draft = rowDrafts[record.id];
    if (!draft) return;

    const rowYear = Number(draft.year);
    if (draft.year.trim() === '' || !Number.isInteger(rowYear) || rowYear < 1900) {
      setRowError({
        id: record.id,
        message: 'Year must be a valid 4-digit year (e.g., 2004, 2012, 2026, 2031, or any future year).',
      });
      return;
    }

    const enrolled = Number(draft.numberEnrolled);
    const employed = Number(draft.employed);
    const graduates = Number(draft.numberGraduates);
    const assessed = Number(draft.numberAssessed);
    const competent = Number(draft.numberCompetent);
    const nyc = Number(draft.numberNYC);

    const errMsg = validateNumbers({
      enrolled,
      employed,
      graduates,
      assessed,
      competent,
      nyc,
    });

    if (errMsg) {
      setRowError({ id: record.id, message: errMsg });
      return;
    }

    setRowError(null);
    setSavingRowId(record.id);
    try {
      await onSaveRecord(
        {
          campusId: record.campusId,
          year: rowYear,
          qualificationId: record.qualificationId,
          numberEnrolled: enrolled,
          employed,
          numberGraduates: graduates,
          numberAssessed: assessed,
          numberCompetent: competent,
          numberNYC: nyc,
        },
        record.id
      );
      setSavedRowId(record.id);
      setTimeout(() => {
        setSavedRowId((prev) => (prev === record.id ? null : prev));
      }, 2500);
    } catch (err: any) {
      setRowError({ id: record.id, message: err.message || 'Failed to update record.' });
    } finally {
      setSavingRowId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(reports.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedReports = reports.slice((safePage - 1) * pageSize, safePage * pageSize);

  const campusLabel =
    summary?.appliedFilters.campusLabel ||
    (filters.campusId === 'ALL'
      ? 'All Campuses'
      : campuses.find((c) => c.id === filters.campusId)?.campusName || user.campusName || 'Campus');

  const periodLabel =
    summary?.appliedFilters.periodLabel ||
    (filters.yearMode === 'RANGE'
      ? `${filters.startYear}–${filters.endYear}`
      : filters.year === 'ALL'
        ? 'All Available Years'
        : filters.year);

  const qualificationLabel =
    summary?.appliedFilters.qualificationLabel ||
    (filters.qualificationId === 'ALL'
      ? 'All Qualifications'
      : qualifications.find((q) => q.id === filters.qualificationId)?.qualificationName || 'Qualification');

  const handleExportExcel = () => {
    const { columns, rows } = buildDetailedExportConfig(reports, true);
    exportReportToExcel(
      {
        reportTitle: 'EMPLOYMENT REPORT',
        campusLabel,
        periodLabel,
        qualificationLabel,
        generatedBy: user.fullName,
      },
      columns,
      rows,
      totals
    );
  };

  const handleExportPDF = () => {
    const { columns, rows } = buildDetailedExportConfig(reports, true);
    exportReportToPDF(
      {
        reportTitle: 'EMPLOYMENT REPORT',
        campusLabel,
        periodLabel,
        qualificationLabel,
        generatedBy: user.fullName,
      },
      columns,
      rows,
      totals
    );
  };

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    setDeleting(true);
    try {
      await onDeleteRecord(recordToDelete.id);
      setRecordToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // Dynamic & unlimited year suggestions (auto-includes historical years, DB years, and future years)
  const minSuggestedYear = Math.min(2000, ...(availableYears.length > 0 ? availableYears : [2004]));
  const maxSuggestedYear = Math.max(
    currentSystemYear + 10,
    ...(availableYears.length > 0 ? availableYears : [currentSystemYear])
  );
  const dynamicYearSuggestions: number[] = [];
  for (let y = maxSuggestedYear; y >= minSuggestedYear; y--) {
    dynamicYearSuggestions.push(y);
  }

  return (
    <div className="space-y-5">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="bg-white/90 border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">{campusLabel}</span>
            <span>·</span>
            <span>Period: {periodLabel}</span>
            <span>·</span>
            <span>{qualificationLabel}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            EMPLOYMENT REPORT
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenImport}
            className="px-3.5 py-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 text-blue-700" />
            <span>Import Historical Data (.xlsx / .csv)</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export to Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export to PDF</span>
          </button>
          <button
            type="button"
            onClick={onOpenCreate}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employment Report</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          EMPLOYMENT REPORT DATA ENTRY BAR (All 7 fields editable; Enter key moves to next field)
         ==================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 mb-4 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Employment Report Data Entry
            </h2>
            <p className="text-xs text-slate-500">
              All numerical fields (including Number of NYC) default to 0 and are manually editable. Press Enter to move to the next field. Repeated qualifications (e.g. BPP, BPP, BPP) are supported.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-blue-700">
            Select &ldquo;Others&rdquo; in Qualification to encode a custom course
          </span>
        </div>

        {entryError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{entryError}</span>
          </div>
        )}

        <form onSubmit={handleInlineEntrySubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-3 items-end">
            {/* 1. Campus */}
            <div className="sm:col-span-1 lg:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Campus
              </label>
              {isAdmin ? (
                <select
                  value={entryCampusId}
                  onChange={(e) => setEntryCampusId(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.campusName}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-2.5 py-2 text-xs font-medium bg-slate-100 border border-slate-200 rounded-lg text-slate-700 flex items-center justify-between">
                  <span className="truncate">{user.campusName || user.campusId}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
                </div>
              )}
            </div>

            {/* 2. Year (Dynamic & Unlimited Input Field) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Year
              </label>
              <datalist id="entry-dynamic-years">
                {dynamicYearSuggestions.map((y) => (
                  <option key={y} value={y} />
                ))}
              </datalist>
              <input
                type="number"
                min={1900}
                step={1}
                list="entry-dynamic-years"
                value={entryYear}
                onFocus={(e) => e.target.select()}
                onBlur={() => {
                  if (entryYear.trim() === '') setEntryYear(String(currentSystemYear));
                }}
                onKeyDown={(e) =>
                  moveFocusOnEnter(
                    e,
                    entryQualId === 'OTHERS' ? entryCustomQualRef : entryEnrolledRef
                  )
                }
                onChange={(e) => setEntryYear(e.target.value)}
                placeholder={`e.g. ${currentSystemYear}`}
                className="w-full px-2.5 py-2 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* 3. Qualification (including Others) */}
            <div className="sm:col-span-1 lg:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Qualification
              </label>
              <select
                value={entryQualId}
                onChange={(e) => {
                  const val = e.target.value;
                  setEntryQualId(val);
                  if (val === 'OTHERS') {
                    setTimeout(() => entryCustomQualRef.current?.focus(), 50);
                  } else {
                    setTimeout(() => {
                      entryEnrolledRef.current?.focus();
                      entryEnrolledRef.current?.select();
                    }, 50);
                  }
                }}
                className="w-full px-2.5 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {activeQualifications.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.code && q.qualificationName && q.code !== q.qualificationName
                      ? `${q.code} — ${q.qualificationName}`
                      : q.qualificationName || q.code}
                  </option>
                ))}
                <option value="OTHERS">Others</option>
              </select>
            </div>

            {/* 4. Number of Enrolled */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Number of Enrolled
              </label>
              <input
                ref={entryEnrolledRef}
                type="number"
                min={0}
                step={1}
                value={entryEnrolled}
                onFocus={(e) => e.target.select()}
                onBlur={() => {
                  if (entryEnrolled.trim() === '') setEntryEnrolled('0');
                }}
                onKeyDown={(e) => moveFocusOnEnter(e, entryEmployedRef)}
                onChange={(e) => {
                  const v = e.target.value;
                  setEntryEnrolled(v.length > 1 && v.startsWith('0') ? v.replace(/^0+/, '') || '0' : v);
                }}
                className="w-full px-2.5 py-2 text-xs font-mono text-right bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* 5. Employed */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Employed
              </label>
              <input
                ref={entryEmployedRef}
                type="number"
                min={0}
                step={1}
                value={entryEmployed}
                onFocus={(e) => e.target.select()}
                onBlur={() => {
                  if (entryEmployed.trim() === '') setEntryEmployed('0');
                }}
                onKeyDown={(e) => moveFocusOnEnter(e, entryGraduatesRef)}
                onChange={(e) => {
                  const v = e.target.value;
                  setEntryEmployed(v.length > 1 && v.startsWith('0') ? v.replace(/^0+/, '') || '0' : v);
                }}
                className="w-full px-2.5 py-2 text-xs font-mono text-right bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* 6. Number of Graduates */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Number of Graduates
              </label>
              <input
                ref={entryGraduatesRef}
                type="number"
                min={0}
                step={1}
                value={entryGraduates}
                onFocus={(e) => e.target.select()}
                onBlur={() => {
                  if (entryGraduates.trim() === '') setEntryGraduates('0');
                }}
                onKeyDown={(e) => moveFocusOnEnter(e, entryAssessedRef)}
                onChange={(e) => {
                  const v = e.target.value;
                  setEntryGraduates(v.length > 1 && v.startsWith('0') ? v.replace(/^0+/, '') || '0' : v);
                }}
                className="w-full px-2.5 py-2 text-xs font-mono text-right bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* 7. Number of Assessed */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Number of Assessed
              </label>
              <input
                ref={entryAssessedRef}
                type="number"
                min={0}
                step={1}
                value={entryAssessed}
                onFocus={(e) => e.target.select()}
                onBlur={() => {
                  if (entryAssessed.trim() === '') setEntryAssessed('0');
                }}
                onKeyDown={(e) => moveFocusOnEnter(e, entryCompetentRef)}
                onChange={(e) => {
                  const v = e.target.value;
                  setEntryAssessed(v.length > 1 && v.startsWith('0') ? v.replace(/^0+/, '') || '0' : v);
                }}
                className="w-full px-2.5 py-2 text-xs font-mono text-right bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Specify Custom Qualification when "Others" is selected */}
          {entryQualId === 'OTHERS' && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs font-bold text-slate-900 shrink-0">
                Specify Qualification:
              </label>
              <input
                ref={entryCustomQualRef}
                type="text"
                value={entryCustomQual}
                onChange={(e) => setEntryCustomQual(e.target.value)}
                onKeyDown={(e) => moveFocusOnEnter(e, entryEnrolledRef)}
                placeholder="Type custom qualification name (e.g. Shielded Metal Arc Welding, Dressmaking)..."
                required
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-3 items-end pt-1">
            {/* 8. Number of Competent */}
            <div className="sm:col-span-1 lg:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Number of Competent
              </label>
              <input
                ref={entryCompetentRef}
                type="number"
                min={0}
                step={1}
                value={entryCompetent}
                onFocus={(e) => e.target.select()}
                onBlur={() => {
                  if (entryCompetent.trim() === '') setEntryCompetent('0');
                }}
                onKeyDown={(e) => moveFocusOnEnter(e, entryNYCRef)}
                onChange={(e) => {
                  const v = e.target.value;
                  setEntryCompetent(v.length > 1 && v.startsWith('0') ? v.replace(/^0+/, '') || '0' : v);
                }}
                className="w-full px-2.5 py-2 text-xs font-mono text-right bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* 9. Number of NYC (Manually Editable Field) */}
            <div className="sm:col-span-1 lg:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Number of NYC
              </label>
              <input
                ref={entryNYCRef}
                type="number"
                min={0}
                step={1}
                value={entryNYC}
                onFocus={(e) => e.target.select()}
                onBlur={() => {
                  if (entryNYC.trim() === '') setEntryNYC('0');
                }}
                onKeyDown={(e) => moveFocusOnEnter(e, entrySaveBtnRef)}
                onChange={(e) => {
                  const v = e.target.value;
                  setEntryNYC(v.length > 1 && v.startsWith('0') ? v.replace(/^0+/, '') || '0' : v);
                }}
                aria-label="Number of NYC"
                className="w-full px-2.5 py-2 text-xs font-mono font-semibold text-right bg-white border border-slate-300 rounded-lg text-amber-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setEntryEnrolled('0');
                  setEntryEmployed('0');
                  setEntryGraduates('0');
                  setEntryAssessed('0');
                  setEntryCompetent('0');
                  setEntryNYC('0');
                  setEntryCustomQual('');
                  setEntryError(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Reset to 0
              </button>
              <button
                ref={entrySaveBtnRef}
                type="submit"
                disabled={entrySaving}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{entrySaving ? 'Saving...' : 'Save Record & Update Totals'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Interactive Filter Bar */}
      <FilterBar
        user={user}
        campuses={campuses}
        qualifications={qualifications}
        availableYears={availableYears}
        filters={filters}
        onChange={(updated) => {
          setCurrentPage(1);
          onFilterChange(updated);
        }}
        onReset={() => {
          setCurrentPage(1);
          onResetFilters();
        }}
        showSearch={true}
      />

      {rowError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-xs text-red-800 no-print">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{rowError.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setRowError(null)}
            className="text-red-600 hover:text-red-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Official Report Container (Screen & Print Ready) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print-container">
        {/* Official Report Header Block */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/60">
          <div className="flex flex-col items-center justify-center text-center space-y-1">
            <img
              src="/som-logo.jpg"
              alt="Sisters of Mary of Banneux, Inc. Logo"
              className="w-14 h-14 rounded-full object-cover border border-slate-200 shadow-xs mb-1"
            />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              SISTERS OF MARY OF BANNEUX, INC.
            </h2>
            <p className="text-xs font-bold text-blue-700 tracking-wide">
              EMPLOYMENT REPORT
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700">
            <div className="space-y-0.5">
              <div>
                <span className="font-semibold text-slate-900">Campus:</span> {campusLabel}
              </div>
              <div>
                <span className="font-semibold text-slate-900">Period:</span> {periodLabel}
              </div>
            </div>
            <div className="sm:text-right space-y-0.5">
              <div>
                <span className="font-semibold text-slate-900">Qualification:</span>{' '}
                {qualificationLabel}
              </div>
              <div className="text-slate-500 font-mono">
                Matching Records: {totals.recordCount}
              </div>
            </div>
          </div>
        </div>

        {/* Main Employment Report Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-semibold">
                <th className="py-3 px-4">Campus</th>
                <th className="py-3 px-3">Year</th>
                <th className="py-3 px-4">Qualification</th>
                <th className="py-3 px-3 text-right">Number of Enrolled</th>
                <th className="py-3 px-3 text-right">Employed</th>
                <th className="py-3 px-3 text-right">Number of Graduates</th>
                <th className="py-3 px-3 text-right">Number of Assessed</th>
                <th className="py-3 px-3 text-right">Number of Competent</th>
                <th className="py-3 px-3 text-right">Number of NYC</th>
                <th className="py-3 px-4 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    Loading employment report records...
                  </td>
                </tr>
              ) : paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      No employment report records found for the selected filters.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Adjust your filter settings, add a new employment report record, or import historical data (.xlsx / .csv).
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={onOpenCreate}
                        className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Record</span>
                      </button>
                      <button
                        type="button"
                        onClick={onOpenImport}
                        className="px-4 py-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Import Historical Data</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedReports.map((r) => {
                  const draft = rowDrafts[r.id] || {
                    year: String(r.year ?? currentSystemYear),
                    numberEnrolled: String(r.numberEnrolled ?? 0),
                    employed: String(r.employed ?? 0),
                    numberGraduates: String(r.numberGraduates ?? 0),
                    numberAssessed: String(r.numberAssessed ?? 0),
                    numberCompetent: String(r.numberCompetent ?? 0),
                    numberNYC: String(r.numberNYC ?? 0),
                  };

                  const isDirty =
                    Number(draft.year) !== r.year ||
                    Number(draft.numberEnrolled) !== r.numberEnrolled ||
                    Number(draft.employed) !== r.employed ||
                    Number(draft.numberGraduates) !== r.numberGraduates ||
                    Number(draft.numberAssessed) !== r.numberAssessed ||
                    Number(draft.numberCompetent) !== r.numberCompetent ||
                    Number(draft.numberNYC) !== r.numberNYC;

                  const showCodeAndName =
                    r.qualificationCode &&
                    r.qualificationName &&
                    r.qualificationCode !== r.qualificationName;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/90 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {r.campusName || r.campusId}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums font-semibold text-slate-900">
                        <input
                          id={`row-${r.id}-year`}
                          type="number"
                          min={1900}
                          step={1}
                          list="entry-dynamic-years"
                          value={draft.year}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleRowBlur(r.id, 'year')}
                          onKeyDown={(e) => handleRowKeyDown(e, r, `row-${r.id}-enrolled`)}
                          onChange={(e) => updateRowDraft(r.id, 'year', e.target.value)}
                          aria-label={`Year for ${r.qualificationCode}`}
                          className="w-20 px-2 py-1 font-mono font-semibold text-xs bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 no-print"
                        />
                        <span className="hidden print-only font-semibold text-slate-900">
                          {r.year}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        {showCodeAndName ? (
                          <>
                            <span className="font-semibold text-slate-900">
                              {r.qualificationCode}
                            </span>
                            <span className="text-slate-400 mx-1.5">—</span>
                            <span className="text-slate-600">{r.qualificationName}</span>
                          </>
                        ) : (
                          <span className="font-semibold text-slate-900">
                            {r.qualificationName || r.qualificationCode}
                          </span>
                        )}
                      </td>

                      {/* Number of Enrolled (Editable on screen, formatted in print) */}
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        <input
                          id={`row-${r.id}-enrolled`}
                          type="number"
                          min={0}
                          step={1}
                          value={draft.numberEnrolled}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleRowBlur(r.id, 'numberEnrolled')}
                          onKeyDown={(e) => handleRowKeyDown(e, r, `row-${r.id}-employed`)}
                          onChange={(e) => updateRowDraft(r.id, 'numberEnrolled', e.target.value)}
                          aria-label={`Number of Enrolled for ${r.qualificationCode}`}
                          className="w-20 px-2 py-1 text-right font-mono text-xs bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 no-print"
                        />
                        <span className="hidden print-only font-medium text-slate-900">
                          {r.numberEnrolled.toLocaleString()}
                        </span>
                      </td>

                      {/* Employed */}
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        <input
                          id={`row-${r.id}-employed`}
                          type="number"
                          min={0}
                          step={1}
                          value={draft.employed}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleRowBlur(r.id, 'employed')}
                          onKeyDown={(e) => handleRowKeyDown(e, r, `row-${r.id}-graduates`)}
                          onChange={(e) => updateRowDraft(r.id, 'employed', e.target.value)}
                          aria-label={`Employed for ${r.qualificationCode}`}
                          className="w-20 px-2 py-1 text-right font-mono font-semibold text-xs bg-white border border-slate-300 rounded text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 no-print"
                        />
                        <span className="hidden print-only font-semibold text-blue-700">
                          {r.employed.toLocaleString()}
                        </span>
                      </td>

                      {/* Number of Graduates */}
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        <input
                          id={`row-${r.id}-graduates`}
                          type="number"
                          min={0}
                          step={1}
                          value={draft.numberGraduates}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleRowBlur(r.id, 'numberGraduates')}
                          onKeyDown={(e) => handleRowKeyDown(e, r, `row-${r.id}-assessed`)}
                          onChange={(e) => updateRowDraft(r.id, 'numberGraduates', e.target.value)}
                          aria-label={`Number of Graduates for ${r.qualificationCode}`}
                          className="w-20 px-2 py-1 text-right font-mono text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 no-print"
                        />
                        <span className="hidden print-only text-slate-800">
                          {r.numberGraduates.toLocaleString()}
                        </span>
                      </td>

                      {/* Number of Assessed */}
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        <input
                          id={`row-${r.id}-assessed`}
                          type="number"
                          min={0}
                          step={1}
                          value={draft.numberAssessed}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleRowBlur(r.id, 'numberAssessed')}
                          onKeyDown={(e) => handleRowKeyDown(e, r, `row-${r.id}-competent`)}
                          onChange={(e) => updateRowDraft(r.id, 'numberAssessed', e.target.value)}
                          aria-label={`Number of Assessed for ${r.qualificationCode}`}
                          className="w-20 px-2 py-1 text-right font-mono text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 no-print"
                        />
                        <span className="hidden print-only text-slate-800">
                          {r.numberAssessed.toLocaleString()}
                        </span>
                      </td>

                      {/* Number of Competent */}
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        <input
                          id={`row-${r.id}-competent`}
                          type="number"
                          min={0}
                          step={1}
                          value={draft.numberCompetent}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleRowBlur(r.id, 'numberCompetent')}
                          onKeyDown={(e) => handleRowKeyDown(e, r, `row-${r.id}-nyc`)}
                          onChange={(e) => updateRowDraft(r.id, 'numberCompetent', e.target.value)}
                          aria-label={`Number of Competent for ${r.qualificationCode}`}
                          className="w-20 px-2 py-1 text-right font-mono font-semibold text-xs bg-white border border-slate-300 rounded text-emerald-700 focus:outline-none focus:ring-2 focus:ring-blue-600 no-print"
                        />
                        <span className="hidden print-only font-semibold text-emerald-700">
                          {r.numberCompetent.toLocaleString()}
                        </span>
                      </td>

                      {/* Number of NYC (Manually Editable) */}
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        <input
                          id={`row-${r.id}-nyc`}
                          type="number"
                          min={0}
                          step={1}
                          value={draft.numberNYC}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleRowBlur(r.id, 'numberNYC')}
                          onKeyDown={(e) => handleRowKeyDown(e, r)}
                          onChange={(e) => updateRowDraft(r.id, 'numberNYC', e.target.value)}
                          title="Manually encoded Number of NYC (Press Enter to save row)"
                          aria-label={`Number of NYC for ${r.qualificationCode}`}
                          className="w-20 px-2 py-1 text-right font-mono font-bold text-xs bg-white border border-slate-300 rounded text-amber-800 focus:outline-none focus:ring-2 focus:ring-blue-600 no-print"
                        />
                        <span className="hidden print-only font-semibold text-amber-700">
                          {r.numberNYC.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-2 px-4 text-right no-print whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSaveInlineRow(r)}
                            disabled={savingRowId === r.id}
                            title="Save Row Values"
                            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                              savedRowId === r.id
                                ? 'bg-emerald-100 text-emerald-800'
                                : isDirty
                                  ? 'bg-blue-700 text-white hover:bg-blue-800'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {savedRowId === r.id ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Saved</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-3 h-3" />
                                <span>{savingRowId === r.id ? '...' : 'Save'}</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(r)}
                            title="View Details"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenEdit(r)}
                            title="Open Edit Modal"
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRecordToDelete(r)}
                            title="Delete Record"
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Automatically Calculated Totals Footer */}
            {reports.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-xs text-slate-900">
                  <td colSpan={3} className="py-3.5 px-4">
                    TOTAL ({totals.recordCount} Records)
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                    {totals.numberEnrolled.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-blue-800">
                    {totals.employed.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                    {totals.numberGraduates.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                    {totals.numberAssessed.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-emerald-800">
                    {totals.numberCompetent.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-amber-800">
                    {totals.numberNYC.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 no-print" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Controls (Hidden on Print) */}
        {reports.length > 0 && (
          <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 no-print">
            <div className="flex items-center gap-2">
              <span>
                Showing{' '}
                <strong className="font-mono text-slate-900">
                  {(safePage - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="font-mono text-slate-900">
                  {Math.min(safePage * pageSize, reports.length)}
                </strong>{' '}
                of <strong className="font-mono text-slate-900">{reports.length}</strong> records
              </span>
              <span>·</span>
              <label className="inline-flex items-center gap-1.5">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-white text-slate-900"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={500}>All ({reports.length})</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <span className="px-2 font-mono">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 no-print">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Employment Report Record Details</h3>
                <p className="text-xs text-slate-300 font-mono mt-0.5">{selectedRecord.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-slate-500 block">Campus</span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {selectedRecord.campusName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Report Year</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {selectedRecord.year}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Qualification</span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {selectedRecord.qualificationCode &&
                    selectedRecord.qualificationName &&
                    selectedRecord.qualificationCode !== selectedRecord.qualificationName
                      ? `${selectedRecord.qualificationCode} — ${selectedRecord.qualificationName}`
                      : selectedRecord.qualificationName || selectedRecord.qualificationCode}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Enrolled</span>
                  <span className="font-mono font-bold text-base text-slate-900">
                    {selectedRecord.numberEnrolled.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200">
                  <span className="text-blue-700 block">Employed</span>
                  <span className="font-mono font-bold text-base text-blue-800">
                    {selectedRecord.employed.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Graduates</span>
                  <span className="font-mono font-bold text-base text-slate-900">
                    {selectedRecord.numberGraduates.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Assessed</span>
                  <span className="font-mono font-bold text-base text-slate-900">
                    {selectedRecord.numberAssessed.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block">Competent</span>
                  <span className="font-mono font-bold text-base text-emerald-800">
                    {selectedRecord.numberCompetent.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
                  <span className="text-amber-800 block">Number of NYC</span>
                  <span className="font-mono font-bold text-base text-amber-800">
                    {selectedRecord.numberNYC.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 text-slate-500 space-y-1">
                <div>Recorded by: {selectedRecord.createdByName || selectedRecord.createdBy}</div>
                <div>
                  Last Updated: {new Date(selectedRecord.updatedAt).toLocaleString()}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const rec = selectedRecord;
                    setSelectedRecord(null);
                    onOpenEdit(rec);
                  }}
                  className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Edit This Record
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 no-print">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Deletion
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Are you sure you want to delete this employment report?
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div>
                <span className="text-slate-500">Campus:</span>{' '}
                <strong className="text-slate-900">{recordToDelete.campusName}</strong>
              </div>
              <div>
                <span className="text-slate-500">Year:</span>{' '}
                <strong className="font-mono text-slate-900">{recordToDelete.year}</strong>
              </div>
              <div>
                <span className="text-slate-500">Qualification:</span>{' '}
                <strong className="text-slate-900">
                  {recordToDelete.qualificationCode &&
                  recordToDelete.qualificationName &&
                  recordToDelete.qualificationCode !== recordToDelete.qualificationName
                    ? `${recordToDelete.qualificationCode} — ${recordToDelete.qualificationName}`
                    : recordToDelete.qualificationName || recordToDelete.qualificationCode}
                </strong>
              </div>
              <div className="font-mono text-slate-600 pt-1">
                Enrolled: {recordToDelete.numberEnrolled} · Employed: {recordToDelete.employed} · NYC:{' '}
                {recordToDelete.numberNYC}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
