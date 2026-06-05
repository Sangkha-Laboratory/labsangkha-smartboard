import React, { useEffect, useState } from 'react';
import { Megaphone, X, ArrowRight, Eye, AlertCircle, Volume2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Announcement, getAnnouncements, subscribeToAnnouncements } from '../lib/announcements';

export default function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null);

  useEffect(() => {
    const handleUpdate = (list: Announcement[]) => {
      // Prioritize pinned and critical announcements
      const sorted = [...list].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (a.category === 'critical' && b.category !== 'critical') return -1;
        if (a.category !== 'critical' && b.category === 'critical') return 1;
        return 0;
      });
      setAnnouncements(sorted);
      // Reset indicator to active if current index is out of bounds
      setCurrentIndex(prev => {
        if (prev >= sorted.length) return 0;
        return prev;
      });
    };

    // Initial fetch
    getAnnouncements().then(handleUpdate);

    // Subscribe to real-time changes
    const unsubscribe = subscribeToAnnouncements(handleUpdate);

    return () => {
      unsubscribe();
    };
  }, []);

  // Rotate announcements every 12 seconds if there are multiple (longer interval to let users read & manual nav is active)
  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 12000);
    return () => clearInterval(interval);
  }, [announcements]);

  if (!isVisible || announcements.length === 0) return null;

  const current = announcements[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'critical':
        return 'bg-red-500 text-white animate-pulse';
      case 'important':
        return 'bg-yellow-500 text-slate-900';
      default:
        return 'bg-blue-600 text-white';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'critical':
        return 'ด่วนที่สุด';
      case 'important':
        return 'สำคัญ';
      default:
        return 'ประชาสัมพันธ์';
    }
  };

  return (
    <>
      <style>{`
        @keyframes marqueeLoop {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .animate-marquee-loop {
          display: flex;
          white-space: nowrap;
          animation: marqueeLoop 24s linear infinite;
        }
        .animate-marquee-loop:active,
        .animate-marquee-loop:hover {
          animation-play-state: paused;
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative w-full max-w-full overflow-hidden min-w-0 bg-gradient-to-r from-brand-dark via-[#0f2d52] to-brand-blue text-white py-2 px-3 sm:px-4 shadow-md z-40 border-b border-white/5 transition-all animate-none"
      >
        {/* MOBILE VIEW FOR ANNOUNCEMENTS (stacked, fits perfectly without overflow) */}
        <div className="flex md:hidden flex-col gap-1.5 w-full select-none overflow-hidden">
          {/* Top Row: category/prev/next, actions info */}
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-1 flex-wrap">
              <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0 ${getCategoryStyles(current.category)}`}>
                {current.category === 'critical' ? 'ด่วน!' : current.category === 'important' ? 'สำคัญ' : 'ประกาศ'}
              </span>

              {announcements.length > 1 && (
                <div className="flex items-center bg-white/10 rounded-lg p-0.5 flex-shrink-0 transition-all gap-0.5">
                  <button 
                    onClick={handlePrev}
                    className="p-1 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer min-w-[20px] min-h-[20px] flex items-center justify-center"
                    title="ก่อนหน้า"
                  >
                    <ChevronLeft size={11} />
                  </button>
                  <span className="text-[10px] font-extrabold px-1 text-slate-300 min-w-[14px] text-center">
                    {currentIndex + 1}/{announcements.length}
                  </span>
                  <button 
                    onClick={handleNext}
                    className="p-1 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer min-w-[20px] min-h-[20px] flex items-center justify-center"
                    title="ถัดไป"
                  >
                    <ChevronRight size={11} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setSelectedAnn(current)}
                className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all uppercase tracking-wider h-[26px]"
              >
                <Eye size={11} />
                <span>เปิดดู</span>
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors hover:bg-white/5 h-[26px] w-[26px] flex items-center justify-center"
                title="ปิดการแจ้งเตือน"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Bottom Row: text marquee */}
          <div className="w-full overflow-hidden whitespace-nowrap select-none pr-1">
            <div className="flex animate-marquee-loop">
              <span 
                className="inline-block whitespace-nowrap text-xs font-semibold hover:underline cursor-pointer text-slate-100 dark:text-slate-200" 
                onClick={() => setSelectedAnn(current)}
                style={{ paddingRight: '4rem' }}
              >
                {current.title} — {current.content} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              </span>
              <span 
                className="inline-block whitespace-nowrap text-xs font-semibold hover:underline cursor-pointer text-slate-100 dark:text-slate-200" 
                onClick={() => setSelectedAnn(current)}
                style={{ paddingRight: '4rem' }}
              >
                {current.title} — {current.content} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              </span>
            </div>
          </div>
        </div>

        {/* DESKTOP VIEW FOR ANNOUNCEMENTS (traditional single row, visible from md up) */}
        <div className="hidden md:flex w-[96%] md:w-[92%] max-w-[1280px] mx-auto items-center justify-between gap-2 md:gap-4 select-none">
          <div className="flex items-center gap-2 md:gap-3 overflow-hidden flex-1 min-w-0">
            <div className="hidden md:flex flex-shrink-0 w-7 h-7 rounded-lg bg-white/15 items-center justify-center text-blue-200">
              <Volume2 className="animate-bounce" size={14} />
            </div>
            
            <div className="flex items-center gap-2 md:gap-2 overflow-hidden flex-1 min-w-0">
              <span className={`text-[11px] md:text-[12px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${getCategoryStyles(current.category)}`}>
                {getCategoryLabel(current.category)}
              </span>

              {announcements.length > 1 && (
                <div className="flex items-center bg-white/10 rounded-lg p-1 flex-shrink-0 transition-all gap-1">
                  <button 
                    onClick={handlePrev}
                    className="p-1 md:p-1 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer min-w-[24px] min-h-[24px] flex items-center justify-center group"
                    title="ก่อนหน้า"
                  >
                    <ChevronLeft size={14} className="group-active:scale-95 transition-transform" />
                  </button>
                  <span className="text-[11px] font-extrabold px-1 min-w-[28px] text-center text-slate-300">
                    {currentIndex + 1}/{announcements.length}
                  </span>
                  <button 
                    onClick={handleNext}
                    className="p-1 md:p-1 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer min-w-[24px] min-h-[24px] flex items-center justify-center group"
                    title="ถัดไป"
                  >
                    <ChevronRight size={14} className="group-active:scale-95 transition-transform" />
                  </button>
                </div>
              )}
              
              <div className="overflow-hidden whitespace-nowrap flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={current.id}
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => setSelectedAnn(current)}
                    className="text-xs md:text-sm font-semibold hover:underline cursor-pointer truncate text-slate-100 dark:text-slate-200 leading-tight flex-1 min-w-0 ml-1"
                  >
                    {current.title}<span className="text-slate-300 font-medium text-xs md:text-[13px] truncate"> — {current.content}</span>
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <button
              onClick={() => setSelectedAnn(current)}
              className="bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all uppercase tracking-wider"
            >
              <Eye size={12} />
              <span>เปิดดู</span>
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors hover:bg-white/5"
              title="ปิดการแจ้งเตือน"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* DETAIL MODAL OVERLAY */}
      <AnimatePresence>
        {selectedAnn && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAnn(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-[500px] bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 lg:p-8 shadow-[0_30px_60px_-15px_rgba(15,45,82,0.3)] overflow-y-auto max-h-[86vh] z-10"
            >
              {/* Colored Ribbon Top */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                selectedAnn.category === 'critical' ? 'bg-red-500' : selectedAnn.category === 'important' ? 'bg-yellow-500' : 'bg-brand-blue'
              }`} />

               <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${getCategoryStyles(selectedAnn.category)}`}>
                    {getCategoryLabel(selectedAnn.category)}
                  </span>
                  <span className="text-[12px] text-slate-400 font-bold">{selectedAnn.date}</span>
                </div>
                <button
                  onClick={() => setSelectedAnn(null)}
                  className="w-7 h-7 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-base sm:text-lg font-[900] text-[#0f2d52] dark:text-white leading-snug">
                    {selectedAnn.title}
                  </h3>
                  <div className="text-[12px] text-[#0f2d52] dark:text-slate-400 font-bold mt-1">ผู้ประกาศ: {selectedAnn.author}</div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 sm:p-5 border border-slate-100/50 dark:border-slate-800/50">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-thai whitespace-pre-line font-medium">
                    {selectedAnn.content}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedAnn(null)}
                  className="w-full bg-[#0f2d52] dark:bg-brand-blue text-white py-2.5 rounded-xl text-sm font-black hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  รับทราบข้อความ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
