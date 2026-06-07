import React, { useState, useEffect } from 'react';
import liff from '@line/liff';
import { supabase } from '../lib/supabase';
import { getActiveConfig } from '../config';
import { 
  ChevronLeft, 
  Check, 
  ShieldCheck, 
  Calendar as CalendarIcon, 
  MapPin, 
  User, 
  Clock, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Share2,
  Info,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { maskSensitiveData } from '../lib/maskUtils';
import { writeLog } from '../lib/logger';

interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

interface BatchTask {
  id: string;
  task_number: string;
  title: string;
  category: string;
  description: string;
  status: string;
  receiver_id: string;
  receiver_name?: string;
  accepted_at?: string;
}

interface LineLiffAcceptProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function LineLiffAccept({ isDarkMode, onToggleDarkMode }: LineLiffAcceptProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liffProfile, setLiffProfile] = useState<LiffProfile | null>(null);
  const [isEmulated, setIsEmulated] = useState(false);
  
  // Emulation Name Editor
  const [mockProfileName, setMockProfileName] = useState(() => {
    const saved = localStorage.getItem('sangkha_handover_local_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        return u.full_name || "สมศักดิ์ มีสุข";
      } catch (e) {}
    }
    return "สมศักดิ์ มีสุข";
  });

  const [showNameEditor, setShowNameEditor] = useState(false);

  // Task & Handover data
  const [targetId, setTargetId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [batchTasks, setBatchTasks] = useState<BatchTask[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [targetHandover, setTargetHandover] = useState<any | null>(null);
  
  // App state
  const [isSuccess, setIsSuccess] = useState(false);
  const [acceptedTasksList, setAcceptedTasksList] = useState<BatchTask[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [recentHandovers, setRecentHandovers] = useState<any[]>([]);

  // User list for LIFF Login
  const [usersList, setUsersList] = useState<{ id: string; full_name: string }[]>([]);
  // Logged-in state for LIFF
  const [liffLoggedInUser, setLiffLoggedInUser] = useState<{ id: string; full_name: string } | null>(() => {
    const saved = localStorage.getItem('liff_logged_in_user');
    const lastActiveStr = localStorage.getItem('liff_session_last_active');
    if (saved) {
      const now = Date.now();
      const timeoutLimit = 15 * 60 * 1000; // 15 minutes
      if (lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10);
        if (now - lastActive > timeoutLimit) {
          localStorage.removeItem('liff_logged_in_user');
          localStorage.removeItem('liff_session_last_active');
          return null;
        }
      }
      try {
        localStorage.setItem('liff_session_last_active', String(now));
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Login form status
  const [loginReceiverId, setLoginReceiverId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false);
  const [loginSearchTerm, setLoginSearchTerm] = useState('');

  const filteredLoginUsers = usersList.filter(u =>
    u.full_name.toLowerCase().includes(loginSearchTerm.toLowerCase())
  );

  const handleLiffLogout = () => {
    setLiffLoggedInUser(null);
    localStorage.removeItem('liff_logged_in_user');
    localStorage.removeItem('liff_session_last_active');
    setLoginReceiverId('');
    setLoginPassword('');
    setLoginSearchTerm('');
  };

  const handleLiffLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginReceiverId) {
      setLoginError('กรุณาเลือกผู้ใช้งาน');
      return;
    }
    if (!loginPassword) {
      setLoginError('กรุณาระบุรหัสผ่าน');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      // Fetch user record
      const { data: userRecord, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', loginReceiverId)
        .single();

      if (fetchError || !userRecord) {
        throw new Error('ไม่พบข้อมูลผู้ใช้งาน');
      }

      const isHashed = userRecord.sender_pass?.startsWith('$') || (userRecord.sender_pass?.length || 0) > 32;
      
      // Attempt auth
      if (userRecord.email && isHashed) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: userRecord.email,
          password: loginPassword
        });
        
        if (authError) {
          const { data: isValid, error: rpcError } = await supabase.rpc('verify_user_password', {
            p_user_id: userRecord.id,
            p_password: loginPassword
          });
          if (rpcError || !isValid) {
            throw new Error('รหัสผ่านไม่ถูกต้อง');
          }
        }
      } else if (isHashed) {
        const { data: isValid, error: rpcError } = await supabase.rpc('verify_user_password', {
          p_user_id: userRecord.id,
          p_password: loginPassword
        });
        if (rpcError || !isValid) {
          throw new Error('รหัสผ่านไม่ถูกต้อง');
        }
      } else {
        if (userRecord.sender_pass !== loginPassword) {
          throw new Error('รหัสผ่านไม่ถูกต้อง');
        }
      }

      // Success
      const loggedIn = { id: userRecord.id, full_name: userRecord.full_name };
      setLiffLoggedInUser(loggedIn);
      localStorage.setItem('liff_logged_in_user', JSON.stringify(loggedIn));
      localStorage.setItem('liff_session_last_active', String(Date.now()));
      setIsLoginModalOpen(false);
      setLoginError(null);
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || 'รหัสผ่านไม่ถูกต้อง');
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    // Helper to extract parameters from URL query, hash, or LINE LIFF storage
    const getLiffParam = (key: string): string | null => {
      // 1. Try URL search params
      const searchParams = new URLSearchParams(window.location.search);
      let val = searchParams.get(key);
      if (val) return val;

      // 1.2 Check "liff.state" in URL search params (very common for LINE redirect)
      const liffState = searchParams.get('liff.state');
      if (liffState) {
        // liffState can pack the query string, e.g. "/liff?handover_id=xxxx" or "/?handover_id=xxxx"
        const queryIndex = liffState.indexOf('?');
        const queryStr = queryIndex !== -1 ? liffState.substring(queryIndex + 1) : liffState;
        const stateParams = new URLSearchParams(queryStr);
        const stateVal = stateParams.get(key);
        if (stateVal) return stateVal;
      }

      // 2. Try window hash parsing (common for SPAs inside LIFF Webviews)
      if (window.location.hash) {
        const hashPart = window.location.hash.split('?')[1] || window.location.hash.split('#')[1] || '';
        const hashParams = new URLSearchParams(hashPart);
        val = hashParams.get(key);
        if (val) return val;

        const hashState = hashParams.get('liff.state');
        if (hashState) {
          const queryIndex = hashState.indexOf('?');
          const queryStr = queryIndex !== -1 ? hashState.substring(queryIndex + 1) : hashState;
          const hashStateParams = new URLSearchParams(queryStr);
          const hashStateVal = hashStateParams.get(key);
          if (hashStateVal) return hashStateVal;
        }
      }

      // 3. Try LINE LIFF getSearch helper (if loaded)
      try {
        const anyLiff = liff as any;
        if (anyLiff && typeof anyLiff.getSearch === 'function') {
          const liffSearch = anyLiff.getSearch();
          if (liffSearch) {
            const liffParams = new URLSearchParams(liffSearch);
            val = liffParams.get(key);
            if (val) return val;

            const liffSearchState = liffParams.get('liff.state');
            if (liffSearchState) {
              const queryIndex = liffSearchState.indexOf('?');
              const queryStr = queryIndex !== -1 ? liffSearchState.substring(queryIndex + 1) : liffSearchState;
              const liffStateParams = new URLSearchParams(queryStr);
              const liffStateVal = liffStateParams.get(key);
              if (liffStateVal) return liffStateVal;
            }
          }
        }
      } catch (e) {}

      return null;
    };

    console.log("[LIFF_Accept] Current href:", window.location.href);
    console.log("[LIFF_Accept] Current search:", window.location.search);
    console.log("[LIFF_Accept] Current hash:", window.location.hash);

    // 1. Get handover ID from URL params/hash/LIFF
    const id = getLiffParam('handover_id') || getLiffParam('id');
    console.log("[LIFF_Accept] Extracted handover ID:", id);
    setTargetId(id);

    // 2. Initialize LIFF SDK (Load dynamically based on active platform - Google AI Studio vs Git Page vs Cloudflare)
    const activeConfig = getActiveConfig();
    const liffId = activeConfig.liffId;
    
    liff.init({ liffId })
      .then(() => {
        // After LIFF SDK initializes, attempt parameter fallback again in case liff.getSearch succeeded
        const secondAttemptId = getLiffParam('handover_id') || getLiffParam('id');
        if (secondAttemptId) {
          setTargetId(secondAttemptId);
        }

        if (liff.isLoggedIn()) {
          liff.getProfile()
            .then(profile => {
              setLiffProfile({
                userId: profile.userId,
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl
              });
            })
            .catch(profileErr => {
              console.warn("Failed to get LINE profile, falling back to emulation profile", profileErr);
              setIsEmulated(true);
            });
        } else {
          // If in LINE client, trigger login. Otherwise let browser test in Emulated mode
          if (liff.isInClient()) {
            liff.login();
          } else {
            console.log("Not logged in and not in LINE Client. Emulating...");
            setIsEmulated(true);
          }
        }
      })
      .catch(err => {
        console.warn("LINE LIFF init failed (safely continuing in review/emulation mode):", err);
        setIsEmulated(true);
      });
  }, []);

  // Track session timer & user activity for the 15-minute session timeout
  useEffect(() => {
    if (!liffLoggedInUser) return;

    const resetTimer = () => {
      localStorage.setItem('liff_session_last_active', String(Date.now()));
    };

    // Listeners to refresh session expiration on interaction
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    // Periodic check interval (every 10 seconds)
    const intervalId = setInterval(() => {
      const saved = localStorage.getItem('liff_logged_in_user');
      const lastActiveStr = localStorage.getItem('liff_session_last_active');
      if (saved && lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10);
        const now = Date.now();
        const timeoutLimit = 15 * 60 * 1000; // 15 minutes
        if (now - lastActive > timeoutLimit) {
          console.warn("LIFF session timed out due to 15-minute inactivity");
          handleLiffLogout();
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      clearInterval(intervalId);
    };
  }, [liffLoggedInUser]);

  // Fetch handover tasks
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // a. Fetch all users for name-mapping
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name');
        
        const m: Record<string, string> = {};
        if (usersData) {
          usersData.forEach(u => {
            m[u.id] = u.full_name;
          });
          setUsersList(usersData as { id: string; full_name: string }[]);
        }
        setUsersMap(m);

        if (!targetId) {
          console.log("[LIFF_Accept] No target ID, loading recent handovers for portal view");
          // No specific handover ID, load the 15 most recent handovers
          const { data: recentItems, error: recentError } = await supabase
            .from('handovers')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(15);

          if (recentError) throw recentError;
          setRecentHandovers(recentItems || []);
          setIsLoading(false);
          return;
        }

        // b. Fetch target handover
        const { data: targetItem, error: targetError } = await supabase
          .from('handovers')
          .select('*')
          .eq('id', targetId)
          .single();

        if (targetError || !targetItem) {
          throw new Error("ไม่พบรายการส่งเวรนี้ หรือรูปแบบไอดีไม่ถูกต้อง");
        }
        setTargetHandover(targetItem);

        // c. Fetch batch: standard insert modern groups items via near identical created_at
        const targetTime = new Date(targetItem.created_at).getTime();
        const lowerBound = new Date(targetTime - 5000).toISOString();
        const upperBound = new Date(targetTime + 5000).toISOString();

        const { data: batchData, error: batchError } = await supabase
          .from('handovers')
          .select('*')
          .eq('sender_id', targetItem.sender_id)
          .eq('division', targetItem.division)
          .gte('created_at', lowerBound)
          .lte('created_at', upperBound)
          .order('created_at', { ascending: true });

        if (batchError) throw batchError;

        const formattedTasks: BatchTask[] = (batchData || []).map((item: any) => {
          let parsedShift = item.shift || '';
          let parsedCategory = '';

          const catField = item.category || '';
          if (!parsedShift && catField.includes('|')) {
            const [s, c] = catField.split('|');
            parsedShift = s;
            parsedCategory = c;
          } else if (!parsedShift) {
            parsedShift = catField;
            parsedCategory = '';
          } else {
            parsedCategory = catField;
          }

          return {
            id: item.id,
            task_number: item.task_number || `LAB-${item.id.substring(0, 4).toUpperCase()}`,
            title: item.title,
            category: parsedCategory || 'งานทั่วไป',
            description: item.description || '',
            status: item.status,
            receiver_id: item.receiver_id || '',
            receiver_name: m[item.receiver_id] || item.receiver_line_name || item.receiver_id || '',
            accepted_at: item.accepted_at
          };
        });

        setBatchTasks(formattedTasks);
      } catch (err: any) {
        console.error("Error loading LIFF details:", err);
        setError(err.message || "เกิดข้อขัดข้องในการเรียกข้อมูลจากระบบฐานข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [targetId]);

  const toggleTaskSelection = (id: string, isTaken: boolean) => {
    if (isTaken || isSubmitting) return;

    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllPending = () => {
    if (isSubmitting) return;
    const pendingTasks = batchTasks.filter(t => t.status === 'Pending');
    const pendingIds = pendingTasks.map(t => t.id);
    
    const allChecked = pendingIds.length > 0 && pendingIds.every(id => selectedTaskIds.has(id));
    
    if (allChecked) {
      setSelectedTaskIds(prev => {
        const next = new Set(prev);
        pendingIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedTaskIds(prev => {
        const next = new Set(prev);
        pendingIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleConfirmAccept = async () => {
    if (isSubmitting) return;

    const currentUserName = liffLoggedInUser?.full_name || '';
    if (!currentUserName.trim()) {
      setIsLoginModalOpen(true);
      return;
    }

    if (selectedTaskIds.size === 0) {
      alert("กรุณาเลือกงานที่ต้องการรับก่อน");
      return;
    }

    setIsSubmitting(true);
    try {
      // Re-verify task status to prevent double-acceptance/overwrite
      const { data: latestTasks, error: checkErr } = await supabase
        .from('handovers')
        .select('id, status, receiver_line_name, title')
        .in('id', Array.from(selectedTaskIds));

      if (checkErr) {
        throw new Error("ไม่สามารถเชื่อมต่อฐานข้อมูลเพื่อตรวจสอบสถานะล่าสุดได้");
      }

      const alreadyAcceptedList = latestTasks?.filter(t => t.status !== 'Pending') || [];
      if (alreadyAcceptedList.length > 0) {
        const descriptions = alreadyAcceptedList.map(t => {
          const original = batchTasks.find(bt => bt.id === t.id);
          const tTitle = original ? original.title : t.title;
          const acceptor = t.receiver_line_name || 'เจ้าหน้าที่ท่านอื่น';
          return `- "${tTitle}" ถูกรับไปแล้วโดยคุณ ${acceptor}`;
        }).join('\n');
        throw new Error(`ขออภัย งานที่คุณเลือกบางรายการได้รับการตอบรับไปแล้วก่อนหน้านี้:\n${descriptions}\n\nกรุณารีเฟรชโปรแกรมเพื่ออัปเดตข้อมูล`);
      }

      // Use logged in user ID directly
      const receiverId = liffLoggedInUser?.id || null;

      const nowStr = new Date().toISOString();
      const updatedList: BatchTask[] = [];

      // Update in Supabase via secure RPC to bypass RLS permission denied issues on clients
      for (const id of Array.from(selectedTaskIds)) {
        const { error: updateErr } = await supabase
          .rpc('accept_handover_from_liff', {
            p_handover_id: id,
            p_receiver_id: receiverId,
            p_receiver_line_name: currentUserName
          });

        if (updateErr) throw updateErr;

        const t = batchTasks.find(item => item.id === id);
        if (t) {
          updatedList.push({
            ...t,
            status: 'Accepted',
            receiver_id: receiverId,
            receiver_name: currentUserName,
            accepted_at: nowStr
          });
        }
      }

      setAcceptedTasksList(updatedList);

      // Trigger background LINE notifications update via edge function
      const activeConfig = getActiveConfig();
      const supabaseUrl = activeConfig.supabaseUrl;
      const supabaseAnonKey = activeConfig.supabaseAnonKey;
      const functionUrl = `${supabaseUrl}/functions/v1/handle-new-handover`;

      const notificationPayload = {
        action: 'task_accepted',
        handover_id: targetId,
        accepted_by: currentUserName,
        channel: isEmulated ? 'WEB' : 'LINE',
        accepted_task_ids: Array.from(selectedTaskIds)
      };

      fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify(notificationPayload)
      })
      .then(res => res.json())
      .then(resJson => console.log('✅ LINE Update Notification triggered successfully:', resJson))
      .catch(notifyErr => console.warn('❌ Failed to trigger LINE notification update:', notifyErr));

      // Successfully logged
      await writeLog('INFO', 'LINE_LIFF_ACCEPT', `เจ้าหน้าที่ ${currentUserName} ร่วมรับงานในหมวดหมู่ผ่าน LIFF สำเร็จ`, {
        handoverId: targetId,
        acceptedCount: selectedTaskIds.size,
        acceptedIds: Array.from(selectedTaskIds),
        channel: isEmulated ? 'EMULATOR_WEB' : 'LINE_LIFF'
      });

      setIsSuccess(true);
    } catch (err: any) {
      console.error("Error accepting tasks:", err);
      alert("เกิดข้อผิดพลาดในการรับงาน: " + (err.message || err));
      writeLog('ERROR', 'LINE_LIFF_ACCEPT', `เกิดข้อขัดข้องในการประมวลผลรับงานผ่าน LIFF สำหรับ ${currentUserName}`, { error: err.message || err });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseLiff = () => {
    try {
      if (liff.isInClient()) {
        liff.closeWindow();
      } else {
        // Go to public home page if tested on web browser
        window.location.href = '/';
      }
    } catch (e) {
      window.location.href = '/';
    }
  };

  const renderProfileBanner = (userName: string) => {
    if (liffLoggedInUser) {
      return (
        <div className="bg-gradient-to-r from-[#EFF6FF] to-[#DBEAFE] border-b border-[#BFDBFE] px-5 py-3 flex items-center gap-3 font-thai">
          <div className="w-9 h-9 rounded-full bg-[#2B8BE8] flex items-center justify-center font-bold text-white text-xs shrink-0">
            {getAvatarLetter(liffLoggedInUser.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 justify-between">
              <span className="text-[13px] font-extrabold text-[#1E40AF] truncate">
                {liffLoggedInUser.full_name}
              </span>
              <button 
                onClick={handleLiffLogout}
                className="text-[9px] bg-red-50 hover:bg-red-100 text-red-650 px-2 py-0.5 rounded-lg font-bold border border-red-200/30 shrink-0"
              >
                ออกจากระบบ
              </button>
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
              <ShieldCheck size={11} className="text-emerald-500 shrink-0" />
              <span>ยืนยันตัวตนในระบบเรียบร้อยแล้ว</span>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-amber-50/70 border-b border-amber-200 px-5 py-3 flex items-center gap-3 font-thai justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center font-black text-amber-800 text-sm shrink-0 animate-pulse">
              ?
            </div>
            <div className="min-w-0 font-thai">
              <div className="text-[12.5px] font-extrabold text-[#1E40AF]">
                ยังไม่ได้ยืนยันตัวตนกลุ่มงาน
              </div>
              <div className="text-[10px] text-amber-600 font-semibold leading-none mt-0.5">
                กรุณาเข้าสู่ระบบกลุ่มงานก่อนกดรับงาน
              </div>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => {
              setLoginError(null);
              setIsLoginModalOpen(true);
            }}
            className="text-[11px] bg-[#2B8BE8] hover:bg-[#1E6FC7] text-white px-3 py-1.5 rounded-xl font-bold border-none shrink-0 cursor-pointer shadow-sm active:scale-95 transition-all font-thai"
          >
            เข้าสู่ระบบกลุ่มงาน
          </button>
        </div>
      );
    }
  };

  const renderLoginModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col relative max-h-[90vh]">
        
        {/* Close Button */}
        <button 
          onClick={() => {
            setIsLoginModalOpen(false);
            setLoginError(null);
          }}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:bg-slate-100 hover:text-gray-600 transition-colors z-20"
          type="button"
        >
          <X size={18} />
        </button>

        {/* Top visual banner */}
        <div className="bg-[#2B8BE8] text-white px-5 py-6 text-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-200/10 rounded-full blur-xl" />
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-2 border border-white/20 shadow-inner">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <h3 className="text-base font-black tracking-tight font-thai">เข้าสู่ระบบรับเวร LIFF</h3>
          <p className="text-[10px] text-white/80 font-medium font-thai">กลุ่มงานเทคนิคการแพทย์ สังขะ</p>
        </div>

        {/* Login form body */}
        <form onSubmit={handleLiffLogin} className="flex-1 px-5 py-5 overflow-y-auto space-y-4">
          <div className="space-y-4">
            
            {/* Select User Dropdown */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-widest block ml-1 font-thai">
                เลือกรายชื่อเจ้าหน้าที่
              </label>
              
              <div className="relative font-thai">
                <button
                  type="button"
                  onClick={() => setIsLoginDropdownOpen(!isLoginDropdownOpen)}
                  className="w-full h-11 px-3.5 bg-[#F8FAFC] border border-gray-150 rounded-2xl outline-none text-[12.5px] font-bold text-left flex items-center justify-between shadow-sm min-h-[44px]"
                >
                  <span className={loginReceiverId ? 'text-slate-800' : 'text-slate-400 font-normal'}>
                    {loginReceiverId ? (usersList.find(u => u.id === loginReceiverId)?.full_name) : 'เลือกชื่อของคุณ...'}
                  </span>
                  <span className="text-gray-400 text-xs">▼</span>
                </button>

                {/* Dropdown list */}
                {isLoginDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-gray-150 rounded-2xl shadow-2xl overflow-hidden max-h-[180px] w-full">
                    <div className="p-1.5 border-b border-gray-50 bg-slate-50">
                      <input
                        type="text"
                        placeholder="ค้นชื่อ..."
                        value={loginSearchTerm}
                        onChange={(e) => setLoginSearchTerm(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-gray-100 rounded-xl outline-none text-xs font-semibold placeholder:text-gray-400"
                      />
                    </div>

                    <div className="max-h-[130px] overflow-y-auto py-1 font-thai">
                      {filteredLoginUsers.length > 0 ? (
                        filteredLoginUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setLoginReceiverId(user.id);
                              setIsLoginDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-xs font-semibold hover:bg-sky-50 transition-colors block ${
                              loginReceiverId === user.id ? 'text-blue-600 bg-sky-50/50' : 'text-slate-700'
                            }`}
                          >
                            {user.full_name}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-xs text-gray-400 text-center">
                          ไม่พบรายชื่อ
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-widest block ml-1 font-thai font-sans">
                รหัสผ่าน
              </label>
              <input
                type="password"
                placeholder="ใส่รหัสผ่านของคุณ"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 h-11 bg-[#F8FAFC] border border-gray-150 rounded-2xl outline-none text-[12.5px] font-[900] shadow-sm tracking-widest placeholder:tracking-normal placeholder:font-normal font-thai"
              />
            </div>

            {loginError && (
              <div className="p-2.5 bg-red-50 text-red-650 text-[11px] font-bold rounded-xl border border-red-100 flex items-center gap-1.5 leading-snug font-thai">
                 <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                 <span>{loginError}</span>
              </div>
            )}
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isLoggingIn || !loginReceiverId || !loginPassword}
              className="w-full h-11 bg-[#2B8BE8] hover:bg-[#1E6FC7] disabled:bg-[#E5E7EB] disabled:text-[#6B7280] text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/5 cursor-pointer text-xs font-thai"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                'เข้าสู่ระบบกลุ่มงาน'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLoginModalOpen(false);
                setLoginError(null);
              }}
              className="w-full h-10 bg-slate-50 text-slate-600 font-bold rounded-xl text-xs flex items-center justify-center border-none cursor-pointer font-thai"
            >
              ยกเลิก
            </button>
          </div>
        </form>

      </div>
    </div>
  );

  const senderName = targetHandover ? (usersMap[targetHandover.sender_id] || targetHandover.sender_name || 'ไม่ระบุ') : 'กำลังโหลด...';
  const getAvatarLetter = (name: string) => name ? name.trim().slice(0, 1) : '?';

  if (!targetId) {
    const filteredHandovers = dateFilter
      ? recentHandovers.filter(item => item.handover_date === dateFilter)
      : recentHandovers;
    const pendingRecent = filteredHandovers.filter(item => item.status === 'Pending');
    const acceptedRecent = filteredHandovers.filter(item => item.status !== 'Pending');
    const currentUserName = liffProfile?.displayName || mockProfileName;

    const handleRefresh = async () => {
      try {
        setIsLoading(true);
        const { data, error: err } = await supabase
          .from('handovers')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(15);
        if (err) throw err;
        setRecentHandovers(data || []);
      } catch (e: any) {
        console.error("Refresh recent error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-[#DAEAF7] flex items-start justify-center p-0 sm:py-8 sm:px-4 font-sans text-[#1A1A2E]">
        <div className="w-full max-w-md bg-white sm:rounded-[2.5rem] shadow-2xl overflow-hidden min-h-screen sm:min-h-[790px] flex flex-col relative border border-transparent sm:border-gray-100 animate-fadeIn">
          
          {/* Header */}
          <div className="bg-white border-b border-[#E5E7EB] px-5 py-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#2B8BE8]">
                <Clock size={16} />
              </div>
              <div>
                <h1 className="text-[15px] font-extrabold leading-tight">พอร์ทัลรับเวร LINE LIFF</h1>
                <p className="text-[11px] text-[#6B7280] font-medium leading-none mt-0.5">กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลสังขะ</p>
              </div>
            </div>
            
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg text-gray-500 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw size={17} className={`${isLoading ? 'animate-spin text-[#2B8BE8]' : ''}`} />
            </button>
          </div>

          {/* Profile Banner */}
          {renderProfileBanner(currentUserName)}

          {/* Main List Area */}
          {liffLoggedInUser ? (
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              
              {/* Filter Control */}
              <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-2">
                <input
                  type="date"
                  className="flex-1 text-xs font-bold bg-slate-50 p-2 rounded-lg border-none text-slate-700 outline-none"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setDateFilter(new Date().toISOString().split('T')[0])}
                  className="text-[10px] font-bold bg-[#2B8BE8] text-white px-3 py-2 rounded-lg hover:bg-[#1E6FC7] transition-all"
                >
                  วันนี้
                </button>
              </div>

              {/* 1. Pending Section */}
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-red-600">งานรอส่งมอบ-รับเวร ({pendingRecent.length})</h2>
                </div>

                {pendingRecent.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center text-xs text-gray-500 font-medium">
                    ไม่มีงานรอส่งมอบในขณะนี้ 🎉 ทุกรายการถูกรับทั้งหมดแล้ว
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pendingRecent.map((item) => {
                      const originalSender = usersMap[item.sender_id] || item.sender_name || 'เจ้าหน้าที่กลุ่มงาน';
                      const dateFormatted = new Date(item.created_at).toLocaleDateString('th-TH', { 
                        day: '2-digit', 
                        month: '2-digit',
                        year: '2-digit'
                      });
                      const timeFormatted = new Date(item.created_at).toLocaleTimeString('th-TH', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });

                      return (
                        <button
                          key={item.id}
                          onClick={() => setTargetId(item.id)}
                          className="w-full text-left bg-white border border-red-100 hover:border-[#2B8BE8] p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3 group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase">
                                {item.task_number || 'LAB-TASK'}
                              </span>
                              <span className="bg-[#FEF3C7] text-[#D97706] px-2 py-0.5 rounded-md text-[10px] font-bold">
                                เวร{item.shift || 'ไม่ระบุ'}
                              </span>
                            </div>
                            
                            <h3 className="font-bold text-[13.5px] leading-snug text-slate-800 truncate mb-1">
                              {maskSensitiveData(item.title, !!liffLoggedInUser)}
                            </h3>
                            
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#6B7280] font-medium">
                              <span className="text-blue-600 font-semibold">{item.division}</span>
                              <span>•</span>
                              <span>โดย: {originalSender}</span>
                              <span>•</span>
                              <span className="text-slate-400">{dateFormatted} {timeFormatted} น.</span>
                            </div>
                          </div>

                          <div className="w-8 h-8 rounded-full bg-red-50 group-hover:bg-blue-50 text-red-500 group-hover:text-[#2B8BE8] flex items-center justify-center shrink-0 transition-colors">
                            <ChevronRight size={16} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Recently Done Section */}
              <div className="pt-2">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600">รายการส่งเวรล่าสุด ({acceptedRecent.length})</h2>
                </div>

                {acceptedRecent.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center text-xs text-gray-400 font-medium">
                    ไม่มีประวัติงานช่วงเร็วๆ นี้
                  </div>
                ) : (
                  <div className="space-y-2">
                    {acceptedRecent.slice(0, 8).map((item) => {
                      const originalSender = usersMap[item.sender_id] || item.sender_name || 'เจ้าหน้าที่กลุ่มงาน';
                      const originalReceiver = usersMap[item.receiver_id] || item.receiver_line_name || item.receiver_id || 'ผู้รับเวรแล้ว';

                      return (
                        <button
                          key={item.id}
                          onClick={() => setTargetId(item.id)}
                          className="w-full text-left bg-slate-50/70 hover:bg-white border border-slate-105 hover:border-slate-300 p-3 rounded-xl transition-all flex items-center justify-between gap-3 group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[9.5px] font-bold">
                                {item.task_number || 'LAB-DONE'}
                              </span>
                              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-0.5">
                                <Check size={9} /> รับเวรแล้ว
                              </span>
                            </div>
                            
                            <h4 className="font-bold text-[12.5px] leading-snug text-slate-700 truncate mb-0.5">
                              {maskSensitiveData(item.title, !!liffLoggedInUser)}
                            </h4>
                            
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-[#8C93A3] font-medium">
                              <span className="text-slate-600 font-semibold">{item.division}</span>
                              <span>•</span>
                              <span>ผู้รับเวร: {originalReceiver}</span>
                            </div>
                          </div>

                          <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-slate-200 text-slate-400 group-hover:text-slate-600 flex items-center justify-center shrink-0 transition-colors">
                            <ChevronRight size={14} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-xs font-bold text-gray-500 flex-col gap-3">
              <ShieldCheck size={48} className="text-slate-300" />
              กรุณาเข้าสู่ระบบกลุ่มงาน เพื่อดูรายการส่งเวร
            </div>
          )}

          {/* Footer Navigation */}
          <div className="bg-white border-t border-[#E5E7EB] p-4">
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full h-11 bg-[#F0F6FC] text-[#1A1A2E] font-bold rounded-xl hover:bg-slate-100 transition-colors text-xs flex items-center justify-center gap-2"
            >
              <ChevronLeft size={14} /> กลับสู่หน้าจอสมาร์ทบอร์ดหลัก
            </button>
          </div>

        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#DAEAF7] flex flex-col items-center justify-center p-4 font-sans text-[#1A1A2E]">
        <Loader2 size={36} className="text-[#2B8BE8] animate-spin mb-3" />
        <p className="text-sm font-semibold text-[#6B7280]">กำลังโหลดข้อมูลรับเวร...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#DAEAF7] flex items-center justify-center p-4 font-sans text-[#1A1A2E]">
        <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center shadow-lg">
          <AlertCircle size={44} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold">ไม่พบข้อมูลการส่งเวร</h2>
          <p className="text-xs text-[#6B7280] mt-2 mb-6 leading-relaxed">
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full h-11 bg-[#2B8BE8] text-white font-bold rounded-xl hover:bg-[#1E6FC7] transition-all mb-2"
          >
            ลองใหม่อีกครั้ง
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full h-10 border border-gray-200 text-[#6B7280] rounded-xl text-xs"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }


  const pendingCount = batchTasks.filter(item => item.status === 'Pending').length;
  const currentUserName = liffLoggedInUser?.full_name || '';

  return (
    <div className="min-h-screen bg-[#DAEAF7] flex items-start justify-center p-0 sm:py-8 sm:px-4 font-sans text-[#1A1A2E]">
      <div className="w-full max-w-md bg-white sm:rounded-[2.5rem] shadow-2xl overflow-hidden min-h-screen sm:min-h-[790px] flex flex-col relative border border-transparent sm:border-gray-100">
        
        {/* Main Content View */}
        {!isSuccess ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-[#E5E7EB] px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
              <button 
                onClick={() => window.location.href = '/'}
                className="w-8 h-8 rounded-lg bg-[#F0F6FC] flex items-center justify-center text-[#1A1A2E] hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-extrabold flex items-center gap-1.5 leading-tight">
                  เลือกรับงาน
                </div>
                <div className="text-[11.5px] text-[#6B7280] font-medium leading-none mt-1">
                  {batchTasks[0]?.task_number || 'LAB-NEW'} · เวร{targetHandover?.shift || 'ไม่ระบุ'}
                </div>
              </div>
              <div className="px-3 py-1 bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] rounded-full text-[11px] font-bold">
                รอรับ {pendingCount}
              </div>
            </div>

            {/* Profile banner */}
            {renderProfileBanner(currentUserName)}

            {/* Name editor popup block */}
            {isEmulated && showNameEditor && (
              <div className="bg-blue-50/50 border-b border-[#BFDBFE] px-5 py-3.5 animate-fadeIn">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  ชื่อจำลองของคุณสำหรับการทดสอบ
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={mockProfileName}
                    onChange={(e) => setMockProfileName(e.target.value)}
                    placeholder="พิมพ์ชื่อคุณ..."
                    className="flex-1 px-3 py-2 text-xs border border-blue-200 rounded-xl outline-none bg-white font-medium"
                  />
                  <button 
                    onClick={() => setShowNameEditor(false)}
                    className="px-4 py-2 bg-[#2B8BE8] text-white rounded-xl text-xs font-bold"
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            )}



            {/* Meta Band */}
            <div className="bg-[#F0F6FC] border-b border-[#E5E7EB] px-5 py-3 flex gap-4 items-center">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider leading-none">แผนก</span>
                <span className="text-[12.5px] font-extrabold text-[#1A1A2E] mt-1">{targetHandover?.division || 'แลปกลาง'}</span>
              </div>
              <div className="w-[1px] h-6 bg-[#E5E7EB]" />
              <div className="flex flex-col">
                <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider leading-none">ผู้ส่ง</span>
                <span className="text-[12.5px] font-extrabold text-[#1A1A2E] mt-1">{senderName}</span>
              </div>
              <div className="w-[1px] h-6 bg-[#E5E7EB]" />
              <div className="flex flex-col">
                <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider leading-none">เวลาส่ง</span>
                <span className="text-[12.5px] font-extrabold text-[#1A1A2E] mt-1">
                  {targetHandover?.created_at ? new Date(targetHandover.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '13:30'} น.
                </span>
              </div>
            </div>

            {/* Task list body */}
            {liffLoggedInUser ? (
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                {batchTasks.map((task) => {
                  const isTaken = task.status !== 'Pending';
                  const isCurrentlySelected = selectedTaskIds.has(task.id);

                  return (
                    <div 
                      key={task.id}
                      onClick={() => toggleTaskSelection(task.id, isTaken)}
                      className={`border rounded-2xl p-4 flex gap-3 items-start transition-all cursor-pointer relative ${
                        isTaken 
                          ? 'border-[#16A34A]/20 bg-[#FAFFFE] opacity-75' 
                          : isCurrentlySelected 
                          ? 'border-[#2B8BE8] bg-[#EFF6FF] ring-2 ring-[#2B8BE8]/10' 
                          : 'border-[#E5E7EB] bg-white hover:border-gray-350'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        isTaken 
                          ? 'bg-[#16A34A] border-[#16A34A] text-white' 
                          : isCurrentlySelected 
                          ? 'bg-[#2B8BE8] border-[#2B8BE8] text-white' 
                          : 'border-[#E5E7EB] bg-white'
                      }`}>
                        {(isCurrentlySelected || isTaken) && <Check size={12} strokeWidth={3} />}
                      </div>

                      {/* Task Info */}
                      <div className="flex-1 min-w-0 pr-12">
                        <h4 className="text-[13.5px] font-extrabold text-[#1A1A2E] leading-snug">
                          {maskSensitiveData(task.title, !!liffLoggedInUser)}
                        </h4>
                        <div className="inline-flex items-center gap-1 mt-1.5 bg-[#F0F6FC] border border-[#E5E7EB] px-2.5 py-0.5 rounded-full text-[10.5px] font-bold text-[#6B7280]">
                          {task.category}
                        </div>

                        {task.description && (
                          <p className="text-[11.5px] text-[#6B7280] mt-1.5 leading-relaxed font-medium">
                            {maskSensitiveData(task.description, !!liffLoggedInUser)}
                          </p>
                        )}

                        {isTaken && (
                          <div className="text-[11px] text-[#16A34A] font-semibold mt-2.5 flex items-center gap-1 bg-[#DCFCE7]/30 border border-[#86EFAC]/20 px-2 py-1 rounded-lg">
                            <CheckCircle2 size={12} />
                            {task.receiver_name || task.receiver_id} รับงานแล้ว • {task.accepted_at ? new Date(task.accepted_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '13:42'} น.
                          </div>
                        )}
                      </div>

                      {/* Top Right Taken Indicator Badge */}
                      {isTaken && (
                        <span className="absolute top-3 right-3 flex items-center gap-1 bg-[#DCFCE7] border border-[#86EFAC] rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-[#16A34A] shadow-sm leading-none">
                          รับแล้ว
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
               <div className="flex-1 flex items-center justify-center p-6 text-center text-xs font-bold text-gray-500 flex-col gap-3">
                 <ShieldCheck size={48} className="text-slate-300" />
                 กรุณาเข้าสู่ระบบกลุ่มงาน เพื่อรับงาน
               </div>
            )}


            {/* Footer buttons */}
            <div className="bg-gradient-to-t from-white via-white to-transparent pt-6 pb-6 px-4 sticky bottom-0 z-10 flex flex-col gap-3 border-t border-gray-150/40">
              <div className="flex items-center justify-between text-[11.5px] text-[#6B7280] font-bold px-2">
                <span>เลือกแล้ว <span className="text-[#2B8BE8] font-black">{selectedTaskIds.size} งาน</span> จาก {pendingCount} งานที่รอรับ</span>
                {pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllPending}
                    className="text-[#2B8BE8] hover:text-[#1E6FC7] font-black transition-colors underline cursor-pointer"
                  >
                    {batchTasks.filter(t => t.status === 'Pending').every(t => selectedTaskIds.has(t.id)) ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                  </button>
                )}
              </div>
              <button 
                onClick={handleConfirmAccept}
                disabled={selectedTaskIds.size === 0 || isSubmitting}
                className="w-full h-12 bg-[#2B8BE8] hover:bg-[#1E6FC7] disabled:bg-[#E5E7EB] disabled:text-[#6B7280] text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/10 active:scale-95 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    กำลังบันทึกข้อมูล...
                  </>
                ) : (
                  <>
                    <Check size={16} strokeWidth={2.5} />
                    ยืนยันรับงานที่เลือก
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Screen 2: LIFF Success State Overlay */
          <div className="flex-1 bg-white p-6 flex flex-col items-center justify-center text-center animate-fadeIn min-h-screen sm:min-h-0">
            <div className="w-16 h-16 bg-[#DCFCE7] rounded-full flex items-center justify-center mb-5 shrink-0 scale-up-transition">
              <Check className="text-[#16A34A]" size={32} strokeWidth={3} />
            </div>
            
            <h2 className="text-xl font-black text-[#1A1A2E] tracking-tight">
              รับงานสำเร็จ
            </h2>
            <p className="text-sm text-[#6B7280] font-medium mt-2 leading-relaxed">
              ระบบทำรายการเสร็จสิ้นและได้แจ้งเตือน<br />ให้กับทีมงานในกลุ่มไลน์เรียบร้อยแล้ว
            </p>

            {/* Box displaying accepted jobs */}
            <div className="bg-[#F0F6FC] border border-[#E5E7EB] rounded-2xl p-4.5 w-full mt-6 text-left">
              <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-wider">
                งานที่คุณกดรับสำเร็จ
              </span>
              <div className="mt-2 text-[#1A1A2E] text-xs font-bold divide-y divide-gray-150">
                {acceptedTasksList.map((task) => (
                  <div key={task.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#16A34A] shrink-0" />
                    <span className="truncate">{task.title}</span>
                    <span className="ml-auto font-mono text-[9px] bg-sky-50 text-sky-600 border border-sky-200/50 rounded px-1">{task.task_number}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-[#6B7280] font-bold mt-6 mb-8">
              {currentUserName} • {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น. • {isEmulated ? 'WEBSITE' : 'LINE'}
            </div>

            <button 
              onClick={handleCloseLiff}
              className="w-full h-11 bg-[#F0F6FC] border border-[#E5E7EB] hover:bg-slate-100 font-bold rounded-xl text-sm transition-all text-[#1A1A2E] cursor-pointer"
            >
              ปิดหน้าต่างนี้
            </button>
          </div>
        )}

        {isLoginModalOpen && renderLoginModal()}

      </div>
    </div>
  );
}
