import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Download,
  Trash2,
} from 'lucide-react';
import { Campus, HistoricalImportRow, User, UserRole } from '../types';
import { downloadImportTemplate } from '../utils/exportUtils';

interface ImportDataModalProps {
  isOpen: boolean;
  user: User;
  campuses: Campus[];
  onClose: () => void;
  onConfirmImport: (records: HistoricalImportRow[]) => Promise<void>;
}

function findColumnValue(row: Record<string, any>, aliases: string[]): any {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const target = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchedKey = keys.find(
      (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === target
    );
    if (matchedKey !== undefined && row[matchedKey] !== undefined && row[matchedKey] !== '') {
      return row[matchedKey];
    }
  }
  return undefined;
}

function parseNonNegativeInt(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = Number(cleaned);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.round(num));
}

export const ImportDataModal: React.FC<ImportDataModalProps> = ({
  isOpen,
  user,
  campuses,
  onClose,
  onConfirmImport,
}) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<HistoricalImportRow[]>([]);
  const [defaultYearFallback, setDefaultYearFallback] = useState<number>(2014);
  const [defaultCampusFallback, setDefaultCampusFallback] = useState<string>(
    isAdmin ? campuses[0]?.campusName || 'Sisters of Mary Biga' : user.campusName || 'Sisters of Mary Biga'
  );
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const resolveCampusName = (rawCampus: any): string => {
    if (!isAdmin) {
      return user.campusName || user.campusId || 'Sisters of Mary Biga';
    }
    if (!rawCampus || !String(rawCampus).trim()) {
      return defaultCampusFallback;
    }
    const text = String(rawCampus).trim().toLowerCase();
    if (text.includes('biga')) return 'Sisters of Mary Biga';
    if (text.includes('minglanilla') || text.includes('minglanila')) return 'Sisters of Mary Minglanilla';
    if (text.includes('talisay')) return 'Sisters of Mary Talisay';
    if (text.includes('adlas')) return 'Sisters of Mary Adlas';
    return String(rawCampus).trim();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setError('The uploaded file contains no sheets.');
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (rawJson.length === 0) {
        setError('No rows found in the uploaded file. Please check the file headers and rows.');
        return;
      }

      const parsed: HistoricalImportRow[] = [];

      for (const row of rawJson) {
        const rawQual = findColumnValue(row, [
          'Qualification',
          'Qualification Name',
          'Course',
          'Program',
          'Qualification Code',
        ]);

        // Skip summary/total rows or empty rows
        if (!rawQual || String(rawQual).trim() === '') {
          continue;
        }
        const qualText = String(rawQual).trim();
        if (qualText.toUpperCase().startsWith('TOTAL') || qualText.toUpperCase().startsWith('OVERALL')) {
          continue;
        }

        const rawCampus = findColumnValue(row, ['Campus', 'Campus Name', 'School']);
        const rawYear = findColumnValue(row, ['Year', 'Report Year', 'School Year', 'Batch Year']);

        let parsedYear = Number(String(rawYear ?? '').replace(/[^0-9]/g, '').slice(0, 4));
        if (!parsedYear || Number.isNaN(parsedYear) || parsedYear < 1900) {
          parsedYear = defaultYearFallback;
        }

        const numberEnrolled = parseNonNegativeInt(
          findColumnValue(row, ['Number of Enrolled', 'Enrolled', 'No. of Enrolled', 'NumberEnrolled', 'Total Enrolled'])
        );
        const employed = parseNonNegativeInt(
          findColumnValue(row, ['Employed', 'Number of Employed', 'No. of Employed', 'Total Employed'])
        );
        const numberGraduates = parseNonNegativeInt(
          findColumnValue(row, ['Number of Graduates', 'Graduates', 'No. of Graduates', 'NumberGraduates', 'Total Graduates'])
        );
        const numberAssessed = parseNonNegativeInt(
          findColumnValue(row, ['Number of Assessed', 'Assessed', 'No. of Assessed', 'NumberAssessed', 'Total Assessed'])
        );
        const numberCompetent = parseNonNegativeInt(
          findColumnValue(row, ['Number of Competent', 'Competent', 'No. of Competent', 'NumberCompetent', 'Total Competent'])
        );
        // Preserve original Number of NYC exactly as encoded in the historical file (do NOT auto-recalculate)
        const numberNYC = parseNonNegativeInt(
          findColumnValue(row, ['Number of NYC', 'NYC', 'No. of NYC', 'NumberNYC', 'Not Yet Competent'])
        );

        parsed.push({
          campus: resolveCampusName(rawCampus),
          year: parsedYear,
          qualification: qualText,
          numberEnrolled,
          employed,
          numberGraduates,
          numberAssessed,
          numberCompetent,
          numberNYC,
        });
      }

      if (parsed.length === 0) {
        setError(
          'Could not find valid rows with a "Qualification" column. Please ensure your Excel (.xlsx) or CSV (.csv) file includes columns: Campus, Year, Qualification, Number of Enrolled, Employed, Number of Graduates, Number of Assessed, Number of Competent, Number of NYC.'
        );
        return;
      }

      setPreviewRows(parsed);
    } catch (err: any) {
      setError(err.message || 'Failed to parse the uploaded Excel/CSV file.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePreviewRow = (idx: number) => {
    setPreviewRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirm = async () => {
    if (previewRows.length === 0) {
      setError('No records to import.');
      return;
    }
    setError(null);
    setImporting(true);
    try {
      await onConfirmImport(previewRows);
      setPreviewRows([]);
      setFileName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import historical records.');
    } finally {
      setImporting(false);
    }
  };

  const previewTotals = previewRows.reduce(
    (acc, r) => ({
      numberEnrolled: acc.numberEnrolled + r.numberEnrolled,
      employed: acc.employed + r.employed,
      numberGraduates: acc.numberGraduates + r.numberGraduates,
      numberAssessed: acc.numberAssessed + r.numberAssessed,
      numberCompetent: acc.numberCompetent + r.numberCompetent,
      numberNYC: acc.numberNYC + r.numberNYC,
    }),
    {
      numberEnrolled: 0,
      employed: 0,
      numberGraduates: 0,
      numberAssessed: 0,
      numberCompetent: 0,
      numberNYC: 0,
    }
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-5xl w-full overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight">
              Import Historical / Existing Employment Report Data (.xlsx / .csv)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Upload historical records (e.g., 2012, 2013, 2014, or any year). Original values including Number of NYC are preserved without modification.
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

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload & Template Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="lg:col-span-7 space-y-2">
              <div className="text-xs font-bold text-slate-900">
                Supported Columns (Excel .xlsx / CSV .csv):
              </div>
              <p className="text-xs text-slate-600">
                <strong>Campus</strong> · <strong>Year</strong> · <strong>Qualification</strong> ·{' '}
                <strong>Number of Enrolled</strong> · <strong>Employed</strong> ·{' '}
                <strong>Number of Graduates</strong> · <strong>Number of Assessed</strong> ·{' '}
                <strong>Number of Competent</strong> · <strong>Number of NYC</strong>
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {isAdmin && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-slate-700">Default Campus (if omitted in file):</span>
                    <select
                      value={defaultCampusFallback}
                      onChange={(e) => setDefaultCampusFallback(e.target.value)}
                      className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900"
                    >
                      {campuses.map((c) => (
                        <option key={c.id} value={c.campusName}>
                          {c.campusName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-slate-700">Default Year (if omitted in file):</span>
                  <input
                    type="number"
                    min={1900}
                    step={1}
                    value={defaultYearFallback}
                    onChange={(e) => setDefaultYearFallback(Number(e.target.value) || new Date().getFullYear())}
                    className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadImportTemplate(
                    'xlsx',
                    isAdmin ? defaultCampusFallback : user.campusName || 'Sisters of Mary Biga'
                  )
                }
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Template (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadImportTemplate(
                    'csv',
                    isAdmin ? defaultCampusFallback : user.campusName || 'Sisters of Mary Biga'
                  )
                }
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-700" />
                <span>Template (.csv)</span>
              </button>

              <label className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Select Excel (.xlsx) or CSV (.csv)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Preview Section Before Importing */}
          {previewRows.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-xs text-emerald-900">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    Previewing {previewRows.length} records from {fileName || 'uploaded file'}. Please verify below and click &ldquo;Confirm &amp; Save Import&rdquo;.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewRows([]);
                    setFileName('');
                  }}
                  className="text-xs font-semibold text-red-700 hover:underline cursor-pointer"
                >
                  Clear Preview
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-900 text-white text-[11px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Campus</th>
                      <th className="py-2.5 px-3">Year</th>
                      <th className="py-2.5 px-3">Qualification</th>
                      <th className="py-2.5 px-3 text-right">Number of Enrolled</th>
                      <th className="py-2.5 px-3 text-right">Employed</th>
                      <th className="py-2.5 px-3 text-right">Number of Graduates</th>
                      <th className="py-2.5 px-3 text-right">Number of Assessed</th>
                      <th className="py-2.5 px-3 text-right">Number of Competent</th>
                      <th className="py-2.5 px-3 text-right">Number of NYC</th>
                      <th className="py-2.5 px-3 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {previewRows.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500">{index + 1}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{row.campus}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{row.year}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{row.qualification}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{row.numberEnrolled.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold text-blue-700">
                          {row.employed.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">{row.numberGraduates.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{row.numberAssessed.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold text-emerald-700">
                          {row.numberCompetent.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold text-amber-800">
                          {row.numberNYC.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemovePreviewRow(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="Remove row from import"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-xs text-slate-900">
                      <td colSpan={4} className="py-2.5 px-3">
                        PREVIEW TOTAL ({previewRows.length} Records)
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {previewTotals.numberEnrolled.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-blue-800">
                        {previewTotals.employed.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {previewTotals.numberGraduates.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {previewTotals.numberAssessed.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-emerald-800">
                        {previewTotals.numberCompetent.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-amber-800">
                        {previewTotals.numberNYC.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800">
                No File Selected Yet
              </p>
              <p className="text-xs text-slate-500 max-w-lg mx-auto">
                Click &ldquo;Select Excel (.xlsx) or CSV (.csv)&rdquo; above to upload historical or multi-record Employment Report spreadsheets (such as 2012, 2013, 2014, or recent batches). A full preview will be shown here before saving.
              </p>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={importing || previewRows.length === 0}
              onClick={handleConfirm}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-500 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {importing
                  ? 'Importing Records...'
                  : `Confirm & Save Import (${previewRows.length} Records)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
