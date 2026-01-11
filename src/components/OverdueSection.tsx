import { Task } from '../App';
import { TaskItem } from './TaskItem';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";

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
  selectedTaskIds?: string[];
  onToggleSelect?: (id: string) => void;
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
  darkMode,
  selectedTaskIds = [],
  onToggleSelect
}: OverdueSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [confirmTaskId, setConfirmTaskId] = useState<string | null>(null);

  const handleTaskComplete = (id: string) => {
    setConfirmTaskId(id);
  };


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
                <div className="flex-1 min-w-0 overflow-hidden">
                  <TaskItem
                    task={task}
                    index={index}
                    isCurrent={false}
                    onComplete={handleTaskComplete}
                    onDelete={onDelete}
                    onStart={onStart}
                    onUpdateSchedule={onUpdateSchedule}
                    onUpdateTitle={onUpdateTitle}
                    darkMode={darkMode}
                    isOverdue={true}
                    selected={selectedTaskIds.includes(task.id)}
                    onToggleSelect={onToggleSelect}
                    onReschedule={onRescheduleToToday}
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={!!confirmTaskId} onOpenChange={(open) => !open && setConfirmTaskId(null)}>
        <AlertDialogContent className={darkMode ? 'bg-zinc-900 border-zinc-800' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle className={darkMode ? 'text-white' : ''}>Overdue Task</AlertDialogTitle>
            <AlertDialogDescription className={darkMode ? 'text-zinc-400' : ''}>
              Do you want to move this task to today?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={darkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700 border-zinc-700' : ''}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                if (confirmTaskId) {
                  onComplete(confirmTaskId);
                  setConfirmTaskId(null);
                }
              }}
              className={darkMode ? 'bg-transparent text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-white' : ''}
            >
              Mark as Done
            </Button>
            <AlertDialogAction
              onClick={() => {
                if (confirmTaskId) {
                  onRescheduleToToday(confirmTaskId);
                  setConfirmTaskId(null);
                }
              }}
              className={darkMode ? 'bg-amber-500 text-black hover:bg-amber-600' : 'bg-amber-500 text-white hover:bg-amber-600'}
            >
              Move to Today
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </motion.div>
  );
}
