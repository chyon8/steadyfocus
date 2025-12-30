import { Task } from '../App';
import { TaskItem } from './TaskItem';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface AllTasksViewProps {
  tasks: Task[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onStart: (id: string) => void;
  onUpdateSchedule?: (id: string, date: Date) => void;
  onUpdateTitle?: (id: string, title: string) => void;
  darkMode: boolean;
}

export function AllTasksView({ tasks, onComplete, onDelete, onStart, onUpdateSchedule, onUpdateTitle, darkMode }: AllTasksViewProps) {
  // Group tasks by date
  const groupTasksByDate = () => {
    const incompleteTasks = tasks.filter(t => !t.completed);
    const grouped: { [key: string]: Task[] } = {};

    incompleteTasks.forEach(task => {
      let dateKey: string;
      
      if (task.scheduledDate) {
        dateKey = new Date(task.scheduledDate).toDateString();
      } else {
        dateKey = 'No Date';
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });

    // Sort dates
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      if (a === 'No Date') return 1;
      if (b === 'No Date') return -1;
      return new Date(a).getTime() - new Date(b).getTime();
    });

    return sortedDates.map(dateKey => ({
      date: dateKey,
      tasks: grouped[dateKey],
    }));
  };

  const groupedTasks = groupTasksByDate();
  const allIncompleteTasks = tasks.filter(t => !t.completed);

  const formatDate = (dateStr: string) => {
    if (dateStr === 'No Date') return dateStr;
    
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-12">
        {groupedTasks.map((group, groupIndex) => {
          const date = group.date === 'No Date' ? new Date() : new Date(group.date);
          const dayNum = date.getDate();
          const dayName = formatDate(group.date);

          return (
            <motion.div
              key={group.date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Date Header */}
              <div className="flex items-center gap-6 mb-6">
                <div className={`flex items-baseline gap-2 ${
                  darkMode ? 'text-white' : 'text-black'
                }`}>
                  <span className="text-5xl tabular-nums">{dayNum}</span>
                  <span className="text-xl">{dayName}</span>
                </div>
                <div className={`flex-1 h-px ${
                  darkMode ? 'bg-white/[0.08]' : 'bg-black/[0.08]'
                }`} />
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                {group.tasks.map((task, taskIndex) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ 
                      delay: groupIndex * 0.1 + taskIndex * 0.03, 
                      duration: 0.3, 
                      ease: [0.16, 1, 0.3, 1] 
                    }}
                  >
                    <TaskItem
                      task={task}
                      index={taskIndex}
                      isCurrent={false}
                      onComplete={onComplete}
                      onDelete={onDelete}
                      onStart={onStart}
                      onUpdateSchedule={onUpdateSchedule}
                      onUpdateTitle={onUpdateTitle}
                      darkMode={darkMode}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}

        {groupedTasks.length === 0 && (
          <div className="text-center py-20">
            <p className={`text-sm ${darkMode ? 'text-white/30' : 'text-black/30'}`}>
              No tasks scheduled
            </p>
          </div>
        )}

        {/* Start Slashing Button */}
        {allIncompleteTasks.length > 0 && (
          <motion.button
            onClick={() => {
              const firstTask = allIncompleteTasks[0];
              if (firstTask) {
                onStart(firstTask.id);
              }
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: groupedTasks.length * 0.1 + 0.2,
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1]
            }}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            className={`w-full h-16 rounded-xl font-medium uppercase tracking-[0.15em] text-sm flex items-center justify-center gap-3 transition-all ${
              darkMode
                ? 'bg-white text-black hover:bg-white/95'
                : 'bg-black text-white hover:bg-black/95'
            }`}
          >
            <Zap className="w-5 h-5" fill="currentColor" />
            Start Slashing
          </motion.button>
        )}
      </div>
    </DndProvider>
  );
}