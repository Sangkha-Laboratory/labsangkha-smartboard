import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  Key, 
  CheckCircle, 
  AlertTriangle, 
  FileCheck, 
  ArrowLeft, 
  EyeOff, 
  NotebookTabs,
  Heart,
  UserCheck,
  Building,
  Layers,
  HelpCircle,
  Database,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

interface SafetyPolicyProps {
  onClose: () => void;
}

interface SafetyItem {
  id: string;
  title: string;
  description: string;
  badge: string;
  badgeStyle: string;
  checks: string[];
}

const SAFETY_PROTOCOLS: SafetyItem[] = [
  {
    id: 'sec-1',
    title: 'นโยบายคุ้มครองข้อมูลส่วนบุคคลคนไข้ (PDPA Compliance)',
    description: 'การควบคุมดูแล จัดเก็บ และส่งต่อข้อมูลประวัติการรักษา ผลตรวจทางห้องปฏิบัติการอย่างเข้มงวดที่สุดตามมาตรฐานกฎหมายเพื่อสิทธิคนไข้',
    badge: 'ความสำคัญสูงสุด',
    badgeStyle: 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800',
    checks: [
      'ห้ามเปิดเผยข้อมูลผลตรวจ (Lab Results) แก่บุคคลภายนอกหรือผู้ไม่มีส่วนเกี่ยวข้องในการรักษาพยาบาลทุกกรณี',
      'การประสานงานเคสผ่านโทรศัพท์ ต้องทวนสอบยืนยัน เลขประจำตัวผู้ป่วย (HN) และชื่อ-นามสกุลจริงเสมอ ห้ามแจ้งผลลอย',
      'การบันทึกภาพหน้าจอหรือรายงาน ห้ามจับภาพให้เห็นชื่อแบรนด์หรือสแกนบัตรประชาชนคนไข้โดยไม่ทำการเบลอ/พรางข้อมูลสำคัญ',
      'ลบไฟล์รูปภาพเอกสารสิ่งส่งตรวจหรือบันทึกชั่วคราวออกจากเครื่องมือสื่อสารส่วนตัวทันทีเมื่อเสร็จสิ้นภารกิจประจำเวร'
    ]
  },
  {
    id: 'sec-2',
    title: 'แนวทางความปลอดภัยทางคลินิก (Clinical Safety & Double-Check)',
    description: 'โปรโตคอลการตรวจสอบความถูกต้องการจับคู่ตัวอย่างกับข้อมูลผู้ป่วยเพื่อขจัดอุบัติการณ์ผลคลาดเคลื่อนหรือติดป้ายชื่อสลับกัน',
    badge: 'แนวทางคลินิก',
    badgeStyle: 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800',
    checks: [
      'กระบวนการ 2-Identifier ตรวจสอบชื่อ-นามสกุล และ HN บนหลอดเก็บตัวอย่างและใบสั่งตรวจให้สอดคล้องกันตรงจุด',
      'หากพบสิ่งส่งตรวจมีลักษณะไม่เหมาะสม (เช่น Hemolysis รุนแรง, เลือดแข็งตัวในหลอดต้านการแข็ง, ปริมาตรไม่พอ) ต้องประสาน REJECT และขอเจาะใหม่ทันที',
      'ควบคุมการบันทึกเมื่อได้รับตัวอย่างวิกฤต (Critical Specimen) เช่น น้ำไขสันหลัง, ชิ้นเนื้อส่งตรวจเร่งด่วน โดยต้องมีผู้เซ็นกำกับ 2 ท่าน',
      'บันทึกตารางการควบคุมคุณภาพภายใน (IQC) ของวันอย่างสม่ำเสมอ หากเครื่องหลุดกฎห้ามดึงดันการประมวลผลสิ่งส่งตรวจของคนไข้'
    ]
  },
  {
    id: 'sec-3',
    title: 'การรักษาความปลอดภัยระบบและรหัสผ่าน (LIS Access Security)',
    description: 'กฎความปลอดภัยทางไซเบอร์เพื่อพิทักษ์ความลับในการบันทึกข้อมูลและป้องกันการสวมรอยหรือการกระทำโดยไม่ได้รับอนุญาต',
    badge: 'ความคงอยู่ของระบบ',
    badgeStyle: 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800',
    checks: [
      'ห้ามใช้บัญชีสำหรับลงชื่อร่วมกัน (Shared Accounts) เจ้าหน้าที่แต่ละท่านต้องใช้รหัสผ่านบุคคลของตนเองเพื่อบันทึกประวัติการกระทำ',
      'ทำการล็อกหน้าจอคอมพิวเตอร์หน้าเครื่องวิเคราะห์อัตโนมัติทุกครั้งเมื่อห่างจากโต๊ะเพื่อป้องกันการเข้าบัญชี LIS โดยไม่ได้รับอนุญาต',
      'เปลี่ยนรหัสผ่านผู้ใช้งานในระบบส่งเวรนี้ทุก ๆ 3 เดือน และกดออกจากระบบ (Log out) ทุกครั้งหลังเสร็จภารกิจเพื่อความปลอดภัยสูงสุด',
      'ห้ามติดตั้งซอฟต์แวร์หรือเชื่อมต่ออุปกรณ์อื่นใดภายนอกที่ไม่มีใบรับรองความปลอดภัยเข้ากับเน็ตเวิร์กห้องปฏิบัติการ'
    ]
  },
  {
    id: 'sec-4',
    title: 'มาตรการรับมือเมื่อเกิดเหตุฉุกเฉินและระบบควบคุมระดับภัย (Incident Escalation)',
    description: 'ขั้นตอนการรายงานเหตุขัดข้องทางระบบสารสนเทศ และการแยกแยะขอบเขตภารกิจของระบบส่งเวรโรงพยาบาลสังขะ',
    badge: 'ระบบขัดข้อง & ขอบเขตงาน',
    badgeStyle: 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800',
    checks: [
      'กรณีระบบอินเทอร์เน็ตโรงพยาบาลล่ม หรือคอมพิวเตอร์พัง: ระบบส่งเวรนี้เป็นอิสระ (Independent) ให้เจ้าหน้าที่ใช้เน็ตมือถือผ่านสมาร์ทโฟน/แท็บเล็ตส่งต่อเวรได้ปกติ',
      'การจัดการข้อมูลบาร์โค้ดคนไข้สูญหาย คลาดเคลื่อน หรือการรายงานความเสี่ยง (Incident Report) ส่งไปยังศูนย์คุณภาพโรงพยาบาล ถือเป็นหน้าที่หลักของหน้างานทั่วไป ซึ่งไม่เกี่ยวข้องกับระบบส่งเวรนี้'
    ]
  }
];

