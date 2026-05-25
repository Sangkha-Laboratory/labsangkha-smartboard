import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Mail, ArrowRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminLoginProps {
  onLoginSuccess: (user: any) => void;
  onBack: () => void;
}

export default function AdminLogin({ onLoginSuccess, onBack }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Verify if the user is actually an admin in our users table
      const { data: userRecord, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('role', 'admin')
        .single();

      if (dbError || !userRecord) {
        // If not found in users table or not admin, sign out to be safe
        await supabase.auth.signOut();
        throw new Error('คุณไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบ');
      }

      onLoginSuccess(userRecord);
    } catch (err: any) {
      setError(err.message || 'การเข้าสู่ระบบล้มเหลว');
    } finally {
      setIsLoading(false);
    }
  };

  const disabled = isLoading || !email || !password;

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
        {/* Left Side: Admin Identity */}
        <div className="w-full md:w-[40%] p-5 lg:p-7 flex flex-col justify-between bg-white/20 backdrop-blur-[12px] border border-white/40 rounded-[1.75rem] relative overflow-hidden">
          {/* Inner Glow Overlay */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <h1 className="text-lg lg:text-xl font-[900] text-[#0f172a] mb-0.5 tracking-tighter">Admin Portal</h1>
            <p className="text-brand-blue font-bold text-[9px] tracking-wide opacity-90 uppercase leading-none">Administration & Security</p>
          </div>

          <div className="relative py-2 flex justify-center z-10">
            <motion.div
              initial={{ y: 15, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="w-20 h-20 bg-gradient-to-tr from-brand-blue to-brand-dark rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-blue/30 rotate-3 transform hover:rotate-0 transition-transform duration-500"
            >
               <ShieldCheck size={40} className="text-white" />
            </motion.div>
          </div>

          <div className="relative z-10 border-t border-white/40 pt-3">
            <p className="text-[#0f172a] font-black text-sm">โรงพยาบาลสังขะ</p>
            <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest leading-none mt-1">Sangkha Hospital Admin</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 bg-white/95 backdrop-blur-[20px] p-5 lg:p-8 flex flex-col justify-center rounded-[1.75rem] border border-white shadow-sm">
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 text-[#94a3b8] hover:text-brand-blue transition-all mb-4 text-[9px] font-black uppercase tracking-widest group self-start"
          >
            <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-all border border-slate-100">
              <ChevronLeft size={12} />
            </div>
            กลับหน้าหลัก
          </button>

          <div className="mb-4">
            <h2 className="text-lg font-[900] text-[#0C2340] mb-0.5 tracking-tighter">ยินดีต้อนรับ แอดมิน</h2>
            <p className="text-[#94A3B8] text-[11px] font-semibold">Authenticate to access the dashboard</p>
          </div>

          <form className="space-y-3.5" onSubmit={handleLogin}>
            <div>
              <label className="block text-[10px] sm:text-xs font-[900] text-[#374151] uppercase tracking-[0.2em] mb-1.5 ml-1">E-mail Address</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={14} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#FAFAFA] border-2 border-slate-200/60 rounded-xl pl-11 pr-4 py-2.5 text-xs sm:text-sm font-black text-[#111827] focus:bg-white focus:border-brand-blue/40 focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all placeholder:text-slate-300"
                  placeholder="Email"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] sm:text-xs font-[900] text-[#374151] uppercase tracking-[0.2em] mb-1.5 ml-1">Password</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={14} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#FAFAFA] border-2 border-slate-200/60 rounded-xl pl-11 pr-4 py-2.5 text-xs sm:text-sm font-black text-[#111827] focus:bg-white focus:border-brand-blue/40 focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-2.5 bg-red-50/80 backdrop-blur-sm rounded-lg border border-red-100 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <p className="text-red-600 text-[9px] font-black">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={disabled}
              className="w-full bg-gradient-to-r from-brand-blue to-brand-dark text-white py-3 rounded-xl font-black text-xs shadow-[0_6px_12px_-3px_rgba(32,190,255,0.3)] hover:shadow-[0_10px_20px_-3px_rgba(32,190,255,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2.5 group"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  เข้าสู่ระบบแอดมิน
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center pt-4 border-t border-slate-50/50">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-60">
              โรงพยาบาลสังขะ กลุ่มงานเทคนิคการแพทย์
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
