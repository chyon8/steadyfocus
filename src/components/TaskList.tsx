import { Task } from '../App';
import { TaskItem } from './TaskItem';
import { motion, AnimatePresence } from 'motion/react';
import { Inbox, Zap } from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useState } from 'react';

interface TaskListProps {
  tasks: Task[];
  currentTaskId: string | null;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onStart: (id: string) => void;
  onUpdateSchedule?: (id: string, date: Date) => void;
  onReorder?: (dragId: string, hoverId: string) => void;
  darkMode: boolean;
  selectedTaskIds?: string[];
  onToggleSelect?: (id: string) => void;
  onStartSelected?: () => void;
}

export function TaskList({ tasks, currentTaskId, onComplete, onDelete, onStart, onUpdateSchedule, onReorder, darkMode, selectedTaskIds = [], onToggleSelect, onStartSelected }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-32"
      >
        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-6 ${
          darkMode ? 'bg-white/5' : 'bg-black/5'
        }`}>
          <Inbox className={`w-6 h-6 ${
            darkMode ? 'text-white/30' : 'text-black/30'
          }`} />
        </div>
        <p className={`text-sm ${darkMode ? 'text-white/30' : 'text-black/30'}`}>
          No tasks yet
        </p>
      </motion.div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {tasks.map((task, index) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ 
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1], // Smooth deceleration curve
                  layout: { duration: 0.3 }
                }}
              >
                <TaskItem
                  task={task}
                  index={index}
                  isCurrent={task.id === currentTaskId}
                  onComplete={onComplete}
                  onDelete={onDelete}
                  onStart={onStart}
                  onUpdateSchedule={onUpdateSchedule}
                  onReorder={onReorder}
                  darkMode={darkMode}
                  selected={selectedTaskIds.includes(task.id)}
                  onToggleSelect={onToggleSelect}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Start Slashing Button */}
        <motion.button
          onClick={() => {
            if (onStartSelected && selectedTaskIds.length > 0) {
              onStartSelected();
            } else {
              const firstTask = tasks[0];
              if (firstTask) {
                onStart(firstTask.id);
              }
            }
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: Math.min(tasks.length * 0.03, 0.3) + 0.1,
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
          {selectedTaskIds.length > 0 ? `Start ${selectedTaskIds.length} Selected` : 'Start Slashing'}
        </motion.button>
      </div>
    </DndProvider>
  );
}