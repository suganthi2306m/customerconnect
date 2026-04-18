import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import apiClient from '../api/client';
import BranchesEditor from '../components/settings/BranchesEditor';
import SlideOverPanel from '../components/common/SlideOverPanel';
import LocationLoadingIndicator from '../components/common/LocationLoadingIndicator';

const TABS = [
  { id: 'leaveTypes', label: 'Leave types', icon: 'leave' },
  { id: 'designations', label: 'Designations', icon: 'badge' },
  { id: 'departments', label: 'Departments', icon: 'building' },
  { id: 'employmentTypes', label: 'Employment types', icon: 'briefcase' },
  { id: 'expenseCategories', label: 'Expense settings', icon: 'wallet' },
  { id: 'branches', label: 'Branches', icon: 'branch' },
  { id: 'geofencing', label: 'Geo fencing', icon: 'geofence' },
];

const EXPENSE_ICON_OPTIONS = [
  { value: 'receipt', label: 'Receipt' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'food', label: 'Food' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'transport', label: 'Transport' },
];

function normalizeBranchesFromApi(list) {
  if (!Array.isArray(list)) return [];
  return list.map((b) => ({
    _id: b._id != null ? String(b._id) : '',
    name: b.name || '',
    code: b.code || '',
    address: b.address || '',
    phone: b.phone || '',
  }));
}

function normalizeOrgSetup(c) {
  const os = c?.orgSetup && typeof c.orgSetup === 'object' ? c.orgSetup : {};
  const idStr = (x) => (x?._id != null ? String(x._id) : '');
  return {
    leaveTypes: Array.isArray(os.leaveTypes)
      ? os.leaveTypes.map((r) => ({
          _id: idStr(r),
          name: r.name || '',
          annualDays: r.annualDays != null ? Number(r.annualDays) : 0,
          carryForward: Boolean(r.carryForward),
          paidLeave: r.paidLeave !== false,
          applicableTo: r.applicableTo || 'All',
          isActive: r.isActive !== false,
        }))
      : [],
    designations: Array.isArray(os.designations)
      ? os.designations.map((r) => ({ _id: idStr(r), name: r.name || '', isActive: r.isActive !== false }))
      : [],
    departments: Array.isArray(os.departments)
      ? os.departments.map((r) => ({ _id: idStr(r), name: r.name || '', isActive: r.isActive !== false }))
      : [],
    employmentTypes: Array.isArray(os.employmentTypes)
      ? os.employmentTypes.map((r) => ({
          _id: idStr(r),
          name: r.name || '',
          description: r.description || '',
          isActive: r.isActive !== false,
        }))
      : [],
    expenseCategories: Array.isArray(os.expenseCategories)
      ? os.expenseCategories.map((r) => ({
          _id: idStr(r),
          name: r.name || '',
          budgetAmount: r.budgetAmount != null ? Number(r.budgetAmount) : 0,
          iconKey: r.iconKey || 'receipt',
          isActive: r.isActive !== false,
        }))
      : [],
  };
}

function matchesStatus(isActive, statusFilter) {
  if (statusFilter === 'active') return isActive;
  if (statusFilter === 'inactive') return !isActive;
  return true;
}

function TabIcon({ name }) {
  const c = 'h-5 w-5 flex-shrink-0';
  switch (name) {
    case 'leave':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c} aria-hidden>
          <path d="M5 19c5.5 0 12.2-2.2 14-9.5C12.5 9.5 8 12.5 5 19Z" />
        </svg>
      );
    case 'badge':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c} aria-hidden>
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .4 1.9L21 18.3l-2.3 2.3-1.4-1.2a1.7 1.7 0 0 0-1.9-.4 9 9 0 0 1-10.8 0 1.7 1.7 0 0 0-1.9.4L3.3 20.6 1 18.3l1.2-1.4a1.7 1.7 0 0 0 .4-1.9 9 9 0 0 1 0-10.8 1.7 1.7 0 0 0-.4-1.9L1 5.7 3.3 3.4l1.4 1.2a1.7 1.7 0 0 0 1.9.4 9 9 0 0 1 10.8 0 1.7 1.7 0 0 0 1.9-.4L20.7 3.4 23 5.7l-1.2 1.4a1.7 1.7 0 0 0-.4 1.9 9 9 0 0 1 0 10.8Z" />
        </svg>
      );
    case 'building':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c} aria-hidden>
          <path d="M4 21V8l8-4 8 4v13" />
          <path d="M9 21v-6h6v6" />
          <path d="M9 10h.01M9 14h.01M15 10h.01M15 14h.01" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c} aria-hidden>
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <rect x="3" y="7" width="18" height="14" rx="2" />
          <path d="M12 12v5" />
        </svg>
      );
    case 'wallet':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c} aria-hidden>
          <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10H4z" />
          <path d="M16 12h3v4h-3a2 2 0 1 1 0-4Z" />
        </svg>
      );
    case 'branch':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c} aria-hidden>
          <path d="M6 3v18" />
          <path d="M6 7h8a4 4 0 0 1 0 8H6" />
          <path d="M6 15h9a3 3 0 0 1 0 6H6" />
        </svg>
      );
    case 'geofence':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c} aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
        </svg>
      );
    default:
      return null;
  }
}

