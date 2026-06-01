import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Megaphone, 
  LogOut, 
  ChevronDown, 
  Search, 
  ArrowRight, 
  ExternalLink, 
  RefreshCw, 
  Eye, 
  X, 
  Filter, 
  Home, 
  Calendar, 
  Inbox, 
  CheckCircle2, 
  Clock,
  ShieldCheck,
  AlertCircle,
  Sun,
  Moon,
  Bell,
  Download,
  Key,
  Settings,
  Menu
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { supabase } from '../lib/supabase';
import { getAnnouncements, Announcement } from '../lib/announcements';
import ShiftHistory from './ShiftHistory';
import HandoverForm from './HandoverForm';

interface UserPortalProps {
  user: any; // The users record from supabase table
  onLogout: () => void;
  onSwitchToSite: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const cleanName = (fullName: string | undefined | null) => {
  if (!fullName) return '';
  let cleaned = fullName.trim();
  const prefixes = [
    /^นาย\s*/,
    /^นางสาว\s*/,
    /^นาง\s*/,
    /^ทนพ\.\s*/,
    /^ทนพญ\.\s*/,
    /^พญ\.\s*/,
    /^นพ\.\s*/,
    /^ดร\.\s*/
  ];
  for (const prefix of prefixes) {
    if (prefix.test(cleaned)) {
      cleaned = cleaned.replace(prefix, '');
      break;
    }
  }
  return cleaned.trim();
};

export default function UserPortal({ 
  user, 
  onLogout, 
  onSwitchToSite,
  isDarkMode = false,
  onToggleDarkMode
}: UserPortalProps) {
  const [activeTab, setActiveTab] = useState<'Overview' | 'AllHandovers' | 'MyHandovers' | 'Announcements' | 'Settings'>('AllHandovers');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // Stats
  const [stats, setStats] = useState({
    totalSent: 0,
    pending: 0,
    accepted: 0,
    lastShift: 'ไม่ระบุ'
  });
  
  // Data lists
  const [myHandovers, setMyHandovers] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentHandovers, setRecentHandovers] = useState<any[]>([]);
  
  // Filter / Search for My Handovers
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Accepted'>('All');
  const [divisionFilter, setDivisionFilter] = useState<'All' | 'Central Lab' | 'Blood Bank'>('All');
  
  // Selected Handover to view details
  const [selectedHandover, setSelectedHandover] = useState<any | null>(null);
  
