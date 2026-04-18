import { useMemo } from 'react';

function branchMatchesQuery(b, q) {
  const term = String(q || '').trim().toLowerCase();
  if (!term) return true;
  const hay = [b.name, b.code, b.address, b.phone]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(term);
}

function BranchesEditor({ branches, setBranches, loading, saving, onSave, searchQuery = '', showAddButton = true }) {
  const visibleIndices = useMemo(() => {
    if (!String(searchQuery || '').trim()) return branches.map((_, i) => i);
    return branches.map((b, i) => ({ b, i })).filter(({ b }) => branchMatchesQuery(b, searchQuery)).map(({ i }) => i);
  }, [branches, searchQuery]);

  const addBranchRow = () => {
    setBranches((rows) => [...rows, { _id: '', name: '', code: '', address: '', phone: '' }]);
  };

  const updateBranch = (index, key, value) => {
    setBranches((rows) => rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  };

  const removeBranch = (index) => {
    setBranches((rows) => rows.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleaned = branches
      .filter((b) => String(b.name || '').trim())
      .map((b) => ({
        ...(b._id && /^[a-f\d]{24}$/i.test(b._id) ? { _id: b._id } : {}),
        name: String(b.name).trim(),
        code: String(b.code || '').trim(),
        address: String(b.address || '').trim(),
        phone: String(b.phone || '').trim(),
      }));
    await onSave(cleaned);
  };

  if (loading) {
    return <p className="mt-6 text-sm text-slate-500">Loading…</p>;
  }

  const hasRows = branches.length > 0;
  const noVisible = hasRows && visibleIndices.length === 0;

  return (
    <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
      <div className="overflow-x-auto overscroll-x-contain rounded-lg border border-neutral-100 [-webkit-overflow-scrolling:touch]">
        <table className="min-w-[36rem] w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Code</th>
              <th className="min-w-[12rem] px-3 py-2">Address</th>
              <th className="px-3 py-2">Phone</th>
              <th className="w-28 px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleIndices.map((i) => {
              const b = branches[i];
              return (
                <tr key={b._id || `new-${i}`} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-2">
                    <input
                      className="form-input py-1.5 text-sm"
                      value={b.name}
                      onChange={(e) => updateBranch(i, 'name', e.target.value)}
                      placeholder="Branch name"
                      required
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className="form-input py-1.5 text-sm"
                      value={b.code}
                      onChange={(e) => updateBranch(i, 'code', e.target.value)}
                      placeholder="Code"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className="form-input py-1.5 text-sm"
                      value={b.address}
                      onChange={(e) => updateBranch(i, 'address', e.target.value)}
                      placeholder="Address"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className="form-input py-1.5 text-sm"
                      value={b.phone}
                      onChange={(e) => updateBranch(i, 'phone', e.target.value)}
                      placeholder="Phone"
                    />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-primary bg-primary/10 text-dark hover:bg-primary/20"
                      title="Remove branch"
                      onClick={() => removeBranch(i)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
            {!hasRows && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                  No branches yet. Add one to enable per-branch geofences.
                </td>
              </tr>
            )}
            {noVisible && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                  No branches match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        {showAddButton ? (
          <button type="button" className="btn-secondary" onClick={addBranchRow}>
            Add branch
          </button>
        ) : null}
        <button type="submit" className="btn-primary disabled:opacity-60" disabled={saving}>
          {saving ? 'Saving…' : 'Save branches'}
        </button>
      </div>
    </form>
  );
}

export default BranchesEditor;
