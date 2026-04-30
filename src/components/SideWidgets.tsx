import { Task } from '../App';
import { motion } from 'motion/react';
import { Target, Trophy, Clock, Flame } from 'lucide-react';

interface SideWidgetProps {
  tasks: Task[];
  darkMode: boolean;
  dailyGoal: number;
  completedToday: number;
}

export function LeftSideWidget({ tasks, darkMode }: { tasks: Task[]; darkMode: boolean }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const dailyStats = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);

    const dayTasks = tasks.filter(task => {
      if (!task.completedAt) return false;
      return new Date(task.completedAt).toDateString() === day.toDateString();
    });

    return {
      day: day.toLocaleDateString('en-US', { weekday: 'narrow' }),
      completed: dayTasks.length,
      isToday: day.toDateString() === now.toDateString(),
      isPast: day < now,
    };
  });

  const maxCompleted = Math.max(...dailyStats.map(s => s.completed), 1);

  const completedThisWeek = tasks.filter(task => {
    if (!task.completedAt) return false;
    const d = new Date(task.completedAt);
    return d >= weekStart;
  }).length;

  const totalTimeThisWeek = tasks.filter(task => {
    if (!task.completedAt) return false;
    return new Date(task.completedAt) >= weekStart;
  }).reduce((acc, t) => acc + t.timeSpent, 0);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m`;
    return '0m';
  };

  return (
    <div className="space-y-6">
      {/* Weekly Overview */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={`p-5 rounded-xl border ${
          darkMode
            ? 'border-white/[0.06] bg-white/[0.02]'
            : 'border-black/[0.06] bg-black/[0.01]'
        }`}
      >
        <div className={`text-[9px] uppercase tracking-[0.15em] mb-5 ${
          darkMode ? 'text-white/30' : 'text-black/30'
        }`}>
          This Week
        </div>

        {/* Mini bar chart */}
        <div className="flex items-end gap-1.5 h-16 mb-4">
          {dailyStats.map((stat, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: stat.completed > 0 ? `${(stat.completed / maxCompleted) * 100}%` : '2px' }}
                transition={{ delay: 0.4 + i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={`w-full rounded-sm min-h-[2px] ${
                  stat.isToday
                    ? darkMode ? 'bg-white' : 'bg-black'
                    : stat.completed > 0
                      ? darkMode ? 'bg-white/40' : 'bg-black/40'
                      : darkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Day labels */}
        <div className="flex gap-1.5 mb-5">
          {dailyStats.map((stat, i) => (
            <div key={i} className={`flex-1 text-center text-[8px] uppercase tracking-wider ${
              stat.isToday
                ? darkMode ? 'text-white' : 'text-black'
                : darkMode ? 'text-white/20' : 'text-black/20'
            }`}>
              {stat.day}
            </div>
          ))}
        </div>

        {/* Week stats */}
        <div className={`flex items-center justify-between pt-4 border-t ${
          darkMode ? 'border-white/[0.06]' : 'border-black/[0.06]'
        }`}>
          <div>
            <div className={`text-lg font-medium tabular-nums ${
              darkMode ? 'text-white' : 'text-black'
            }`}>{completedThisWeek}</div>
            <div className={`text-[8px] uppercase tracking-[0.12em] ${
              darkMode ? 'text-white/20' : 'text-black/20'
            }`}>completed</div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-medium tabular-nums ${
              darkMode ? 'text-white' : 'text-black'
            }`}>{formatTime(totalTimeThisWeek)}</div>
            <div className={`text-[8px] uppercase tracking-[0.12em] ${
              darkMode ? 'text-white/20' : 'text-black/20'
            }`}>focused</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function RightSideWidget({ tasks, darkMode, dailyGoal, completedToday }: SideWidgetProps) {
  const progress = Math.min((completedToday / dailyGoal) * 100, 100);
  const remaining = Math.max(dailyGoal - completedToday, 0);

  // Streak calculation
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);

    const completedOnDay = tasks.filter(t => {
      if (!t.completedAt) return false;
      return new Date(t.completedAt).toDateString() === checkDate.toDateString();
    }).length;

    if (completedOnDay >= dailyGoal) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return (
    <div className="space-y-6">
      {/* Daily Goal */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={`p-5 rounded-xl border ${
          darkMode
            ? 'border-white/[0.06] bg-white/[0.02]'
            : 'border-black/[0.06] bg-black/[0.01]'
        }`}
      >
        <div className={`text-[9px] uppercase tracking-[0.15em] mb-5 ${
          darkMode ? 'text-white/30' : 'text-black/30'
        }`}>
          Daily Goal
        </div>

        {/* Circular progress */}
        <div className="flex items-center justify-center mb-5">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                strokeWidth="6"
              />
              <motion.circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke={darkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - progress / 100) }}
                transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-medium tabular-nums ${
                darkMode ? 'text-white' : 'text-black'
              }`}>{completedToday}</span>
              <span className={`text-[8px] uppercase tracking-[0.12em] ${
                darkMode ? 'text-white/25' : 'text-black/25'
              }`}>/ {dailyGoal}</span>
            </div>
          </div>
        </div>

        <div className={`text-center text-[11px] ${
          darkMode ? 'text-white/40' : 'text-black/40'
        }`}>
          {remaining === 0 ? '🎉 Goal reached!' : `${remaining} more to go`}
        </div>
      </motion.div>

      {/* Streak */}
      {streak > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`p-5 rounded-xl border ${
            darkMode
              ? 'border-white/[0.06] bg-white/[0.02]'
              : 'border-black/[0.06] bg-black/[0.01]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Flame className={`w-5 h-5 ${
              darkMode ? 'text-white/40' : 'text-black/40'
            }`} />
            <div>
              <div className={`text-lg font-medium tabular-nums ${
                darkMode ? 'text-white' : 'text-black'
              }`}>{streak} day{streak > 1 ? 's' : ''}</div>
              <div className={`text-[8px] uppercase tracking-[0.12em] ${
                darkMode ? 'text-white/20' : 'text-black/20'
              }`}>streak</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
