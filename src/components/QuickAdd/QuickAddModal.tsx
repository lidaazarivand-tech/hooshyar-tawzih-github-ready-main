import React, { useState } from 'react';
import { 
  X, 
  CheckSquare, 
  FileText, 
  Bell, 
  CreditCard, 
  Users, 
  Plus, 
  Sparkles,
  Calendar as CalendarIcon,
  Tag,
  Clock
} from 'lucide-react';
import { UserTask, UserNote, UserReminder, ExpenseItem, DebtItem } from '../../types/calendar';
import { getTodayJalali } from '../../utils/jalali';
import { makeDateKey, toPersianDigits, toEnglishDigits, normalizeDateKey } from '../../utils/persianNumber';
import { DatePicker } from '../Common/DatePicker';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'task' | 'note' | 'reminder' | 'expense' | 'debt';
  onAddTask: (task: Omit<UserTask, 'id' | 'createdAt'>) => void;
  onAddNote: (note: Omit<UserNote, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onAddReminder: (reminder: Omit<UserReminder, 'id' | 'createdAt'>) => void;
  onAddExpense: (expense: Omit<ExpenseItem, 'id' | 'createdAt'>) => void;
  onAddDebt: (debt: Omit<DebtItem, 'id' | 'createdAt' | 'settledAmount' | 'isSettled'>) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  initialType = 'task',
  onAddTask,
  onAddNote,
  onAddReminder,
  onAddExpense,
  onAddDebt
}) => {
  const today = getTodayJalali();
  const defaultDateKey = makeDateKey(today.jy, today.jm, today.jd);

  const [activeType, setActiveType] = useState<'task' | 'note' | 'reminder' | 'expense' | 'debt'>(initialType);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(defaultDateKey);

  // Sync activeType when initialType changes or modal opens
  React.useEffect(() => {
    if (initialType) {
      setActiveType(initialType);
    }
    if (isOpen) {
      const current = getTodayJalali();
      setSelectedDateKey(makeDateKey(current.jy, current.jm, current.jd));
    }
  }, [initialType, isOpen]);

  // Form states
  // Task
  const [taskText, setTaskText] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Note
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('عمومی');

  // Reminder
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderTime, setReminderTime] = useState('10:00');
  const [reminderCategory, setReminderCategory] = useState<'birthday' | 'anniversary' | 'bill' | 'check' | 'custom'>('custom');

  // Expense
  const [expenseType, setExpenseType] = useState<'expense' | 'income'>('expense');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('خوراک');
  const [expenseDesc, setExpenseDesc] = useState('');

  // Debt
  const [debtType, setDebtType] = useState<'debt' | 'credit'>('debt');
  const [debtPerson, setDebtPerson] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtDesc, setDebtDesc] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetKey = normalizeDateKey(selectedDateKey) || defaultDateKey;

    if (activeType === 'task') {
      if (!taskText.trim()) return;
      onAddTask({
        dateKey: targetKey,
        text: taskText.trim(),
        completed: false,
        priority: taskPriority
      });
      setTaskText('');
    } else if (activeType === 'note') {
      if (!noteTitle.trim() && !noteContent.trim()) return;
      onAddNote({
        dateKey: targetKey,
        title: noteTitle.trim() || 'یادداشت جدید',
        content: noteContent.trim(),
        category: noteCategory
      });
      setNoteTitle('');
      setNoteContent('');
    } else if (activeType === 'reminder') {
      if (!reminderTitle.trim()) return;
      onAddReminder({
        dateKey: targetKey,
        title: reminderTitle.trim(),
        time: reminderTime,
        category: reminderCategory,
        type: reminderCategory === 'birthday' || reminderCategory === 'anniversary' || reminderCategory === 'bill'
          ? reminderCategory
          : reminderCategory === 'check' ? 'event' : 'other',
        isEnabled: true,
        enabled: true,
        notificationId: Math.floor(Math.random() * 1000000)
      });
      setReminderTitle('');
    } else if (activeType === 'expense') {
      const sanitized = toEnglishDigits(expenseAmount.replace(/,/g, ''));
      const num = parseInt(sanitized, 10);
      if (isNaN(num) || num <= 0) return;
      onAddExpense({
        type: expenseType,
        amount: num,
        category: expenseCategory,
        description: expenseDesc.trim() || (expenseType === 'expense' ? 'هزینه روزانه' : 'درآمد'),
        dateKey: targetKey
      });
      setExpenseAmount('');
      setExpenseDesc('');
    } else if (activeType === 'debt') {
      const sanitized = toEnglishDigits(debtAmount.replace(/,/g, ''));
      const num = parseInt(sanitized, 10);
      if (isNaN(num) || num <= 0 || !debtPerson.trim()) return;
      onAddDebt({
        type: debtType,
        personName: debtPerson.trim(),
        amount: num,
        startDate: targetKey,
        description: debtDesc.trim(),
        dueDate: targetKey,
        createdDate: targetKey
      });
      setDebtPerson('');
      setDebtAmount('');
      setDebtDesc('');
    }

    onClose();
  };

  return (
    <div 
      id="quick-add-modal-overlay"
      className="fixed inset-0 z-[80] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="quick-add-modal-content"
        className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 my-auto relative text-right"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#123C35] text-[#C49A5A]">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ثبت سریع</h3>
              <p className="text-[11px] text-slate-500">برای امروز: {toPersianDigits(today.jy)}/{toPersianDigits(today.jm)}/{toPersianDigits(today.jd)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type Switcher Badges */}
        <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold text-center">
          <button
            type="button"
            onClick={() => setActiveType('task')}
            className={`py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
              activeType === 'task' ? 'bg-white text-[#123C35] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="text-[10px]">کار</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('note')}
            className={`py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
              activeType === 'note' ? 'bg-white text-[#123C35] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[10px]">یادداشت</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('reminder')}
            className={`py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
              activeType === 'reminder' ? 'bg-white text-[#123C35] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span className="text-[10px]">یادآور</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('expense')}
            className={`py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
              activeType === 'expense' ? 'bg-white text-[#123C35] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span className="text-[10px]">هزینه</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('debt')}
            className={`py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
              activeType === 'debt' ? 'bg-white text-[#123C35] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[10px]">بدهی</span>
          </button>
        </div>

        {/* Dynamic Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {/* Task Form */}
          {activeType === 'task' && (
            <div className="space-y-3 animate-fadeIn">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">عنوان وظیفه / برنامه:</label>
                <input
                  type="text"
                  autoFocus
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  placeholder="مثلاً: خرید کتاب، تماس با پشتیبانی..."
                  className="w-full bg-[#F7F4EC] border border-[#D9DED9] focus:bg-white text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[#123C35] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">اولویت انجام:</label>
                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTaskPriority(p)}
                      className={`py-2 rounded-xl border transition-all cursor-pointer ${
                        taskPriority === p 
                          ? p === 'high' ? 'bg-rose-600 text-white border-rose-600' : p === 'medium' ? 'bg-[#C49A5A] text-white border-[#C49A5A]' : 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p === 'high' ? '🔴 فوری' : p === 'medium' ? '🟡 عادی' : '🟢 کم‌اهمیت'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Note Form */}
          {activeType === 'note' && (
            <div className="space-y-3 animate-fadeIn">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">عنوان یادداشت:</label>
                <input
                  type="text"
                  autoFocus
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="مثلاً: نکات جلسه کاری..."
                  className="w-full bg-[#F7F4EC] border border-[#D9DED9] focus:bg-white text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[#123C35] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">متن یادداشت:</label>
                <textarea
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="متن کامل یا توضیحات یادداشت را بنویسید..."
                  className="w-full bg-[#F7F4EC] border border-[#D9DED9] focus:bg-white text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[#123C35] focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* Reminder Form */}
          {activeType === 'reminder' && (
            <div className="space-y-3 animate-fadeIn">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">عنوان رویداد یا یادآور:</label>
                <input
                  type="text"
                  autoFocus
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  placeholder="مثلاً: تولد مریم، سررسید چک، نوبت پزشک..."
                  className="w-full bg-[#F7F4EC] border border-[#D9DED9] focus:bg-white text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[#123C35] focus:outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">ساعت هشدار:</label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full bg-[#F7F4EC] border border-[#D9DED9] text-slate-900 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">دسته‌بندی:</label>
                  <select
                    value={reminderCategory}
                    onChange={(e) => setReminderCategory(e.target.value as any)}
                    className="w-full bg-[#F7F4EC] border border-[#D9DED9] text-slate-900 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="custom">عمومی</option>
                    <option value="birthday">تولد</option>
                    <option value="anniversary">سالگرد</option>
                    <option value="bill">قبض / قسط</option>
                    <option value="check">چک</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Expense Form */}
          {activeType === 'expense' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setExpenseType('expense')}
                  className={`py-2 rounded-xl border transition-all cursor-pointer ${
                    expenseType === 'expense' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  🔴 ثبت هزینه
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseType('income')}
                  className={`py-2 rounded-xl border transition-all cursor-pointer ${
                    expenseType === 'income' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  🟢 ثبت درآمد
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">مبلغ (تومان):</label>
                <input
                  type="number"
                  autoFocus
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="مثلاً: 150000"
                  className="w-full bg-[#F7F4EC] border border-[#D9DED9] focus:bg-white text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:ring-2 focus:ring-[#123C35] focus:outline-none font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">دسته‌بندی:</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full bg-[#F7F4EC] border border-[#D9DED9] text-slate-900 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="خوراک">خوراک و سوپرمارکت</option>
                    <option value="حمل و نقل">حمل و نقل و بنزین</option>
                    <option value="قبض و مسکن">قبض و مسکن</option>
                    <option value="پوشاک">پوشاک و خرید</option>
                    <option value="سلامت">سلامت و درمان</option>
                    <option value="حقوق">حقوق و دستمزد</option>
                    <option value="سایر">متفرقه</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">توضیح کوتاه:</label>
                  <input
                    type="text"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    placeholder="شرح تراکنش"
                    className="w-full bg-[#F7F4EC] border border-[#D9DED9] text-slate-900 rounded-xl px-3 py-2 text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Debt Form */}
          {activeType === 'debt' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDebtType('debt')}
                  className={`py-2 rounded-xl border transition-all cursor-pointer ${
                    debtType === 'debt' ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  بدهی من (باید بپردازم)
                </button>
                <button
                  type="button"
                  onClick={() => setDebtType('credit')}
                  className={`py-2 rounded-xl border transition-all cursor-pointer ${
                    debtType === 'credit' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  طلب من (باید پس بگیرم)
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">نام طرف حساب / شخص:</label>
                <input
                  type="text"
                  autoFocus
                  value={debtPerson}
                  onChange={(e) => setDebtPerson(e.target.value)}
                  placeholder="مثلاً: علی محمدی، شرکت بیمه..."
                  className="w-full bg-[#F7F4EC] border border-[#D9DED9] focus:bg-white text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[#123C35] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">مبلغ بدهی / طلب (تومان):</label>
                <input
                  type="number"
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  placeholder="مثلاً: 500000"
                  className="w-full bg-[#F7F4EC] border border-[#D9DED9] focus:bg-white text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:ring-2 focus:ring-[#123C35] focus:outline-none font-mono"
                  required
                />
              </div>
            </div>
          )}

          {/* Date Picker Selector */}
          <div className="pt-1">
            <DatePicker
              label="تاریخ ثبت در تقویم:"
              value={selectedDateKey}
              onChange={setSelectedDateKey}
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#123C35] hover:bg-[#0C2E29] text-white font-bold text-xs shadow-md cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-[#C49A5A]" />
              <span>ثبت مورد</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
