import React, { useState } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Moon, 
  Sun, 
  Clock, 
  MapPin, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  ArrowLeftRight,
  Bookmark,
  Share2
} from 'lucide-react';
import { FullDateInfo, UserNote, UserTask } from '../../types/calendar';
import { 
  toPersianDigits, 
  PERSIAN_MONTH_NAMES, 
  GREGORIAN_MONTH_NAMES, 
  HIJRI_MONTH_NAMES,
  makeDateKey,
  isSameDateKey
} from '../../utils/persianNumber';
import { calculatePrayerTimes, IRANIAN_CITIES } from '../../utils/prayerTimes';

interface DayDetailModalProps {
  dateInfo: FullDateInfo | null;
  onClose: () => void;
  selectedCityId: string;
  userNotes: UserNote[];
  userTasks: UserTask[];
  onAddNote: (dateKey: string, title: string, content: string) => void;
  onDeleteNote: (id: string) => void;
  onAddTask: (dateKey: string, text: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onNavigateToConverterWithDate?: (dateInfo: FullDateInfo) => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  dateInfo,
  onClose,
  selectedCityId,
  userNotes,
  userTasks,
  onAddNote,
  onDeleteNote,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onNavigateToConverterWithDate
}) => {
  // Quick form states - ALL HOOKS UNCONDITIONALLY AT TOP
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [newTaskText, setNewTaskText] = useState('');

  // Handle ESC and mobile back button
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dateInfo) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, dateInfo]);

  // Lock body scroll
  React.useEffect(() => {
    if (dateInfo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [dateInfo]);

  if (!dateInfo) return null;

  const { jalali, gregorian, hijri, dayOfWeekName, isFriday, isHoliday, occasions, isCurrentDay } = dateInfo;
  const dateKey = makeDateKey(jalali.jy, jalali.jm, jalali.jd);

  const city = IRANIAN_CITIES.find(c => c.id === selectedCityId) || IRANIAN_CITIES[0];
  const prayers = calculatePrayerTimes(gregorian, city);

  const dayNotes = userNotes.filter(n => isSameDateKey(n.dateKey, dateKey));
  const dayTasks = userTasks.filter(t => isSameDateKey(t.dateKey, dateKey));

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteContent.trim()) return;
    onAddNote(dateKey, noteTitle.trim() || 'یادداشت', noteContent.trim());
    setNoteTitle('');
    setNoteContent('');
    setShowAddNote(false);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    onAddTask(dateKey, newTaskText.trim());
    setNewTaskText('');
  };

  return (
    <div 
      id="day-detail-modal-overlay"
      className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="day-detail-modal-content"
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`p-5 sm:p-6 border-b text-white relative overflow-hidden ${
          isHoliday 
            ? 'bg-gradient-to-l from-rose-600 to-rose-700' 
            : 'bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900'
        }`}>
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-400/10 rounded-full blur-xl -ml-5 -mb-5" />

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold tracking-wide opacity-90">
                  {dayOfWeekName}
                </span>
                {isCurrentDay && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold shadow-xs">
                    امروز
                  </span>
                )}
                {isHoliday && (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold backdrop-blur-xs">
                    🔴 تعطیل رسمی
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                {toPersianDigits(jalali.jd)} {PERSIAN_MONTH_NAMES[jalali.jm - 1]} {toPersianDigits(jalali.jy)}
              </h2>
              <p className="text-xs opacity-80 mt-1">
                فصل {dateInfo.seasonName} • {dateInfo.zodiacSign}
              </p>
            </div>

            <button
              id="btn-close-day-modal"
              onClick={onClose}
              className="p-2 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors"
              title="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* 3 Calendar Equivalent Dates Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Gregorian Date Card */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-right">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
                <Sun className="w-3.5 h-3.5 text-amber-600" />
                <span>معادل میلادی</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-800 font-sans tracking-wide">
                {gregorian.gd} {GREGORIAN_MONTH_NAMES[gregorian.gm - 1]} {gregorian.gy}
              </p>
            </div>

            {/* Hijri Lunar Date Card */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-right">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium mb-1">
                <Moon className="w-3.5 h-3.5 text-emerald-600" />
                <span>معادل قمری</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-800">
                {toPersianDigits(hijri.hd)} {HIJRI_MONTH_NAMES[hijri.hm - 1]} {toPersianDigits(hijri.hy)}
              </p>
            </div>
          </div>

          {/* Occasions Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>مناسبت‌ها و رویدادهای این روز</span>
              </h3>
              <span className="text-xs text-slate-400">
                {toPersianDigits(occasions.length)} مناسبت
              </span>
            </div>

            {occasions.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-500">
                هیچ مناسبت رسمی یا تقویمی برای این روز ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-2">
                {occasions.map((occ) => (
                  <div
                    key={occ.id}
                    className={`p-3 rounded-2xl border transition-all text-right flex items-start gap-2.5 ${
                      occ.isHoliday
                        ? 'bg-rose-50/90 border-rose-200 text-rose-900 shadow-2xs'
                        : occ.type === 'religious'
                        ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                        : occ.type === 'cultural'
                        ? 'bg-blue-50/70 border-blue-200/80 text-blue-900'
                        : 'bg-slate-50 border-slate-200/80 text-slate-800'
                    }`}
                  >
                    <span className="text-base mt-0.5">
                      {occ.isHoliday ? '🔴' : occ.type === 'religious' ? '🟢' : occ.type === 'cultural' ? '🔵' : '🔹'}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold leading-snug">
                          {occ.title}
                        </span>
                        {occ.isHoliday && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold shadow-2xs">
                            تعطیل رسمی
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 bg-white/70 px-1.5 py-0.5 rounded-md border border-slate-200/50">
                          {occ.type === 'national' ? 'ملی' : occ.type === 'religious' ? 'مذهبی' : occ.type === 'cultural' ? 'فرهنگی / باستانی' : 'بین‌المللی'}
                        </span>
                      </div>
                      {occ.description && (
                        <p className="text-xs text-slate-600 mt-1">{occ.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prayer Times Section */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>اوقات شرعی به افق {city.name}</span>
              </div>
              <span className="text-[10px] text-slate-400">محاسبه موسسه ژئوفیزیک دانشگاه تهران</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center text-xs">
              <div className="bg-white p-1.5 rounded-xl border border-slate-200/60">
                <div className="text-[10px] text-slate-400">اذان صبح</div>
                <div className="font-bold text-slate-800 mt-0.5">{prayers.fajr}</div>
              </div>
              <div className="bg-white p-1.5 rounded-xl border border-slate-200/60">
                <div className="text-[10px] text-slate-400">طلوع آفتاب</div>
                <div className="font-bold text-slate-800 mt-0.5">{prayers.sunrise}</div>
              </div>
              <div className="bg-white p-1.5 rounded-xl border border-slate-200/60">
                <div className="text-[10px] text-slate-400">اذان ظهر</div>
                <div className="font-bold text-slate-800 mt-0.5">{prayers.dhuhr}</div>
              </div>
              <div className="bg-white p-1.5 rounded-xl border border-slate-200/60">
                <div className="text-[10px] text-slate-400">غروب آفتاب</div>
                <div className="font-bold text-slate-800 mt-0.5">{prayers.sunset}</div>
              </div>
              <div className="bg-white p-1.5 rounded-xl border border-slate-200/60">
                <div className="text-[10px] text-slate-400">اذان مغرب</div>
                <div className="font-bold text-slate-800 mt-0.5">{prayers.maghrib}</div>
              </div>
              <div className="bg-white p-1.5 rounded-xl border border-slate-200/60">
                <div className="text-[10px] text-slate-400">نیمه‌شب</div>
                <div className="font-bold text-slate-800 mt-0.5">{prayers.midnight}</div>
              </div>
            </div>
          </div>

          {/* Personal Tasks for this day */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-rose-600" />
                <span>کارهای برنامه‌ریزی شده برای این روز</span>
              </h3>
            </div>

            {/* Add Task input */}
            <form onSubmit={handleCreateTask} className="flex gap-2">
              <input
                id="input-day-task"
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="ثبت کار جدید برای این تاریخ..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                id="btn-add-day-task"
                type="submit"
                className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن</span>
              </button>
            </form>

            {dayTasks.length > 0 && (
              <div className="space-y-1.5">
                {dayTasks.map(task => (
                  <div 
                    key={task.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                  >
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className="flex items-center gap-2 text-right flex-1"
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                        task.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {task.completed && <Check className="w-3 h-3" />}
                      </div>
                      <span className={task.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}>
                        {task.text}
                      </span>
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Personal Notes for this day */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                یادداشت‌های اختصاصی ({toPersianDigits(dayNotes.length)})
              </h3>
              {!showAddNote && (
                <button
                  id="btn-toggle-add-note"
                  onClick={() => setShowAddNote(true)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت یادداشت جدید</span>
                </button>
              )}
            </div>

            {showAddNote && (
              <form onSubmit={handleSaveNote} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="عنوان یادداشت..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="متن یادداشت..."
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddNote(false)}
                    className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors"
                  >
                    ذخیره یادداشت
                  </button>
                </div>
              </form>
            )}

            {dayNotes.map(note => (
              <div key={note.id} className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-right space-y-1 relative">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-950">{note.title}</h4>
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="text-amber-800 hover:text-rose-600 p-1"
                    title="حذف یادداشت"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-amber-900/90 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            id="btn-open-in-converter"
            onClick={() => {
              if (onNavigateToConverterWithDate) {
                onNavigateToConverterWithDate(dateInfo);
              }
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs hover:bg-slate-50"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
            <span>مشاهده در تبدیل تاریخ</span>
          </button>

          <button
            id="btn-close-day-detail-bottom"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-xs"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
