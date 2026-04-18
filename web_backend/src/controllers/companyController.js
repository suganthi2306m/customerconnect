const mongoose = require('mongoose');
const Company = require('../models/Company');
const Admin = require('../models/Admin');

function withOptionalSubId(row, id) {
  if (id && mongoose.Types.ObjectId.isValid(String(id))) {
    return { ...row, _id: new mongoose.Types.ObjectId(String(id)) };
  }
  return row;
}

function normalizeLeaveTypes(items) {
  return (Array.isArray(items) ? items : [])
    .filter((x) => x && String(x.name || '').trim())
    .map((x) =>
      withOptionalSubId(
        {
          name: String(x.name).trim(),
          annualDays: Math.max(0, Number(x.annualDays) || 0),
          carryForward: Boolean(x.carryForward),
          paidLeave: x.paidLeave !== false,
          applicableTo: String(x.applicableTo || 'All').trim() || 'All',
          isActive: x.isActive !== false,
        },
        x._id,
      ),
    );
}

function normalizeNamedToggle(items) {
  return (Array.isArray(items) ? items : [])
    .filter((x) => x && String(x.name || '').trim())
    .map((x) =>
      withOptionalSubId(
        {
          name: String(x.name).trim(),
          isActive: x.isActive !== false,
        },
        x._id,
      ),
    );
}

function normalizeEmploymentTypes(items) {
  return (Array.isArray(items) ? items : [])
    .filter((x) => x && String(x.name || '').trim())
    .map((x) =>
      withOptionalSubId(
        {
          name: String(x.name).trim(),
          description: String(x.description || '').trim(),
          isActive: x.isActive !== false,
        },
        x._id,
      ),
    );
}

function normalizeExpenseCategories(items) {
  return (Array.isArray(items) ? items : [])
    .filter((x) => x && String(x.name || '').trim())
    .map((x) =>
      withOptionalSubId(
        {
          name: String(x.name).trim(),
          budgetAmount: Math.max(0, Number(x.budgetAmount) || 0),
          iconKey: String(x.iconKey || 'receipt').trim() || 'receipt',
          isActive: x.isActive !== false,
        },
        x._id,
      ),
    );
}

async function getCompany(req, res, next) {
  try {
    const company = await Company.findOne({ adminId: req.admin._id });
    return res.json({ company });
  } catch (error) {
    return next(error);
  }
}

async function upsertCompany(req, res, next) {
  try {
    const existing = await Company.findOne({ adminId: req.admin._id }).lean();

    const core = {};
    for (const k of ['name', 'address', 'phone', 'email']) {
      if (req.body[k] !== undefined) core[k] = req.body[k];
      else if (existing && existing[k] != null) core[k] = existing[k];
    }

    if (!existing) {
      const missing = ['name', 'address', 'phone', 'email'].filter((k) => !String(core[k] || '').trim());
      if (missing.length) {
        return res.status(400).json({
          message: 'Company name, address, phone, and email are required for first-time setup.',
          missing,
        });
      }
    }

    const update = { ...core, adminId: req.admin._id };
    if (Array.isArray(req.body.branches)) {
      update.branches = req.body.branches
        .filter((b) => b && String(b.name || '').trim())
        .map((b) => {
          const row = {
            name: String(b.name).trim(),
            code: String(b.code || '').trim(),
            address: String(b.address || '').trim(),
            phone: String(b.phone || '').trim(),
          };
          if (b._id && mongoose.Types.ObjectId.isValid(String(b._id))) {
            return { ...row, _id: new mongoose.Types.ObjectId(String(b._id)) };
          }
          return row;
        });
    }

    if (req.body.orgSetup != null && typeof req.body.orgSetup === 'object') {
      const prev = (existing && existing.orgSetup) || {};
      const incoming = req.body.orgSetup;
      const next = { ...prev };
      if (incoming.leaveTypes !== undefined) next.leaveTypes = normalizeLeaveTypes(incoming.leaveTypes);
      if (incoming.designations !== undefined) next.designations = normalizeNamedToggle(incoming.designations);
      if (incoming.departments !== undefined) next.departments = normalizeNamedToggle(incoming.departments);
      if (incoming.employmentTypes !== undefined) {
        next.employmentTypes = normalizeEmploymentTypes(incoming.employmentTypes);
      }
      if (incoming.expenseCategories !== undefined) {
        next.expenseCategories = normalizeExpenseCategories(incoming.expenseCategories);
      }
      update.orgSetup = next;
    }

    const company = await Company.findOneAndUpdate({ adminId: req.admin._id }, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    await Admin.findByIdAndUpdate(req.admin._id, { companySetupCompleted: true });
    return res.json({ company });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCompany,
  upsertCompany,
};
