import { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Plus, Calendar as CalendarIcon, Settings2, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, addWeeks, startOfWeek, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from 'date-fns';
import { ko } from 'date-fns/locale';

interface AddTaskFormProps {
  onAdd: (title: string, scheduledDate?: Date, recurring?: 'daily' | 'weekly' | 'monthly', notes?: string) => void;
  darkMode: boolean;
}

// Date suggestion type
interface DateSuggestion {
  label: string;
  date: Date;
  keyword: string;
}

// Get date suggestions based on partial input
const getDateSuggestions = (text: string): DateSuggestion[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if text contains '@'
  const atMatch = text.match(/@(\S*)$/);
  if (!atMatch) return [];

  const query = atMatch[1].toLowerCase();
  console.log('Checking suggestions for:', query); // Debug

  if (query.length < 1) {
    // Show common suggestions when just '@' is typed
    return [
      { label: '오늘', date: today, keyword: '오늘' },
      { label: '내일', date: addDays(today, 1), keyword: '내일' },
      { label: 'Today', date: today, keyword: 'today' },
      { label: 'Tomorrow', date: addDays(today, 1), keyword: 'tomorrow' },
      { label: '다음주', date: addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1), keyword: '다음주' },
    ];
  }

  const suggestions: DateSuggestion[] = [];

  // Check if query is numeric (MMDD format)
  const numericMatch = query.match(/^(\d{2,4})$/);
  if (numericMatch) {
    const digits = numericMatch[1];
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed
    const currentDay = today.getDate();

    if (digits.length === 2) {
      // @MM -> MM월 1일
      const month = parseInt(digits, 10);
      if (month >= 1 && month <= 12) {
        let targetDate = new Date(currentYear, month - 1, 1);
        
        // If date is in the past, use next year
        if (targetDate < today) {
          targetDate = new Date(currentYear + 1, month - 1, 1);
        }
        
        return [{
          label: `${month}월 1일`,
          date: targetDate,
          keyword: digits,
        }];
      }
    } else if (digits.length === 4) {
      // @MMDD -> MM월 DD일
      const month = parseInt(digits.substring(0, 2), 10);
      const day = parseInt(digits.substring(2, 4), 10);
      
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        let targetDate = new Date(currentYear, month - 1, day);
        
        // Check if valid date
        if (targetDate.getMonth() === month - 1) {
          // If date is in the past, use next year
          if (targetDate < today) {
            targetDate = new Date(currentYear + 1, month - 1, day);
          }
          
          return [{
            label: `${month}월 ${day}일`,
            date: targetDate,
            keyword: digits,
          }];
        }
      }
    }
  }

  // Special case: "다음" shows multiple options
  if (query.startsWith('다음') || query.startsWith('ㄷㅇ') || query === 'ㄷ') {
    const nextWeekDays = [
      { label: '다음주 월요일', date: nextMonday(addWeeks(today, 0)) },
      { label: '다음주 화요일', date: nextTuesday(addWeeks(today, 0)) },
      { label: '다음주 수요일', date: nextWednesday(addWeeks(today, 0)) },
      { label: '다음주 목요일', date: nextThursday(addWeeks(today, 0)) },
      { label: '다음주 금요일', date: nextFriday(addWeeks(today, 0)) },
    ];
    return nextWeekDays.map(item => ({ ...item, keyword: item.label }));
  }

  // Korean suggestions
  const koreanKeywords = [
    { keys: ['오늘', 'ㅇㄴ', 'ㅇ'], label: '오늘', date: today },
    { keys: ['내일', 'ㄴㅇ', 'ㄴ'], label: '내일', date: addDays(today, 1) },
    { keys: ['모레', 'ㅁㄹ', 'ㅁ'], label: '모레', date: addDays(today, 2) },
    { keys: ['월요일', '월'], label: '월요일', date: nextMonday(today) },
    { keys: ['화요일', '화'], label: '화요일', date: nextTuesday(today) },
    { keys: ['수요일', '수'], label: '수요일', date: nextWednesday(today) },
    { keys: ['목요일', '목'], label: '목요일', date: nextThursday(today) },
    { keys: ['금요일', '금'], label: '금요일', date: nextFriday(today) },
    { keys: ['토요일', '토'], label: '토요일', date: nextSaturday(today) },
    { keys: ['일요일', '일'], label: '일요일', date: nextSunday(today) },
  ];

  // English suggestions
  const englishKeywords = [
    { keys: ['today', 'tod', 'to'], label: 'Today', date: today },
    { keys: ['tomorrow', 'tom', 'tm'], label: 'Tomorrow', date: addDays(today, 1) },
    { keys: ['monday', 'mon', 'mo'], label: 'Monday', date: nextMonday(today) },
    { keys: ['tuesday', 'tue', 'tu'], label: 'Tuesday', date: nextTuesday(today) },
    { keys: ['wednesday', 'wed', 'we'], label: 'Wednesday', date: nextWednesday(today) },
    { keys: ['thursday', 'thu', 'th'], label: 'Thursday', date: nextThursday(today) },
    { keys: ['friday', 'fri', 'fr'], label: 'Friday', date: nextFriday(today) },
    { keys: ['saturday', 'sat', 'sa'], label: 'Saturday', date: nextSaturday(today) },
    { keys: ['sunday', 'sun', 'su'], label: 'Sunday', date: nextSunday(today) },
    { keys: ['nextweek', 'next', 'ne'], label: 'Next week', date: addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1) },
  ];

  const allKeywords = [...koreanKeywords, ...englishKeywords];

  // Match keywords
  for (const item of allKeywords) {
    for (const key of item.keys) {
      if (key.startsWith(query)) {
        // Avoid duplicates
        if (!suggestions.find(s => s.label === item.label)) {
          suggestions.push({
            label: item.label,
            date: item.date,
            keyword: key,
          });
        }
        break;
      }
    }
  }

  console.log('Found suggestions:', suggestions.length); // Debug
  return suggestions.slice(0, 5); // Limit to 5 suggestions
};

