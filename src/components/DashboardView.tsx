import React from 'react';
import {
  Plus,
  FileSpreadsheet,
  FileText,
  Printer,
  Upload,
  ArrowRight,
  Building2,
} from 'lucide-react';
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
  buildQualificationSummaryExportConfig,
  exportReportToExcel,
  exportReportToPDF,
} from '../utils/exportUtils';

interface DashboardViewProps {
  user: User;
  campuses: Campus[];
  qualifications: Qualification[];
  availableYears: number[];
  filters: ReportFilterState;
  summary: AutomatedSummaryResponse | null;
  loading: boolean;
  onFilterChange: (updated: Partial<ReportFilterState>) => void;
  onResetFilters: () => void;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  campuses,
  qualifications,
  availableYears,
  filters,
  summary,
  loading,
  onFilterChange,
  onResetFilters,
  onOpenAddModal,
  onOpenImportModal,
  onNavigate,
}) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const totals = summary?.overallTotals || {
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

  const yearData = summary?.byYearAggregate || [];
  const qualData = summary?.byQualification || [];
  const campusData = summary?.byCampus || [];

  // Max values for chart scaling
  const maxYearEmployed = Math.max(1, ...yearData.map((y) => y.employed));
  const maxYearGraduates = Math.max(1, ...yearData.map((y) => y.numberGraduates));
  const maxQualEnrolled = Math.max(1, ...qualData.map((q) => q.numberEnrolled));
  const maxQualEmployed = Math.max(1, ...qualData.map((q) => Math.max(q.employed, q.numberGraduates)));

  const compPercent =
    totals.numberAssessed > 0
      ? Number(((totals.numberCompetent / totals.numberAssessed) * 100).toFixed(1))
      : 0;
  const nycPercent =
    totals.numberAssessed > 0
      ? Number(((totals.numberNYC / totals.numberAssessed) * 100).toFixed(1))
      : 0;

  const campusLabel =
    summary?.appliedFilters.campusLabel ||
    (isAdmin ? 'All Campuses' : user.campusName || 'Assigned Campus');
  const periodLabel = summary?.appliedFilters.periodLabel || 'All Available Years';
  const qualificationLabel =
    summary?.appliedFilters.qualificationLabel || 'All Qualifications';

  const handleExportDashboardExcel = () => {
    const { columns, rows } = buildQualificationSummaryExportConfig(qualData);
    exportReportToExcel(
      {
        reportTitle: 'EMPLOYMENT REPORT — DASHBOARD SUMMARY',
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

  const handleExportDashboardPDF = () => {
    const { columns, rows } = buildQualificationSummaryExportConfig(qualData);
    exportReportToPDF(
      {
        reportTitle: 'EMPLOYMENT REPORT — DASHBOARD SUMMARY',
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
    <div className="space-y-6">
      {/* Top Context Banner (Translucent Panel over Role/Campus Background) */}
      <div className="bg-white/90 border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3.5">
          <img
            src="/som-logo.jpg"
            alt="The Sisters of Mary Schools-Philippines"
            className="w-12 h-12 rounded-full object-cover bg-white p-0.5 border border-slate-200 shadow-xs shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-900">{campusLabel}</span>
              <span>·</span>
              <span>Period: {periodLabel}</span>
              <span>·</span>
              <span className="font-mono">{totals.recordCount} stored records</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Executive Employment & Qualification Dashboard
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenImportModal}
            className="px-3.5 py-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 text-blue-700" />
            <span>Import Historical Data</span>
          </button>
          <button
            type="button"
            onClick={() => {
              window.focus();
              window.print();
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={handleExportDashboardExcel}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export to Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportDashboardPDF}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export to PDF</span>
          </button>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employment Report</span>
          </button>
        </div>
      </div>

      {/* Interactive Filter Bar */}
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

      {/* 6 Required Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Total Enrolled */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Enrolled</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {loading ? '...' : totals.numberEnrolled.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            Across {totals.recordCount} report entries
          </p>
        </div>

        {/* 2. Total Graduates */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Graduates</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {loading ? '...' : totals.numberGraduates.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-600 mt-2 font-mono">
            {totals.graduationRate}% of Enrolled
          </p>
        </div>

        {/* 3. Total Assessed */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Assessed</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {loading ? '...' : totals.numberAssessed.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            {totals.numberEnrolled > 0
              ? ((totals.numberAssessed / totals.numberEnrolled) * 100).toFixed(1)
              : '0.0'}
            % assessment rate
          </p>
        </div>

        {/* 4. Total Competent */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Competent</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1.5">
            {loading ? '...' : totals.numberCompetent.toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-700 mt-2 font-mono">
            {totals.competencyRate}% of Assessed
          </p>
        </div>

        {/* 5. Total NYC */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total NYC</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1.5">
            {loading ? '...' : totals.numberNYC.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            Not Yet Competent ({nycPercent}%)
          </p>
        </div>

        {/* 6. Total Employed */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Employed</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-blue-700 mt-1.5">
            {loading ? '...' : totals.employed.toLocaleString()}
          </p>
          <p className="text-[11px] text-blue-700 mt-2 font-mono">
            {totals.employmentRate}% of Graduates
          </p>
        </div>
      </div>

      {/* Row 1 of Visualizations: Employment by Year & Graduates by Year */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Employment by Year */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Employment by Year</h2>
              <p className="text-xs text-slate-500">
                Chronological total of employed graduates per report year
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-blue-700">
              Total: {totals.employed.toLocaleString()}
            </span>
          </div>

          {yearData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-400">
              No employment records match the selected filters.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-52 flex items-end gap-1.5 pt-6 pb-2 px-1 border-b border-slate-200 overflow-x-auto">
                {yearData.map((item) => {
                  const heightPct = Math.max(8, Math.round((item.employed / maxYearEmployed) * 100));
                  return (
                    <div
                      key={item.year}
                      className="flex-1 min-w-[24px] h-full flex flex-col justify-end items-center group relative"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 bg-slate-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-10">
                        {item.year}: {item.employed.toLocaleString()} employed
                      </div>
                      <span className="text-[10px] font-mono text-slate-600 mb-1 hidden sm:block">
                        {item.employed}
                      </span>
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full max-w-[28px] bg-blue-600 group-hover:bg-blue-700 rounded-t transition-all"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 px-1 overflow-x-auto">
                {yearData.map((item) => (
                  <div
                    key={item.year}
                    className="flex-1 min-w-[24px] text-center text-[10px] font-mono text-slate-500"
                  >
                    {String(item.year).slice(-2)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Graduates by Year */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Graduates by Year</h2>
              <p className="text-xs text-slate-500">
                Chronological total of graduates produced per report year
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-800">
              Total: {totals.numberGraduates.toLocaleString()}
            </span>
          </div>

          {yearData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-400">
              No graduate records match the selected filters.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-52 flex items-end gap-1.5 pt-6 pb-2 px-1 border-b border-slate-200 overflow-x-auto">
                {yearData.map((item) => {
                  const heightPct = Math.max(
                    8,
                    Math.round((item.numberGraduates / maxYearGraduates) * 100)
                  );
                  return (
                    <div
                      key={item.year}
                      className="flex-1 min-w-[24px] h-full flex flex-col justify-end items-center group relative"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 bg-slate-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-10">
                        {item.year}: {item.numberGraduates.toLocaleString()} graduates
                      </div>
                      <span className="text-[10px] font-mono text-slate-600 mb-1 hidden sm:block">
                        {item.numberGraduates}
                      </span>
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full max-w-[28px] bg-slate-800 group-hover:bg-slate-900 rounded-t transition-all"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 px-1 overflow-x-auto">
                {yearData.map((item) => (
                  <div
                    key={item.year}
                    className="flex-1 min-w-[24px] text-center text-[10px] font-mono text-slate-500"
                  >
                    {String(item.year).slice(-2)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2 of Visualizations: Enrollment by Qualification, Employment by Qualification, Competent vs NYC */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 3: Enrollment by Qualification */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">Enrollment by Qualification</h2>
            <p className="text-xs text-slate-500">Total enrolled students per program</p>
          </div>

          {qualData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              No qualification records found.
            </div>
          ) : (
            <div className="space-y-3">
              {qualData.map((q) => {
                const widthPct = Math.max(4, Math.round((q.numberEnrolled / maxQualEnrolled) * 100));
                return (
                  <div key={q.qualificationId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate pr-2">
                        {q.qualificationCode} — {q.qualificationName}
                      </span>
                      <span className="font-mono font-semibold text-slate-900 shrink-0">
                        {q.numberEnrolled.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="h-full bg-slate-800 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 4: Employment by Qualification */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">Employment by Qualification</h2>
            <p className="text-xs text-slate-500">Employed count vs. Graduates per program</p>
          </div>

          {qualData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              No qualification records found.
            </div>
          ) : (
            <div className="space-y-3">
              {qualData.map((q) => {
                const empPct = Math.max(4, Math.round((q.employed / maxQualEmployed) * 100));
                return (
                  <div key={q.qualificationId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate pr-2">
                        {q.qualificationCode}
                      </span>
                      <span className="font-mono text-slate-600 shrink-0">
                        <strong className="text-blue-700">{q.employed.toLocaleString()}</strong> employed /{' '}
                        {q.numberGraduates.toLocaleString()} grads ({q.employmentRate}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${empPct}%` }}
                        className="h-full bg-blue-600 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 5: Competent vs NYC Breakdown */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Competent vs. NYC Assessment</h2>
            <p className="text-xs text-slate-500">
              Combined TESDA competency and NYC assessment results
            </p>

            {/* Proportional Bar & Metrics */}
            <div className="mt-5">
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className="text-2xl font-bold font-mono text-emerald-700">
                    {compPercent}%
                  </span>
                  <span className="text-xs text-slate-500 ml-1.5">Competency Rate</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-amber-700">
                    {nycPercent}%
                  </span>
                  <span className="text-xs text-slate-500 ml-1">NYC</span>
                </div>
              </div>

              <div className="w-full h-4 bg-slate-100 rounded-lg overflow-hidden flex">
                <div
                  style={{ width: `${compPercent}%` }}
                  className="h-full bg-emerald-600 transition-all"
                  title={`Competent: ${totals.numberCompetent.toLocaleString()}`}
                />
                <div
                  style={{ width: `${nycPercent}%` }}
                  className="h-full bg-amber-500 transition-all"
                  title={`NYC: ${totals.numberNYC.toLocaleString()}`}
                />
              </div>
            </div>

            <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-200 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total Students Assessed</span>
                <span className="font-mono font-bold text-slate-900">
                  {totals.numberAssessed.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-800 font-medium">Found Competent</span>
                <span className="font-mono font-bold text-emerald-700">
                  {totals.numberCompetent.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-800 font-medium">
                  Not Yet Competent (NYC)
                </span>
                <span className="font-mono font-bold text-amber-700">
                  {totals.numberNYC.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono">
              Competent: {totals.numberCompetent.toLocaleString()} · NYC: {totals.numberNYC.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('employment-report')}
              className="text-blue-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Campus Comparison Table (All 4 Campuses for Admin, Assigned Campus for Campus User) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">
              {isAdmin ? 'Multi-Campus Performance Summary (All 4 Campuses)' : `Assigned Campus Summary — ${user.campusName}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('summary')}
            className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Open Detailed Summary</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Campus</th>
                <th className="py-3 px-4 text-right">Records</th>
                <th className="py-3 px-4 text-right">Number of Enrolled</th>
                <th className="py-3 px-4 text-right">Employed</th>
                <th className="py-3 px-4 text-right">Number of Graduates</th>
                <th className="py-3 px-4 text-right">Number of Assessed</th>
                <th className="py-3 px-4 text-right">Number of Competent</th>
                <th className="py-3 px-4 text-right">Number of NYC</th>
                <th className="py-3 px-4 text-right">Competency Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {campusData.map((c) => (
                <tr key={c.campusId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <div>{c.campusName}</div>
                    <div className="text-[11px] font-normal text-slate-500">{c.location}</div>
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
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {c.competencyRate}%
                  </td>
                </tr>
              ))}
            </tbody>
            {isAdmin && campusData.length > 1 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs text-slate-900">
                  <td className="py-3 px-4">ALL CAMPUSES COMBINED TOTAL</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {campusData.reduce((s, c) => s + c.recordCount, 0)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {campusData.reduce((s, c) => s + c.numberEnrolled, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-blue-800">
                    {campusData.reduce((s, c) => s + c.employed, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {campusData.reduce((s, c) => s + c.numberGraduates, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {campusData.reduce((s, c) => s + c.numberAssessed, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-800">
                    {campusData.reduce((s, c) => s + c.numberCompetent, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-800">
                    {campusData.reduce((s, c) => s + c.numberNYC, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {totals.competencyRate}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
