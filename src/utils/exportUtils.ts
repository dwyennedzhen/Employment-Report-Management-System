import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { SOM_LOGO_DATA_URI } from './logoData';
import {
  CampusSummaryItem,
  EmploymentReport,
  QualificationSummaryItem,
  ReportTotals,
  YearlyAggregateItem,
  YearlyQualificationSummaryItem,
} from '../types';

export interface ExportHeaderMetadata {
  reportTitle?: string;
  campusLabel: string;
  periodLabel: string;
  qualificationLabel?: string;
  generatedBy?: string;
}

function sanitizeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
}

function escapeXml(unsafe: string | number): string {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates and downloads an official Excel (.xls SpreadsheetML) file with Times New Roman typography,
 * official header, table borders, right-aligned numeric columns, and automatically calculated totals row.
 */
export function exportReportToExcel(
  metadata: ExportHeaderMetadata,
  columns: { header: string; key: string; isNumeric?: boolean }[],
  rows: Record<string, string | number>[],
  totals: ReportTotals
): void {
  const title = metadata.reportTitle || 'EMPLOYMENT REPORT';
  const timestamp = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const colCount = columns.length;

  let xmlRows = '';

  // Official Header Block
  xmlRows += `
    <Row ss:Height="24">
      <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="InstitutionHeader">
        <Data ss:Type="String">SISTERS OF MARY OF BANNEUX, INC.</Data>
      </Cell>
    </Row>
    <Row ss:Height="20">
      <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="ReportTitle">
        <Data ss:Type="String">${escapeXml(title)}</Data>
      </Cell>
    </Row>
    <Row ss:Height="10"><Cell ss:MergeAcross="${colCount - 1}"/></Row>
    <Row ss:Height="18">
      <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="MetaLine">
        <Data ss:Type="String">Campus: ${escapeXml(metadata.campusLabel)}</Data>
      </Cell>
    </Row>
    <Row ss:Height="18">
      <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="MetaLine">
        <Data ss:Type="String">Year / Period: ${escapeXml(metadata.periodLabel)}</Data>
      </Cell>
    </Row>
    <Row ss:Height="18">
      <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="MetaLine">
        <Data ss:Type="String">Qualification: ${escapeXml(metadata.qualificationLabel || 'All Qualifications')} | Date Generated: ${escapeXml(timestamp)}</Data>
      </Cell>
    </Row>
    <Row ss:Height="10"><Cell ss:MergeAcross="${colCount - 1}"/></Row>
  `;

  // Table Header Row
  xmlRows += `<Row ss:Height="22">`;
  for (const col of columns) {
    xmlRows += `<Cell ss:StyleID="${col.isNumeric ? 'TableHeaderNum' : 'TableHeaderText'}"><Data ss:Type="String">${escapeXml(col.header)}</Data></Cell>`;
  }
  xmlRows += `</Row>`;

  // Data Rows
  for (const row of rows) {
    xmlRows += `<Row ss:Height="19">`;
    for (const col of columns) {
      const val = row[col.key] ?? '';
      if (col.isNumeric && typeof val === 'number') {
        xmlRows += `<Cell ss:StyleID="DataCellNum"><Data ss:Type="Number">${val}</Data></Cell>`;
      } else {
        xmlRows += `<Cell ss:StyleID="DataCellText"><Data ss:Type="String">${escapeXml(val)}</Data></Cell>`;
      }
    }
    xmlRows += `</Row>`;
  }

  // Totals Row
  const totalMap: Record<string, number> = {
    numberEnrolled: totals.numberEnrolled,
    employed: totals.employed,
    numberGraduates: totals.numberGraduates,
    numberAssessed: totals.numberAssessed,
    numberCompetent: totals.numberCompetent,
    numberNYC: totals.numberNYC,
  };

  xmlRows += `<Row ss:Height="22">`;
  columns.forEach((col, idx) => {
    if (idx === 0) {
      xmlRows += `<Cell ss:StyleID="TotalCellText"><Data ss:Type="String">TOTAL (${totals.recordCount} Records)</Data></Cell>`;
    } else if (totalMap[col.key] !== undefined) {
      xmlRows += `<Cell ss:StyleID="TotalCellNum"><Data ss:Type="Number">${totalMap[col.key]}</Data></Cell>`;
    } else {
      xmlRows += `<Cell ss:StyleID="TotalCellText"><Data ss:Type="String"></Data></Cell>`;
    }
  });
  xmlRows += `</Row>`;

  const workbookXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Times New Roman" ss:Size="11" ss:Color="#0F172A"/>
    </Style>
    <Style ss:ID="InstitutionHeader">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Times New Roman" ss:Size="14" ss:Bold="1" ss:Color="#0F172A"/>
    </Style>
    <Style ss:ID="ReportTitle">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Times New Roman" ss:Size="12" ss:Bold="1" ss:Color="#1D4ED8"/>
    </Style>
    <Style ss:ID="MetaLine">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Times New Roman" ss:Size="10" ss:Bold="1" ss:Color="#334155"/>
    </Style>
    <Style ss:ID="TableHeaderText">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
      <Font ss:FontName="Times New Roman" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
      </Borders>
    </Style>
    <Style ss:ID="TableHeaderNum">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
      <Font ss:FontName="Times New Roman" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
      </Borders>
    </Style>
    <Style ss:ID="DataCellText">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Times New Roman" ss:Size="11" ss:Color="#0F172A"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
    </Style>
    <Style ss:ID="DataCellNum">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Times New Roman" ss:Size="11" ss:Color="#0F172A"/>
      <NumberFormat ss:Format="#,##0"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
    </Style>
    <Style ss:ID="TotalCellText">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
      <Font ss:FontName="Times New Roman" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>
      <Borders>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
        <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0F172A"/>
      </Borders>
    </Style>
    <Style ss:ID="TotalCellNum">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
      <Font ss:FontName="Times New Roman" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>
      <NumberFormat ss:Format="#,##0"/>
      <Borders>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
        <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0F172A"/>
      </Borders>
    </Style>
  </Styles>
  <Worksheet ss:Name="Employment Report">
    <Table>
      ${columns.map((c) => `<Column ss:Width="${c.isNumeric ? 115 : 185}"/>`).join('\n      ')}
      ${xmlRows}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `SOM_${sanitizeFilename(title)}_${sanitizeFilename(metadata.campusLabel)}_${sanitizeFilename(metadata.periodLabel)}.xls`;
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a formatted PDF document using Times New Roman with the official
 * SISTERS OF MARY OF BANNEUX, INC. — EMPLOYMENT REPORT header and Totals row.
 */
export function exportReportToPDF(
  metadata: ExportHeaderMetadata,
  columns: { header: string; key: string; isNumeric?: boolean }[],
  rows: Record<string, string | number>[],
  totals: ReportTotals
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const title = metadata.reportTitle || 'EMPLOYMENT REPORT';

  // Official Sisters of Mary Logo in PDF Header
  try {
    doc.addImage(SOM_LOGO_DATA_URI, 'JPEG', 40, 24, 42, 42);
  } catch {
    // Fallback if image rendering is unavailable
  }

  // Official Header in Times New Roman
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('SISTERS OF MARY OF BANNEUX, INC.', pageWidth / 2, 42, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(29, 78, 216);
  doc.text(title.toUpperCase(), pageWidth / 2, 60, { align: 'center' });

  // Horizontal rule
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(1);
  doc.line(40, 70, pageWidth - 40, 70);

  // Filter Metadata Block in Times New Roman
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`Campus: ${metadata.campusLabel}`, 40, 88);
  doc.text(`Year / Year Range: ${metadata.periodLabel}`, 40, 103);

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  const rightMeta = `Qualification: ${metadata.qualificationLabel || 'All Qualifications'}   |   Generated: ${new Date().toLocaleDateString()}`;
  doc.text(rightMeta, pageWidth - 40, 88, { align: 'right' });
  if (metadata.generatedBy) {
    doc.text(`Prepared by: ${metadata.generatedBy}`, pageWidth - 40, 103, { align: 'right' });
  }

  // Prepare table body and footer
  const head = [columns.map((c) => c.header)];
  const body = rows.map((row) =>
    columns.map((c) => {
      const val = row[c.key] ?? '';
      return typeof val === 'number' && c.isNumeric && c.key !== 'year'
        ? val.toLocaleString()
        : String(val);
    })
  );

  const totalMap: Record<string, number> = {
    numberEnrolled: totals.numberEnrolled,
    employed: totals.employed,
    numberGraduates: totals.numberGraduates,
    numberAssessed: totals.numberAssessed,
    numberCompetent: totals.numberCompetent,
    numberNYC: totals.numberNYC,
  };

  const footRow = columns.map((c, idx) => {
    if (idx === 0) return `TOTAL (${totals.recordCount} Records)`;
    if (totalMap[c.key] !== undefined) return totalMap[c.key].toLocaleString();
    return '';
  });

  const columnStyles: Record<number, any> = {};
  columns.forEach((c, idx) => {
    if (c.isNumeric) {
      columnStyles[idx] = { halign: 'right' };
    }
  });

  autoTable(doc, {
    startY: 116,
    head,
    body,
    foot: [footRow],
    theme: 'grid',
    styles: {
      font: 'times',
      fontSize: 9.5,
    },
    headStyles: {
      font: 'times',
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      font: 'times',
      fontSize: 9.5,
      textColor: [15, 23, 42],
    },
    footStyles: {
      font: 'times',
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 10,
    },
    columnStyles,
    margin: { left: 40, right: 40, bottom: 50 },
  });

  const filename = `SOM_${sanitizeFilename(title)}_${sanitizeFilename(metadata.campusLabel)}_${sanitizeFilename(metadata.periodLabel)}.pdf`;
  doc.save(filename);
}

/**
 * Downloads a template Excel (.xlsx) or CSV (.csv) file for importing historical Employment Report data.
 */
export function downloadImportTemplate(
  format: 'xlsx' | 'csv',
  defaultCampusName = 'Sisters of Mary Biga'
): void {
  const templateData = [
    {
      Campus: defaultCampusName,
      Year: 2012,
      Qualification: 'BPP — Bread and Pastry Production',
      'Number of Enrolled': 0,
      Employed: 0,
      'Number of Graduates': 0,
      'Number of Assessed': 0,
      'Number of Competent': 0,
      'Number of NYC': 0,
    },
    {
      Campus: defaultCampusName,
      Year: 2013,
      Qualification: 'CSS — Computer Systems Servicing',
      'Number of Enrolled': 0,
      Employed: 0,
      'Number of Graduates': 0,
      'Number of Assessed': 0,
      'Number of Competent': 0,
      'Number of NYC': 0,
    },
    {
      Campus: defaultCampusName,
      Year: 2014,
      Qualification: 'Bookkeeping',
      'Number of Enrolled': 0,
      Employed: 0,
      'Number of Graduates': 0,
      'Number of Assessed': 0,
      'Number of Competent': 0,
      'Number of NYC': 0,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Historical_Import_Template');

  if (format === 'csv') {
    XLSX.writeFile(wb, 'SOM_Employment_Report_Import_Template.csv', { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, 'SOM_Employment_Report_Import_Template.xlsx', { bookType: 'xlsx' });
  }
}

/**
 * Helper to convert detailed EmploymentReport records into export rows
 */
export function buildDetailedExportConfig(reports: EmploymentReport[], includeCampusAndYear = true) {
  const columns = [
    ...(includeCampusAndYear
      ? [
          { header: 'Campus', key: 'campusName', isNumeric: false },
          { header: 'Year', key: 'year', isNumeric: false },
        ]
      : []),
    { header: 'Qualification', key: 'qualificationDisplay', isNumeric: false },
    { header: 'Number of Enrolled', key: 'numberEnrolled', isNumeric: true },
    { header: 'Employed', key: 'employed', isNumeric: true },
    { header: 'Number of Graduates', key: 'numberGraduates', isNumeric: true },
    { header: 'Number of Assessed', key: 'numberAssessed', isNumeric: true },
    { header: 'Number of Competent', key: 'numberCompetent', isNumeric: true },
    { header: 'Number of NYC', key: 'numberNYC', isNumeric: true },
  ];

  const rows = reports.map((r) => ({
    campusName: r.campusName || r.campusId,
    year: r.year,
    qualificationDisplay:
      r.qualificationCode && r.qualificationName && r.qualificationCode !== r.qualificationName
        ? `${r.qualificationCode} — ${r.qualificationName}`
        : r.qualificationName || r.qualificationCode || r.qualificationId,
    numberEnrolled: r.numberEnrolled,
    employed: r.employed,
    numberGraduates: r.numberGraduates,
    numberAssessed: r.numberAssessed,
    numberCompetent: r.numberCompetent,
    numberNYC: r.numberNYC,
  }));

  return { columns, rows };
}

/**
 * Helper to convert Qualification Summary rows into export rows
 */
export function buildQualificationSummaryExportConfig(items: QualificationSummaryItem[]) {
  const columns = [
    { header: 'Qualification', key: 'qualificationDisplay', isNumeric: false },
    { header: 'Number of Enrolled', key: 'numberEnrolled', isNumeric: true },
    { header: 'Employed', key: 'employed', isNumeric: true },
    { header: 'Number of Graduates', key: 'numberGraduates', isNumeric: true },
    { header: 'Number of Assessed', key: 'numberAssessed', isNumeric: true },
    { header: 'Number of Competent', key: 'numberCompetent', isNumeric: true },
    { header: 'Number of NYC', key: 'numberNYC', isNumeric: true },
  ];

  const rows = items.map((item) => ({
    qualificationDisplay:
      item.qualificationCode && item.qualificationName && item.qualificationCode !== item.qualificationName
        ? `${item.qualificationCode} — ${item.qualificationName}`
        : item.qualificationName || item.qualificationCode,
    numberEnrolled: item.numberEnrolled,
    employed: item.employed,
    numberGraduates: item.numberGraduates,
    numberAssessed: item.numberAssessed,
    numberCompetent: item.numberCompetent,
    numberNYC: item.numberNYC,
  }));

  return { columns, rows };
}

/**
 * Helper to convert Yearly Summary rows into export rows
 */
export function buildYearlySummaryExportConfig(items: YearlyQualificationSummaryItem[]) {
  const columns = [
    { header: 'Year', key: 'year', isNumeric: false },
    { header: 'Qualification', key: 'qualificationDisplay', isNumeric: false },
    { header: 'Number of Enrolled', key: 'numberEnrolled', isNumeric: true },
    { header: 'Employed', key: 'employed', isNumeric: true },
    { header: 'Number of Graduates', key: 'numberGraduates', isNumeric: true },
    { header: 'Number of Assessed', key: 'numberAssessed', isNumeric: true },
    { header: 'Number of Competent', key: 'numberCompetent', isNumeric: true },
    { header: 'Number of NYC', key: 'numberNYC', isNumeric: true },
  ];

  const rows = items.map((item) => ({
    year: item.year,
    qualificationDisplay:
      item.qualificationCode && item.qualificationName && item.qualificationCode !== item.qualificationName
        ? `${item.qualificationCode} — ${item.qualificationName}`
        : item.qualificationName || item.qualificationCode,
    numberEnrolled: item.numberEnrolled,
    employed: item.employed,
    numberGraduates: item.numberGraduates,
    numberAssessed: item.numberAssessed,
    numberCompetent: item.numberCompetent,
    numberNYC: item.numberNYC,
  }));

  return { columns, rows };
}

/**
 * Helper to convert Yearly Aggregate rows into export rows
 */
export function buildYearlyAggregateExportConfig(items: YearlyAggregateItem[]) {
  const columns = [
    { header: 'Year', key: 'year', isNumeric: false },
    { header: 'Number of Enrolled', key: 'numberEnrolled', isNumeric: true },
    { header: 'Employed', key: 'employed', isNumeric: true },
    { header: 'Number of Graduates', key: 'numberGraduates', isNumeric: true },
    { header: 'Number of Assessed', key: 'numberAssessed', isNumeric: true },
    { header: 'Number of Competent', key: 'numberCompetent', isNumeric: true },
    { header: 'Number of NYC', key: 'numberNYC', isNumeric: true },
  ];

  const rows = items.map((item) => ({
    year: item.year,
    numberEnrolled: item.numberEnrolled,
    employed: item.employed,
    numberGraduates: item.numberGraduates,
    numberAssessed: item.numberAssessed,
    numberCompetent: item.numberCompetent,
    numberNYC: item.numberNYC,
  }));

  return { columns, rows };
}

/**
 * Helper to convert Campus Summary rows into export rows
 */
export function buildCampusSummaryExportConfig(items: CampusSummaryItem[]) {
  const columns = [
    { header: 'Campus', key: 'campusName', isNumeric: false },
    { header: 'Number of Enrolled', key: 'numberEnrolled', isNumeric: true },
    { header: 'Employed', key: 'employed', isNumeric: true },
    { header: 'Number of Graduates', key: 'numberGraduates', isNumeric: true },
    { header: 'Number of Assessed', key: 'numberAssessed', isNumeric: true },
    { header: 'Number of Competent', key: 'numberCompetent', isNumeric: true },
    { header: 'Number of NYC', key: 'numberNYC', isNumeric: true },
  ];

  const rows = items.map((item) => ({
    campusName: item.campusName,
    numberEnrolled: item.numberEnrolled,
    employed: item.employed,
    numberGraduates: item.numberGraduates,
    numberAssessed: item.numberAssessed,
    numberCompetent: item.numberCompetent,
    numberNYC: item.numberNYC,
  }));

  return { columns, rows };
}
