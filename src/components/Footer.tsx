import React from 'react';
import { Phone, Mail, MapPin, Book, MessageSquare, Shield, ArrowRight, Microscope } from 'lucide-react';

interface FooterProps {
  onPrivacyClick?: () => void;
  onTermsClick?: () => void;
}

export default function Footer({ onPrivacyClick, onTermsClick }: FooterProps) {
  return (
    <footer className="bg-[#0f172a] text-white rounded-t-[2.5rem] mt-4 sm:mt-6 pt-6 pb-4 overflow-hidden relative border-t border-white/5">
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-blue/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      
      <div className="w-[92%] max-w-[1280px] mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 items-start">
          <div className="text-center md:text-left col-span-1">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
              <div className="w-12 h-12 bg-brand-blue rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-blue/20">
                <Microscope className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black text-white leading-tight">กลุ่มงานเทคนิคการแพทย์</h3>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">โรงพยาบาลสังขะ</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-black tracking-tighter text-white">Labsangkha</h2>
            <div className="h-1 w-12 bg-brand-blue mx-auto mt-2 rounded-full" />
          </div>

          <div className="flex flex-col items-center md:items-end">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-5">Contact us</h4>
            <ul className="space-y-2 text-center md:text-right">
              <ContactItem icon={<Phone size={14} />} text="044-571-028 ต่อ 115" />
              <ContactItem icon={<Mail size={14} />} text="labsangkha@outlook.com" />
              <ContactItem icon={<MapPin size={14} />} text="อาคารผู้ป่วยนอก ชั้น 2" />
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-800 flex flex-col items-center gap-4 text-xs text-gray-500">
           <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center">
             <p>© 2026 Medical Technology Department. All rights reserved.</p>
             <span className="hidden sm:inline text-gray-700">|</span>
             <p>Smart Medical Laboratory</p>
           </div>
           <div className="flex gap-6 justify-center font-thai text-xs text-gray-400">
             <button 
               onClick={(e) => { e.preventDefault(); onPrivacyClick?.(); }} 
               className="hover:text-blue-400 transition-colors cursor-pointer bg-transparent border-none p-0 text-gray-500 hover:text-white font-medium"
             >
               ประกาศความเป็นส่วนตัว
             </button>
             <span className="text-gray-700">|</span>
             <button 
               onClick={(e) => { e.preventDefault(); onTermsClick?.(); }} 
               className="hover:text-blue-400 transition-colors cursor-pointer bg-transparent border-none p-0 text-gray-500 hover:text-white font-medium"
             >
               ข้อกำหนดการใช้บริการ
             </button>
           </div>
        </div>
      </div>
    </footer>
  );
}

function ContactItem({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <li className="flex items-center justify-center md:justify-end gap-3 text-[11px] text-gray-300 hover:text-white transition-colors cursor-pointer group">
      <span className="font-medium tracking-tight whitespace-nowrap order-1">{text}</span>
      <span className="text-brand-blue group-hover:scale-110 transition-transform order-2">{icon}</span>
    </li>
  );
}

