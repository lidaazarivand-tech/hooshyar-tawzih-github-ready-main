import React, { useState } from 'react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  Gift, 
  CreditCard, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Volume2
} from 'lucide-react';
import { UserReminder } from '../../types/calendar';
import { toPersianDigits, makeDateKey, normalizeDateKey } from '../../utils/persianNumber';
import { getTodayJalali, getDaysDifference } from '../../utils/jalali';
import { DatePicker } from '../Common/DatePicker';
import { isNativeAzanAvailable, pickNativeReminderSound } from '../../utils/nativeAzan';

interface RemindersViewProps {
  reminders: UserReminder[];
  onAddReminder: (reminder: Omit<UserReminder, 'id'>) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  reminders,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder
}) => {
  const today = getTodayJalali();
  const todayKey = makeDateKey(today.jy, today.jm, today.jd);

  const [title, setTitle] = useState('');
  const [dateKey, setDateKey] = useState(todayKey);
  const [time, setTime] = useState('09:00');
  const [type, setType] = useState<'birthday' | 'event' | 'bill' | 'other'>('event');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddReminder({
      title: title.trim(),
      dateKey: normalizeDateKey(dateKey) || todayKey,
      time,
      type,
      category: type,
      enabled: true,
      isEnabled: true,
      ...(type === 'birthday' ? { repeatYearly: true, repeat: 'yearly' as const } : {})
    });

    setTitle('');
  };

  const getReminderDaysLeft = (targetKey: string) => {
    const norm = normalizeDateKey(targetKey);
    const parts = norm.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0])) return null;
    const targetDate = { jy: parts[0], jm: parts[1], jd: parts[2] };
    return getDaysDifference(today, targetDate);
  };

  return (
    <div id="reminders-main-view" className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
          <Bell className="w-6 h-6 text-amber-500" />
          <span>یادآوری‌های هوشمند تقویم</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          ثبت تولدها، سررسید چک و قبوض، سالگردها و رویدادهای مهم با اعلان و شمارش معکوس روزها
        </p>
      </div>

      {/* Add Reminder Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Plus className="w-4 h-4 text-amber-500" />
          <span>ثبت یادآوری جدید</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان یادآوری:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان یادآوری (مثلاً تولد سارا، پرداخت قسط وام)..."
              className="w-full bg-[#F7F4EC] border border-[#D9DED9] rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123C35] shadow-xs"
            />
          </div>

          <div className="sm:col-span-3">
            <DatePicker
              label="تاریخ موعد:"
              value={dateKey}
              onChange={setDateKey}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">ساعت اعلان:</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-[#F7F4EC] border border-[#D9DED9] rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123C35] shadow-xs"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">دسته‌بندی:</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-[#F7F4EC] border border-[#D9DED9] rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123C35] shadow-xs"
            >
              <option value="birthday">تولد و سالگرد 🎂</option>
              <option value="bill">پرداخت قبض و قسط 💳</option>
              <option value="event">جلسه و رویداد مهم 🗓️</option>
              <option value="other">سایر یادآوری‌ها 🔔</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت یادآوری</span>
          </button>
        </div>
      </form>

      {/* Reminders List */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
          لیست تمامی یادآوری‌ها ({toPersianDigits(reminders.length)})
        </h3>
        {isNativeAzanAvailable() && (
          <button
            type="button"
            onClick={() => pickNativeReminderSound()}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-1.5"
          >
            <Volume2 className="w-4 h-4" />
            تغییر صدای اعلان یادآوری‌ها
          </button>
        )}

        {reminders.length === 0 ? (
          <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F7F4EC] border border-[#D9DED9] flex items-center justify-center text-[#838E8A] mb-3">
              <Bell className="w-7 h-7 text-amber-500" />
            </div>
            <p className="text-sm font-bold text-[#1C2523] mb-1">
              هیچ یادآوری ثبت نشده است
            </p>
            <p className="text-xs text-[#59635F] max-w-xs">
              با فرم بالا می‌توانید برای تولدها، چک‌ها، اقساط و رویدادهای آینده یادآور تنظیم کنید.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {reminders.map(rem => {
              const daysLeft = getReminderDaysLeft(rem.dateKey);
              const isRemEnabled = rem.isEnabled ?? rem.enabled ?? true;

              return (
                <div
                  key={rem.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right min-w-0 ${
                    isRemEnabled ? 'bg-slate-50 border-slate-200 hover:bg-white' : 'bg-slate-50/40 border-slate-200/50 opacity-60'
                  }`}
                >
                      <div className="flex items-center gap-3 min-w-0 w-full">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      rem.type === 'birthday' ? 'bg-pink-100 text-pink-600' : rem.type === 'bill' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {rem.type === 'birthday' ? '🎂' : rem.type === 'bill' ? '💳' : '🗓️'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 break-words">{rem.title}</h4>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-400">
                        <span>تاریخ: {toPersianDigits(rem.dateKey)}</span>
                        {rem.time && (
                          <>
                            <span>•</span>
                            <span>ساعت: {toPersianDigits(rem.time)}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>
                          {rem.type === 'birthday' ? 'تولد و سالگرد' : rem.type === 'bill' ? 'پرداخت مالی' : 'رویداد'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    {daysLeft !== null && (
                      <span className={`text-xs font-black px-3 py-1 rounded-xl ${
                        daysLeft === 0
                          ? 'bg-rose-600 text-white animate-bounce'
                          : daysLeft > 0
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {daysLeft === 0
                          ? 'امروز سررسید است!'
                          : daysLeft > 0
                          ? `${toPersianDigits(daysLeft)} روز مانده`
                          : `${toPersianDigits(Math.abs(daysLeft))} روز گذشته`}
                      </span>
                    )}

                    <button
                      onClick={() => onToggleReminder(rem.id)}
                      className={`p-1.5 rounded-lg text-xs font-semibold ${
                        isRemEnabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      title={isRemEnabled ? 'فعال است' : 'غیرفعال است'}
                    >
                      <Bell className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteReminder(rem.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
