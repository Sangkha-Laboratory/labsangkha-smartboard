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
  Info
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
  const [batchTasks, setBatchTasks] = useState<BatchTask[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [targetHandover, setTargetHandover] = useState<any | null>(null);
  
  // App state
  const [isSuccess, setIsSuccess] = useState(false);
  const [acceptedTasksList, setAcceptedTasksList] = useState<BatchTask[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  useEffect(() => {
    // 1. Get handover ID from URL params
    const params = new URLSearchParams(window.location.search);
    const id = params.get('handover_id') || params.get('id');
    setTargetId(id);

    // 2. Initialize LIFF SDK (Load dynamically based on active platform - Google AI Studio vs Git Page vs Cloudflare)
    const activeConfig = getActiveConfig();
    const liffId = activeConfig.liffId;
    
    liff.init({ liffId })
      .then(() => {
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

  // Fetch handover tasks
  useEffect(() => {
    if (!targetId) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);

        // a. Fetch all users for name-mapping
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name');
        
        const m: Record<string, string> = {};
        if (usersData) {
          usersData.forEach(u => {
            m[u.id] = u.full_name;
          });
        }
        setUsersMap(m);

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
            receiver_name: m[item.receiver_id] || item.receiver_id || '',
            accepted_at: item.accepted_at
          };
        });

        setBatchTasks(formattedTasks);
      } catch (err: any) {
        console.error("Error loading LIFF handover details:", err);
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

  const handleConfirmAccept = async () => {
    const currentUserName = liffProfile?.displayName || mockProfileName;
    if (!currentUserName.trim()) {
      alert("กรุณาระบุชื่อผู้รับงานก่อนทำรายการ");
      return;
    }

    if (selectedTaskIds.size === 0) {
      alert("กรุณาเลือกงานที่ต้องการรับก่อน");
      return;
    }

    setIsSubmitting(true);
    try {
      // Find matching user UUID if name is registered
      let receiverId = currentUserName;
      const matchedUserId = Object.keys(usersMap).find(key => usersMap[key] === currentUserName);
      if (matchedUserId) {
        receiverId = matchedUserId;
      }

      const nowStr = new Date().toISOString();
      const updatedList: BatchTask[] = [];

      // Update in Supabase
      for (const id of Array.from(selectedTaskIds)) {
        const { error: updateErr } = await supabase
          .from('handovers')
          .update({
            status: 'Accepted',
            receiver_id: receiverId,
            accepted_at: nowStr
          })
          .eq('id', id);

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
      await writeLog('INFO', 'LINE_LIFF_ACCEPT', `พนักงาน ${currentUserName} ร่วมรับงานในหมวดหมู่ผ่าน LIFF สำเร็จ`, {
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

  const senderName = targetHandover ? (usersMap[targetHandover.sender_id] || targetHandover.sender_name || 'ไม่ระบุ') : 'กำลังโหลด...';
  const getAvatarLetter = (name: string) => name ? name.trim().slice(0, 1) : '?';

  if (!targetId) {
    return (
      <div className="min-h-screen bg-[#DAEAF7] flex items-center justify-center p-4 font-sans text-[#1A1A2E]">
        <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center shadow-lg">
          <AlertCircle size={44} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold">ข้อมูลพารามิเตอร์ไม่ครบถ้วน</h2>
          <p className="text-sm text-[#6B7280] mt-2 mb-6">
            ลิงค์นี้ไม่มีรหัสรันงานที่ต้องการรับ กรุณาเข้าใช้งานผ่านปุ่ม "เลือกรับงาน" จากการแจ้งเตือนทางกลุ่มไลน์
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full h-11 bg-[#2B8BE8] text-white font-bold rounded-xl hover:bg-[#1E6FC7] transition-all"
          >
            กลับหน้าหลักเว็บไซต์
          </button>
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
  const currentUserName = liffProfile?.displayName || mockProfileName;

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
            <div className="bg-gradient-to-r from-[#EFF6FF] to-[#DBEAFE] border-b border-[#BFDBFE] px-5 py-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2B8BE8] flex items-center justify-center font-bold text-white text-sm">
                {getAvatarLetter(currentUserName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-[#1E40AF]">
                    {currentUserName}
                  </span>
                  {isEmulated && (
                    <button 
                      onClick={() => setShowNameEditor(!showNameEditor)}
                      className="text-[10px] bg-blue-100/80 hover:bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded font-black border border-blue-200/50"
                    >
                      แก้ไขชื่อจำลอง
                    </button>
                  )}
                </div>
                <div className="text-[10.5px] text-[#3B82F6] font-medium mt-0.5 flex items-center gap-1">
                  <ShieldCheck size={11} className="text-blue-500 shrink-0" />
                  {isEmulated ? 'เข้าใช้งานในฐานะจำลอง (Emulated Profile)' : 'ยืนยันตัวตนจาก LINE โดยอัตโนมัติ'}
                </div>
              </div>
            </div>

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
                        {maskSensitiveData(task.title, false)}
                      </h4>
                      <div className="inline-flex items-center gap-1 mt-1.5 bg-[#F0F6FC] border border-[#E5E7EB] px-2.5 py-0.5 rounded-full text-[10.5px] font-bold text-[#6B7280]">
                        {task.category}
                      </div>

                      {task.description && (
                        <p className="text-[11.5px] text-[#6B7280] mt-1.5 leading-relaxed font-medium">
                          {maskSensitiveData(task.description, false)}
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

            {/* Footer buttons */}
            <div className="bg-gradient-to-t from-white via-white to-transparent pt-6 pb-6 px-4 sticky bottom-0 z-10 flex flex-col gap-3 border-t border-gray-150/40">
              <div className="text-center text-[11.5px] text-[#6B7280] font-bold">
                เลือกแล้ว <span className="text-[#2B8BE8] font-black">{selectedTaskIds.size} งาน</span> จาก {pendingCount} งานที่รอรับ
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
                    <span className="truncate">{maskSensitiveData(task.title, false)}</span>
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

      </div>
    </div>
  );
}
