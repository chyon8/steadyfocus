import { useEffect, useState, useRef } from 'react';
import { Task } from '../App';
import { CheckCircle2, Play, Square, Pause, Timer, StickyNote, Zap, Coffee, ArrowRight, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from './ui/alert-dialog';
import confetti from 'canvas-confetti';

interface FocusModeProps {
  task: Task | null | undefined;
  nextTask: Task | null | undefined;
  totalTasks: number;
  completedToday: number;
  dailyGoal: number;
  onComplete: (id: string) => void;
  onUpdateTime: (id: string, seconds: number) => void;
  onIncrementPomodoro: (id: string) => void;
  isMinimized: boolean;
  onMinimize: (value: boolean) => void;
  darkMode: boolean;
  onNavigateToPlan?: () => void;
}

export function FocusMode({ 
  task, 
  nextTask,
  totalTasks, 
  completedToday,
  dailyGoal,
  onComplete, 
  onUpdateTime,
  onIncrementPomodoro,
  isMinimized,
  onMinimize,
  darkMode,
  onNavigateToPlan
}: FocusModeProps) {
  const [isSlashing, setIsSlashing] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const sessionSecondsRef = useRef(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showNextDialog, setShowNextDialog] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [isPomodoroMode, setIsPomodoroMode] = useState(false);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60); // 25 minutes default
  const [isBreak, setIsBreak] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [restTime, setRestTime] = useState(5 * 60); // 5 minutes default rest
  const [isMinimalMode, setIsMinimalMode] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive styles calculation
  const getResponsiveStyles = () => {
    if (windowWidth < 500) {
      return {
        timerSize: 'text-[48px]',
        titleSize: 'text-xl',
        padding: 'p-6',
        buttonSize: 'w-16 h-16',
        iconSize: 'w-6 h-6',
        smallButtonSize: 'w-12 h-12',
        gap: 'gap-4',
        labelSize: 'text-[10px]'
      };
    } else if (windowWidth < 650) {
      return {
        timerSize: 'text-[72px]',
        titleSize: 'text-2xl',
        padding: 'p-8',
        buttonSize: 'w-18 h-18',
        iconSize: 'w-7 h-7',
        smallButtonSize: 'w-13 h-13',
        gap: 'gap-6',
        labelSize: 'text-[10px]'
      };
    } else {
      return {
        timerSize: 'text-[96px]',
        titleSize: 'text-3xl',
        padding: 'p-12',
        buttonSize: 'w-20 h-20',
        iconSize: 'w-8 h-8',
        smallButtonSize: 'w-14 h-14',
        gap: 'gap-8',
        labelSize: 'text-xs'
      };
    }
  };

  const styles = getResponsiveStyles();

  useEffect(() => {
    setTimeElapsed(task?.timeSpent || 0);
    sessionSecondsRef.current = 0;
    setIsRunning(false);
    setShowTimer(false);
    setIsBreak(false);
    setIsResting(false);
    setRestTime(5 * 60);
  }, [task?.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && task) {
      interval = setInterval(() => {
        if (isPomodoroMode) {
          // Pomodoro countdown
          if (pomodoroTime > 0) {
            setPomodoroTime(prev => prev - 1);
            if (!isBreak) {
              setTimeElapsed(prev => prev + 1);
              sessionSecondsRef.current += 1;
              
              // Flush time to DB every 10 seconds
              if (sessionSecondsRef.current >= 10) {
                onUpdateTime(task.id, sessionSecondsRef.current);
                sessionSecondsRef.current = 0;
              }
            }
          } else {
            // Pomodoro/Break finished
            setIsRunning(false);
            if (!isBreak) {
              // Flush accumulated time before switch
              if (sessionSecondsRef.current > 0) {
                 onUpdateTime(task.id, sessionSecondsRef.current);
                 sessionSecondsRef.current = 0;
              }
              
              // Work session finished, start break
              onIncrementPomodoro(task.id);
              setIsBreak(true);
              setPomodoroTime(5 * 60); // 5 minute break
            } else {
              // Break finished, start new work session
              setIsBreak(false);
              setPomodoroTime(25 * 60); // 25 minute work
            }
          }
        } else {
          // Regular timer
          setTimeElapsed(prev => prev + 1);
          sessionSecondsRef.current += 1;
          
          // Flush time to DB every 10 seconds
          if (sessionSecondsRef.current >= 10) {
            onUpdateTime(task.id, sessionSecondsRef.current);
            sessionSecondsRef.current = 0;
          }
        }
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isRunning, task, isPomodoroMode, pomodoroTime, isBreak, onUpdateTime]);

  // Rest timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isResting && restTime > 0) {
      interval = setInterval(() => {
        setRestTime(prev => prev - 1);
      }, 1000);
    } else if (isResting && restTime === 0) {
      // Rest time finished
      setIsResting(false);
      setRestTime(5 * 60);
    }
    
    return () => clearInterval(interval);
  }, [isResting, restTime]);

  const handleComplete = () => {
    if (!task) return;
    
    setIsSlashing(true);
    setIsSlashing(true);
    setIsRunning(false);
    
    // Exit Focus Mode
    setIsMinimalMode(false);
    onMinimize(false);
    // Explicitly pass false for minimized to restore normal window behavior
    window.electron.setFocusMode(false, false);
    
    // Confetti celebration! 🎉
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Two confetti bursts from different origins
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
    
    setTimeout(() => {
      // Flush any remaining time
      if (sessionSecondsRef.current > 0 && task) {
        onUpdateTime(task.id, sessionSecondsRef.current);
        sessionSecondsRef.current = 0;
      }

      onComplete(task.id);
      setIsSlashing(false);
      setTimeElapsed(0);
      
      // Show next dialog if there's a next task
      if (nextTask) {
        setShowNextDialog(true);
      }
    }, 1500);
  };

  const handleContinue = () => {
    setShowNextDialog(false);
    // Return to Up Next screen without auto-starting
  };

  const handleRest = () => {
    setShowNextDialog(false);
    setIsResting(true);
    setRestTime(5 * 60);
  };

  const handleBackToWork = () => {
    setIsResting(false);
    setRestTime(5 * 60);
    // Return to Up Next screen without auto-starting
  };

  const handleStop = () => {
    setIsRunning(false);
    
    // Flush accumulated time
    if (sessionSecondsRef.current > 0 && task) {
      onUpdateTime(task.id, sessionSecondsRef.current);
      sessionSecondsRef.current = 0;
    }

    // Sync local time with task time just in case
    // if (task) setTimeElapsed(task.timeSpent); // Removed to prevent resetting to stale state
    
    setShowTimer(false);
    // Exit Focus Mode
    setIsMinimalMode(false);
    onMinimize(false);
    // Explicitly pass false for minimized to allow resizing again
    window.electron.setFocusMode(false, false);

    // Don't reset Pomodoro state to allow resuming
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return {
      hours: hrs.toString().padStart(2, '0'),
      minutes: mins.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0'),
    };
  };

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <CheckCircle2 className={`w-12 h-12 mx-auto mb-8 ${
            darkMode ? 'text-white/20' : 'text-black/20'
          }`} />
          <h2 className={`text-2xl mb-3 ${darkMode ? 'text-white/90' : 'text-black/90'}`}>
            {totalTasks === 0 ? 'All Clear' : 'No Active Task'}
          </h2>
          <p className={`text-sm mb-6 ${darkMode ? 'text-white/25' : 'text-black/25'}`}>
            {completedToday} completed today
          </p>
          {totalTasks === 0 && onNavigateToPlan && (
            <motion.button
              onClick={onNavigateToPlan}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`px-8 py-4 rounded-xl text-sm font-medium uppercase tracking-[0.15em] transition-all ${
                darkMode
                  ? 'bg-white text-black hover:bg-white/95'
                  : 'bg-black text-white hover:bg-black/95'
              }`}
            >
              Plan Your Tasks
            </motion.button>
          )}
          {completedToday >= dailyGoal && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", bounce: 0.6 }}
              className="mt-4 text-4xl"
            >
              🎉
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {isMinimalMode ? (
        <div 
          className="fixed inset-0 flex items-center justify-between px-4 select-none"
          style={{ 
            backgroundColor: darkMode ? '#000000' : '#ffffff',
          }}
        >
          {/* Timer - Left */}
          <div className="flex items-center gap-2">
            {Object.entries(formatTime(isPomodoroMode ? pomodoroTime : timeElapsed)).map(([unit, value], idx) => (
              <div key={unit} className="flex items-center">
                {idx > 0 && <span className={`text-sm ${darkMode ? 'text-white/40' : 'text-black/40'}`}>:</span>}
                <span className={`text-lg font-mono tabular-nums ${darkMode ? 'text-white' : 'text-black'}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>


          {/* Task Title - Center (Draggable Area) */}
          {windowWidth > 350 && (
            <div 
              className="flex-1 text-center truncate px-2 mx-2 cursor-move"
              style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            >
               <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                 {task.title}
               </span>
            </div>
          )}
          
          {/* Drag Area Placeholder for small screens */}
          {windowWidth <= 350 && (
            <div 
              className="flex-1 h-full cursor-move"
              style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            />
          )}



          {/* Controls - Right */}
          <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
             {/* Hide/Background Mode Button */}
             <motion.button
              onClick={() => {
                // Trigger background mode in main process
                window.electron.setBackgroundMode(true);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-1.5 rounded-lg ${
                darkMode ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-black/10 text-black/60 hover:text-black'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
            </motion.button>

            <motion.button
              onClick={handleStop}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-lg ${
                darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-black/10 text-black'
              }`}
            >
              <Square className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={handleComplete}
              disabled={isSlashing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-lg ${
                darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-black/10 text-black'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      ) : (
      <>
      {/* Next Task Dialog */}
      <AlertDialog open={showNextDialog} onOpenChange={setShowNextDialog}>
        <AlertDialogContent className={`max-w-md ${
          darkMode ? 'bg-black border-white/[0.1]' : 'bg-white border-black/[0.1]'
        }`}>
          <AlertDialogHeader>
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
              className="flex justify-center mb-4"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                darkMode ? 'bg-white text-black' : 'bg-black text-white'
              }`}>
                <CheckCircle2 className="w-8 h-8" />
              </div>
            </motion.div>
            
            <AlertDialogTitle className={`text-center text-2xl ${
              darkMode ? 'text-white' : 'text-black'
            }`}>
              Task Complete!
            </AlertDialogTitle>
            
            <AlertDialogDescription className={`text-center text-base ${
              darkMode ? 'text-white/60' : 'text-black/60'
            }`}>
              {completedToday + 1 >= dailyGoal 
                ? '🎉 Daily goal achieved! Keep going?' 
                : 'Ready to tackle the next task?'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {nextTask && (
            <div className={`p-4 rounded-xl border mt-4 ${
              darkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.01] border-black/[0.06]'
            }`}>
              <p className={`text-xs uppercase tracking-[0.15em] mb-2 ${
                darkMode ? 'text-white/40' : 'text-black/40'
              }`}>
                Next Task
              </p>
              <p className={`text-base ${
                darkMode ? 'text-white' : 'text-black'
              }`}>
                {nextTask.title}
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <motion.button
              onClick={handleRest}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 h-12 rounded-xl border text-sm font-medium uppercase tracking-[0.15em] transition-all ${
                darkMode
                  ? 'bg-white/[0.04] border-white/[0.1] text-white hover:bg-white/[0.08]'
                  : 'bg-black/[0.02] border-black/[0.08] text-black hover:bg-black/[0.06]'
              }`}
            >
              휴식
            </motion.button>
            
            <motion.button
              onClick={handleContinue}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 h-12 rounded-xl text-sm font-medium uppercase tracking-[0.15em] ${
                darkMode
                  ? 'bg-white text-black hover:bg-white/95'
                  : 'bg-black text-white hover:bg-black/95'
              }`}
            >
              진행
            </motion.button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
      <div className="min-h-[70vh] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isResting ? (
            /* Rest View */
            <motion.div
              key="rest"
              initial={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                filter: 'blur(0px)',
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.96,
                filter: 'blur(4px)',
              }}
              transition={{ 
                duration: 0.8, 
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="w-full max-w-[600px] text-center"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="mb-8"
              >
                <Coffee className={`w-20 h-20 mx-auto ${
                  darkMode ? 'text-white/40' : 'text-black/40'
                }`} />
              </motion.div>

              <h2 className={`text-3xl mb-4 ${
                darkMode ? 'text-white' : 'text-black'
              }`}>
                휴식 시간
              </h2>

              <p className={`text-sm mb-12 ${
                darkMode ? 'text-white/40' : 'text-black/40'
              }`}>
                잠시 쉬어가세요. 곧 돌아옵니다.
              </p>

              {/* Rest Timer */}
              <div className="mb-12">
                <div className="flex items-center justify-center gap-2">
                  {Object.entries(formatTime(restTime)).slice(1).map(([unit, value], idx) => (
                    <div key={unit} className="flex items-center">
                      {idx > 0 && (
                        <span className={`text-5xl mx-2 ${
                          darkMode ? 'text-white/20' : 'text-black/20'
                        }`}>:</span>
                      )}
                      <div className="text-center">
                        <motion.div 
                          className={`text-[80px] leading-none tabular-nums ${
                            darkMode ? 'text-white/60' : 'text-black/60'
                          }`}
                          style={{ 
                            fontVariantNumeric: 'tabular-nums',
                            fontFeatureSettings: '"tnum" 1',
                          }}
                          animate={{ 
                            opacity: [1, 0.5, 1],
                          }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          {value}
                        </motion.div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-center gap-8 mt-4">
                  <span className={`text-xs uppercase tracking-[0.15em] ${
                    darkMode ? 'text-white/20' : 'text-black/20'
                  }`}>
                    minutes
                  </span>
                  <span className={`text-xs uppercase tracking-[0.15em] ${
                    darkMode ? 'text-white/20' : 'text-black/20'
                  }`}>
                    seconds
                  </span>
                </div>
              </div>

              {/* Back to Work Button */}
              <div className="space-y-4">
                <motion.button
                  onClick={handleBackToWork}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full h-16 rounded-xl font-medium uppercase tracking-[0.15em] text-sm flex items-center justify-center gap-3 transition-all ${
                    darkMode
                      ? 'bg-white text-black hover:bg-white/95'
                      : 'bg-black text-white hover:bg-black/95'
                  }`}
                >
                  <ArrowRight className="w-5 h-5" />
                  Back to Work
                </motion.button>

                <p className={`text-xs ${
                  darkMode ? 'text-white/25' : 'text-black/25'
                }`}>
                  {nextTask ? `다음: ${nextTask.title}` : '마지막 작업입니다'}
                </p>
              </div>
            </motion.div>
          ) : (
            /* Task List View */
            <motion.div
              key="list"
              initial={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                filter: 'blur(0px)',
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.96,
                filter: 'blur(4px)',
              }}
              transition={{ 
                duration: 0.8, 
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="w-full max-w-[600px]"
            >
              <h2 className={`text-sm uppercase tracking-[0.15em] mb-6 ${
                darkMode ? 'text-white/40' : 'text-black/40'
              }`}>
                Up Next
              </h2>
              
              <div className="space-y-3">
                {/* Current Task */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative p-6 rounded-xl border transition-all ${
                    darkMode
                      ? 'bg-white/[0.04] border-white/[0.1]'
                      : 'bg-black/[0.03] border-black/[0.1]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className={`text-xl mb-1 ${
                        darkMode ? 'text-white' : 'text-black'
                      }`}>
                        {task.title}
                      </h3>
                      {task.notes && (
                        <div className={`flex items-center gap-1.5 mt-2 text-xs ${
                          darkMode ? 'text-white/40' : 'text-black/40'
                        }`}>
                          <StickyNote className="w-3 h-3" />
                          <span>{task.notes}</span>
                        </div>
                      )}
                      <p className={`text-xs uppercase tracking-[0.15em] mt-2 ${
                        darkMode ? 'text-white/30' : 'text-black/30'
                      }`}>
                        Current Task
                      </p>
                    </div>

                    {/* Timer Display when stopped */}
                    {(timeElapsed > 0 || (isPomodoroMode && pomodoroTime < 25 * 60)) && (
                      <div className="text-right">
                        <div className={`text-2xl font-mono tabular-nums ${darkMode ? 'text-white' : 'text-black'}`}>
                          {(() => {
                            const { hours, minutes, seconds } = formatTime(isPomodoroMode ? pomodoroTime : timeElapsed);
                            return `${hours}:${minutes}:${seconds}`;
                          })()}
                        </div>
                        <div className={`text-[10px] uppercase tracking-[0.15em] ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
                          {isPomodoroMode ? 'Remaining' : 'Elapsed'}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Next Task - Smaller and less prominent */}
                {nextTask && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`relative px-5 py-4 rounded-lg border transition-all ${
                      darkMode
                        ? 'bg-white/[0.01] border-white/[0.04]'
                        : 'bg-black/[0.005] border-black/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className={`text-sm mb-0.5 ${
                          darkMode ? 'text-white/60' : 'text-black/60'
                        }`}>
                          {nextTask.title}
                        </p>
                        <p className={`text-[10px] uppercase tracking-[0.15em] ${
                          darkMode ? 'text-white/20' : 'text-black/20'
                        }`}>
                          Next
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
              
              {/* Start Slashing Button */}
              <motion.button
                onClick={() => {
                  setShowTimer(true);
                  setIsRunning(true);
                   setIsMinimalMode(true);
                  onMinimize(true);
                  // Pass true/true to indicate enabled focus mode AND minimized (thin bar) mode
                  window.electron.setFocusMode(true, true);
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: 0.3,
                  duration: 0.4,
                  ease: [0.16, 1, 0.3, 1]
                }}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full h-16 rounded-xl font-medium uppercase tracking-[0.15em] text-sm flex items-center justify-center gap-3 transition-all mt-6 ${
                  darkMode
                    ? 'bg-white text-black hover:bg-white/95'
                    : 'bg-black text-white hover:bg-black/95'
                }`}
              >
                <Zap className="w-5 h-5" fill="currentColor" />
                Start Slashing
              </motion.button>
              
              <div className={`mt-8 text-center text-sm ${
                darkMode ? 'text-white/30' : 'text-black/30'
              }`}>
                {totalTasks - 2 > 0 && `+${totalTasks - 2} more task${totalTasks - 2 !== 1 ? 's' : ''}`}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </>
      )}
    </>
  );
}