  // Selected Announcement to view
  const [viewedAnnouncement, setViewedAnnouncement] = useState<Announcement | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('read_announcements_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const unreadAnnouncements = announcements.filter(ann => !readAnnouncementIds.includes(ann.id));

  const handleMarkAllAsRead = () => {
    const allIds = announcements.map(ann => ann.id);
    setReadAnnouncementIds(allIds);
    localStorage.setItem('read_announcements_ids', JSON.stringify(allIds));
  };

  const handleMarkAsRead = (id: string) => {
    if (!readAnnouncementIds.includes(id)) {
      const nextRead = [...readAnnouncementIds, id];
      setReadAnnouncementIds(nextRead);
      localStorage.setItem('read_announcements_ids', JSON.stringify(nextRead));
    }
  };

  // Password Change States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fetchUserDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
      
      // Load announcements
      try {
        const list = await getAnnouncements();
        setAnnouncements(list);
      } catch (annErr) {
        console.error('Error fetching announcements in UserPortal:', annErr);
      }

      // Fetch user's own handovers where user.id is sender_id
      const userId = user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('handovers')
        .select(`
          *,
          sender:users!handovers_sender_id_fkey ( full_name ),
          receiver:users!handovers_receiver_id_fkey ( full_name )
        `)
        .eq('sender_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const records = data || [];
      setMyHandovers(records);

      // 1. Gather stats
      const totalSent = records.length;
      const pending = records.filter(r => r.status === 'Pending').length;
      const accepted = records.filter(r => r.status === 'Accepted').length;
      
      let lastShift = 'ไม่ระบุ';
      if (records.length > 0) {
        lastShift = records[0].shift || 'ไม่มีกำกับ';
      }

      setStats({
        totalSent,
        pending,
        accepted,
        lastShift
      });

      // 2. Format activity trend for Recharts (past 7 days)
      const dateMap: Record<string, { date: string; 'ส่งเวร': number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
        dateMap[dayStr] = { date: dayStr, 'ส่งเวร': 0 };
      }

      records.forEach(r => {
        const dayStr = new Date(r.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
        if (dateMap[dayStr]) {
          dateMap[dayStr]['ส่งเวร']++;
        }
      });

      setChartData(Object.values(dateMap));

      // 3. Set recent 5
      setRecentHandovers(records.slice(0, 5));

    } catch (err) {
      console.error('Error in UserPortal data fetch:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordChangeError('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeError('รหัสผ่านใหม่สองช่องไม่ตรงกัน');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordChangeError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }

    setIsChangingPassword(true);

    try {
      // 1. Fetch fresh record from the 'users' table to check the current password
      const { data: userRecord, error: fetchErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchErr || !userRecord) {
        throw new Error('ไม่พบข้อมูลบัญชีผู้เขียนหรือการเชื่อมต่อฐานข้อมูลล้มเหลว');
      }

      // Verification of password (matches Login.tsx check)
      const isHashed = userRecord.sender_pass?.startsWith('$') || userRecord.sender_pass?.length > 32;

      if (userRecord.email && isHashed) {
        // Authenticate old password with Supabase Auth to verify correctness
        const { error: authVerifyErr } = await supabase.auth.signInWithPassword({
          email: userRecord.email,
          password: oldPassword
        });
        if (authVerifyErr) {
          throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
        }
      } else if (isHashed) {
        const { data: isValid, error: rpcError } = await supabase.rpc('verify_user_password', {
          p_user_id: user.id,
          p_password: oldPassword
        });

        if (rpcError) {
          if (userRecord.sender_pass !== oldPassword) {
            throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
          }
        } else if (!isValid) {
          throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
        }
      } else {
        if (userRecord.sender_pass !== oldPassword) {
          throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
        }
      }

      // 2. Perform the update
      const { error: updateErr } = await supabase
        .from('users')
        .update({ sender_pass: newPassword })
        .eq('id', user.id);

      if (updateErr) throw updateErr;

      if (userRecord.email) {
        try {
          const { error: authErr } = await supabase.auth.updateUser({
            password: newPassword
          });
          if (authErr) {
            console.log('Auth password update skipped or handled:', authErr.message);
          }
        } catch (authCatch) {
          console.error('Non-blocking auth update caution:', authCatch);
        }
      }

      setPasswordChangeSuccess('เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error changing password:', err);
      setPasswordChangeError(err.message || 'เกิดความผิดพลาดในการอัปเดตรหัสผ่าน');
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    fetchUserDashboardData();
  }, [fetchUserDashboardData]);

  // Filtering handovers
  const filteredMyHandovers = myHandovers.filter(h => {
    // Search filter
    const searchTarget = `${h.title || ''} ${h.note || ''} ${h.department || ''} ${h.category || ''}`.toLowerCase();
    const matchesSearch = searchTarget.includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'All' || h.status === statusFilter;
    
    // Division filter
    const matchesDivision = divisionFilter === 'All' || h.division === divisionFilter;
    
    return matchesSearch && matchesStatus && matchesDivision;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-thai flex flex-col md:flex-row">
      
      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] overflow-x-auto no-scrollbar gap-2 scroll-smooth">
        <div className="flex items-center gap-1 min-w-max px-4 w-full justify-around">
          <MobileTabItem 
            icon={<RefreshCw size={18} />} 
            label="รับเวร/ส่งเวร" 
            active={activeTab === 'AllHandovers'} 
            onClick={() => setActiveTab('AllHandovers')} 
          />
          <MobileTabItem 
            icon={<ClipboardList size={18} />} 
            label="Missions" 
            active={activeTab === 'MyHandovers'} 
            onClick={() => setActiveTab('MyHandovers')} 
          />
          <MobileTabItem 
            icon={<Megaphone size={18} />} 
            label="Announce" 
            active={activeTab === 'Announcements'} 
            onClick={() => setActiveTab('Announcements')} 
            badge={unreadAnnouncements.length}
          />
          <MobileTabItem 
            icon={<Settings size={18} />} 
            label="Settings" 
            active={activeTab === 'Settings'} 
            onClick={() => setActiveTab('Settings')} 
          />
          <MobileTabItem 
            icon={<LogOut size={18} />} 
            label="Exit" 
            active={false} 
            onClick={onLogout} 
            color="text-red-500"
          />
        </div>
      </nav>

      {/* Sidebar navigation (Desktop Only) */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col justify-between transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 transition-transform duration-300 ease-in-out hidden md:flex`}>
        
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-blue rounded-xl flex items-center justify-center text-white font-black text-sm">
                <span>SK</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-[13px] font-black tracking-tight text-slate-900 dark:text-white leading-tight truncate">กลุ่มงานเทคนิคการแพทย์</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate">โรงพยาบาลสังขะ</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>

          {/* Logged in User Information */}
          <div className="p-5 bg-slate-50/50 dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-light dark:bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue text-sm font-black flex-shrink-0">
                {user?.full_name ? cleanName(user.full_name).substring(0, 2) : 'ST'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[#0f2d52] dark:text-white truncate leading-snug">{cleanName(user?.full_name) || 'เจ้าหน้าที่ห้องปฏิบัติการ'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50 animate-pulse" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{user?.role || 'Staff Profile'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menus */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => { setActiveTab('AllHandovers'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] xl:text-sm font-black tracking-wide transition-all ${
                activeTab === 'AllHandovers'
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/15'
                  : 'text-slate-500 hover:text-brand-blue hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <RefreshCw size={15} className="flex-shrink-0" />
              <span className="whitespace-nowrap truncate">รับเวร / ส่งเวร</span>
            </button>

            <button
              onClick={() => { setActiveTab('MyHandovers'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] xl:text-sm font-black tracking-wide transition-all ${
                activeTab === 'MyHandovers'
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/15'
                  : 'text-slate-500 hover:text-brand-blue hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <ClipboardList size={15} className="flex-shrink-0" />
              <span className="whitespace-nowrap truncate">งานส่งเวรของฉัน</span>
            </button>

            <button
              onClick={() => { setActiveTab('Announcements'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] xl:text-sm font-black tracking-wide transition-all ${
                activeTab === 'Announcements'
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/15'
                  : 'text-slate-500 hover:text-brand-blue hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Megaphone size={15} className="flex-shrink-0" />
              <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                <span className="whitespace-nowrap truncate">ข่าวสารและประกาศ</span>
                {unreadAnnouncements.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black scale-90 flex-shrink-0">
                    {unreadAnnouncements.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => { setActiveTab('Settings'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] xl:text-sm font-black tracking-wide transition-all ${
                activeTab === 'Settings'
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/15'
                  : 'text-slate-500 hover:text-brand-blue hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Key size={15} className="flex-shrink-0" />
              <span className="whitespace-nowrap truncate">เปลี่ยนรหัสผ่าน</span>
            </button>
          </nav>
        </div>

        {/* Bottom Menu Area */}
        <div className="p-4 space-y-2 border-t border-slate-50 dark:border-slate-800">
          <button
            onClick={onLogout}
            className="w-full h-10 px-4 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/45 text-red-600 dark:text-red-400 rounded-xl font-black text-[13px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-red-100/10 whitespace-nowrap overflow-hidden text-ellipsis"
          >
            <LogOut size={14} className="flex-shrink-0" />
            <span className="truncate">ลงชื่อออก</span>
          </button>
        </div>
      </aside>

      {/* Main Container Area */}
      <div className="flex-1 md:pl-72 flex flex-col min-h-screen pb-20 md:pb-0">
        
        {/* Top bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-[#0f2d52] dark:text-white bg-slate-50 dark:bg-slate-800"
            >
              <Menu size={18} />
            </button>
            
            <div className="hidden xs:block">
              <nav className="text-[12px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <span>User Portal</span>
                <span className="text-slate-200">/</span>
                <span className="text-[#0f2d52] dark:text-brand-blue">{activeTab}</span>
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Kaggle Search Bar inside UserPortal - fully functional with real search state */}
            <div className="relative hidden sm:flex items-center bg-slate-50 dark:bg-slate-900/80 px-4 h-10 border border-slate-200 dark:border-slate-800 rounded-full w-48 focus-within:w-64 focus-within:bg-white focus-within:dark:bg-slate-800 focus-within:border-brand-blue/30 transition-all group">
              <Search size={14} className="text-slate-400 group-focus-within:text-brand-blue transition-colors mr-2.5" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (activeTab !== 'MyHandovers' && activeTab !== 'AllHandovers') {
                    setActiveTab('MyHandovers');
                  }
                }}
                placeholder="Search" 
                className="bg-transparent border-none outline-none text-[13px] font-[900] text-slate-600 dark:text-slate-200 placeholder:text-slate-400 w-full font-thai"
              />
            </div>

            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-sm shadow-green-500/50 animate-pulse" />
              <span className="text-[12px] font-black text-[#0f2d52] dark:text-slate-200 uppercase tracking-wider">เชื่อมต่อสำเร็จ</span>
              <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700" />
              <span className="text-[12px] font-bold text-slate-400 font-sans">อัปเดต: {lastUpdated || '--:--'}</span>
              <button 
                onClick={fetchUserDashboardData}
                className="p-1 hover:text-brand-blue rounded transition-all text-slate-400 hover:bg-white dark:hover:bg-slate-700"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw size={11} className={isLoading ? 'animate-spin text-brand-blue' : ''} />
              </button>
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="w-10 h-10 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all relative cursor-pointer"
                title="การแจ้งเตือนประกาศล่วงหน้า"
              >
                <Bell size={18} />
                {unreadAnnouncements.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-slate-100 dark:border-slate-800 animate-bounce">
                    {unreadAnnouncements.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown popup */}
              <AnimatePresence>
                {isNotificationOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-84 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden font-thai"
                    >
                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-1.5 border-none">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[#0f2d52] dark:text-white">ประกาศ ({unreadAnnouncements.length} ใหม่)</span>
                          <button 
                            type="button"
                            onClick={() => {
                              setIsNotificationOpen(false);
                              setActiveTab('Announcements');
                            }}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer bg-transparent border-none"
                          >
                            ดูทั้งหมด
                          </button>
                        </div>
                        {unreadAnnouncements.length > 0 && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleMarkAllAsRead}
                              className="text-[9px] text-[#0f2d52] dark:text-indigo-300 font-bold bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 px-2.5 py-0.5 rounded-lg transition-all border-none cursor-pointer"
                            >
                              อ่านแล้วทั้งหมด ✓
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-850">
                        {announcements.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400 font-bold">ไม่มีการแจ้งเตือนในขณะนี้</div>
                        ) : (
                          announcements.slice(0, 5).map((ann) => {
                            const isUnread = !readAnnouncementIds.includes(ann.id);
                            return (
                              <div
                                key={ann.id}
                                onClick={() => {
                                  handleMarkAsRead(ann.id);
                                  setViewedAnnouncement(ann);
                                  setIsNotificationOpen(false);
                                }}
                                className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all cursor-pointer space-y-1 text-left relative ${
                                  isUnread ? 'bg-indigo-500/[0.03] dark:bg-indigo-500/[0.05]' : ''
                                }`}
                              >
                                {isUnread && (
                                  <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                                <div className="flex items-center justify-between gap-2 pr-4">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                    ann.category === 'critical' 
                                      ? 'bg-red-50 text-red-500 border border-red-100 dark:bg-red-950/20' 
                                      : ann.category === 'important'
                                      ? 'bg-yellow-50 text-yellow-600 border border-yellow-101 dark:bg-yellow-950/20'
                                      : 'bg-blue-50 text-brand-blue border border-blue-101 dark:bg-blue-950/20'
                                  }`}>
                                    {ann.category === 'critical' ? 'ด่วนที่สุด' : ann.category === 'important' ? 'สำคัญ' : 'ทั่วไป'}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-bold">{ann.date}</span>
                                </div>
                                <h4 className={`text-xs truncate ${isUnread ? 'font-black text-slate-850 dark:text-white' : 'font-semibold text-slate-500 dark:text-slate-400'}`}>{ann.title}</h4>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 font-bold leading-normal">{ann.content}</p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Dark Mode toggle */}
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="w-10 h-10 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                title={isDarkMode ? "เปิดโหมดสว่าง" : "เปิดโหมดมืด"}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6 md:p-8 flex-1 space-y-8 bg-slate-50 dark:bg-slate-950">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'Overview' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-6"
            >
              {/* Kaggle welcome card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden">
                {/* Background minimal graphic effect */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-slate-50/50 dark:bg-slate-950/20 rounded-full pointer-events-none -translate-y-12 translate-x-12" />
                
                <div className="space-y-4 relative z-10 max-w-xl text-center md:text-left">
                  <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-[900] text-slate-900 dark:text-white tracking-tight leading-tight">
                      Good to see you, {cleanName(user?.full_name || 'SAMITA SINGSARD')}.
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                      Ready for your shift? Let's get your handovers done.
                    </p>
                  </div>

                  {/* Action shortcuts */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
                    <button 
                      onClick={() => setActiveTab('MyHandovers')}
                      className="h-10 px-5 bg-brand-blue text-white rounded-xl text-xs font-black shadow-lg shadow-brand-blue/15 hover:bg-brand-dark transition-all flex items-center gap-1.5"
                    >
                      <ClipboardList size={14} />
                      <span>งานส่งเวรของฉัน / My Handovers</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('Announcements')}
                      className="h-10 px-5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-705 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5"
                    >
                      <Megaphone size={14} />
                      <span>ดูข่าวประชาสัมพันธ์ / News</span>
                    </button>
                  </div>
                </div>

                {/* Custom SVG Illustration for beautiful UI representation */}
                <div className="hidden md:block shrink-0 relative z-10 w-40 h-40">
                  <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
                    {/* Floating graphic shapes representing Laboratory and Kaggle data items */}
                    <rect x="30" y="40" width="100" height="90" rx="16" fill="#00A3FF" fillOpacity="0.05" stroke="#00A3FF" strokeWidth="2" strokeDasharray="4 4" />
                    <rect x="45" y="55" width="70" height="12" rx="6" fill="#22C55E" fillOpacity="0.15" />
                    <circle cx="53" cy="61" r="3" fill="#22C55E" />
                    
                    {/* Kaggle styled statistics / chart mock */}
                    <path d="M45 105 L70 90 L95 100 L115 80" stroke="#00A3FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="115" cy="80" r="5" fill="#00A3FF" />
                    <circle cx="70" cy="90" r="4" fill="#EAB308" />
                    
                    {/* Small abstract decorations */}
                    <g filter="blur(1px)">
                      <circle cx="130" cy="35" r="8" fill="#EAB308" fillOpacity="0.2" />
                      <circle cx="25" cy="115" r="12" fill="#22C55E" fillOpacity="0.1" />
                    </g>
                    <circle cx="130" cy="35" r="3" fill="#EAB308" />
                    <circle cx="25" cy="115" r="4" fill="#22C55E" />
                  </svg>
                </div>
              </div>

              {/* Personal Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  icon={<ClipboardList className="text-brand-blue" size={18} />} 
                  title={stats.totalSent.toString()} 
                  subtitle="ส่งมอบเวรทั้งหมด" 
                  tag="งานสะสม" 
                  bgColor="bg-blue-500/5"
                />
                <StatCard 
                  icon={<Clock className="text-yellow-500" size={18} />} 
                  title={stats.pending.toString()} 
                  subtitle="งานค้างรอทีมรับส่ง" 
                  tag="Pending" 
                  bgColor="bg-yellow-500/5"
                />
                <StatCard 
                  icon={<CheckCircle2 className="text-green-500" size={18} />} 
                  title={stats.accepted.toString()} 
                  subtitle="รับเวรสำเร็จแล้ว" 
                  tag="Accepted" 
                  bgColor="bg-green-500/5"
                />
                <StatCard 
                  icon={<Calendar className="text-purple-500" size={18} />} 
                  title={stats.lastShift} 
                  subtitle="เวรปฏิบัติงานล่าสุด" 
                  tag="Active Shift" 
                  bgColor="bg-purple-500/5"
                />
              </div>

              {/* Chart & Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Chart Box */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-base font-black text-[#0f2d52] dark:text-white tracking-widest uppercase mb-1">สถิติการส่งเวรรายวัน / Personal Activity</h3>
                    <p className="text-[15px] text-slate-400 font-bold">แสดงปริมาณงานเวรที่คุณกรอกรายงานย้อนหลังในรอบ 7 วันล่าสุด</p>
                  </div>

                  <div className="h-64 pr-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="userColorSent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00A3FF" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#00A3FF" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: '13px', fontWeight: 'bold', borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }} />
                        <Area type="monotone" dataKey="ส่งเวร" stroke="#00A3FF" strokeWidth={2.5} fillOpacity={1} fill="url(#userColorSent)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Recent Activities List */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-black text-[#0f2d52] dark:text-white tracking-widest uppercase mb-1">ประวัติการกระทำล่าสุดของฉัน</h3>
                      <p className="text-[15px] text-slate-400 font-bold">5 รายการส่งล่าสุดคัดกรองเฉพาะงานคุณ</p>
                    </div>

                    <div className="space-y-3.5">
                      {recentHandovers.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-bold text-sm space-y-2">
                          <Inbox className="mx-auto text-slate-300 dark:text-slate-700" size={32} />
                          <p>ยังไม่มีบันทึกส่งเวร</p>
                        </div>
                      ) : (
                        recentHandovers.map((item, idx) => (
                          <div 
                            key={item.id || idx} 
                            onClick={() => setSelectedHandover(item)}
                            className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer border border-transparent hover:border-slate-100/10 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black ${
                                item.shift === 'เช้า' 
                                  ? 'bg-[#00A3FF]/10 text-brand-blue' 
                                  : item.shift === 'บ่าย'
                                  ? 'bg-yellow-500/10 text-yellow-500' 
                                  : 'bg-purple-500/10 text-purple-500'
                              }`}>
                                {item.shift ? item.shift.substring(0, 1) : 'W'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[15px] font-black text-slate-800 dark:text-white truncate group-hover:text-brand-blue transition-colors">
                                  เวร{item.shift || 'ปกติ'} - {item.division || 'ทั่วไป'}
                                </p>
                                <p className="text-[13px] font-bold text-slate-400 mt-0.5">
                                  {new Date(item.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} • ID: {item.task_number || item.id.substring(0, 6).toUpperCase()}
                                </p>
                              </div>
                            </div>

                            <span className={`text-[13px] font-black px-2 py-0.5 rounded-md ${
                              item.status === 'Pending' 
                                ? 'bg-yellow-105/90 dark:bg-yellow-950/20 text-yellow-500' 
                                : 'bg-green-105/90 dark:bg-green-950/20 text-green-500'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {recentHandovers.length > 0 && (
                    <button 
                      onClick={() => setActiveTab('MyHandovers')}
                      className="w-full mt-4 flex items-center justify-center gap-1 text-base font-black text-brand-blue hover:text-brand-dark transition-all py-1 font-sans"
                    >
                      ดูรายการของคุณทั้งหมด <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'AllHandovers' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-[900] text-[#0f2d52] dark:text-white tracking-tight leading-tight flex items-center gap-2">
                    <RefreshCw className="text-brand-blue animate-spin-slow" size={24} />
                    ระบบรับมอบเวร และ ส่งเวรทั้งหมด
                  </h1>
                  <p className="text-sm text-slate-400 font-bold mt-1">
                    ทำรายการส่งมอบเวรใหม่ที่แถบด้านซ้าย และสามารถตรวจสอบ/รับมอบงานได้ที่แถบประวัติด้านขวา (ข้อมูลเซนเซอร์คนไข้จะถูกยกเลิกในแถบนี้)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[36%_1fr] gap-6 xl:items-stretch">
                {/* Left Side: Handover Form */}
                <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-5 sm:p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-6 bg-brand-blue rounded-full block animate-pulse"></span>
                    <h2 className="text-base font-black text-slate-850 dark:text-white uppercase tracking-wider">
                      ทำรายการบันทึกส่งเวร
                    </h2>
                  </div>
                  <HandoverForm currentUser={user} />
                </div>
                
                {/* Right Side: Shift History */}
                <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-5 sm:p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-6 bg-emerald-500 rounded-full block"></span>
                    <h2 className="text-base font-black text-slate-850 dark:text-white uppercase tracking-wider">
                      งานส่งเวรทั้งหมด / กดรับเวร
                    </h2>
                  </div>
                  <ShiftHistory forceUncensored={true} />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'MyHandovers' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-[900] text-[#0f2d52] dark:text-white tracking-tight leading-tight flex items-center gap-2">
                    <ClipboardList className="text-brand-blue" size={24} />
                    บันทึกการส่งงานของฉัน / My Handovers
                  </h1>
                  <p className="text-sm text-slate-400 font-bold mt-1">คัดลอกเฉพาะกิจกรรมการทำธุรกรรมของคุณเพื่อดูความปลอดภัย ยืนยัน และสืบค้นอย่างง่ายดาย</p>
                </div>
              </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-2.5">
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="พิมพ์คำค้นในเรื่อง/โน้ต..."
                      className="h-10 w-52 pl-9 pr-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-[#0f2d52] dark:text-white placeholder:text-slate-300 outline-none focus:border-brand-blue/30 transition-all font-thai md:text-base"
                    />
                  </div>

                  {/* Division Select */}
                  <div className="relative">
                    <select
                      value={divisionFilter}
                      onChange={e => setDivisionFilter(e.target.value as any)}
                      className="appearance-none h-10 pl-4 pr-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-[#0f2d52] dark:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 outline-none transition-all font-thai md:text-base"
                    >
                      <option value="All">ทุกหน่วยงาน (All Divisions)</option>
                      <option value="Central Lab">Central Lab</option>
                      <option value="Blood Bank">Blood Bank</option>
                    </select>
                    <ChevronDown size={13} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Status Select */}
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as any)}
                      className="appearance-none h-10 pl-4 pr-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-[#0f2d52] dark:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 outline-none transition-all font-thai md:text-base"
                    >
                      <option value="All">ทุกสถานะ (All Status)</option>
                      <option value="Pending">รอรับส่ง (Pending)</option>
                      <option value="Accepted">รับเวรแล้ว (Accepted)</option>
                    </select>
                    <ChevronDown size={13} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

              {/* Handovers Records Grid / Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Desktop View: Responsive Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80">
                        <th className="px-5 py-4 text-xs lg:text-sm font-black text-slate-400 uppercase tracking-wider">วัน-เวลา / No.</th>
                        <th className="px-5 py-4 text-xs lg:text-sm font-black text-slate-400 uppercase tracking-wider">เวร / แผนก</th>
                        <th className="px-5 py-4 text-xs lg:text-sm font-black text-slate-400 uppercase tracking-wider">เรื่อง / ปัญหา</th>
                        <th className="px-5 py-4 text-xs lg:text-sm font-black text-slate-400 uppercase tracking-wider">สถานะ</th>
                        <th className="px-5 py-4 text-xs lg:text-sm font-black text-slate-400 uppercase tracking-wider">ผู้รับช่วงต่อ</th>
                        <th className="px-5 py-4 text-xs lg:text-sm font-black text-slate-400 uppercase tracking-wider text-right">การกระทำ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
                      {filteredMyHandovers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-20 text-slate-400 font-bold text-xs space-y-2">
                            <Inbox className="mx-auto text-slate-300 dark:text-slate-700" size={36} />
                            <p>ไม่พบบันทึกการส่งเวรที่ตรงกับตัวกรอง</p>
                          </td>
                        </tr>
                      ) : (
                        filteredMyHandovers.map((item, index) => {
                          const dateObj = new Date(item.created_at);
                          const dateFormatted = dateObj.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
                          const timeFormatted = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                          
                          return (
                            <tr key={item.id || index} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="px-5 py-4">
                                <span className="text-sm lg:text-base font-black text-[#0f2d52] dark:text-white block">{dateFormatted} {timeFormatted}</span>
                                <span className="text-[11px] lg:text-xs font-bold text-slate-400 uppercase tracking-tight block mt-0.5">ID: {item.task_number || item.id.substring(0, 8).toUpperCase()}</span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex flex-col">
                                  <span className={`text-xs lg:text-sm font-black ${
                                    item.shift === 'เช้า' 
                                      ? 'text-brand-blue' 
                                      : item.shift === 'บ่าย'
                                      ? 'text-yellow-500' 
                                      : 'text-purple-500'
                                  }`}>เวร{item.shift || 'เช้า'}</span>
                                  <span className="text-xs lg:text-sm text-slate-400 font-bold mt-0.5">{item.division || 'ทั่วไป'}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-sm lg:text-base font-black text-[#0f2d52] dark:text-white block max-w-xs truncate">{item.title || 'ไม่มีหัวข้อ'}</span>
                                <span className="text-xs lg:text-sm text-slate-400 block max-w-xs truncate mt-0.5 font-medium">{item.note || 'ไม่มีโน้ตเพิ่มเติม'}</span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'Pending' ? 'bg-[#facc15]' : 'bg-[#22c55e]'}`} />
                                  <span className={`text-xs lg:text-sm font-bold ${item.status === 'Pending' ? 'text-yellow-500' : 'text-green-600'}`}>{item.status}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-xs lg:text-sm font-bold text-[#0f2d52] dark:text-white">
                                {item.receiver?.full_name || 'ยังไม่มีผู้รับเวร'}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <button
                                  onClick={() => setSelectedHandover(item)}
                                  className="h-7 px-3 bg-brand-light dark:bg-brand-blue/10 hover:bg-brand-blue hover:text-white text-brand-blue rounded-lg text-xs font-black flex items-center gap-1 inline-flex transition-all cursor-pointer"
                                >
                                  <Eye size={12} />
                                  ตรวจสอบ
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Flexible Cards Layout */}
                <div className="block md:hidden divide-y divide-slate-150 dark:divide-slate-800/80">
                  {filteredMyHandovers.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-xs space-y-2">
                      <Inbox className="mx-auto text-slate-300 dark:text-slate-700" size={32} />
                      <p>ไม่พบบันทึกการส่งเวรที่ตรงกับตัวกรอง</p>
                    </div>
                  ) : (
                    filteredMyHandovers.map((item, index) => {
                      const dateObj = new Date(item.created_at);
                      const dateFormatted = dateObj.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
                      const timeFormatted = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                      
                      return (
                        <div 
                          key={item.id || index} 
                          onClick={() => setSelectedHandover(item)}
                          className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/10 transition-all cursor-pointer space-y-2"
                        >
                          {/* Top row - metadata & status badge */}
                          <div className="flex items-center justify-between text-[11px] font-black text-slate-400 tracking-tight">
                            <span>{dateFormatted} · {timeFormatted}</span>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 dark:bg-slate-950 rounded-full border border-slate-100 dark:border-slate-850/50">
                              <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'Pending' ? 'bg-[#facc15]' : 'bg-[#22c55e]'}`} />
                              <span className={item.status === 'Pending' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-emerald-400'}>{item.status}</span>
                            </div>
                          </div>

                          {/* Middle row - titles with flexible clamping & sizes */}
                          <div>
                            <h4 className="text-xs sm:text-sm font-black text-[#0f2d52] dark:text-white leading-normal line-clamp-1">
                              {item.title || 'ไม่มีหัวข้อ'}
                            </h4>
                            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold mt-0.5 line-clamp-2 leading-relaxed">
                              {item.note || 'ไม่มีข้อมูลรายละเอียดโน้ตรวม'}
                            </p>
                          </div>

                          {/* Footer details - shift and receiver */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800/40 text-[10.5px] font-bold text-slate-400 dark:text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-black px-1.5 py-0.5 rounded ${
                                item.shift === 'เช้า' 
                                  ? 'bg-blue-50/70 text-brand-blue dark:bg-brand-blue/10' 
                                  : item.shift === 'บ่าย'
                                  ? 'bg-yellow-50/70 text-yellow-600 dark:bg-yellow-950/20' 
                                  : 'bg-purple-50/70 text-purple-600 dark:bg-purple-950/20'
                              }`}>
                                เวร{item.shift || 'เช้า'}
                              </span>
                              <span>•</span>
                              <span>{item.division || 'ทั่วไป'}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-normal">ผู้รับ: </span>
                              <span className="font-black text-slate-600 dark:text-slate-350">{item.receiver?.full_name || 'รอรับเวร ⏳'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: ANNOUNCEMENTS */}
          {activeTab === 'Announcements' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-[900] text-[#0f2d52] dark:text-white tracking-tight leading-tight flex items-center gap-2">
                  <Megaphone className="text-brand-blue" size={24} />
                  ข่าวสารประชาสัมพันธ์ / Laboratory Announcements
                </h1>
                <p className="text-xs text-slate-400 font-bold mt-1">ประกาศสำคัญ ข่าวคุณภาพ กฎข้อควรปฏิบัติ และการแจ้งเตือนจากทางหัวหน้าห้องปฏิบัติการ</p>
              </div>

              {/* List of announcements */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Announcements list - 2 Cols */}
                <div className="lg:col-span-2 space-y-4">
                  {announcements.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                      ไม่มีข่าวสารประชาสัมพันธ์ในขณะนี้
                    </div>
                  ) : (
                    announcements.map((ann) => (
                      <div 
                        key={ann.id}
                        onClick={() => setViewedAnnouncement(ann)}
                        className={`bg-white dark:bg-slate-900 border ${
                          ann.pinned 
                            ? 'border-brand-blue/20 bg-brand-blue/[0.01]' 
                            : 'border-slate-100 dark:border-slate-800'
                        } hover:border-brand-blue/30 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden group`}
                      >
                        {ann.pinned && (
                          <div className="absolute right-0 top-0 bg-brand-blue text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-xl shadow-sm">
                            PINNED
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                             <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                              ann.category === 'critical' 
                                ? 'bg-red-50 text-red-500 border border-red-100' 
                                : ann.category === 'important'
                                ? 'bg-yellow-50 text-yellow-600 border border-yellow-100'
                                : 'bg-blue-50 text-brand-blue border border-blue-100'
                            }`}>
                              {ann.category === 'critical' ? 'ด่วนที่สุด' : ann.category === 'important' ? 'สำคัญ' : 'ทั่วไป'}
                            </span>
                            <span className="text-[12px] text-slate-400 font-bold">{ann.date}</span>
                          </div>

                          <h3 className="text-sm font-black text-[#0f2d52] dark:text-white group-hover:text-brand-blue transition-colors leading-tight truncate">
                            {ann.title}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {ann.content}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/80 pt-3 text-[12px] font-bold text-slate-400">
                          <span>ผู้ประกาศ: {ann.author}</span>
                          <span className="text-brand-blue group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-black text-[11px] uppercase tracking-wider">
                            อ่านต่อ <ArrowRight size={11} />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Info and Quality policy card */}
                <div className="bg-gradient-to-b from-[#0f2d52] to-blue-900 rounded-3xl p-6 text-white space-y-4 shadow-xl shadow-[#0c2340]/10 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-black tracking-wider uppercase">นโยบายคุณภาพกลุ่มงาน</h3>
                      <p className="text-[8px] text-blue-200/80 font-bold uppercase tracking-widest leading-none">Quality and Accuracy Policy</p>
                    </div>
                    <p className="text-xs text-blue-100/90 leading-relaxed font-thai">
                      "กลุ่มงานเทคนิคการแพทย์ มุ่งมั่นบริการวิเคราะห์ผลทดสอบทางรังสี วิทยาศาสตร์การแพทย์ เคมีคลินิก เม็ดเลือด และธนาคารเลือด ด้วยความถูกต้อง รวดเร็ว ปลอดภัย ได้มาตรฐานสากล เพื่อสุขภาวะสูงสุดของผู้ป่วยโรงพยาบาลสังคม"
                    </p>
                  </div>

                  <div className="border-t border-white/10 pt-4 flex items-center justify-between text-[12px] text-blue-100/80 font-bold">
                    <span>มาตรฐาน ISO 15189:2022</span>
                    <span className="underline cursor-pointer">อ่านคู่มือปฏิบัติงาน</span>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 4: SETTINGS / PASSWORD CHANGE */}
          {activeTab === 'Settings' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-6 max-w-2xl"
            >
              <div>
                <h1 className="text-2xl font-[900] text-[#0f2d52] dark:text-white tracking-tight leading-tight flex items-center gap-2">
                  <Key className="text-brand-blue" size={24} />
                  แก้ไขรหัสผ่านผู้ใช้งาน / Change Password
                </h1>
                <p className="text-xs text-slate-400 font-bold mt-1">อัปเดตและรักษาความปลอดภัยบัญชีปฏิบัติการ กลุ่มงานเทคนิคการแพทย์</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                
                {/* User info status */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950/45 border border-slate-100 dark:border-slate-850 rounded-2xl">
                  <div className="w-12 h-12 bg-brand-light dark:bg-brand-blue/10 border border-brand-blue/20 rounded-2xl flex items-center justify-center text-brand-blue text-base font-black font-sans">
                    {user?.full_name ? cleanName(user.full_name).substring(0, 2) : 'ST'}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                      {cleanName(user?.full_name) || 'เจ้าหน้าที่ห้องปฏิบัติการ'}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                      อีเมลหรือรหัสพนักงาน: <span className="font-mono text-brand-blue">{user?.id || user?.email || '-'}</span>
                    </p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  
                  {/* Status Banner */}
                  {passwordChangeError && (
                    <div className="p-3 bg-red-50 dark:bg-rose-950/20 text-red-600 dark:text-rose-400 text-xs font-black rounded-xl border border-red-100/40 dark:border-rose-900/30 flex items-center gap-2 leading-relaxed">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{passwordChangeError}</span>
                    </div>
                  )}

                  {passwordChangeSuccess && (
                     <div className="p-3 bg-green-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 text-xs font-black rounded-xl border border-green-100/40 dark:border-emerald-900/30 flex items-center gap-2 leading-relaxed">
                       <CheckCircle2 size={15} className="shrink-0" />
                       <span>{passwordChangeSuccess}</span>
                     </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider">รหัสผ่านเดิม / Old Password (PIN)</label>
                    <input 
                      type="password"
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      placeholder="ป้อนรหัสผ่านปัจจุบันของคุณ"
                      className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-black text-[#0f2d52] dark:text-white placeholder:text-slate-400 outline-none focus:border-brand-blue/30 transition-all font-thai md:text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider">รหัสผ่านใหม่ / New Password (PIN)</label>
                    <input 
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="ป้อนรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)"
                      className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-black text-[#0f2d52] dark:text-white placeholder:text-slate-400 outline-none focus:border-brand-blue/30 transition-all font-thai md:text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider">ยืนยันรหัสผ่านใหม่ / Confirm New Password</label>
                    <input 
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="ป้อนรหัสผ่านใหม่อีกครั้งเพื่อรับรองความถูกต้อง"
                      className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-black text-[#0f2d52] dark:text-white placeholder:text-slate-400 outline-none focus:border-brand-blue/30 transition-all font-thai md:text-sm"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
                      className="w-full h-11 bg-brand-blue text-white disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:text-slate-400 disabled:dark:text-slate-650 rounded-xl text-[11.5px] font-black shadow-lg shadow-brand-blue/15 hover:bg-brand-dark transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isChangingPassword ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>กำลังตรวจสอบและบันทึก...</span>
                        </>
                      ) : (
                        <span>บันทึกความปลอดภัย / Save New Password</span>
                      )}
                    </button>
                  </div>
                </form>

                <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl text-[11px] text-yellow-600 dark:text-yellow-400 font-bold leading-relaxed">
                  ⚠️ <span className="font-black">ข้อเสนอความปลอดภัย:</span> หลีกเลี่ยงการใช้รหัสผ่านเดียวกับรหัสล็อกหน้าจอทั่วไป ควรตั้งค่ารหัสเฉพาะเพื่อใช้ในการรายงานส่งมอบเวรของโรงพยาบาลสังขะเท่านั้น
                </div>

              </div>
            </motion.div>
          )}

        </main>
      </div>

      {/* MODAL 1: HANDOVER DETAILED VIEW */}
      <AnimatePresence>
        {selectedHandover && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedHandover(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />

            {/* Content Drawer */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-y-auto max-h-[86vh] z-10 p-5 sm:p-6 space-y-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md ${
                      selectedHandover.shift === 'เช้า' 
                        ? 'bg-blue-50 text-brand-blue border border-blue-100' 
                        : selectedHandover.shift === 'บ่าย'
                        ? 'bg-yellow-50 text-yellow-600 border border-yellow-105'
                        : 'bg-purple-50 text-purple-600 border border-purple-100'
                    }`}>
                      เวร{selectedHandover.shift || 'ปกติ'}
                    </span>
                    <span className="text-[12px] text-slate-400 font-bold">
                      {new Date(selectedHandover.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-[#0f2d52] dark:text-white mt-1.5">{selectedHandover.title || 'ไม่มีหัวข้อ'}</h3>
                </div>
                <button 
                  onClick={() => setSelectedHandover(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Data Rows */}
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 space-y-3.5">
                <div className="grid grid-cols-2 gap-3.5 text-sm text-slate-500">
                  <div>
                    <span className="block text-[12px] uppercase font-black tracking-wider text-slate-400 mb-0.5">แผนกหลัก</span>
                    <span className="font-bold text-[#0f2d52] dark:text-white">{selectedHandover.division || 'ทั่วไป (All)'}</span>
                  </div>
                  <div>
                    <span className="block text-[12px] uppercase font-black tracking-wider text-slate-400 mb-0.5">หมวดหมู่รายงาน</span>
                    <span className="font-bold text-[#0f2d52] dark:text-white">{selectedHandover.category || 'ไม่ได้ระบุ'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 text-sm text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div>
                    <span className="block text-[12px] uppercase font-black tracking-wider text-slate-400 mb-0.5">ผู้ส่งมอบงาน</span>
                    <span className="font-bold text-[#0f2d52] dark:text-white">{selectedHandover.sender?.full_name || 'System'}</span>
                  </div>
                  <div>
                    <span className="block text-[12px] uppercase font-black tracking-wider text-slate-400 mb-0.5">ผู้รับช่วงต่อ</span>
                    <span className="font-bold text-[#0f2d52] dark:text-white">{selectedHandover.receiver?.full_name || 'ยังไม่มีผู้ตอบรับ'}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="block text-[12px] uppercase font-black tracking-wider text-slate-400 mb-1">รายละเอียดและสิ่งส่งตรวจเด่น</span>
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed font-medium bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    {selectedHandover.note || 'ไม่มีข้อมูลเพิ่มเติม'}
                  </p>
                </div>

                {/* Subtask lists / parameters if any */}
                {selectedHandover.tasks && Array.isArray(selectedHandover.tasks) && selectedHandover.tasks.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1.5">
                    <span className="block text-[12px] uppercase font-black tracking-wider text-slate-400 mb-1">สิ่งส่งมอบ / รายละเอียดข้อตกลง</span>
                    <div className="space-y-1.5 Max-h-40 overflow-y-auto">
                      {selectedHandover.tasks.map((t: any, idx: number) => (
                        <div key={idx} className="flex gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-50 dark:border-slate-805 text-sm">
                          <span className="w-5 h-5 bg-blue-50 text-brand-blue rounded-md flex items-center justify-center font-black text-[12px] shrink-0 font-sans">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <strong>{t.title || 'ไม่มีหัวข้อ'}</strong>
                            {t.detail && <p className="text-slate-400 text-[12px] mt-0.5">{t.detail}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Action bar */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${selectedHandover.status === 'Pending' ? 'bg-[#facc15] shadow-[#facc15]/30' : 'bg-[#22c55e] shadow-[#22c55e]/30'} shadow-sm`} />
                  <span className="text-sm font-black text-[#0f2d52] dark:text-white uppercase tracking-wider">{selectedHandover.status}</span>
                </div>
                <button
                  onClick={() => setSelectedHandover(null)}
                  className="h-10 px-6 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-sm font-black"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ANNOUNCEMENT VIEW */}
      <AnimatePresence>
        {viewedAnnouncement && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewedAnnouncement(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />

            {/* Content Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-y-auto max-h-[86vh] z-10 p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-brand-blue/10 text-brand-blue text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                      {viewedAnnouncement.category}
                    </span>
                    <span className="text-[12px] text-slate-400 font-bold">{viewedAnnouncement.date}</span>
                  </div>
                  <h3 className="text-base font-black text-[#0f2d52] dark:text-white leading-tight">{viewedAnnouncement.title}</h3>
                </div>
                <button 
                  onClick={() => setViewedAnnouncement(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-sm md:text-base text-slate-600 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed font-thai">
                {viewedAnnouncement.content}
              </div>

              <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/80 pt-4">
                <div className="text-[12px] font-bold text-slate-400">
                  <span className="block">ผู้ประสานงาน: {viewedAnnouncement.author}</span>
                  <span className="block mt-0.5">กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลสังขะ</span>
                </div>
                <button
                  onClick={() => setViewedAnnouncement(null)}
                  className="h-9 px-5 bg-brand-blue hover:bg-brand-dark text-white rounded-xl text-sm font-black transition-all"
                >
                  ตกลง รับทราบความต้องการ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function MobileTabItem({ 
  icon, 
  label, 
  active, 
  onClick, 
  badge, 
  color 
}: { 
  icon: React.ReactNode, 
  label: string, 
  active: boolean, 
  onClick: () => void, 
  badge?: number,
  color?: string
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 min-w-[56px] relative transition-all ${
        active ? 'text-brand-blue' : color || 'text-slate-400 dark:text-slate-500'
      }`}
    >
      <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform`}>
        {icon}
      </div>
      <span className="text-[11px] font-black uppercase tracking-wider">{label}</span>
      
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-0 right-0 -translate-y-1 translate-x-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-slate-900">
          {badge}
        </span>
      )}

      {active && (
        <motion.div 
          layoutId="userActiveTab" 
          className="w-1 h-1 rounded-full bg-brand-blue mt-0.5" 
        />
      )}
    </button>
  );
}

// Stats Card Sub-component
function StatCard({ 
  icon, 
  title, 
  subtitle, 
  tag, 
  bgColor 
}: { 
  icon: React.ReactNode; 
  title: string; 
  subtitle: string; 
  tag: string; 
  bgColor: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all space-y-2 relative overflow-hidden group">
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${bgColor} blur-2xl group-hover:scale-125 transition-all duration-500`} />
      
      <div className="flex justify-between items-start relative z-10">
        <div className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
          {icon}
        </div>
        <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md">
          {tag}
        </span>
      </div>

      <div className="space-y-0.5 relative z-10">
        <p className="text-xl sm:text-2xl font-[900] text-[#0f2d52] dark:text-white tracking-tight">{title}</p>
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest leading-none">{subtitle}</p>
      </div>
    </div>
  );
}
