import React from 'react';
import { motion } from 'motion/react';

export default function Hero() {
  const scrollToForm = () => {
    const element = document.getElementById('handover-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToHistory = () => {
    const element = document.getElementById('history-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-transparent pt-7 sm:pt-0 pb-1 sm:pb-3 overflow-hidden relative">
      <div className="w-full mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-4 lg:gap-8 items-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col text-left items-start"
          >
            <h1 className="text-[22px] md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-2 sm:mb-3">
              ส่งต่อข้อมูลครบถ้วน<br />
              <span className="text-brand-blue dark:text-brand-blue/80 text-sm sm:text-base md:text-lg lg:text-xl font-medium block sm:whitespace-nowrap mt-1">
                งานต่อเนื่อง ปลอดภัย ผู้รับเวรมั่นใจ
              </span>
            </h1>
            <p className="thai-font text-[11px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 md:mb-6 leading-relaxed max-w-lg">
              บันทึกและส่งต่อข้อมูลสำคัญในการปฏิบัติงานระหว่างเวร<br className="block sm:hidden" />
              ต่อเนื่อง ปลอดภัย ไร้รอยต่อ
            </p>
 
            {/* CTA Buttons - Matching requested design */}
            <div className="flex flex-row w-full sm:w-auto gap-2 mb-3 sm:mb-4 justify-start">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={scrollToForm}
                className="bg-brand-blue/80 backdrop-blur-sm hover:bg-brand-blue text-white font-bold py-2.5 px-3 sm:px-6 rounded-full shadow-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-[12px] sm:text-sm flex-1 sm:flex-none cursor-pointer border border-white/20 whitespace-nowrap"
              >
                เริ่มบันทึกส่งเวร
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={scrollToHistory}
                className="glass-card bg-brand-light/30 dark:bg-slate-900/30 text-brand-blue dark:text-blue-400 font-bold py-2.5 px-3 sm:px-6 rounded-full transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-[12px] sm:text-sm flex-1 sm:flex-none cursor-pointer whitespace-nowrap"
              >
                รายการส่งเวร
              </motion.button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:flex justify-center items-center"
          >
            {/* Background Decorative Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand-light/60 dark:bg-brand-blue/10 rounded-full blur-[100px] -z-10" />
            
            <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center">
              {/* Main Scientist Illustration (Provided by user) */}
              <motion.div
                animate={{ 
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative z-10 w-full h-full flex items-center justify-center"
              >
                <img 
                  src="https://cdn-icons-png.flaticon.com/512/7265/7265950.png" 
                  alt="Laboratory Scientist" 
                  className="w-[85%] h-auto object-contain drop-shadow-2xl"
                  referrerPolicy="no-referrer"
                />
                
                {/* Floating Bubbles to match the illustration style (Blue theme) */}
                <div className="absolute right-[10%] top-[10%] w-24 h-48 pointer-events-none">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ 
                        opacity: [0, 1, 0],
                        y: [-20, -160],
                        scale: [0.5, 1, 0.8],
                        x: [0, (i % 2 === 0 ? 15 : -15), 0]
                      }}
                      transition={{
                        duration: 4 + i,
                        repeat: Infinity,
                        delay: i * 1.5,
                        ease: "easeOut"
                      }}
                      className="absolute bottom-0 right-1/2 rounded-full border-2 border-brand-blue/50 bg-brand-light/40 backdrop-blur-[1px] shadow-sm z-0"
                      style={{ 
                        right: `${10 + (i * 12)}%`,
                        width: i === 0 ? '32px' : i === 1 ? '24px' : i === 2 ? '18px' : '14px',
                        height: i === 0 ? '32px' : i === 1 ? '24px' : i === 2 ? '18px' : '14px'
                      }}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Accent decorative ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-dashed border-brand-light dark:border-brand-blue/20 rounded-full -z-10 scale-95"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
