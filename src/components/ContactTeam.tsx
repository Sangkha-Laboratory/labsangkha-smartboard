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
  Users, 
  ShieldAlert, 
  HelpCircle, 
  ArrowLeft,
  MessageCircle,
  Hash,
  Activity,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

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

  const fallbackAdmins = [
    { id: 'sm', full_name: 'คุณสมิตา สิงห์สด', role: 'admin', email: 'samita.sings@gmail.com', is_active: true, custom_tag: 'นักเทคนิคการแพทย์ / ผู้รับผิดชอบระบบ (โทร 085-613-7211)' }
  ];

  const finalAdmins = adminsList.length > 0 ? adminsList : fallbackAdmins;

  const getInitials = (name: string) => {
    const parts = name.split('.').filter(Boolean);
    const mainPart = parts[parts.length - 1]?.trim() || name;
    const subParts = mainPart.split(' ').filter(Boolean);
    return subParts[0]?.slice(0, 2) || "AD";
  };

  const handleSubmitting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.name || !ticketForm.message) return;

    setIsSubmitting(true);
    
    // Simulate API Submission
    setTimeout(() => {
      const generatedId = 'TKT-' + Math.floor(100000 + Math.random() * 90000);
      setTicketId(generatedId);
      setIsSubmitting(false);
      setSubmitSuccess(true);
      
      // Save to localStorage so users can see we persist it
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

      // Reset form
      setTicketForm({
        name: '',
        department: 'Central Lab',
        category: 'bug',
        message: ''
      });
    }, 1200);
  };

  const faqs = [
    {
      q: '1. กรณีลืมรหัสผ่านหรือต้องการเปลี่ยนรหัสผ่าน ทำอย่างไร?',
      a: 'ตอบ: ให้คลิกที่ปุ่มลืมรหัสผ่าน (ถ้ามี) หรือ แชทแจ้งแอดมิน สมิตา สิงห์สด (โทร 085-613-7211) เพื่อให้ระบบความดันดำเนินการตั้งรหัสผ่านใหม่ให้'
    },
    {
      q: '2. หากไม่มีชื่อในระบบเพื่อทำการส่งเวร ต้องทำอย่างไร?',
      a: 'ตอบ: ให้ติดต่อผู้รับผิดชอบระบบ แอดมิน สมิตา สิงห์สด เพื่อทำการเพิ่มชื่อและกำหนดรหัสผ่านเริ่มต้นให้ท่านเข้าใช้งานได้ทันที'
    },
    {
      q: '3. สามารถแก้ไขข้อมูลการส่งเวรย้อนหลังได้หรือไม่?',
      a: 'ตอบ: สามารถทำได้เฉพาะตัวผู้ส่งเวรเป็นผู้แก้ไขเองเท่านั้น เพื่อรักษาความถูกต้องและการสอบกลับได้ของประวัติการส่งเวร'
    }
  ];

  return (
    <div className="bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen py-6 px-4 md:px-8 max-w-7xl mx-auto space-y-6">
      
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
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1 font-thai leading-relaxed">
              แจ้งปัญหาการเขียนฟอร์มระบบส่งเวร, ขอเพิ่มผู้ใช้ หรือปัญหาทางเทคนิค LIS โรงพยาบาลสังขะ
            </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Direct Contacts & Channels */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Quick Contact Info */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 space-y-5 shadow-sm">
            <h3 className="text-base font-black text-[#0f2d52] dark:text-white font-thai uppercase tracking-wider flex items-center gap-2">
              <Users className="text-[#0f2d52] dark:text-indigo-400" size={16} />
              <span>ช่องทางติดต่อและนโยบายเกณฑ์งานจริง</span>
            </h3>

            <div className="space-y-4 text-sm font-bold font-thai">
              {/* Main Admin Contact */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <UserCheck size={15} />
                </div>
                <div>
                  <p className="text-[#0f2d52] dark:text-slate-200 font-extrabold text-[13px] sm:text-sm">ผู้รับผิดชอบหลัก/แอดมินกลุ่มงาน</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">ติดต่อปรับปรุงสิทธิ์ เช่น เพิ่มชื่อหรือแก้ไขรหัสผ่าน</p>
                  <p className="text-sm text-brand-blue dark:text-blue-400 font-black mt-1">คุณสมิตา สิงห์สด (085-613-7211)</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">ตำแหน่ง: นักเทคนิคการแพทย์ / ผู้รับผิดชอบระบบ</p>
                </div>
              </div>

              {/* Downtime Protocol info */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
                  <Activity size={15} />
                </div>
                <div>
                  <p className="text-[#0f2d52] dark:text-slate-200 font-extrabold text-[13px] sm:text-sm">เน็ตเวิร์กล่ม (Downtime Protocol)</p>
                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 font-medium leading-relaxed">
                    ระบบส่งเวรนี้ทำงานแยกเป็นอิสระ (Independent) จากระบบ HIS LIS หลัก หากระบบเน็ตโรงพยาบาลล่มหรือคอมพัง ให้ใช้เน็ตโทรศัพท์เคลื่อนที่ผ่าน mobile device เพื่อจัดการส่งเวรต่อได้ปกติ
                  </p>
                </div>
              </div>

              {/* Account Security Policy */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Mail size={15} />
                </div>
                <div>
                  <p className="text-[#0f2d52] dark:text-slate-200 font-extrabold text-[13px] sm:text-sm">ความปลอดภัยบัญชีใช้งาน</p>
                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 font-medium leading-relaxed">
                    ห้ามแชร์รหัสผ่านร่วมกันเด็ดขาด, กำหนดตั้งค่ารหัสผ่านใหม่ทุก ๆ 3 เดือน และต้องกดออกจากระบบ (Log out) ทุกครั้งหลังใช้งานเสร็จเเพื่อความปลอดภัย
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Admin Team List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 space-y-4 shadow-sm font-thai">
            <h3 className="text-base font-black text-[#0f2d52] dark:text-white uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="text-indigo-600 dark:text-indigo-400" size={16} />
              <span>ทีมสตาฟผู้ดูแลระบบ (Sangkha Admins)</span>
            </h3>

            <div className="space-y-3">
              {finalAdmins.map((admin, index) => {
                const initials = getInitials(admin.full_name);
                const isOnline = admin.is_active !== false;
                const email = admin.email || 'sangkha.medtech@gmail.com';
                const tagColor = 'text-slate-400 dark:text-slate-500 text-xs font-bold';
                
                return (
                  <div key={admin.id || index} className="flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-850/30 rounded-xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center font-black text-[#0f2d52] dark:text-white text-xs">
                          {initials}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${isOnline ? 'bg-emerald-500' : 'bg-slate-350'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#0f2d52] dark:text-slate-100">{admin.full_name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">{email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-black rounded-md ${tagColor}`}>
                      {admin.custom_tag || (admin.role === 'admin' ? 'System Tech' : 'Staff')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Columns: Interactive Support Ticket Form & FAQ */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Submit Help Request / Support Ticket Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 md:p-8 space-y-5 shadow-sm font-thai">
            <div>
              <h3 className="text-xl font-black text-[#0f2d52] dark:text-white mb-1 tracking-tight flex items-center gap-2">
                <MessageSquare className="text-indigo-600 dark:text-indigo-400 animate-pulse" size={18} />
                <span>ส่งข้อความขอความช่วยเหลือทางเทคนิค (Create Support Ticket)</span>
              </h3>
              <p className="text-sm text-slate-400 font-bold">แจ้งปัญหา บอท LINE ขัดข้อง บัญชีล็อค หรือมีอุปสรรคการกรอกส่งเวร เพื่อให้ทีมงานติดต่อกลับผ่านเบอร์โทรหรือตั๋วในระบบ</p>
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
                        ผู้ส่งเรื่องแจ้งปัญหา / เบอร์ติดต่อกลับ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={ticketForm.name}
                        onChange={(e) => setTicketForm({...ticketForm, name: e.target.value})}
                        placeholder="ระบุชื่อจริง ทนพ. และเบอร์โทรต่อ เช่น ทนพ.สมศักดิ์ เบอร์ต่อ 1420"
                        className="w-full px-3 h-10 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-800 rounded-xl text-sm font-bold text-[#0f2d52] dark:text-white outline-none focus:bg-white focus:border-indigo-500/30 dark:focus:bg-slate-850 dark:focus:border-indigo-500/20 transition-all placeholder:text-slate-350"
                      />
                    </div>

                    {/* Selector 1: Department/Division */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-extrabold text-[#0f2d52] dark:text-slate-300">
                        แผนก / ฝ่ายผู้ส่งเวรสังกัด
                      </label>
                      <select
                        value={ticketForm.department}
                        onChange={(e) => setTicketForm({...ticketForm, department: e.target.value})}
                        className="w-full px-3 h-10 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-800 rounded-xl text-sm font-bold text-[#0f2d52] dark:text-white outline-none focus:bg-white focus:border-indigo-500/30 dark:focus:bg-slate-850 dark:focus:border-indigo-500/20 transition-all cursor-pointer"
                      >
                        <option value="Central Lab">Central Lab</option>
                        <option value="Blood Bank">Blood Bank</option>
                        <option value="Microbiology">Microbiology</option>
                        <option value="Pathology">Pathology</option>
                        <option value="Other">Other</option>
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
                          { id: 'bug', label: 'บั๊ก / มีข้อผิดพลาดในระบบ', color: 'border-red-500/20 hover:bg-red-50/20 text-red-600' },
                          { id: 'feature', label: 'ฟีเจอร์ที่อยากเสนอแนะ', color: 'border-blue-500/20 hover:bg-blue-50/20 text-blue-600' },
                          { id: 'account', label: 'ปัญหาเกี่ยวกับรหัสผ่าน', color: 'border-purple-500/20 hover:bg-purple-50/20 text-purple-600' }
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
                        💡 ข้อแนะนำ: ตั๋วที่แจ้งปัญหานอกเวลากรุณากรอกเบอร์โทรกลับ และสามารถประสานแอดมินกลุ่มงานสังขะโดยตรงเมื่อเป็นกรณีเรื้อรังที่ขัดขวางการส่งข้อมูลรักษาผู้ป่วยฉุกเฉิน
                      </p>
                    </div>
                  </div>

                  {/* Textarea: Description Content of Issue */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-extrabold text-[#0f2d52] dark:text-slate-300">
                      พรรณนารายละเอียดปัญหาที่พบ / ข้อแนะความช่วย (MESSAGE DESCRIPTION) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={ticketForm.message}
                      onChange={(e) => setTicketForm({...ticketForm, message: e.target.value})}
                      placeholder="ระบุรายละเอียดอาการที่พบ เช่น ข้อมูลเคสตกหล่นเมื่ออัปเดต, ไอออนไลน์ไม่ส่งการแจ้งเตือน, ปุ่มอนุมัติแก้ไขกดไม่ได้ในเครื่องแท็บเล็ต ฯลฯ"
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

    </div>
  );
}
