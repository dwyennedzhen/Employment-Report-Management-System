import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import {
  Campus,
  EmploymentReport,
  EntityStatus,
  Qualification,
  ReportInputPayload,
  User,
  UserRole,
} from '../types';

interface ReportFormModalProps {
  isOpen: boolean;
  mode: 'CREATE' | 'EDIT';
  user: User;
  campuses: Campus[];
  qualifications: Qualification[];
  existingReports: EmploymentReport[];
  initialRecord?: EmploymentReport | null;
  defaultCampusId?: string;
  defaultYear?: number;
  onClose: () => void;
  onSubmit: (payload: ReportInputPayload, editId?: string) => Promise<void>;
}

export const ReportFormModal: React.FC<ReportFormModalProps> = ({
  isOpen,
  mode,
  user,
  campuses,
  qualifications,
  existingReports,
  initialRecord,
  defaultCampusId,
  defaultYear = new Date().getFullYear(),
  onClose,
  onSubmit,
}) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const currentSystemYear = new Date().getFullYear();

  const activeQualifications = useMemo(
    () =>
      qualifications.filter(
        (q) => q.status === EntityStatus.ACTIVE || (initialRecord && q.id === initialRecord.qualificationId)
      ),
    [qualifications, initialRecord]
  );

  const [campusId, setCampusId] = useState<string>('');
  const [year, setYear] = useState<string>(String(currentSystemYear));
  const [qualificationId, setQualificationId] = useState<string>('');
  const [customQualificationName, setCustomQualificationName] = useState<string>('');
  const [numberEnrolled, setNumberEnrolled] = useState<string>('0');
  const [employed, setEmployed] = useState<string>('0');
  const [numberGraduates, setNumberGraduates] = useState<string>('0');
  const [numberAssessed, setNumberAssessed] = useState<string>('0');
  const [numberCompetent, setNumberCompetent] = useState<string>('0');
  const [numberNYC, setNumberNYC] = useState<string>('0');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Refs for Enter-to-next-field navigation
  const qualSelectRef = useRef<HTMLSelectElement | null>(null);
  const customQualInputRef = useRef<HTMLInputElement | null>(null);
  const enrolledInputRef = useRef<HTMLInputElement | null>(null);
  const employedInputRef = useRef<HTMLInputElement | null>(null);
  const graduatesInputRef = useRef<HTMLInputElement | null>(null);
  const assessedInputRef = useRef<HTMLInputElement | null>(null);
  const competentInputRef = useRef<HTMLInputElement | null>(null);
  const nycInputRef = useRef<HTMLInputElement | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    setCustomQualificationName('');

    if (mode === 'EDIT' && initialRecord) {
      setCampusId(isAdmin ? initialRecord.campusId : user.campusId || initialRecord.campusId);
      setYear(String(initialRecord.year));
      setQualificationId(initialRecord.qualificationId);
      setNumberEnrolled(String(initialRecord.numberEnrolled ?? 0));
      setEmployed(String(initialRecord.employed ?? 0));
      setNumberGraduates(String(initialRecord.numberGraduates ?? 0));
      setNumberAssessed(String(initialRecord.numberAssessed ?? 0));
      setNumberCompetent(String(initialRecord.numberCompetent ?? 0));
      setNumberNYC(String(initialRecord.numberNYC ?? 0));
    } else {
      const resolvedCampus = !isAdmin
        ? user.campusId || 'BIGA'
        : defaultCampusId && defaultCampusId !== 'ALL'
          ? defaultCampusId
          : campuses[0]?.id || 'BIGA';
      setCampusId(resolvedCampus);
      setYear(String(defaultYear || currentSystemYear));
      setQualificationId(activeQualifications[0]?.id || 'QUAL_BPP');

      // Default all numerical fields to 0 (user replaces 0 with actual number)
      setNumberEnrolled('0');
      setEmployed('0');
      setNumberGraduates('0');
      setNumberAssessed('0');
      setNumberCompetent('0');
      setNumberNYC('0');
    }
  }, [isOpen, mode, initialRecord, isAdmin, user.campusId, defaultCampusId, defaultYear, currentSystemYear, campuses, activeQualifications]);

  // Parse integer helper
  const parsedYear = Number(year);
  const parsedEnrolled = Number(numberEnrolled);
  const parsedEmployed = Number(employed);
  const parsedGraduates = Number(numberGraduates);
  const parsedAssessed = Number(numberAssessed);
  const parsedCompetent = Number(numberCompetent);
  const parsedNYC = Number(numberNYC);

  // Client-side validation checks (repeated qualifications allowed; NYC manually encoded; unlimited future years)
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!campusId) {
      errors.push('Please select a campus.');
    }
    if (!qualificationId) {
      errors.push('Please select a qualification.');
    }
    if (qualificationId === 'OTHERS' && !customQualificationName.trim()) {
      errors.push('Please specify the qualification name for "Others".');
    }
    if (year.trim() === '' || !Number.isInteger(parsedYear) || parsedYear < 1900) {
      errors.push('Year must be a valid 4-digit year (e.g., 2004, 2012, 2026, 2031, or any future year).');
    }

    const numChecks = [
      { label: 'Number of Enrolled', raw: numberEnrolled, val: parsedEnrolled },
      { label: 'Employed', raw: employed, val: parsedEmployed },
      { label: 'Number of Graduates', raw: numberGraduates, val: parsedGraduates },
      { label: 'Number of Assessed', raw: numberAssessed, val: parsedAssessed },
      { label: 'Number of Competent', raw: numberCompetent, val: parsedCompetent },
      { label: 'Number of NYC', raw: numberNYC, val: parsedNYC },
    ];

    for (const item of numChecks) {
      if (item.raw.trim() === '' || Number.isNaN(item.val) || !Number.isInteger(item.val)) {
        errors.push(`${item.label} must be a valid whole number.`);
      } else if (item.val < 0) {
        errors.push(`${item.label} cannot be negative. All numerical values must be zero or greater.`);
      }
    }

    return errors;
  }, [
    campusId,
    qualificationId,
    customQualificationName,
    year,
    parsedYear,
    numberEnrolled,
    employed,
    numberGraduates,
    numberAssessed,
    numberCompetent,
    numberNYC,
    parsedEnrolled,
    parsedEmployed,
    parsedGraduates,
    parsedAssessed,
    parsedCompetent,
    parsedNYC,
  ]);

  if (!isOpen) return null;

  // Dynamic & unlimited year suggestions (auto-includes historical years, DB years, and future years)
  const existingYears = existingReports.map((r) => r.year);
  const minSuggestedYear = Math.min(2000, ...(existingYears.length > 0 ? existingYears : [2004]));
  const maxSuggestedYear = Math.max(
    currentSystemYear + 10,
    ...(existingYears.length > 0 ? existingYears : [currentSystemYear])
  );
  const dynamicYearSuggestions: number[] = [];
  for (let y = maxSuggestedYear; y >= minSuggestedYear; y--) {
    dynamicYearSuggestions.push(y);
  }

  const moveFocusOnEnter = (
    e: React.KeyboardEvent<HTMLInputElement>,
    nextRef: React.RefObject<HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null>
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (validationErrors.length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(
        {
          campusId: isAdmin ? campusId : user.campusId!,
          year: parsedYear,
          qualificationId,
          customQualificationName:
            qualificationId === 'OTHERS' ? customQualificationName.trim() : undefined,
          numberEnrolled: parsedEnrolled,
          employed: parsedEmployed,
          numberGraduates: parsedGraduates,
          numberAssessed: parsedAssessed,
          numberCompetent: parsedCompetent,
          numberNYC: parsedNYC,
        },
        mode === 'EDIT' && initialRecord ? initialRecord.id : undefined
      );
      onClose();
    } catch (err: any) {
      setServerError(err.message || 'Failed to save employment report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight">
              {mode === 'CREATE' ? 'Add Employment Report Record' : 'Edit Employment Report Record'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Press Enter to move to the next field. All fields (including NYC) are manually editable.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
          {/* Server Error or Validation Alerts */}
          {(serverError || validationErrors.length > 0) && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Validation Check Required Before Saving</span>
              </div>
              {serverError && <p className="text-xs text-red-700 pl-6">{serverError}</p>}
              {validationErrors.map((err, idx) => (
                <p key={idx} className="text-xs text-red-700 pl-6">
                  • {err}
                </p>
              ))}
            </div>
          )}

          {/* Row 1: Campus, Year, Qualification */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Campus Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Campus
              </label>
              {isAdmin ? (
                <select
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.campusName}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 text-xs font-medium bg-slate-100 border border-slate-200 rounded-lg text-slate-700 flex items-center justify-between">
                  <span className="truncate">{user.campusName || user.campusId}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
                </div>
              )}
            </div>

            {/* Year Field (Dynamic & Unlimited Input + Datalist) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Year (Historical or Future)
              </label>
              <datalist id="modal-dynamic-years">
                {dynamicYearSuggestions.map((y) => (
                  <option key={y} value={y} />
                ))}
              </datalist>
              <input
                type="number"
                min={1900}
                step={1}
                list="modal-dynamic-years"
                value={year}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) =>
                  moveFocusOnEnter(
                    e,
                    qualificationId === 'OTHERS' ? customQualInputRef : enrolledInputRef
                  )
                }
                onChange={(e) => setYear(e.target.value)}
                placeholder={`e.g. 2012, ${currentSystemYear}, 2032`}
                required
                className="w-full px-3 py-2 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Qualification Field (including Others) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Qualification
              </label>
              <select
                ref={qualSelectRef}
                value={qualificationId}
                onChange={(e) => {
                  const val = e.target.value;
                  setQualificationId(val);
                  if (val === 'OTHERS') {
                    setTimeout(() => customQualInputRef.current?.focus(), 50);
                  } else {
                    setTimeout(() => {
                      enrolledInputRef.current?.focus();
                      enrolledInputRef.current?.select();
                    }, 50);
                  }
                }}
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
          </div>

          {/* Specify Qualification when "Others" is selected */}
          {qualificationId === 'OTHERS' && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Specify Qualification
              </label>
              <input
                ref={customQualInputRef}
                type="text"
                value={customQualificationName}
                onChange={(e) => setCustomQualificationName(e.target.value)}
                onKeyDown={(e) => moveFocusOnEnter(e, enrolledInputRef)}
                placeholder="e.g. Food Processing"
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[11px] text-slate-600 mt-1 block">
                This qualification will be saved and included in Employment Reports and Summaries.
              </span>
            </div>
          )}

          {/* Row 2: Number of Enrolled, Employed, Number of Graduates */}
          <div className="pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 mb-3">
              Enrollment, Employment & Graduation Figures (Press Enter to move to next field)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Number of Enrolled
                </label>
                <input
                  ref={enrolledInputRef}
                  type="number"
                  min={0}
                  step={1}
                  value={numberEnrolled}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    if (numberEnrolled.trim() === '') setNumberEnrolled('0');
                  }}
                  onKeyDown={(e) => moveFocusOnEnter(e, employedInputRef)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNumberEnrolled(v.length > 1 && v.startsWith('0') ? v.replace(/^0+/, '') || '0' : v);
                  }}
                  required
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[11px] text-slate-500">Press Enter → Employed</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employed
                </label>
                <input
                  ref={employedInputRef}
                  type="number"
                  min={0}
                  step={1}
                  value={employed}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    if (employed.trim() === '') setEmployed('0');
                  }}
                  onKeyDown={(e) => moveFocusOnEnter(e, graduatesInputRef)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEmployed(v.length > 1 && v.startsWith('0') ? v.replace(/^0+/, '') || '0' : v);
                  }}
                  required
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[11px] text-slate-500">Press Enter → Graduates</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Number of Graduates
                </label>
                <input
                  ref={graduatesInputRef}
                  type="number"
                  min={0}
                  step={1}
                  value={numberGraduates}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    if (numberGraduates.trim() === '') setNumberGraduates('0');
                  }}
                  onKeyDown={(e) => moveFocusOnEnter(e, assessedInputRef)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNumberGraduates(v.length > 1 && v.startsWith('0') ? v.replace(/^0+/, '') || '0' : v);
                  }}
                  required
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[11px] text-slate-500">Press Enter → Assessed</span>
              </div>
            </div>
          </div>

          {/* Row 3: Number of Assessed, Number of Competent, Number of NYC (All Manually Editable) */}
          <div className="pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 mb-3">
              TESDA Assessment Figures (Assessed, Competent & Manually Encoded NYC)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Number of Assessed
                </label>
                <input
                  ref={assessedInputRef}
                  type="number"
                  min={0}
                  step={1}
                  value={numberAssessed}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    if (numberAssessed.trim() === '') setNumberAssessed('0');
                  }}
                  onKeyDown={(e) => moveFocusOnEnter(e, competentInputRef)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNumberAssessed(v.length > 1 && v.startsWith('0') ? v.replace(/^0+/, '') || '0' : v);
                  }}
                  required
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[11px] text-slate-500">Press Enter → Competent</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Number of Competent
                </label>
                <input
                  ref={competentInputRef}
                  type="number"
                  min={0}
                  step={1}
                  value={numberCompetent}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    if (numberCompetent.trim() === '') setNumberCompetent('0');
                  }}
                  onKeyDown={(e) => moveFocusOnEnter(e, nycInputRef)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNumberCompetent(v.length > 1 && v.startsWith('0') ? v.replace(/^0+/, '') || '0' : v);
                  }}
                  required
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[11px] text-slate-500">Press Enter → NYC</span>
              </div>

              {/* Manually Editable Number of NYC Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Number of NYC
                </label>
                <input
                  ref={nycInputRef}
                  type="number"
                  min={0}
                  step={1}
                  value={numberNYC}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    if (numberNYC.trim() === '') setNumberNYC('0');
                  }}
                  onKeyDown={(e) => moveFocusOnEnter(e, saveButtonRef)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNumberNYC(v.length > 1 && v.startsWith('0') ? v.replace(/^0+/, '') || '0' : v);
                  }}
                  required
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[11px] text-slate-500">
                  Manually encoded (Not Yet Competent)
                </span>
              </div>
            </div>
          </div>

          {/* Live Status Banner */}
          {validationErrors.length === 0 && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Ready to save. Repeated qualifications are supported and automatically aggregated in Summary.
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              ref={saveButtonRef}
              type="submit"
              disabled={submitting || validationErrors.length > 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500 rounded-lg transition-colors cursor-pointer"
            >
              {submitting ? 'Saving Record...' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