/** Same compact toggle as Users table rows */
function StatusToggle({ checked, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={clsx(
        'inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition',
        checked ? 'border-primary bg-primary' : 'border-primary/50 bg-primary/15',
        disabled && 'cursor-not-allowed opacity-50',
      )}
      title={checked ? 'Set inactive' : 'Set active'}
      aria-label={checked ? 'Set inactive' : 'Set active'}
    >
      <span
        className={clsx(
          'h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}

function IconEdit({ onClick, disabled, title = 'Edit' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 text-dark hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </button>
  );
}

function IconDelete({ onClick, disabled, title = 'Delete' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-primary bg-primary/10 text-dark hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    </button>
  );
}

function ListToolbar({
  title,
  subtitle,
  addLabel,
  onAdd,
  searchValue,
  onSearchChange,
  hideSearch,
  statusFilter,
  onStatusChange,
  hideStatus,
  shown,
  total,
  saving,
  trailing,
}) {
  return (
    <>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h4 className="min-w-0 text-base font-semibold text-dark">{title}</h4>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          {trailing}
          {onAdd ? (
            <button type="button" onClick={onAdd} className="btn-primary gap-2" disabled={saving}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {addLabel}
            </button>
          ) : null}
        </div>
      </div>

      {!hideSearch ? (
        <div className="mb-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search…"
              className="form-input w-full py-2 pl-9"
              autoComplete="off"
            />
          </div>
          {!hideStatus ? (
            <>
              <span className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-primary sm:text-[11px]">Status</span>
              <div className="inline-flex min-w-0 shrink rounded-full border border-primary/50 bg-flux-panel p-0.5">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'active', label: 'Active' },
                  { id: 'inactive', label: 'Inactive' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onStatusChange(opt.id)}
                    className={clsx(
                      'rounded-full px-3 py-1.5 text-sm font-semibold transition',
                      statusFilter === opt.id ? 'bg-white text-dark shadow-sm' : 'text-slate-600 hover:text-dark',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <span className="min-w-0 text-sm text-slate-500 sm:whitespace-nowrap">
            {shown} of {total} shown
          </span>
        </div>
      ) : null}
    </>
  );
}

function OrganizationSetupPage() {
  const [tab, setTab] = useState('leaveTypes');
  const [companyForm, setCompanyForm] = useState({ name: '', address: '', phone: '', email: '' });
  const [branches, setBranches] = useState([]);
  const [org, setOrg] = useState(normalizeOrgSetup({}));
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [panel, setPanel] = useState(null);
  const [listSearch, setListSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/company');
      const c = data.company;
      if (c) {
        setCompanyForm({
          name: c.name || '',
          address: c.address || '',
          phone: c.phone || '',
          email: c.email || '',
        });
        setBranches(normalizeBranchesFromApi(c.branches));
        setOrg(normalizeOrgSetup(c));
      } else {
        setBranches([]);
        setOrg(normalizeOrgSetup({}));
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to load organization.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setListSearch('');
    setStatusFilter('all');
    setPanel(null);
    setMessage('');
  }, [tab]);

  const persistOrgSlice = async (slice, body) => {
    setSavingKey(slice);
    setMessage('');
    setError('');
    try {
      await apiClient.put('/company', { orgSetup: { [slice]: body } });
      setMessage('Saved.');
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to save.');
    } finally {
      setSavingKey('');
    }
  };

  const persistBranches = async (cleaned) => {
    setSavingKey('branches');
    setMessage('');
    setError('');
    try {
      await apiClient.put('/company', { ...companyForm, branches: cleaned });
      setMessage('Branches saved.');
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to save branches.');
    } finally {
      setSavingKey('');
    }
  };

  const saving = useMemo(() => Boolean(savingKey), [savingKey]);

  const term = listSearch.trim().toLowerCase();

  const filteredLeaveTypes = useMemo(() => {
    return org.leaveTypes
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => matchesStatus(r.isActive, statusFilter))
      .filter(({ r }) => {
        if (!term) return true;
        const hay = [r.name, r.applicableTo, String(r.annualDays), r.carryForward ? 'carry' : '', r.paidLeave ? 'paid' : 'unpaid']
          .join(' ')
          .toLowerCase();
        return hay.includes(term);
      });
  }, [org.leaveTypes, statusFilter, term]);

  const filteredDesignations = useMemo(() => {
    return org.designations
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => matchesStatus(r.isActive, statusFilter))
      .filter(({ r }) => (!term ? true : String(r.name || '').toLowerCase().includes(term)));
  }, [org.designations, statusFilter, term]);

  const filteredDepartments = useMemo(() => {
    return org.departments
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => matchesStatus(r.isActive, statusFilter))
      .filter(({ r }) => (!term ? true : String(r.name || '').toLowerCase().includes(term)));
  }, [org.departments, statusFilter, term]);

  const filteredEmploymentTypes = useMemo(() => {
    return org.employmentTypes
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => matchesStatus(r.isActive, statusFilter))
      .filter(({ r }) => {
        if (!term) return true;
        const hay = `${r.name} ${r.description || ''}`.toLowerCase();
        return hay.includes(term);
      });
  }, [org.employmentTypes, statusFilter, term]);

  const filteredExpenseCategories = useMemo(() => {
    return org.expenseCategories
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => matchesStatus(r.isActive, statusFilter))
      .filter(({ r }) => {
        if (!term) return true;
        const hay = `${r.name} ${r.iconKey} ${r.budgetAmount}`.toLowerCase();
        return hay.includes(term);
      });
  }, [org.expenseCategories, statusFilter, term]);

  const filteredBranchesCount = useMemo(() => {
    if (!term) return branches.length;
    return branches.filter((b) =>
      [b.name, b.code, b.address, b.phone]
        .join(' ')
        .toLowerCase()
        .includes(term),
    ).length;
  }, [branches, term]);

  const openLeavePanel = (index) => {
    const row =
      index >= 0
        ? { ...org.leaveTypes[index] }
        : { name: '', annualDays: 12, carryForward: false, paidLeave: true, applicableTo: 'All', isActive: true };
    setError('');
    setPanel({ type: 'leave', index, draft: row });
  };

  const saveLeavePanel = () => {
    if (!panel || panel.type !== 'leave') return;
    const d = panel.draft;
    if (!String(d.name || '').trim()) {
      setError('Leave type name is required.');
      return;
    }
    const next = [...org.leaveTypes];
    const row = {
      _id: d._id || '',
      name: String(d.name).trim(),
      annualDays: Math.max(0, Number(d.annualDays) || 0),
      carryForward: Boolean(d.carryForward),
      paidLeave: d.paidLeave !== false,
      applicableTo: String(d.applicableTo || 'All').trim() || 'All',
      isActive: d.isActive !== false,
    };
    if (panel.index >= 0) next[panel.index] = row;
    else next.push(row);
    setPanel(null);
    persistOrgSlice('leaveTypes', next);
  };

  const openNamedPanel = (type, index, empty) => {
    const list = org[type];
    const row = index >= 0 ? { ...list[index] } : { ...empty };
    setError('');
    setPanel({ type, index, draft: row });
  };

  const saveNamedPanel = () => {
    if (!panel || !['designations', 'departments'].includes(panel.type)) return;
    const d = panel.draft;
    if (!String(d.name || '').trim()) {
      setError('Name is required.');
      return;
    }
    const key = panel.type;
    const next = [...org[key]];
    const row = { _id: d._id || '', name: String(d.name).trim(), isActive: d.isActive !== false };
    if (panel.index >= 0) next[panel.index] = row;
    else next.push(row);
    setPanel(null);
    persistOrgSlice(key, next);
  };

  const openEmploymentPanel = (index) => {
    const row = index >= 0 ? { ...org.employmentTypes[index] } : { name: '', description: '', isActive: true };
    setError('');
    setPanel({ type: 'employmentTypes', index, draft: row });
  };

  const saveEmploymentPanel = () => {
    if (!panel || panel.type !== 'employmentTypes') return;
    const d = panel.draft;
    if (!String(d.name || '').trim()) {
      setError('Name is required.');
      return;
    }
    const next = [...org.employmentTypes];
    const row = {
      _id: d._id || '',
      name: String(d.name).trim(),
      description: String(d.description || '').trim(),
      isActive: d.isActive !== false,
    };
    if (panel.index >= 0) next[panel.index] = row;
    else next.push(row);
    setPanel(null);
    persistOrgSlice('employmentTypes', next);
  };

  const openExpensePanel = (index) => {
    const row = index >= 0 ? { ...org.expenseCategories[index] } : { name: '', budgetAmount: 0, iconKey: 'receipt', isActive: true };
    setError('');
    setPanel({ type: 'expenseCategories', index, draft: row });
  };

  const saveExpensePanel = () => {
    if (!panel || panel.type !== 'expenseCategories') return;
    const d = panel.draft;
    if (!String(d.name || '').trim()) {
      setError('Category name is required.');
      return;
    }
    const next = [...org.expenseCategories];
    const row = {
      _id: d._id || '',
      name: String(d.name).trim(),
      budgetAmount: Math.max(0, Number(d.budgetAmount) || 0),
      iconKey: String(d.iconKey || 'receipt'),
      isActive: d.isActive !== false,
    };
    if (panel.index >= 0) next[panel.index] = row;
    else next.push(row);
    setPanel(null);
    persistOrgSlice('expenseCategories', next);
  };

  const deleteLeave = (index) => {
    if (!window.confirm('Delete this leave type?')) return;
    const next = org.leaveTypes.filter((_, i) => i !== index);
    persistOrgSlice('leaveTypes', next);
  };

  const deleteNamed = (key, index, label) => {
    if (!window.confirm(`Delete this ${label}?`)) return;
    const next = org[key].filter((_, i) => i !== index);
    persistOrgSlice(key, next);
  };

  const toggleLeaveActive = (index, on) => {
    const next = org.leaveTypes.map((r, i) => (i === index ? { ...r, isActive: on } : r));
    persistOrgSlice('leaveTypes', next);
  };

  const toggleNamedActive = (key, index, on) => {
    const next = org[key].map((r, i) => (i === index ? { ...r, isActive: on } : r));
    persistOrgSlice(key, next);
  };

  const closePanel = () => {
    setPanel(null);
  };

  const panelTitle =
    panel?.type === 'leave'
      ? panel.index >= 0
        ? 'Edit leave type'
        : 'Add leave type'
      : panel?.type === 'designations'
        ? panel.index >= 0
          ? 'Edit designation'
          : 'Add designation'
        : panel?.type === 'departments'
          ? panel.index >= 0
            ? 'Edit department'
            : 'Add department'
          : panel?.type === 'employmentTypes'
            ? panel.index >= 0
              ? 'Edit employment type'
              : 'Add employment type'
            : panel?.type === 'expenseCategories'
              ? panel.index >= 0
                ? 'Edit expense category'
                : 'Add expense category'
              : '';

  return (
    <section className="min-w-0 max-w-full space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-dark">Organization setup</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure catalogs for leave, roles alignment, expenses, and branches. Company profile and password stay
          under Settings.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setError('');
              setTab(t.id);
            }}
            className={clsx(
              'flex min-w-[8.5rem] flex-shrink-0 flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-xs font-bold transition sm:min-w-[9.5rem] sm:flex-row sm:px-4 sm:text-sm',
              tab === t.id
                ? 'border-primary bg-primary/15 text-dark shadow-sm'
                : 'border-neutral-200/90 bg-white text-slate-600 hover:border-neutral-300',
            )}
          >
            <TabIcon name={t.icon} />
            <span className="text-center leading-tight">{t.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flux-card p-6 shadow-panel-lg">
          <LocationLoadingIndicator label="Loading organization…" className="py-6" />
        </div>
      ) : (
        <>
          {tab === 'leaveTypes' && (
            <div className="flux-card min-w-0 overflow-hidden p-4 shadow-panel-lg">
              {error && <p className="alert-error mb-3">{error}</p>}
              {message && <p className="alert-success mb-3">{message}</p>}
              <ListToolbar
                title="All leave types"
                subtitle="Annual allocation, carry rules, and applicability."
                addLabel="Add leave type"
                onAdd={() => openLeavePanel(-1)}
                searchValue={listSearch}
                onSearchChange={setListSearch}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                shown={filteredLeaveTypes.length}
                total={org.leaveTypes.length}
                saving={saving}
              />
              <div className="space-y-3 md:hidden">
                {filteredLeaveTypes.map(({ r, i }) => (
                  <div
                    key={r._id || `lt-${i}`}
                    className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-dark">{r.name}</p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {r.annualDays} days · {r.carryForward ? 'Carry' : 'No carry'} · {r.paidLeave ? 'Paid' : 'Unpaid'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Applies to: {r.applicableTo}</p>
                      </div>
                      <StatusToggle
                        checked={r.isActive}
                        onToggle={() => toggleLeaveActive(i, !r.isActive)}
                        disabled={saving}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-neutral-100 pt-3">
                      <IconEdit onClick={() => openLeavePanel(i)} disabled={saving} />
                      <IconDelete onClick={() => deleteLeave(i)} disabled={saving} />
                    </div>
                  </div>
                ))}
                {!filteredLeaveTypes.length && (
                  <p className="rounded-xl border border-dashed border-neutral-200 py-8 text-center text-sm text-slate-500">
                    {org.leaveTypes.length ? 'No leave types match filters.' : 'No leave types yet. Add your first row.'}
                  </p>
                )}
              </div>

              <div className="hidden min-w-0 md:block">
                <div className="overflow-x-auto overscroll-x-contain rounded-lg border border-neutral-100 [-webkit-overflow-scrolling:touch]">
                  <table className="min-w-[44rem] w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="w-10 px-2 py-2">#</th>
                        <th className="px-2 py-2">Leave type</th>
                        <th className="px-2 py-2">Annual</th>
                        <th className="px-2 py-2">Carry</th>
                        <th className="px-2 py-2">Paid</th>
                        <th className="px-2 py-2">Applicable</th>
                        <th className="whitespace-nowrap px-2 py-2">Status</th>
                        <th className="whitespace-nowrap px-2 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeaveTypes.map(({ r, i }, idx) => (
                        <tr key={r._id || `lt-${i}`} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-2 py-2 text-slate-500">{idx + 1}</td>
                          <td className="px-2 py-2 font-medium text-dark">{r.name}</td>
                          <td className="px-2 py-2">{r.annualDays}</td>
                          <td className="px-2 py-2">{r.carryForward ? 'Yes' : 'No'}</td>
                          <td className="px-2 py-2">{r.paidLeave ? 'Yes' : 'No'}</td>
                          <td className="max-w-[10rem] truncate px-2 py-2 text-slate-700" title={r.applicableTo}>
                            {r.applicableTo}
                          </td>
                          <td className="px-2 py-2">
                            <StatusToggle
                              checked={r.isActive}
                              onToggle={() => toggleLeaveActive(i, !r.isActive)}
                              disabled={saving}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-2">
                              <IconEdit onClick={() => openLeavePanel(i)} disabled={saving} />
                              <IconDelete onClick={() => deleteLeave(i)} disabled={saving} />
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!filteredLeaveTypes.length && (
                        <tr>
                          <td colSpan={8} className="py-4 text-center text-slate-500">
                            {org.leaveTypes.length ? 'No leave types match filters.' : 'No leave types yet.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'designations' && (
            <div className="flux-card min-w-0 overflow-hidden p-4 shadow-panel-lg">
              {error && <p className="alert-error mb-3">{error}</p>}
              {message && <p className="alert-success mb-3">{message}</p>}
              <ListToolbar
                title="All designations"
                subtitle="Job titles for reporting and HR alignment."
                addLabel="Add designation"
                onAdd={() => openNamedPanel('designations', -1, { name: '', isActive: true })}
                searchValue={listSearch}
                onSearchChange={setListSearch}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                shown={filteredDesignations.length}
                total={org.designations.length}
                saving={saving}
              />
              <div className="space-y-3 md:hidden">
                {filteredDesignations.map(({ r, i }) => (
                  <div key={r._id || `d-${i}`} className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-dark">{r.name}</p>
                      <StatusToggle
                        checked={r.isActive}
                        onToggle={() => toggleNamedActive('designations', i, !r.isActive)}
                        disabled={saving}
                      />
                    </div>
                    <div className="mt-3 flex justify-end gap-2 border-t border-neutral-100 pt-3">
                      <IconEdit onClick={() => openNamedPanel('designations', i, {})} disabled={saving} />
                      <IconDelete onClick={() => deleteNamed('designations', i, 'designation')} disabled={saving} />
                    </div>
                  </div>
                ))}
                {!filteredDesignations.length && (
                  <p className="rounded-xl border border-dashed border-neutral-200 py-8 text-center text-sm text-slate-500">
                    {org.designations.length ? 'No rows match filters.' : 'No designations yet.'}
                  </p>
                )}
              </div>
              <div className="hidden md:block">
                <div className="overflow-x-auto overscroll-x-contain rounded-lg border border-neutral-100">
                  <table className="min-w-[28rem] w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="w-10 px-2 py-2">#</th>
                        <th className="px-2 py-2">Name</th>
                        <th className="whitespace-nowrap px-2 py-2">Status</th>
                        <th className="whitespace-nowrap px-2 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDesignations.map(({ r, i }, idx) => (
                        <tr key={r._id || `d-${i}`} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-2 py-2 text-slate-500">{idx + 1}</td>
                          <td className="px-2 py-2 font-medium text-dark">{r.name}</td>
                          <td className="px-2 py-2">
                            <StatusToggle
                              checked={r.isActive}
                              onToggle={() => toggleNamedActive('designations', i, !r.isActive)}
                              disabled={saving}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-2">
                              <IconEdit onClick={() => openNamedPanel('designations', i, {})} disabled={saving} />
                              <IconDelete onClick={() => deleteNamed('designations', i, 'designation')} disabled={saving} />
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!filteredDesignations.length && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-500">
                            {org.designations.length ? 'No rows match filters.' : 'No designations yet.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'departments' && (
            <div className="flux-card min-w-0 overflow-hidden p-4 shadow-panel-lg">
              {error && <p className="alert-error mb-3">{error}</p>}
              {message && <p className="alert-success mb-3">{message}</p>}
              <ListToolbar
                title="All departments"
                subtitle="Organize users and approvals by department."
                addLabel="Add department"
                onAdd={() => openNamedPanel('departments', -1, { name: '', isActive: true })}
                searchValue={listSearch}
                onSearchChange={setListSearch}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                shown={filteredDepartments.length}
                total={org.departments.length}
                saving={saving}
              />
              <div className="space-y-3 md:hidden">
                {filteredDepartments.map(({ r, i }) => (
                  <div key={r._id || `dp-${i}`} className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-dark">{r.name}</p>
                      <StatusToggle
                        checked={r.isActive}
                        onToggle={() => toggleNamedActive('departments', i, !r.isActive)}
                        disabled={saving}
                      />
                    </div>
                    <div className="mt-3 flex justify-end gap-2 border-t border-neutral-100 pt-3">
                      <IconEdit onClick={() => openNamedPanel('departments', i, {})} disabled={saving} />
                      <IconDelete onClick={() => deleteNamed('departments', i, 'department')} disabled={saving} />
                    </div>
                  </div>
                ))}
                {!filteredDepartments.length && (
                  <p className="rounded-xl border border-dashed border-neutral-200 py-8 text-center text-sm text-slate-500">
                    {org.departments.length ? 'No rows match filters.' : 'No departments yet.'}
                  </p>
                )}
              </div>
              <div className="hidden md:block">
                <div className="overflow-x-auto overscroll-x-contain rounded-lg border border-neutral-100">
                  <table className="min-w-[28rem] w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="w-10 px-2 py-2">#</th>
                        <th className="px-2 py-2">Name</th>
                        <th className="whitespace-nowrap px-2 py-2">Status</th>
                        <th className="whitespace-nowrap px-2 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDepartments.map(({ r, i }, idx) => (
                        <tr key={r._id || `dp-${i}`} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-2 py-2 text-slate-500">{idx + 1}</td>
                          <td className="px-2 py-2 font-medium text-dark">{r.name}</td>
                          <td className="px-2 py-2">
                            <StatusToggle
                              checked={r.isActive}
                              onToggle={() => toggleNamedActive('departments', i, !r.isActive)}
                              disabled={saving}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-2">
                              <IconEdit onClick={() => openNamedPanel('departments', i, {})} disabled={saving} />
                              <IconDelete onClick={() => deleteNamed('departments', i, 'department')} disabled={saving} />
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!filteredDepartments.length && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-500">
                            {org.departments.length ? 'No rows match filters.' : 'No departments yet.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'employmentTypes' && (
            <div className="flux-card min-w-0 overflow-hidden p-4 shadow-panel-lg">
              {error && <p className="alert-error mb-3">{error}</p>}
              {message && <p className="alert-success mb-3">{message}</p>}
              <ListToolbar
                title="All employment types"
                subtitle="Contract, permanent, intern, and other labels."
                addLabel="Add employment type"
                onAdd={() => openEmploymentPanel(-1)}
                searchValue={listSearch}
                onSearchChange={setListSearch}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                shown={filteredEmploymentTypes.length}
                total={org.employmentTypes.length}
                saving={saving}
              />
              <div className="space-y-3 md:hidden">
                {filteredEmploymentTypes.map(({ r, i }) => (
                  <div key={r._id || `et-${i}`} className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-dark">{r.name}</p>
                        <p className="mt-1 text-xs text-slate-600">{r.description || '—'}</p>
                      </div>
                      <StatusToggle
                        checked={r.isActive}
                        onToggle={() => toggleNamedActive('employmentTypes', i, !r.isActive)}
                        disabled={saving}
                      />
                    </div>
                    <div className="mt-3 flex justify-end gap-2 border-t border-neutral-100 pt-3">
                      <IconEdit onClick={() => openEmploymentPanel(i)} disabled={saving} />
                      <IconDelete onClick={() => deleteNamed('employmentTypes', i, 'employment type')} disabled={saving} />
                    </div>
                  </div>
                ))}
                {!filteredEmploymentTypes.length && (
                  <p className="rounded-xl border border-dashed border-neutral-200 py-8 text-center text-sm text-slate-500">
                    {org.employmentTypes.length ? 'No rows match filters.' : 'No employment types yet.'}
                  </p>
                )}
              </div>
              <div className="hidden md:block">
                <div className="overflow-x-auto overscroll-x-contain rounded-lg border border-neutral-100">
                  <table className="min-w-[36rem] w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="w-10 px-2 py-2">#</th>
                        <th className="px-2 py-2">Name</th>
                        <th className="min-w-[10rem] px-2 py-2">Description</th>
                        <th className="whitespace-nowrap px-2 py-2">Status</th>
                        <th className="whitespace-nowrap px-2 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmploymentTypes.map(({ r, i }, idx) => (
                        <tr key={r._id || `et-${i}`} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-2 py-2 text-slate-500">{idx + 1}</td>
                          <td className="px-2 py-2 font-medium text-dark">{r.name}</td>
                          <td className="max-w-[16rem] truncate px-2 py-2 text-slate-700" title={r.description}>
                            {r.description || '—'}
                          </td>
                          <td className="px-2 py-2">
                            <StatusToggle
                              checked={r.isActive}
                              onToggle={() => toggleNamedActive('employmentTypes', i, !r.isActive)}
                              disabled={saving}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-2">
                              <IconEdit onClick={() => openEmploymentPanel(i)} disabled={saving} />
                              <IconDelete onClick={() => deleteNamed('employmentTypes', i, 'employment type')} disabled={saving} />
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!filteredEmploymentTypes.length && (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-500">
                            {org.employmentTypes.length ? 'No rows match filters.' : 'No employment types yet.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'expenseCategories' && (
            <div className="flux-card min-w-0 overflow-hidden p-4 shadow-panel-lg">
              {error && <p className="alert-error mb-3">{error}</p>}
              {message && <p className="alert-success mb-3">{message}</p>}
              <ListToolbar
                title="All expense categories"
                subtitle="Categories and optional budget hints (₹)."
                addLabel="Add category"
                onAdd={() => openExpensePanel(-1)}
                searchValue={listSearch}
                onSearchChange={setListSearch}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                shown={filteredExpenseCategories.length}
                total={org.expenseCategories.length}
                saving={saving}
              />
              <div className="space-y-3 md:hidden">
                {filteredExpenseCategories.map(({ r, i }) => (
                  <div key={r._id || `ex-${i}`} className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-dark">{r.name}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {r.iconKey} · ₹{r.budgetAmount}
                        </p>
                      </div>
                      <StatusToggle
                        checked={r.isActive}
                        onToggle={() => toggleNamedActive('expenseCategories', i, !r.isActive)}
                        disabled={saving}
                      />
                    </div>
                    <div className="mt-3 flex justify-end gap-2 border-t border-neutral-100 pt-3">
                      <IconEdit onClick={() => openExpensePanel(i)} disabled={saving} />
                      <IconDelete onClick={() => deleteNamed('expenseCategories', i, 'category')} disabled={saving} />
                    </div>
                  </div>
                ))}
                {!filteredExpenseCategories.length && (
                  <p className="rounded-xl border border-dashed border-neutral-200 py-8 text-center text-sm text-slate-500">
                    {org.expenseCategories.length ? 'No rows match filters.' : 'No expense categories yet.'}
                  </p>
                )}
              </div>
              <div className="hidden md:block">
                <div className="overflow-x-auto overscroll-x-contain rounded-lg border border-neutral-100">
                  <table className="min-w-[34rem] w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="w-10 px-2 py-2">#</th>
                        <th className="px-2 py-2">Category</th>
                        <th className="px-2 py-2">Icon</th>
                        <th className="px-2 py-2">Budget (₹)</th>
                        <th className="whitespace-nowrap px-2 py-2">Status</th>
                        <th className="whitespace-nowrap px-2 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenseCategories.map(({ r, i }, idx) => (
                        <tr key={r._id || `ex-${i}`} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-2 py-2 text-slate-500">{idx + 1}</td>
                          <td className="px-2 py-2 font-medium text-dark">{r.name}</td>
                          <td className="px-2 py-2 capitalize text-slate-700">{r.iconKey}</td>
                          <td className="px-2 py-2">{r.budgetAmount}</td>
                          <td className="px-2 py-2">
                            <StatusToggle
                              checked={r.isActive}
                              onToggle={() => toggleNamedActive('expenseCategories', i, !r.isActive)}
                              disabled={saving}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-2">
                              <IconEdit onClick={() => openExpensePanel(i)} disabled={saving} />
                              <IconDelete onClick={() => deleteNamed('expenseCategories', i, 'category')} disabled={saving} />
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!filteredExpenseCategories.length && (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-500">
                            {org.expenseCategories.length ? 'No rows match filters.' : 'No expense categories yet.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'branches' && (
            <div className="flux-card min-w-0 overflow-hidden p-4 shadow-panel-lg">
              {error && <p className="alert-error mb-3">{error}</p>}
              {message && <p className="alert-success mb-3">{message}</p>}
              <ListToolbar
                title="All branches"
                subtitle="Offices or sites; link geofences and users to these IDs."
                addLabel="Add branch"
                onAdd={() =>
                  setBranches((rows) => [...rows, { _id: '', name: '', code: '', address: '', phone: '' }])
                }
                searchValue={listSearch}
                onSearchChange={setListSearch}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                hideStatus
                shown={filteredBranchesCount}
                total={branches.length}
                saving={saving}
              />
              <BranchesEditor
                branches={branches}
                setBranches={setBranches}
                loading={false}
                saving={savingKey === 'branches'}
                onSave={persistBranches}
                searchQuery={listSearch}
                showAddButton={false}
              />
            </div>
          )}

          {tab === 'geofencing' && (
            <div className="flux-card min-w-0 overflow-hidden p-4 shadow-panel-lg">
              {error && <p className="alert-error mb-3">{error}</p>}
              {message && <p className="alert-success mb-3">{message}</p>}
              <ListToolbar
                title="Geo fencing"
                subtitle="Manage circular zones per branch in the dedicated workspace."
                hideSearch
                hideStatus
                shown={0}
                total={0}
                saving={false}
                searchValue=""
                onSearchChange={() => {}}
                statusFilter="all"
                onStatusChange={() => {}}
                trailing={
                  <Link
                    to="/dashboard/operations/geofences"
                    className="btn-primary inline-flex items-center justify-center gap-2"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <circle cx="12" cy="12" r="3" />
                      <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
                    </svg>
                    Open geofences
                  </Link>
                }
              />
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
                <li>Pick a branch, search an address, and draw the attendance zone on the map.</li>
                <li>Use the row toggle so inactive fences are ignored in the field app.</li>
                <li>Assign users to the same branch under Users so the correct fence applies.</li>
              </ul>
            </div>
          )}
        </>
      )}

      <SlideOverPanel
        open={Boolean(panel)}
        onClose={closePanel}
        title={panelTitle}
        description="Changes save to your company workspace."
      >
        {panel?.type === 'leave' && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveLeavePanel();
            }}
          >
            <div className="form-field">
              <label className="form-label-muted">Name</label>
              <input
                className="form-input"
                value={panel.draft.name}
                onChange={(e) => setPanel((p) => ({ ...p, draft: { ...p.draft, name: e.target.value } }))}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label-muted">Annual days</label>
              <input
                type="number"
                min={0}
                className="form-input"
                value={panel.draft.annualDays}
                onChange={(e) => setPanel((p) => ({ ...p, draft: { ...p.draft, annualDays: e.target.value } }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label-muted">Applicable to</label>
              <input
                className="form-input"
                value={panel.draft.applicableTo}
                onChange={(e) => setPanel((p) => ({ ...p, draft: { ...p.draft, applicableTo: e.target.value } }))}
                placeholder="All"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200/80 bg-flux-panel px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={panel.draft.carryForward}
                onChange={(e) => setPanel((p) => ({ ...p, draft: { ...p.draft, carryForward: e.target.checked } }))}
                className="form-checkbox"
              />
              Carry forward
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200/80 bg-flux-panel px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={panel.draft.paidLeave}
                onChange={(e) => setPanel((p) => ({ ...p, draft: { ...p.draft, paidLeave: e.target.checked } }))}
                className="form-checkbox"
              />
              Paid leave
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200/80 bg-flux-panel px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={panel.draft.isActive}
                onChange={(e) => setPanel((p) => ({ ...p, draft: { ...p.draft, isActive: e.target.checked } }))}
                className="form-checkbox"
              />
              Active
            </label>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="btn-secondary" onClick={closePanel}>
                Cancel
              </button>
              <button type="submit" className="btn-primary disabled:cursor-not-allowed" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {(panel?.type === 'designations' || panel?.type === 'departments') && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveNamedPanel();
            }}
          >
            <div className="form-field">
              <label className="form-label-muted">Name</label>
              <input
                className="form-input"
                value={panel.draft.name}
                onChange={(e) => setPanel((p) => ({ ...p, draft: { ...p.draft, name: e.target.value } }))}
                required
              />
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200/80 bg-flux-panel px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={panel.draft.isActive}
                onChange={(e) => setPanel((p) => ({ ...p, draft: { ...p.draft, isActive: e.target.checked } }))}
                className="form-checkbox"
              />
              Active
            </label>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="btn-secondary" onClick={closePanel}>
                Cancel
              </button>
              <button type="submit" className="btn-primary disabled:cursor-not-allowed" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {panel?.type === 'employmentTypes' && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveEmploymentPanel();
            }}
          >
            <div className="form-field">
              <label className="form-label-muted">Name</label>
              <input
                className="form-input"
                value={panel.draft.name}
                onChange={(e) => setPanel((p) => ({ ...p, draft: { ...p.draft, name: e.target.value } }))}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label-muted">Description</label>
              <textarea
                className="form-input min-h-[5rem]"
                value={panel.draft.description}
                onChange={(e) => setPanel((p) => ({ ...p, draft: { ...p.draft, description: e.target.value } }))}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200/80 bg-flux-panel px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={panel.draft.isActive}
                onChange={(e) => setPanel((p) => ({ ...p, draft: { ...p.draft, isActive: e.target.checked } }))}
                className="form-checkbox"
              />
              Active
            </label>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="btn-secondary" onClick={closePanel}>
                Cancel
              </button>
              <button type="submit" className="btn-primary disabled:cursor-not-allowed" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {panel?.type === 'expenseCategories' && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveExpensePanel();
            }}
          >
            <div className="form-field">
              <label className="form-label-muted">Name</label>
              <input
                className="form-input"
                value={panel.draft.name}
                onChange={(e) => setPanel((p) => ({ ...p, draft: { ...p.draft, name: e.target.value } }))}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label-muted">Budget amount (₹)</label>
              <input
                type="number"
                min={0}
                className="form-input"
                value={panel.draft.budgetAmount}
                onChange={(e) => setPanel((p) => ({ ...p, draft: { ...p.draft, budgetAmount: e.target.value } }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label-muted">Icon</label>
              <select
                className="form-input"
                value={panel.draft.iconKey}
                onChange={(e) => setPanel((p) => ({ ...p, draft: { ...p.draft, iconKey: e.target.value } }))}
              >
                {EXPENSE_ICON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200/80 bg-flux-panel px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={panel.draft.isActive}
                onChange={(e) => setPanel((p) => ({ ...p, draft: { ...p.draft, isActive: e.target.checked } }))}
                className="form-checkbox"
              />
              Active
            </label>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="btn-secondary" onClick={closePanel}>
                Cancel
              </button>
              <button type="submit" className="btn-primary disabled:cursor-not-allowed" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </SlideOverPanel>
    </section>
  );
}

export default OrganizationSetupPage;
