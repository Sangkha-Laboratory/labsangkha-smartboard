import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ShieldAlert, 
  PhoneCall, 
  Activity, 
  Database, 
  ChevronRight, 
  ArrowLeft,
  Flame,
  Droplets,
  Heart,
  Settings,
  X,
  FileText,
  Monitor,
  Key,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { maskSensitiveData } from '../lib/maskUtils';

interface HandoverManualProps {
  onClose: () => void;
}

export default function HandoverManual({ onClose }: HandoverManualProps) {
  const [activeSubTab, setActiveSubTab] = useState<'web_guide' | 'sop' | 'pending' | 'qc'>('web_guide');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Database-driven properties for manual examples
  const [dbStats, setDbStats] = useState({ totalCount: 0, pendingCount: 0 });
  const [recentHandovers, setRecentHandovers] = useState<any[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const checkUser = () => {
      const localUser = localStorage.getItem('sangkha_handover_local_user');
      if (localUser) {
        setIsLoggedIn(true);
        return;
      }
      supabase.auth.getSession().then((res) => {
        const session = res?.data?.session ?? null;
        setIsLoggedIn(!!session);
      }).catch((err) => {
        console.warn("Failed to get session in HandoverManual:", err);
      });
    };
    checkUser();

    async function loadManualData() {
      try {
        setIsLoadingStats(true);
        // Get total handovers count
        const { count: total } = await supabase
          .from('handovers')
          .select('*', { count: 'exact', head: true });

        // Get pending handovers count
        const { count: pending } = await supabase
          .from('handovers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pending');

        setDbStats({
          totalCount: total || 0,
          pendingCount: pending || 0
        });

        // Get 3 recent handovers
        const { data: recent } = await supabase
          .from('handovers')
          .select('id, handover_date, division, category, title, description, status')
          .order('id', { ascending: false })
          .limit(3);

        if (recent) {
          setRecentHandovers(recent);
        }
      } catch (err) {
        console.warn('Error loading dynamic helper statistics for Manual:', err);
      } finally {
        setIsLoadingStats(false);
      }
    }
    loadManualData();
  }, []);

  return (
    <div className="bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen py-6 px-4 md:px-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2.2rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-64 bg-brand-light/20 dark:bg-brand-blue/5 rounded-full pointer-events-none -translate-y-12 translate-x-12" />
        
        <div className="flex flex-col md:flex-row items-center gap-5 relative z-10 text-center md:text-left">
          <button 
            type="button"
            onClick={onClose}
            className="w-11 h-11 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 hover:dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-250 border border-slate-200/50 dark:border-slate-800 transition cursor-pointer"
            title="ย้อนกลับหน้าหลัก"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">Manual & Guidelines</span>
            </div>
            <h2 className="text-xl md:text-2xl font-[900] text-[#0f2d52] dark:text-white tracking-tight font-thai">คู่มือระบบส่งต่อเวรกลุ่มงานเทคนิคการแพทย์</h2>
            <p className="text-sm text-slate-500 dark:text-slate-450 font-bold mt-1 font-thai leading-relaxed">
              คู่มือขั้นตอนคู่ขนานกับการใช้งานระบบเว็บไซต์และขั้นตอนมาตรฐานส่งเวรกลุ่มงานเทคนิคการแพทย์
            </p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full md:w-auto h-11 px-6 bg-brand-blue hover:bg-brand-dark hover:scale-[1.01] text-white rounded-2xl text-sm font-black shadow-lg shadow-brand-blue/20 transition-all flex items-center justify-center gap-2 cursor-pointer border border-transparent"
        >
          <CheckCircle size={15} />
          <span>ทำความเข้าใจแล้ว / กลับสู่หน้าหลัก</span>
        </button>
      </div>

      {/* Main Content Area Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        
        {/* Sidebar Navigations */}
        <aside className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-4 flex flex-col gap-1 shadow-sm sticky top-24">
          <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-3 mb-2">สารบัญคู่มือ / TOPICS</p>
          
          <button
            onClick={() => setActiveSubTab('web_guide')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-black text-left transition-all relative overflow-hidden font-thai ${
              activeSubTab === 'web_guide' 
                ? 'bg-brand-light dark:bg-brand-blue/10 text-brand-blue border border-brand-blue/20' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850/50 hover:text-brand-blue border border-transparent'
            }`}
          >
            <Monitor size={16} />
            <div className="flex-1">
              <p className="leading-none mb-0.5">คู่มือการใช้งานเว็บไซต์</p>
              <p className="text-xs text-slate-400 leading-none font-bold">Web Application Guide</p>
            </div>
            {activeSubTab === 'web_guide' && <ChevronRight size={14} className="text-brand-blue" />}
          </button>

          <button
            onClick={() => setActiveSubTab('sop')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-black text-left transition-all relative overflow-hidden font-thai ${
              activeSubTab === 'sop' 
                ? 'bg-brand-light dark:bg-brand-blue/10 text-brand-blue border border-brand-blue/20' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850/50 hover:text-brand-blue border border-transparent'
            }`}
          >
            <Clock size={16} />
            <div className="flex-1">
              <p className="leading-none mb-0.5">ขั้นตอนมาตรฐานส่งเวร</p>
              <p className="text-xs text-slate-400 leading-none font-bold">Standard SOP Sequence</p>
            </div>
            {activeSubTab === 'sop' && <ChevronRight size={14} className="text-brand-blue" />}
          </button>

          <button
            onClick={() => setActiveSubTab('pending')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-black text-left transition-all relative overflow-hidden font-thai ${
              activeSubTab === 'pending' 
                ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850/50 hover:text-indigo-600 border border-transparent'
            }`}
          >
            <FileText size={16} />
            <div className="flex-1">
              <p className="leading-none mb-0.5">การระบุบันทึกงานค้าง</p>
              <p className="text-xs text-slate-400 leading-none font-bold">Pending Cases Logging</p>
            </div>
            {activeSubTab === 'pending' && <ChevronRight size={14} className="text-indigo-500" />}
          </button>

          <button
            onClick={() => setActiveSubTab('qc')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-black text-left transition-all relative overflow-hidden font-thai ${
              activeSubTab === 'qc' 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850/50 hover:text-emerald-600 border border-transparent'
            }`}
          >
            <Activity size={16} />
            <div className="flex-1">
              <p className="leading-none mb-0.5">ความพร้อมเครื่องมือ & QC</p>
              <p className="text-xs text-slate-400 leading-none font-bold">Analyzer & IQC checklist</p>
            </div>
            {activeSubTab === 'qc' && <ChevronRight size={14} className="text-emerald-500" />}
          </button>
        </aside>

        {/* Content View Panel */}
        <div className="flex-1 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* 1. SOP TAB PANEL */}
            {activeSubTab === 'sop' && (
              <motion.div 
                key="sop"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 md:p-8 space-y-6 shadow-sm"
              >
                <div>
                  <h3 className="text-xl font-black text-[#0f2d52] dark:text-white mb-1.5 font-thai flex items-center gap-2">
                    <Clock className="text-brand-blue" size={20} />
                    <span>ขั้นตอนมาตรฐาน SOP ส่งเวรงานปฏิบัติการ</span>
                  </h3>
                  <p className="text-sm text-slate-400 font-bold leading-relaxed">แนวปฏิบัติการรับ-ส่งต่อเวรสำหรับเจ้าหน้าที่เทคนิคการแพทย์ช่วงเหลื่อมเวร (30 นาทีก่อนหมดผลัด)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/30 dark:bg-slate-900/50">
                    <div className="text-xs font-bold text-slate-400">ขอบเขตที่ 1</div>
                    <h4 className="font-extrabold text-[#0f2d52] dark:text-slate-200 text-sm sm:text-base font-thai">เตรียมความพร้อมก่อนหมดเวร</h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed font-semibold font-thai">
                      ตรวจสอบและรายงานผลตรวจห้องกู้ชีพ (ER), หอผู้ป่วยวิกฤต (ICU) และผลด่วนที่ค้างทั้งหมด บันทึกรายชื่อคนไข้และประวัติค้างส่งในส่วนของเมนู Pending Cases เพื่อให้เวรถัดไปตามงานและส่งต่อได้ไร้รอยต่อ
                    </p>
                  </div>

                  <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/30 dark:bg-slate-900/50">
                    <div className="text-xs font-bold text-slate-400">ขอบเขตที่ 2</div>
                    <h4 className="font-extrabold text-[#0f2d52] dark:text-slate-200 text-sm sm:text-base font-thai">บันทึกสถิติและสถานะรวม</h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed font-semibold font-thai">
                      ทำสถิติสิ่งส่งตรวจในเวร คลังเลือดสำรอง ยืนยันผลระดับการทดสอบควบคุมคุณภาพ (IQC) และสารตรวจวิเคราะห์ บิดคอร์สการทำงานเครื่องวิเคราะห์อัตโนมัติประจำวันพร้อมเขียนบันทึกอุปสรรคหรือประเด็นประสานงานทางแพทย์
                    </p>
                  </div>

                  <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/30 dark:bg-slate-900/50">
                    <div className="text-xs font-bold text-slate-400">ขอบเขตที่ 3</div>
                    <h4 className="font-extrabold text-[#0f2d52] dark:text-slate-200 text-sm sm:text-base font-thai">ประชุมสั้นและลงนามจริง</h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed font-semibold font-thai">
                      ผู้ส่งและผู้รับเวรทำการประชุมทบทวนเคสสำคัญสั้นๆ (Handoff Huddle) ตรวจสอบความสอดคล้องของเอกสารข้อมูลเลือดและสิ่งส่งตรวจอันตราย จากนั้นร่วมลงนามดิจิทัลบนเว็บบทระบบเพื่อเป็นหลักฐานความรับผิดชอบ
                    </p>
                  </div>
                </div>

                {/* 📊 Live Database Metrics & Compliance Samples */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 bg-slate-50/50 dark:bg-slate-950/20">
                  <div className="md:col-span-1 flex flex-col justify-between p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl space-y-3 relative overflow-hidden">
                    <div>
                      <span className="text-slate-450 text-xs font-bold uppercase tracking-wider">Live DB Sync</span>
                      <h4 className="font-extrabold text-[#0f2d52] dark:text-slate-200 text-sm sm:text-base font-thai mt-2">สถิติสะสมในระบบจริง</h4>
                    </div>
                    
                    {isLoadingStats ? (
                      <div className="h-10 w-full animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg" />
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-center py-2">
                        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl">
                          <p className="text-xs text-slate-400 font-bold">ส่งมอบแล้วทั้งสิ้น</p>
                          <p className="text-2xl font-black text-brand-blue">{dbStats.totalCount}</p>
                          <p className="text-xs text-slate-400 font-semibold uppercase font-mono">Total</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl">
                          <p className="text-xs text-slate-400 font-bold">เวรค้างรอรับมอบ</p>
                          <p className="text-2xl font-black text-amber-500">{dbStats.pendingCount}</p>
                          <p className="text-xs text-slate-400 font-semibold uppercase font-mono">Pending</p>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed font-thai">
                      * ข้อมูลสถิติคำนวณสดจากตาราง `handovers` ของระบบฐานข้อมูลกลางโรงพยาบาลรพ.สังขะ
                    </p>
                  </div>

                  <div className="md:col-span-2 p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <h4 className="font-extrabold text-[#0f2d52] dark:text-slate-200 text-sm sm:text-base font-thai flex items-center gap-1.5">
                        <Database className="text-brand-blue" size={15} />
                        <span>ตัวอย่างหัวข้อส่งมอบเวรจริงตามเวลาจริง (Approved Compliance Examples)</span>
                      </h4>
                      <span className="text-xs font-black text-slate-400">ล่าสุด 3 รายการ</span>
                    </div>

                    {isLoadingStats ? (
                      <div className="space-y-2">
                        <div className="h-10 bg-slate-50 dark:bg-slate-850 rounded-lg animate-pulse" />
                        <div className="h-10 bg-slate-50 dark:bg-slate-850 rounded-lg animate-pulse" />
                      </div>
                    ) : recentHandovers.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 font-bold">ยังไม่มีข้อมูลรายการส่งมอบเวรในระบบฐานข้อมูล</div>
                    ) : (
                      <div className="space-y-2.5">
                        {recentHandovers.map((item, idx) => (
                          <div key={item.id || idx} className="p-2.5 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-brand-blue/30 dark:hover:border-brand-blue/20 transition-all text-xs font-medium font-thai bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 dark:text-slate-500 text-xs font-bold font-mono uppercase tracking-wide">
                                  [{item.division || 'LAB'}]
                                </span>
                                <span className="text-[#0f2d52] dark:text-white font-extrabold text-sm truncate max-w-[150px] sm:max-w-[280px]">
                                  {maskSensitiveData(item.title, isLoggedIn)}
                                </span>
                              </div>
                              <span className="text-xs text-slate-400 font-semibold font-mono">{item.handover_date}</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed truncate">
                              {maskSensitiveData(item.description || '', isLoggedIn) || "ไม่มีรายละเอียดประกอบ"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Important SOP Bullet Guidelines */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-805 rounded-2xl p-5 space-y-3.5">
                  <h4 className="font-black text-sm text-[#0f2d52] dark:text-slate-250 font-thai flex items-center gap-1.5">
                    <ShieldAlert className="text-amber-500" size={16} />
                    <span>โปรโตคอลความปลอดภัยขั้นสูงสุดในการส่งเวร (Critical Protocols)</span>
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-bold font-thai text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 mt-1.5" />
                      <span>ห้ามส่งเวรด้วยวาจาเพียงอย่างเดียวโดยเด็ดขาด (No Verbal-Only Handovers) ต้องบันทึกเข้าสู่ระบบ เผื่อมีอุบัติการณ์ย้อนหลัง</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 mt-1.5" />
                      <span>ระบบส่งเวรนี้เป็นอิสระ (Independent) จากระบบ HIS LIS หากระบบเครือข่ายล่ม ให้เข้าใช้งานผ่านอินเทอร์เน็ตสมาร์ทโฟน/อุปกรณ์เคลื่อนที่ได้ทันทีเพื่อส่งมอบเวร</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 mt-1.5" />
                      <span>หลีกเลี่ยงการส่งต่อสิ่งส่งตรวจวิกฤตที่เตรียมสไลด์หรือย้อมสียังไม่เรียบร้อย เว้นแต่จะระบุผู้รับผิดชอบดำเนินการและตรวจต่อไว้อย่างชัดแจ้ง</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 mt-1.5" />
                      <span>การดูแลคลังเลือดสำรองในคลัง ธนาคารเลือดส่วนกลางต้องมีสต็อกโลหิตพื้นฐานสำหรับเคสผ่าตัดฉุกเฉิน (PRC) อย่างน้อยหมู่น้องละ 5 ยูนิตตลอดเวลา</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}

            {/* 2. WEB APPLICATION USE GUIDE TAB PANEL */}
            {activeSubTab === 'web_guide' && (
              <motion.div 
                key="web_guide"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 md:p-8 space-y-6 shadow-sm"
              >
                <div>
                  <h3 className="text-xl font-black text-[#0f2d52] dark:text-white mb-1.5 font-thai flex items-center gap-2">
                    <Monitor className="text-brand-blue" size={20} />
                    <span>คู่มือแนะนำการใช้งานระบบส่งเวรออนไลน์</span>
                  </h3>
                  <p className="text-sm text-slate-400 font-bold leading-relaxed">แนวทางการใช้งานฟีเจอร์หลักบนแพลตฟอร์มเพื่อการสื่อสารและส่งต่อเวรที่มีประสิทธิภาพสูงสุด</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Step 1: Authentication */}
                  <div className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3 font-thai bg-slate-50/30 dark:bg-slate-900/40">
                    <h4 className="font-extrabold text-[#0f2d52] dark:text-slate-250 text-sm sm:text-base flex items-center gap-2">
                      <span className="text-slate-400 font-bold">ขั้นตอนที่ 1 :</span>
                      <span>การเข้าสู่ระบบและระบุตัวตน (Authentication & Personal Account)</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">
                      เจ้าหน้าที่เทคนิคการแพทย์ทุกคนต้องเข้าใช้ระบบด้วยบัญชีสิทธิ์ส่วนฐานข้อมูลโรงพยาบาล ระบบจะจดจำประวัติผู้ลงชื่อ (Logged-in Practitioner) เพื่อความถูกต้องของกฎหมายเวชระเบียนแบบดิจิทัล
                    </p>
                    <ul className="text-xs text-slate-500 font-bold space-y-1.5 pl-4 list-disc">
                      <li>สลับบทบาทหน้า Portal (หัวหน้าเวร Admin / เจ้าหน้าที่เวร User)</li>
                      <li>สัญลักษณ์แจ้งเตือนมุมบนของระบบจะระบุชื่อผู้ปฏิบัติหน้าที่ปัจจุบัน</li>
                      <li>ระบบมีกลไกเซสชันอัตโนมัติเพื่อป้องกันการสวมรอยบุคคล</li>
                    </ul>
                  </div>

                  {/* Step 2: Creating forms */}
                  <div className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3 font-thai bg-slate-50/30 dark:bg-slate-900/40">
                    <h4 className="font-extrabold text-[#0f2d52] dark:text-slate-250 text-sm sm:text-base flex items-center gap-2">
                      <span className="text-slate-400 font-bold">ขั้นตอนที่ 2 :</span>
                      <span>การบันทึกฟอร์มส่งเวร (Recording New Handover)</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">
                      คลิกปุ่ม "เขียนฟอร์มส่งเวร" เพื่อกรอกเอกสารสรุปรอบผลัด โดยบันทึกข้อมูลสำคัญทีละส่วนในจุดเดียวอย่างครบวงจร:
                    </p>
                    <ul className="text-xs text-slate-500 font-bold space-y-1.5 pl-4 list-disc">
                      <li><strong>หัวข้อส่งเวร & รายละเอียด:</strong> สรุปเหตุการณ์ภาพรวมหลัก</li>
                      <li><strong>ฝ่าย / แผนก:</strong> เลือกประเภทงาน เช่น Central Lab, Blood Bank, ฯลฯ</li>
                      <li><strong>ระบุงานค้างส่งต่อ:</strong> ใส่ชื่อคนไข้และรายการแล็บที่ยังไม่เรียบร้อย</li>
                      <li><strong>เช็กสถานภาพเครื่องตรวจ:</strong> ติ๊กเลือกสถานะ QC เครื่องวิเคราะห์ประจำวัน</li>
                    </ul>
                  </div>

                  {/* Step 3: Checking and Digital Signatures */}
                  <div className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3 font-thai bg-slate-50/30 dark:bg-slate-900/40">
                    <h4 className="font-extrabold text-[#0f2d52] dark:text-slate-250 text-sm sm:text-base flex items-center gap-2">
                      <span className="text-slate-400 font-bold">ขั้นตอนที่ 3 :</span>
                      <span>การตรวจสอบและลงนามรับงาน (Audit & Digital Sign-off)</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">
                      เมื่อผู้ส่งเวรบันทึกฟอร์มเสร็จสิ้น ข้อมูลจะปรากฏในตาราง "ประวัติรายการเวร" ด้วยสถานะ Pending (รอรับมอบ)
                    </p>
                    <ol className="text-xs text-slate-500 font-bold space-y-1.5 pl-4 list-decimal">
                      <li>ผู้รับเวรคนใหม่คลิกเข้าไปที่ปุ่ม <strong>"ตรวจสอบรายการ"</strong></li>
                      <li>ทบทวนรายละเอียดและตรวจสอบสถานะเครื่องแล็บ อุปกรณ์และงานค้างต่อหน้า</li>
                      <li>หากสมบูรณ์แล้ว ให้กดปุ่ม <strong>"ลงชื่อยืนยันรับเวร (Digital Signature)"</strong> เพื่อเปลี่ยนสถานะเป็น Completed</li>
                    </ol>
                  </div>

                  {/* Step 4: Admin controls and global announcements */}
                  <div className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3 font-thai bg-slate-50/30 dark:bg-slate-900/40">
                    <h4 className="font-extrabold text-[#0f2d52] dark:text-slate-250 text-sm sm:text-base flex items-center gap-2">
                      <span className="text-slate-400 font-bold">ขั้นตอนที่ 4 :</span>
                      <span>ระบบประชาสัมพันธ์และตัวตรวจสอบความหนาแน่นทีม</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">
                      หน้าแรกของแอปพลิเคชันมาพร้อมระบบติดตามและแจ้งเตือนทันด่วน เพื่อช่วยให้การทำงานไร้รอยต่อ
                    </p>
                    <ul className="text-xs text-slate-500 font-bold space-y-1.5 pl-4 list-disc">
                      <li><strong>แถบความแจ้งเตือนด่วน (Announcement Bar):</strong> ข้อตกลงพิเศษหรือกระดานข่าวสั้นระบุขอบเขตความเสี่ยง</li>
                      <li><strong>ประวัติส่งต่อเวรย้อนหลัง:</strong> ตัวกรองช่วงวันที่เพื่อค้นหาหรือค้นหาพล็อตเอกสารเก่า</li>
                      <li><strong>สถิติตัวสรุป Dashboard:</strong> สรุปอัตราส่วนส่งมอบ-รอประเมิน เพื่อกระตุ้นยอดสะสางให้เป็น 0</li>
                    </ul>
                  </div>
                </div>

                {/* Platform Policy Tip */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-start gap-4 text-sm font-thai font-bold">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl shrink-0">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-[#0f2d52] dark:text-slate-250 text-sm sm:text-base mb-1">คำแนะนำเสถียรภาพฐานข้อมูล</h5>
                    <p className="text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">
                      ระบบบันทึกความคืบหน้าแบบ Realtime เชื่อมโยงสู่ตารางของโรงพยาบาลโดยตรง ทุกครั้งหลังกดยืนยันบันทึกหรือทำลายการส่งมอบ ข้อมูลจะถูก Sync ไปยังระบบส่วนกลางทันที โปรดหลีกเลี่ยงการเปิดทำแบบฟอร์มค้างไว้พร้อมกันหลายแท็บเบราว์เซอร์ เพื่อความปลอดภัยของข้อมูล
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. PENDING CASES MANAGEMENT */}
            {activeSubTab === 'pending' && (
              <motion.div 
                key="pending"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 md:p-8 space-y-6 shadow-sm"
              >
                <div>
                  <h3 className="text-xl font-black text-[#0f2d52] dark:text-white mb-1.5 font-thai flex items-center gap-2">
                    <FileText className="text-indigo-500" size={20} />
                    <span>การประสานการจัดการงานค้างตารางเวร (Pending Case Protocol)</span>
                  </h3>
                  <p className="text-sm text-slate-400 font-bold leading-relaxed">แนวปฏิบัติการระบุงาน และการบันทึกเมื่อมีเคสตกตรายที่รอผลตรวจหรือส่งต่อภายนอก</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3 font-thai">
                    <h4 className="font-extrabold text-[#0f2d52] dark:text-white text-sm sm:text-base flex items-center gap-2">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                      <span>นิยามและเงื่อนไขการระบุ "งานค้างส่งเวร"</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">
                      งานค้าง หมายถึง สิ่งส่งตรวจที่ได้รับเข้าระบบห้องปฏิบัติการแล้ว แต่ยังไม่สามารถทำการออกรายงานผลตรวจอย่างสมบูรณ์ได้ทันการหมดเวร 
                      เนื่องจากความจำเป็นทางวิชาการ เช่น การเพาะเชื้อซ้ำ (Reculture), รอทำคู่อันดับโลหิต (Blood Crossmatching), และวิเคราะห์สิ่งส่งตรวจพิเศษเกล็ดเลือดภายนอก ฯลฯ
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 text-xs sm:text-sm">
                      <span className="font-extrabold block text-slate-800 dark:text-slate-200 mb-1">สิ่งที่คุณต้องระบุในช่อง 'งานคงค้างวิกฤต' ในฟอร์ม:</span>
                      <ol className="list-decimal list-inside space-y-1.5 text-slate-500 font-bold dark:text-slate-400">
                        <li>ชื่อคุณคนไข้และห้องประทับตัวอย่าง</li>
                        <li>ประเภทตั๋ว และรายการตรวจประเมิน</li>
                        <li>สาเหตุที่ล่าช้าและแผนความคืบหน้าถัดไป</li>
                      </ol>
                    </div>
                  </div>

                  <div className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3 font-thai">
                    <h4 className="font-extrabold text-[#0f2d52] dark:text-white text-sm sm:text-base flex items-center gap-2">
                      <span className="w-2 h-2 bg-violet-500 rounded-full" />
                      <span>การจัดการสิ่งส่งตรวจส่งต่อภายนอก (Reference Lab)</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">
                      สิ่งส่งตรวจเวชศาสตร์เคมีหรือพยาธิย่อยที่ไม่ได้เปิดให้บริการตรวจ ณ โรงพยาบาลสังขะ จะต้องจัดเตรียมรักษาอุณหภูมิและผนึกตัวอย่างเพื่อส่งวิเคราะห์ต่อยังแล็บเครือข่ายภายนอก (เช่น ศูนย์ชลบุรี, ขอนแก่นแล็บมาร์เก็ต หรือโรงพยาบาลสุรินทร์)
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 text-xs sm:text-sm">
                      <span className="font-extrabold block text-slate-800 dark:text-slate-200 mb-1">กฎเหล็กความปลอดภัย (External Referrals):</span>
                      <p className="text-slate-500 font-bold dark:text-slate-400 leading-relaxed">
                        เจ้าหน้าที่ผู้ส่งตั๋วต้องทำการตรวจสอบบาร์โค้ดระบุเอกสารรหัสผ่าน (Ticket ID/R-Number) ในระบบส่งเวรนี้อย่างถูกต้อง 
                        และตรวจสอบอุณหภูมิกระติกขนส่งรักษาที่ 2-8 °C เฝ้าระวังสัญญาณการจัดเก็บเพื่อเสี่ยงตัวอย่างเสื่อมสภาพ
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. ANALYZERS AND QUALITY CONTROL */}
            {activeSubTab === 'qc' && (
              <motion.div 
                key="qc"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 md:p-8 space-y-6 shadow-sm"
              >
                <div>
                  <h3 className="text-xl font-black text-[#0f2d52] dark:text-white mb-1.5 font-thai flex items-center gap-2">
                    <Activity className="text-emerald-500 animate-pulse" size={20} />
                    <span>แนวทางการบำรุงรักษาเครื่องมือวิเคราะห์ และควบคุมคุณภาพ (IQC Check)</span>
                  </h3>
                  <p className="text-sm text-slate-400 font-bold leading-relaxed">กระบวนการตรวจสอบค่ามาตรฐานความพร้อมตรวจก่อนส่งเวรกลุ่มเทคนิคการแพทย์</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-4">
                    <h4 className="font-extrabold text-[#0f2d52] dark:text-white text-sm sm:text-base font-thai flex items-center gap-2">
                      <Settings className="text-emerald-600 dark:text-emerald-450" size={16} />
                      <span>รายการเครื่องมือหลักและลำดับควบคุม (Main Analyzers Checklist)</span>
                    </h4>
                    
                    <ul className="space-y-2.5 text-sm font-bold font-thai text-slate-600 dark:text-slate-400">
                      <li className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-[#0f2d52] dark:text-white font-extrabold leading-none mb-1">เครื่องวิเคราะห์โลหิตวิทยา (CBC Analyzer)</p>
                          <p className="text-xs text-slate-500 dark:text-slate-450 leading-none mt-1">ทำความสะอาดสปิลล์เวย์, ตรวจเช็กปริมาณน้ำยา Diluent / Reagent เหลือ &gt; 20%</p>
                        </div>
                      </li>
                      <li className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-[#0f2d52] dark:text-white font-extrabold leading-none mb-1">เครื่องวิเคราะห์เคมีคลินิก (Clinical Chemistry Analyzer)</p>
                          <p className="text-xs text-slate-500 dark:text-slate-450 leading-none mt-1">ล้างถ้วยควบคุมปฏิกิริยา (Cuvette Wash), ตรวจเช็กระบบน้ำกลั่นระดับความสะอาดสูง</p>
                        </div>
                      </li>
                      <li className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-[#0f2d52] dark:text-white font-extrabold leading-none mb-1">ตู้แช่เก็บโลหิตและตัวทำละลาย (Blood Fridge & Reagents)</p>
                          <p className="text-xs text-slate-500 dark:text-slate-450 leading-none mt-1">บันทึกระดับอุณหภูมิควบคุม (ต้องการ 2 ~ 6 °C) เฝ้าระวังระบบแจ้งเตือนฉุกเฉิน</p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-4 font-thai">
                    <h4 className="font-extrabold text-[#0f2d52] dark:text-white text-sm sm:text-base font-thai flex items-center gap-2">
                      <Database className="text-emerald-600 dark:text-emerald-450" size={16} />
                      <span>สถานะการควบคุมคุณภาพภายใน (IQC Protocol)</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">
                      เมื่อเริ่มทำเวรและก่อนปิดสถิติผู้ส่งตัวรอบเวร จะต้องยืนยันผลการควบคุมคุณภาพ (Internal Quality Control) ว่าผลผ่านตามกฎมาตรฐาน (Westgard Multi-rules) หากมีสารเคมีตรวจวิเคราะห์ตัวใดหลุดเกณฑ์ (+2SD, +3SD หรือ R4S) ให้ระบุเหตุการณ์การปรับแต่ง (Calibration/Maintenance) และการประดับผลไว้ในช่องหมายเหตุส่งเวรทันที
                    </p>
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-450 leading-relaxed">
                      💡 คำแนะนำ: "การบันทึกสถานะ IQC" อย่างเป็นระบบ ช่วยป้องกันอุบัติการณ์ผลคลาดเคลื่อนทางการแพทย์และปกป้องทางกฎหมายแก่ผู้ปฏิบัติหน้าที่ทุกท่าน
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
