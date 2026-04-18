const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
  },
  { _id: true, id: true },
);

const orgLeaveTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    annualDays: { type: Number, default: 0 },
    carryForward: { type: Boolean, default: false },
    paidLeave: { type: Boolean, default: true },
    applicableTo: { type: String, trim: true, default: 'All' },
    isActive: { type: Boolean, default: true },
  },
  { _id: true, id: true },
);

const orgNamedToggleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: true, id: true },
);

const orgEmploymentTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { _id: true, id: true },
);

const orgExpenseCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    budgetAmount: { type: Number, default: 0 },
    iconKey: { type: String, trim: true, default: 'receipt' },
    isActive: { type: Boolean, default: true },
  },
  { _id: true, id: true },
);

const orgSetupSchema = new mongoose.Schema(
  {
    leaveTypes: { type: [orgLeaveTypeSchema], default: [] },
    designations: { type: [orgNamedToggleSchema], default: [] },
    departments: { type: [orgNamedToggleSchema], default: [] },
    employmentTypes: { type: [orgEmploymentTypeSchema], default: [] },
    expenseCategories: { type: [orgExpenseCategorySchema], default: [] },
  },
  { _id: false, id: false },
);

const companySchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, unique: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    branches: { type: [branchSchema], default: [] },
    orgSetup: { type: orgSetupSchema, default: () => ({}) },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Company', companySchema);
