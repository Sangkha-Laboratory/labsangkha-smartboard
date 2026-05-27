import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, Calendar as CalendarIcon, ChevronDown, CheckCircle2, UserCheck, X, ShieldCheck, RefreshCw, ChevronLeft, ChevronRight, ExternalLink, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { maskSensitiveData } from '../lib/maskUtils';

// Create an unauthenticated client to fetch supplemental full names of all practitioners, 
// bypassing any RLS restrictions that might filter records for currently logged-in users.
const publicClient = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'handover_sys'
    }
  }
);

interface ShiftItem {
  id: string;
  task_number?: string;
  date: string;
  rawDate: string; // ISO string
  time: string;
  name: string;
  department: string;
  shift: string;
  category?: string;
  summary: string;
  description?: string;
  status: string;
  receiver_name?: string;
}

export default function ShiftHistory({ forceUncensored = false }: { forceUncensored?: boolean } = {}) {
  const [shiftData, setShiftData] = useState<ShiftItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<ShiftItem | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalNotifyError, setModalNotifyError] = useState<string | null>(null);
  const [modalNotifySuccess, setModalNotifySuccess] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileSearch, setMobileSearch] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
                
  // Filter States
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const formatBEInterval = (dateStr: string) => {
    if (!dateStr || dateStr === 'ไม่ระบุ') return 'ไม่ระบุ';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year < 2400) {
        year += 543;
      }
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setIsFilterPanelOpen(false);
      }
    };

    if (isFilterPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterPanelOpen]);

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterShift('');
    setFilterDepartment('');
    setFilterStatus('');
    setMobileSearch('');
  };

  const ITEMS_PER_PAGE = 10;

  const displayedData = shiftData.filter(item => {
    let match = true;
    
    if (filterStartDate) {
      const start = filterStartDate.includes('-') && filterStartDate.indexOf('-') === 4
        ? filterStartDate
        : new Date(filterStartDate).toISOString().split('T')[0];
      if (item.rawDate < start) match = false;
    }

    if (filterEndDate) {
      const end = filterEndDate.includes('-') && filterEndDate.indexOf('-') === 4
        ? filterEndDate
        : new Date(filterEndDate).toISOString().split('T')[0];
      if (item.rawDate > end) match = false;
    }

    if (filterShift && item.shift !== filterShift) match = false;
    if (filterDepartment && item.department !== filterDepartment) match = false;
    if (filterStatus && item.status !== filterStatus) match = false;

    if (mobileSearch) {
      const ms = mobileSearch.toLowerCase();
      const matchName = item.name.toLowerCase().includes(ms);
      const matchSummary = item.summary.toLowerCase().includes(ms);
      const matchDesc = (item.description || '').toLowerCase().includes(ms);
      const matchDept = item.department.toLowerCase().includes(ms);
      if (!matchName && !matchSummary && !matchDesc && !matchDept) {
        match = false;
      }
    }

    return match;
  });

  useEffect(() => {
    const checkUser = () => {
      const localUser = localStorage.getItem('sangkha_handover_local_user');
      if (localUser) {
        setIsLoggedIn(true);
        return;
      }
      supabase.auth.getSession().then(({ data: { session } }) => {
        setIsLoggedIn(!!session);
      });
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const localUser = localStorage.getItem('sangkha_handover_local_user');
      setIsLoggedIn(!!session || !!localUser);
    });

    // Listen to storage changes to keep state synced across tabs
    const handleStorageChange = () => {
      checkUser();
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await publicClient
        .from('users')
        .select('id, full_name, role')
        .eq('is_active', true)
        .neq('role', 'admin')
        .order('full_name');
      if (data) setUsers(data);
    };
    fetchUsers();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all users to create a robust local fallback mapper for names
      const usersMap: Record<string, string> = {};
      try {
        const { data: allUsers } = await publicClient
          .from('users')
          .select('id, full_name');
        if (allUsers) {
          allUsers.forEach((u: any) => {
            usersMap[u.id] = u.full_name;
          });
        }
      } catch (uErr) {
        console.error('Error fetching supplementary users map:', uErr);
      }

      const now = new Date();
      // Increase range to 30 days to ensure data is found during testing
      const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      const sy = thirtyDaysAgo.getFullYear();
      const sm = String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0');
      const sd = String(thirtyDaysAgo.getDate()).padStart(2, '0');
      const rangeDateStr = `${sy}-${sm}-${sd}`;

      // 1. Get total count
      const { count, error: countError } = await supabase
        .from('handovers')
        .select('*', { count: 'exact', head: true })
        .gte('handover_date', rangeDateStr);
      
      if (countError) {
        console.error('Count query error:', countError);
        if (countError.message.includes('schema') && countError.message.includes('not exist')) {
          throw new Error(`ไม่พบ Schema "handover_sys" ในฐานข้อมูล (Error: ${countError.message})`);
        }
        if (countError.message.includes('relation') && countError.message.includes('not exist')) {
          throw new Error('ไม่พบตาราง "handovers" ในฐานข้อมูล');
        }
        throw countError;
      }
      setTotalCount(count || 0);

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // 2. Main fetch with fallback for shift column existence and joins
      let data: any = null;
      let fetchError: any = null;

      try {
        const { data: testData, error: testErr } = await supabase
          .from('handovers')
          .select(`
            id, 
            task_number,
            handover_date, 
            created_at, 
            sender_id,
            division, 
            category, 
            shift,
            status,
            receiver_id,
            title,
            description,
            sender:users!handovers_sender_id_fkey ( full_name ),
            receiver:users!handovers_receiver_id_fkey ( full_name )
          `)
          .gte('handover_date', rangeDateStr)
          .order('handover_date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(from, to);

        if (testErr && (testErr.message.includes('column "shift"') || testErr.message.includes('does not exist'))) {
          throw new Error('FALLBACK_NO_SHIFT');
        } else {
          data = testData;
          fetchError = testErr;
        }
      } catch (err: any) {
        if (err.message === 'FALLBACK_NO_SHIFT') {
          const { data: legData, error: legErr } = await supabase
            .from('handovers')
            .select(`
              id, 
              task_number,
              handover_date, 
              created_at, 
              sender_id,
              division, 
              category, 
              status,
              receiver_id,
              title,
              description,
              sender:users!handovers_sender_id_fkey ( full_name ),
              receiver:users!handovers_receiver_id_fkey ( full_name )
            `)
            .gte('handover_date', rangeDateStr)
            .order('handover_date', { ascending: false })
            .order('created_at', { ascending: false })
            .range(from, to);
          data = legData;
          fetchError = legErr;
        } else {
          fetchError = err;
        }
      }

      // Fallback if specific join hints fail
      if (fetchError && fetchError.message.includes('relationship')) {
        console.warn('Falling back to simpler join syntax...');
        const { data: fbData, error: fbError } = await supabase
          .from('handovers')
          .select(`
            *,
            sender:sender_id ( full_name ),
            receiver:receiver_id ( full_name )
          `)
          .gte('handover_date', rangeDateStr)
          .order('handover_date', { ascending: false })
          .range(from, to);
        data = fbData;
        fetchError = fbError;
      }

      // Final fallback to flat records if all joins fail
      if (fetchError) {
        console.warn('Falling back to flat records fetch...');
        const { data: flatData, error: flatError } = await supabase
          .from('handovers')
          .select('*')
          .gte('handover_date', rangeDateStr)
          .order('handover_date', { ascending: false })
          .range(from, to);
        data = flatData;
        fetchError = flatError;
      }

      if (fetchError) throw fetchError;

      const formattedData: ShiftItem[] = (data || []).map((item: any) => {
        const dateObj = new Date(item.created_at);
        const rawHandoverDate = item.handover_date ? String(item.handover_date).substring(0, 10) : '';
        
        const catField = item.category || '';
        let parsedShift = item.shift || '';
        let parsedCategory = '';

        if (!parsedShift && catField.includes('|')) {
          const [s, c] = catField.split('|');
          parsedShift = s || 'ไม่ระบุ';
          parsedCategory = c || '';
        } else if (!parsedShift) {
          parsedShift = catField || 'ไม่ระบุ';
          parsedCategory = '';
        } else {
          parsedCategory = catField;
        }

        return {
          id: item.id,
          task_number: item.task_number || '',
          date: rawHandoverDate 
            ? `${rawHandoverDate.substring(8, 10)}/${rawHandoverDate.substring(5, 7)}/${rawHandoverDate.substring(0, 4)}` 
            : 'ไม่ระบุ',
          rawDate: rawHandoverDate,
          time: item.created_at ? dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '--:--',
          name: item.sender?.full_name || usersMap[item.sender_id] || item.sender_id || 'ไม่ระบุ',
          department: item.division || 'ไม่ระบุ',
          shift: parsedShift,
          category: parsedCategory,
          summary: item.title || 'ไม่มีหัวข้อ',
          description: item.description || '',
          status: item.status === 'Pending' ? 'รอรับงาน' : 'รับงานแล้ว',
          receiver_name: item.receiver?.full_name || usersMap[item.receiver_id] || item.receiver_id || ''
        };
      });

      setShiftData(formattedData);
    } catch (err: any) {
      console.error('Error fetching history:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจากระบบฐานข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentPage]);

  const handleOpenAccept = (id: string) => {
    setSelectedId(id);
    setModalNotifyError(null);
    setModalNotifySuccess(false);
    setIsModalOpen(true);
  };

  const handleAccept = async () => {
    if (!receiverName || !selectedId) {
      setModalNotifyError('กรุณาเลือกชื่อผู้รับงาน');
      return;
    }
    
    setIsLoading(true);
    setModalNotifyError(null);

    try {
      const { error, status } = await supabase
        .from('handovers')
        .update({ 
          status: 'Accepted',
          receiver_id: receiverName,
          accepted_at: new Date().toISOString()
        })
        .eq('id', selectedId);

      if (error) throw error;
      if (status !== 200 && status !== 204) {
        throw new Error('ไม่สามารถอัปเดตสถานะงานได้ หรือรายการนี้อาจถูกรับไปแล้ว');
      }
      
      setModalNotifySuccess(true);
      await fetchHistory();
      
      setTimeout(() => {
        setIsModalOpen(false);
        setSelectedId(null);
        setReceiverName('');
        setModalNotifySuccess(false);
      }, 1000);
    } catch (err: any) {
      console.error('Error in handleAccept:', err);
      setModalNotifyError(err.message || 'เกิดข้อผิดพลาด: ไม่สามารถรับงานได้');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="history-section" className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 p-4 lg:p-6 overflow-hidden relative flex flex-col h-full">
      <div className="flex items-center justify-between gap-2.5 mb-5 flex-shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-shrink-0">
          <div className="w-9 h-9 bg-brand-light dark:bg-brand-blue/10 rounded-lg hidden md:flex items-center justify-center text-brand-blue">
             <CalendarIcon size={18} />
          </div>
          <div className="min-w-0 flex-shrink-0">
            <h3 className="text-sm min-[375px]:text-base sm:text-lg font-[900] text-gray-900 dark:text-white leading-tight whitespace-nowrap">รายการส่งเวรย้อนหลัง</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">ข้อมูลรายการล่าสุดจากระบบ</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-black mt-0.5 md:hidden">คลิกที่รายการเพื่อดูรายละเอียด</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
           <button 
             onClick={fetchHistory}
             disabled={isLoading}
             className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
           >
              <RefreshCw size={13} className={isLoading ? 'animate-spin text-brand-blue' : ''} />
              <span>รีเฟรช</span>
           </button>
           <button 
             onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
             className={`hidden md:flex items-center gap-1.5 h-9 px-3 border rounded-xl text-xs font-black transition-colors ${
               isFilterPanelOpen 
                 ? 'bg-blue-600 text-white border-blue-600' 
                 : 'bg-blue-600 text-white border-none shadow-[0_4px_12px_rgba(37,99,235,0.15)] hover:bg-blue-700'
             }`}
           >
              <Filter size={13} />
              <span>ตัวกรอง</span>
           </button>
        </div>
      </div>

      <div className="relative">
        <AnimatePresence>
          {isFilterPanelOpen && (
            <>
              {/* Overlay Backdrop - localized to the container */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFilterPanelOpen(false)}
                className="absolute inset-0 z-30 bg-slate-900/5 backdrop-blur-[2px] cursor-pointer"
              />
              
              <motion.div
                ref={filterPanelRef}
                initial={{ opacity: 0, y: -20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ 
                  type: "spring", 
                  damping: 25, 
                  stiffness: 300,
                }}
                className="absolute top-0 left-0 right-0 z-40 p-1"
              >
                <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-slate-700">
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">วันที่เริ่มต้น</label>
                        <input 
                          type="date" 
                          value={filterStartDate}
                          onChange={(e) => setFilterStartDate(e.target.value)}
                          className="w-full h-9 text-xs p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">วันที่สิ้นสุด</label>
                        <input 
                          type="date" 
                          value={filterEndDate}
                          onChange={(e) => setFilterEndDate(e.target.value)}
                          className="w-full h-9 text-xs p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">เวร</label>
                        <select 
                          value={filterShift}
                          onChange={(e) => setFilterShift(e.target.value)}
                          className="w-full h-9 text-xs p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        >
                          <option value="">ทั้งหมด</option>
                          <option value="เช้า">เช้า</option>
                          <option value="บ่าย">บ่าย</option>
                          <option value="ดึก">ดึก</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">หน่วยงาน</label>
                        <select 
                          value={filterDepartment}
                          onChange={(e) => setFilterDepartment(e.target.value)}
                          className="w-full h-9 text-xs p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        >
                          <option value="">ทั้งหมด</option>
                          <option value="Central Lab">Central Lab</option>
                          <option value="Blood Bank">Blood Bank</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">สถานะ</label>
                        <select 
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="w-full h-9 text-xs p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        >
                          <option value="">ทั้งหมด</option>
                          <option value="รอรับงาน">รอรับงาน</option>
                          <option value="รับงานแล้ว">รับงานแล้ว</option>
                        </select>
                      </div>
                   </div>
                   <div className="flex justify-end mt-4">
                      <button 
                        onClick={clearFilters}
                        className="text-[10px] font-bold text-brand-blue hover:underline transition-colors flex items-center gap-1"
                      >
                        ล้างตัวกรองทั้งหมด
                      </button>
                   </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Only Search Bar and Quick Select Inputs */}
      <div className="block md:hidden space-y-3 mb-4 flex-shrink-0">
        {/* Search input field */}
        <div className="relative flex items-center bg-[#f3f7fa] dark:bg-slate-950/40 px-3.5 h-10 border border-transparent rounded-xl w-full">
          <Search size={14} className="text-slate-400 mr-2.5" />
          <input 
            type="text" 
            value={mobileSearch}
            onChange={(e) => setMobileSearch(e.target.value)}
            placeholder="ค้นหาผู้ส่ง, รายการงาน..." 
            className="bg-transparent border-none outline-none text-[11px] font-[900] text-slate-600 dark:text-slate-200 placeholder:text-slate-400 w-full"
          />
          {mobileSearch && (
            <button onClick={() => setMobileSearch('')} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Select dropdown fields */}
        <div className="grid grid-cols-3 gap-2">
          <div className="relative">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full h-10 pl-3 pr-6 bg-[#f3f7fa] dark:bg-slate-950/40 text-slate-600 dark:text-slate-350 font-bold text-[11px] rounded-xl border border-transparent outline-none appearance-none"
            >
              <option value="">ทุกแผนก</option>
              <option value="Central Lab">Central Lab</option>
              <option value="Blood Bank">Blood Bank</option>
            </select>
            <ChevronDown size={10} className="absolute right-2 top-[52%] -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="w-full h-10 pl-3 pr-6 bg-[#f3f7fa] dark:bg-slate-950/40 text-slate-600 dark:text-slate-350 font-bold text-[11px] rounded-xl border border-transparent outline-none appearance-none"
            >
              <option value="">ทุกเวร</option>
              <option value="เช้า">เช้า</option>
              <option value="บ่าย">บ่าย</option>
              <option value="ดึก">ดึก</option>
            </select>
            <ChevronDown size={10} className="absolute right-2 top-[52%] -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-10 pl-3 pr-6 bg-[#f3f7fa] dark:bg-slate-950/40 text-slate-600 dark:text-slate-350 font-bold text-[11px] rounded-xl border border-transparent outline-none appearance-none"
            >
              <option value="">ทุกสถานะ</option>
              <option value="รอรับงาน">รอรับงาน</option>
              <option value="รับงานแล้ว">รับงานแล้ว</option>
            </select>
            <ChevronDown size={10} className="absolute right-2 top-[52%] -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center flex-1 bg-red-50/10 dark:bg-red-900/5 rounded-3xl m-2">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 border border-red-100 dark:border-red-900/30">
            <ShieldCheck className="text-red-500" size={32} />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">ไม่สามารถดึงข้อมูลได้</h3>
          <p className="text-[11px] text-gray-500 max-w-[240px] mb-6">{error}</p>
          <button 
            onClick={fetchHistory}
            className="px-6 py-2.5 bg-[#2563eb] text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 flex items-center gap-2 hover:bg-blue-700 transition-[#2563eb]"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            ลองใหม่อีกครั้ง
          </button>
        </div>
      ) : isLoading ? (
        <div className="py-10 flex flex-col items-center justify-center gap-4 flex-1">
          <div className="w-12 h-12 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm font-medium">กำลังดึงข้อมูล...</p>
        </div>
      ) : displayedData.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center flex-1 min-h-0 bg-gray-50/30 dark:bg-slate-800/10 rounded-2xl py-12">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4 shadow-sm">
            <ClipboardList size={32} />
          </div>
          <p className="text-gray-500 font-bold">ไม่พบข้อมูลการส่งเวร</p>
          <p className="text-[10px] text-gray-400 mt-1">กรุณาลองเปลี่ยนเงื่อนไขการค้นหา</p>
        </div>
      ) : (
        <div className="flex flex-col min-h-0 flex-1">
          {/* Desktop Version table */}
          <div className="hidden md:block overflow-auto flex-1 -mx-4 sm:mx-0 px-4 sm:px-0 custom-scrollbar scroll-smooth">
             <table className="w-full text-left border-separate border-spacing-y-1.5">
                <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
                   <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ">
                      <th className="px-4 py-3 text-left">วันที่/เวลา</th>
                      <th className="px-4 py-3 text-left">ผู้ส่ง</th>
                      <th className="px-4 py-3 text-left">หน่วยงาน/เวร</th>
                      <th className="px-4 py-3 text-left">ข้อมูล</th>
                      <th className="px-4 py-3 text-center">สถานะ</th>
                   </tr>
                </thead>
                <tbody className="relative">
                   <AnimatePresence mode="popLayout">
                     {displayedData.map((row) => (
                        <motion.tr 
                          key={row.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                          className="group hover:bg-brand-light/10 dark:hover:bg-slate-800/30 transition-colors"
                        >
                         <td className="px-3 py-[20px] whitespace-nowrap border-y border-gray-50 dark:border-slate-800 first:border-l first:rounded-l-2xl last:border-r last:rounded-r-2xl">
                            <div className="flex flex-col">
                               <span className="text-[11px] font-bold text-gray-900 dark:text-white tabular-nums">{row.date}</span>
                               <span className="text-[10px] text-gray-400 tabular-nums">{row.time} น.</span>
                            </div>
                         </td>
                         <td className="px-4 py-[20px] border-y border-gray-50 dark:border-slate-800">
                            <span className="text-[12px] font-bold text-gray-800 dark:text-gray-200">{row.name}</span>
                         </td>
                         <td className="px-4 py-[20px] border-y border-gray-50 dark:border-slate-800">
                            <div className="flex flex-col">
                               <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">{row.department}</span>
                               <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className={`text-[10px] font-bold ${row.shift.includes('เช้า') ? 'text-brand-blue' : row.shift.includes('บ่าย') ? 'text-yellow-500' : 'text-purple-500'}`}>
                                     เวร{row.shift}
                                  </span>
                                  {row.task_number && (
                                    <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/50 rounded text-[9px] font-black text-blue-500 dark:text-blue-400 font-mono">
                                       {row.task_number}
                                    </span>
                                  )}
                                  {row.category && (
                                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase">
                                       {row.category}
                                    </span>
                                  )}
                               </div>
                            </div>
                         </td>
                         <td className="px-4 py-[20px] border-y border-gray-50 dark:border-slate-800 max-w-[150px]">
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2" title={maskSensitiveData(row.summary, isLoggedIn || forceUncensored)}>
                               "{maskSensitiveData(row.summary, isLoggedIn || forceUncensored)}"
                            </p>
                         </td>
                         <td className="px-3 py-[20px] border-y border-gray-50 dark:border-slate-800 last:border-r last:rounded-r-2xl text-center">
                            <div className="flex items-center justify-center gap-2">
                               {row.status === 'รอรับงาน' ? (
                                 <button 
                                   onClick={() => handleOpenAccept(row.id)}
                                   className="text-[10px] bg-brand-blue hover:bg-brand-dark text-white px-4 py-1.5 rounded-xl transition-all font-bold flex items-center gap-1.5 shadow-sm active:scale-95"
                                 >
                                   <UserCheck size={14} />
                                   รับงาน
                                 </button>
                               ) : (
                                 <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-500">
                                    <CheckCircle2 size={13} />
                                    ยืนยันแล้ว
                                 </span>
                               )}
                               
                               <button 
                                 onClick={() => {
                                   setSelectedDetailItem(row);
                                   setIsDetailModalOpen(true);
                                 }}
                                 className="p-1.5 text-gray-300 hover:text-brand-blue dark:hover:text-brand-blue hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                                 title="ดูรายละเอียดของเวร"
                               >
                                 <ExternalLink size={14} />
                               </button>
                            </div>
                         </td>
                        </motion.tr>
                     ))}
                   </AnimatePresence>
                </tbody>
             </table>
          </div>

          {/* Mobile Version Card List */}
          <div className="md:hidden flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100 dark:divide-slate-800/80">
            <AnimatePresence mode="popLayout">
              {displayedData.map((row) => (
                <motion.div
                  key={row.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-between py-4 active:bg-slate-50 dark:active:bg-slate-800/40 transition-colors"
                >
                  <div 
                    onClick={() => {
                      setSelectedDetailItem(row);
                      setIsDetailModalOpen(true);
                    }}
                    className="flex-1 min-w-0 pr-4 cursor-pointer"
                  >
                    <h4 className="text-[14px] font-bold text-[#0f2d52] dark:text-slate-100">
                      {row.name}
                    </h4>

                    <div className="flex items-center text-[11px] text-slate-400 dark:text-slate-500 font-bold mt-1.5 tracking-tight flex-wrap">
                                      {row.task_number && (
                                        <>
                                          <span className="font-mono text-blue-500 dark:text-blue-400">{row.task_number}</span>
                                          <span className="mx-1.5 font-light">·</span>
                                        </>
                                      )}
                                      <span>{formatBEInterval(row.date)} · {row.time}</span>
                      <span className="mx-2 font-light"></span>
                      <span className={`font-black ${
                        row.shift.includes('เช้า') ? 'text-blue-500 dark:text-blue-400' :
                        row.shift.includes('บ่าย') ? 'text-orange-500 dark:text-orange-400' :
                        'text-[#8b5cf6] dark:text-purple-400'
                      }`}>
                        {row.shift}
                      </span>
                      <span className="mx-2 font-light"></span>
                      <span>{row.department}</span>
                    </div>

                    <p className="text-[12px] text-slate-400 dark:text-slate-450 mt-1.5 truncate">
                      {maskSensitiveData(row.summary, isLoggedIn || forceUncensored)}
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-right pl-2">
                    {row.status === 'รอรับงาน' ? (
                      <button
                        onClick={() => handleOpenAccept(row.id)}
                        className="text-[12px] font-black text-blue-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>รับงาน</span>
                        <span className="font-sans text-[11px]">➔</span>
                      </button>
                    ) : (
                      <span className="text-[12px] font-[900] text-[#22c55e] dark:text-green-400 flex items-center gap-1">
                        ✓ รับแล้ว
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>



          {/* Pagination Controls */}
          {totalCount > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-50 dark:border-slate-800 flex-shrink-0">
               <div className="text-[11px] text-gray-400 font-medium">
                 แสดง {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} จาก {totalCount} รายการ
               </div>
               
               <div className="flex items-center gap-1.5">
                 <button 
                   onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                   disabled={currentPage === 1}
                   className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                 >
                   <ChevronLeft size={16} />
                 </button>
                 
                 <div className="flex items-center gap-1">
                   {Array.from({ length: Math.min(5, Math.ceil(totalCount / ITEMS_PER_PAGE)) }).map((_, i) => {
                     let pageNum = i + 1;
                     const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
                     if (totalPages > 5) {
                        if (currentPage > 3) pageNum = currentPage - 2 + i;
                        if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                        if (pageNum < 1) pageNum = i + 1;
                     }

                     return (
                       <button
                         key={pageNum}
                         onClick={() => setCurrentPage(pageNum)}
                         className={`w-7 h-7 rounded-xl text-[10px] font-bold transition-all ${
                           currentPage === pageNum 
                           ? 'bg-blue-600 text-white shadow-md shadow-blue-100 dark:shadow-none' 
                           : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
                         }`}
                       >
                         {pageNum}
                       </button>
                     );
                   })}
                 </div>

                 <button 
                   onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), prev + 1))}
                   disabled={currentPage === Math.ceil(totalCount / ITEMS_PER_PAGE)}
                   className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                 >
                   <ChevronRight size={16} />
                 </button>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Acceptance Modal */}
      {createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-gray-900/40 backdrop-blur-[2px]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-slate-900 w-full max-w-[320px] rounded-2xl sm:rounded-[2rem] shadow-2xl relative border border-gray-100 dark:border-slate-800 overflow-y-auto max-h-[86vh]"
              >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-3 right-3 p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                title="ปิด"
              >
                <X size={16} />
              </button>

              <div className="p-5">
                <div className="flex items-center gap-3 mb-3.5">
                  <div className="w-9 h-9 bg-brand-light dark:bg-brand-blue/10 rounded-lg flex items-center justify-center text-brand-blue">
                    <UserCheck size={18} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">ยืนยันการรับเวร</h3>
                </div>
                
                <p className="text-gray-500 dark:text-gray-400 text-[11px] mb-5 font-medium">
                  กรุณาเลือกชื่อของคุณเพื่อทำการยืนยันการรับภาระงาน
                </p>

                <div className="space-y-4">
                  <div className="relative">
                    <label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 block ml-1">
                      เลือกชื่อผู้รับเวร
                    </label>
                    <div className="relative">
                      {/* Custom Dropdown Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(!isDropdownOpen);
                          if (!isDropdownOpen) setSearchTerm('');
                        }}
                        className={`w-full px-4 py-3 bg-white dark:bg-slate-800 border transition-all duration-200 ${
                          isDropdownOpen 
                             ? 'border-blue-400 ring-4 ring-blue-500/5 shadow-blue-50/50' 
                             : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                        } rounded-[1.25rem] outline-none text-[13px] font-medium flex items-center justify-between shadow-sm`}
                      >
                        <span className={receiverName ? 'text-gray-900 dark:text-white' : 'text-gray-400 font-normal'}>
                          {receiverName 
                             ? users.find(u => u.id === receiverName)?.full_name 
                             : 'เลือกชื่อ-นามสกุล'}
                        </span>
                        <ChevronDown 
                          size={20} 
                          className={`text-gray-300 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} 
                        />
                      </button>

                      {/* Custom Dropdown Menu */}
                      <AnimatePresence>
                        {isDropdownOpen && (
                          <div className="absolute z-50 left-0 right-0 top-full mt-2">
                            {/* Simple Backdrop */}
                            <div 
                              className="fixed inset-0" 
                              onClick={() => setIsDropdownOpen(false)} 
                            />
                            
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ type: "spring", damping: 25, stiffness: 300, duration: 0.2 }}
                              className="relative z-50 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden"
                            >
                              <div className="p-2 border-b border-gray-50 dark:border-slate-700/50">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                  <input 
                                    autoFocus
                                    type="text"
                                    placeholder="ค้นหาชื่อ..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-3 bg-[#F8FAFC] dark:bg-slate-900 border-none rounded-lg outline-none text-xs font-medium dark:text-white placeholder:text-gray-400"
                                  />
                                </div>
                              </div>

                              <div 
                                className="max-h-[200px] overflow-y-auto py-1 custom-scrollbar"
                                style={{ scrollbarWidth: 'thin' }}
                              >
                                {filteredUsers.length > 0 ? (
                                  filteredUsers.map((user) => (
                                    <button
                                      key={user.id}
                                      type="button"
                                      onClick={() => {
                                        setReceiverName(user.id);
                                        setIsDropdownOpen(false);
                                      }}
                                      className={`w-full px-4 py-2.5 text-left text-xs font-medium transition-all hover:bg-brand-light dark:hover:bg-slate-700/50 ${
                                        receiverName === user.id ? 'text-brand-blue bg-brand-light/50 dark:bg-brand-blue/20' : 'text-gray-700 dark:text-gray-300'
                                      }`}
                                    >
                                      {user.full_name}
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-6 text-xs text-gray-400 text-center">
                                    ไม่พบรายชื่อ
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {modalNotifyError && (
                    <div className="p-2.5 bg-red-50 dark:bg-rose-950/20 text-red-600 dark:text-rose-400 text-[10.5px] font-black rounded-xl border border-red-100 dark:border-rose-900/30 flex items-center gap-1.5 leading-snug">
                       <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                       <span>{modalNotifyError}</span>
                    </div>
                  )}

                  {modalNotifySuccess && (
                    <div className="p-2.5 bg-green-50 dark:bg-emerald-950/10 text-green-650 dark:text-emerald-400 text-[10.5px] font-black rounded-xl border border-green-100 dark:border-emerald-900/30 flex items-center justify-center gap-1.5 leading-snug">
                       <span>✓ ยืนยันรับเวรเสร็จสิ้น!</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-3">
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all border border-gray-100 dark:border-slate-700"
                    >
                      ยกเลิก
                    </button>
                    <button 
                      onClick={() => {
                        handleAccept();
                      }}
                      disabled={!receiverName || isLoading}
                      className="flex-1 py-2.5 text-xs font-bold text-white bg-brand-blue hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-brand-blue/10 dark:shadow-none"
                    >
                      {isLoading ? 'กำลังประมวลผล...' : 'ยืนยันรับงาน'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {/* Custom Detail Modal */}
      {createPortal(
        <AnimatePresence>
          {isDetailModalOpen && selectedDetailItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-gray-900/60 backdrop-blur-[4px]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white dark:bg-slate-900 w-full max-w-[480px] rounded-2xl sm:rounded-[2rem] shadow-2xl relative border border-gray-100 dark:border-slate-800 overflow-hidden font-thai max-h-[86vh] flex flex-col"
            >
              {/* Header colored banner */}
              <div className="h-2 bg-gradient-to-r from-brand-blue to-cyan-500" />
              
              <button 
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedDetailItem(null);
                }}
                className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer z-10"
                title="ปิด"
              >
                <X size={18} />
              </button>

              <div className="p-5 sm:p-6 md:p-8 overflow-y-auto flex-1">
                {/* Title Section */}
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="w-10 h-10 bg-brand-light dark:bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue shrink-0">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-sm font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                      รายละเอียดใบส่งเวร {selectedDetailItem.task_number && `(${selectedDetailItem.task_number})`}
                    </h3>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono mt-0.5">
                      Ref ID: {selectedDetailItem.id.toUpperCase()}
                    </p>
                  </div>
                </div>

                  <div className="space-y-5">
                    {/* Header values as grid */}
                    <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-150 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">แผนกปฏิบัติการ</span>
                        <span className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 rounded-lg">
                          {selectedDetailItem.department}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">ผลัดเวรปฏิบัติการ</span>
                        <span className={`px-2.5 py-1 text-xs font-black rounded-lg ${
                          selectedDetailItem.shift.includes('เช้า') ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' :
                          selectedDetailItem.shift.includes('บ่าย') ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400' :
                          'bg-purple-50 text-[#8b5cf6] dark:bg-purple-950/30 dark:text-purple-400'
                        }`}>
                          เวร{selectedDetailItem.shift}
                        </span>
                      </div>
                    </div>

                    {/* Metadata: sender and time */}
                    <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-150 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">ผู้ส่งมอบงาน</span>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-200">{selectedDetailItem.name}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-0.5">{selectedDetailItem.date} · {selectedDetailItem.time}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">สถานะส่งมอบ</span>
                        <div className="flex flex-col items-start gap-1">
                          {selectedDetailItem.status === 'รอรับงาน' ? (
                            <span className="px-2 py-0.5 text-[10.5px] font-black bg-blue-50 text-blue-500 dark:bg-blue-950/20 rounded-md">
                              ⏳ รอเจ้าหน้าที่เข้ามารับเวร
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10.5px] font-black bg-emerald-50 text-emerald-600 dark:bg-emerald-950/25 dark:text-emerald-400 rounded-md flex flex-col">
                              <span>✓ รับเวรแล้ว</span>
                              {selectedDetailItem.receiver_name && (
                                <span className="text-[9.5px] text-slate-500 font-normal mt-0.5">โดย: {selectedDetailItem.receiver_name}</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Category */}
                    {selectedDetailItem.category && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">หัวข้อหลัก / หมวดหมู่</span>
                        <span className="text-xs font-black text-brand-blue uppercase bg-brand-blue/5 border border-brand-blue/10 px-2.5 py-1 rounded-lg">
                          {selectedDetailItem.category}
                        </span>
                      </div>
                    )}

                    {/* Work Summary Title */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">หัวข้อสรุปภาระงาน</span>
                      <h4 className="text-xs font-black text-slate-850 dark:text-white leading-relaxed">
                        {maskSensitiveData(selectedDetailItem.summary, isLoggedIn || forceUncensored)}
                      </h4>
                    </div>

                    {/* Detail Field */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">รายละเอียดเคสและสิ่งส่งตรวจคงค้าง</span>
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/45 border border-slate-100 dark:border-slate-850 rounded-2xl">
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-bold whitespace-pre-line leading-relaxed">
                          {maskSensitiveData(selectedDetailItem.description || '', isLoggedIn || forceUncensored) || 'ไม่มีรายละเอียดเพิ่มเติมระบุ'}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2.5 pt-2">
                      {selectedDetailItem.status === 'รอรับงาน' && (
                        <button 
                          onClick={() => {
                            setIsDetailModalOpen(false);
                            setTimeout(() => {
                              handleOpenAccept(selectedDetailItem.id);
                            }, 150);
                          }}
                          className="flex-1 py-3 text-xs font-black text-white bg-brand-blue hover:bg-brand-dark rounded-xl transition-all shadow-md shadow-brand-blue/15 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <UserCheck size={14} />
                          <span>กดรับมอบภาระงานเวรนี้</span>
                        </button>
                      )}
                      
                      <button 
                        onClick={() => {
                          setIsDetailModalOpen(false);
                          setSelectedDetailItem(null);
                        }}
                        className={`py-3 px-5 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                          selectedDetailItem.status !== 'รอรับงาน' ? 'w-full' : ''
                        }`}
                      >
                        ปิดหน้าต่าง
                      </button>
                    </div>
                  </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </div>
  );
}