export default function SafetyPolicy({ onClose }: SafetyPolicyProps) {
  const [checklistProgress, setChecklistProgress] = useState({
    audit1: false,
    audit2: false,
    audit3: false,
    audit4: false,
    audit5: false,
  });

  const [safeRecordsCount, setSafeRecordsCount] = useState(0);
  const [loadingSafetyMetrics, setLoadingSafetyMetrics] = useState(true);
  const [safetyOfficers, setSafetyOfficers] = useState<any[]>([]);

  useEffect(() => {
    async function fetchSafetyMetrics() {
      try {
        setLoadingSafetyMetrics(true);
        // Get total handovers count
        const { count, error: countError } = await supabase
          .from('handovers')
          .select('*', { count: 'exact', head: true });
        
        if (!countError && count !== null) {
          setSafeRecordsCount(count);
        }

        // Get admins list from database
        const { data: admins, error: adminError } = await supabase
          .from('users')
          .select('id, full_name, role, email')
          .eq('role', 'admin')
          .limit(3);

        if (!adminError && admins) {
          setSafetyOfficers(admins);
        }
      } catch (err) {
        console.error('Error fetching safety metrics:', err);
      } finally {
        setLoadingSafetyMetrics(false);
      }
    }

    fetchSafetyMetrics();
  }, []);

  const completedAudits = Object.values(checklistProgress).filter(Boolean).length;
  const auditPercent = Math.round((completedAudits / 5) * 100);

  const toggleAudit = (key: keyof typeof checklistProgress) => {
    setChecklistProgress((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen py-6 px-4 md:px-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2.2rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-50/20 dark:bg-emerald-950/20 rounded-full pointer-events-none -translate-y-12 translate-x-12" />
        
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
              <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">PATIENT & INFORMATION SECURITY</span>
            </div>
            <h2 className="text-xl md:text-2xl font-[900] text-[#0f2d52] dark:text-white tracking-tight font-thai">ศูนย์สารสนเทศและความปลอดภัยทางการแพทย์</h2>
            <p className="text-sm text-slate-550 dark:text-slate-400 font-bold mt-1 font-thai leading-relaxed">
              การกำกับดูแลคุ้มครองข้อมูลส่วนบุคคล (PDPA), ความปลอดภัยทางคลินิก และมาตรการรักษาความลับสิทธิ์ผู้ป่วยกลุ่มงานเทคนิคการแพทย์
            </p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full md:w-auto h-11 px-6 bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.01] text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer border border-transparent"
        >
          <CheckCircle size={15} />
          <span>ยอมรับ & ปฏิบัติตามมาตรฐานความปลอดภัย</span>
        </button>
      </div>

      {/* Main Grid: Rules Left, Active Audit Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Rules & Protocols column (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          {SAFETY_PROTOCOLS.map((proto) => (
            <div 
              key={proto.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 md:p-8 space-y-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-[#0f2d52] dark:text-white font-thai leading-tight flex items-center gap-2">
                    {proto.id === 'sec-1' && <EyeOff className="text-red-500" size={18} />}
                    {proto.id === 'sec-2' && <FileCheck className="text-emerald-500" size={18} />}
                    {proto.id === 'sec-3' && <Lock className="text-blue-500" size={18} />}
                    {proto.id === 'sec-4' && <AlertTriangle className="text-amber-500" size={18} />}
                    <span>{proto.title}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-450 font-bold leading-relaxed">{proto.description}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider border self-start sm:self-center ${proto.badgeStyle}`}>
                  {proto.badge}
                </span>
              </div>

              {/* Sub-Checklist Guidelines */}
              <ul className="space-y-3.5 font-thai text-sm font-semibold text-slate-700 dark:text-slate-300">
                {proto.checks.map((chk, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-md bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-xs font-black text-slate-500 border border-slate-150/40 dark:border-slate-800 shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed mt-0.5">{chk}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Audit / Self-Checklist Sidebar Column */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Shift Safety Self Audit */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 space-y-5 shadow-sm font-thai">
            <div className="space-y-1.5">
              <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">Interactive Checklist</span>
              <h3 className="text-base font-black text-[#0f2d52] dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="text-emerald-600 dark:text-emerald-400" size={16} />
                <span>ประเมินความปลอดภัยประจำผลัดเวร</span>
              </h3>
              <p className="text-xs text-slate-400 font-bold">เทคนิคการแพทย์พึงร่วมประเมินก่อนลงนามส่งมอบงานจริง</p>
            </div>

            {/* Audit Progress Circle */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center gap-4">
              <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                <svg className="absolute w-full h-full -rotate-90">
                  <circle cx="28" cy="28" r="23" strokeWidth="4" stroke="currentColor" className="text-slate-200 dark:text-slate-800" fill="transparent" />
                  <circle cx="28" cy="28" r="23" strokeWidth="4" stroke="currentColor" className="text-emerald-500 transition-all duration-300" fill="transparent"
                    strokeDasharray={144.5} strokeDashoffset={144.5 - (144.5 * auditPercent) / 100} />
                </svg>
                <span className="text-sm font-black text-[#0f2d52] dark:text-white">{auditPercent}%</span>
              </div>
              <div>
                <p className="text-sm font-black text-[#0f2d52] dark:text-slate-200">ตรวจสอบความพร้อมแล้ว</p>
                <p className="text-xs text-slate-400 font-bold mt-0.5">ผ่านเกณฑ์ทั้งสิ้น {completedAudits} จาก 5 ข้อ</p>
              </div>
            </div>

            {/* Audit Checklist Items */}
            <div className="space-y-3">
              <button 
                type="button"
                onClick={() => toggleAudit('audit1')}
                className="w-full flex items-start gap-3 p-3 text-left rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
              >
                <span className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center ${
                  checklistProgress.audit1 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-705'
                }`} style={{ userSelect: 'none' }}>
                  {checklistProgress.audit1 && '✓'}
                </span>
                <div>
                  <p className="text-sm font-black text-[#0f2d52] dark:text-slate-200">1. ยืนยันข้อมูลในฟอร์มไม่มีชื่อคนไข้เปิดเผยประจักษ์</p>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">(ข้อมูลประเด็นสำคัญต้องกรอกอย่างพรางตัวตนคนไข้ในส่วนทั่วไป)</p>
                </div>
              </button>

              <button 
                type="button"
                onClick={() => toggleAudit('audit2')}
                className="w-full flex items-start gap-3 p-3 text-left rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
              >
                <span className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center ${
                  checklistProgress.audit2 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-705'
                }`} style={{ userSelect: 'none' }}>
                  {checklistProgress.audit2 && '✓'}
                </span>
                <div>
                  <p className="text-sm font-black text-[#0f2d52] dark:text-slate-200">2. ยืนยันสต็อก PRC คลังเลือดปลอดภัย &gt; 5 Unit</p>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">(กรณีต่ำกว่าเกณฑ์ความปลอดภัย สำรองโลหิตฉุกเฉินได้รับรายงานส่งต่อ)</p>
                </div>
              </button>

              <button 
                type="button"
                onClick={() => toggleAudit('audit3')}
                className="w-full flex items-start gap-3 p-3 text-left rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
              >
                <span className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center ${
                  checklistProgress.audit3 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-705'
                }`} style={{ userSelect: 'none' }}>
                  {checklistProgress.audit3 && '✓'}
                </span>
                <div>
                  <p className="text-sm font-black text-[#0f2d52] dark:text-slate-200">3. ทุกเคสรายงานค่าวิกฤตมีการทวนสอบผู้รับสายครบ</p>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">(มีการระบุ ยศ นามสกุล และเบอร์โทรต่อของพยาบาลพริ้นท์ใบแล็บ)</p>
                </div>
              </button>

              <button 
                type="button"
                onClick={() => toggleAudit('audit4')}
                className="w-full flex items-start gap-3 p-3 text-left rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
              >
                <span className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center ${
                  checklistProgress.audit4 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-705'
                }`} style={{ userSelect: 'none' }}>
                  {checklistProgress.audit4 && '✓'}
                </span>
                <div>
                  <p className="text-sm font-black text-[#0f2d52] dark:text-slate-200">4. ปริมาณวัสดุน้ำยาเหลือเสถียรสำหรับการตรวจเวรถัดไป</p>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">(Diluent และ Reagent ประจำเครื่องหลักอย่างต่ำ 20% เพียงพอ)</p>
                </div>
              </button>

              <button 
                type="button"
                onClick={() => toggleAudit('audit5')}
                className="w-full flex items-start gap-3 p-3 text-left rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
              >
                <span className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center ${
                  checklistProgress.audit5 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-705'
                }`} style={{ userSelect: 'none' }}>
                  {checklistProgress.audit5 && '✓'}
                </span>
                <div>
                  <p className="text-sm font-black text-[#0f2d52] dark:text-slate-200">5. คอมพิวเตอร์จุดจดวิเคราะห์ LIS ลงชื่อออกเมื่อว่างงาน</p>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">(ป้องกันการเข้าถือบัญชีประดับความปลอดภัยการใช้งานนอกลบผล)</p>
                </div>
              </button>
            </div>

            {auditPercent === 100 && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-center">
                🚀 ตรวจสอบผ่านเกณฑ์ครบถ้วนสมบูรณ์ มีความพร้อมจัดตั้งเคสส่งเวรได้!
              </div>
            )}
          </div>

          {/* Live Safety Integrity Monitor */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 space-y-4 shadow-sm font-thai">
            <h3 className="text-base font-black text-[#0f2d52] dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="text-emerald-600 dark:text-emerald-450" size={16} />
              <span>ความปลอดภัยของข้อมูลแบบเรียลไทม์</span>
            </h3>

            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800 rounded-2xl flex items-center gap-3">
              <Shield className="text-slate-450 shrink-0" size={24} />
              <div>
                <p className="text-xs text-slate-500 font-bold leading-none mb-1.5">เคสส่งเวรที่รับมอบเสร็จสมบูรณ์และพรางข้อมูล (PDPA Verified)</p>
                {loadingSafetyMetrics ? (
                  <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  <p className="text-base font-black text-slate-800 dark:text-white leading-none font-mono">
                    {safeRecordsCount} <span className="text-xs font-bold text-slate-500 font-thai">รายการเข้ารหัสสำเร็จ</span>
                  </p>
                )}
              </div>
            </div>

            {safetyOfficers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={11} />
                  <span>เจ้าหน้าที่รับผิดชอบตรวจสอบในฐานข้อมูลจริง</span>
                </p>
                <div className="space-y-1.5">
                  {safetyOfficers.map((u, idx) => (
                    <div key={u.id || idx} className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-750 dark:text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{u.full_name}</span>
                      <span className="text-xs text-slate-400 uppercase font-mono font-bold">({u.email || "Active Admin"})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick FAQ Safety Contacts */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 space-y-4 shadow-sm font-thai">
            <h3 className="text-base font-black text-[#0f2d52] dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Building className="text-emerald-600 dark:text-emerald-400" size={16} />
              <span>กฎหมายกำกับและนโยบายที่อ้างอิง</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">
              ระบบนี้พัฒนาขึ้นเพื่อประสานส่งเสริมความปลอดภัยภายใต้ประกาศมาตรฐานห้องปฏิบัติการเครือข่ายของสมาคมเทคนิคการแพทย์ ร่วมกับพรบ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) แห่งราชอาณาจักรไทย เพื่อเป็นแนวป้องกันเอกสิทธิผู้ใช้บริการตรวจรพ.สังขะ
            </p>
            
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400 font-bold">ปรับปรุงมาตรฐานล่าสุด: กุมภาพันธ์ 2569</p>
              <p className="text-xs text-slate-400 font-bold mt-0.5">คณะกรรมการความปลอดภัยทางคลินิกและข้อมูลส่วนบุคคล รพ.สังขะ</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
