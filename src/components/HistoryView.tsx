import { Task } from '../App';
import { CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface HistoryViewProps {
  tasks: Task[];
  darkMode: boolean;
}

export function HistoryView({ tasks, darkMode }: HistoryViewProps) {
  const completedTasks = tasks
    .filter(t => t.completed)
    .sort((a, b) => {
      const dateA = a.completedAt || a.createdAt;
      const dateB = b.completedAt || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const taskDate = new Date(date);
    const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
    
    if (taskDay.getTime() === today.getTime()) {
      return 'Today';
    } else if (taskDay.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return taskDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const groupedByDate = completedTasks.reduce((acc, task) => {
    const date = formatDate(task.completedAt || task.createdAt);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  if (completedTasks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <CheckCircle2 className={`w-12 h-12 mx-auto mb-6 ${
            darkMode ? 'text-white/10' : 'text-black/10'
          }`} />
          <h2 className={`text-2xl mb-2 ${
            darkMode ? 'text-white/60' : 'text-black/60'
          }`}>
            No completed tasks yet
          </h2>
          <p className={`text-sm ${
            darkMode ? 'text-white/30' : 'text-black/30'
          }`}>
            Start completing tasks to see your history
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className={`text-[48px] leading-[1] tracking-[-0.02em] mb-4 ${
          darkMode ? 'text-white' : 'text-black'
        }`}>
          History
        </h1>
        <p className={`text-sm ${
          darkMode ? 'text-white/40' : 'text-black/40'
        }`}>
          {completedTasks.length} completed task{completedTasks.length !== 1 ? 's' : ''}
        </p>
      </motion.div>

      {/* Grouped Tasks */}
      <div className="space-y-8">
        {Object.entries(groupedByDate).map(([date, tasks], groupIndex) => (
          <motion.div
            key={date}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.05 }}
          >
            <h2 className={`text-xs uppercase tracking-[0.15em] mb-4 ${
              darkMode ? 'text-white/40' : 'text-black/40'
            }`}>
              {date}
            </h2>
            
            <div className="space-y-3">
              {tasks.map((task, taskIndex) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: groupIndex * 0.05 + taskIndex * 0.03 }}
                  className={`p-6 rounded-xl border transition-all ${
                    darkMode
                      ? 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                      : 'bg-black/[0.01] border-black/[0.06] hover:bg-black/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${
                      darkMode ? 'text-green-400' : 'text-green-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-lg ${
                        darkMode ? 'text-white' : 'text-black'
                      }`}>
                        {task.title}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 ${
                        darkMode ? 'text-white/30' : 'text-black/30'
                      }`} />
                      <span className={`text-sm ${
                        darkMode ? 'text-white/50' : 'text-black/50'
                      }`}>
                        {formatTime(task.timeSpent || 0)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
