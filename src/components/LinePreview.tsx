import { Info, MessageCircle, Check, ListChecks } from 'lucide-react';

export default function LinePreview() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 transition-colors">
         <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
               <MessageCircle size={20} />
            </div>
            <div>
               <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">ตัวอย่างข้อความแจ้งเตือน LINE</h3>
               <p className="text-xs text-gray-500 dark:text-gray-400">เมื่อส่งข้อมูลแล้ว ระบบจะส่งข้อความไปที่กลุ่มผู้รับเวร</p>
            </div>
         </div>

         {/* LINE Mockup */}
         <div className="bg-[#8b9db9] rounded-2xl overflow-hidden shadow-inner p-4 relative min-h-[400px]">
             {/* Header */}
             <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#06c755] rounded-full flex items-center justify-center">
                   <MessageCircle size={16} className="text-white fill-current" />
                </div>
                <span className="text-white text-xs font-bold">LINE Notify</span>
             </div>

             {/* Message Box */}
             <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-colors">
                <div className="absolute top-0 right-0 p-3 flex flex-col items-end">
                   <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md text-[10px] font-bold">PENDING</span>
                   <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">🗓 04 พ.ค. 2026</span>
                   <span className="text-[10px] text-gray-400 dark:text-gray-500">🕒 23:29</span>
                </div>

                <div className="flex items-start gap-3 mb-6">
                   <div className="w-12 h-12 bg-[#2B8BE8] rounded-xl flex items-center justify-center text-white overflow-hidden shrink-0 shadow-sm">
                      <img src="https://img.icons8.com/ios-filled/100/ffffff/checklist.png" alt="Checklist" className="w-7 h-7 object-contain" />
                   </div>
                   <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">ส่งเวร</h4>
                      <p className="text-2xl font-black text-[#1A1A2E] dark:text-white tracking-tight">LAB-0008</p>
                   </div>
                </div>

                <div className="bg-[#F0F6FC] dark:bg-slate-800 rounded-xl p-4 mb-6 border border-blue-50 dark:border-slate-750 transition-colors">
                     <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center border border-gray-100 dark:border-slate-700/50 shadow-sm overflow-hidden shrink-0">
                           <img src="https://img.icons8.com/ios-filled/100/2b8be8/company.png" alt="Building" className="w-6 h-6 object-contain" />
                        </div>
                        <div>
                           <span className="text-sm font-bold text-[#1A1A2E] dark:text-white block leading-none mb-1">Blood Bank</span>
                           <span className="text-[10px] text-[#2B8BE8] font-bold block leading-none">เวรเช้า</span>
                        </div>
                     </div>
                     <p className="text-xs text-gray-500 dark:text-gray-400 ml-12 leading-tight">
                        ผู้ส่งเวร: นายไพศาล
                     </p>
                 </div>

                <div className="space-y-3 mb-6">
                   <TaskItem text="ตามผลแลป urgent" isDarkMode={true} />
                   <TaskItem text="ตรวจสอบตู้เย็น BB-01" isDarkMode={true} />
                   <TaskItem text="Calibrate analyzer #3" isDarkMode={true} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <button className="bg-[#06c755] text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                       <Check size={14} /> รับทั้งหมด
                   </button>
                   <button className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all">
                       <ListChecks size={14} /> เลือกรับงาน
                   </button>
                </div>
             </div>
             
             <div className="text-[10px] text-white/70 absolute bottom-3 right-4">09:30 น.</div>
         </div>
      </div>

      <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl p-6 relative overflow-hidden group hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
         <div className="absolute top-0 right-0 -trasp-y-1/2 translate-x-1/2 bg-blue-100/50 w-24 h-24 rounded-full blur-2xl group-hover:bg-blue-200/50 transition-colors" />
         <div className="flex gap-4 items-start z-10 relative">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-200 dark:shadow-none transition-colors">
               <Info size={20} />
            </div>
            <div>
               <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-1">Tips</h4>
               <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                  หลังจากส่งข้อมูลแล้ว ผู้รับเวรจะได้รับแจ้งเตือนทาง LINE <br />
                  ควรตรวจสอบความถูกต้องของข้อมูลก่อนส่งทุกครั้ง
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}

function TaskItem({ text, isDarkMode }: { text: string, isDarkMode?: boolean }) {
  return (
    <div className="flex gap-2 items-start py-0.5">
       <span className="text-xs text-gray-600 dark:text-gray-400 transition-colors leading-relaxed">{text}</span>
    </div>
  );
}
