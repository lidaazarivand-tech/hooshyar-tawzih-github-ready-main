import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Search, 
  Calendar as CalendarIcon, 
  Tag,
  StickyNote
} from 'lucide-react';
import { UserNote } from '../../types/calendar';
import { toPersianDigits, makeDateKey, normalizeDateKey } from '../../utils/persianNumber';
import { getTodayJalali } from '../../utils/jalali';
import { DatePicker } from '../Common/DatePicker';

interface NotesViewProps {
  notes: UserNote[];
  onAddNote: (dateKey: string, title: string, content: string) => void;
  onDeleteNote: (id: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  onAddNote,
  onDeleteNote
}) => {
  const today = getTodayJalali();
  const todayKey = makeDateKey(today.jy, today.jm, today.jd);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dateKey, setDateKey] = useState(todayKey);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;
    const safeKey = normalizeDateKey(dateKey) || todayKey;
    onAddNote(safeKey, title.trim() || 'یادداشت جدید', content.trim());
    setTitle('');
    setContent('');
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredNotes = notes.filter(n => {
    if (!normalizedQuery) return true;
    const titleMatch = (n.title || '').toLowerCase().includes(normalizedQuery);
    const contentMatch = (n.content || '').toLowerCase().includes(normalizedQuery);
    const dateMatch = (n.dateKey || '').includes(normalizedQuery) || toPersianDigits(n.dateKey || '').includes(normalizedQuery);
    return titleMatch || contentMatch || dateMatch;
  });

  return (
    <div id="notes-main-view" className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-rose-600" />
            <span>یادداشت‌های متصل به تقویم</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">ثبت خاطرات، یادداشت‌های جلسات و وقایع روزانه</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در متن یادداشت‌ها..."
            className="w-full bg-white border border-[#D9DED9] rounded-xl py-2 pr-9 pl-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123C35]"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>
      </div>

      {/* Note Creation Form */}
      <form onSubmit={handleCreate} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-500" />
          <span>ثبت یادداشت جدید</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان یادداشت:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان یادداشت..."
              className="w-full bg-[#F7F4EC] border border-[#D9DED9] rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123C35] shadow-xs"
            />
          </div>

          <div className="sm:col-span-4">
            <DatePicker
              label="تاریخ یادداشت:"
              value={dateKey}
              onChange={setDateKey}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">متن یادداشت:</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="متن یادداشت، برنامه یا نکته مهم..."
            rows={3}
            className="w-full bg-[#F7F4EC] border border-[#D9DED9] rounded-2xl p-3.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123C35] resize-none shadow-xs"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ذخیره یادداشت</span>
          </button>
        </div>
      </form>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNotes.length === 0 ? (
          <div className="col-span-full py-12 px-6 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#F7F4EC] border border-[#D9DED9] flex items-center justify-center text-[#838E8A] mb-3">
              <FileText className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-[#1C2523] mb-1">
              {searchQuery ? 'هیچ یادداشتی با این جستجو پیدا نشد' : 'هنوز یادداشتی ثبت نکرده‌اید'}
            </p>
            <p className="text-xs text-[#59635F] max-w-xs">
              {searchQuery ? 'می‌توانید عبارت دیگری را جستجو کنید.' : 'با استفاده از فرم بالا می‌توانید اولین یادداشت متصل به تقویم خود را بنویسید.'}
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <div
              key={note.id}
              className="bg-amber-50/70 p-5 rounded-3xl border border-amber-200/80 shadow-2xs space-y-3 flex flex-col justify-between text-right"
            >
              <div>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-amber-200/60">
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    <span>{toPersianDigits(note.dateKey)}</span>
                  </span>
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="text-amber-800 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h4 className="text-sm font-black text-amber-950 mt-2">{note.title}</h4>
                <p className="text-xs text-amber-900/90 whitespace-pre-wrap leading-relaxed mt-1">
                  {note.content}
                </p>
              </div>

              <div className="text-[10px] text-amber-700/70 pt-2">
                ثبت شده در سیستم محلی آفلاین
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
