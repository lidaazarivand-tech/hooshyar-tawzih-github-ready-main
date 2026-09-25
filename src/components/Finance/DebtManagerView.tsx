import React, { useState, useMemo } from 'react';
import { 
  HandCoins, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Search, 
  Filter, 
  Phone, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  CircleDollarSign, 
  Edit3, 
  History, 
  X, 
  Check, 
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Tag
} from 'lucide-react';
import { DebtItem, DebtPayment, ExpenseItem } from '../../types/calendar';
import { 
  toPersianDigits, 
  toEnglishDigits,
  normalizeDateKey,
  formatPrice, 
  makeDateKey 
} from '../../utils/persianNumber';
import { getTodayJalali } from '../../utils/jalali';
import { DatePicker } from '../Common/DatePicker';

interface DebtManagerViewProps {
  debts: DebtItem[];
  onAddDebt: (debt: Omit<DebtItem, 'id' | 'createdAt'>) => void;
  onUpdateDebt: (debt: DebtItem) => void;
  onDeleteDebt: (id: string) => void;
  onAddPayment: (debtId: string, payment: Omit<DebtPayment, 'id' | 'createdAt'>, syncToExpenses: boolean) => void;
  onDeletePayment: (debtId: string, paymentId: string) => void;
  onAddExpense?: (item: Omit<ExpenseItem, 'id'>) => void;
}

const DEBT_CATEGORIES = [
  'قرض‌الحسنه و دوستانه',
  'خرید کالا یا خدمات',
  'حساب دفتری و بازار',
  'امانت و کاری',
  'اجاره و مسکن',
  'دستمزد و حق‌الزحمه',
  'خانوادگی',
  'سایر موارد'
];

