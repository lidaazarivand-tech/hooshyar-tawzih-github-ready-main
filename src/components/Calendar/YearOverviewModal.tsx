import React from 'react';
import { X, Calendar, ArrowLeft, Sparkles } from 'lucide-react';
import { 
  PERSIAN_MONTH_NAMES, 
  toPersianDigits, 
  PERSIAN_WEEK_DAYS 
} from '../../utils/persianNumber';
import { 
  getJalaliMonthLength, 
  getMonthFirstDayOfWeek, 
  isLeapYear, 
  getTodayJalali 
} from '../../utils/jalali';
import { isDateOfficialHoliday } from '../../data/occasions';

interface YearOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  onSelectYearMonth: (year: number, month: number) => void;
  onSelectYear: (year: number) => void;
  hijriAdjustment: number;
}

export const YearOverviewModal: React.FC<YearOverviewModalProps> = ({
  isOpen,
  onClose,
  year,
  onSelectYearMonth,
  onSelectYear,
  hijriAdjustment
}) => {
  // Handle ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const today = getTodayJalali();
  const isLeap = isLeapYear(year);

  return (
    <div 
      id="year-overview-modal-overlay"
      className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="year-overview-modal-content"
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10">
              <Calendar className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black">
                  گاهشماری کامل سال {toPersianDigits(year)} هجری شمسی
                </h2>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isLeap ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-white'
                }`}>
                  {isLeap ? 'سال کبیسه (۳۶۶ روز)' : 'سال عادی (۳۶۵ روز)'}
                </span>
              </div>
              <p className="text-xs text-slate-400">مرور کلی ۱۲ ماه سال با نمایش تعطیلات و روزهای رسمی</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Year Switcher */}
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
              {[1404, 1405, 1406, 1407, 1408, 1409, 1410].map((y) => (
                <button
                  key={y}
                  onClick={() => onSelectYear(y)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    y === year ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {toPersianDigits(y)}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 12 Months Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {PERSIAN_MONTH_NAMES.map((monthName, monthIndex) => {
            const m = monthIndex + 1;
            const daysCount = getJalaliMonthLength(year, m);
            const firstDayOfWeek = getMonthFirstDayOfWeek(year, m);
            const isCurrentMonth = today.jy === year && today.jm === m;

            // Count holidays (including Fridays)
            let holidayCount = 0;
            for (let d = 1; d <= daysCount; d++) {
              const dayOfWeek = (firstDayOfWeek + d - 1) % 7;
              if (dayOfWeek === 6 || isDateOfficialHoliday(year, m, d, hijriAdjustment)) {
                holidayCount++;
              }
            }

            return (
              <div
                key={m}
                onClick={() => {
                  onSelectYearMonth(year, m);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer group text-right ${
                  isCurrentMonth
                    ? 'bg-rose-50/50 border-rose-300 shadow-md ring-2 ring-rose-400/30'
                    : 'bg-slate-50/70 hover:bg-white hover:border-slate-300 border-slate-200 shadow-2xs hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-slate-900 group-hover:text-rose-600 transition-colors">
                      {monthName}
                    </span>
                    {isCurrentMonth && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-600 text-white">
                        ماه جاری
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {toPersianDigits(holidayCount)} تعطیل
                  </span>
                </div>

                {/* Day of Week Header */}
                <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] text-slate-400 font-medium mb-1">
                  {PERSIAN_WEEK_DAYS.map((wd) => (
                    <div key={wd.key} className={wd.key === 6 ? 'text-rose-500 font-bold' : ''}>
                      {wd.short}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
                  {/* Empty cells for starting offset */}
                  {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="h-5" />
                  ))}

                  {/* Days */}
                  {Array.from({ length: daysCount }, (_, i) => i + 1).map((d) => {
                    const dayOfWeek = (firstDayOfWeek + d - 1) % 7;
                    const isFri = dayOfWeek === 6;
                    const isHol = isFri || isDateOfficialHoliday(year, m, d, hijriAdjustment);
                    const isTodayCell = today.jy === year && today.jm === m && today.jd === d;

                    return (
                      <div
                        key={d}
                        className={`h-5 flex items-center justify-center rounded-md font-medium ${
                          isTodayCell
                            ? 'bg-rose-600 text-white font-black shadow-xs'
                            : isHol
                            ? 'text-rose-600 font-bold bg-rose-100/40'
                            : 'text-slate-700'
                        }`}
                      >
                        {toPersianDigits(d)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
