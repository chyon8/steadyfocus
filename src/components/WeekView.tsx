import { useState, useRef } from 'react';
import { Task } from '../App';
import { Calendar } from './ui/calendar';
import { motion } from 'motion/react';
import { Trash2, GripVertical } from 'lucide-react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface WeekViewProps {
  tasks: Task[];
  onUpdateSchedule: (id: string, date: Date) => void;
  onDelete: (id: string) => void;
  darkMode: boolean;
}

function DraggableTask({ task, onDelete, darkMode }: { task: Task; onDelete: (id: string) => void; darkMode: boolean }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'WEEK_TASK',
    item: { taskId: task.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const dragRef = useRef<HTMLDivElement>(null);
  drag(dragRef);

  return (
    <motion.div
      ref={dragRef}
      className={`group flex items-center gap-3 p-3 rounded-lg border transition-all cursor-move ${
        isDragging ? 'opacity-50' : ''
      } ${
        darkMode
          ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
          : 'bg-black/[0.01] border-black/[0.06] hover:border-black/[0.1]'
      }`}
    >
      <GripVertical className={`w-4 h-4 flex-shrink-0 ${
        darkMode ? 'text-white/20' : 'text-black/20'
      }`} />
      <p className={`flex-1 text-sm overflow-hidden text-ellipsis whitespace-nowrap min-w-0 ${
        darkMode ? 'text-white/60' : 'text-black/60'
      }`}>
        {task.title}
      </p>
      <motion.button
        onClick={() => onDelete(task.id)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`opacity-0 group-hover:opacity-100 p-1.5 rounded flex-shrink-0 ${
          darkMode
            ? 'hover:bg-white/[0.06] text-white/20'
            : 'hover:bg-black/[0.04] text-black/20'
        }`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </motion.button>
    </motion.div>
  );
}

function DroppableDate({ 
  date, 
  tasks, 
  onDrop, 
  onDelete,
  darkMode 
}: { 
  date: Date; 
  tasks: Task[];
  onDrop: (taskId: string) => void;
  onDelete: (id: string) => void;
  darkMode: boolean;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastDate = date < today;
  
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'WEEK_TASK',
    canDrop: () => !isPastDate,
    drop: (item: { taskId: string }) => {
      if (!isPastDate) {
        onDrop(item.taskId);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver() && monitor.canDrop(),
    }),
  }));

  const dropRef = useRef<HTMLDivElement>(null);
  drop(dropRef);

  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <div
      ref={dropRef}
      className={`p-4 rounded-xl border transition-all min-h-[200px] ${
        isOver
          ? darkMode
            ? 'border-white/40 bg-white/[0.04]'
            : 'border-black/40 bg-black/[0.04]'
          : darkMode
            ? 'border-white/[0.06]'
            : 'border-black/[0.06]'
      } ${isToday ? (darkMode ? 'bg-white/[0.02]' : 'bg-black/[0.01]') : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs uppercase tracking-[0.15em] ${
          isToday
            ? darkMode ? 'text-white' : 'text-black'
            : darkMode ? 'text-white/40' : 'text-black/40'
        }`}>
          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
        {tasks.length > 0 && (
          <span className={`text-xs ${
            darkMode ? 'text-white/20' : 'text-black/20'
          }`}>
            {tasks.length}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {tasks.map(task => (
          <DraggableTask key={task.id} task={task} onDelete={onDelete} darkMode={darkMode} />
        ))}
      </div>
    </div>
  );
}

export function WeekView({ tasks, onUpdateSchedule, onDelete, darkMode }: WeekViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const getWeekDates = (baseDate: Date) => {
    // Use the selected date to determine the week
    const weekStart = new Date(baseDate);
    weekStart.setDate(baseDate.getDate() - baseDate.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date;
    });
  };

  const weekDates = getWeekDates(selectedDate);

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (task.completed) return false;
      if (!task.scheduledDate) return false;
      return new Date(task.scheduledDate).toDateString() === date.toDateString();
    });
  };

  const handleDrop = (date: Date, taskId: string) => {
    onUpdateSchedule(taskId, date);
  };

  const unscheduledTasks = tasks.filter(t => !t.completed && !t.scheduledDate);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Calendar Selector */}
        <div className="flex flex-col items-start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date: Date | undefined) => date && setSelectedDate(date)}
            className="rounded-xl border"
          />
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-3 overflow-x-auto pb-2 min-w-0" style={{ gridTemplateColumns: 'repeat(7, minmax(140px, 1fr))' }}>
          {weekDates.map((date, index) => (
            <DroppableDate
              key={index}
              date={date}
              tasks={getTasksForDate(date)}
              onDrop={(taskId) => handleDrop(date, taskId)}
              onDelete={onDelete}
              darkMode={darkMode}
            />
          ))}
        </div>

        {/* Unscheduled Tasks */}
        {unscheduledTasks.length > 0 && (
          <div className={`p-6 rounded-xl border ${
            darkMode ? 'border-white/[0.06]' : 'border-black/[0.06]'
          }`}>
            <h3 className={`mb-4 tracking-[0.15em] uppercase text-xs ${
              darkMode ? 'text-white/40' : 'text-black/40'
            }`}>
              Unscheduled
            </h3>
            <div className="space-y-2">
              {unscheduledTasks.map(task => (
                <DraggableTask key={task.id} task={task} onDelete={onDelete} darkMode={darkMode} />
              ))}
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}