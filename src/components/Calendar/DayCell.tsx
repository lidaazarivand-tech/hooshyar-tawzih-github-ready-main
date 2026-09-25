import React from 'react';
import { FullDateInfo } from '../../types/calendar';
import { toPersianDigits } from '../../utils/persianNumber';

interface DayCellProps {
  dateInfo: FullDateInfo;
  isSelected: boolean;
  onSelect: (dateInfo: FullDateInfo) => void;
  hasUserNotes?: boolean;
  hasUserTasks?: boolean;
  showHijri?: boolean;
  showGregorian?: boolean;
}

export const DayCell: React.FC<DayCellProps> = ({
  dateInfo,
  isSelected,
  onSelect,
  hasUserNotes = false,
  hasUserTasks = false,
  showHijri = true,
  showGregorian = true
}) => {
  const { jalali, gregorian, hijri, isFriday, isHoliday, isCurrentDay, occasions } = dateInfo;
  const officialHolidayOccasions = occasions.filter(o => o.isHoliday);
  const otherOccasions = occasions.filter(o => !o.isHoliday);

  return (
    <button
      id={`day-cell-${jalali.jy}-${jalali.jm}-${jalali.jd}`}
      onClick={() => onSelect(dateInfo)}
      className={`relative group w-full min-h-[78px] sm:min-h-[92px] md:min-h-[105px] p-1.5 sm:p-2 rounded-2xl border transition-all duration-150 flex flex-col justify-between text-right overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#123C35]/40 active:scale-[0.98] ${
        isCurrentDay
          ? 'bg-gradient-to-b from-rose-50 to-amber-50/40 border-rose-300 shadow-[0_4px_12px_-2px_rgba(225,29,72,0.15),inset_0_1px_0_rgba(255,255,255,0.9)] ring-2 ring-rose-400/40'
          : isSelected
          ? 'bg-[#123C35]/10 border-[#123C35]/40 shadow-[0_2px_8px_rgba(18,60,53,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]'
          : isHoliday
          ? 'bg-red-50/50 hover:bg-red-50 border-red-200/70 shadow-[0_1px_3px_rgba(225,29,72,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] hover:shadow-[0_4px_10px_rgba(225,29,72,0.1)]'
          : 'bg-white hover:bg-[#F7F4EC]/60 border-[#D9DED9] hover:border-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)]'
      }`}
    >
      {/* Top row: Jalali Day & Current day indicator */}
      <div className="flex items-start justify-between w-full">
        <div className="flex items-center gap-1">
          <span
            className={`text-base sm:text-xl font-black leading-none ${
              isCurrentDay
                ? 'text-rose-600 font-black'
                : isHoliday
                ? 'text-rose-600 font-extrabold'
                : 'text-slate-800'
            }`}
          >
            {toPersianDigits(jalali.jd)}
          </span>

          {isCurrentDay && (
            <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-600 text-white shadow-2xs">
              امروز
            </span>
          )}
        </div>

        {/* Holiday Badge (🔴) or dots */}
        <div className="flex items-center gap-1">
          {officialHolidayOccasions.length > 0 && (
            <span 
              title={officialHolidayOccasions.map(o => o.title).join(' | ')}
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rose-600 animate-pulse ring-2 ring-rose-200"
            />
          )}

          {/* User note/task indicator */}
          {(hasUserNotes || hasUserTasks) && (
            <span 
              title="دارای یادداشت یا کارهای شخصی"
              className="w-1.5 h-1.5 rounded-full bg-amber-500"
            />
          )}
        </div>
      </div>

      {/* Middle: First Occasion Title Preview (if exists) */}
      <div className="w-full my-0.5 sm:my-1 overflow-hidden">
        {occasions.length > 0 ? (
          <div
            className={`text-[10px] sm:text-[11px] leading-tight line-clamp-1 sm:line-clamp-2 px-1 py-0.5 rounded-md font-medium ${
              officialHolidayOccasions.length > 0
                ? 'bg-rose-100/90 text-rose-800 font-bold'
                : 'bg-slate-100/90 text-slate-700'
            }`}
            title={occasions.map(o => `${o.isHoliday ? '🔴 ' : '• '}${o.title}`).join('\n')}
          >
            {occasions[0].title}
            {occasions.length > 1 && (
              <span className="text-[9px] font-normal opacity-80 mr-1">
                (+{toPersianDigits(occasions.length - 1)})
              </span>
            )}
          </div>
        ) : (
          <div className="h-3.5 sm:h-4" />
        )}
      </div>

      {/* Bottom row: Gregorian & Lunar dates */}
      {(showGregorian || showHijri) ? (
        <div className="w-full flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-100/80">
          {showGregorian ? (
            <span 
              className="text-slate-500 font-sans font-semibold tracking-tight" 
              title="روز میلادی"
              data-testid="day-cell-gregorian"
            >
              {gregorian.gd}
            </span>
          ) : (
            <span />
          )}

          {showHijri ? (
            <span 
              className="text-emerald-700/80 font-bold" 
              title="روز هجری قمری"
              data-testid="day-cell-hijri"
            >
              {toPersianDigits(hijri.hd)}
            </span>
          ) : (
            <span />
          )}
        </div>
      ) : (
        <div className="h-2" />
      )}
    </button>
  );
};