export const DebtManagerView: React.FC<DebtManagerViewProps> = ({
  debts,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
  onAddPayment,
  onDeletePayment,
}) => {
  const today = getTodayJalali();
  const todayKey = makeDateKey(today.jy, today.jm, today.jd);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);

  const [type, setType] = useState<'debt' | 'credit'>('credit'); // credit = طلب من از دیگران, debt = بدهی من به دیگران
  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(DEBT_CATEGORIES[0]);
  const [startDate, setStartDate] = useState(todayKey);
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unsettled' | 'settled' | 'credit' | 'debt'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'amountDesc' | 'dueSoon'>('newest');

  // Payment Modal State
  const [paymentModalDebt, setPaymentModalDebt] = useState<DebtItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayKey);
  const [paymentNote, setPaymentNote] = useState('');
  const [syncToExpenses, setSyncToExpenses] = useState(false);

  // History Modal State
  const [historyModalDebt, setHistoryModalDebt] = useState<DebtItem | null>(null);

  // Calculation of Summary Metrics
  const summary = useMemo(() => {
    let totalCredit = 0; // طلب من (دیگران بدهکارند)
    let totalDebt = 0;   // بدهی من (من بدهکارم)
    let totalSettledCredit = 0;
    let totalSettledDebt = 0;
    let unsettledCount = 0;
    let dueSoonCount = 0;

    debts.forEach(d => {
      const remaining = Math.max(0, d.amount - (d.settledAmount || 0));
      if (d.type === 'credit') {
        totalCredit += remaining;
        totalSettledCredit += (d.settledAmount || 0);
      } else {
        totalDebt += remaining;
        totalSettledDebt += (d.settledAmount || 0);
      }

      if (!d.isSettled && remaining > 0) {
        unsettledCount++;
        if (d.dueDate) {
          // If due date is within today or past
          if (d.dueDate <= todayKey) {
            dueSoonCount++;
          }
        }
      }
    });

    const netBalance = totalCredit - totalDebt; // Positive = صافی طلبکاریم, Negative = صافی بدهکاریم

    return {
      totalCredit,
      totalDebt,
      totalSettledCredit,
      totalSettledDebt,
      netBalance,
      unsettledCount,
      dueSoonCount,
      totalCount: debts.length
    };
  }, [debts, todayKey]);

  // Filtered & Sorted Debts
  const filteredDebts = useMemo(() => {
    return debts
      .filter(item => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = item.personName.toLowerCase().includes(q);
          const matchDesc = item.description?.toLowerCase().includes(q);
          const matchPhone = item.phone?.includes(q);
          const matchCat = item.category?.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchPhone && !matchCat) return false;
        }

        // Status Filter
        if (statusFilter === 'credit') return item.type === 'credit';
        if (statusFilter === 'debt') return item.type === 'debt';
        if (statusFilter === 'settled') return item.isSettled;
        if (statusFilter === 'unsettled') return !item.isSettled;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return b.createdAt - a.createdAt;
        if (sortBy === 'amountDesc') {
          const remA = a.amount - (a.settledAmount || 0);
          const remB = b.amount - (b.settledAmount || 0);
          return remB - remA;
        }
        if (sortBy === 'dueSoon') {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        return 0;
      });
  }, [debts, searchQuery, statusFilter, sortBy]);

  // Open Form for Adding
  const handleOpenAdd = () => {
    setEditingDebt(null);
    setType('credit');
    setPersonName('');
    setPhone('');
    setAmount('');
    setCategory(DEBT_CATEGORIES[0]);
    setStartDate(todayKey);
    setDueDate('');
    setDescription('');
    setShowAddForm(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (item: DebtItem) => {
    setEditingDebt(item);
    setType(item.type);
    setPersonName(item.personName);
    setPhone(item.phone || '');
    setAmount(item.amount.toString());
    setCategory(item.category || DEBT_CATEGORIES[0]);
    setStartDate(item.startDate || todayKey);
    setDueDate(item.dueDate || '');
    setDescription(item.description || '');
    setShowAddForm(true);
  };

  // Handle Submit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedAmount = toEnglishDigits(amount.replace(/,/g, ''));
    const numAmount = parseFloat(sanitizedAmount);
    if (!numAmount || numAmount <= 0 || !personName.trim()) return;

    const safeStartDate = normalizeDateKey(startDate) || todayKey;
    const safeDueDate = dueDate.trim() ? (normalizeDateKey(dueDate.trim()) || undefined) : undefined;

    if (editingDebt) {
      const settled = Math.max(0, editingDebt.settledAmount || 0);
      const safeSettled = Math.min(settled, numAmount);
      const isSettled = safeSettled >= numAmount;
      onUpdateDebt({
        ...editingDebt,
        type,
        personName: personName.trim(),
        phone: phone.trim() || undefined,
        amount: numAmount,
        settledAmount: safeSettled,
        isSettled,
        category,
        startDate: safeStartDate,
        dueDate: safeDueDate,
        description: description.trim() || undefined
      });
    } else {
      onAddDebt({
        type,
        personName: personName.trim(),
        phone: phone.trim() || undefined,
        amount: numAmount,
        settledAmount: 0,
        isSettled: false,
        category,
        startDate: safeStartDate,
        dueDate: safeDueDate,
        description: description.trim() || undefined,
        payments: []
      });
    }

    setShowAddForm(false);
    setEditingDebt(null);
  };

  // Handle Direct Full Settle
  const handleToggleFullSettle = (item: DebtItem) => {
    if (item.isSettled) {
      // Re-open debt without losing recorded payment history
      const paymentsSum = (item.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      onUpdateDebt({
        ...item,
        isSettled: false,
        settledAmount: paymentsSum
      });
    } else {
      // Settle in full
      const remaining = Math.max(0, item.amount - (item.settledAmount || 0));
      if (remaining > 0) {
        const newPayment: DebtPayment = {
          id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          amount: remaining,
          dateKey: todayKey,
          note: 'تسویه کامل یکجا',
          createdAt: Date.now()
        };
        onUpdateDebt({
          ...item,
          settledAmount: item.amount,
          isSettled: true,
          payments: [...(item.payments || []), newPayment]
        });
      } else {
        onUpdateDebt({
          ...item,
          isSettled: true,
          settledAmount: item.amount
        });
      }
    }
  };

  // Open Payment Modal
  const handleOpenPaymentModal = (item: DebtItem) => {
    const remaining = Math.max(0, item.amount - (item.settledAmount || 0));
    setPaymentModalDebt(item);
    setPaymentAmount(remaining > 0 ? remaining.toString() : '');
    setPaymentDate(todayKey);
    setPaymentNote('');
    setSyncToExpenses(false);
  };

  // Submit Partial Payment
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalDebt) return;
    const sanitizedAmount = toEnglishDigits(paymentAmount.replace(/,/g, ''));
    const numAmount = parseFloat(sanitizedAmount);
    if (!numAmount || numAmount <= 0) return;

    const remaining = Math.max(0, paymentModalDebt.amount - (paymentModalDebt.settledAmount || 0));
    const validAmount = Math.min(Math.max(0, numAmount), Math.max(0, remaining));
    if (validAmount <= 0) return;

    onAddPayment(
      paymentModalDebt.id,
      {
        amount: validAmount,
        dateKey: normalizeDateKey(paymentDate) || todayKey,
        note: paymentNote.trim() || undefined
      },
      syncToExpenses
    );

    setPaymentModalDebt(null);
  };

  return (
    <div id="debt-manager-section" className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Credit (طلب من از دیگران / بدهکاران به من) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1.5 text-right relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500 rounded-t-3xl" />
          <div className="flex items-center justify-between text-xs text-emerald-700 font-bold">
            <div className="flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>طلب‌های من (بدهکاران به من)</span>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-full font-medium">
              بستانکار هستم
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 pt-1">
            {formatPrice(summary.totalCredit)} <span className="text-xs font-normal text-slate-400">تومان</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>تسویه شده تاکنون:</span>
            <span className="text-emerald-600 font-bold">{formatPrice(summary.totalSettledCredit)} ت</span>
          </div>
        </div>

        {/* Total Debt (بدهی من به دیگران / بستانکاران از من) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1.5 text-right relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-rose-500 rounded-t-3xl" />
          <div className="flex items-center justify-between text-xs text-rose-700 font-bold">
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
              <span>بدهی‌های من (بستانکاران از من)</span>
            </div>
            <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200/60 px-2 py-0.5 rounded-full font-medium">
              بدهکار هستم
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 pt-1">
            {formatPrice(summary.totalDebt)} <span className="text-xs font-normal text-slate-400">تومان</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>پرداخت شده تاکنون:</span>
            <span className="text-rose-600 font-bold">{formatPrice(summary.totalSettledDebt)} ت</span>
          </div>
        </div>

        {/* Net Balance & Overview */}
        <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-xs space-y-1.5 text-right relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
            <div className="flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-400" />
              <span>تراز خالص مطالبات و بدهی</span>
            </div>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-medium">
              {summary.unsettledCount} مورد جاری
            </span>
          </div>
          <div className={`text-xl sm:text-2xl font-black pt-1 ${
            summary.netBalance > 0 ? 'text-emerald-400' : summary.netBalance < 0 ? 'text-rose-400' : 'text-slate-200'
          }`}>
            {summary.netBalance > 0 ? '+' : ''}{formatPrice(summary.netBalance)}{' '}
            <span className="text-xs font-normal text-slate-400">تومان</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>وضعیت نهایی:</span>
            <span className={`font-bold ${summary.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {summary.netBalance > 0 ? 'خالص بستانکار (طلب)' : summary.netBalance < 0 ? 'خالص بدهکار' : 'بی‌حساب و مساوی'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Header & Filters */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">دفتر ثبت بدهی‌ها و مطالبات</h3>
              <p className="text-xs text-slate-500">حساب اشخاص، دوستان، بدهکاران، بستانکاران و اقساط قرض‌الحسنه</p>
            </div>
          </div>

          <button
            id="open-add-debt-btn"
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-2xl text-xs font-black shadow-md shadow-rose-900/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer self-stretch sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت حساب جدید</span>
          </button>
        </div>

        {/* Filter Controls & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام شخص، توضیحات یا شماره تلفن..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3.5 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none placeholder:text-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="all">نمایش: همه حساب‌ها ({toPersianDigits(debts.length)})</option>
              <option value="credit">🟢 فقط طلب‌های من (طلبکارم)</option>
              <option value="debt">🔴 فقط بدهی‌های من (بدهکارم)</option>
              <option value="unsettled">⏳ تسویه‌نشده (جاری)</option>
              <option value="settled">✅ تسویه کامل شده</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="sm:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="newest">مرتب‌سازی: جدیدترین ثبت</option>
              <option value="amountDesc">بیشترین مانده حساب</option>
              <option value="dueSoon">نزدیک‌ترین موعد سررسید</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-rose-600" />
                <span>{editingDebt ? 'ویرایش حساب بدهی/طلب' : 'ثبت حساب بدهی یا طلب جدید'}</span>
              </h3>
              <button
                onClick={() => { setShowAddForm(false); setEditingDebt(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع حساب</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setType('credit')}
                    className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      type === 'credit' 
                        ? 'bg-emerald-600 text-white shadow-md' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>طلب من از شخص (دیگران بدهکارند)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('debt')}
                    className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      type === 'debt' 
                        ? 'bg-rose-600 text-white shadow-md' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>بدهی من به شخص (من بدهکارم)</span>
                  </button>
                </div>
              </div>

              {/* Person Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نام و نام خانوادگی طرف حساب <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="مثال: علی احمدی، فروشگاه رضایی..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شماره تماس / موبایل (اختیاری)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Amount & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    مبلغ کل به تومان <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="مثال: ۵۰۰۰۰۰۰"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  {amount && Number(amount) > 0 && (
                    <div className="text-[11px] text-slate-500 mt-1 font-medium">
                      معادل: <span className="font-bold text-slate-700">{formatPrice(Number(amount))} تومان</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">موضوع و دسته‌بندی</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    {DEBT_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DatePicker
                  label="تاریخ ایجاد / قرض گرفتن"
                  value={startDate}
                  onChange={setStartDate}
                  required
                />

                <DatePicker
                  label="موعد تسویه / سررسید (اختیاری)"
                  value={dueDate}
                  onChange={setDueDate}
                  placeholder="بدون سررسید مشخص"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و بابت (اختیاری)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: بابت خرید قسطی تلویزیون، قرض دوستانه برای رهن..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setEditingDebt(null); }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingDebt ? 'ذخیره تغییرات' : 'ثبت در دفتر حساب'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partial Payment Modal */}
      {paymentModalDebt && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <CircleDollarSign className="w-5 h-5 text-emerald-600" />
                  <span>ثبت پرداخت / وصول وجه</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  طرف حساب: <span className="font-bold text-slate-800">{paymentModalDebt.personName}</span>
                </p>
              </div>
              <button
                onClick={() => setPaymentModalDebt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1 text-right">
              <div className="flex justify-between text-slate-500">
                <span>مبلغ کل حساب:</span>
                <span className="font-bold text-slate-800">{formatPrice(paymentModalDebt.amount)} تومان</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>تسویه شده تاکنون:</span>
                <span className="font-bold text-emerald-600">{formatPrice(paymentModalDebt.settledAmount || 0)} تومان</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200/60 pt-1">
                <span>مانده بدهی/طلب:</span>
                <span className={paymentModalDebt.type === 'credit' ? 'text-emerald-700 font-black' : 'text-rose-700 font-black'}>
                  {formatPrice(Math.max(0, paymentModalDebt.amount - (paymentModalDebt.settledAmount || 0)))} تومان
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مبلغ واریزی جدید (تومان) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="مبلغ واریزی..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                {paymentAmount && Number(paymentAmount) > 0 && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    معادل: <span className="font-bold text-slate-800">{formatPrice(Number(paymentAmount))} تومان</span>
                  </div>
                )}
              </div>

              <DatePicker
                label="تاریخ واریز"
                value={paymentDate}
                onChange={setPaymentDate}
                required
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">یادداشت و بابت (اختیاری)</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="مثال: قسط اول، واریز به کارت، چک..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncToExpenses}
                  onChange={(e) => setSyncToExpenses(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-700">
                  {paymentModalDebt.type === 'credit'
                    ? 'این وصولی همزمان به عنوان درآمد در جدول دخل و خرج ماه هم ثبت شود'
                    : 'این پرداختی همزمان به عنوان هزینه در جدول دخل و خرج ماه هم ثبت شود'}
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalDebt(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>ثبت واریزی</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {historyModalDebt && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <span>تاریخچه واریزی‌های حساب</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  طرف حساب: <span className="font-bold text-slate-800">{historyModalDebt.personName}</span> (کل: {formatPrice(historyModalDebt.amount)} ت)
                </p>
              </div>
              <button
                onClick={() => setHistoryModalDebt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {(!historyModalDebt.payments || historyModalDebt.payments.length === 0) ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  هنوز پرداختی برای این حساب ثبت نشده است.
                </div>
              ) : (
                historyModalDebt.payments.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 text-right"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md font-mono">
                          #{toPersianDigits(idx + 1)}
                        </span>
                        <span>{p.note || 'واریزی نقدی'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        تاریخ: {toPersianDigits(p.dateKey)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-xs sm:text-sm font-black text-emerald-600 font-mono">
                        {formatPrice(p.amount)} ت
                      </span>
                      <button
                        onClick={() => onDeletePayment(historyModalDebt.id, p.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="حذف واریزی"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <button
                onClick={() => setHistoryModalDebt(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debt List / Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-slate-600">
            لیست حساب‌ها ({toPersianDigits(filteredDebts.length)} پرونده)
          </h4>
        </div>

        {filteredDebts.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs space-y-3">
            <HandCoins className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">
              {searchQuery || statusFilter !== 'all' 
                ? 'موردی با این فیلتر یا عبارت جستجو یافت نشد.' 
                : 'هنوز بدهی یا طلبی ثبت نشده است.'}
            </p>
            <p className="text-[11px] text-slate-400">
              برای ثبت حساب جدید، روی دکمه «ثبت حساب جدید» در بالا کلیک کنید.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDebts.map(item => {
              const settled = item.settledAmount || 0;
              const remaining = Math.max(0, item.amount - settled);
              const percent = Math.min(100, Math.round((settled / item.amount) * 100));
              const isCredit = item.type === 'credit';
              const isDueOver = !item.isSettled && item.dueDate && item.dueDate < todayKey;
              const isDueToday = !item.isSettled && item.dueDate === todayKey;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-3xl border p-5 shadow-xs transition-all relative overflow-hidden flex flex-col justify-between gap-4 ${
                    item.isSettled
                      ? 'border-slate-200/80 opacity-80'
                      : isCredit
                      ? 'border-emerald-200/80 hover:shadow-md'
                      : 'border-rose-200/80 hover:shadow-md'
                  }`}
                >
                  {/* Top Status Stripe */}
                  <div className={`absolute top-0 right-0 left-0 h-1.5 ${
                    item.isSettled 
                      ? 'bg-slate-300' 
                      : isCredit 
                      ? 'bg-emerald-500' 
                      : 'bg-rose-500'
                  }`} />

                  {/* Header Row */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-xs ${
                          item.isSettled 
                            ? 'bg-slate-400' 
                            : isCredit 
                            ? 'bg-emerald-600' 
                            : 'bg-rose-600'
                        }`}>
                          {item.personName.trim().charAt(0) || 'ح'}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900">{item.personName}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              item.isSettled
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : isCredit
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                : 'bg-rose-50 text-rose-700 border-rose-200/80'
                            }`}>
                              {item.isSettled 
                                ? 'تسویه کامل شد' 
                                : isCredit 
                                ? 'طلب من (بدهکار به من)' 
                                : 'بدهی من (بستانکار از من)'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                            {item.phone && (
                              <a
                                href={`tel:${item.phone}`}
                                className="text-slate-500 hover:text-slate-900 flex items-center gap-1 font-mono hover:underline"
                              >
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{toPersianDigits(item.phone)}</span>
                              </a>
                            )}
                            <span>دسته: {item.category || 'عمومی'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Options */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                          title="ویرایش"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`آیا از حذف حساب "${item.personName}" مطمئن هستید؟`)) {
                              onDeleteDebt(item.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Description if any */}
                    {item.description && (
                      <p className="text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                        {item.description}
                      </p>
                    )}

                    {/* Financial Figures */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">مبلغ کل حساب:</span>
                        <span className="font-bold text-slate-800">{formatPrice(item.amount)} تومان</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">مانده باقیمانده:</span>
                        <span className={`font-black text-sm ${
                          item.isSettled ? 'text-slate-400 line-through' : isCredit ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {formatPrice(remaining)} تومان
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1 pt-1">
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.isSettled ? 'bg-slate-400' : isCredit ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                          <span>تسویه شده: {formatPrice(settled)} ت ({toPersianDigits(percent)}%)</span>
                          <span>تاریخ ثبت: {toPersianDigits(item.startDate || '')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Due Date Alert if exists */}
                    {item.dueDate && (
                      <div className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-bold ${
                        item.isSettled
                          ? 'bg-slate-100 text-slate-500'
                          : isDueOver
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : isDueToday
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>موعد سررسید: {toPersianDigits(item.dueDate)}</span>
                        </div>
                        <span className="text-[10px]">
                          {item.isSettled 
                            ? 'تسویه شده' 
                            : isDueOver 
                            ? 'سررسید گذشته!' 
                            : isDueToday 
                            ? 'امروز موعد تسویه است' 
                            : 'در جریان'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenPaymentModal(item)}
                      className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ثبت واریزی جزئی</span>
                    </button>

                    <button
                      onClick={() => handleToggleFullSettle(item)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                        item.isSettled
                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={item.isSettled ? 'بازگشایی مجدد حساب' : 'تسویه کامل یکجا'}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{item.isSettled ? 'بازگشایی' : 'تسویه کامل'}</span>
                    </button>

                    {(item.payments && item.payments.length > 0) && (
                      <button
                        onClick={() => setHistoryModalDebt(item)}
                        className="p-2 text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-xl transition-colors"
                        title="تاریخچه واریزی‌ها"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
