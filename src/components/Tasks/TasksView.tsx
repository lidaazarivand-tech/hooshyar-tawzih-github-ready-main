import React, { useState } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  Check, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle,
  Filter,
  CheckCircle2,
  ListTodo,
  Sparkles,
  CalendarCheck,
  CalendarDays
} from 'lucide-react';
import { UserTask } from '../../types/calendar';
import { toPersianDigits, makeDateKey, normalizeDateKey, isSameDateKey, parseDateKey, PERSIAN_MONTH_NAMES } from '../../utils/persianNumber';
import { getTodayJalali, addDaysToJalali } from '../../utils/jalali';
import { DatePicker } from '../Common/DatePicker';

interface TasksViewProps {
  tasks: UserTask[];
  onAddTask: (dateKey: string, text: string, priority?: 'low' | 'medium' | 'high') => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

type FilterType = 'all' | 'today' | 'tomorrow' | 'pending' | 'completed';

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask
}) => {
  const today = getTodayJalali();
  const todayKey = makeDateKey(today.jy, today.jm, today.jd);
  const tomorrow = addDaysToJalali(today, 1);
  const tomorrowKey = makeDateKey(tomorrow.jy, tomorrow.jm, tomorrow.jd);
  const dayAfterTomorrow = addDaysToJalali(today, 2);
  const dayAfterTomorrowKey = makeDateKey(dayAfterTomorrow.jy, dayAfterTomorrow.jm, dayAfterTomorrow.jd);

  const [text, setText] = useState('');
  const [dateKey, setDateKey] = useState(todayKey);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [viewFilter, setViewFilter] = useState<FilterType>('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const targetKey = normalizeDateKey(dateKey) || todayKey;
    onAddTask(targetKey, text.trim(), priority);
    setText('');
  };

  // Helper to format Jalali date string nicely in Persian
  const formatFriendlyDate = (dKey: string) => {
    const parsed = parseDateKey(dKey);
    if (!parsed) return toPersianDigits(dKey);
    const monthName = PERSIAN_MONTH_NAMES[parsed.jm - 1] || '';
    return `${toPersianDigits(parsed.jd)} ${monthName} ${toPersianDigits(parsed.jy)}`;
  };

  // Helper for relative status
  const getTaskDateStatus = (dKey: string, completed: boolean) => {
    if (isSameDateKey(dKey, todayKey)) {
      return { label: 'امروز', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', isToday: true };
    }
    if (isSameDateKey(dKey, tomorrowKey)) {
      return { label: 'فردا', bg: 'bg-sky-100 text-sky-800 border-sky-300', isToday: false };
    }
    
    const parsed = parseDateKey(dKey);
    if (parsed) {
      const taskVal = parsed.jy * 10000 + parsed.jm * 100 + parsed.jd;
      const todayVal = today.jy * 10000 + today.jm * 100 + today.jd;
      if (taskVal < todayVal && !completed) {
        return { label: 'معوق (گذشته)', bg: 'bg-rose-100 text-rose-800 border-rose-300', isToday: false };
      }
      if (taskVal > todayVal) {
        return { label: 'روزهای آینده', bg: 'bg-slate-100 text-slate-700 border-slate-200', isToday: false };
      }
    }
    return { label: 'تاریخ مشخص', bg: 'bg-slate-100 text-slate-700 border-slate-200', isToday: false };
  };

  const filteredTasks = tasks.filter(t => {
    if (viewFilter === 'today') return isSameDateKey(t.dateKey, todayKey);
    if (viewFilter === 'tomorrow') return isSameDateKey(t.dateKey, tomorrowKey);
    if (viewFilter === 'pending') return !t.completed;
    if (viewFilter === 'completed') return t.completed;
    return true;
  });

  const totalTasks = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = totalTasks - completedCount;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <div id="tasks-main-view" className="space-y-6 max-w-4xl mx-auto">
      {/* Header & Overview Stats */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-emerald-600" />
              <span>مدیریت کارها و وظایف روزانه</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              برنامه‌ریزی، پیگیری و علامت‌گذاری وظایف به تفکیک تاریخ تقویم شمسی
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
              امروز: {formatFriendlyDate(todayKey)}
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[11px] text-slate-500 block">کل وظایف</span>
            <span className="text-lg font-black text-slate-800 block mt-0.5 font-mono">
              {toPersianDigits(totalTasks)}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
            <span className="text-[11px] text-emerald-700 block">انجام شده</span>
            <span className="text-lg font-black text-emerald-800 block mt-0.5 font-mono">
              {toPersianDigits(completedCount)}
            </span>
          </div>
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
            <span className="text-[11px] text-amber-700 block">در انتظار انجام</span>
            <span className="text-lg font-black text-amber-800 block mt-0.5 font-mono">
              {toPersianDigits(pendingCount)}
            </span>
          </div>
          <div className="p-3 bg-slate-900 text-white rounded-2xl">
            <span className="text-[11px] text-slate-300 block">درصد پیشرفت</span>
            <span className="text-lg font-black text-emerald-400 block mt-0.5 font-mono">
              {toPersianDigits(progressPercent)}٪
            </span>
          </div>
        </div>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>افزودن کار یا مأموریت جدید</span>
          </h3>
          <span className="text-[11px] text-slate-400">تمام فیلدها ذخیره خودکار می‌شوند</span>
        </div>

        {/* Task Text Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            عنوان و شرح وظیفه:
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="مثال: بررسی صورت‌حساب مالی، تماس با همکار، خرید کتاب..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {/* Date Picker & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          <div className="sm:col-span-7">
            <DatePicker
              label="انتخاب تاریخ موعد:"
              value={dateKey}
              onChange={setDateKey}
              required
            />
          </div>

          <div className="sm:col-span-5 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              درجه اهمیت و اولویت:
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full bg-[#F7F4EC] border border-[#D9DED9] rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123C35] cursor-pointer shadow-xs"
            >
              <option value="high">🔴 اولویت بالا (فوری و مهم)</option>
              <option value="medium">🟡 اولویت متوسط (معمولی)</option>
              <option value="low">🟢 اولویت عادی (پایین)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={!text.trim()}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت و افزودن به لیست کارها</span>
          </button>
        </div>
      </form>

      {/* Filter Tabs & Task List */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-emerald-600" />
            <span className="text-sm sm:text-base font-black text-slate-900">
              لیست وظایف ({toPersianDigits(filteredTasks.length)})
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs">
            {[
              { id: 'all', label: `همه (${toPersianDigits(tasks.length)})` },
              { id: 'today', label: 'امروز' },
              { id: 'tomorrow', label: 'فردا' },
              { id: 'pending', label: `در انتظار (${toPersianDigits(pendingCount)})` },
              { id: 'completed', label: `انجام‌شده (${toPersianDigits(completedCount)})` }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setViewFilter(f.id as FilterType)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  viewFilter === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F7F4EC] border border-[#D9DED9] flex items-center justify-center text-[#838E8A] mb-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-sm font-bold text-[#1C2523] mb-1">
              {viewFilter === 'all' 
                ? 'هنوز کاری در لیست وظایف ثبت نکرده‌اید'
                : viewFilter === 'today'
                ? 'کاری برای امروز ثبت نشده است'
                : viewFilter === 'tomorrow'
                ? 'کاری برای فردا ثبت نشده است'
                : viewFilter === 'pending'
                ? 'هیچ کار انجام‌نشده‌ای ندارید، عالی است!'
                : 'هنوز کاری تکمیل نشده است'}
            </p>
            <p className="text-xs text-[#59635F] max-w-xs">
              با استفاده از فرم بالا می‌توانید وظایف و کارهای روزمره خود را به تفکیک تاریخ برنامه‌ریزی کنید.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTasks.map((task) => {
              const dateStatus = getTaskDateStatus(task.dateKey, task.completed);
              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 text-right ${
                    task.completed
                      ? 'bg-slate-50/70 border-slate-200/80 opacity-75'
                      : 'bg-white hover:bg-slate-50/50 border-slate-200 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Toggle Checkbox */}
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      className={`w-6 h-6 mt-0.5 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        task.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'border-slate-300 bg-white hover:border-emerald-500 hover:scale-105'
                      }`}
                      title={task.completed ? 'علامت به عنوان انجام‌نشده' : 'علامت به عنوان تکمیل‌شده'}
                    >
                      {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    {/* Task Content & Badges */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <p className={`text-xs sm:text-sm font-bold leading-relaxed break-words ${
                        task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}>
                        {task.text}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {/* Friendly Date Badge */}
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                          <CalendarDays className="w-3 h-3 text-slate-500" />
                          <span>{formatFriendlyDate(task.dateKey)}</span>
                        </span>

                        {/* Relative Status Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${dateStatus.bg}`}>
                          {dateStatus.label}
                        </span>

                        {/* Priority Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                          task.priority === 'high'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : task.priority === 'medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {task.priority === 'high' ? '🔴 اولویت بالا' : task.priority === 'medium' ? '🟡 اولویت متوسط' : '🟢 اولویت عادی'}
                        </span>

                        {/* Completed Status Text */}
                        {task.completed && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>تکمیل شد</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Delete */}
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    title="حذف وظیفه"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
