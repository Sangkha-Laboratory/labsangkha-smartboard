import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, User, Lock, ArrowRight, ShieldCheck, Database, ChevronLeft, ChevronDown, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { writeLog } from '../lib/logger';
import MedtechIllustration from './MedtechIllustration';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onBack: () => void;
  onAdminClick?: () => void;
}

type Sender = { id: string; full_name: string };

function Dropdown({
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
    <div ref={ref} className="relative select-none">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full px-4 py-2.5 border-2 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
          open ? 'border-brand-blue/50 bg-white shadow-[0_0_0_6px_rgba(32,190,255,0.04)]' : 'border-transparent bg-[#f1f5f9]'
        } ${selected ? 'text-[#0f2d52] font-black' : 'text-[#94a3b8] font-bold'}`}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm sm:text-base">
          {getDisplayName(selected)}
        </span>
        <ChevronDown 
          size={16} 
          className={`flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''} text-[#6b8daf]`} 
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white/95 backdrop-blur-xl border border-white rounded-xl shadow-[0_20px_40px_-10px_rgba(15,45,82,0.15)] z-50 overflow-hidden origin-top"
          >
            <div className="p-2 border-b border-slate-50">
              <div className="relative">
                <Search 
                  size={12} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b8daf]" 
                />
                <input 
                  ref={inputRef} 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ..."
                  className="w-full pl-8 pr-3 py-2 bg-[#f8fafc] border-2 border-transparent rounded-lg text-sm font-bold text-[#0f2d52] outline-none focus:bg-white focus:border-brand-blue/20 transition-all placeholder:text-slate-300"
                />
              </div>
            </div>
            <div className="max-h-[200px] overflow-y-auto pt-1 pb-1 scrollbar-hide">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm font-bold text-[#6b8daf] opacity-60">
                  ไม่พบชื่อที่ค้นหา
                </div>
              ) : filtered.map(o => (
                <button 
                  key={o.id} 
                  type="button" 
                  onClick={() => select(o.id)}
                  className={`w-full px-5 py-2.5 text-left text-sm font-black flex items-center justify-between transition-all ${
                    o.id === value ? 'bg-brand-light text-brand-blue' : 'text-[#0f2d52] hover:bg-slate-50 hover:pl-7'
                  }`}
                >
                  {o.full_name || "ไม่มีชื่อ"}
                  {o.id === value && (
                    <motion.div layoutId="active-check" className="w-1.5 h-1.5 bg-brand-blue rounded-full" />
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

export default function LoginPage({ onLoginSuccess, onBack, onAdminClick }: LoginProps) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<Sender[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          console.error('Error fetching users:', error);
          // Try fetching from public schema if handover_sys failed (fallback)
          return;
        }

        if (data) {
          console.log('Fetched users:', data);
          // Debug password format and other columns
          const { data: debugUser, error: debugError } = await supabase
            .from('users')
            .select('*')
            .limit(1);
          if (debugUser && debugUser.length > 0) {
            console.log('DEBUG: User Table Structure:', Object.keys(debugUser[0]));
            if (debugUser[0].sender_pass) {
              const pass = debugUser[0].sender_pass;
              console.log('DEBUG: Password prefix:', pass.substring(0, 7), 'Length:', pass.length);
            }
          } else if (debugError) {
            console.log('DEBUG: Error fetching row for structure:', debugError);
          }
          setUsers(data);
        }
      } catch (err) {
        console.error('Fetch users catch:', err);
      }
    };
    fetchUsers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. First, check if the user has an email in the users table to use Supabase Auth
      const { data: userRecord, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError || !userRecord) {
        throw new Error('ไม่พบข้อมูลผู้ใช้งาน');
      }

      // 2. If it is Supabase Auth, we need an email. 
      // If the email exists and the password looks hashed in the DB, try signInWithPassword
      const isHashed = userRecord.sender_pass?.startsWith('$') || userRecord.sender_pass?.length > 32;
      
      if (userRecord.email && isHashed) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: userRecord.email,
          password: password
        });
        
        if (authError) {
          writeLog('WARN', 'AUTH', `เข้าสู่ระบบผิดพลาด (รหัสผ่านไม่ถูกต้อง): ${userRecord.full_name}`, { userId, error: authError.message });
          throw authError;
        }
        await writeLog('INFO', 'AUTH', `ผู้ใช้เข้าระบบสำเร็จ: ${userRecord.full_name}`, { userId, method: 'Supabase Auth' }, { id: userRecord.id, name: userRecord.full_name });
        onLoginSuccess(userRecord);
        return;
      }

      // 3. If no email or not using Supabase Auth, try a custom RPC if it's hashed
      if (isHashed) {
        // Attempting a common RPC name
        const { data: isValid, error: rpcError } = await supabase.rpc('verify_user_password', {
          p_user_id: userId,
          p_password: password
        });

        if (rpcError) {
           console.error('RPC Error:', rpcError);
           // If RPC fails, maybe it's still a direct match? (unlikely but fallback)
           if (userRecord.sender_pass !== password) {
             writeLog('WARN', 'AUTH', `เข้าสู่ระบบผิดพลาด (RPC Error & รหัสผ่านผิด): ${userRecord.full_name}`, { userId });
             throw new Error('รหัสผ่านไม่ถูกต้อง');
           }
        } else if (!isValid) {
          writeLog('WARN', 'AUTH', `เข้าสู่ระบบผิดพลาด (รหัสผ่านไม่ถูกต้อง): ${userRecord.full_name}`, { userId });
          throw new Error('รหัสผ่านไม่ถูกต้อง');
        }
      } else {
        // Plain text check
        if (userRecord.sender_pass !== password) {
          writeLog('WARN', 'AUTH', `เข้าสู่ระบบผิดพลาด (รหัสผ่านธรรมดาผิด): ${userRecord.full_name}`, { userId });
          throw new Error('รหัสผ่านไม่ถูกต้อง');
        }
      }

      await writeLog('INFO', 'AUTH', `ผู้ใช้เข้าระบบสำเร็จ: ${userRecord.full_name}`, { userId, method: 'Direct Match' }, { id: userRecord.id, name: userRecord.full_name });
      onLoginSuccess(userRecord);
    } catch (err: any) {
      writeLog('WARN', 'AUTH', `ความพยายามในการเข้าสู่ระบบล้มเหลว`, { userId, errorOnCatch: err.message || err });
      setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setIsLoading(false);
    }
  };

  const disabled = isLoading || !userId || !password;

  return (
    <div className="min-h-screen login-bg-custom flex items-center justify-center p-8 sm:p-12 relative overflow-hidden font-thai">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-blue/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-brand-blue/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[640px] bg-white/30 backdrop-blur-[40px] rounded-[2.5rem] shadow-[0_30px_80px_-20px_rgba(15,45,82,0.1)] border border-white/60 p-2.5 flex flex-col md:flex-row gap-2.5 min-h-[400px] relative z-10"
      >
        {/* Left Side: Illustration & Info */}
        <div className="w-full md:w-[40%] p-5 lg:p-7 flex flex-col justify-between bg-white/20 backdrop-blur-[12px] border border-white/40 rounded-[1.75rem] relative overflow-hidden">
          {/* Inner Glow Overlay */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <h1 className="text-xl lg:text-2xl font-[900] text-[#0f172a] mb-0.5 tracking-tighter">ระบบส่งเวร</h1>
            <p className="text-brand-blue font-bold text-[11px] tracking-wide opacity-90 uppercase leading-none">Smart Medical Laboratory</p>
          </div>

          <div className="relative py-2 flex justify-center z-10">
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="w-full max-w-[150px]"
            >
               <MedtechIllustration className="w-full h-auto drop-shadow-[0_8px_20px_rgba(0,163,255,0.1)]" />
            </motion.div>
          </div>

          <div className="relative z-10 border-t border-white/40 pt-3">
            <p className="text-[#0f172a] font-black text-base">โรงพยาบาลสังขะ</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none mt-1">Sangkha Hospital</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 bg-white/95 backdrop-blur-[20px] p-5 lg:p-8 flex flex-col justify-center rounded-[1.75rem] border border-white shadow-sm">
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 text-[#94a3b8] hover:text-brand-blue transition-all mb-4 text-[11px] font-black uppercase tracking-widest group self-start"
          >
            <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-all border border-slate-100">
              <ChevronLeft size={12} />
            </div>
            กลับหน้าหลัก
          </button>

          <div className="mb-4">
            <h2 className="text-xl font-[900] text-[#0C2340] mb-0.5 tracking-tighter">เข้าสู่ระบบ</h2>
            <p className="text-[#94A3B8] text-[13px] font-semibold">เลือกชื่อและใส่รหัสผ่านของคุณ</p>

          </div>

          <form className="space-y-3.5" onSubmit={handleLogin}>
            <div>
              <label className="block text-[12px] sm:text-sm font-[900] text-[#374151] uppercase tracking-[0.2em] mb-1.5 ml-1">ชื่อพนักงาน</label>
              <Dropdown 
                options={users} 
                value={userId} 
                onChange={setUserId} 
              />
            </div>

            <div>
              <label className="block text-[12px] sm:text-sm font-[900] text-[#374151] uppercase tracking-[0.2em] mb-1.5 ml-1">รหัสผ่าน</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#FAFAFA] border-2 border-slate-200/60 rounded-xl px-4 py-2.5 text-sm sm:text-base font-black text-[#111827] focus:bg-white focus:border-brand-blue/40 focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all placeholder:text-slate-300"
                placeholder="••••••"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-2.5 bg-red-50/80 backdrop-blur-sm rounded-lg border border-red-100 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <p className="text-red-600 text-[11px] font-black">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={disabled}
              className="w-full bg-gradient-to-r from-brand-blue to-brand-dark text-white py-3 rounded-xl font-black text-sm shadow-[0_6px_12px_-3px_rgba(32,190,255,0.3)] hover:shadow-[0_10px_20px_-3px_rgba(32,190,255,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2.5 group"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  เข้าสู่ระบบ
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center pt-4 border-t border-slate-50/50">
            <p className="text-[#a4bdcf] text-[10px] font-black uppercase tracking-[0.15em]">
              Admin Login? <button type="button" onClick={onAdminClick} className="text-brand-blue hover:underline font-black outline-none transition-all">Click Here</button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
