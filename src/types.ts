export enum UserRole {
  ADMIN = 'ADMIN',
  CAMPUS_USER = 'CAMPUS_USER',
}

export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface Campus {
  id: string;
  code: string;
  campusName: string;
  location: string;
  status: EntityStatus;
  createdAt: string;
}

export interface Qualification {
  id: string;
  code: string;
  qualificationName: string;
  description?: string;
  status: EntityStatus;
  createdAt: string;
}

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  campusId: string | null; // null or 'ALL' for ADMIN; specific campusId ('BIGA', 'MINGLANILLA', 'TALISAY', 'ADLAS') for CAMPUS_USER
  campusName?: string;
  status: EntityStatus;
  createdAt: string;
}

export interface EmploymentReport {
  id: string;
  campusId: string;
  campusName?: string;
  year: number;
  qualificationId: string;
  qualificationCode?: string;
  qualificationName?: string;
  numberEnrolled: number;
  employed: number;
  numberGraduates: number;
  numberAssessed: number;
  numberCompetent: number;
  numberNYC: number; // Automatically calculated: numberAssessed - numberCompetent
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportFilterState {
  campusId: string; // 'ALL' or specific campusId
  yearMode: 'SINGLE' | 'RANGE';
  year: string; // 'ALL' or specific year e.g. '2026'
  startYear: number; // e.g. 2004
  endYear: number; // e.g. 2026
  qualificationId: string; // 'ALL' or specific qualificationId
  searchQuery: string;
}

export interface ReportTotals {
  numberEnrolled: number;
  employed: number;
  numberGraduates: number;
  numberAssessed: number;
  numberCompetent: number;
  numberNYC: number;
  recordCount: number;
  employmentRate: number; // percentage based on graduates (or enrolled if 0 graduates)
  competencyRate: number; // percentage based on assessed
  graduationRate: number; // percentage based on enrolled
}

export interface QualificationSummaryItem extends ReportTotals {
  qualificationId: string;
  qualificationCode: string;
  qualificationName: string;
}

export interface YearlyQualificationSummaryItem extends ReportTotals {
  year: number;
  qualificationId: string;
  qualificationCode: string;
  qualificationName: string;
}

export interface YearlyAggregateItem extends ReportTotals {
  year: number;
}

export interface CampusSummaryItem extends ReportTotals {
  campusId: string;
  campusName: string;
  location: string;
}

export interface AutomatedSummaryResponse {
  appliedFilters: {
    campusId: string;
    campusLabel: string;
    periodLabel: string;
    qualificationId: string;
    qualificationLabel: string;
  };
  overallTotals: ReportTotals;
  byQualification: QualificationSummaryItem[];
  byYearAndQualification: YearlyQualificationSummaryItem[];
  byYearAggregate: YearlyAggregateItem[];
  byCampus: CampusSummaryItem[];
}

export interface ReportInputPayload {
  campusId: string;
  year: number;
  qualificationId: string;
  customQualificationName?: string;
  numberEnrolled: number;
  employed: number;
  numberGraduates: number;
  numberAssessed: number;
  numberCompetent: number;
  numberNYC: number;
}

export interface HistoricalImportRow {
  campus: string;
  year: number;
  qualification: string;
  numberEnrolled: number;
  employed: number;
  numberGraduates: number;
  numberAssessed: number;
  numberCompetent: number;
  numberNYC: number;
}

export interface TestScenarioResult {
  testId: string;
  title: string;
  description: string;
  passed: boolean;
  expected: string;
  actual: string;
  httpStatus?: number;
}
