/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  BarChart3,
  Building2,
  BookOpen,
  Users,
  FileText,
  Settings,
  LogOut,
  Plus,
  Upload,
  Menu,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  AutomatedSummaryResponse,
  Campus,
  EmploymentReport,
  HistoricalImportRow,
  Qualification,
  ReportFilterState,
  ReportInputPayload,
  ReportTotals,
  User,
  UserRole,
} from './types';
import { api, getStoredToken } from './services/api';
import { getAuthenticatedUserBackground } from './utils/backgroundUtils';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { EmploymentReportView } from './components/EmploymentReportView';
import { SummaryView } from './components/SummaryView';
import { ReportsExportView } from './components/ReportsExportView';
import {
  CampusesManagementView,
  QualificationsManagementView,
  SettingsAndVerificationView,
  UsersManagementView,
} from './components/AdminManagementViews';
import { ReportFormModal } from './components/ReportFormModal';
import { ImportDataModal } from './components/ImportDataModal';

type NavTab =
  | 'dashboard'
  | 'employment-report'
  | 'summary'
  | 'campuses'
  | 'qualifications'
  | 'users'
  | 'reports'
  | 'settings';

const DEFAULT_TOTALS: ReportTotals = {
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Core relational metadata
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [allCampusReports, setAllCampusReports] = useState<EmploymentReport[]>([]);

  // Filtered reports & automated summaries
  const [reports, setReports] = useState<EmploymentReport[]>([]);
  const [totals, setTotals] = useState<ReportTotals>(DEFAULT_TOTALS);
  const [summary, setSummary] = useState<AutomatedSummaryResponse | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  // Filter state
  const currentSystemYear = new Date().getFullYear();
  const [filters, setFilters] = useState<ReportFilterState>({
    campusId: 'ALL',
    yearMode: 'SINGLE',
    year: 'ALL',
    startYear: 2004,
    endYear: currentSystemYear,
    qualificationId: 'ALL',
    searchQuery: '',
  });

  // Add/Edit Record Modal state
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingRecord, setEditingRecord] = useState<EmploymentReport | null>(null);
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [bgVersions, setBgVersions] = useState<Record<string, number>>({});

  const loadBackgroundVersions = useCallback(async () => {
    try {
      const res = await api.getBackgroundsStatus();
      const map: Record<string, number> = {};
      for (const s of res.slots) {
        map[s.slot] = s.version;
      }
      setBgVersions(map);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadBackgroundVersions();
  }, [loadBackgroundVersions]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Restore session on initial mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }
    api
      .getCurrentUser()
      .then((res) => {
        setUser(res.user);
        setFilters((prev) => ({
          ...prev,
          campusId: res.user.role === UserRole.ADMIN ? 'ALL' : res.user.campusId || 'BIGA',
        }));
      })
      .catch(() => {
        api.logout();
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, []);

  // Load campuses, qualifications, and full campus report list (for duplicate validation & available years)
  const loadReferenceData = useCallback(async (currentUser: User) => {
    try {
      const [campusRes, qualRes, allRepRes] = await Promise.all([
        api.getCampuses(),
        api.getQualifications(),
        api.getReports({
          campusId: currentUser.role === UserRole.ADMIN ? 'ALL' : currentUser.campusId || 'BIGA',
          yearMode: 'SINGLE',
          year: 'ALL',
          qualificationId: 'ALL',
        }),
      ]);
      setCampuses(campusRes.campuses);
      setQualifications(qualRes.qualifications);
      setAllCampusReports(allRepRes.reports);
    } catch (err) {
      console.error('Error loading reference data:', err);
    }
  }, []);

  // Load filtered reports and automated summaries whenever user or filters change
  const loadFilteredData = useCallback(
    async (currentUser: User, currentFilters: ReportFilterState) => {
      setLoadingData(true);
      try {
        const effectiveFilters: ReportFilterState = {
          ...currentFilters,
          campusId:
            currentUser.role === UserRole.ADMIN
              ? currentFilters.campusId
              : currentUser.campusId || 'BIGA',
        };

        const [repRes, sumRes] = await Promise.all([
          api.getReports(effectiveFilters),
          api.getAutomatedSummary(effectiveFilters),
        ]);

        setReports(repRes.reports);
        setTotals(repRes.totals);
        setSummary(sumRes);
      } catch (err) {
        console.error('Failed to load filtered reports/summary:', err);
      } finally {
        setLoadingData(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!user) return;
    loadReferenceData(user);
  }, [user, loadReferenceData]);

  useEffect(() => {
    if (!user) return;
    loadFilteredData(user, filters);
  }, [user, filters, loadFilteredData]);

  const handleLoginSuccess = (loggedInUser: User) => {
    const minAvailable = availableYears.length > 0 ? Math.min(...availableYears) : 2004;
    const maxAvailable = availableYears.length > 0 ? Math.max(...availableYears, currentSystemYear) : currentSystemYear;
    setUser(loggedInUser);
    setActiveTab('dashboard');
    setFilters({
      campusId: loggedInUser.role === UserRole.ADMIN ? 'ALL' : loggedInUser.campusId || 'BIGA',
      yearMode: 'SINGLE',
      year: 'ALL',
      startYear: minAvailable,
      endYear: maxAvailable,
      qualificationId: 'ALL',
      searchQuery: '',
    });
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setReports([]);
    setSummary(null);
  };

  const handleFilterChange = (updated: Partial<ReportFilterState>) => {
    setFilters((prev) => {
      const next = { ...prev, ...updated };
      if (user && user.role === UserRole.CAMPUS_USER) {
        next.campusId = user.campusId || 'BIGA';
      }
      return next;
    });
  };

  const handleResetFilters = () => {
    if (!user) return;
    const minAvailable = availableYears.length > 0 ? Math.min(...availableYears) : 2004;
    const maxAvailable = availableYears.length > 0 ? Math.max(...availableYears, currentSystemYear) : currentSystemYear;
    setFilters({
      campusId: user.role === UserRole.ADMIN ? 'ALL' : user.campusId || 'BIGA',
      yearMode: 'SINGLE',
      year: 'ALL',
      startYear: minAvailable,
      endYear: maxAvailable,
      qualificationId: 'ALL',
      searchQuery: '',
    });
  };

  const handleOpenCreateModal = () => {
    setFormMode('CREATE');
    setEditingRecord(null);
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (record: EmploymentReport) => {
    setFormMode('EDIT');
    setEditingRecord(record);
    setFormModalOpen(true);
  };

  const handleSaveReport = async (payload: ReportInputPayload, editId?: string) => {
    if (!user) return;
    if (editId) {
      const res = await api.updateReport(editId, payload);
      showToast(res.message);
    } else {
      const res = await api.createReport(payload);
      showToast(res.message);
    }
    await Promise.all([loadReferenceData(user), loadFilteredData(user, filters)]);
  };

  const handleDeleteReport = async (id: string) => {
    if (!user) return;
    const res = await api.deleteReport(id);
    showToast(res.message);
    await Promise.all([loadReferenceData(user), loadFilteredData(user, filters)]);
  };

  const handleImportHistoricalReports = async (records: HistoricalImportRow[]) => {
    if (!user) return;
    const res = await api.importHistoricalReports(records);
    showToast(res.message);
    await Promise.all([loadReferenceData(user), loadFilteredData(user, filters)]);
  };

  // Distinct years available in the database
  const availableYears = Array.from(new Set(allCampusReports.map((r) => r.year)));

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-mono text-slate-500">
        Initializing Sisters of Mary Employment Report Management System...
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = user.role === UserRole.ADMIN;
  const activeBackground = getAuthenticatedUserBackground(user);
  const activeBgVersion = bgVersions[activeBackground.slot];
  const resolvedBgUrl = activeBgVersion
    ? `${activeBackground.imageUrl}?v=${activeBgVersion}`
    : activeBackground.imageUrl;

  const allNavItems: { id: NavTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'employment-report',
      label: 'Employment Report',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    { id: 'summary', label: 'Summary', icon: <BarChart3 className="w-4 h-4" /> },
    {
      id: 'campuses',
      label: 'Campuses',
      icon: <Building2 className="w-4 h-4" />,
      adminOnly: true,
    },
    {
      id: 'qualifications',
      label: 'Qualifications',
      icon: <BookOpen className="w-4 h-4" />,
      adminOnly: true,
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Users className="w-4 h-4" />,
      adminOnly: true,
    },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative">
      {/* ====================================================================
          AUTOMATIC ROLE / CAMPUS FULL-PAGE BACKGROUND
          - Admin -> Image 1 (/bg-admin.jpg)
          - Biga -> Image 2 (/bg-biga.jpg)
          - Adlas -> Image 3 (/bg-adlas.jpg)
          - Talisay -> Image 4 (/bg-talisay.jpg)
          - Minglanila -> Image 5 (/bg-minglanilla.jpg)
         ==================================================================== */}
      <div className="fixed inset-0 pointer-events-none z-0 no-print">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("${resolvedBgUrl}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* Subtle semi-transparent overlay so the original background image remains clearly recognizable while keeping content readable */}
        <div className="absolute inset-0 bg-slate-900/20" />
      </div>

      {/* ====================================================================
          LEFT SIDEBAR NAVIGATION (260px Desktop, Responsive Drawer Mobile)
         ==================================================================== */}
      <aside className="w-full lg:w-64 bg-slate-900/92 text-slate-200 flex flex-col justify-between shrink-0 no-print relative z-20 border-r border-slate-800/80">
        <div className="relative z-10">
          {/* Brand Header */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/som-logo.jpg"
                alt="Sisters of Mary Logo"
                className="w-10 h-10 rounded-full object-cover bg-white p-0.5 border border-slate-700 shrink-0"
              />
              <div className="leading-tight">
                <div className="font-bold text-sm text-white tracking-tight">
                  Sisters of Mary
                </div>
                <div className="text-[11px] text-slate-400">
                  Employment Report System
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Active User & Campus Scope Indicator */}
          <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800 text-xs">
            <div className="text-[11px] font-mono text-blue-400 font-semibold">
              {isAdmin ? 'ROLE: SYSTEM ADMIN' : `CAMPUS: ${user.campusId}`}
            </div>
            <div className="font-semibold text-white truncate mt-0.5">{user.fullName}</div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5">
              {user.campusName}
            </div>
          </div>

          {/* Navigation Links */}
          <nav
            className={`${
              mobileMenuOpen ? 'block' : 'hidden'
            } lg:block p-3 space-y-1`}
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-3 mt-3 border-t border-slate-800 lg:hidden">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-3.5 py-2.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-slate-800 flex items-center gap-3 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Desktop Bottom Logout */}
        <div className="hidden lg:block p-4 border-t border-slate-800 relative z-10">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3.5 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-3 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ====================================================================
          MAIN WORKSPACE CANVAS
         ==================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Bar Contract (3 Zones: Context Breadcrumb, Campus Scope, Primary Action) */}
        <header className="bg-white/90 backdrop-blur-[2px] border-b border-slate-200/90 px-6 py-3 flex items-center justify-between gap-4 no-print relative z-10">
          <div className="flex items-center gap-2.5 text-xs text-slate-600 truncate">
            <img
              src="/som-logo.jpg"
              alt="Sisters of Mary Logo"
              className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <span className="font-bold text-slate-900">
              Sisters of Mary of Banneux, Inc.
            </span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-700 capitalize">
              {activeTab.replace('-', ' ')}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <span>Access Scope:</span>
            <span className="font-semibold text-slate-900">
              {isAdmin ? 'All 4 Campuses (Biga · Minglanilla · Talisay · Adlas)' : user.campusName}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 text-blue-700" />
              <span>Import Historical Data</span>
            </button>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Report Entry</span>
            </button>
          </div>
        </header>

        {/* Toast Banner */}
        {toastMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-900 text-white rounded-lg flex items-center justify-between text-xs shadow-sm no-print relative z-10">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Viewport Content */}
        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto relative z-10">
          {activeTab === 'dashboard' && (
            <DashboardView
              user={user}
              campuses={campuses}
              qualifications={qualifications}
              availableYears={availableYears}
              filters={filters}
              summary={summary}
              loading={loadingData}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              onOpenAddModal={handleOpenCreateModal}
              onOpenImportModal={() => setImportModalOpen(true)}
              onNavigate={(tab) => setActiveTab(tab as NavTab)}
            />
          )}

          {activeTab === 'employment-report' && (
            <EmploymentReportView
              user={user}
              campuses={campuses}
              qualifications={qualifications}
              availableYears={availableYears}
              filters={filters}
              reports={reports}
              totals={totals}
              summary={summary}
              loading={loadingData}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              onOpenCreate={handleOpenCreateModal}
              onOpenEdit={handleOpenEditModal}
              onOpenImport={() => setImportModalOpen(true)}
              onDeleteRecord={handleDeleteReport}
              onSaveRecord={handleSaveReport}
            />
          )}

          {activeTab === 'summary' && (
            <SummaryView
              user={user}
              campuses={campuses}
              qualifications={qualifications}
              availableYears={availableYears}
              filters={filters}
              summary={summary}
              loading={loadingData}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsExportView
              user={user}
              campuses={campuses}
              qualifications={qualifications}
              availableYears={availableYears}
              filters={filters}
              reports={reports}
              totals={totals}
              summary={summary}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
            />
          )}

          {activeTab === 'campuses' && isAdmin && (
            <CampusesManagementView
              campuses={campuses}
              summary={summary}
              onRefresh={async () => {
                await loadReferenceData(user);
                await loadFilteredData(user, filters);
              }}
              onSelectCampusFilter={(campusId) => {
                handleFilterChange({ campusId });
                setActiveTab('employment-report');
              }}
            />
          )}

          {activeTab === 'qualifications' && isAdmin && (
            <QualificationsManagementView
              qualifications={qualifications}
              onRefresh={async () => {
                await loadReferenceData(user);
                await loadFilteredData(user, filters);
              }}
            />
          )}

          {activeTab === 'users' && isAdmin && (
            <UsersManagementView campuses={campuses} />
          )}

          {activeTab === 'settings' && (
            <SettingsAndVerificationView
              user={user}
              onRefreshData={async () => {
                await loadReferenceData(user);
                await loadFilteredData(user, filters);
              }}
              onBackgroundUpdated={loadBackgroundVersions}
            />
          )}
        </main>
      </div>

      {/* Add / Edit Employment Report Modal */}
      <ReportFormModal
        isOpen={formModalOpen}
        mode={formMode}
        user={user}
        campuses={campuses}
        qualifications={qualifications}
        existingReports={allCampusReports}
        initialRecord={editingRecord}
        defaultCampusId={filters.campusId}
        defaultYear={
          filters.yearMode === 'SINGLE' && filters.year !== 'ALL'
            ? Number(filters.year)
            : filters.yearMode === 'RANGE' && filters.endYear
            ? Number(filters.endYear)
            : currentSystemYear
        }
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleSaveReport}
      />

      {/* Import Historical / Spreadsheet Data Modal */}
      <ImportDataModal
        isOpen={importModalOpen}
        user={user}
        campuses={campuses}
        onClose={() => setImportModalOpen(false)}
        onConfirmImport={handleImportHistoricalReports}
      />
    </div>
  );
}
