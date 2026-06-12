'use client';

import { useState } from 'react';
import { useHifzStore } from '@/store/useHifzStore';
import { TOTAL_THUMUNS } from '@/lib/constants';
import { getFortressTasks } from '@/lib/fortress-calculator';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ViewMode = 'week' | 'month';

export default function ScheduleView() {
  const { currentDay, completedTasks, goToDay } = useHifzStore();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [pageIndex, setPageIndex] = useState(0);

  const daysPerPage = viewMode === 'week' ? 7 : 30;
  
  // Calculate current page based on current day
  const currentPageByDay = Math.floor((currentDay - 1) / daysPerPage);
  
  // Use explicit page index or default to the one containing currentDay
  const activePageIndex = pageIndex !== undefined ? pageIndex : currentPageByDay;
  const startDay = activePageIndex * daysPerPage + 1;
  const endDay = Math.min(startDay + daysPerPage - 1, TOTAL_THUMUNS);
  
  const hasNextPage = endDay < TOTAL_THUMUNS;
  const hasPrevPage = startDay > 1;

  const days = Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i);

  const getDayStatus = (day: number) => {
    const tasks = getFortressTasks(day);
    const dayLog = completedTasks[day];
    
    if (!dayLog) return 'none';
    
    const completedCount = tasks.taskKeys.filter(k => dayLog[k]).length;
    if (completedCount === 0) return 'none';
    if (completedCount === tasks.taskKeys.length) return 'full';
    return 'partial';
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/50 backdrop-blur-md p-2 rounded-2xl border border-border/50">
        
        {/* View Mode Toggle */}
        <div className="flex bg-background/50 p-1 rounded-xl border border-border/50">
          <button
            onClick={() => { setViewMode('week'); setPageIndex(Math.floor((currentDay - 1) / 7)); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'week' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            أسبوعي
          </button>
          <button
            onClick={() => { setViewMode('month'); setPageIndex(Math.floor((currentDay - 1) / 30)); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'month' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            شهري
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex(p => p - 1)}
            disabled={!hasPrevPage}
            className="rounded-xl border-border/50 h-9"
          >
            <ChevronRight className="w-4 h-4 ml-1" />
            السابق
          </Button>
          
          <div className="px-4 py-1.5 bg-background/50 rounded-xl text-sm font-medium border border-border/50 min-w-[120px] text-center">
            الأيام {startDay} — {endDay}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex(p => p + 1)}
            disabled={!hasNextPage}
            className="rounded-xl border-border/50 h-9"
          >
            التالي
            <ChevronLeft className="w-4 h-4 mr-1" />
          </Button>
        </div>

        {/* Jump to current */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setPageIndex(Math.floor((currentDay - 1) / daysPerPage));
            goToDay(currentDay);
          }}
          className="rounded-xl h-9 bg-secondary/10 text-secondary hover:bg-secondary/20"
        >
          <Target className="w-4 h-4 ml-2" />
          اليوم الحالي
        </Button>
      </div>

      {/* Grid View */}
      <div className={`grid gap-3 ${viewMode === 'month' ? 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {days.map((day) => {
          const status = getDayStatus(day);
          const isToday = day === currentDay;
          const tasks = getFortressTasks(day);
          
          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => goToDay(day)}
              className={`
                cursor-pointer rounded-2xl border p-4 transition-all
                ${isToday 
                  ? 'bg-primary/5 border-primary/30 shadow-[0_0_15px_rgba(20,184,166,0.15)]' 
                  : 'bg-card/50 border-border/40 hover:border-border/80 hover:bg-card'}
                ${viewMode === 'month' ? 'flex flex-col items-center justify-center text-center aspect-square p-2' : ''}
              `}
            >
              <div className={`flex ${viewMode === 'month' ? 'flex-col gap-2' : 'justify-between items-center mb-2'}`}>
                <span className={`font-bold ${isToday ? 'text-primary' : 'text-foreground/90'} ${viewMode === 'month' ? 'text-lg' : 'text-base'}`}>
                  {viewMode === 'month' ? day : `اليوم ${day}`}
                </span>
                
                {/* Status Indicator */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                  status === 'full' ? 'bg-success border-success' :
                  status === 'partial' ? 'bg-accent/20 border-accent' :
                  'bg-transparent border-muted'
                }`}>
                  {status === 'full' && <div className="w-2 h-2 rounded-full bg-success-foreground" />}
                  {status === 'partial' && <div className="w-2 h-2 rounded-full bg-accent" />}
                </div>
              </div>

              {viewMode === 'week' && (
                <div className="space-y-1 mt-2">
                  <p className="text-sm font-medium text-foreground/80">
                    {tasks.newHifz?.surah || 'مراجعة فقط'}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {tasks.newHifz ? `الآيات ${tasks.newHifz.startAyah}-${tasks.newHifz.endAyah}` : 'لا يوجد حفظ جديد'}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
