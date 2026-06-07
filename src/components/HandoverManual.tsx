import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  FileText, 
  Activity, 
  Smartphone,
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  Lock,
  AlertTriangle,
  MessageCircle,
  Check,
  ListChecks
} from 'lucide-react';

interface HandoverManualProps {
  onClose: () => void;
}

export default function HandoverManual({ onClose }: HandoverManualProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const localUser = localStorage.getItem('sangkha_handover_local_user');
    if (localUser) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div className="bg-transparent text-slate-800 dark:text-slate-100 min-h-screen py-6 px-4 md:px-8 max-w-4xl mx-auto space-y-6 select-none">
      
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
            <h2 className="text-xl md:text-2xl font-[900] text-[#0f2d52] dark:text-white tracking-tight font-thai">คู่มือการใช้งานระบบ</h2>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full md:w-auto h-11 px-6 bg-gradient-to-r from-brand-blue to-brand-dark text-white rounded-2xl text-sm font-black shadow-[0_4px_14px_rgba(0,163,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,163,255,0.35)] dark:shadow-[0_4px_12px_rgba(0,163,255,0.15)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
        >
          <CheckCircle size={15} />
          <span>เข้าใจแล้ว / กลับหน้าหลัก</span>
        </button>
      </div>

      {/* Manual Content */}
      <div className="space-y-8">
        
        {/* SECTION 1: OVERVIEW & LOGIN */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 md:p-8 shadow-sm space-y-6 font-thai">
          <div>
            <h3 className="text-lg font-black text-[#0f2d52] dark:text-white flex items-center gap-2">
              <Monitor size={20} className="text-brand-blue" />
              <span>ภาพรวมระบบและการเข้าสู่ระบบ</span>
            </h3>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-extrabold text-slate-850 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              1.1 ภาพรวมระบบ
            </h4>
            <p className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">
              ระบบนี้คือกระดานข้อมูลสำหรับการส่งมอบงานระหว่างเวรและประสานงานภายในห้องปฏิบัติการ ช่วยให้เจ้าหน้าที่เทคนิคการแพทย์ของกลุ่มงานเทคนิคการแพทย์ โรงพยาบาลสังขะ สามารถทำงานประสานกันได้อย่างรวดเร็วโดยใช้ฐานข้อมูลดิจิทัล:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-850/40 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-[#0f2d52] dark:text-white">บันทึกการส่งเวร (Handover Logs)</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">ระบุงานค้าง ข้อมูลแผนก ประเภทงาน และความปลอดภัยของข้อมูล</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-850/40 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-[#0f2d52] dark:text-white">อัปเดตข้อมูลความจริงทุกช่องทาง</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">ดูประวัติการส่งหน้าเว็บ ซิงก์ข้อมูลเร็ว ตรวจจับแจ้งเตือนรวดเร็ว</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-850/40 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-[#0f2d52] dark:text-white">LINE Flex Card แจ้งเตือนกลุ่ม</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">รับข้อความแจ้งเตือนสรุปงานส่งเวรในกลุ่มไลน์อย่างเป็นทางการ</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-850/40 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-[#0f2d52] dark:text-white">LINE Mini App / LIFF Portal</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">เลือกรับงานเป็นรายตัว กรองประวัติวันที่ได้โดยตรงจากมือถือ</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-extrabold text-slate-850 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
              <Lock size={14} className="text-brand-blue" />
              <span>1.2 วิธีการเข้าสู่ระบบ (Login Flow)</span>
            </h4>
            <div className="p-4 bg-slate-50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
              <ol className="space-y-3 text-sm text-slate-650 dark:text-slate-350 font-bold pl-4 list-decimal leading-relaxed">
                <li>เปิดหน้าเว็บเบราว์เซอร์และเข้าไปยัง URL ที่กำหนด</li>
                <li>คลิกปุ่ม "เข้าสู่ระบบ" บริเวณแถบ Navbar มุมขวาบน</li>
                <li>กรอกแบบฟอร์มยืนยันชื่อผู้ปฏิบัติหน้าที่:
                  <ul className="pl-4 list-disc text-sm text-slate-500 font-bold mt-1 space-y-1">
                    <li>เลือกชื่อผู้ใช้</li>
                    <li>พิมพ์รหัสผ่านผู้ใช้ให้ถูกต้อง</li>
                  </ul>
                </li>
                <li>กดปุ่ม "เข้าสู่ระบบ"</li>
              </ol>
            </div>
          </div>
        </div>

        {/* SECTION 2: SENDING HANDOVER */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 md:p-8 shadow-sm space-y-6 font-thai">
          <div>
            <h3 className="text-lg font-black text-[#0f2d52] dark:text-white flex items-center gap-2">
              <FileText size={20} className="text-brand-blue" />
              <span>ขั้นตอนการกรอกแบบบันทึกส่งเวร</span>
            </h3>
            <p className="text-sm text-slate-450 font-bold mt-1 leading-relaxed">
              รายละเอียดและกติกาในการบันทึกข้อมูล
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3.5 text-sm text-rose-600 dark:text-rose-400 font-black flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>การส่งข้อมูลทุกชิ้นจำเป็นต้องมีการยืนยันรหัสผ่านเสมอ</span>
            </div>

            <div className="space-y-4 pt-1">
              <div className="space-y-2">
                <span className="px-2 py-0.5 rounded bg-brand-blue/10 dark:bg-blue-400/15 text-brand-blue dark:text-blue-400 text-[10px] font-black uppercase">ส่วนที่ 1</span>
                <h4 className="text-sm font-extrabold text-slate-850 dark:text-white">ข้อมูลพื้นฐานของเวร</h4>
                <p className="text-sm text-slate-500 font-bold leading-relaxed">
                  ระบุข้อมูลพื้นฐาน วันที่รับ/ส่งเวร ซึ่งระบบจะตั้งค่าเริ่มต้นเป็นวันที่ปัจจุบันโดยอัตโนมัติ จากนั้นให้เลือกหน่วยงานผู้รับผิดชอบ (Central Lab หรือ Blood Bank) และเลือกเวรที่ต้องการจะส่งต่องาน (เวรเช้า, เวรบ่าย, หรือ เวรดึก)
                </p>
              </div>

              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="px-2 py-0.5 rounded bg-brand-blue/10 dark:bg-blue-400/15 text-brand-blue dark:text-blue-400 text-[10px] font-black uppercase">ส่วนที่ 2</span>
                <h4 className="text-sm font-extrabold text-slate-850 dark:text-white">รายละเอียดงาน</h4>
                <p className="text-sm text-slate-500 font-bold leading-relaxed">
                  ระบบแสดงงานค้างในรูปแบบ การ์ดรายการ สามารถเพิ่ม/ลดรายการได้ตามภาระงานจริง:
                </p>
                <ul className="text-sm text-slate-500 font-bold space-y-1.5 pl-4 list-disc leading-relaxed">
                  <li><strong>ชื่อภารงาน (จำเป็น):</strong> กรอกชื่อหัวข้อย่อ เช่น "เครื่อง BS600 ISE ชำรุด"</li>
                  <li><strong>ประเภทงาน (จำเป็น):</strong> เลือกหมวดความปลอดภัย: น้ำยา / เครื่องมือ / งานค้าง / อื่น ๆ </li>
                  <li><strong>รายละเอียด:</strong> อธิบายบริบทเพิ่มเติม</li>
                  <li><strong>ปุ่มควบคุม "เพิ่มงาน" และ "ลบงาน":</strong> สามารถเพิ่มงานค้างส่งได้หลายตัว และกดลบออกได้ (แบบฟอร์มต้องมีงานอย่างน้อยหนึ่งรายการเสมอ)</li>
                </ul>
              </div>

              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="px-2 py-0.5 rounded bg-brand-blue/10 dark:bg-blue-400/15 text-brand-blue dark:text-blue-400 text-[10px] font-black uppercase">ส่วนที่ 3 และ 4</span>
                <h4 className="text-sm font-extrabold text-slate-850 dark:text-white">ตรวจสอบความน่าเชื่อถือและการยืนยันตัวตน</h4>
                <div className="text-sm text-slate-500 font-bold space-y-2 leading-relaxed">
                  <p>
                    เพิ่มความรอบคอบและถูกต้องของข้อมูลด้วยขั้นตอนลงทะเบียนยืนยันตัวตน:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>การเลือกผู้ส่งเวรและยืนยันตัวตน:</strong> เลือกชื่อผู้ส่งเวรของคุณจากระเบียบบัญชีรายชื่อเจ้าหน้าที่ และกรอกรหัสผ่านส่วนตัวเพื่อยืนยันสิทธิ์ความปลอดภัย</li>
                    <li><strong>การกดยอมรับนโยบาย:</strong> ทำเครื่องหมายถูกในกล่องยินยอมยอมรับนโยบายความถูกต้องและความปลอดภัยของข้อมูล เพื่อยืนยันความรับผิดชอบในการปฏิบัติงานและปลดล็อกปุ่มส่งเวรลงระบบ</li>
                    <li><strong>การแสดงตัวอย่างข้อความที่จะส่ง (Draft Preview):</strong> ระบบจะมีช่องแสดงแถบตัวอย่างสรุปข้อความที่จะแชร์ไปยังกระดานและส่งไปที่กลุ่ม LINE ทันที ให้เจ้าหน้าที่ตรวจทานความถูกต้องและความสวยงามเป็นครั้งสุดท้ายก่อนกดปุ่มยืนยัน</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: RECEIVING HANDOVER CHANNELS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 md:p-8 shadow-sm space-y-6 font-thai">
          <div>
            <h3 className="text-lg font-black text-[#0f2d52] dark:text-white flex items-center gap-2">
              <Activity size={20} className="text-brand-blue" />
              <span>ช่องทางการรับมอบเวร</span>
            </h3>
          </div>

          <div className="space-y-6">
            
            {/* Subsection 3.1: รับผ่านหน้าเว็บ */}
            <div className="space-y-2 border-l-4 border-slate-200 dark:border-slate-800 pl-4">
              <h4 className="text-sm font-extrabold text-[#0f2d52] dark:text-white">
                3.1 การรับมอบงานผ่านทางหน้าเว็บไซต์ระบบ
              </h4>
              <p className="text-sm text-slate-550 leading-relaxed font-bold">
                เมื่อผู้รับเวรสลับเข้ามายังหน้าส่งเวรในระบบ สามารถมองหาเวรล่าสุดที่เป็นสถานะรอรับมอบ (Pending) จากนั้นคลิกขยายเพื่อตรวจสอบรายละเอียดงานทั้งหมด ทำการเลือกชื่อผู้รับงานและใส่รหัสผ่านเพื่อลงชื่อตอบยืนยันการรับมอบภารกิจนี้ได้อย่างถูกต้องเรียบร้อย
              </p>
            </div>

            {/* Subsection 3.2: รับผ่าน LINE Flex Card */}
            <div className="space-y-3 border-l-4 border-slate-200 dark:border-slate-800 pl-4">
              <h4 className="text-sm font-extrabold text-[#0f2d52] dark:text-white">
                3.2 การรับมอบงานผ่านข้อความ LINE Flex Card
              </h4>
              <p className="text-sm text-slate-550 leading-relaxed font-bold">
                หลังจากมีการบันทึกการส่งมอบ ระบบจะส่งรายละเอียดสรุปภาระงานเข้าไปยังกลุ่มสนทนา LINE ของทีมทันที เจ้าหน้าที่กลุ่มงานเทคนิคการแพทย์ในเวรถัดไปสามารถกดคลิกปุ่มยืนยันรับงานทั้งหมดจากบนแอพลิเคชัน LNE บนโทรศัพท์ได้สะดวดรวดเร็ว ระบบจะอ้างสิทธิ์แก้ไขสถานะเป็นดำเนินการรับแล้วให้อัตโนมัติในฐานข้อมูลทันที โดยไม่ต้องเดินทางไปที่หน้าคอมพิวเตอร์
              </p>

              {/* Mockup Line Card layout */}
              <div className="max-w-full sm:max-w-sm md:max-w-[420px] mx-auto bg-[#8b9db9] rounded-2xl overflow-hidden shadow-inner p-2.5 sm:p-4 relative min-h-[400px]">
                 {/* Header */}
                 <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-[#06c755] rounded-full flex items-center justify-center">
                       <MessageCircle size={16} className="text-white fill-current" />
                    </div>
                    <span className="text-white text-sm font-bold">SangkhaLab BOT</span>
                 </div>

                 {/* Message Box */}
                 <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                       <div className="flex items-start gap-2.5">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-indigo-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                             <img src="https://img.icons8.com/ios-filled/100/2b8be8/checklist.png" alt="Checklist" className="w-5.5 h-5.5 object-contain" />
                          </div>
                          <div>
                             <h4 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm leading-none mb-1">ส่งเวร</h4>
                             <p className="text-xl sm:text-2xl font-black text-[#1A1A2E] dark:text-white tracking-tight">LAB-0008</p>
                          </div>
                       </div>

                       <div className="flex flex-wrap items-center sm:items-end gap-1.5 sm:gap-0.5 text-right shrink-0">
                          <span className="bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full text-[9px] font-bold border border-orange-100 dark:border-orange-900/30 shrink-0">PENDING</span>
                          <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5 min-[360px]:ml-2 sm:ml-0 sm:mt-1 font-semibold">🗓 06 มิ.ย. 2026</span>
                          <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5 min-[360px]:ml-2 sm:ml-0 font-semibold">🕒 17:35</span>
                       </div>
                    </div>

                    <div className="bg-[#F0F6FC] dark:bg-slate-800/60 rounded-xl p-3 sm:p-4 mb-4 border border-blue-50/50 dark:border-slate-800 transition-colors">
                         <div className="flex items-center gap-2.5 mb-2.5">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center border border-gray-100/85 dark:border-slate-700/50 shadow-sm overflow-hidden shrink-0">
                               <img src="https://img.icons8.com/ios-filled/100/2b8be8/company.png" alt="Building" className="w-5.5 h-5.5 object-contain" />
                            </div>
                            <div>
                               <span className="text-xs sm:text-sm font-bold text-[#1A1A2E] dark:text-white block leading-none mb-1">Blood Bank</span>
                               <span className="text-[10px] text-[#2B8BE8] font-bold block leading-none">เวรเช้า</span>
                            </div>
                         </div>
                         <p className="text-xs text-gray-500 dark:text-gray-400 ml-10.5 sm:ml-11.5 font-medium leading-tight">
                            ผู้ส่งเวร: นายไพศาล
                         </p>
                     </div>

                    <div className="space-y-2 mb-4 font-semibold text-slate-700 dark:text-slate-350">
                       <div className="flex gap-2 items-start py-0.5">
                          <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-semibold">1 ขอเลือดเคส admit</span>
                       </div>
                       <div className="flex gap-2 items-start py-0.5">
                          <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-semibold">2 ER คืน FFP 2 unit</span>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                       <button className="bg-[#06c755] text-white py-2 sm:py-2.5 px-2 rounded-xl text-[10px] min-[360px]:text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all cursor-default shrink-0">
                           <Check size={12} className="sm:w-3.5 sm:h-3.5" /> รับทั้งหมด
                       </button>
                       <button className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 py-2 sm:py-2.5 px-2 rounded-xl text-[10px] min-[360px]:text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all cursor-default shrink-0">
                           <ListChecks size={12} className="sm:w-3.5 sm:h-3.5" /> เลือกรับงาน
                       </button>
                    </div>
                 </div>
                 
                 <div className="text-[10px] text-white/70 absolute bottom-3 right-4">17:35 น.</div>
              </div>
            </div>

            {/* Subsection 3.3: รับผ่าน LINE LIFF */}
            <div className="space-y-2 border-l-4 border-slate-200 dark:border-slate-800 pl-4">
              <h4 className="text-sm font-extrabold text-[#0f2d52] dark:text-white">
                3.3 การรับมอบงานผ่านระบบแอปพลิเคชันย่อ LINE LIFF Portal
              </h4>
              <p className="text-sm text-slate-550 leading-relaxed font-bold">
                ทางเลือกในกรณีที่เจ้าหน้าที่ต้องการตรวจสอบประวัติความถูกต้องย้อนหลังผ่านโทรศัพท์มือถือ หรือต้องการเลือกยอมรับปิดงานค้างรับทีละรายการอย่างเฉพาะเจาะจง ท่านสามารถกดลิงก์จากข้อความ LINE เพื่อเข้าโปรแกรมขนาดเล็ก เลือกรายการที่รับมอบ และคลิกยืนยันส่งผล
              </p>
              <ol className="text-sm text-slate-500 font-bold space-y-1.5 pl-4 list-decimal leading-relaxed">
                <li>เลือกชื่อพนักงานของตนเองเพื่อตรวจสอบเบื้องต้น และกรอกรหัสผ่านเพื่อสลับหน้าผู้ใช้</li>
                <li>ดูรายละเอียดแถบแสดงสถานะภาระงาน รอรับมอบ และ รับมอบแล้ว </li>
                <li>เลือกรายการที่ต้องการ แล้วกดยืนยันรับงานที่เลือก</li>
                <li>กดปิดหน้าต่าง ระบบจะส่งข้อความตอบกลับการรับงาน</li>
              </ol>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
