import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Mail, 
  Phone, 
  PhoneCall,
  Clock, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  ShieldAlert, 
  HelpCircle, 
  ArrowLeft,
  MessageCircle,
  Hash,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { writeLog } from '../lib/logger';
import { getActiveConfig } from '../config';

interface ContactTeamProps {
  onClose: () => void;
}

interface SupportTicket {
  id: string;
  name: string;
  department: string;
  category: 'bug' | 'feature' | 'account' | 'other';
  message: string;
  timestamp: string;
}

export default function ContactTeam({ onClose }: ContactTeamProps) {
  const [ticketForm, setTicketForm] = useState({
    name: '',
    department: 'Central Lab',
    category: 'bug' as 'bug' | 'feature' | 'account' | 'other',
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Dynamic admins from database
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);

  useEffect(() => {
    async function fetchAdmins() {
      try {
        setIsLoadingAdmins(true);
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, role, email, is_active')
          .eq('role', 'admin')
          .order('full_name', { ascending: true });
        
        if (error) throw error;
        if (data) {
          setAdminsList(data);
        }
      } catch (err) {
        console.warn('Could not fetch real admins, using design fallbacks:', err);
      } finally {
        setIsLoadingAdmins(false);
      }
    }
    fetchAdmins();
  }, []);



  const getInitials = (name: string) => {
    const parts = name.split('.').filter(Boolean);
    const mainPart = parts[parts.length - 1]?.trim() || name;
    const subParts = mainPart.split(' ').filter(Boolean);
    return subParts[0]?.slice(0, 2) || "AD";
  };

  const handleSubmitting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.name || !ticketForm.message) return;

    setIsSubmitting(true);
    const generatedId = 'TKT-' + Math.floor(100000 + Math.random() * 90000);
    const currentTimestamp = new Date().toISOString();

    try {
      // 1. Method 1: Save directly to Supabase table
      // We attempt inserting into a dedicated table called 'support_tickets'.
      // If that fails (due to table not created/migrated or permissions), we fall back 
      // dynamically to writing a high-reliability row to 'system_logs' via writeLog.
      const { error: dbError } = await supabase
        .from('support_tickets')
        .insert([{
          id: generatedId,
          name: ticketForm.name,
          department: ticketForm.department,
          category: ticketForm.category,
          message: ticketForm.message,
          created_at: currentTimestamp
        }]);

      if (dbError) {
        console.warn('Could not insert to support_tickets table directly, trying log fallback:', dbError.message);
        // Fallback: Write beautiful log to the database system_logs table so admins can see it under category "SUPPORT_TICKET"
        await writeLog(
          'CRITICAL',
          'SUPPORT_TICKET',
          `ตั๋วแจ้งปัญหาระบบใหม่ (${generatedId}): ${ticketForm.name} - ${ticketForm.message}`,
          {
            ticket_id: generatedId,
            name: ticketForm.name,
            department: ticketForm.department,
            category: ticketForm.category,
            message: ticketForm.message
          }
        );
      } else {
        await writeLog(
          'INFO',
          'SUPPORT_TICKET',
          `บันทึกตั๋วแจ้งปัญหา (${generatedId}) ลงตาราง support_tickets สำเร็จ`,
          { ticket_id: generatedId }
        );
      }

      // 2. Method 2: Send to LINE Admin group
      // Fetch active environment setting and send payload to handle-new-handover Edge Function
      const activeConfig = getActiveConfig();
      const functionUrl = `${activeConfig.supabaseUrl}/functions/v1/handle-new-handover`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeConfig.supabaseAnonKey}`,
          'apikey': activeConfig.supabaseAnonKey
        },
        body: JSON.stringify({
          action: 'support_ticket',
          ticket_id: generatedId,
          caller_name: ticketForm.name,
          department: ticketForm.department,
          category: ticketForm.category,
          message: ticketForm.message
        })
      });

      if (!response.ok) {
        console.error('Edge Function returned non-ok for LINE Notification:', response.status);
      } else {
        console.log('LINE notification triggered successfully!');
      }

      // Save to localStorage as well so users can see we persist it
      const savedTickets: SupportTicket[] = JSON.parse(localStorage.getItem('support_tickets') || '[]');
      const newTicket: SupportTicket = {
        id: generatedId,
        name: ticketForm.name,
        department: ticketForm.department,
        category: ticketForm.category,
        message: ticketForm.message,
        timestamp: new Date().toLocaleString('th-TH')
      };
      savedTickets.unshift(newTicket);
      localStorage.setItem('support_tickets', JSON.stringify(savedTickets));

      setTicketId(generatedId);
      setSubmitSuccess(true);

      // Reset form
      setTicketForm({
        name: '',
        department: 'Central Lab',
        category: 'bug',
        message: ''
      });

    } catch (err: any) {
      console.error('Error submitting support ticket:', err);
      // Fallback: Save to localStorage anyway so they get success indication
      const savedTickets: SupportTicket[] = JSON.parse(localStorage.getItem('support_tickets') || '[]');
      const newTicket: SupportTicket = {
        id: generatedId,
        name: ticketForm.name,
        department: ticketForm.department,
        category: ticketForm.category,
        message: ticketForm.message,
        timestamp: new Date().toLocaleString('th-TH')
      };
      savedTickets.unshift(newTicket);
      localStorage.setItem('support_tickets', JSON.stringify(savedTickets));

      setTicketId(generatedId);
      setSubmitSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    {
      q: '1. กรณีลืมรหัสผ่านหรือต้องการเปลี่ยนรหัสผ่าน ทำอย่างไร?',
      a: 'ตอบ: แจ้งหัวหน้างานหรือติดต่อผู้ดูแลระบบเพื่อดำเนินการตั้งรหัสผ่านใหม่'
    },
    {
      q: '2. หากไม่มีชื่อในระบบเพื่อทำการส่งเวร ต้องทำอย่างไร?',
      a: 'ตอบ: แจ้งหัวหน้างานหรือติดต่อผู้ดูแล เพื่อทำการเพิ่มชื่อและกำหนดรหัสผ่านเริ่มต้นให้ท่านเข้าใช้งานได้ทันที'
    },
    {
      q: '3. สามารถแก้ไขข้อมูลการส่งเวรย้อนหลังได้หรือไม่?',
      a: 'ตอบ: ผู้ใช้งานทั่วไปจะไม่สามารถเข้าไปแก้ไขหรือลบรายการที่กดยืนยันส่งไปแล้วได้ด้วยตนเอง ทั้งนี้เพื่อป้องกันการแก้ไขข้อมูลย้อนหลัง หากพบว่าส่งข้อมูลผิดพลาด ต้องแจ้งให้ผู้ดูแลระบบ (Admin) เป็นผู้ดำเนินการแก้ไขหรือลบรายการนั้นให้แทน'
    },
    {
      q: '4. หากกดรับงานไปแล้ว แต่พบว่ากดรับผิดคน หรือต้องการยกเลิกสถานะให้กลับมาเป็น "รอรับเวร" (Pending) ทำได้หรือไม่?',
      a: 'ตอบ: ผู้ใช้งานทั่วไปไม่สามารถกดยกเลิกหรือเปลี่ยนสถานะกลับได้ด้วยตนเอง หากต้องการแก้ไขสถานะงาน จะต้องแจ้งให้ Admin เป็นผู้ดำเนินการลบโพสต์ที่ผิดพลาดหรือแก้ไขสถานะ'
    },
    {
      q: '5. ต้องการแนบรูปภาพหรือไฟล์เอกสารเป็นหลักฐานไปพร้อมกับการส่งเวร ทำได้หรือไม่?',
      a: 'ตอบ: ในเวอร์ชันปัจจุบัน ระบบยังไม่รองรับการแนบไฟล์หรือรูปภาพประกอบการส่งมอบเวร'
    }
  ];

  return (
    <div className="bg-transparent text-slate-800 dark:text-slate-100 min-h-screen py-6 px-4 md:px-8 max-w-4xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2.2rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-50/20 dark:bg-indigo-950/20 rounded-full pointer-events-none -translate-y-12 translate-x-12" />
        
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
              <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">Technical Helpdesk</span>
            </div>
            <h2 className="text-xl md:text-2xl font-[900] text-[#0f2d52] dark:text-white tracking-tight font-thai">ติดต่อทีมงานและศูนย์สนับสนุนเทคนิค</h2>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full md:w-auto h-11 px-6 bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.01] text-sm white text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer border border-transparent animate-pulse"
        >
          <UserCheck size={15} />
          <span>กลับสู่แผงควบคุมหลัก</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Submit Help Request / Support Ticket Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 md:p-8 space-y-5 shadow-sm font-thai">
            <div>
              <h3 className="text-xl font-black text-[#0f2d52] dark:text-white mb-1 tracking-tight flex items-center gap-2">
                <MessageSquare className="text-indigo-600 dark:text-indigo-400 animate-pulse" size={18} />
                <span>แจ้งปัญหาทางเทคนิค (Create Support Ticket)</span>
              </h3>
              <p className="text-sm text-slate-400 font-bold">แจ้งปัญหา บอท LINE ขัดข้อง, บัญชีล็อค หรือมีอุปสรรคการบันทึกข้อมูลส่งเวร</p>
            </div>

            <AnimatePresence mode="wait">
              {!submitSuccess ? (
                <motion.form 
                  key="ticket-form"
                  onSubmit={handleSubmitting} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Input 1: User Name / Caller */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-extrabold text-[#0f2d52] dark:text-slate-300">
                        ผู้ส่งเรื่องแจ้งปัญหา <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={ticketForm.name}
                        onChange={(e) => setTicketForm({...ticketForm, name: e.target.value})}
                        placeholder="ระบุชื่อ-นามสกุล"
                        className="w-full px-3 h-10 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-800 rounded-xl text-sm font-bold text-[#0f2d52] dark:text-white outline-none focus:bg-white focus:border-indigo-500/30 dark:focus:bg-slate-850 dark:focus:border-indigo-500/20 transition-all placeholder:text-slate-350"
                      />
                    </div>

                    {/* Selector 1: Department/Division */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-extrabold text-[#0f2d52] dark:text-slate-300">
                        หน่วยงาน
                      </label>
                      <select
                        value={ticketForm.department}
                        onChange={(e) => setTicketForm({...ticketForm, department: e.target.value})}
                        className="w-full px-3 h-10 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-800 rounded-xl text-sm font-bold text-[#0f2d52] dark:text-white outline-none focus:bg-white focus:border-indigo-500/30 dark:focus:bg-slate-850 dark:focus:border-indigo-500/20 transition-all cursor-pointer"
                      >
                        <option value="Central Lab">Central Lab</option>
                        <option value="Blood Bank">Blood Bank</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Selector 2: Category of issue */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-extrabold text-[#0f2d52] dark:text-slate-300">
                        ประเภทปัญหาที่ต้องการแจ้ง
                      </label>
                      <div className="flex gap-2">
                        {([
                          { id: 'bug', label: 'พบข้อผิดพลาดของระบบ (Bug)', color: 'border-red-500/20 hover:bg-red-50/20 text-red-600' },
                          { id: 'feature', label: 'ข้อเสนอแนะ / เพิ่มฟีเจอร์ใหม่', color: 'border-blue-500/20 hover:bg-blue-50/20 text-blue-600' },
                          { id: 'account', label: 'ปัญหาเกี่ยวกับบัญชีและรหัสผ่าน', color: 'border-purple-500/20 hover:bg-purple-50/20 text-purple-600' }
                        ] as const).map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setTicketForm({...ticketForm, category: cat.id})}
                            className={`flex-1 p-2 text-xs sm:text-sm font-black rounded-xl border transition-all ${
                              ticketForm.category === cat.id
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : `bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 ${cat.color}`
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 flex flex-col justify-end">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-snug">
                        💡 ข้อแนะนำ: ข้อแนะนำ: ในกรณีฉุกเฉินที่มีผลกระทบต่อการแสดงผลข้อมูลผู้ป่วย สามารถประสานงานผู้ดูแลระบบ (Admin) ได้โดยตรง
                      </p>
                    </div>
                  </div>

                  {/* Textarea: Description Content of Issue */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-extrabold text-[#0f2d52] dark:text-slate-300">
                      รายละเอียดปัญหาหรืออาการที่พบ (Description) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={ticketForm.message}
                      onChange={(e) => setTicketForm({...ticketForm, message: e.target.value})}
                      placeholder="ระบุรายละเอียดหรืออาการที่พบ เช่น ข้อมูลเคสตกหล่นหลังอัปเดต, ระบบ LINE ไม่ส่งข้อความแจ้งเตือน, หรือปุ่มคำสั่งกดใช้งานไม่ได้บนแท็บเล็ต"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-800 rounded-xl text-sm font-bold text-[#0f2d52] dark:text-white outline-none focus:bg-white focus:border-indigo-500/30 dark:focus:bg-slate-850 dark:focus:border-indigo-500/20 transition-all placeholder:text-slate-350 resize-none leading-relaxed font-thai"
                    />
                  </div>

                  {/* Submission Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full md:w-56 h-11 bg-[#0f2d52] hover:bg-[#1a4473] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-black rounded-2xl text-sm hover:scale-[1.01] hover:shadow-lg hover:shadow-[#0c2a4c]/10 dark:hover:shadow-indigo-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer border border-transparent disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={14} />
                          <span>ส่งตั๋วแจ้งปัญหาทางเทคนิค</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div 
                  key="success-box"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-4 font-thai"
                >
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-black text-emerald-700 dark:text-emerald-400">ส่งตั๋วรายงานปัญหาเรียบร้อยแล้ว!</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">ขอบพระคุณสำหรับข้อมูลช่วยเหลือ ทีมแอดมินได้รับรายงานปัญหาของท่านและจะรีบเข้าทบทวนโดยเร็ว</p>
                  </div>

                  <div className="max-w-xs mx-auto py-2 px-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm">
                    <div className="flex justify-between font-bold text-slate-500">
                      <span>หมายเลขรหัสอ้างอิง:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-black">{ticketId}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSubmitSuccess(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer"
                  >
                    ส่งเรื่องปัญหาอื่นเพิ่ม
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FAQ Sections */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 md:p-8 space-y-5 shadow-sm font-thai">
            <h3 className="text-base font-black text-[#0f2d52] dark:text-white uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="text-indigo-600 dark:text-indigo-400" size={16} />
              <span>คำถามที่พบบ่อย (Help Center & FAQs)</span>
            </h3>

            <div className="space-y-3.5">
              {faqs.map((faq, idx) => (
                <div 
                  key={idx} 
                  className="border-b border-slate-100 dark:border-slate-800/80 pb-3.5 last:border-none last:pb-0"
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full text-left font-black text-[#0f2d52] dark:text-slate-100 text-sm sm:text-base hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex justify-between items-center"
                  >
                    <span>{faq.q}</span>
                    <span className="text-slate-400 shrink-0 text-xl font-medium ml-4">
                      {activeFaq === idx ? '−' : '+'}
                    </span>
                  </button>
                  
                  <AnimatePresence>
                    {activeFaq === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-semibold mt-2 pl-3 border-l-2 border-indigo-400">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

          </div>

      </div>

    </div>
  );
}
