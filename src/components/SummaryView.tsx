import React, { useState } from 'react';
import { Printer, FileSpreadsheet, FileText } from 'lucide-react';
import {
  AutomatedSummaryResponse,
  Campus,
  Qualification,
  ReportFilterState,
  User,
  UserRole,
} from '../types';
import { FilterBar } from './FilterBar';
import {
  buildCampusSummaryExportConfig,
  buildQualificationSummaryExportConfig,
  buildYearlyAggregateExportConfig,
  buildYearlySummaryExportConfig,
  exportReportToExcel,
  exportReportToPDF,
} from '../utils/exportUtils';

interface SummaryViewProps {
  user: User;
  campuses: Campus[];
  qualifications: Qualification[];
  availableYears: number[];
  filters: ReportFilterState;
  summary: AutomatedSummaryResponse | null;
  loading: boolean;
  onFilterChange: (updated: Partial<ReportFilterState>) => void;
  onResetFilters: () => void;
}

type SummaryTab = 'OVERALL' | 'BY_QUALIFICATION' | 'BY_YEAR' | 'BY_CAMPUS';

export const SummaryView: React.FC<SummaryViewProps> = ({
  user,
  campuses,
  qualifications,
  availableYears,
  filters,
  summary,
  loading,
  onFilterChange,
  onResetFilters,
}) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const [activeSubTab, setActiveSubTab] = useState<SummaryTab>('OVERALL');
  const [selectedQualFocus, setSelectedQualFocus] = useState<string>(
    qualifications[0]?.id || 'QUAL_BPP'
  );
  const [yearlyViewMode, setYearlyViewMode] = useState<'DETAILED' | 'AGGREGATED'>('DETAILED');

  const overallTotals = summary?.overallTotals || {
    numberEnrolled: 0,
    employed: 0,
    numberGraduates: 0,
    numberAssessed: 0,
    numberCompetent: 0,
    numberNYC: 0,
    recordCount: 0,
    employmentRate: 0,
    competencyRate: 0,
    graduationRate: 0,
  };

  const byQualification = summary?.byQualification || [];
  const byYearAndQualification = summary?.byYearAndQualification || [];
  const byYearAggregate = summary?.byYearAggregate || [];
  const byCampus = summary?.byCampus || [];

  const campusLabel =
    summary?.appliedFilters.campusLabel ||
    (isAdmin ? 'All Campuses' : user.campusName || 'Assigned Campus');
  const periodLabel = summary?.appliedFilters.periodLabel || 'All Available Years';
  const qualificationLabel =
    summary?.appliedFilters.qualificationLabel || 'All Qualifications';

  // Focused qualification data for Tab B
  const focusedQualItem =
    byQualification.find((q) => q.qualificationId === selectedQualFocus) ||
    byQualification[0] ||
    null;

  const focusedQualYearly = byYearAndQualification.filter(
    (item) => item.qualificationId === (focusedQualItem?.qualificationId || selectedQualFocus)
  );

  const getActiveSummaryExportPayload = () => {
    if (activeSubTab === 'BY_YEAR') {
      if (yearlyViewMode === 'AGGREGATED') {
        const { columns, rows } = buildYearlyAggregateExportConfig(byYearAggregate);
        return {
          title: 'EMPLOYMENT REPORT — YEARLY TOTALS SUMMARY',
          columns,
          rows,
          totals: overallTotals,
          qualLabel: qualificationLabel,
        };
      }
      const { columns, rows } = buildYearlySummaryExportConfig(byYearAndQualification);
      return {
        title: 'EMPLOYMENT REPORT — YEARLY SUMMARY',
        columns,
        rows,
        totals: overallTotals,
        qualLabel: qualificationLabel,
      };
    }

    if (activeSubTab === 'BY_QUALIFICATION' && focusedQualItem) {
      const { columns, rows } = buildYearlySummaryExportConfig(focusedQualYearly);
      return {
        title: `EMPLOYMENT REPORT — ${focusedQualItem.qualificationCode} SUMMARY`,
        columns,
        rows,
        totals: focusedQualItem,
        qualLabel: `${focusedQualItem.qualificationCode} — ${focusedQualItem.qualificationName}`,
      };
    }

    if (activeSubTab === 'BY_CAMPUS') {
      const { columns, rows } = buildCampusSummaryExportConfig(byCampus);
      const campusCombinedTotals = {
        ...overallTotals,
        numberEnrolled: byCampus.reduce((s, c) => s + c.numberEnrolled, 0),
        employed: byCampus.reduce((s, c) => s + c.employed, 0),
        numberGraduates: byCampus.reduce((s, c) => s + c.numberGraduates, 0),
        numberAssessed: byCampus.reduce((s, c) => s + c.numberAssessed, 0),
        numberCompetent: byCampus.reduce((s, c) => s + c.numberCompetent, 0),
        numberNYC: byCampus.reduce((s, c) => s + c.numberNYC, 0),
        recordCount: byCampus.reduce((s, c) => s + c.recordCount, 0),
      };
      return {
        title: 'EMPLOYMENT REPORT — SUMMARY BY CAMPUS',
        columns,
        rows,
        totals: campusCombinedTotals,
        qualLabel: qualificationLabel,
      };
    }

    const { columns, rows } = buildQualificationSummaryExportConfig(byQualification);
    return {
      title: 'EMPLOYMENT REPORT — OVERALL SUMMARY',
      columns,
      rows,
      totals: overallTotals,
      qualLabel: qualificationLabel,
    };
  };

  const handleExportExcel = () => {
    const payload = getActiveSummaryExportPayload();
    exportReportToExcel(
      {
        reportTitle: payload.title,
        campusLabel,
        periodLabel,
        qualificationLabel: payload.qualLabel,
        generatedBy: user.fullName,
      },
      payload.columns,
      payload.rows,
      payload.totals
    );
  };

  const handleExportPDF = () => {
    const payload = getActiveSummaryExportPayload();
    exportReportToPDF(
      {
        reportTitle: payload.title,
        campusLabel,
        periodLabel,
        qualificationLabel: payload.qualLabel,
        generatedBy: user.fullName,
      },
      payload.columns,
      payload.rows,
      payload.totals
    );
  };

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Export Actions */}
      <div className="bg-white/90 border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">{campusLabel}</span>
            <span>·</span>
            <span>Period: {periodLabel}</span>
            <span>·</span>
            <span>Automatically Calculated Totals</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            AUTOMATED SUMMARY
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Summary</span>
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

      {/* Dynamic Summary Period Totals (Updates automatically for Single Year, Custom Year Range, or All Years) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Dynamic Summary Totals — Period: {periodLabel}
            </h2>
            <p className="text-xs text-slate-500">
              Campus: {campusLabel} · Qualification: {qualificationLabel} · {overallTotals.recordCount} matching record(s)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 no-print">
            <button
              type="button"
              onClick={() => onFilterChange({ yearMode: 'SINGLE', year: 'ALL' })}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filters.yearMode === 'SINGLE' && filters.year === 'ALL'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Years
            </button>
            <button
              type="button"
              onClick={() =>
                onFilterChange({
                  yearMode: 'SINGLE',
                  year: filters.year !== 'ALL' ? filters.year : String(new Date().getFullYear()),
                })
              }
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filters.yearMode === 'SINGLE' && filters.year !== 'ALL'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Single Year ({filters.year !== 'ALL' ? filters.year : new Date().getFullYear()})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ yearMode: 'RANGE' })}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filters.yearMode === 'RANGE'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Custom Year Range ({filters.startYear}–{filters.endYear})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs text-slate-500 block">Total Number of Enrolled</span>
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
              {loading ? '...' : overallTotals.numberEnrolled.toLocaleString()}
            </span>
          </div>
          <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg">
            <span className="text-xs text-blue-700 block">Total Employed</span>
            <span className="text-xl font-bold font-mono tabular-nums text-blue-800 mt-1 block">
              {loading ? '...' : overallTotals.employed.toLocaleString()}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs text-slate-500 block">Total Graduates</span>
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
              {loading ? '...' : overallTotals.numberGraduates.toLocaleString()}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs text-slate-500 block">Total Assessed</span>
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
              {loading ? '...' : overallTotals.numberAssessed.toLocaleString()}
            </span>
          </div>
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-lg">
            <span className="text-xs text-emerald-700 block">Total Competent</span>
            <span className="text-xl font-bold font-mono tabular-nums text-emerald-800 mt-1 block">
              {loading ? '...' : overallTotals.numberCompetent.toLocaleString()}
            </span>
          </div>
          <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-lg">
            <span className="text-xs text-amber-800 block">Total NYC</span>
            <span className="text-xl font-bold font-mono tabular-nums text-amber-800 mt-1 block">
              {loading ? '...' : overallTotals.numberNYC.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Summary Mode Selector (A, B, C, D) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-2 no-print">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('OVERALL')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === 'OVERALL'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            A. Overall Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('BY_QUALIFICATION')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === 'BY_QUALIFICATION'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            B. Summary by Qualification
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('BY_YEAR')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === 'BY_YEAR'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            C. Summary by Year (Chronological)
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('BY_CAMPUS')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === 'BY_CAMPUS'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            D. Summary by Campus
          </button>
        </div>

        <span className="px-3 py-1.5 text-xs font-mono font-semibold text-blue-700 bg-blue-50 rounded-lg whitespace-nowrap">
          Selected Period: {periodLabel}
        </span>
      </div>

      {/* ====================================================================
          A. OVERALL SUMMARY (Combined Totals by Qualification across selected years)
         ==================================================================== */}
      {activeSubTab === 'OVERALL' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print-container">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/60">
            <div className="flex flex-col items-center justify-center text-center space-y-1">
              <img
                src="/som-logo.jpg"
                alt="Sisters of Mary of Banneux, Inc. Logo"
                className="w-14 h-14 rounded-full object-cover border border-slate-200 shadow-xs mb-1"
              />
              <h2 className="text-base font-bold text-slate-900">
                SISTERS OF MARY OF BANNEUX, INC.
              </h2>
              <p className="text-xs font-bold text-blue-700">
                OVERALL EMPLOYMENT REPORT SUMMARY
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700">
              <div>
                <span className="font-semibold text-slate-900">Campus:</span> {campusLabel}
              </div>
              <div>
                <span className="font-semibold text-slate-900">Period:</span> {periodLabel}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-semibold">
                  <th className="py-3 px-4">Qualification</th>
                  <th className="py-3 px-4 text-right">Number of Enrolled</th>
                  <th className="py-3 px-4 text-right">Employed</th>
                  <th className="py-3 px-4 text-right">Number of Graduates</th>
                  <th className="py-3 px-4 text-right">Number of Assessed</th>
                  <th className="py-3 px-4 text-right">Number of Competent</th>
                  <th className="py-3 px-4 text-right">Number of NYC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      Calculating overall summary from stored records...
                    </td>
                  </tr>
                ) : byQualification.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      No records found for the selected filter period.
                    </td>
                  </tr>
                ) : (
                  byQualification.map((item) => (
                    <tr key={item.qualificationId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        {item.qualificationCode &&
                        item.qualificationName &&
                        item.qualificationCode !== item.qualificationName ? (
                          <>
                            <span className="font-bold text-slate-900">{item.qualificationCode}</span>
                            <span className="text-slate-400 mx-1.5">—</span>
                            <span className="text-slate-700">{item.qualificationName}</span>
                          </>
                        ) : (
                          <span className="font-bold text-slate-900">
                            {item.qualificationName || item.qualificationCode}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                        {item.numberEnrolled.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-blue-700">
                        {item.employed.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        {item.numberGraduates.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        {item.numberAssessed.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                        {item.numberCompetent.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-amber-700">
                        {item.numberNYC.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {byQualification.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-xs text-slate-900">
                    <td className="py-3.5 px-4">
                      OVERALL COMBINED TOTAL ({overallTotals.recordCount} Records)
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {overallTotals.numberEnrolled.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-blue-800">
                      {overallTotals.employed.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {overallTotals.numberGraduates.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {overallTotals.numberAssessed.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-800">
                      {overallTotals.numberCompetent.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-amber-800">
                      {overallTotals.numberNYC.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ====================================================================
          B. SUMMARY BY QUALIFICATION (Select Qualification -> Auto Totals)
         ==================================================================== */}
      {activeSubTab === 'BY_QUALIFICATION' && (
        <div className="space-y-5">
          {/* Qualification Selector Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Select Qualification to Inspect Automated Totals
              </h3>
              <p className="text-xs text-slate-500">
                Automatically sums all records for the selected qualification across {periodLabel} ({campusLabel}).
              </p>
            </div>
            <select
              value={focusedQualItem?.qualificationId || selectedQualFocus}
              onChange={(e) => setSelectedQualFocus(e.target.value)}
              className="px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 min-w-[280px] focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {qualifications.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.code} — {q.qualificationName}
                </option>
              ))}
            </select>
          </div>

          {focusedQualItem ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print-container">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-mono text-blue-700 font-semibold">
                    Qualification Summary · {periodLabel}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                    {focusedQualItem.qualificationCode} — {focusedQualItem.qualificationName}
                  </h2>
                </div>
                <div className="text-xs text-slate-600 font-mono">
                  Campus: {campusLabel} · {focusedQualItem.recordCount} Records Included
                </div>
              </div>

              {/* 6 Automatically Calculated Totals Cards for Selected Qualification */}
              <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 border-b border-slate-200">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-500 block">Total Enrolled</span>
                  <span className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                    {focusedQualItem.numberEnrolled.toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-lg">
                  <span className="text-xs text-blue-700 block">Total Employed</span>
                  <span className="text-xl font-bold font-mono tabular-nums text-blue-800 mt-1 block">
                    {focusedQualItem.employed.toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-500 block">Total Graduates</span>
                  <span className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                    {focusedQualItem.numberGraduates.toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-500 block">Total Assessed</span>
                  <span className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                    {focusedQualItem.numberAssessed.toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                  <span className="text-xs text-emerald-700 block">Total Competent</span>
                  <span className="text-xl font-bold font-mono tabular-nums text-emerald-800 mt-1 block">
                    {focusedQualItem.numberCompetent.toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-lg">
                  <span className="text-xs text-amber-800 block">Total NYC</span>
                  <span className="text-xl font-bold font-mono tabular-nums text-amber-800 mt-1 block">
                    {focusedQualItem.numberNYC.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Chronological Yearly Breakdown for this Qualification */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] font-semibold">
                      <th className="py-3 px-4">Year</th>
                      <th className="py-3 px-4">Qualification</th>
                      <th className="py-3 px-4 text-right">Number of Enrolled</th>
                      <th className="py-3 px-4 text-right">Employed</th>
                      <th className="py-3 px-4 text-right">Number of Graduates</th>
                      <th className="py-3 px-4 text-right">Number of Assessed</th>
                      <th className="py-3 px-4 text-right">Number of Competent</th>
                      <th className="py-3 px-4 text-right">Number of NYC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {focusedQualYearly.map((row) => (
                      <tr key={`${row.year}_${row.qualificationId}`} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono tabular-nums font-bold text-slate-900">
                          {row.year}
                        </td>
                        <td className="py-2.5 px-4 text-slate-800">
                          {row.qualificationCode} — {row.qualificationName}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                          {row.numberEnrolled.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-blue-700">
                          {row.employed.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                          {row.numberGraduates.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                          {row.numberAssessed.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                          {row.numberCompetent.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-amber-700">
                          {row.numberNYC.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-xs text-slate-900">
                      <td colSpan={2} className="py-3 px-4">
                        TOTAL FOR {focusedQualItem.qualificationCode}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {focusedQualItem.numberEnrolled.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-blue-800">
                        {focusedQualItem.employed.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {focusedQualItem.numberGraduates.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {focusedQualItem.numberAssessed.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-800">
                        {focusedQualItem.numberCompetent.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-800">
                        {focusedQualItem.numberNYC.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500">
              No records found for this qualification under the current filters.
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          C. SUMMARY BY YEAR (Chronological 2004 -> 2026)
         ==================================================================== */}
      {activeSubTab === 'BY_YEAR' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print-container">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                CHRONOLOGICAL YEARLY SUMMARY ({periodLabel})
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Campus: {campusLabel} · Automatically ordered chronologically from earliest to latest year
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg no-print">
              <button
                type="button"
                onClick={() => setYearlyViewMode('DETAILED')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  yearlyViewMode === 'DETAILED'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Year & Qualification
              </button>
              <button
                type="button"
                onClick={() => setYearlyViewMode('AGGREGATED')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  yearlyViewMode === 'AGGREGATED'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Yearly Totals Only
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {yearlyViewMode === 'DETAILED' ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-semibold">
                    <th className="py-3 px-4">Year</th>
                    <th className="py-3 px-4">Qualification</th>
                    <th className="py-3 px-4 text-right">Enrolled</th>
                    <th className="py-3 px-4 text-right">Employed</th>
                    <th className="py-3 px-4 text-right">Graduates</th>
                    <th className="py-3 px-4 text-right">Assessed</th>
                    <th className="py-3 px-4 text-right">Competent</th>
                    <th className="py-3 px-4 text-right">NYC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {byYearAndQualification.map((item) => (
                    <tr
                      key={`${item.year}_${item.qualificationId}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono tabular-nums font-bold text-slate-900">
                        {item.year}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-slate-900">
                          {item.qualificationCode}
                        </span>
                        <span className="text-slate-400 mx-1.5">—</span>
                        <span className="text-slate-600">{item.qualificationName}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">
                        {item.numberEnrolled.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-blue-700">
                        {item.employed.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-800">
                        {item.numberGraduates.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-800">
                        {item.numberAssessed.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                        {item.numberCompetent.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-amber-700">
                        {item.numberNYC.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-xs text-slate-900">
                    <td colSpan={2} className="py-3.5 px-4">
                      CHRONOLOGICAL GRAND TOTAL
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {overallTotals.numberEnrolled.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-blue-800">
                      {overallTotals.employed.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {overallTotals.numberGraduates.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {overallTotals.numberAssessed.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-800">
                      {overallTotals.numberCompetent.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-amber-800">
                      {overallTotals.numberNYC.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-semibold">
                    <th className="py-3 px-4">Year</th>
                    <th className="py-3 px-4 text-right">Records</th>
                    <th className="py-3 px-4 text-right">Enrolled</th>
                    <th className="py-3 px-4 text-right">Employed</th>
                    <th className="py-3 px-4 text-right">Graduates</th>
                    <th className="py-3 px-4 text-right">Assessed</th>
                    <th className="py-3 px-4 text-right">Competent</th>
                    <th className="py-3 px-4 text-right">NYC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {byYearAggregate.map((item) => (
                    <tr key={item.year} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-mono tabular-nums font-bold text-slate-900">
                        {item.year}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600">
                        {item.recordCount}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                        {item.numberEnrolled.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-blue-700">
                        {item.employed.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-800">
                        {item.numberGraduates.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-800">
                        {item.numberAssessed.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                        {item.numberCompetent.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-amber-700">
                        {item.numberNYC.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-xs text-slate-900">
                    <td className="py-3.5 px-4">ALL YEARS TOTAL</td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {overallTotals.recordCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {overallTotals.numberEnrolled.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-blue-800">
                      {overallTotals.employed.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {overallTotals.numberGraduates.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {overallTotals.numberAssessed.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-800">
                      {overallTotals.numberCompetent.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-amber-800">
                      {overallTotals.numberNYC.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          D. SUMMARY BY CAMPUS
         ==================================================================== */}
      {activeSubTab === 'BY_CAMPUS' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print-container">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/60">
            <h2 className="text-base font-bold text-slate-900">
              {isAdmin
                ? 'MULTI-CAMPUS SUMMARY (ALL FOUR CAMPUSES)'
                : `CAMPUS SUMMARY — ${user.campusName}`}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Period: {periodLabel} · Qualification: {qualificationLabel}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-semibold">
                  <th className="py-3 px-4">Campus</th>
                  <th className="py-3 px-4 text-right">Records</th>
                  <th className="py-3 px-4 text-right">Number of Enrolled</th>
                  <th className="py-3 px-4 text-right">Employed</th>
                  <th className="py-3 px-4 text-right">Number of Graduates</th>
                  <th className="py-3 px-4 text-right">Number of Assessed</th>
                  <th className="py-3 px-4 text-right">Number of Competent</th>
                  <th className="py-3 px-4 text-right">Number of NYC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {byCampus.map((c) => (
                  <tr key={c.campusId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.campusName}</div>
                      <div className="text-[11px] text-slate-500">{c.location}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {c.recordCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                      {c.numberEnrolled.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-blue-700">
                      {c.employed.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                      {c.numberGraduates.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                      {c.numberAssessed.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                      {c.numberCompetent.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-amber-700">
                      {c.numberNYC.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              {isAdmin && byCampus.length > 1 && (
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-xs text-slate-900">
                    <td className="py-3.5 px-4">ALL CAMPUSES COMBINED TOTAL</td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {byCampus.reduce((s, c) => s + c.recordCount, 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {byCampus.reduce((s, c) => s + c.numberEnrolled, 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-blue-800">
                      {byCampus.reduce((s, c) => s + c.employed, 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {byCampus.reduce((s, c) => s + c.numberGraduates, 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {byCampus.reduce((s, c) => s + c.numberAssessed, 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-800">
                      {byCampus.reduce((s, c) => s + c.numberCompetent, 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-amber-800">
                      {byCampus.reduce((s, c) => s + c.numberNYC, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
