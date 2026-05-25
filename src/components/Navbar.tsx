import React, { useState } from 'react';
import { 
  Bell, 
  Moon, 
  Sun,
  Search, 
  Home, 
  FileText, 
  List, 
  BookOpen, 
  UserCircle,
  LogOut,
  ShieldAlert,
  ChevronDown,
  User,
  LayoutDashboard,
  MessageSquare,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface NavbarProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onAdminPortalClick?: () => void;
  onUserPortalClick?: () => void;
  onManualClick?: () => void;
  isManualActive?: boolean;
  onContactClick?: () => void;
  isContactActive?: boolean;
  onSafetyClick?: () => void;
  isSafetyActive?: boolean;
  onHomeClick?: () => void;
  user: any;
  isAdmin?: boolean;
  isUserPortal?: boolean;
  isAdminPortal?: boolean;
}

export default function Navbar({ 
  isDarkMode, 
  onToggleDarkMode, 
  onLoginClick, 
  onLogoutClick,
  onAdminPortalClick, 
  onUserPortalClick,
  onManualClick,
  isManualActive = false,
  onContactClick,
  isContactActive = false,
  onSafetyClick,
  isSafetyActive = false,
  onHomeClick,
  user, 
  isAdmin,
  isUserPortal,
  isAdminPortal
}: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get user initials (e.g., "สมิตา สิงห์สาด" -> "ส")
  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    const cleanName = name.replace(/^(ทนพ\.|ทนพญ\.|นนพ\.|นนพญ\.|นาย|นาง|นางสาว|ดร\.)\s*/, '');
    return cleanName.charAt(0) || 'U';
  };

  const handleScrollToHistory = () => {
    if (onHomeClick) onHomeClick();
    setTimeout(() => {
      const element = document.getElementById('handover-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const closeDropdown = () => setIsDropdownOpen(false);

  return (
    <>
      <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md fixed top-0 left-0 right-0 z-50 transition-all rounded-none border-b border-gray-100 dark:border-slate-800">
        <div className="w-[92%] max-w-[1280px] mx-auto px-4">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            <div className="flex items-center gap-6 sm:gap-8">
              <div onClick={onHomeClick} className="flex items-center gap-2 sm:gap-2.5 cursor-pointer">
                <div className="w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0 bg-brand-blue rounded-xl flex items-center justify-center text-white">
                  <span className="text-[10px] sm:text-xs font-bold">SK</span>
                </div>
                <div>
                  <h1 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white leading-tight whitespace-nowrap">กลุ่มงานเทคนิคการแพทย์</h1>
                  <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tight">โรงพยาบาลสังขะ</p>
                </div>
              </div>

              <div className="hidden lg:flex items-center space-x-1">
                <NavLink icon={<Home size={16} />} text="หน้าหลัก" active={!isUserPortal && !isAdminPortal && !isManualActive && !isContactActive && !isSafetyActive} isDarkMode={isDarkMode} onClick={onHomeClick} />
                <NavLink icon={<BookOpen size={16} />} text="คู่มือส่งเวร" active={isManualActive} isDarkMode={isDarkMode} onClick={onManualClick} />
                <NavLink icon={<MessageSquare size={16} />} text="ติดต่อทีมงาน" active={isContactActive} isDarkMode={isDarkMode} onClick={onContactClick} />
                <NavLink icon={<Shield size={16} />} text="ความปลอดภัย" active={isSafetyActive} isDarkMode={isDarkMode} onClick={onSafetyClick} />
                {user && (
                  <button 
                    onClick={onUserPortalClick}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap uppercase tracking-wider ${
                      isUserPortal 
                        ? 'text-white bg-brand-blue shadow-md shadow-brand-blue/15' 
                        : 'text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20'
                    }`}
                  >
                    <UserCircle size={16} />
                    <span>User Portal</span>
                  </button>
                )}
                {isAdmin && (
                  <button 
                    onClick={onAdminPortalClick}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap uppercase tracking-wider ${
                      isAdminPortal 
                        ? 'text-white bg-rose-600 shadow-md shadow-rose-600/15' 
                        : 'text-rose-600 bg-rose-600/10 hover:bg-rose-600/20 dark:text-rose-400 dark:bg-rose-500/10 dark:hover:bg-rose-500/20'
                    }`}
                  >
                    <ShieldAlert size={16} />
                    <span>Admin Portal</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 relative">
              <div className="flex items-center gap-2 sm:gap-4">
                <button 
                  onClick={onToggleDarkMode}
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-brand-blue dark:hover:text-brand-blue transition-colors cursor-pointer"
                  title={isDarkMode ? 'เปิดโหมดสว่าง' : 'เปิดโหมดมืด'}
                >
                  {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                
                {user ? (
                  <button 
                    onClick={onLogoutClick}
                    className="bg-brand-blue hover:bg-[#0a274c] dark:bg-slate-800 dark:hover:bg-slate-700 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold text-[10px] sm:text-xs flex items-center gap-1 sm:gap-1.5 transition-all shadow-sm cursor-pointer border border-transparent dark:border-slate-700/50"
                  >
                    <LogOut size={16} />
                    <span>ลงชื่อออก ({user.full_name?.split(' ')[0]})</span>
                  </button>
                ) : (
                  <button 
                    onClick={onLoginClick}
                    className="bg-brand-blue text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold text-[10px] sm:text-xs flex items-center gap-1 sm:gap-1.5 hover:bg-[#0a274c] transition-all shadow-sm shadow-[#0a2f5c]/20 dark:shadow-none cursor-pointer"
                  >
                    <UserCircle size={16} />
                    <span className="hidden xs:inline">ลงชื่อเข้าใช้</span>
                  </button>
                )}

                {/* Mobile Hamburger toggle */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-1.5 sm:p-2 lg:hidden text-slate-500 hover:text-brand-blue dark:hover:text-brand-blue transition-colors cursor-pointer"
                  title="ตัวเลือกเมนู"
                >
                  {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Mobile Nav Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
            >
              <div className="px-4 py-3 space-y-1.5 flex flex-col font-thai">
                <button
                  onClick={() => {
                    if (onHomeClick) onHomeClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
                    !isUserPortal && !isAdminPortal && !isManualActive && !isContactActive && !isSafetyActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-brand-blue font-black'
                      : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Home size={16} />
                  <span>หน้าหลัก (Home)</span>
                </button>

                <button
                  onClick={() => {
                    if (onManualClick) onManualClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
                    isManualActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-brand-blue font-black'
                      : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <BookOpen size={16} />
                  <span>คู่มือระบบส่งเวร (Manual)</span>
                </button>

                <button
                  onClick={() => {
                    if (onContactClick) onContactClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
                    isContactActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-brand-blue font-black'
                      : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare size={16} />
                  <span>ติดต่อทีมงานช่วยเหลือ (Contact)</span>
                </button>

                <button
                  onClick={() => {
                    if (onSafetyClick) onSafetyClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
                    isSafetyActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-brand-blue font-black'
                      : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Shield size={16} />
                  <span>ความปลอดภัยสารสนเทศ (Safety)</span>
                </button>

                {user && (
                  <button
                    onClick={() => {
                      if (onUserPortalClick) onUserPortalClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
                      isUserPortal
                        ? 'bg-brand-blue text-white shadow-sm'
                        : 'text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20'
                    }`}
                  >
                    <UserCircle size={16} />
                    <span>User Portal (บันทึกรายคน)</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => {
                      if (onAdminPortalClick) onAdminPortalClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
                      isAdminPortal
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-rose-600 bg-rose-600/10 hover:bg-rose-600/20'
                    }`}
                  >
                    <ShieldAlert size={16} />
                    <span>Admin Portal (ผู้ดูแลเวร)</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}

function NavLink({ icon, text, active = false, isDarkMode, onClick }: { icon: React.ReactNode, text: string, active?: boolean, isDarkMode: boolean, onClick?: () => void }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
        active 
          ? 'bg-brand-light dark:bg-brand-blue/10 text-brand-blue font-black' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-brand-blue dark:hover:text-brand-blue'
      }`}
    >
      {icon}
      <span>{text}</span>
    </button>
  );
}
