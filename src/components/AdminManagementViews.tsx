import React, { useState, useEffect } from 'react';
import {
  Building2,
  BookOpen,
  Users as UsersIcon,
  Plus,
  Edit3,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Play,
  RotateCcw,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import {
  AutomatedSummaryResponse,
  Campus,
  EntityStatus,
  Qualification,
  TestScenarioResult,
  User,
  UserRole,
} from '../types';
import { api } from '../services/api';

// ============================================================================
// 1. CAMPUSES MANAGEMENT VIEW (ADMIN)
// ============================================================================

interface CampusesViewProps {
  campuses: Campus[];
  summary: AutomatedSummaryResponse | null;
  onRefresh: () => Promise<void>;
  onSelectCampusFilter: (campusId: string) => void;
}

export const CampusesManagementView: React.FC<CampusesViewProps> = ({
  campuses,
  summary,
  onRefresh,
  onSelectCampusFilter,
}) => {
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [campusName, setCampusName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<EntityStatus>(EntityStatus.ACTIVE);
  const [saving, setSaving] = useState(false);

  const campusStats = summary?.byCampus || [];

  const openEdit = (c: Campus) => {
    setEditingCampus(c);
    setCampusName(c.campusName);
    setLocation(c.location);
    setStatus(c.status);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampus) return;
    setSaving(true);
    try {
      await api.updateCampus(editingCampus.id, { campusName, location, status });
      setEditingCampus(null);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/90 border border-slate-200/90 rounded-xl p-5 shadow-xs">
        <p className="text-xs text-slate-600">
          Centralized Multi-Campus Configuration · Sisters of Mary of Banneux, Inc.
        </p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          CAMPUSES MANAGEMENT
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {campuses.map((c) => {
          const stat = campusStats.find((s) => s.campusId === c.id);
          return (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-700" />
                    <span className="font-mono text-xs font-semibold text-blue-700">
                      campusId = {c.id}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs font-medium text-emerald-700">
                      {c.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">
                    {c.campusName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{c.location}</p>
                </div>

                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              {stat && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-4 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Enrolled</span>
                    <span className="font-mono font-bold text-slate-900">
                      {stat.numberEnrolled.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Employed</span>
                    <span className="font-mono font-bold text-blue-700">
                      {stat.employed.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Graduates</span>
                    <span className="font-mono font-bold text-slate-900">
                      {stat.numberGraduates.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Assessed</span>
                    <span className="font-mono font-bold text-slate-900">
                      {stat.numberAssessed.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Competent</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {stat.numberCompetent.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">NYC</span>
                    <span className="font-mono font-bold text-amber-700">
                      {stat.numberNYC.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono">
                  {stat?.recordCount || 0} stored report records
                </span>
                <button
                  type="button"
                  onClick={() => onSelectCampusFilter(c.id)}
                  className="text-blue-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View {c.campusName} Records</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingCampus && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Edit Campus — {editingCampus.id}
            </h3>
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Campus Name
                </label>
                <input
                  type="text"
                  value={campusName}
                  onChange={(e) => setCampusName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Campus Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EntityStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                >
                  <option value={EntityStatus.ACTIVE}>ACTIVE</option>
                  <option value={EntityStatus.INACTIVE}>INACTIVE</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCampus(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-700 text-white font-semibold rounded-lg cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. QUALIFICATIONS MANAGEMENT VIEW (ADMIN - SECTION 3)
// ============================================================================

interface QualificationsViewProps {
  qualifications: Qualification[];
  onRefresh: () => Promise<void>;
}

export const QualificationsManagementView: React.FC<QualificationsViewProps> = ({
  qualifications,
  onRefresh,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQual, setEditingQual] = useState<Qualification | null>(null);
  const [code, setCode] = useState('');
  const [qualificationName, setQualificationName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<EntityStatus>(EntityStatus.ACTIVE);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingQual(null);
    setCode('');
    setQualificationName('');
    setDescription('');
    setStatus(EntityStatus.ACTIVE);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (q: Qualification) => {
    setEditingQual(q);
    setCode(q.code);
    setQualificationName(q.qualificationName);
    setDescription(q.description || '');
    setStatus(q.status);
    setError(null);
    setModalOpen(true);
  };

  const handleToggleStatus = async (q: Qualification) => {
    const nextStatus =
      q.status === EntityStatus.ACTIVE ? EntityStatus.INACTIVE : EntityStatus.ACTIVE;
    await api.updateQualification(q.id, { status: nextStatus });
    await onRefresh();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (editingQual) {
        await api.updateQualification(editingQual.id, {
          code,
          qualificationName,
          description,
          status,
        });
      } else {
        await api.createQualification({ code, qualificationName, description });
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save qualification.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white/90 border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-600">
            Dynamic Qualification Registry · Used across all Employment Report dropdowns
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            QUALIFICATIONS MANAGEMENT
          </h1>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Qualification</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-semibold">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Qualification Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {qualifications.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500">{q.id}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {q.code}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {q.qualificationName}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{q.description || '—'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-mono font-semibold ${
                        q.status === EntityStatus.ACTIVE
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {q.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                    <button
                      type="button"
                      onClick={() => openEdit(q)}
                      className="px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(q)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    >
                      {q.status === EntityStatus.ACTIVE ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700" />
              <h3 className="text-base font-bold text-slate-900">
                {editingQual ? 'Edit Qualification' : 'Add Qualification'}
              </h3>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Qualification Code (e.g. BPP, CSS, SMAW)
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. SMAW"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Qualification / Course Name
                </label>
                <input
                  type="text"
                  value={qualificationName}
                  onChange={(e) => setQualificationName(e.target.value)}
                  placeholder="e.g. Shielded Metal Arc Welding NC II"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional program description"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              {editingQual && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EntityStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                  >
                    <option value={EntityStatus.ACTIVE}>ACTIVE</option>
                    <option value={EntityStatus.INACTIVE}>INACTIVE</option>
                  </select>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-700 text-white font-semibold rounded-lg cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Qualification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. USERS & CAMPUS ACCOUNTS MANAGEMENT VIEW (ADMIN - SECTION 1 & 12)
// ============================================================================

interface UsersViewProps {
  campuses: Campus[];
}

export const UsersManagementView: React.FC<UsersViewProps> = ({ campuses }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<'ADMIN' | 'CAMPUS_USER'>('CAMPUS_USER');
  const [campusId, setCampusId] = useState<string>('BIGA');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.users);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setFullName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setRole('CAMPUS_USER');
    setCampusId(campuses[0]?.id || 'BIGA');
    setStatus('ACTIVE');
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setFullName(u.fullName);
    setUsername(u.username);
    setEmail(u.email);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setRole(u.role);
    setCampusId(u.campusId || campuses[0]?.id || 'BIGA');
    setStatus(u.status);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!editingUser && (!password || password.length < 6)) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password && password !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          fullName,
          email,
          password: password.trim() ? password : undefined,
          role,
          campusId: role === 'ADMIN' ? null : campusId,
          status,
        });
      } else {
        await api.createUser({
          fullName,
          username,
          email,
          password,
          role,
          campusId: role === 'ADMIN' ? null : campusId,
        });
      }
      setModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to save user account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white/90 border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-600">
            Role-Based Access Control · Bind Campus Accounts strictly to their assigned campus
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            CAMPUS USERS & ACCOUNTS
          </h1>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add Campus Account</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-semibold">
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Username / Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Campus (Data Isolation Scope)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading user accounts...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {u.fullName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      <div>{u.username}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {u.role}
                    </td>
                    <td className="py-3 px-4">
                      {u.role === UserRole.ADMIN ? (
                        <span className="font-semibold text-slate-900">
                          All 4 Campuses (Central Admin)
                        </span>
                      ) : (
                        <div>
                          <span className="font-semibold text-slate-900">
                            {u.campusName}
                          </span>
                          <span className="text-slate-400 mx-1.5">·</span>
                          <span className="font-mono text-slate-500">
                            campusId={u.campusId}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">
                      <span
                        className={
                          u.status === EntityStatus.ACTIVE
                            ? 'text-emerald-700'
                            : 'text-slate-400'
                        }
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                      >
                        Edit Account
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-blue-700" />
              <h3 className="text-base font-bold text-slate-900">
                {editingUser ? 'Edit User Account' : 'Create User Account'}
              </h3>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editingUser}
                    placeholder={editingUser ? 'Enter new password to change' : 'Min. 6 characters'}
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                    aria-label={showPassword ? 'Hide Password' : 'Show Password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {(!editingUser || password.length > 0) && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={!editingUser || password.length > 0}
                      placeholder="Re-enter password"
                      className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      title={showConfirmPassword ? 'Hide Password' : 'Show Password'}
                      aria-label={showConfirmPassword ? 'Hide Password' : 'Show Password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'ADMIN' | 'CAMPUS_USER')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                  >
                    <option value="CAMPUS_USER">CAMPUS USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                {role === 'CAMPUS_USER' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Assigned Campus
                    </label>
                    <select
                      value={campusId}
                      onChange={(e) => setCampusId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                    >
                      {campuses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.campusName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {editingUser && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Account Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-700 text-white font-semibold rounded-lg cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. SETTINGS & LIVE 7-SCENARIO VERIFICATION SUITE (SECTION 15 & 19)
// ============================================================================

interface SettingsViewProps {
  user: User;
  onRefreshData: () => Promise<void>;
  onBackgroundUpdated?: () => void;
}

export const SettingsAndVerificationView: React.FC<SettingsViewProps> = ({
  user,
  onRefreshData,
  onBackgroundUpdated,
}) => {
  const [testResults, setTestResults] = useState<TestScenarioResult[]>([]);
  const [runningTests, setRunningTests] = useState(false);
  const [probeResponse, setProbeResponse] = useState<{
    target: string;
    status: string;
    message: string;
    blocked: boolean;
  } | null>(null);
  const [resetting, setResetting] = useState(false);

  // Original Background Photographs state
  const [bgSlots, setBgSlots] = useState<
    {
      slot: 'ADMIN' | 'BIGA' | 'ADLAS' | 'TALISAY' | 'MINGLANILLA';
      label: string;
      imageUrl: string;
      aliasUrl: string;
      version: number;
      sizeBytes: number;
    }[]
  >([]);
  const [uploadingBgSlot, setUploadingBgSlot] = useState<string | null>(null);
  const [bgStatusMsg, setBgStatusMsg] = useState<string | null>(null);

  const loadBgStatus = async () => {
    try {
      const res = await api.getBackgroundsStatus();
      setBgSlots(res.slots);
    } catch {
      // ignore
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });

  const handleUploadSingleBg = async (
    slot: 'ADMIN' | 'BIGA' | 'ADLAS' | 'TALISAY' | 'MINGLANILLA',
    file: File
  ) => {
    setUploadingBgSlot(slot);
    setBgStatusMsg(null);
    try {
      const base64Data = await readFileAsDataUrl(file);
      const res = await api.uploadOriginalBackground({
        slot,
        base64Data,
        fileName: file.name,
      });
      setBgStatusMsg(res.message);
      await loadBgStatus();
      if (onBackgroundUpdated) onBackgroundUpdated();
    } catch (err: any) {
      setBgStatusMsg(err.message || 'Failed to save original background file.');
    } finally {
      setUploadingBgSlot(null);
    }
  };

  const handleBatchUploadBgFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadingBgSlot('BATCH');
    setBgStatusMsg(null);
    try {
      const files = Array.from(fileList);
      const orderedSlots: ('ADMIN' | 'BIGA' | 'ADLAS' | 'TALISAY' | 'MINGLANILLA')[] = [
        'ADMIN',
        'BIGA',
        'ADLAS',
        'TALISAY',
        'MINGLANILLA',
      ];
      let uploadedCount = 0;

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const lower = f.name.toLowerCase();
        let targetSlot: 'ADMIN' | 'BIGA' | 'ADLAS' | 'TALISAY' | 'MINGLANILLA' | null = null;
        if (lower.includes('admin')) targetSlot = 'ADMIN';
        else if (lower.includes('biga') || lower.includes('silang')) targetSlot = 'BIGA';
        else if (lower.includes('adlas')) targetSlot = 'ADLAS';
        else if (lower.includes('talisay')) targetSlot = 'TALISAY';
        else if (lower.includes('mingla')) targetSlot = 'MINGLANILLA';
        else if (i < orderedSlots.length) targetSlot = orderedSlots[i];

        if (targetSlot) {
          const base64Data = await readFileAsDataUrl(f);
          await api.uploadOriginalBackground({
            slot: targetSlot,
            base64Data,
            fileName: f.name,
          });
          uploadedCount++;
        }
      }

      setBgStatusMsg(
        `Saved ${uploadedCount} original photograph file(s) with 100% exact binary preservation (zero AI or pixel modification).`
      );
      await loadBgStatus();
      if (onBackgroundUpdated) onBackgroundUpdated();
    } catch (err: any) {
      setBgStatusMsg(err.message || 'Failed to upload original background files.');
    } finally {
      setUploadingBgSlot(null);
    }
  };

  const runAllTests = async () => {
    setRunningTests(true);
    try {
      const res = await api.runVerificationTests();
      setTestResults(res.results);
    } finally {
      setRunningTests(false);
    }
  };

  useEffect(() => {
    runAllTests();
    loadBgStatus();
  }, []);

  // Live Cross-Campus Isolation Probe (Tests Section 15 / TEST 7 directly from client)
  const runCrossCampusProbe = async (targetCampus: string, targetRecordId: string) => {
    try {
      const res = await api.getReportById(targetRecordId);
      setProbeResponse({
        target: `GET /api/reports/${targetRecordId} (campusId=${targetCampus})`,
        status: 'HTTP 200 OK (Authorized)',
        message: `Access permitted for ${user.role} (${user.campusName}). Retrieved ${res.report.campusName} — ${res.report.year} ${res.report.qualificationCode}.`,
        blocked: false,
      });
    } catch (err: any) {
      setProbeResponse({
        target: `GET /api/reports/${targetRecordId} (campusId=${targetCampus})`,
        status: `HTTP ${err.status || 403} FORBIDDEN (${err.code || 'ACCESS_DENIED'})`,
        message: err.message,
        blocked: true,
      });
    }
  };

  const handleResetDemoData = async () => {
    setResetting(true);
    try {
      await api.resetDatabase();
      await onRefreshData();
      await runAllTests();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/90 border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-600">
            Account Profile & Automated 7-Scenario Security Verification
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            SETTINGS & SECURITY AUDIT
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {user.role === UserRole.ADMIN && (
            <button
              type="button"
              disabled={resetting}
              onClick={handleResetDemoData}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{resetting ? 'Resetting...' : 'Reset Default Seed Data'}</span>
            </button>
          )}
          <button
            type="button"
            disabled={runningTests}
            onClick={runAllTests}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningTests ? 'Running Tests...' : 'Re-Run All 7 Verification Tests'}</span>
          </button>
        </div>
      </div>

      {/* Authenticated Account Profile Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900">
          Authenticated Account Profile
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-500 block">Full Name</span>
            <span className="font-bold text-slate-900 mt-0.5 block">{user.fullName}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-500 block">Username / Email</span>
            <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
              {user.username} ({user.email})
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-500 block">Assigned Role</span>
            <span className="font-mono font-bold text-blue-700 mt-0.5 block">
              {user.role}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-500 block">Authorized Campus Scope</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">
              {user.campusName || (user.campusId ? user.campusId : 'All 4 Campuses')}
            </span>
          </div>
        </div>
      </div>

      {/* Automatic Role & Campus Background Photographs (100% Original File Preservation) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ImageIcon className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Role & Campus Background Photographs (100% Original File Preservation)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                The system automatically selects the background based on the logged-in account (Image 1 → Admin, Image 2 → Biga, Image 3 → Adlas, Image 4 → Talisay, Image 5 → Minglanila). Uploaded files are saved as exact raw bytes without AI modification or retouching.
              </p>
            </div>
          </div>

          <label className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0">
            <Upload className="w-3.5 h-3.5" />
            <span>
              {uploadingBgSlot === 'BATCH'
                ? 'Saving Original Files...'
                : 'Upload Original Photo Files (1–5)'}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleBatchUploadBgFiles(e.target.files);
                e.currentTarget.value = '';
              }}
            />
          </label>
        </div>

        {bgStatusMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bgStatusMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {bgSlots.map((item) => (
            <div
              key={item.slot}
              className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex flex-col justify-between"
            >
              <div>
                <div className="h-28 bg-slate-200 relative overflow-hidden">
                  <img
                    src={`${item.imageUrl}?v=${item.version}`}
                    alt={item.label}
                    className="w-full h-full object-cover object-center"
                  />
                </div>
                <div className="p-2.5">
                  <div className="text-xs font-bold text-slate-900">{item.label}</div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    {item.imageUrl} ({(item.sizeBytes / 1024).toFixed(0)} KB)
                  </div>
                </div>
              </div>
              <div className="px-2.5 pb-2.5">
                <label className="w-full py-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                  <Upload className="w-3 h-3" />
                  <span>
                    {uploadingBgSlot === item.slot ? 'Saving...' : 'Use Original File'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadSingleBg(item.slot, file);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Cross-Campus Data Isolation Probe (TEST 7 Demonstration) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Live Backend Data Isolation Probe (Test 7 — Direct Record ID / URL Parameter Test)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Click any campus record ID below to send a live API request (
              <code className="font-mono text-slate-800">GET /api/reports/:id</code>) using your current authentication token. Campus users will be blocked with <code className="font-mono text-red-700">HTTP 403 Forbidden</code> when attempting to access another campus&apos;s record ID.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { campus: 'BIGA', recordId: 'REP_BIGA_2026_QUAL_BPP', label: 'Probe BIGA Record (2026 BPP)' },
            { campus: 'MINGLANILLA', recordId: 'REP_MINGLANILLA_2026_QUAL_BPP', label: 'Probe MINGLANILLA Record (2026 BPP)' },
            { campus: 'TALISAY', recordId: 'REP_TALISAY_2026_QUAL_BPP', label: 'Probe TALISAY Record (2026 BPP)' },
            { campus: 'ADLAS', recordId: 'REP_ADLAS_2026_QUAL_BPP', label: 'Probe ADLAS Record (2026 BPP)' },
          ].map((item) => (
            <button
              key={item.recordId}
              type="button"
              onClick={() => runCrossCampusProbe(item.campus, item.recordId)}
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-slate-900">{item.label}</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                ID: {item.recordId}
              </div>
            </button>
          ))}
        </div>

        {probeResponse && (
          <div
            className={`p-4 rounded-lg border text-xs font-mono space-y-1 ${
              probeResponse.blocked
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {probeResponse.blocked ? (
                <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              )}
              <span>
                {probeResponse.target} → {probeResponse.status}
              </span>
            </div>
            <p className="pl-6 font-sans">{probeResponse.message}</p>
          </div>
        )}
      </div>

      {/* Automated 7-Scenario Verification Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Automated System Verification Suite (Tests 1 through 7)
            </h2>
            <p className="text-xs text-slate-500">
              Live verification against backend data-access rules, automatic NYC calculation, and summary engines
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700">
            {testResults.filter((t) => t.passed).length} / {testResults.length} Passed
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {testResults.map((test) => (
            <div key={test.testId} className="p-4 flex items-start justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {test.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span className="font-mono font-bold text-slate-900">{test.testId}:</span>
                  <span className="font-bold text-slate-900">{test.title}</span>
                </div>
                <p className="text-slate-600 pl-6">{test.description}</p>
                <div className="pl-6 pt-1 space-y-0.5 font-mono text-[11px]">
                  <div className="text-slate-500">Expected: {test.expected}</div>
                  <div className="text-slate-800">Actual: {test.actual}</div>
                </div>
              </div>
              <span
                className={`font-mono font-bold shrink-0 ${
                  test.passed ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {test.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
