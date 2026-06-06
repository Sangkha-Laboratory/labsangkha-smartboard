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

      {/* Main Content Area */}
      <div className="flex-1 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 md:p-8 space-y-6 shadow-sm">
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
        </div>
      </div>

    </div>
  );
}
