import { Task } from '../App';
import { Trophy, Clock, Target, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface WeeklyProgressProps {
  tasks: Task[];
  darkMode: boolean;
}

export function WeeklyProgress({ tasks, darkMode }: WeeklyProgressProps) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const thisWeekTasks = tasks.filter(task => {
    const taskDate = new Date(task.createdAt);
    return taskDate >= weekStart && taskDate < weekEnd;
  });

  const completedThisWeek = thisWeekTasks.filter(t => t.completed);
  const totalThisWeek = thisWeekTasks.length;
  const completionRate = totalThisWeek > 0 ? (completedThisWeek.length / totalThisWeek) * 100 : 0;

  const totalTimeSpent = completedThisWeek.reduce((acc, task) => acc + task.timeSpent, 0);
  const avgTimePerTask = completedThisWeek.length > 0 ? totalTimeSpent / completedThisWeek.length : 0;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m`;
    return `${seconds}s`;
  };

  const dailyStats = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    
    const dayTasks = tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate.toDateString() === day.toDateString();
    });
    
    const completed = dayTasks.filter(t => t.completed).length;
    
    return {
      day: day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      completed,
      total: dayTasks.length,
    };
  });

  const statCards = [
    { icon: Target, label: 'Rate', value: `${completionRate.toFixed(0)}%` },
    { icon: Trophy, label: 'Done', value: completedThisWeek.length },
    { icon: Clock, label: 'Time', value: formatTime(totalTimeSpent) },
    { icon: TrendingUp, label: 'Avg', value: formatTime(avgTimePerTask) },
  ];

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-4xl mb-3 ${darkMode ? 'text-white' : 'text-black'}`}
        >
          Weekly Progress
        </motion.h2>
        <p className={`text-[10px] uppercase tracking-[0.15em] ${
          darkMode ? 'text-white/25' : 'text-black/25'
        }`}>
          {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`p-8 rounded-xl border ${
              darkMode
                ? 'bg-white/[0.02] border-white/[0.08]'
                : 'bg-black/[0.01] border-black/[0.06]'
            }`}
          >
            <stat.icon className={`w-5 h-5 mb-8 ${
              darkMode ? 'text-white/20' : 'text-black/20'
            }`} />
            <div className={`text-5xl mb-2 ${
              darkMode ? 'text-white' : 'text-black'
            }`}>
              {stat.value}
            </div>
            <p className={`text-[9px] uppercase tracking-[0.15em] ${
              darkMode ? 'text-white/25' : 'text-black/25'
            }`}>
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Daily Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={`p-12 rounded-xl border ${
          darkMode
            ? 'bg-white/[0.02] border-white/[0.08]'
            : 'bg-black/[0.01] border-black/[0.06]'
        }`}
      >
        <h3 className={`text-[10px] uppercase tracking-[0.15em] mb-10 ${
          darkMode ? 'text-white/25' : 'text-black/25'
        }`}>
          Daily
        </h3>
        <div className="grid grid-cols-7 gap-8">
          {dailyStats.map((stat, index) => {
            const dayCompletionRate = stat.total > 0 ? (stat.completed / stat.total) * 100 : 0;
            const isToday = stat.day === new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="text-center"
              >
                <div className={`mb-6 rounded-lg overflow-hidden ${
                  darkMode ? 'bg-white/[0.04]' : 'bg-black/[0.03]'
                }`}>
                  <div className="h-40 relative">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${dayCompletionRate}%` }}
                      transition={{ duration: 0.8, delay: 0.8 + index * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      className={`absolute bottom-0 left-0 right-0 rounded-t-lg ${
                        isToday
                          ? darkMode
                            ? 'bg-white'
                            : 'bg-black'
                          : darkMode
                            ? 'bg-white/30'
                            : 'bg-black/30'
                      }`}
                    />
                  </div>
                </div>
                <p className={`text-[9px] uppercase tracking-[0.15em] mb-2 ${
                  isToday
                    ? darkMode ? 'text-white' : 'text-black'
                    : darkMode ? 'text-white/25' : 'text-black/25'
                }`}>
                  {stat.day}
                </p>
                <p className={`text-base ${
                  darkMode ? 'text-white/60' : 'text-black/60'
                }`}>
                  {stat.completed}
                  <span className={darkMode ? 'text-white/20' : 'text-black/20'}>
                    /{stat.total}
                  </span>
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center"
      >
        <p className={`text-lg ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
          {completionRate >= 80 && 'Exceptional work this week'}
          {completionRate >= 50 && completionRate < 80 && 'Great progress, keep going'}
          {completionRate < 50 && completionRate > 0 && 'Good start, stay focused'}
          {completionRate === 0 && totalThisWeek > 0 && 'Time to complete your first task'}
          {totalThisWeek === 0 && 'Add tasks to track your progress'}
        </p>
      </motion.div>
    </div>
  );
}
