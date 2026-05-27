import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar, 
  Clock, 
  User, 
  Briefcase, 
  Users, 
  Timer, 
  FileEdit, 
  List,
  Plus, 
  Trash2, 
  Send,
  ShieldCheck,
  Building2,
  Lock,
  Tag,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface TaskItem {
  id: string;
  title: string;
  category: string;
  detail: string;
}

type Sender = { id: string; full_name: string };

function CustomDropdown({
  options, value, onChange, placeholder = "เลือกชื่อ...",
}: {
  options: Sender[]; value: string;
  onChange: (id: string) => void; placeholder?: string;
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.id === value);
  const filtered = options.filter(o => {
    const name = (o.full_name || "");
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const getDisplayName = (o: Sender | undefined) => {
    if (!o) return placeholder;
    return o.full_name || "ไม่มีชื่อ";
  };

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  function select(id: string) { onChange(id); setOpen(false); setSearch(""); }

  return (
    <div ref={ref} className="relative select-none w-full">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full px-4 py-2 border rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer ${
          open ? 'border-brand-blue bg-white ring-2 ring-brand-light' : 'border-gray-100 dark:border-slate-600 bg-white dark:bg-slate-700'
        } ${selected ? 'text-gray-900 dark:text-white font-normal' : 'text-gray-400'}`}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] sm:text-sm">
          {getDisplayName(selected)}
        </span>
        <ChevronDown 
          size={16} 
          className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''} text-gray-400`} 
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-[100] overflow-hidden origin-top"
          >
            <div className="p-2 border-b border-gray-50 dark:border-slate-700">
              <div className="relative">
                <Search 
                  size={14} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
                />
                <input 
                  ref={inputRef} 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-900 border border-transparent rounded-lg text-xs sm:text-sm font-medium text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-200 transition-all"
                />
              </div>
            </div>
            <div className="max-h-[230px] overflow-y-auto scrollbar-hide py-1">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs font-medium text-gray-400">
                  ไม่พบชื่อ
                </div>
              ) : filtered.map(o => (
                <button 
                  key={o.id} 
                  type="button" 
                  onClick={() => select(o.id)}
                  className={`w-full px-4 py-2.5 text-left text-xs sm:text-sm font-medium flex items-center justify-between transition-colors ${
                    o.id === value ? 'bg-brand-light dark:bg-brand-blue/10 text-brand-blue' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {o.full_name || "ไม่มีชื่อ"}
                  {o.id === value && (
                    <div className="w-1.5 h-1.5 bg-brand-blue dark:bg-brand-blue/80 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HandoverForm({ currentUser }: { currentUser?: any }) {
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    date: today,
    dept: 'Central Lab',
    shift: '',
    employeeName: '',
    pin: ''
  });

  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: '1', title: '', category: '', detail: '' }
  ]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lineNotifyStatus, setLineNotifyStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message?: string; details?: any }>({ status: 'idle' });
  const [availableUsers, setAvailableUsers] = useState<Sender[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      setFormData(prev => ({ ...prev, employeeName: currentUser.id }));
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, role')
          .eq('is_active', true)
          .neq('role', 'admin') // Exclude admin users
          .order('full_name');
        
        if (error) {
          console.error('Error fetching users (HandoverForm):', error);
          return;
        }

        if (data) {
          setAvailableUsers(data);
        }
      } catch (err) {
        console.error('Fetch users catch (HandoverForm):', err);
      }
    };
    fetchUsers();
  }, []);

  const addTask = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setTasks([...tasks, { id: newId, title: '', category: '', detail: '' }]);
    setCurrentTaskIndex(tasks.length);
  };

  const removeTask = (id: string) => {
    if (tasks.length > 1) {
      const newTasks = tasks.filter(t => t.id !== id);
      setTasks(newTasks);
      if (currentTaskIndex >= newTasks.length) {
        setCurrentTaskIndex(newTasks.length - 1);
      }
    }
  };

  const updateTask = (id: string, field: keyof TaskItem, value: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shift || !formData.employeeName || !formData.pin) {
      setSubmitStatus('error');
      setErrorMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    const validTasks = tasks.filter(t => t.title.trim() !== '');
    if (validTasks.length === 0) {
      setSubmitStatus('error');
      setErrorMessage('กรุณาเพิ่มรายการงานอย่างน้อย 1 รายการ');
      return;
    }
    setSubmitStatus('idle');
    setIsConfirmModalOpen(true);
  };

  const handleFinalSubmit = async () => {
    setIsConfirmModalOpen(false);
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      let activeClient = supabase;

      // 0. Fetch user record first to decide auth strategy
      const { data: userRecord, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', formData.employeeName)
        .single();

      if (fetchError || !userRecord) {
        throw new Error('ไม่พบข้อมูลผู้ใช้งาน');
      }

      const isHashed = userRecord.sender_pass?.startsWith('$') || (userRecord.sender_pass?.length || 0) > 32;
      
      // Attempt authentication
      if (userRecord.email && isHashed) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: userRecord.email,
          password: formData.pin
        });
        
        if (authError) {
          const { data: isValid, error: rpcError } = await supabase.rpc('verify_user_password', {
            p_user_id: userRecord.id,
            p_password: formData.pin
          });
          if (rpcError || !isValid) {
            throw new Error('รหัสผ่านไม่ถูกต้อง');
          }
        } else if (authData?.session) {
          activeClient = supabase;
        }
      } else if (isHashed) {
        const { data: isValid, error: rpcError } = await supabase.rpc('verify_user_password', {
          p_user_id: userRecord.id,
          p_password: formData.pin
        });
        if (rpcError || !isValid) {
          throw new Error('รหัสผ่านไม่ถูกต้อง');
        }
      } else {
        if (userRecord.sender_pass !== formData.pin) {
          throw new Error('รหัสผ่านไม่ถูกต้อง');
        }
      }

      // Try modern insert first (if shift column exists on Supabase)
      const tasksToInsertModern = tasks
        .filter(t => t.title.trim() !== '')
        .map(t => ({
          handover_date: formData.date,
          division: formData.dept, 
          shift: formData.shift, 
          category: t.category || '', 
          sender_id: userRecord.id, 
          status: 'Pending', 
          title: t.title,
          description: t.detail,
        }));

      let handoverError: any = null;
      let handoverData: any = null;

      try {
        const { data: mData, error: mError } = await activeClient
          .from('handovers')
          .insert(tasksToInsertModern)
          .select();

        if (mError) {
          // If the error suggests column "shift" doesn't exist, switch to old schema fallback
          if (mError.message.includes('column "shift"') || mError.message.includes('does not exist')) {
            throw new Error('FALLBACK_TO_HYBRID');
          }
          handoverError = mError;
        } else {
          handoverData = mData;
        }
      } catch (insertErr: any) {
        if (insertErr.message === 'FALLBACK_TO_HYBRID') {
          const tasksToInsertLegacy = tasks
            .filter(t => t.title.trim() !== '')
            .map(t => ({
              handover_date: formData.date,
              division: formData.dept, 
              category: `${formData.shift}|${t.category || ''}`, 
              sender_id: userRecord.id, 
              status: 'Pending', 
              title: t.title,
              description: t.detail,
            }));

          const { data: lData, error: lError } = await activeClient
            .from('handovers')
            .insert(tasksToInsertLegacy)
            .select();

          if (lError && (lError.message.includes('permission denied') || lError.message.includes('sequence'))) {
            let lastErr = lError;
            for (const taskPayload of tasksToInsertLegacy) {
              const uniqueTaskNumber = `LAB-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
              const { error: retryError } = await activeClient
                .from('handovers')
                .insert([{ ...taskPayload, task_number: uniqueTaskNumber }]);
              if (retryError) { lastErr = retryError; break; }
              lastErr = null;
            }
            handoverError = lastErr;
          } else {
            handoverError = lError;
          }
          handoverData = lData;
        } else {
          handoverError = insertErr;
        }
      }

      if (handoverError) throw new Error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');

      // 1. Prepare data for LINE Edge Function
      const firstRecord = (handoverData && handoverData.length > 0) ? handoverData[0] : null;
      const fallbackId = firstRecord?.id || Math.random().toString(36).substring(2, 15);
      const payload = {
        id: fallbackId,
        department: formData.dept,
        shift: formData.shift,
        sender_name: userRecord.full_name,
        tasks: tasks.filter(t => t.title.trim() !== ''),
        created_at: new Date().toISOString()
      };

      // 2. Set UI status immediately to success so user doesn't wait
      setSubmitStatus('success');
      setTasks([{ id: '1', title: '', category: '', detail: '' }]);
      setFormData(prev => ({ ...prev, shift: '', pin: '', employeeName: '' }));
      setIsConfirmModalOpen(false);
      setIsSubmitting(false);

      // Start fetching the LINE notification in the background
      setLineNotifyStatus({ status: 'loading', message: 'กำลังส่งแจ้งเตือนผ่าน Line...' });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      const functionUrl = `${supabaseUrl}/functions/v1/handle-new-handover`;

      // Background self-executing promise
      (async () => {
        try {
          console.log("Triggering LINE Edge Function in background...");
          const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'apikey': supabaseAnonKey
            },
            body: JSON.stringify(payload)
          });

          const responseText = await response.text();
          console.log("Edge Function background response:", responseText);

          let responseJson: any = null;
          try {
            responseJson = JSON.parse(responseText);
          } catch (e) {
            // not JSON
          }

          if (!response.ok) {
            console.error(`❌ LINE notification Edge Function error status: ${response.status}`);
            setLineNotifyStatus({ 
              status: 'error', 
              message: responseJson?.error || `HTTP ${response.status}: ${responseText || 'เกิดข้อผิดพลาดในการรันแอปพลิเคชัน'}`,
              details: responseJson || { raw_response: responseText, status_code: response.status }
            });
          } else if (responseJson && (responseJson.error || !responseJson.success)) {
            console.error("❌ LINE Edge Function returned business-level error in background:", responseJson);
            setLineNotifyStatus({ 
              status: 'error', 
              message: responseJson.error || 'Server Edge function business error',
              details: responseJson
            });
          } else {
            console.log('✅ LINE notification triggered in background successfully!');
            setLineNotifyStatus({ status: 'success', message: 'ส่งไลน์แจ้งกลุ่มเวรสำเร็จ!' });
          }
        } catch (funcErr: any) {
          console.error('❌ Expected failure during background execution of LINE trigger step:', funcErr);
          setLineNotifyStatus({ 
            status: 'error', 
            message: funcErr.message || 'เกิดข้อผิดพลาดขณะส่งข้อความ',
            details: funcErr
          });
        } finally {
          // Always safely sign out the temporary session in background
          try {
            await supabase.auth.signOut();
          } catch (soErr) {
            console.error("Signout check failed:", soErr);
          }
        }
      })();

      setTimeout(() => {
        setSubmitStatus('idle');
        setLineNotifyStatus({ status: 'idle' });
      }, 15000);
    } catch (err: any) {
      await supabase.auth.signOut();
      setSubmitStatus('error');
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-[2rem] transition-all relative flex flex-col h-full">
      <form className="space-y-5 mb-0 flex flex-col flex-1" onSubmit={handlePreSubmit}>
        {/* Main Header Info (Card-like) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-50 dark:border-slate-700/50">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-brand-light dark:bg-brand-blue/10 rounded-lg flex items-center justify-center text-brand-blue">
              <FileEdit size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">แบบบันทึกส่งเวร</h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">กรอกข้อมูลการปฏิบัติงานเพื่อส่งต่อ</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputGroup label="วันที่" icon={<Calendar size={14} />} required>
              <input 
                type="date" 
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none text-[12px] sm:text-[13px] dark:text-white font-normal"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
              />
            </InputGroup>
            <InputGroup label="หน่วยงาน" icon={<Building2 size={14} />} required>
              <select 
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none text-[12px] sm:text-[13px] appearance-none cursor-pointer dark:text-white font-normal"
                value={formData.dept}
                onChange={(e) => handleInputChange('dept', e.target.value)}
              >
                <option className="text-black" value="Central Lab">Central Lab</option>
                <option className="text-black" value="Blood Bank">Blood Bank</option>
              </select>
            </InputGroup>
            <InputGroup label="ส่งต่อเวร" icon={<Timer size={14} />} required className="sm:col-span-2">
              <select 
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none text-[12px] sm:text-[13px] appearance-none cursor-pointer dark:text-white font-normal"
                value={formData.shift}
                onChange={(e) => handleInputChange('shift', e.target.value)}
              >
                <option value="" className="text-black">-- เลือกเวรที่ส่งต่อ --</option>
                <option className="text-black">เช้า</option>
                <option className="text-black">บ่าย</option>
                <option className="text-black">ดึก</option>
              </select>
            </InputGroup>
          </div>
        </div>

        {/* Task Carousel Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-50 dark:border-slate-700/50 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-brand-light dark:bg-brand-blue/10 rounded-lg flex items-center justify-center text-brand-blue">
                 <List size={14} />
              </div>
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                รายละเอียดงาน
                <span className="bg-brand-blue text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black">{tasks.length}</span>
              </h4>
            </div>
            <button 
              type="button"
              onClick={addTask}
              className="px-3 py-1.5 bg-brand-blue/5 dark:bg-brand-blue/10 text-brand-blue border border-brand-blue/10 rounded-lg text-[10px] font-bold hover:bg-brand-blue/20 transition-all flex items-center gap-1 active:scale-95"
            >
              <Plus size={12} /> เพิ่มงาน
            </button>
          </div>

          <div className="relative flex-1 flex flex-col justify-start mt-2">
            <AnimatePresence>
              {tasks[currentTaskIndex] && (
                <motion.div 
                  key={tasks[currentTaskIndex].id}
                  layout="position"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="bg-gray-50/50 dark:bg-slate-900/30 rounded-xl p-5 relative min-h-[160px] flex flex-col"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400 rounded-md flex items-center justify-center text-[8px] font-bold">
                        {currentTaskIndex + 1}
                      </div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">รายการงานปัจจุบัน</span>
                    </div>
                    {tasks.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeTask(tasks[currentTaskIndex].id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1">ชื่องาน *</label>
                        <input 
                          type="text" 
                          placeholder="ระบุชื่องาน..." 
                          className="w-full bg-white dark:bg-slate-800 border border-transparent rounded-xl px-4 py-2.5 text-xs sm:text-sm font-normal text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                          value={tasks[currentTaskIndex].title}
                          onChange={(e) => updateTask(tasks[currentTaskIndex].id, 'title', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1">ประเภท *</label>
                        <select 
                          className="w-full bg-white dark:bg-slate-800 border border-transparent rounded-xl px-4 py-2.5 text-xs sm:text-sm font-normal text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none cursor-pointer"
                          value={tasks[currentTaskIndex].category}
                          onChange={(e) => updateTask(tasks[currentTaskIndex].id, 'category', e.target.value)}
                        >
                           <option value="">เลือกประเภท..</option>
                           <option>น้ำยา</option>
                           <option>เครื่องมือ</option>
                           <option>งานค้าง</option>
                           <option>อื่น ๆ</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1">รายละเอียดงาน</label>
                      <textarea 
                        rows={3}
                        placeholder="ระบุรายละเอียดเพิ่มเติม..."
                        className="w-full bg-white dark:bg-slate-800 border border-transparent rounded-xl px-4 py-2.5 text-xs sm:text-sm font-normal text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all"
                        value={tasks[currentTaskIndex].detail}
                        onChange={(e) => updateTask(tasks[currentTaskIndex].id, 'detail', e.target.value)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Arrows & Dots */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setCurrentTaskIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentTaskIndex === 0}
                  className="p-1.5 text-gray-400 hover:text-brand-blue disabled:opacity-20 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  type="button"
                  onClick={() => setCurrentTaskIndex(prev => Math.min(tasks.length - 1, prev + 1))}
                  disabled={currentTaskIndex === tasks.length - 1}
                  className="p-1.5 text-gray-400 hover:text-brand-blue disabled:opacity-20 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="flex items-center gap-1">
                {tasks.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1 rounded-full transition-all duration-300 ${idx === currentTaskIndex ? 'w-4 bg-gray-400' : 'w-1 bg-gray-200 dark:bg-slate-700'}`}
                  />
                ))}
              </div>

              <div className="text-[10px] font-bold text-gray-400 tabular-nums">
                {currentTaskIndex + 1} / {tasks.length}
              </div>
            </div>
          </div>
        </div>

        {/* Auth Confirmation Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-50 dark:border-slate-700/50">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-7 h-7 bg-gray-50 dark:bg-slate-700 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 shrink-0">
              <ShieldCheck size={14} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">ยืนยันตัวตน</h4>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">ข้อมูลนี้ใช้สำหรับบันทึกชื่อผู้ส่งเวร</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <InputGroup label="ชื่อผู้ส่งเวร" icon={<User size={14} />} required>
              <CustomDropdown 
                options={availableUsers}
                value={formData.employeeName}
                onChange={(val) => handleInputChange('employeeName', val)}
                placeholder="เลือกรายชื่อ"
              />
            </InputGroup>
            <InputGroup label="PIN ยืนยัน" icon={<Lock size={14} />} required>
              <input 
                type="password" 
                placeholder="ระบุรหัสผ่าน"
                className="w-full px-4 py-2 text-gray-700 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-xs sm:text-sm tracking-widest font-normal dark:text-gray-200 bg-gray-50 dark:bg-slate-900"
                value={formData.pin}
                onChange={(e) => handleInputChange('pin', e.target.value)}
              />
            </InputGroup>
          </div>
        </div>

        {/* Error/Success Status UI */}
        <AnimatePresence>
          {submitStatus === 'error' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-400 font-bold text-[11px] border border-red-100 dark:border-red-900/30"
            >
               <AlertCircle size={16} />
               {errorMessage}
            </motion.div>
          )}
          {submitStatus === 'success' && (
            <div className="space-y-2">
              <motion.div 
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: 'auto' }}
                 className="bg-green-50 dark:bg-green-950/20 px-4 py-3 rounded-2xl flex items-center gap-3 text-green-700 dark:text-green-400 font-bold text-[11px] border border-green-100 dark:border-green-900/30"
              >
                 <CheckCircle2 size={16} />
                 บันทึกส่งมอบงานสำเร็จ!
              </motion.div>

              {lineNotifyStatus.status === 'loading' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-blue-50/50 dark:bg-blue-950/10 px-4 py-2.5 rounded-2xl flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-medium text-[11px] border border-blue-100/10 dark:border-blue-900/10"
                >
                  <div className="w-3.5 h-3.5 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin shrink-0" />
                  <span>กำลังส่งข้อมูลแจ้งเตือนไปยังแอปพลิเคชัน LINE...</span>
                </motion.div>
              )}

              {lineNotifyStatus.status === 'error' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl flex flex-col gap-2 text-amber-800 dark:text-amber-400 font-medium text-[11px] border border-amber-100 dark:border-amber-900/30"
                >
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle size={15} className="text-amber-600 shrink-0" />
                    <span>แจ้งเตือน LINE ไม่สำเร็จ: {lineNotifyStatus.message}</span>
                  </div>
                  {lineNotifyStatus.details && (
                    <pre className="mt-1 p-2 bg-amber-100/50 dark:bg-amber-950/50 rounded-lg text-[9px] font-mono whitespace-pre-wrap break-all max-h-[140px] overflow-y-auto">
                      {JSON.stringify(lineNotifyStatus.details, null, 2)}
                    </pre>
                  )}
                  <p className="text-[9px] text-gray-500 mt-1">
                    ต้องการตรวจสอบ? ตรวจสอบว่า LINE_CHANNEL_ACCESS_TOKEN ได้ถูกตั้งค่าใน Supabase Edge Functions Secrets หรือไม่ หรือตรวจสอบฟังก์ชั่น RPC get_active_line_group
                  </p>
                </motion.div>
              )}

              {lineNotifyStatus.status === 'success' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-blue-50 dark:bg-blue-950/20 px-4 py-2.5 rounded-2xl flex items-center gap-2.5 text-blue-700 dark:text-blue-400 font-medium text-[11px] border border-blue-100 dark:border-blue-900/30"
                >
                  <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
                  <span>ส่งข้อความแจ้งเตือนผ่านกลุ่ม LINE เรียบร้อยแล้ว!</span>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>

        {/* Final Submit Button */}
        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand-blue hover:bg-brand-dark text-white py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-blue/20 disabled:opacity-50 active:scale-[0.98] mt-2"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send size={18} />
              ส่งงาน
            </>
          )}
        </button>
      </form>

      {/* Confirmation Modal */}
      {createPortal(
        <AnimatePresence>
          {isConfirmModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-2.5 sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsConfirmModalOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-[#f8fafc] dark:bg-slate-900 w-full max-w-sm rounded-2xl sm:rounded-[2rem] shadow-2xl relative border border-gray-100 dark:border-slate-800 overflow-y-auto max-h-[86vh]"
              >
                {/* Close Button */}
                <button 
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="absolute top-4 right-4 p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full transition-all z-10 shadow-sm"
                  title="ปิด"
                >
                  <X size={16} />
                </button>

                <div className="p-5 sm:p-6">
                  {/* Header Section */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center text-white shadow-xl shadow-brand-blue/20 shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">ยืนยันข้อมูล</h3>
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">ตรวจสอบความถูกต้องก่อนส่งมอบ</p>
                    </div>
                  </div>

                  {/* Preview Box */}
                  <div className="mb-6 transform scale-[0.96] origin-top">
                    <DynamicLinePreview 
                      data={{
                        ...formData,
                        employeeName: availableUsers.find(u => u.id === formData.employeeName)?.full_name || ''
                      }} 
                      tasks={tasks} 
                      isLoggedIn={isLoggedIn}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setIsConfirmModalOpen(false)}
                      className="py-3 text-xs font-black text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      onClick={handleFinalSubmit}
                      className="py-3 text-xs font-black text-white bg-brand-blue hover:bg-brand-dark rounded-xl transition-all shadow-xl shadow-brand-blue/20 active:scale-95"
                    >
                      ยืนยันส่งงาน
                    </button>
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

function DynamicLinePreview({ data, tasks, isLoggedIn }: { data: any, tasks: TaskItem[], isLoggedIn?: boolean }) {
  const formattedDate = data.date ? new Date(data.date).toLocaleDateString('th-TH', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  }) : '-';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-gray-50 dark:border-slate-700/50 p-3.5 sm:p-4 relative min-h-[300px] w-full">
      {/* Mini LINE Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-50 dark:border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-[#2B8BE8] rounded-xl flex items-center justify-center text-white shadow-sm overflow-hidden">
            <img src="/icons/icon-checklist.svg" alt="Checklist" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <h4 className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase leading-none mb-1">ส่งเวร</h4>
            <p className="text-xs font-black text-gray-900 dark:text-white tracking-tight leading-none">LAB-0009</p>
          </div>
        </div>
        
        <div className="text-right">
          <span className="bg-[#FEF3C7] text-[#D97706] px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-tighter mb-0.5 inline-block">PENDING</span>
          <p className="text-[8px] text-gray-400 font-bold tabular-nums leading-none">{formattedDate} • 09:15</p>
        </div>
      </div>

      {/* Lab Station Plate */}
      <div className="bg-[#F0F6FC] rounded-xl p-3 mb-4 border border-blue-50 dark:border-slate-700/35">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-brand-blue shadow-sm border border-gray-100 dark:border-slate-750 overflow-hidden">
            <img src="/icons/icon-building.svg" alt="Building" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <h5 className="text-[11px] font-bold text-[#1A1A2E] dark:text-white leading-none mb-1">{data.dept || 'Central Lab'}</h5>
            <div className="flex items-center gap-1.5 text-brand-blue dark:text-brand-blue font-black text-[9px]">
              <span>เวร{data.shift || 'เช้า'}</span>
            </div>
          </div>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-brand-light/30 dark:border-brand-blue/10 flex items-center gap-2 text-[9px] text-gray-500 dark:text-gray-400 font-medium">
          <User size={10} className="opacity-50" />
          <span>ผู้ส่งเวร: {data.employeeName || '--'}</span>
        </div>
      </div>

      {/* Task List Summary */}
      <div className="space-y-2 mb-4">
        <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest ml-1 mb-0.5">รายการงาน</p>
        {tasks.filter(t => t.title.trim() !== '').length > 0 ? (
          tasks.filter(t => t.title.trim() !== '').map((task, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="w-4 h-4 rounded-md bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400 flex items-center justify-center text-[9px] font-black shrink-0 border border-green-100/30">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200 leading-tight truncate">{task.title}</p>
                <p className="text-[9px] text-gray-400 leading-tight truncate">{task.detail || task.category}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2.5 opacity-20">
             <div className="w-4 h-4 rounded-md bg-gray-100 dark:bg-slate-700 font-bold flex items-center justify-center text-[9px]">1</div>
             <p className="text-[10px] font-medium text-gray-400">พรีวิวรายการงานที่นี่...</p>
          </div>
        )}
      </div>

      {/* Action Simulation */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <div className="bg-[#2ecc71] text-white py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 shadow-sm opacity-90 cursor-default">
           รับทั้งหมด
        </div>
        <div className="border border-[#2ecc71] text-[#2ecc71] py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 opacity-90 cursor-default">
           เลือกรับงาน
        </div>
      </div>
    </div>
  );
}


// Re-using types
function InputGroup({ label, icon, children, required = false, className = "" }: { label: string, icon: React.ReactNode, children: React.ReactNode, required?: boolean, className?: string }) {
  return (
    <div className={`w-full text-left ${className}`}>
      <label className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
        <span className="text-gray-400 dark:text-gray-500">{icon}</span>
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
