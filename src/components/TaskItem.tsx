import { useState, useRef, useEffect } from 'react';
import { Task } from '../App';
import { Circle, Trash2, Clock, Repeat, Calendar as CalendarIcon, GripVertical, Check, Pencil, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskItemProps {
  task: Task;
  isCurrent: boolean;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onStart: (id: string) => void;
  onUpdateSchedule?: (id: string, date: Date) => void;
  onUpdateTitle?: (id: string, title: string) => void;
  onReorder?: (dragId: string, hoverId: string) => void;
  index: number;
  darkMode: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  isOverdue?: boolean;
}

export function TaskItem({ task, isCurrent, onComplete, onDelete, onStart, onUpdateSchedule, onUpdateTitle, onReorder, index, darkMode, selected = false, onToggleSelect, isOverdue = false }: TaskItemProps) {
  const [isSlashing, setIsSlashing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditTitle(task.title);
  }, [task.title]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as 'relative',
  };

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
      ref={setNodeRef}
      style={style}
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
      className={`group relative cursor-pointer rounded-xl border transition-colors ${
        isDragging ? 'opacity-50' : ''
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
      {isOverdue && !isEditing && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ top: '0.75rem', right: '0.75rem' }}
          className={`absolute flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold shadow-sm z-10 ${
            darkMode 
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 backdrop-blur-sm' 
              : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-600 border border-amber-200/80 shadow-amber-100/50'
          }`}
        >
          <AlertCircle className="w-3 h-3" />
          <span>Overdue</span>
        </motion.div>
      )}
      <div className="p-5 flex items-start gap-4">
        {/* Drag Handle */}
        <div 
          {...attributes}
          {...listeners}
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
            {isEditing ? (
              <input
                autoFocus
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editTitle.trim() && editTitle !== task.title) {
                      onUpdateTitle?.(task.id, editTitle.trim());
                    }
                    setIsEditing(false);
                  } else if (e.key === 'Escape') {
                    setEditTitle(task.title);
                    setIsEditing(false);
                  }
                }}
                onBlur={() => {
                  if (editTitle.trim() && editTitle !== task.title) {
                    onUpdateTitle?.(task.id, editTitle.trim());
                  }
                  setIsEditing(false);
                }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full bg-transparent border-b outline-none text-[15px] leading-[1.4] py-0 ${
                  darkMode 
                    ? 'text-white border-white/20 focus:border-white/50' 
                    : 'text-black border-black/20 focus:border-black/50'
                }`}
              />
            ) : (
              <p 
                onClick={(e) => {
                  if (onUpdateTitle) {
                    e.stopPropagation();
                    setIsEditing(true);
                  }
                }}
                className={`text-[15px] leading-[1.4] break-words pr-16 ${
                  isSlashing ? 'line-through' : ''
                } ${
                  isCurrent
                    ? darkMode ? 'text-white' : 'text-black'
                    : darkMode ? 'text-white/50' : 'text-black/50'
                } ${onUpdateTitle ? 'cursor-text hover:opacity-80' : ''}`}
              >
                {task.title}
              </p>
            )}
            
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
        
        {/* Edit */}
        {onUpdateTitle && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className={`opacity-0 group-hover:opacity-100 p-2 rounded-md transition-all ${
              darkMode
                ? 'hover:bg-white/[0.06] text-white/20 hover:text-white/50'
                : 'hover:bg-black/[0.04] text-black/20 hover:text-black/50'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </motion.button>
        )}
        
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