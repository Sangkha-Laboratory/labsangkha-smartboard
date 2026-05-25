import React from 'react';
import { Book, MessageSquare, Shield, Megaphone, ArrowRight } from 'lucide-react';

export default function SupportSection({ vertical = false, onManualClick, onContactClick, onSafetyClick }: { vertical?: boolean; onManualClick?: () => void; onContactClick?: () => void; onSafetyClick?: () => void }) {
  return (
    <div className={`grid gap-6 ${vertical ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
      <SupportCard 
        icon={<Book className="text-blue-600 dark:text-blue-400" />} 
        title="คู่มือการส่งเวร" 
        desc="แนวทางการส่งเวรและตัวอย่างการบันทึก" 
        link="เปิดคู่มือ"
        bgColor="bg-blue-50 dark:bg-blue-900/20"
        onClick={onManualClick}
      />
      <SupportCard 
        icon={<MessageSquare className="text-indigo-600 dark:text-indigo-400" />} 
        title="ติดต่อทีมงาน" 
        desc="แจ้งปัญหาหรือขอความช่วยเหลือเทคนิค" 
        link="ติดต่อเรา"
        bgColor="bg-indigo-50 dark:bg-indigo-900/20"
        onClick={onContactClick}
      />
      <SupportCard 
        icon={<Shield className="text-emerald-600 dark:text-emerald-400" />} 
        title="ความปลอดภัย" 
        desc="นโยบายความเป็นส่วนตัวและสิทธิ์ข้อมูล" 
        link="อ่านนโยบาย"
        bgColor="bg-emerald-50 dark:bg-emerald-900/20"
        onClick={onSafetyClick}
      />
    </div>
  );
}

function SupportCard({ icon, title, desc, link, bgColor, onClick }: { icon: React.ReactNode, title: string, desc: string, link: string, bgColor: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`glass-card p-4 rounded-[1.5rem] transition-all group h-full flex flex-col justify-between ${onClick ? 'cursor-pointer hover:border-brand-blue/40' : 'cursor-pointer'}`}
    >
      <div className="flex gap-3 mb-3">
        <div className={`w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
          {React.cloneElement(icon as React.ReactElement, { size: 18 })}
        </div>
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white mb-1 leading-tight text-xs sm:text-sm">{title}</h4>
          <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[9px] sm:text-xs font-bold text-blue-600 dark:text-blue-400">
        <span>{link}</span>
        <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}
