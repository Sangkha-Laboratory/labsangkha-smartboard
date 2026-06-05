import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, X } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  label?: string; // Block-level top label (e.g., "หน่วยงาน (Division)")
  inlineLabel?: string; // Inline prefix label (e.g., "กลุ่ม:")
  value: string;
  onChange: (val: string) => void;
  options: CustomSelectOption[];
  className?: string; // Custom className for the container/trigger
  placeholder?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  inlineLabel,
  value,
  onChange,
  options,
  className = '',
  placeholder = 'เลือกรายการ'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(opt => opt.value === value) || {
    value,
    label: value || placeholder
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${label ? 'space-y-1' : ''} ${className}`}>
      {/* Top Block Label if provided */}
      {label && (
        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-brand-blue/30 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-all select-none ${
          inlineLabel ? 'h-11 justify-start gap-1.5 bg-slate-50 dark:bg-slate-800 border-slate-150 dark:border-slate-800 px-2.5' : ''
        }`}
      >
        {inlineLabel ? (
          <>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">
              {inlineLabel}
            </span>
            <span className="text-xs font-extrabold text-[#0f2d52] dark:text-slate-200 truncate flex-grow text-right md:text-left pr-4">
              {selectedOption.label}
            </span>
            <ChevronDown size={11} className="text-[#0f2d52]/50 dark:text-slate-400 ml-auto shrink-0" />
          </>
        ) : (
          <>
            <span className="truncate pr-4 text-[#0f2d52] dark:text-slate-200 text-left">
              {selectedOption.label}
            </span>
            <ChevronDown size={11} className="text-slate-400 shrink-0" />
          </>
        )}
      </button>

      {/* Dropdown Menu (AnimatePresence) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay for Click Outside (Desktop and Mobile Backdrop) */}
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:bg-transparent md:backdrop-blur-none cursor-default"
              onClick={() => setIsOpen(false)}
            />

            {/* Desktop Popover List */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="hidden md:block absolute left-0 right-0 top-[110%] z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1.5 max-h-60 overflow-y-auto"
            >
              <div className="px-1.5 py-0.5 space-y-0.5">
                {options.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full px-3 py-2 text-left text-xs font-bold rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/20 dark:text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check size={12} className="shrink-0 text-brand-blue dark:text-white" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Mobile Bottom Dialog Slide-up */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-[2rem] border-t border-slate-200 dark:border-slate-800 shadow-2xl p-6 pb-8 space-y-4 max-h-[85vh] flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">
                    {label || inlineLabel || 'กรองข้อมูล'}
                  </span>
                  <h4 className="text-sm font-black text-[#0f2d52] dark:text-white">
                    {inlineLabel ? `กรองตาม${inlineLabel.replace(':', '')}` : `เลือก${label || 'ตัวกรอง'}`}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer List - Scrollable */}
              <div className="overflow-y-auto space-y-2.5 py-1 flex-1">
                {options.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full p-4 rounded-xl text-left text-sm font-extrabold flex items-center justify-between border transition-all ${
                        isSelected
                          ? 'bg-brand-blue/5 border-brand-blue/20 text-brand-blue dark:bg-brand-blue/20 dark:border-brand-blue/30 dark:text-white'
                          : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border-slate-100 dark:border-slate-850 text-[#0f2d52] dark:text-slate-350'
                      }`}
                    >
                      <span className="truncate pr-4">{opt.label}</span>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                          isSelected
                            ? 'bg-brand-blue border-brand-blue text-white'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950'
                        }`}
                      >
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
