'use client';

import { useHifzStore } from '@/store/useHifzStore';
import { useMemo } from 'react';
import { TOTAL_THUMUNS, MILESTONES, THUMUNS_PER_JUZ } from '@/lib/constants';
import { motion } from 'framer-motion';
import {
  Trophy,
  Flame,
  CalendarDays,
  Target,
  Award,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 20 } },
};

export default function StatsDashboard() {
  const { currentDay, streak, bestStreak, dailyLog, completedTasks } = useHifzStore();

  const highestCompletedDay = useMemo(() => {
    const days = Object.keys(completedTasks).map(Number).filter(d => {
      const t = completedTasks[d];
      return Object.values(t).some(Boolean);
    });
    return days.length > 0 ? Math.max(...days) : 0;
  }, [completedTasks]);

  const totalCompleted = highestCompletedDay;
  const progressPercentage = (totalCompleted / TOTAL_THUMUNS) * 100;
  const juzCount = Math.floor(totalCompleted / THUMUNS_PER_JUZ);
  const hizbCount = Math.floor(totalCompleted / 8);

  // Generate chart data for the last 30 days
  const chartData = Array.from({ length: 30 }).map((_, i) => {
    const dayOffset = 29 - i;
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];
    const log = dailyLog[dateStr];
    
    return {
      name: date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }),
      tasks: log ? log.tasksCompleted : 0,
    };
  });

  const nextMilestone = MILESTONES.find(m => totalCompleted < m.threshold) || MILESTONES[MILESTONES.length - 1];

  const copyStats = () => {
    const text = `أكملت ${juzCount} جزء (${totalCompleted} ثمن) في مشروع حصون لحفظ القرآن!\nالسلسلة الحالية: ${streak} أيام 🔥\nالهدف القادم: ${nextMilestone.label}\n\n"وَفِي ذَلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ"`;
    navigator.clipboard.writeText(text);
    toast.success('تم نسخ الإحصائيات بنجاح!', {
      description: 'يمكنك الآن مشاركتها مع أصدقائك.',
    });
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
      dir="rtl"
    >
      {/* Top Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div variants={item} className="glass-card-premium rounded-3xl p-5 border border-border/50">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-3">
            <Trophy className="w-5 h-5" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">الأجزاء المحفوظة</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold">{juzCount}</h3>
            <span className="text-sm text-muted-foreground">/ 30</span>
          </div>
        </motion.div>

        <motion.div variants={item} className="glass-card-premium rounded-3xl p-5 border border-border/50">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Target className="w-5 h-5" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">الأثمان (التقدم)</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold">{totalCompleted}</h3>
            <span className="text-sm text-muted-foreground">/ 480</span>
          </div>
        </motion.div>

        <motion.div variants={item} className="glass-card-premium rounded-3xl p-5 border border-border/50">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-3">
            <Flame className="w-5 h-5" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">السلسلة الحالية</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-orange-500">{streak}</h3>
            <span className="text-sm text-muted-foreground">أيام</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">الأفضل: {bestStreak}</p>
        </motion.div>

        <motion.div variants={item} className="glass-card-premium rounded-3xl p-5 border border-border/50 relative overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-3">
            <CalendarDays className="w-5 h-5" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">نسبة الإنجاز</p>
          <h3 className="text-3xl font-bold text-gradient-primary">{progressPercentage.toFixed(1)}%</h3>
          
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
        </motion.div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activity Chart */}
        <motion.div variants={item} className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold">نشاط آخر 30 يوماً</h3>
              <p className="text-sm text-muted-foreground">مهام الحصون المنجزة يومياً</p>
            </div>
            <button 
              onClick={copyStats}
              className="p-2 rounded-xl bg-background/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-card)', 
                    borderRadius: '12px',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ color: 'var(--color-foreground)' }}
                  labelStyle={{ color: 'var(--color-muted-foreground)', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="tasks" 
                  name="المهام المنجزة"
                  stroke="var(--color-primary)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTasks)" 
                  activeDot={{ r: 6, fill: "var(--color-primary)", stroke: "var(--color-background)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Next Target */}
        <motion.div variants={item} className="glass-panel rounded-3xl p-6 border border-border/50 flex flex-col">
          <h3 className="text-lg font-bold mb-1">الهدف القادم</h3>
          <p className="text-sm text-muted-foreground mb-6">واصل التقدم للوصول للوسام التالي</p>
          
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-background/40 rounded-2xl border border-border/50">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-3xl mb-4 relative">
              {nextMilestone.icon}
              <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl animate-pulse" />
            </div>
            <h4 className="font-bold text-lg mb-2">{nextMilestone.label}</h4>
            <div className="w-full bg-muted rounded-full h-2.5 mb-2 overflow-hidden">
              <div 
                className="bg-accent h-2.5 rounded-full" 
                style={{ width: `${(totalCompleted / nextMilestone.threshold) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-muted-foreground">
              متبقي {nextMilestone.threshold - totalCompleted} أثمان
            </p>
          </div>
        </motion.div>
      </div>

      {/* Milestones / Badges Grid */}
      <motion.div variants={item}>
        <h3 className="text-lg font-bold mb-4 px-2">أوسمة الإنجاز</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {MILESTONES.map((milestone) => {
            const isEarned = totalCompleted >= milestone.threshold;
            return (
              <div
                key={milestone.id}
                className={`relative p-4 rounded-2xl border ${
                  isEarned
                    ? 'bg-card border-border/50 shadow-sm'
                    : 'bg-background/50 border-transparent opacity-60 grayscale'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-2xl ${!isEarned && 'opacity-50'}`}>{milestone.icon}</span>
                  {isEarned && <CheckCircle2 className="w-4 h-4 text-success" />}
                </div>
                <h4 className="font-bold text-sm mb-1">{milestone.label}</h4>
                <p className="text-xs text-muted-foreground">{milestone.threshold} ثمن</p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
