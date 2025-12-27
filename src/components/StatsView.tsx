import { Task } from '../App';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Target, Flame, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { useState } from 'react';

interface StatsViewProps {
  tasks: Task[];
  darkMode: boolean;
  dailyGoal: number;
  onUpdateGoal: (goal: number) => void;
}

export function StatsView({ tasks, darkMode, dailyGoal, onUpdateGoal }: StatsViewProps) {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(dailyGoal.toString());

  // Calculate stats
  const completedTasks = tasks.filter(t => t.completed);
  const totalCompleted = completedTasks.length;
  
  // Today's stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedToday = completedTasks.filter(t => {
    if (!t.completedAt) return false;
    const completedDate = new Date(t.completedAt);
    completedDate.setHours(0, 0, 0, 0);
    return completedDate.getTime() === today.getTime();
  }).length;

  // Streak calculation
  let currentStreak = 0;
  let checkDate = new Date(today);
  
  while (true) {
    const dayCompleted = completedTasks.filter(t => {
      if (!t.completedAt) return false;
      const completedDate = new Date(t.completedAt);
      completedDate.setHours(0, 0, 0, 0);
      return completedDate.getTime() === checkDate.getTime();
    }).length;
    
    if (dayCompleted === 0) break;
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Last 7 days data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - i));
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const count = completedTasks.filter(t => {
      if (!t.completedAt) return false;
      const completedDate = new Date(t.completedAt);
      completedDate.setHours(0, 0, 0, 0);
      return completedDate.getTime() === date.getTime();
    }).length;
    
    return { day: dayName, count, isToday: i === 6 };
  });

  // Average per day (last 30 days)
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const last30DaysCompleted = completedTasks.filter(t => {
    if (!t.completedAt) return false;
    return new Date(t.completedAt) >= thirtyDaysAgo;
  }).length;
  const averagePerDay = (last30DaysCompleted / 30).toFixed(1);

  // Total time spent (in hours)
  const totalTimeSpent = completedTasks.reduce((sum, task) => sum + task.timeSpent, 0);
  const totalHours = Math.floor(totalTimeSpent / 3600);
  const totalMinutes = Math.floor((totalTimeSpent % 3600) / 60);

  // Most productive day
  const dayCount = completedTasks.reduce((acc, task) => {
    if (!task.completedAt) return acc;
    const dayName = new Date(task.completedAt).toLocaleDateString('en-US', { weekday: 'long' });
    acc[dayName] = (acc[dayName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostProductiveDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Total pomodoro sessions
  const totalPomodoros = completedTasks.reduce((sum, task) => sum + (task.pomodoroSessions || 0), 0);

  const handleGoalSave = () => {
    const newGoal = parseInt(goalInput);
    if (!isNaN(newGoal) && newGoal > 0 && newGoal <= 99) {
      onUpdateGoal(newGoal);
      setIsEditingGoal(false);
    }
  };

  const statCards = [
    {
      icon: Flame,
      label: 'Current Streak',
      value: `${currentStreak}`,
      suffix: currentStreak === 1 ? 'day' : 'days',
      color: darkMode ? 'text-white' : 'text-black',
    },
    {
      icon: Target,
      label: 'Today\'s Progress',
      value: `${completedToday}/${dailyGoal}`,
      suffix: '',
      color: darkMode ? 'text-white' : 'text-black',
      progress: Math.min((completedToday / dailyGoal) * 100, 100),
    },
    {
      icon: CheckCircle2,
      label: 'Total Completed',
      value: totalCompleted.toString(),
      suffix: totalCompleted === 1 ? 'task' : 'tasks',
      color: darkMode ? 'text-white' : 'text-black',
    },
    {
      icon: TrendingUp,
      label: 'Daily Average',
      value: averagePerDay,
      suffix: 'tasks/day',
      color: darkMode ? 'text-white' : 'text-black',
    },
    {
      icon: Clock,
      label: 'Time Invested',
      value: totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`,
      suffix: '',
      color: darkMode ? 'text-white' : 'text-black',
    },
    {
      icon: Calendar,
      label: 'Most Productive',
      value: mostProductiveDay,
      suffix: '',
      color: darkMode ? 'text-white' : 'text-black',
    },
  ];

  return (
    <div className="space-y-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className={`text-5xl mb-4 ${darkMode ? 'text-white' : 'text-black'}`}>
          Statistics
        </h1>
        <p className={`text-sm ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
          Your productivity insights and achievements
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className={`p-8 rounded-xl border ${
              darkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.01] border-black/[0.06]'
            }`}
          >
            <div className="flex items-start justify-between mb-6">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                darkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]'
              }`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              
              {stat.label === 'Today\'s Progress' && (
                <button
                  onClick={() => {
                    setIsEditingGoal(true);
                    setGoalInput(dailyGoal.toString());
                  }}
                  className={`text-[9px] uppercase tracking-[0.15em] px-3 py-1.5 rounded-md transition-colors ${
                    darkMode
                      ? 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                      : 'text-black/40 hover:text-black/60 hover:bg-black/[0.02]'
                  }`}
                >
                  Edit Goal
                </button>
              )}
            </div>
            
            <div>
              <div className={`text-4xl mb-2 ${stat.color}`}>
                {stat.value}
              </div>
              <div className={`text-[10px] uppercase tracking-[0.15em] ${
                darkMode ? 'text-white/25' : 'text-black/25'
              }`}>
                {stat.label}
              </div>
              {stat.suffix && (
                <div className={`text-xs mt-1 ${
                  darkMode ? 'text-white/40' : 'text-black/40'
                }`}>
                  {stat.suffix}
                </div>
              )}
              
              {stat.progress !== undefined && (
                <div className={`mt-4 h-1.5 rounded-full overflow-hidden ${
                  darkMode ? 'bg-white/[0.06]' : 'bg-black/[0.06]'
                }`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.progress}%` }}
                    transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className={`h-full ${darkMode ? 'bg-white' : 'bg-black'}`}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Weekly Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className={`p-8 rounded-xl border ${
          darkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.01] border-black/[0.06]'
        }`}
      >
        <div className="mb-8">
          <h2 className={`text-2xl mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
            Last 7 Days
          </h2>
          <p className={`text-xs ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
            Your daily completion trend
          </p>
        </div>
        
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Days}>
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fill: darkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                  fontSize: 11,
                  fontWeight: 500,
                }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fill: darkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                  fontSize: 11,
                }}
                allowDecimals={false}
              />
              <Bar 
                dataKey="count" 
                radius={[8, 8, 0, 0]}
              >
                {last7Days.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.isToday 
                      ? darkMode ? '#ffffff' : '#000000'
                      : darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Additional Stats */}
      {totalPomodoros > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={`p-8 rounded-xl border ${
            darkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.01] border-black/[0.06]'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`text-5xl ${darkMode ? 'text-white' : 'text-black'}`}>
              🍅
            </div>
            <div>
              <div className={`text-3xl mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>
                {totalPomodoros}
              </div>
              <div className={`text-[10px] uppercase tracking-[0.15em] ${
                darkMode ? 'text-white/25' : 'text-black/25'
              }`}>
                Pomodoro Sessions Completed
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Goal Edit Dialog */}
      {isEditingGoal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setIsEditingGoal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`p-8 rounded-xl border max-w-md w-full mx-4 ${
              darkMode ? 'bg-black border-white/[0.1]' : 'bg-white border-black/[0.1]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-2xl mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
              Set Daily Goal
            </h3>
            <p className={`text-sm mb-6 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
              How many tasks do you want to complete each day?
            </p>
            
            <input
              type="number"
              min="1"
              max="99"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGoalSave()}
              autoFocus
              className={`w-full px-4 py-3 rounded-lg border mb-4 ${
                darkMode
                  ? 'bg-white/[0.04] border-white/[0.1] text-white'
                  : 'bg-black/[0.02] border-black/[0.1] text-black'
              }`}
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditingGoal(false)}
                className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                  darkMode
                    ? 'border-white/[0.1] text-white/60 hover:bg-white/[0.04]'
                    : 'border-black/[0.1] text-black/60 hover:bg-black/[0.02]'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleGoalSave}
                className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
                  darkMode
                    ? 'bg-white text-black hover:bg-white/95'
                    : 'bg-black text-white hover:bg-black/95'
                }`}
              >
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
