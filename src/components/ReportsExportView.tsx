import React, { useState } from 'react';
import { Printer, FileSpreadsheet, FileText, Check } from 'lucide-react';
import {
  AutomatedSummaryResponse,
  Campus,
  EmploymentReport,
  Qualification,
  ReportFilterState,
  ReportTotals,
  User,
  UserRole,
} from '../types';
import { FilterBar } from './FilterBar';
import {
  buildDetailedExportConfig,
  buildQualificationSummaryExportConfig,
  buildYearlySummaryExportConfig,
  exportReportToExcel,
  exportReportToPDF,
} from '../utils/exportUtils';

interface ReportsExportViewProps {
  user: User;
  campuses: Campus[];
  qualifications: Qualification[];
  availableYears: number[];
  filters: ReportFilterState;
  reports: EmploymentReport[];
  totals: ReportTotals;
  summary: AutomatedSummaryResponse | null;
  onFilterChange: (updated: Partial<ReportFilterState>) => void;
  onResetFilters: () => void;
}

type OfficialReportTemplate =
  | 'STANDARD_SUMMARY'
  | 'DETAILED_RECORDS'
  | 'YEARLY_CHRONOLOGICAL';

export const ReportsExportView: React.FC<ReportsExportViewProps> = ({
  user,
  campuses,
  qualifications,
  availableYears,
  filters,
  reports,
  totals,
  summary,
  onFilterChange,
  onResetFilters,
}) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const [template, setTemplate] = useState<OfficialReportTemplate>('STANDARD_SUMMARY');

  const campusLabel =
    summary?.appliedFilters.campusLabel ||
    (isAdmin ? 'All Campuses' : user.campusName || 'Assigned Campus');
  const periodLabel = summary?.appliedFilters.periodLabel || 'All Available Years';
  const qualificationLabel =
    summary?.appliedFilters.qualificationLabel || 'All Qualifications';

  const byQualification = summary?.byQualification || [];
  const byYearAndQualification = summary?.byYearAndQualification || [];

  const getActiveExportPayload = () => {
    if (template === 'DETAILED_RECORDS') {
      return buildDetailedExportConfig(reports, true);
    }
    if (template === 'YEARLY_CHRONOLOGICAL') {
      return buildYearlySummaryExportConfig(byYearAndQualification);
    }
    return buildQualificationSummaryExportConfig(byQualification);
  };

  const handleExportExcel = () => {
    const { columns, rows } = getActiveExportPayload();
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
    const { columns, rows } = getActiveExportPayload();
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

  return (
    <div className="space-y-5">
      {/* Header & Export Buttons */}
      <div className="bg-white/90 border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Official Report Generator</span>
            <span>·</span>
            <span>{campusLabel}</span>
            <span>·</span>
            <span>{periodLabel}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            REPORT GENERATION & EXPORT
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              window.focus();
              window.print();
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            <span>Export to PDF</span>
          </button>
        </div>
      </div>

      {/* Report Preset Quick Selectors */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 no-print space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-800">
            1. Select Report Layout Format
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTemplate('STANDARD_SUMMARY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                template === 'STANDARD_SUMMARY'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {template === 'STANDARD_SUMMARY' && <Check className="w-3.5 h-3.5" />}
              <span>Summary by Qualification (Official Table)</span>
            </button>
            <button
              type="button"
              onClick={() => setTemplate('YEARLY_CHRONOLOGICAL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                template === 'YEARLY_CHRONOLOGICAL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {template === 'YEARLY_CHRONOLOGICAL' && <Check className="w-3.5 h-3.5" />}
              <span>Chronological Yearly Report ({periodLabel})</span>
            </button>
            <button
              type="button"
              onClick={() => setTemplate('DETAILED_RECORDS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                template === 'DETAILED_RECORDS'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {template === 'DETAILED_RECORDS' && <Check className="w-3.5 h-3.5" />}
              <span>Individual Campus & Year Records</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        user={user}
        campuses={campuses}
        qualifications={qualifications}
        availableYears={availableYears}
        filters={filters}
        onChange={onFilterChange}
        onReset={onResetFilters}
        showSearch={false}
      />

      {/* OFFICIAL PRINTABLE / EXPORTABLE DOCUMENT PREVIEW (SECTION 14) */}
      <div className="bg-white border border-slate-300 rounded-xl p-8 print-container">
        {/* Institutional Letterhead */}
        <div className="flex flex-col items-center justify-center text-center border-b-2 border-slate-900 pb-5 mb-5">
          <img
            src="/som-logo.jpg"
            alt="Sisters of Mary of Banneux, Inc. Logo"
            className="w-16 h-16 rounded-full object-cover border border-slate-200 shadow-xs mb-2"
          />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            SISTERS OF MARY OF BANNEUX, INC.
          </h2>
          <p className="text-sm font-bold text-blue-700 mt-1 tracking-wide">
            EMPLOYMENT REPORT
          </p>
        </div>

        {/* Official Report Metadata Block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-xs text-slate-800">
          <div className="space-y-1">
            <div>
              <span className="font-bold text-slate-900">Campus:</span> {campusLabel}
            </div>
            <div>
              <span className="font-bold text-slate-900">Period:</span> {periodLabel}
            </div>
          </div>
          <div className="sm:text-right space-y-1">
            <div>
              <span className="font-bold text-slate-900">Qualification Scope:</span>{' '}
              {qualificationLabel}
            </div>
            <div>
              <span className="font-bold text-slate-900">Date Generated:</span>{' '}
              {new Date().toLocaleDateString('en-PH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Official Table */}
        <div className="overflow-x-auto">
          {template === 'STANDARD_SUMMARY' && (
            <table className="w-full text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-900 text-white text-xs font-semibold">
                  <th className="py-3 px-4 border border-slate-700">Qualification</th>
                  <th className="py-3 px-4 text-right border border-slate-700">
                    Number of Enrolled
                  </th>
                  <th className="py-3 px-4 text-right border border-slate-700">Employed</th>
                  <th className="py-3 px-4 text-right border border-slate-700">
                    Number of Graduates
                  </th>
                  <th className="py-3 px-4 text-right border border-slate-700">
                    Number of Assessed
                  </th>
                  <th className="py-3 px-4 text-right border border-slate-700">
                    Number of Competent
                  </th>
                  <th className="py-3 px-4 text-right border border-slate-700">
                    Number of NYC
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {byQualification.map((item) => (
                  <tr key={item.qualificationId}>
                    <td className="py-2.5 px-4 border border-slate-200 font-semibold text-slate-900">
                      {item.qualificationCode} — {item.qualificationName}
                    </td>
                    <td className="py-2.5 px-4 text-right border border-slate-200 font-mono tabular-nums">
                      {item.numberEnrolled.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right border border-slate-200 font-mono tabular-nums font-semibold text-blue-700">
                      {item.employed.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right border border-slate-200 font-mono tabular-nums">
                      {item.numberGraduates.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right border border-slate-200 font-mono tabular-nums">
                      {item.numberAssessed.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right border border-slate-200 font-mono tabular-nums font-semibold text-emerald-700">
                      {item.numberCompetent.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right border border-slate-200 font-mono tabular-nums font-semibold text-amber-700">
                      {item.numberNYC.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-xs text-slate-900">
                  <td className="py-3.5 px-4 border border-slate-300">
                    TOTAL ({totals.recordCount} Records)
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums">
                    {totals.numberEnrolled.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums text-blue-800">
                    {totals.employed.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums">
                    {totals.numberGraduates.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums">
                    {totals.numberAssessed.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums text-emerald-800">
                    {totals.numberCompetent.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums text-amber-800">
                    {totals.numberNYC.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {template === 'YEARLY_CHRONOLOGICAL' && (
            <table className="w-full text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-900 text-white text-xs font-semibold">
                  <th className="py-3 px-4 border border-slate-700">Year</th>
                  <th className="py-3 px-4 border border-slate-700">Qualification</th>
                  <th className="py-3 px-4 text-right border border-slate-700">
                    Number of Enrolled
                  </th>
                  <th className="py-3 px-4 text-right border border-slate-700">Employed</th>
                  <th className="py-3 px-4 text-right border border-slate-700">
                    Number of Graduates
                  </th>
                  <th className="py-3 px-4 text-right border border-slate-700">
                    Number of Assessed
                  </th>
                  <th className="py-3 px-4 text-right border border-slate-700">
                    Number of Competent
                  </th>
                  <th className="py-3 px-4 text-right border border-slate-700">
                    Number of NYC
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {byYearAndQualification.map((item) => (
                  <tr key={`${item.year}_${item.qualificationId}`}>
                    <td className="py-2.5 px-4 border border-slate-200 font-mono font-bold text-slate-900">
                      {item.year}
                    </td>
                    <td className="py-2.5 px-4 border border-slate-200 font-semibold text-slate-900">
                      {item.qualificationCode} — {item.qualificationName}
                    </td>
                    <td className="py-2.5 px-4 text-right border border-slate-200 font-mono tabular-nums">
                      {item.numberEnrolled.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right border border-slate-200 font-mono tabular-nums font-semibold text-blue-700">
                      {item.employed.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right border border-slate-200 font-mono tabular-nums">
                      {item.numberGraduates.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right border border-slate-200 font-mono tabular-nums">
                      {item.numberAssessed.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right border border-slate-200 font-mono tabular-nums font-semibold text-emerald-700">
                      {item.numberCompetent.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right border border-slate-200 font-mono tabular-nums font-semibold text-amber-700">
                      {item.numberNYC.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-xs text-slate-900">
                  <td colSpan={2} className="py-3.5 px-4 border border-slate-300">
                    TOTAL ({totals.recordCount} Records)
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums">
                    {totals.numberEnrolled.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums text-blue-800">
                    {totals.employed.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums">
                    {totals.numberGraduates.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums">
                    {totals.numberAssessed.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums text-emerald-800">
                    {totals.numberCompetent.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums text-amber-800">
                    {totals.numberNYC.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {template === 'DETAILED_RECORDS' && (
            <table className="w-full text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-900 text-white text-xs font-semibold">
                  <th className="py-3 px-4 border border-slate-700">Campus</th>
                  <th className="py-3 px-3 border border-slate-700">Year</th>
                  <th className="py-3 px-4 border border-slate-700">Qualification</th>
                  <th className="py-3 px-4 text-right border border-slate-700">
                    Number of Enrolled
                  </th>
                  <th className="py-3 px-4 text-right border border-slate-700">Employed</th>
                  <th className="py-3 px-4 text-right border border-slate-700">
                    Number of Graduates
                  </th>
                  <th className="py-3 px-4 text-right border border-slate-700">
                    Number of Assessed
                  </th>
                  <th className="py-3 px-4 text-right border border-slate-700">
                    Number of Competent
                  </th>
                  <th className="py-3 px-4 text-right border border-slate-700">
                    Number of NYC
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 px-4 border border-slate-200 text-slate-800">
                      {r.campusName}
                    </td>
                    <td className="py-2 px-3 border border-slate-200 font-mono font-bold text-slate-900">
                      {r.year}
                    </td>
                    <td className="py-2 px-4 border border-slate-200 font-semibold text-slate-900">
                      {r.qualificationCode} — {r.qualificationName}
                    </td>
                    <td className="py-2 px-4 text-right border border-slate-200 font-mono tabular-nums">
                      {r.numberEnrolled.toLocaleString()}
                    </td>
                    <td className="py-2 px-4 text-right border border-slate-200 font-mono tabular-nums font-semibold text-blue-700">
                      {r.employed.toLocaleString()}
                    </td>
                    <td className="py-2 px-4 text-right border border-slate-200 font-mono tabular-nums">
                      {r.numberGraduates.toLocaleString()}
                    </td>
                    <td className="py-2 px-4 text-right border border-slate-200 font-mono tabular-nums">
                      {r.numberAssessed.toLocaleString()}
                    </td>
                    <td className="py-2 px-4 text-right border border-slate-200 font-mono tabular-nums font-semibold text-emerald-700">
                      {r.numberCompetent.toLocaleString()}
                    </td>
                    <td className="py-2 px-4 text-right border border-slate-200 font-mono tabular-nums font-semibold text-amber-700">
                      {r.numberNYC.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-xs text-slate-900">
                  <td colSpan={3} className="py-3.5 px-4 border border-slate-300">
                    TOTAL ({totals.recordCount} Records)
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums">
                    {totals.numberEnrolled.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums text-blue-800">
                    {totals.employed.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums">
                    {totals.numberGraduates.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums">
                    {totals.numberAssessed.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums text-emerald-800">
                    {totals.numberCompetent.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right border border-slate-300 font-mono tabular-nums text-amber-800">
                    {totals.numberNYC.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Official Signatory Footer */}
        <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-8 text-xs text-slate-700">
          <div>
            <p className="text-slate-500 mb-6">Prepared by:</p>
            <p className="font-bold text-slate-900 border-t border-slate-400 pt-1.5 inline-block min-w-[200px]">
              {user.fullName}
            </p>
            <p className="text-[11px] text-slate-500">
              {isAdmin ? 'System Administrator' : `Campus Coordinator — ${user.campusName}`}
            </p>
          </div>
          <div>
            <p className="text-slate-500 mb-6">Verified by:</p>
            <p className="font-bold text-slate-900 border-t border-slate-400 pt-1.5 inline-block min-w-[200px]">
              TVET & Assessment Coordinator
            </p>
            <p className="text-[11px] text-slate-500">Sisters of Mary Technical School</p>
          </div>
          <div>
            <p className="text-slate-500 mb-6">Noted by:</p>
            <p className="font-bold text-slate-900 border-t border-slate-400 pt-1.5 inline-block min-w-[200px]">
              School Directress / Principal
            </p>
            <p className="text-[11px] text-slate-500">Sisters of Mary of Banneux, Inc.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
