import { Task } from '../App';
import { TaskItem } from './TaskItem';
import { motion, AnimatePresence } from 'motion/react';
import { Inbox, Zap, CheckCircle2 } from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState } from 'react';

interface TaskListProps {
  tasks: Task[];
  currentTaskId: string | null;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onStart: (id: string) => void;
  onUpdateSchedule?: (id: string, date: Date) => void;
  onUpdateTitle?: (id: string, title: string) => void;
  onReorder?: (dragId: string, hoverId: string) => void;
  darkMode: boolean;
  selectedTaskIds?: string[];
  onToggleSelect?: (id: string) => void;
  onStartSelected?: () => void;
  onCompleteSelected?: () => void;
}

export function TaskList({ tasks, currentTaskId, onComplete, onDelete, onStart, onUpdateSchedule, onUpdateTitle, onReorder, darkMode, selectedTaskIds = [], onToggleSelect, onStartSelected, onCompleteSelected }: TaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (onReorder && over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
  };

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
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <SortableContext 
            items={tasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <AnimatePresence mode="popLayout">
              {tasks.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  index={index}
                  isCurrent={task.id === currentTaskId}
                  onComplete={onComplete}
                  onDelete={onDelete}
                  onStart={onStart}
                  onUpdateSchedule={onUpdateSchedule}
                  onUpdateTitle={onUpdateTitle}
                  onReorder={onReorder}
                  darkMode={darkMode}
                  selected={selectedTaskIds.includes(task.id)}
                  onToggleSelect={onToggleSelect}
                />
              ))}
            </AnimatePresence>
          </SortableContext>
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

        {/* Mark Done Button - only show when tasks are selected */}
        {selectedTaskIds.length > 0 && onCompleteSelected && (
          <motion.button
            onClick={onCompleteSelected}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            className={`w-full h-14 rounded-xl font-medium uppercase tracking-[0.15em] text-sm flex items-center justify-center gap-3 transition-all ${
              darkMode
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                : 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border border-green-500/20'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            Mark {selectedTaskIds.length} Done
          </motion.button>
        )}
      </div>
    </DndContext>
  );
}