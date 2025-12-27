import { useState, useRef } from 'react';
import { Task } from '../App';
import { Circle, Trash2, Clock, Repeat, Calendar as CalendarIcon, GripVertical, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { useDrag, useDrop } from 'react-dnd';

interface TaskItemProps {
  task: Task;
  isCurrent: boolean;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onStart: (id: string) => void;
  onUpdateSchedule?: (id: string, date: Date) => void;
  onReorder?: (dragId: string, hoverId: string) => void;
  index: number;
  darkMode: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function TaskItem({ task, isCurrent, onComplete, onDelete, onStart, onUpdateSchedule, onReorder, index, darkMode, selected = false, onToggleSelect }: TaskItemProps) {
  const [isSlashing, setIsSlashing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'TASK',
    item: { id: task.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'TASK',
    hover: (item: { id: string; index: number }) => {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      
      if (onReorder) {
        onReorder(item.id, task.id);
      }
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(ref));

  const handleComplete = () => {
    setIsSlashing(true);
    setTimeout(() => {
      onComplete(task.id);
    }, 600);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h`;
    if (mins > 0) return `${mins}m`;
    return `${seconds}s`;
  };

  return (
    <motion.div
      ref={ref}
      animate={isSlashing ? {
        opacity: 0.3,
        x: -10,
      } : {}}
      onClick={() => {
        if (onToggleSelect) {
          onToggleSelect(task.id);
        } else {
          handleComplete();
        }
      }}
      className={`group relative cursor-pointer rounded-xl border transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${
        isOver ? (darkMode ? 'border-white/20' : 'border-black/20') : ''
      } ${
        isCurrent
          ? darkMode
            ? 'bg-white/[0.04] border-white/[0.12]'
            : 'bg-black/[0.02] border-black/[0.12]'
          : darkMode
            ? 'bg-transparent border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.02]'
            : 'bg-transparent border-black/[0.06] hover:border-black/[0.1] hover:bg-black/[0.02]'
      }`}
    >
      <div className="p-5 flex items-start gap-4">
        {/* Drag Handle */}
        <div 
          className={`mt-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity ${
            darkMode ? 'text-white/20' : 'text-black/20'
          }`}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Checkbox */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleSelect) {
              onToggleSelect(task.id);
            } else {
              handleComplete();
            }
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="mt-0.5"
        >
          <div className={`w-4 h-4 rounded-full border transition-all flex items-center justify-center ${
            selected
              ? darkMode
                ? 'border-white bg-white'
                : 'border-black bg-black'
              : isCurrent
                ? darkMode
                  ? 'border-white/60'
                  : 'border-black/60'
                : darkMode
                  ? 'border-white/20 group-hover:border-white/40'
                  : 'border-black/20 group-hover:border-black/40'
          }`}>
            {!onToggleSelect && (
              <Circle className={`w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                darkMode ? 'text-white fill-white' : 'text-black fill-black'
              }`} />
            )}
          </div>
        </motion.button>
        
        <div className="flex-1 min-w-0">
          <div className="relative mb-2">
            <p className={`text-[15px] leading-[1.4] ${
              isSlashing ? 'line-through' : ''
            } ${
              isCurrent
                ? darkMode ? 'text-white' : 'text-black'
                : darkMode ? 'text-white/50' : 'text-black/50'
            }`}>
              {task.title}
            </p>
            
            {isSlashing && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={`absolute top-1/2 left-0 right-0 h-px origin-left ${
                  darkMode ? 'bg-white/60' : 'bg-black/60'
                }`}
              />
            )}
          </div>
          
          {/* Meta */}
          {(task.timeSpent > 0 || task.scheduledDate || task.recurring) && (
            <div className={`flex items-center gap-4 text-[9px] uppercase tracking-[0.12em] ${
              darkMode ? 'text-white/20' : 'text-black/20'
            }`}>
              {task.timeSpent > 0 && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(task.timeSpent)}</span>
                </div>
              )}
              
              {task.scheduledDate && (
                <div>
                  {new Date(task.scheduledDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              )}
              
              {task.recurring && (
                <div className="flex items-center gap-1.5">
                  <Repeat className="w-3 h-3" />
                  <span>
                    {task.recurring === 'daily' && 'Daily'}
                    {task.recurring === 'weekly' && 'Weekly'}
                    {task.recurring === 'monthly' && 'Monthly'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Calendar */}
        {onUpdateSchedule && (
          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className={`opacity-0 group-hover:opacity-100 p-2 rounded-md transition-all ${
                  darkMode
                    ? 'hover:bg-white/[0.06] text-white/20 hover:text-white/50'
                    : 'hover:bg-black/[0.04] text-black/20 hover:text-black/50'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
              </motion.button>
            </PopoverTrigger>
            <PopoverContent 
              className={`p-0 w-auto ${
                darkMode ? 'bg-black border-white/[0.08]' : 'bg-white border-black/[0.08]'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <Calendar
                mode="single"
                selected={task.scheduledDate}
                onSelect={(date: Date | undefined) => {
                  if (date) {
                    onUpdateSchedule(task.id, date);
                    setShowCalendar(false);
                  }
                }}
                disabled={(date: Date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md"
              />
            </PopoverContent>
          </Popover>
        )}
        
        {/* Delete */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className={`opacity-0 group-hover:opacity-100 p-2 rounded-md transition-all ${
            darkMode
              ? 'hover:bg-white/[0.06] text-white/20 hover:text-white/50'
              : 'hover:bg-black/[0.04] text-black/20 hover:text-black/50'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </motion.div>
  );
}