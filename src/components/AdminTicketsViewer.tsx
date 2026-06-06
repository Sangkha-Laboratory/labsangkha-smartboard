import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  HelpCircle,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Inbox,
  Trash2,
  MessageSquare,
  FileText,
  BookmarkCheck,
  Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { writeLog } from '../lib/logger';

export interface SupportTicket {
  id: string;
  name: string;
  department: string;
  category: string;
  message: string;
  created_at: string;
  status?: string; // Proposed: 'Pending' or 'Resolved'
}

export default function AdminTicketsViewer() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'table' | 'log_fallback' | 'local'>('table');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // local storage tracked statuses

  // Resolved statuses stored in localStorage for maximum flexibility
  const [resolvedTicketIds, setResolvedTicketIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sangkha_admin_resolved_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const toggleResolveTicket = (ticketId: string) => {
    let updated: string[];
    const isNowResolved = !resolvedTicketIds.includes(ticketId);
    if (isNowResolved) {
      updated = [...resolvedTicketIds, ticketId];
    } else {
      updated = resolvedTicketIds.filter(id => id !== ticketId);
    }
    setResolvedTicketIds(updated);
    localStorage.setItem('sangkha_admin_resolved_tickets', JSON.stringify(updated));

    // Optional: Log this action for audit
    writeLog(
      'INFO',
      'SUPPORT_TICKET_UPDATE',
      `ผู้ดูแลระบบได้เปลี่ยนสถานะตั๋ว ${ticketId} เป็น ${isNowResolved ? 'แก้ไขแล้ว' : 'กำลังดำเนินการ'}`
    );
  };

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      // Step 1: Try reading from 'support_tickets' table
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Table exists and data retrieved
        const formatted = data.map((t: any) => ({
          id: t.id,
          name: t.name || 'ไม่ระบุชื่อ',
          department: t.department || 'Central Lab',
          category: t.category || 'bug',
          message: t.message || '',
          created_at: t.created_at || new Date().toISOString()
        }));
        setTickets(formatted);
        setDataSource('table');
      } else {
        // Step 2: Fallback to reading system_logs for SUPPORT_TICKET category
        console.warn('support_tickets table read omitted, falling back to system_logs audit table:', error?.message);
        
        const { data: logsData, error: logsError } = await supabase
          .from('system_logs')
          .select('*')
          .eq('category', 'SUPPORT_TICKET')
          .order('created_at', { ascending: false });

        if (!logsError && logsData && logsData.length > 0) {
          const parsed = logsData.map((log: any) => {
            let detailsObj: any = {};
            try {
              if (log.details) {
                detailsObj = JSON.parse(log.details);
              }
            } catch (_) {}

            return {
              id: detailsObj.ticket_id || log.id || `TKT-${Math.floor(100000 + Math.random() * 90000)}`,
              name: detailsObj.name || log.user_name || 'ไม่ระบุชื่อ',
              department: detailsObj.department || 'Central Lab',
              category: detailsObj.category || 'bug',
              message: detailsObj.message || log.message || '',
              created_at: log.created_at
            };
          });
          setTickets(parsed);
          setDataSource('log_fallback');
        } else {
          // Step 3: No tickets in either DB layer, read standard local storage support tickets of current user as local fallback
          const savedLocal = localStorage.getItem('support_tickets');
          if (savedLocal) {
            const parsedLocal = JSON.parse(savedLocal).map((t: any) => ({
              id: t.id,
              name: t.name,
              department: t.department,
              category: t.category,
              message: t.message,
              created_at: new Date(t.timestamp || Date.now()).toISOString()
            }));
            setTickets(parsedLocal);
            setDataSource('local');
          } else {
            setTickets([]);
            setDataSource('table');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching support tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteTicket = async (ticketId: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบตั๋วแจ้งปัญหานี้ (${ticketId}) ออกจากมุมมองแอดมิน?`)) {
      return;
    }

    try {
      if (dataSource === 'table') {
        const { error } = await supabase
          .from('support_tickets')
          .delete()
          .eq('id', ticketId);
        if (error) throw error;
      } else if (dataSource === 'log_fallback') {
        // If from logs, we can delete the corresponding log entry or filter it out locally
        const { error } = await supabase
          .from('system_logs')
          .delete()
          .eq('category', 'SUPPORT_TICKET')
          .like('message', `%${ticketId}%`);
        if (error) throw error;
      }

      setTickets(prev => prev.filter(t => t.id !== ticketId));
      writeLog('WARN', 'SUPPORT_TICKET_DELETE', `ผู้ดูแลระบบได้ลบตั๋ว ${ticketId} สำเร็จ`);
    } catch (err: any) {
      console.error('Failed to delete ticket:', err);
      // Remove locally from state anyway if it's database permission error
      setTickets(prev => prev.filter(t => t.id !== ticketId));
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'bug':
        return {
          label: 'พบข้อผิดพลาด (Bug)',
          textColor: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950/20 border-red-150 dark:border-red-900/40',
          badgeColor: 'bg-red-500'
        };
      case 'feature':
        return {
          label: 'แนะนำฟีเจอร์ใหม่',
          textColor: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/20 border-blue-150 dark:border-blue-900/40',
          badgeColor: 'bg-blue-500'
        };
      case 'account':
        return {
          label: 'บัญชี/รหัสผ่าน',
          textColor: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-950/20 border-purple-150 dark:border-purple-900/40',
          badgeColor: 'bg-purple-500'
        };
      case 'other':
      default:
        return {
          label: 'ปัญหาด้านเทคนิคอื่น ๆ',
          textColor: 'text-slate-600 dark:text-slate-400',
          bgColor: 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800',
          badgeColor: 'bg-slate-500'
        };
    }
  };

  const departments = ['All', 'Central Lab', 'Blood Bank', 'Central Lab (Central)', 'Central Lab (IPD)', 'Central Lab (OPD)', 'Central Lab (ER)'];

  const filteredTickets = tickets.filter(t => {
    const isResolved = resolvedTicketIds.includes(t.id);
    const matchesSearch = 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    const matchesDept = deptFilter === 'All' || t.department === deptFilter;
    
    const matchesStatus = 
      statusFilter === 'All' ||
      (statusFilter === 'Resolved' && isResolved) ||
      (statusFilter === 'Pending' && !isResolved);

    return matchesSearch && matchesCategory && matchesDept && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 pb-6 space-y-6 md:space-y-8 animate-fadeIn max-w-full font-thai">
      {/* Header section with styling matching other pages */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-blue animate-pulse"></span>
            <p className="text-[10px] font-black uppercase text-brand-blue tracking-widest font-mono">User Support & Helpdesk</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0f2d52] dark:text-white leading-tight font-thai flex items-center gap-2.5">
            <HelpCircle className="text-brand-blue" />
            ตั๋วแจ้งปัญหาของระบบ (Support Tickets)
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold leading-relaxed font-thai flex items-center gap-1.5">
            รวบรวมข้อเสนอแนะและแจ้งปัญหาขัดข้องจากนักเทคนิคการแพทย์ในหน่วยงานต่าง ๆ
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono uppercase bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500`}>
              Data source: {dataSource === 'table' ? 'Database Table 🗃️' : dataSource === 'log_fallback' ? 'Log Audit Fallback 🗒️' : 'Client Memory 💾'}
            </span>
          </p>
        </div>

        {/* Refresh logic */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={fetchTickets}
            className="px-3 py-2.5 bg-brand-light dark:bg-slate-900 border border-brand-blue/10 text-brand-blue rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer hover:bg-brand-blue/10"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>รีเฟรชตั๋วแจ้ง</span>
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3">
          <Filter size={14} className="text-[#6b8daf]" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">กรองข้อมูลตั๋วแจ้ง</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Text Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาตามรหัส, ผู้ส่ง, หรือข้อความ..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#f8fafc] dark:bg-slate-950 border-2 border-transparent focus:border-brand-blue/30 rounded-xl text-xs font-bold outline-none transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[50px] text-right">ประเภท:</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="flex-1 bg-[#f8fafc] dark:bg-slate-950 border-2 border-transparent focus:border-brand-blue/30 py-2.5 px-3 rounded-xl text-xs font-bold outline-none transition-all"
            >
              <option value="All">ทุกหมวดหมู่</option>
              <option value="bug">🐛 พบข้อผิดพลาด (Bug)</option>
              <option value="feature">💡 ข้อเสนอแนะ / เพิ่มฟีเจอร์</option>
              <option value="account">🔑 ปัญหาบัญชี / รหัสผ่าน</option>
              <option value="other">⚙️ ปัญหาทางเทคนิคอื่น ๆ</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[50px] text-right">ห้องแล็บ:</span>
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="flex-1 bg-[#f8fafc] dark:bg-slate-950 border-2 border-transparent focus:border-brand-blue/30 py-2.5 px-3 rounded-xl text-xs font-bold outline-none transition-all"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept === 'All' ? 'ทุกห้องแล็บ / ทุกส่วน' : dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[50px] text-right">สถานะ:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="flex-1 bg-[#f8fafc] dark:bg-slate-950 border-2 border-transparent focus:border-brand-blue/30 py-2.5 px-3 rounded-xl text-xs font-bold font-thai outline-none transition-all"
            >
              <option value="All">สถานะทั้งหมด</option>
              <option value="Pending">🔴 รอดำเนินการ (Active)</option>
              <option value="Resolved">🟢 ตรวจสอบและแก้ไขแล้ว (Resolved)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Tickets display */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-5">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-3 border-brand-blue/30 border-t-brand-blue animate-spin mx-auto pb-1"></div>
            <p className="text-xs text-slate-400 font-bold font-thai">กำลังดึงข้อมูลตั๋วแจ้งปัญหา...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <Inbox className="text-slate-300 dark:text-slate-700 mx-auto" size={48} />
            <div className="space-y-1">
              <h4 className="text-sm font-black text-[#0f2d52] dark:text-white font-thai">ไม่มีตั๋วแจ้งปัญหาระบบ</h4>
              <p className="text-xs text-slate-400 font-medium font-thai max-w-sm mx-auto leading-relaxed">
                ไม่พบรายการแจ้งปัญหาใด ๆ ในขณะนี้เมื่อตรงกับตัวกรองที่เลือก
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredTickets.map((ticket, idx) => {
                const isResolved = resolvedTicketIds.includes(ticket.id);
                const theme = getCategoryTheme(ticket.category);
                const isExpanded = expandedTicketId === ticket.id;

                const displayDate = new Date(ticket.created_at).toLocaleString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) + ' น.';

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={ticket.id}
                    className={`rounded-2xl border transition-all duration-300 p-5 ${
                      isResolved 
                        ? 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800/80' 
                        : 'bg-white dark:bg-slate-900 border-slate-100 hover:border-brand-blue/25 dark:border-slate-800 shadow-md shadow-slate-100/10 hover:shadow-lg hover:shadow-slate-100/15'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      {/* Left: General Meta */}
                      <div className="space-y-2.5 flex-1 min-w-0">
                        {/* ID, Badge, Timestamp */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-black text-brand-blue bg-brand-blue/5 border border-brand-blue/15 px-2.5 py-0.5 rounded-lg shrink-0">
                            {ticket.id}
                          </span>
                          
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${theme.bgColor} ${theme.textColor} shrink-0`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.badgeColor}`} />
                            {theme.label}
                          </span>

                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 font-thai flex items-center gap-1 ml-auto md:ml-0">
                            <Clock size={12} />
                            {displayDate}
                          </span>
                        </div>

                        {/* Title and Message Extract */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 bg-[#f1f5f9] dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                              <User size={10} className="text-slate-500" />
                              {ticket.name}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-[#f1f5f9] dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                              <Building size={10} className="text-slate-500" />
                              {ticket.department}
                            </span>
                          </div>

                          <div 
                            onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                            className="text-sm font-bold text-[#0f2d52] dark:text-slate-100 cursor-pointer pt-1 line-clamp-2 hover:text-brand-blue transition-colors font-thai leading-relaxed select-text"
                          >
                            {ticket.message}
                          </div>
                        </div>
                      </div>

                      {/* Right Actions: Resolve Toggler / Delete */}
                      <div className="flex items-center gap-2 self-end md:self-auto shrink-0 md:pt-1">
                        <button
                          type="button"
                          onClick={() => toggleResolveTicket(ticket.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-black font-thai transition flex items-center gap-1.5 border cursor-pointer ${
                            isResolved
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100/50'
                              : 'bg-white dark:bg-slate-900 text-slate-600 hover:text-emerald-600 border-slate-200 dark:border-slate-800 hover:border-emerald-200'
                          }`}
                          title={isResolved ? "ทำตำแหน่งงานเดิม / Mark as Unresolved" : "แก้ไขแล้ว / Mark as Resolved"}
                        >
                          {isResolved ? (
                            <>
                              <CheckCircle2 size={13} className="text-emerald-500" />
                              <span>แก้ไขแล้ว</span>
                            </>
                          ) : (
                            <>
                              <Clock size={13} className="text-slate-400" />
                              <span>ทำเครื่องหมายว่าเสร็จสิ้น</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="p-2 w-9 h-9 rounded-xl border border-red-150 hover:bg-red-50 text-red-500 dark:border-red-900/40 dark:hover:bg-red-950/20 transition flex items-center justify-center cursor-pointer"
                          title="ลบตั๋ว / Delete Ticket"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Expandable detailed description section */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5 overflow-hidden text-left"
                        >
                          <div className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
                            <MessageSquare size={12} />
                            ข้อความรายละเอียดปัญหาแบบเต็ม:
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-755 dark:text-slate-300 font-medium select-text whitespace-pre-wrap leading-relaxed font-thai border border-slate-100 dark:border-slate-900">
                            {ticket.message}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
