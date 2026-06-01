import React, { useState, useEffect } from 'react';
import { getLogs, clearAllLogs, LogEntry, sanitizeLogData } from '../lib/logger';
import { 
  Activity, 
  Search, 
  Filter, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  Database,
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  FileCode, 
  Copy, 
  Check, 
  ShieldAlert,
  Download,
  Calendar,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminLogViewerProps {
  isDarkMode?: boolean;
}

export default function AdminLogViewer({ isDarkMode = false }: AdminLogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [daysFilter, setDaysFilter] = useState<string>('All');

  const [showSqlGuide, setShowSqlGuide] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getLogs();
      setLogs(data);
    } catch (e) {
      console.error('Failed to load logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะล้างประวัติการบันทึก Log ทั้งหมด? (This will also attempt to purge Supabase entries)')) {
      await clearAllLogs();
      setLogs([]);
    }
  };

  const copySqlToClipboard = () => {
    const sql = `-- Script สำหรับสร้างตาราง system_logs ในฐานข้อมูล Supabase (handover_sys)
CREATE TABLE IF NOT EXISTS handover_sys.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id TEXT,
    user_name TEXT,
    log_level VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    details TEXT
);

-- ถ้านโยบาย RLS ปิดกั้นการรับเข้า ให้สร้าง RLS Policy ดังนี้:
ALTER TABLE handover_sys.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read/write on system_logs" ON handover_sys.system_logs 
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE handover_sys.system_logs TO anon, authenticated, service_role;`;

    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract unique categories from logs
  const categories = ['All', ...Array.from(new Set(logs.map(log => log.category || 'SYSTEM')))];

  // Helper filter by days
  const isWithinDays = (dateStr: string, days: string) => {
    if (days === 'All') return true;
    const logDate = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - logDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= Number(days);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.message || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLevel = levelFilter === 'All' || log.log_level === levelFilter;
    const matchesCategory = categoryFilter === 'All' || log.category === categoryFilter;
    const matchesDays = isWithinDays(log.created_at, daysFilter);

    return matchesSearch && matchesLevel && matchesCategory && matchesDays;
  });

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-500 border-red-500/30 animate-pulse font-black';
      case 'ERROR':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/30 font-bold';
      case 'WARN':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/30 font-bold';
      case 'INFO':
      default:
        return 'bg-sky-500/10 text-sky-500 border-sky-500/30 font-medium';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <AlertOctagon size={13} className="text-red-500" />;
      case 'ERROR':
        return <AlertTriangle size={13} className="text-rose-500" />;
      case 'WARN':
        return <AlertTriangle size={13} className="text-amber-500" />;
      case 'INFO':
      default:
        return <Info size={13} className="text-sky-500" />;
    }
  };

  const handleExportText = () => {
    const content = filteredLogs.map(log => 
      `[${log.created_at}] [${log.log_level}] [${log.category}] ${log.message}${log.user_name ? ` (By: ${log.user_name})` : ''}\nDetails: ${log.details || 'None'}\n----------------------------------`
    ).join('\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sangkha_handover_system_logs_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 md:space-y-8 animate-fadeIn max-w-full overflow-hidden font-thai">
      {/* Header section with styling matching other pages */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-blue animate-pulse"></span>
            <p className="text-[10px] font-black uppercase text-brand-blue tracking-widest font-mono">System Audit & Stability</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0f2d52] dark:text-white leading-tight font-thai flex items-center gap-2.5">
            <Activity className="text-brand-blue" />
            ระบบบันทึกความมั่นคงและข้อผิดพลาด (System Logs)
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold leading-relaxed font-thai">
            การเก็บบันทึกประวัติการทำงานของเวร ระบบ LINE และความผิดพลาด โดยเซนเซอร์ข้อมูลตัวตนผู้ป่วยอัตโนมัติ
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSqlGuide(!showSqlGuide)}
            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Database size={14} />
            <span>{showSqlGuide ? 'ซ่อนโครงสร้าง DB' : 'ติดตั้งตาราง Supabase'}</span>
          </button>
          
          <button
            type="button"
            onClick={handleExportText}
            disabled={filteredLogs.length === 0}
            className="px-3 py-2.5 bg-[#f1f5f9] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-black text-xs transition flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <Download size={14} />
            <span>ส่งออก (.txt)</span>
          </button>

          <button
            type="button"
            onClick={fetchLogs}
            className="px-3 py-2.5 bg-brand-light dark:bg-slate-900 border border-brand-blue/10 text-brand-blue rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>ดึงค่าล่าสุด</span>
          </button>

          <button
            type="button"
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            className="px-3 py-2.5 bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 rounded-xl font-black text-xs transition flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <Trash2 size={14} />
            <span>ล้าง Log ทั้งหมด</span>
          </button>
        </div>
      </div>

      {/* SQL Setup Helper Guide */}
      <AnimatePresence>
        {showSqlGuide && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-slate-900 border border-slate-850 rounded-[2rem] p-6 text-slate-100 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="text-yellow-500" />
                <h3 className="text-sm font-bold text-white">โค้ดสร้างตาราง `system_logs` ใน Supabase SQL Editor</h3>
              </div>
              <button
                type="button"
                onClick={copySqlToClipboard}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-250 hover:text-white rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก SQL Code'}</span>
              </button>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              หากในฐานข้อมูล Supabase ยังไม่มีตารางเก็บบันทึก Log ระบบจะบันทึก Log สำรองใน Local Storage ของอุปกรณ์แอดมินโดยอัตโนมัติ เพื่อให้สมบูรณ์ แอดมินสามารถเข้าไปที่หน้าโครงการ Supabase &gt; Menu SQL Editor และแปะชุดคำสั่งนี้เพื่อสร้างตารางเก็บประวัติร่วมทุกผู้ใช้งานได้ทันที:
            </p>

            <pre className="p-4 bg-[#0a0f1d] border border-slate-950 rounded-xl overflow-auto text-xs font-mono text-green-400 text-left whitespace-pre leading-relaxed scrollbar-hide max-h-60">
{`CREATE TABLE IF NOT EXISTS handover_sys.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id TEXT,
    user_name TEXT,
    log_level VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    details TEXT
);

ALTER TABLE handover_sys.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read/write on system_logs" ON handover_sys.system_logs 
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE handover_sys.system_logs TO anon, authenticated, service_role;`}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter panel */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3">
          <Filter size={14} className="text-[#6b8daf]" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">กรองข้อมูลและสืบค้น Log</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Text Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาข้อความ, สิทธิ์การใช้, ชื่อ..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#f8fafc] dark:bg-slate-950 border-2 border-transparent focus:border-brand-blue/30 rounded-xl text-xs font-bold outline-none transition-all"
            />
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[50px] text-right">ความสำคัญ:</span>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              className="flex-1 bg-[#f8fafc] dark:bg-slate-950 border-2 border-transparent focus:border-brand-blue/30 py-2.5 px-3 rounded-xl text-xs font-bold outline-none transition-all"
            >
              <option value="All">แสดงทั้งหมด</option>
              <option value="CRITICAL">🔥 CRITICAL</option>
              <option value="ERROR">❌ ERROR</option>
              <option value="WARN">⚠️ WARNING</option>
              <option value="INFO">ℹ️ INFO</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[55px] text-right">หมวดหมู่:</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="flex-1 bg-[#f8fafc] dark:bg-slate-950 border-2 border-transparent focus:border-brand-blue/30 py-2.5 px-3 rounded-xl text-xs font-bold outline-none transition-all"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'แสดงทั้งหมด' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Time range Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[50px] text-right">เวลาเวร:</span>
            <select
              value={daysFilter}
              onChange={e => setDaysFilter(e.target.value)}
              className="flex-1 bg-[#f8fafc] dark:bg-slate-950 border-2 border-transparent focus:border-brand-blue/30 py-2.5 px-3 rounded-xl text-xs font-bold outline-none transition-all"
            >
              <option value="All">เวลาตั้งแต่มีบันทึก</option>
              <option value="1">วันนี้ (ย้อนหลัง 24 ชม.)</option>
              <option value="3">ย้อนหลัง 3 วัน</option>
              <option value="7">ย้อนหลัง 7 วัน</option>
              <option value="30">ย้อนหลัง 30 วัน</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main logs display */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-3 border-brand-blue/30 border-t-brand-blue animate-spin mx-auto pb-1"></div>
            <p className="text-xs text-slate-400 font-bold font-thai">กำลังดึงข้อมูล Log จากฐานข้อมูล...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <Terminal className="text-slate-300 dark:text-slate-700 mx-auto" size={44} />
            <div className="space-y-1">
              <h4 className="text-sm font-black text-[#0f2d52] dark:text-white font-thai">ไม่พบรายการบันทึก Log ค้นหา</h4>
              <p className="text-xs text-slate-400 font-medium font-thai max-w-sm mx-auto">
                ยังไม่มีการบันทึกเหตุการณ์ที่ตรงตามเกณฑ์ หรือกรองข้อมูลที่สืบค้นในปัจจุบัน
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto text-left">
            <table className="w-full min-w-[800px] border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[#0f2d52] dark:text-slate-300 font-black">
                  <th className="py-4 pl-6 pr-4 w-[6%] text-center">ระดับ</th>
                  <th className="py-4 px-4 w-[12%]">หมวดหมู่</th>
                  <th className="py-4 px-4 w-[16%]">วัน-เวลาเกิดปัญหา</th>
                  <th className="py-4 px-4 w-[40%]">ข้อความบันทึกเหตุการณ์</th>
                  <th className="py-4 px-4 w-[16%]">ผู้ดำเนินการ</th>
                  <th className="py-4 pr-6 pl-4 w-[10%] text-center">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const dateStr = new Date(log.created_at).toLocaleString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        className={`hover:bg-[#f8fafc]/50 dark:hover:bg-slate-950/20 transition-all font-medium ${
                          log.log_level === 'CRITICAL' ? 'bg-red-50/10' : ''
                        }`}
                      >
                        {/* level badge */}
                        <td className="py-4 pl-6 pr-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] border ${getLevelBadgeClass(log.log_level)}`}>
                            {getLevelIcon(log.log_level)}
                            {log.log_level}
                          </span>
                        </td>

                        {/* category */}
                        <td className="py-4 px-4">
                          <code className="text-[10px] px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded font-mono font-bold text-[#0f2d52] dark:text-slate-300">
                            {log.category}
                          </code>
                        </td>

                        {/* timestamp */}
                        <td className="py-4 px-4 text-slate-450 font-bold whitespace-nowrap">
                          {dateStr}
                        </td>

                        {/* message */}
                        <td className="py-4 px-4 text-slate-700 dark:text-slate-300 select-all font-bold text-xs">
                          {log.message}
                        </td>

                        {/* user system identification */}
                        <td className="py-4 px-4">
                          {log.user_name ? (
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-bold">
                              <UserCheck size={11} className="text-[#6b8daf]" />
                              {log.user_name}
                            </span>
                          ) : (
                            <span className="text-slate-350 dark:text-slate-650 italic">System Auto</span>
                          )}
                        </td>

                        {/* action detail disclosure toggler */}
                        <td className="py-4 pr-6 pl-4 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black border border-slate-200 hover:border-brand-blue/30 dark:border-slate-800 text-slate-500 hover:text-brand-blue rounded-lg transition cursor-pointer"
                          >
                            <span>ดูประวัติ</span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        </td>
                      </tr>

                      {/* Disclosure details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="bg-[#FAFAFA] dark:bg-slate-950/60 p-5 pl-12 pr-6 border-b border-slate-100 dark:border-slate-850">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3.5 text-left"
                              >
                                <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-2">
                                  <h4 className="text-[11px] font-black text-[#0f2d52] dark:text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
                                    <Terminal size={12} className="text-slate-400" />
                                    Detailed Log Metadata & Raw System Context
                                  </h4>
                                  <span className="text-[10px] text-slate-400 font-mono">ID: {log.id}</span>
                                </div>

                                {log.details ? (
                                  <pre className="p-4 bg-[#0a0f1d] border border-slate-950 rounded-xl overflow-auto text-xs font-mono text-cyan-400 leading-relaxed scrollbar-hide select-text">
                                    {log.details}
                                  </pre>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">ไม่มีข้อมูลดีบั๊กสรุปของประวัติรายละเอียดเพิ่มเติม</p>
                                )}
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
