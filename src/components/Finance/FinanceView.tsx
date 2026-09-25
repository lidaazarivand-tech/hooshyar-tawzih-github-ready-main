import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar as CalendarIcon,
  Tag,
  HandCoins
} from 'lucide-react';
import { ExpenseItem, DebtItem, DebtPayment } from '../../types/calendar';
import { 
  toPersianDigits, 
  toEnglishDigits,
  normalizeDateKey,
  formatPrice, 
  PERSIAN_MONTH_NAMES, 
  makeDateKey 
} from '../../utils/persianNumber';
import { getTodayJalali } from '../../utils/jalali';
import { DatePicker } from '../Common/DatePicker';
import { DebtManagerView } from './DebtManagerView';

interface FinanceViewProps {
  expenses: ExpenseItem[];
  debts: DebtItem[];
  onAddExpense: (item: Omit<ExpenseItem, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  onAddDebt: (debt: Omit<DebtItem, 'id' | 'createdAt'>) => void;
  onUpdateDebt: (debt: DebtItem) => void;
  onDeleteDebt: (id: string) => void;
  onAddPayment: (debtId: string, payment: Omit<DebtPayment, 'id' | 'createdAt'>, syncToExpenses: boolean) => void;
  onDeletePayment: (debtId: string, paymentId: string) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  expenses,
  debts,
  onAddExpense,
  onDeleteExpense,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
  onAddPayment,
  onDeletePayment
}) => {
  const today = getTodayJalali();
  const todayKey = makeDateKey(today.jy, today.jm, today.jd);

  // Sub tab: 'expenses' | 'debts'
  const [activeFinanceTab, setActiveFinanceTab] = useState<'expenses' | 'debts'>('expenses');

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('خوراک و روزمره');
  const [description, setDescription] = useState('');
  const [dateKey, setDateKey] = useState(todayKey);
  const [selectedYear, setSelectedYear] = useState<number>(today.jy);
  const [selectedMonth, setSelectedMonth] = useState<number>(today.jm);

  const EXPENSE_CATEGORIES = [
    'خوراک و روزمره',
    'مسکن و اجاره',
    'قبوض و اشتراک',
    'حمل و نقل و بنزین',
    'پوشاک و خرید',
    'سلامت و درمان',
    'آموزش و کتاب',
    'تفریح و مسافرت',
    'هدایا و جشن‌ها',
    'سایر هزینه‌ها'
  ];

  const INCOME_CATEGORIES = [
    'حقوق و دستمزد',
    'پاداش و عیدی',
    'سود و سرمایه‌گذاری',
    'فروش کالا',
    'کارهای فریلنسری',
    'سایر دریافتی‌ها'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = toEnglishDigits(amount.replace(/,/g, ''));
    const numAmount = parseFloat(sanitized);
    if (isNaN(numAmount) || numAmount <= 0) return;

    onAddExpense({
      dateKey: normalizeDateKey(dateKey) || todayKey,
      type,
      amount: numAmount,
      category,
      description: description.trim() || category
    });

    setAmount('');
    setDescription('');
  };

  // Generate available years (5 years before to 5 years ahead)
  const availableYears = Array.from({ length: 11 }, (_, i) => today.jy - 5 + i);

  // Filter expenses by selected Persian year and month (matching dateKey "YYYY-MM-DD")
  const padMonth = selectedMonth < 10 ? `0${selectedMonth}` : `${selectedMonth}`;
  const currentMonthKeyPrefix = `${selectedYear}-${padMonth}`;
  const monthExpenses = (expenses || []).filter(e => {
    if (!e || typeof e.dateKey !== 'string') return false;
    const norm = normalizeDateKey(e.dateKey);
    return norm.startsWith(currentMonthKeyPrefix);
  });

  const totalIncome = monthExpenses.filter(e => e.type === 'income').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalExpense = monthExpenses.filter(e => e.type === 'expense').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const balance = totalIncome - totalExpense;

  // Active unsettled debts count
  const unsettledDebtsCount = debts.filter(d => !d.isSettled).length;

  return (
    <div id="finance-main-view" className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header & Main Mode Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-rose-600" />
            <span>مدیریت مالی و حسابداری شخصی</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">مدیریت دخل و خرج روزمره، بودجه ماهانه و دفتر ثبت بدهی‌ها و مطالبات اشخاص</p>
        </div>

        {/* Sub-Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl self-stretch sm:self-auto">
          <button
            id="tab-finance-expenses"
            onClick={() => setActiveFinanceTab('expenses')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeFinanceTab === 'expenses'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4 text-rose-600" />
            <span>دخل و خرج ماهانه</span>
          </button>

          <button
            id="tab-finance-debts"
            onClick={() => setActiveFinanceTab('debts')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeFinanceTab === 'debts'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HandCoins className="w-4 h-4 text-amber-600" />
            <span>بدهی‌ها و طلب‌ها</span>
            {unsettledDebtsCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {toPersianDigits(unsettledDebtsCount)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Render Debts Tab */}
      {activeFinanceTab === 'debts' && (
        <DebtManagerView
          debts={debts}
          onAddDebt={onAddDebt}
          onUpdateDebt={onUpdateDebt}
          onDeleteDebt={onDeleteDebt}
          onAddPayment={onAddPayment}
          onDeletePayment={onDeletePayment}
          onAddExpense={onAddExpense}
        />
      )}

      {/* Render Standard Expenses Tab */}
      {activeFinanceTab === 'expenses' && (
        <div className="space-y-6">
          {/* Month & Year Selector Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-rose-600" />
              <span>گزارش عملکرد مالی ماهانه:</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Year Selector */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-[#F7F4EC] border border-[#D9DED9] rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#123C35] focus:outline-none"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>
                    سال {toPersianDigits(yr)}
                  </option>
                ))}
              </select>

              {/* Month Selector */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-[#F7F4EC] border border-[#D9DED9] rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#123C35] focus:outline-none"
              >
                {PERSIAN_MONTH_NAMES.map((mName, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    ماه {mName}
                  </option>
                ))}
              </select>

              {(selectedYear !== today.jy || selectedMonth !== today.jm) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear(today.jy);
                    setSelectedMonth(today.jm);
                  }}
                  className="px-2.5 py-2 text-[11px] font-bold text-[#123C35] bg-[#E9E5DA] hover:bg-[#D9DED9] rounded-xl transition-all"
                  title="بازگشت به ماه جاری"
                >
                  ماه جاری
                </button>
              )}
            </div>
          </div>

          {/* Summary Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Income */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1 text-right">
              <div className="flex items-center justify-between text-xs text-emerald-600 font-bold">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>کل دریافتی ماه</span>
                </div>
                <span className="text-[10px] bg-emerald-50 px-2 py-0.5 rounded-md">درآمد</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 pt-1">
                {formatPrice(totalIncome)} <span className="text-xs font-normal text-slate-400">تومان</span>
              </div>
            </div>

            {/* Expense */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1 text-right">
              <div className="flex items-center justify-between text-xs text-rose-600 font-bold">
                <div className="flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" />
                  <span>کل مخارج ماه</span>
                </div>
                <span className="text-[10px] bg-rose-50 px-2 py-0.5 rounded-md">هزینه</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 pt-1">
                {formatPrice(totalExpense)} <span className="text-xs font-normal text-slate-400">تومان</span>
              </div>
            </div>

            {/* Balance */}
            <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-xs space-y-1 text-right">
              <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                <div className="flex items-center gap-1">
                  <Wallet className="w-4 h-4 text-amber-400" />
                  <span>مانده خالص ماه</span>
                </div>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md">تراز</span>
              </div>
              <div className={`text-xl sm:text-2xl font-black pt-1 ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatPrice(balance)} <span className="text-xs font-normal text-slate-400">تومان</span>
              </div>
            </div>
          </div>

          {/* Add Transaction Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-600" />
                <span>ثبت تراکنش جدید</span>
              </h3>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setType('expense'); setCategory(EXPENSE_CATEGORIES[0]); }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    type === 'expense' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  هزینه 🔴
                </button>
                <button
                  type="button"
                  onClick={() => { setType('income'); setCategory(INCOME_CATEGORIES[0]); }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    type === 'income' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  درآمد 🟢
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">مبلغ (تومان):</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="مبلغ به تومان (مثلاً ۵۰۰۰۰۰)..."
                  className="w-full bg-[#F7F4EC] border border-[#D9DED9] rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#123C35] focus:outline-none shadow-xs"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">دسته‌بندی:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#F7F4EC] border border-[#D9DED9] rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#123C35] focus:outline-none shadow-xs"
                >
                  {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4">
                <DatePicker
                  label="تاریخ تراکنش:"
                  value={dateKey}
                  onChange={setDateKey}
                  required
                />
              </div>

              <div className="sm:col-span-12">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">توضیحات و بابت:</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="توضیحات و بابت..."
                  className="w-full bg-[#F7F4EC] border border-[#D9DED9] rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#123C35] focus:outline-none shadow-xs"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت در دفتر حساب</span>
              </button>
            </div>
          </form>

          {/* Transaction List for Selected Month */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>
                ریز تراکنش‌های ماه {PERSIAN_MONTH_NAMES[selectedMonth - 1]} {toPersianDigits(selectedYear)}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded-lg text-slate-600">
                {toPersianDigits(monthExpenses.length)} تراکنش
              </span>
            </h3>

            {monthExpenses.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#F7F4EC] border border-[#D9DED9] flex items-center justify-center text-[#838E8A] mb-3">
                  <CreditCard className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-[#1C2523] mb-1">
                  تراکنشی در این ماه ثبت نشده است
                </p>
                <p className="text-xs text-[#59635F] max-w-xs">
                  با استفاده از فرم بالا می‌توانید هزینه‌ها و درآمدهای این ماه را ثبت کنید.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {monthExpenses.map(item => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white transition-all flex items-center justify-between gap-3 text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                        item.type === 'income' ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}>
                        {item.type === 'income' ? '+' : '-'}
                      </div>

                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.description}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          <span>دسته: {item.category}</span>
                          <span>•</span>
                          <span>تاریخ: {toPersianDigits(item.dateKey)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-sm sm:text-base font-black ${
                        item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {item.type === 'income' ? '+' : '-'}{formatPrice(item.amount)} تومان
                      </span>

                      <button
                        onClick={() => onDeleteExpense(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