export function AddTaskForm({ onAdd, darkMode }: AddTaskFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [recurring, setRecurring] = useState<'daily' | 'weekly' | 'monthly' | undefined>();
  
  // Smart Date Picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedQuickDate, setSelectedQuickDate] = useState<Date | undefined>();
  const [showCalendar, setShowCalendar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Date suggestions
  const [dateSuggestions, setDateSuggestions] = useState<DateSuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate next 7 days for quick date picker
  const quickDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return date;
  });

  // Get suggestions on title change
  useEffect(() => {
    const suggestions = getDateSuggestions(title);
    setDateSuggestions(suggestions);
    setSelectedSuggestionIndex(0);
  }, [title]);

  // Handle quick add with smart date picker
  const handleQuickAdd = (dateToUse?: Date, cleanTitle?: string) => {
    if (title.trim()) {
      const finalTitle = cleanTitle || title.trim();
      
      // Default to today if no date selected
      const finalDate = dateToUse || selectedQuickDate || today;
      onAdd(finalTitle, finalDate);
      setTitle('');
      setSelectedQuickDate(undefined);
      setDateSuggestions([]);
      // Keep the date picker open for next task
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim(), scheduledDate, recurring, notes.trim() || undefined);
      setTitle('');
      setNotes('');
      setScheduledDate(undefined);
      setRecurring(undefined);
      setOpen(false);
    }
  };

  // Accept suggestion
  const acceptSuggestion = (suggestion: DateSuggestion) => {
    // Remove the @keyword from the title
    const cleanTitle = title.replace(/@\S*$/, '').trim();
    
    handleQuickAdd(suggestion.date, cleanTitle);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (dateSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => 
        prev < dateSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Tab' && dateSuggestions.length > 0) {
      e.preventDefault();
      acceptSuggestion(dateSuggestions[selectedSuggestionIndex]);
    } else if (e.key === 'Enter' && dateSuggestions.length > 0) {
      e.preventDefault();
      acceptSuggestion(dateSuggestions[selectedSuggestionIndex]);
    }
  };

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`rounded-xl border transition-all ${
      darkMode 
        ? 'bg-black/40 border-white/[0.06]' 
        : 'bg-white/60 border-black/[0.06]'
    }`}
      style={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="relative">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (dateSuggestions.length > 0) {
            acceptSuggestion(dateSuggestions[selectedSuggestionIndex]);
          } else {
            handleQuickAdd();
          }
        }}>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="New task... (try @today, @1225, @내일)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => setShowDatePicker(true)}
              onKeyDown={handleKeyDown}
              className={`w-full px-5 py-4 pr-12 bg-transparent outline-none text-sm ${
                darkMode
                  ? 'text-white placeholder:text-white/25'
                  : 'text-black placeholder:text-black/25'
              }`}
            />
            
            <motion.button
              type="submit"
              disabled={!title.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center transition-all disabled:opacity-20 ${
                darkMode
                  ? 'bg-white text-black hover:bg-white/95'
                  : 'bg-black text-white hover:bg-black/95'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </form>

        {/* Date Suggestions Dropdown */}
        <AnimatePresence>
          {dateSuggestions.length > 0 && title.trim() && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-2xl z-50 overflow-hidden ${
                darkMode
                  ? 'bg-black border-white/[0.06]'
                  : 'bg-white border-black/[0.06]'
              }`}
              style={{
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <div className={`px-4 py-3 border-b ${
                darkMode ? 'border-white/[0.06]' : 'border-black/[0.06]'
              }`}>
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-3 h-3 ${
                    darkMode ? 'text-white/40' : 'text-black/40'
                  }`} />
                  <div className={`text-[9px] uppercase tracking-[0.15em] ${
                    darkMode ? 'text-white/40' : 'text-black/40'
                  }`}>
                    Date suggestions
                  </div>
                </div>
              </div>
              
              <div className="p-2">
                {dateSuggestions.map((suggestion, index) => (
                  <motion.button
                    key={suggestion.label}
                    type="button"
                    onClick={() => acceptSuggestion(suggestion)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full px-4 py-3 rounded-lg transition-all flex items-center justify-between ${
                      index === selectedSuggestionIndex
                        ? darkMode
                          ? 'bg-white text-black'
                          : 'bg-black text-white'
                        : darkMode
                          ? 'hover:bg-white/[0.08] text-white'
                          : 'hover:bg-black/[0.06] text-black'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`text-sm font-medium ${
                        index === selectedSuggestionIndex
                          ? darkMode ? 'text-black' : 'text-white'
                          : darkMode ? 'text-white' : 'text-black'
                      }`}>
                        {suggestion.label}
                      </div>
                      <div className={`text-[10px] ${
                        index === selectedSuggestionIndex
                          ? darkMode ? 'text-black/50' : 'text-white/50'
                          : darkMode ? 'text-white/40' : 'text-black/40'
                      }`}>
                        {format(suggestion.date, 'MMM d, EEE')}
                      </div>
                    </div>
                    {index === selectedSuggestionIndex && (
                      <div className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded ${
                        darkMode 
                          ? 'bg-black/10 text-black/60'
                          : 'bg-white/20 text-white/60'
                      }`}>
                        Tab
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Smart Date Picker Popover */}
        <AnimatePresence>
          {showDatePicker && title.trim() && dateSuggestions.length === 0 && (
            <motion.div
              ref={datePickerRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`absolute top-full left-0 right-0 mt-2 p-4 rounded-xl border shadow-2xl z-50 ${
                darkMode
                  ? 'bg-black border-white/[0.06]'
                  : 'bg-white border-black/[0.06]'
              }`}
              style={{
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <div className={`text-[9px] uppercase tracking-[0.15em] mb-3 ${
                darkMode ? 'text-white/40' : 'text-black/40'
              }`}>
                Schedule for
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {quickDates.map((date, index) => {
                  const isToday = index === 0;
                  const isSelected = selectedQuickDate?.getTime() === date.getTime();
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setSelectedQuickDate(date);
                        handleQuickAdd(date);
                      }}
                      className={`px-2 py-3 rounded-lg transition-all ${
                        isSelected || (isToday && !selectedQuickDate)
                          ? darkMode
                            ? 'bg-white text-black'
                            : 'bg-black text-white'
                          : darkMode
                            ? 'bg-white/[0.06] hover:bg-white/[0.12] text-white'
                            : 'bg-black/[0.06] hover:bg-black/[0.12] text-black'
                      }`}
                    >
                      <div className="text-[9px] uppercase tracking-wider mb-0.5 opacity-60">
                        {format(date, 'EEE')}
                      </div>
                      <div className="text-sm font-medium">
                        {format(date, 'd')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}