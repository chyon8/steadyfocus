import { Task } from '../App';
import { TaskItem } from './TaskItem';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { useState } from 'react';

interface OverdueSectionProps {
  tasks: Task[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onStart: (id: string) => void;
  onUpdateSchedule?: (id: string, date: Date) => void;
  onUpdateTitle?: (id: string, title: string) => void;
  onRescheduleToToday: (id: string) => void;
  onRescheduleAllToToday: () => void;
  darkMode: boolean;
}

export function OverdueSection({ 
  tasks, 
  onComplete, 
  onDelete, 
  onStart, 
  onUpdateSchedule, 
  onUpdateTitle, 
  onRescheduleToToday,
  onRescheduleAllToToday,
  darkMode 
}: OverdueSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (tasks.length === 0) return null;

  // Sort by date (oldest first)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.scheduledDate || !b.scheduledDate) return 0;
    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors ${
            darkMode ? 'text-amber-400/80 hover:text-amber-400' : 'text-amber-600/80 hover:text-amber-600'
          }`}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
          Overdue
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
            darkMode ? 'bg-amber-400/20 text-amber-400' : 'bg-amber-600/10 text-amber-600'
          }`}>
            {tasks.length}
          </span>
        </button>

        {tasks.length > 1 && (
          <button
            onClick={onRescheduleAllToToday}
            className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors ${
              darkMode ? 'text-white/30 hover:text-white/60' : 'text-black/30 hover:text-black/60'
            }`}
          >
            <ArrowRight className="w-3 h-3" />
            All to Today
          </button>
        )}
      </div>

      {/* Tasks List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`space-y-2 p-4 rounded-xl ${
              darkMode ? 'bg-amber-400/5' : 'bg-amber-50'
            }`}
          >
            {sortedTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  delay: index * 0.03, 
                  duration: 0.3, 
                  ease: [0.16, 1, 0.3, 1] 
                }}
                className="group/item flex items-center gap-2"
              >
                <div className="flex-1">
                  <TaskItem
                    task={task}
                    index={index}
                    isCurrent={false}
                    onComplete={onComplete}
                    onDelete={onDelete}
                    onStart={onStart}
                    onUpdateSchedule={onUpdateSchedule}
                    onUpdateTitle={onUpdateTitle}
                    darkMode={darkMode}
                    isOverdue={true}
                  />
                </div>
                
                {/* Quick Reschedule Button */}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRescheduleToToday(task.id);
                  }}
                  className={`opacity-0 group-hover/item:opacity-100 px-3 py-2 rounded-lg text-[10px] font-medium uppercase tracking-[0.1em] transition-all whitespace-nowrap ${
                    darkMode
                      ? 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
                      : 'bg-black/5 hover:bg-black/10 text-black/70 hover:text-black'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  → Today
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
