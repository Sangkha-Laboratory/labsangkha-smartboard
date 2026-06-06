import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CustomSelect } from './CustomSelect';
import { getAnnouncements, saveAnnouncement, deleteAnnouncement, Announcement, subscribeToAnnouncements } from '../lib/announcements';
import AdminLogViewer from './AdminLogViewer';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  UserCircle, 
  Megaphone, 
  Settings, 
  Search, 
  Bell, 
  Plus, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
  TrendingUp,
  Activity,
  ArrowRight,
  Filter,
  RefreshCw,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreVertical,
  Menu,
  ShieldAlert,
  Download,
  Sun,
  Moon,
  Trash2,
  Calendar,
  X,
  FileDown,
  Microscope,
  UserPlus,
  Edit2,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  Pin,
  Copy
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { supabase } from '../lib/supabase';
import { getActiveConfig } from '../config';
import { toPng } from 'html-to-image';

interface AdminPortalProps {
  user: any;
  onLogout: () => void;
  onSwitchToSite: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function AdminPortal({ 
  user, 
  onLogout, 
  onSwitchToSite,
  isDarkMode = false,
  onToggleDarkMode
}: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('admin_portal_active_tab') || 'Overview';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('admin_portal_active_tab', activeTab);
  }, [activeTab]);

  // Live Data States
  const [stats, setStats] = useState({
    pending: 0,
    acceptedToday: 0,
    avgAcceptTime: '--',
    activeSenders: 0,
    viaLine: 0,
    viaLinePercent: 0,
    viaWeb: 0,
    viaWebPercent: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [handovers, setHandovers] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<{ name: string, pending: number, accepted: number }[]>([]);
  const [divisionData, setDivisionData] = useState<{ name: string, value: number, color: string }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string, value: number, color: string }[]>([]);
  const [shiftStatusData, setShiftStatusData] = useState<{ name: string, 'รอรับงาน': number, 'รับงานแล้ว': number }[]>([]);
  const [topSenders, setTopSenders] = useState<{ name: string, count: number }[]>([]);

  // Filter States
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // History View States
  const [historySearch, setHistorySearch] = useState('');
  const [historyDivisionFilter, setHistoryDivisionFilter] = useState('All');
  const [historyShiftFilter, setHistoryShiftFilter] = useState('All');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('All');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [selectedHandover, setSelectedHandover] = useState<any | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [handoverToDelete, setHandoverToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Handover States
  const [isEditHandoverMode, setIsEditHandoverMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editHandoverDate, setEditHandoverDate] = useState('');
  const [editDivision, setEditDivision] = useState('');
  const [editShift, setEditShift] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editSenderId, setEditSenderId] = useState('');
  const [editReceiverId, setEditReceiverId] = useState('');
  const [editReceiverLineName, setEditReceiverLineName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingHandover, setIsSavingHandover] = useState(false);
  const [editHandoverError, setEditHandoverError] = useState<string | null>(null);

  const startEditingHandover = () => {
    if (!selectedHandover) return;
    setEditTitle(selectedHandover.title || '');
    setEditHandoverDate(selectedHandover.handover_date || '');
    setEditDivision(selectedHandover.division || '');
    setEditShift(selectedHandover.shift || selectedHandover.category?.split('|')[0] || '');
    setEditStatus(selectedHandover.status || 'Pending');
    setEditSenderId(selectedHandover.sender_id || '');
    setEditReceiverId(selectedHandover.receiver_id || '');
    setEditReceiverLineName(selectedHandover.receiver_line_name || '');
    setEditDescription(selectedHandover.description || '');
    setEditHandoverError(null);
    setIsEditHandoverMode(true);
  };

  const handleSaveHandover = async () => {
    if (!selectedHandover) return;
    if (!editTitle.trim()) {
      setEditHandoverError('กรุณากรอกหัวข้อรายละเอียดการส่งงาน');
      return;
    }
    if (!editDivision.trim()) {
      setEditHandoverError('กรุณาเลือกแผนก');
      return;
    }

    setIsSavingHandover(true);
    setEditHandoverError(null);

    try {
      const updatePayload: any = {
        title: editTitle,
        handover_date: editHandoverDate,
        division: editDivision,
        shift: editShift,
        status: editStatus,
        sender_id: editSenderId || null,
        receiver_id: editReceiverId || null,
        receiver_line_name: editReceiverLineName || null,
        description: editDescription,
      };

      // If category has shift in it (hybrid model legacy fallback)
      const currentCategory = selectedHandover.category || '';
      if (currentCategory.includes('|')) {
        const parts = currentCategory.split('|');
        parts[0] = editShift;
        updatePayload.category = parts.join('|');
      }

      const { error } = await supabase
        .from('handovers')
        .update(updatePayload)
        .eq('id', selectedHandover.id);

      if (error) throw error;

      // Update local state is matching so UI refreshes seamlessly
      const updatedItem = {
        ...selectedHandover,
        ...updatePayload,
        sender: editSenderId ? (usersList.find(u => u.id === editSenderId) || selectedHandover.sender) : null,
        receiver: editReceiverId ? (usersList.find(u => u.id === editReceiverId) || selectedHandover.receiver) : null,
      };

      setSelectedHandover(updatedItem);
      setIsEditHandoverMode(false);
      
      // Refresh the main grid handovers
      await fetchDashboardData();

    } catch (err: any) {
      console.error('Error updating handover:', err);
      setEditHandoverError('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (err.message || ''));
    } finally {
      setIsSavingHandover(false);
    }
  };

  const closeHandoverDetail = () => {
    setSelectedHandover(null);
    setIsEditHandoverMode(false);
    setEditHandoverError(null);
  };

  // Pagination States
  const [historyPage, setHistoryPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);

  const handleDeleteHandover = async (id: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('handovers')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Refresh UI state or refetch
      await fetchDashboardData();
      setIsDeleteConfirmOpen(false);
      setHandoverToDelete(null);
      if (selectedHandover?.id === id) {
        setSelectedHandover(null);
      }
    } catch (err: any) {
      console.error('Error deleting handover:', err);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + (err.message || ''));
    } finally {
      setIsDeleting(false);
    }
  };

  // User Management States
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [userStatusFilter, setUserStatusFilter] = useState('All');
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [showUserPassword, setShowUserPassword] = useState(false);
  
  // Create / Edit User Form State
  const [selectedUser, setSelectedUser] = useState<any | null>(null); // Null for create, user object for edit
  const [userIdInput, setUserIdInput] = useState('');
  const [userFullNameInput, setUserFullNameInput] = useState('');
  const [userRoleInput, setUserRoleInput] = useState('staff');
  const [userPasswordInput, setUserPasswordInput] = useState('');
  const [userEmailInput, setUserEmailInput] = useState('');
  const [userIsActiveInput, setUserIsActiveInput] = useState(true);

  // Reset page to 1 when filters or search terms change
  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historyDivisionFilter, historyShiftFilter, historyStatusFilter, historyDateFilter]);

  useEffect(() => {
    setUsersPage(1);
  }, [userSearchText, userRoleFilter, userStatusFilter]);
  
  // Delete User Confirmation Modal State
  const [isUserDeleteConfirmOpen, setIsUserDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [isUserDeleting, setIsUserDeleting] = useState(false);
  const [userDeleteErrorModal, setUserDeleteErrorModal] = useState<string | null>(null);

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [announcementCategoryFilter, setAnnouncementCategoryFilter] = useState('All');
  const [announcementPinnedFilter, setAnnouncementPinnedFilter] = useState('All');
  const [isAnnouncementsLoading, setIsAnnouncementsLoading] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Announcement Modal Form State
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null); // Null for create
  const [annTitleInput, setAnnTitleInput] = useState('');
  const [annCategoryInput, setAnnCategoryInput] = useState<'critical' | 'important' | 'general'>('general');
  const [annContentInput, setAnnContentInput] = useState('');
  const [annAuthorInput, setAnnAuthorInput] = useState('หัวหน้ากลุ่มงานเทคนิคการแพทย์');
  const [annPinnedInput, setAnnPinnedInput] = useState(false);
  const [annFormError, setAnnFormError] = useState<string | null>(null);

  // Announcement Delete State
  const [isAnnDeleteConfirmOpen, setIsAnnDeleteConfirmOpen] = useState(false);
  const [annToDelete, setAnnToDelete] = useState<Announcement | null>(null);
  const [isAnnDeleting, setIsAnnDeleting] = useState(false);
  const [viewedAnnouncement, setViewedAnnouncement] = useState<Announcement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedImage, setExportedImage] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // LINE Settings States
  const [lineGroups, setLineGroups] = useState<any[]>([]);
  const [isLoadingLineSettings, setIsLoadingLineSettings] = useState(false);
  const [activeLineGroupId, setActiveLineGroupId] = useState<string>('');
  const [newLineGroupId, setNewLineGroupId] = useState<string>('');
  const [isSavingLineSettings, setIsSavingLineSettings] = useState(false);
  const [testNotificationStatus, setTestNotificationStatus] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);

  const handleCopyGroupId = useCallback((groupId: string) => {
    if (!groupId) return;
    navigator.clipboard.writeText(groupId);
    setCopiedGroupId(groupId);
    setTimeout(() => {
      setCopiedGroupId(null);
    }, 2000);
  }, []);

  const fetchLineSettings = useCallback(async () => {
    setIsLoadingLineSettings(true);
    try {
      const { data: activeGroupId, error: rpcError } = await supabase.rpc('get_active_line_group');
      if (rpcError) {
        console.warn('RPC get_active_line_group failed, fallback to select:', rpcError);
      }
      
      const { data: groups, error: fetchError } = await supabase
        .from('line_groups')
        .select('*')
        .order('joined_at', { ascending: false });
        
      if (fetchError) throw fetchError;
      
      setLineGroups(groups || []);
      
      const matchedActive = activeGroupId || groups?.find(g => g.is_active)?.group_id || '';
      setActiveLineGroupId(matchedActive);
      setNewLineGroupId(matchedActive);
    } catch (err: any) {
      console.error('Error fetching LINE settings:', err);
    } finally {
      setIsLoadingLineSettings(false);
    }
  }, []);

  const handleSaveLineGroup = async (groupIdToSave: string) => {
    if (!groupIdToSave.trim()) {
      alert('กรุณากรอก Group ID');
      return;
    }
    setIsSavingLineSettings(true);
    try {
      const { error } = await supabase.rpc('save_line_group', { p_group_id: groupIdToSave.trim() });
      if (error) throw error;
      
      await fetchLineSettings();
      alert('บันทึกตั้งค่ากลุ่ม LINE สำเร็จ');
    } catch (err: any) {
      console.error('Error saving LINE group:', err);
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (err.message || ''));
    } finally {
      setIsSavingLineSettings(false);
    }
  };

  const handleTestNotification = async () => {
    if (!activeLineGroupId) {
      setTestNotificationStatus({ 
        status: 'error', 
        message: 'กรุณาเลือกและตั้งค่ากลุ่ม LINE ที่ใช้งานอยู่ (Active) ก่อนทำการทดสอบ' 
      });
      return;
    }
    
    setTestNotificationStatus({ status: 'loading' });
    try {
      const activeConfig = getActiveConfig();
      const supabaseUrl = activeConfig.supabaseUrl;
      const supabaseAnonKey = activeConfig.supabaseAnonKey;
      const functionUrl = `${supabaseUrl}/functions/v1/handle-new-handover`;
      
      const payload = {
        id: "00000000-0000-0000-0000-000000000000",
        division: "ทดสอบการเชื่อมต่อระบบ",
        shift: "กลางวัน/ทดสอบ",
        sender_name: user?.full_name || "ผู้ดูแลระบบ",
        tasks: [
          {
            id: "test-task",
            title: "ทดสอบการส่งการแจ้งเตือน LINE Flex Message",
            detail: "นี่คือข้อความทดสอบจากหน้าตั้งค่าระบบ LINE Settings ใน Admin Portal ระบบของคุณพร้อมรับส่งเวรและแจ้งเตือนแล้ว"
          }
        ],
        created_at: new Date().toISOString()
      };

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      console.log("LINE Test response:", text);

      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        // Not JSON
      }

      if (response.ok && (data.success !== false)) {
        setTestNotificationStatus({ 
          status: 'success', 
          message: 'ส่งข้อความทดสอบไปยังกลุ่ม LINE สำเร็จแล้ว! กรุณาตรวจสอบในกลุ่ม LINE ของท่าน' 
        });
      } else {
        throw new Error(data.error || 'การส่งแจ้งเตือนตอบกลับว่าไม่สำเร็จ');
      }
    } catch (err: any) {
      console.error('Error testing LINE notify:', err);
      setTestNotificationStatus({ 
        status: 'error', 
        message: 'ส่งล้มเหลว: ' + (err.message || 'ไม่สามารถติดต่อ Edge Function ได้') 
      });
    }
  };

  const handleDeleteLineGroup = async (groupIdToDelete: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกลุ่ม LINE นี้จากประวัติ?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('line_groups')
        .delete()
        .eq('group_id', groupIdToDelete);
        
      if (error) throw error;
      
      if (activeLineGroupId === groupIdToDelete) {
        setActiveLineGroupId('');
        setNewLineGroupId('');
      }
      
      await fetchLineSettings();
    } catch (err: any) {
      console.error('Error deleting LINE group:', err);
      alert('ไม่สามารถลบกลุ่มไลน์ได้: ' + (err.message || ''));
    }
  };

  const fetchUsersData = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role, is_active, email')
        .order('full_name', { ascending: true });
        
      if (error) throw error;
      setUsersList(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const openCreateUserModal = () => {
    setSelectedUser(null);
    // Auto generate a tentative unique ID
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    setUserIdInput(`STAFF-${randomHex}`);
    setUserFullNameInput('');
    setUserRoleInput('staff');
    setUserPasswordInput('');
    setUserEmailInput('');
    setUserIsActiveInput(true);
    setUserFormError(null);
    setShowUserPassword(false);
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (user: any) => {
    setSelectedUser(user);
    setUserIdInput(user.id);
    setUserFullNameInput(user.full_name || '');
    setUserRoleInput(user.role || 'staff');
    setUserPasswordInput(''); // Clear to protect password privacy. Only updated if a new one is typed.
    setUserEmailInput(user.email || '');
    setUserIsActiveInput(user.is_active !== false); // default to true
    setUserFormError(null);
    setShowUserPassword(false);
    setIsUserModalOpen(true);
  };

  // Announcement Handlers
  const openCreateAnnModal = () => {
    setSelectedAnnouncement(null);
    setAnnTitleInput('');
    setAnnCategoryInput('general');
    setAnnContentInput('');
    setAnnAuthorInput(user?.full_name || 'หัวหน้ากลุ่มงานเทคนิคการแพทย์');
    setAnnPinnedInput(false);
    setAnnFormError(null);
    setIsAnnModalOpen(true);
  };

  const openEditAnnModal = (ann: Announcement) => {
    setSelectedAnnouncement(ann);
    setAnnTitleInput(ann.title);
    setAnnCategoryInput(ann.category);
    setAnnContentInput(ann.content);
    setAnnAuthorInput(ann.author);
    setAnnPinnedInput(ann.pinned);
    setAnnFormError(null);
    setIsAnnModalOpen(true);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnFormError(null);

    const trimmedTitle = annTitleInput.trim();
    const trimmedContent = annContentInput.trim();
    const trimmedAuthor = annAuthorInput.trim();

    if (!trimmedTitle) {
      setAnnFormError('กรุณากรอกหัวข้อประกาศ');
      return;
    }
    if (!trimmedContent) {
      setAnnFormError('กรุณากรอกเนื้อหาประกาศ');
      return;
    }

    try {
      setIsAnnouncementsLoading(true);
      await saveAnnouncement({
        id: selectedAnnouncement?.id,
        title: trimmedTitle,
        category: annCategoryInput,
        content: trimmedContent,
        author: trimmedAuthor,
        pinned: annPinnedInput,
        date: selectedAnnouncement?.date
      });
      setIsAnnModalOpen(false);
      await loadAnnouncements();
    } catch (err: any) {
      setAnnFormError('เกิดข้อผิดพลาดในการบันทึกประกาศ: ' + err.message);
    } finally {
      setIsAnnouncementsLoading(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!annToDelete) return;
    try {
      setIsAnnDeleting(true);
      await deleteAnnouncement(annToDelete.id);
      setIsAnnDeleteConfirmOpen(false);
      setAnnToDelete(null);
      await loadAnnouncements();
    } catch (err) {
      console.error('Error deleting announcement:', err);
    } finally {
      setIsAnnDeleting(false);
    }
  };

  const handleTogglePinAnnouncement = async (ann: Announcement) => {
    try {
      await saveAnnouncement({
        ...ann,
        pinned: !ann.pinned
      });
      await loadAnnouncements();
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError(null);

    const trimmedId = userIdInput.trim();
    const trimmedName = userFullNameInput.trim();
    const trimmedPass = userPasswordInput.trim();
    const trimmedEmail = userEmailInput.trim();

    if (!trimmedId) {
      setUserFormError('กรุณากรอกรหัสผู้ใช้งาน/เจ้าหน้าที่');
      return;
    }
    if (!trimmedName) {
      setUserFormError('กรุณากรอกชื่อ-นามสกุล');
      return;
    }

    // Password is only mandatory for new users
    if (!selectedUser && !trimmedPass) {
      setUserFormError('กรุณากรอกรหัสผ่านสำหรับการบันทึกเวร');
      return;
    }

    try {
      setIsLoadingUsers(true);

      const payload: any = {
        id: trimmedId,
        full_name: trimmedName,
        role: userRoleInput,
        is_active: userIsActiveInput,
        email: trimmedEmail || null
      };

      // Only set sender_pass if it was typed or we are creating a new user
      if (trimmedPass) {
        payload.sender_pass = trimmedPass;
      }

      if (selectedUser) {
        // Editing existing user
        const { error } = await supabase
          .from('users')
          .update(payload)
          .eq('id', selectedUser.id);

        if (error) throw error;
      } else {
        // Creating new user
        // Check duplication of ID first
        const { data: existing, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', trimmedId)
          .maybeSingle();

        if (checkError) throw checkError;
        if (existing) {
          setUserFormError('รหัสผู้ใช้งานนี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น');
          setIsLoadingUsers(false);
          return;
        }

        const { error } = await supabase
          .from('users')
          .insert([payload]);

        if (error) throw error;
      }

      setIsUserModalOpen(false);
      await fetchUsersData();
    } catch (err: any) {
      console.error('Error saving user:', err);
      setUserFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsUserDeleting(true);
    setUserDeleteErrorModal(null);

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);

      if (error) {
        // Customize the error if the DB rejects due to foreign keys reference (very common is '23503')
        if (error.code === '23503' || error.message?.includes('foreign key constraint') || error.code === '42501') {
          throw new Error('cannot_delete_fk');
        }
        throw error;
      }

      setIsUserDeleteConfirmOpen(false);
      setUserToDelete(null);
      await fetchUsersData();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      if (err.message === 'cannot_delete_fk' || err.code === '23503') {
        setUserDeleteErrorModal(`ไม่สามารถลบคุณ ${userToDelete.full_name} ถาวรได้ เนื่องจากผู้ใช้นี้เคยทำรายการส่งเวรในระบบมาก่อน\n\nเพื่อความถูกต้องและประพฤติสถิติย้อนหลังของโรงพยาบาล แนะนำให้เปลี่ยน สถานะการทำงาน เป็น "ปิดการใช้งาน (Inactive)" แทน ซึ่งผู้ใช้คนนี้จะไม่สามารถเห็นในหน้าต่างลงชื่อใช้งานหรือส่งเวรได้อีก แต่ข้อมูลเก่ายังคงอยู่ครบถ้วน`);
      } else {
        setUserDeleteErrorModal(err.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน');
      }
    } finally {
      setIsUserDeleting(false);
    }
  };

  const toggleUserActiveStatus = async (user: any) => {
    try {
      const newStatus = !user.is_active;
      const { error } = await supabase
        .from('users')
        .update({ is_active: newStatus })
        .eq('id', user.id);

      if (error) throw error;
      
      // Update local state smoothly
      setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
    } catch (err) {
      console.error('Error toggling user active status:', err);
    }
  };

  const handleExportCSV = (items: any[]) => {
    // Generate CSV content
    const headers = ['ID', 'Date', 'Division', 'Shift', 'Category', 'Title', 'Description', 'Status', 'Sender', 'Receiver', 'Created At'];
    const rows = items.map(h => {
      const catField = h.category || '';
      let itemShift = h.shift || '';
      let itemCat = '';
      if (!itemShift && catField.includes('|')) {
        const [s, c] = catField.split('|');
        itemShift = s || 'ไม่ระบุ';
        itemCat = c || '';
      } else if (!itemShift) {
        itemShift = catField || 'ไม่ระบุ';
        itemCat = '';
      } else {
        itemCat = catField;
      }
      return [
        h.id,
        h.handover_date || '',
        h.division || '',
        itemShift,
        itemCat,
        h.title || '',
        (h.description || '').replace(/"/g, '""').replace(/\r?\n/g, ' '), // escape quotes & newlines
        h.status || '',
        h.sender?.full_name || h.sender_id || '',
        h.receiver?.full_name || h.receiver_id || '',
        h.created_at || ''
      ];
    });
    
    const csvContent = "\uFEFF" + [ // Use BOM for Excel Thai language support!
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `shift-history-export-${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return 'ไม่ระบุ';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('th-TH', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatTimeStr = (created_at: string) => {
    if (!created_at) return '--:--';
    const d = new Date(created_at);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      
      const { data: rawHandovers, error: hError } = await supabase
        .from('handovers')
        .select(`
          *,
          sender:users!handovers_sender_id_fkey ( full_name ),
          receiver:users!handovers_receiver_id_fkey ( full_name )
        `)
        .order('created_at', { ascending: false });

      if (hError) throw hError;

      const handoversData = rawHandovers || [];
      setHandovers(handoversData);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    try {
      setIsAnnouncementsLoading(true);
      const list = await getAnnouncements();
      setAnnouncements(list);
    } catch (err) {
      console.error('Error fetching announcements in AdminPortal:', err);
    } finally {
      setIsAnnouncementsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    loadAnnouncements();
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData, loadAnnouncements]);

  useEffect(() => {
    const unsubscribe = subscribeToAnnouncements((list) => {
      setAnnouncements(list);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'Users') {
      fetchUsersData();
    }
  }, [activeTab, fetchUsersData]);

  useEffect(() => {
    if (activeTab === 'Settings') {
      fetchLineSettings();
    }
  }, [activeTab, fetchLineSettings]);

  useEffect(() => {
    let filteredData = [...handovers];
    if (divisionFilter !== 'All') {
      filteredData = filteredData.filter(h => h.division === divisionFilter);
    }
    if (statusFilter !== 'All') {
      filteredData = filteredData.filter(h => h.status === statusFilter);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate Stats
    const pendingCount = filteredData.filter(h => h.status === 'Pending').length;
    const acceptedToday = filteredData.filter(h => {
      if (h.status !== 'Accepted' || !h.accepted_at) return false;
      const acceptDate = new Date(h.accepted_at);
      return acceptDate >= today;
    }).length;

    const uniqueSenders = new Set(filteredData.map(h => h.sender_id)).size;

    // Avg Accept Time Calculation
    const acceptedHandovers = filteredData.filter(h => h.accepted_at && h.created_at);
    let avgTimeStr = '--';
    if (acceptedHandovers.length > 0) {
      const totalDiff = acceptedHandovers.reduce((acc, current) => {
        const start = new Date(current.created_at).getTime();
        const end = new Date(current.accepted_at).getTime();
        return acc + (end - start);
      }, 0);
      const avgMs = totalDiff / acceptedHandovers.length;
      const avgMins = Math.round(avgMs / 60000);
      avgTimeStr = avgMins > 60 ? `${Math.floor(avgMins/60)}h ${avgMins%60}m` : `${avgMins}m`;
    }

    // Web vs LINE Reception
    const acceptedHandoversList = filteredData.filter(h => h.status === 'Accepted');
    const viaLineCount = acceptedHandoversList.filter(h => h.receiver_line_name && h.receiver_line_name.trim() !== '').length;
    const viaWebCount = acceptedHandoversList.length - viaLineCount;
    const totalAcceptedCount = acceptedHandoversList.length;
    const viaLinePercent = totalAcceptedCount > 0 ? Math.round((viaLineCount / totalAcceptedCount) * 100) : 0;
    const viaWebPercent = totalAcceptedCount > 0 ? (100 - viaLinePercent) : 0;

    setStats({
      pending: pendingCount,
      acceptedToday: acceptedToday,
      avgAcceptTime: avgTimeStr,
      activeSenders: uniqueSenders,
      viaLine: viaLineCount,
      viaLinePercent: viaLinePercent,
      viaWeb: viaWebCount,
      viaWebPercent: viaWebPercent
    });

    // Recent Activity
    setRecentActivity(filteredData.slice(0, 15).map(h => {
      const createdDate = new Date(h.created_at);
      const diffMs = new Date().getTime() - createdDate.getTime();
      const mins = Math.floor(diffMs / 60000);
      const ageStr = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins/60)}h` : `${Math.floor(mins/1440)}d`;
      
      return {
        id: h.task_number || h.id.substring(0, 8).toUpperCase(),
        title: h.title,
        division: h.division,
        status: h.status,
        sender: h.sender?.full_name || 'System',
        time: ageStr
      };
    }));

    // Division Breakdown
    const divisions: Record<string, number> = {};
    filteredData.forEach(h => {
      const div = h.division || 'Other';
      divisions[div] = (divisions[div] || 0) + 1;
    });
    const divColors: Record<string, string> = { 'Central Lab': '#3b82f6', 'Blood Bank': '#8b5cf6', 'Other': '#94a3b8' };
    setDivisionData(Object.entries(divisions).map(([name, value]) => ({
      name,
      value,
      color: divColors[name] || '#3b82f6'
    })));

    // Category Breakdown (ประเภทงาน)
    const categoriesMap: Record<string, number> = {};
    filteredData.forEach(h => {
      let cat = 'อื่น ๆ';
      if (h.shift) {
        cat = h.category || 'อื่น ๆ';
      } else {
        const catField = h.category || '';
        if (catField.includes('|')) {
          const [, c] = catField.split('|');
          cat = c || 'อื่น ๆ';
        }
      }
      const displayName = cat.trim() || 'อื่น ๆ';
      categoriesMap[displayName] = (categoriesMap[displayName] || 0) + 1;
    });

    const categoryColors = ['#00A3FF', '#facc15', '#ef4444', '#22c55e', '#8b5cf6', '#ec4899', '#64748b'];
    const mappedCategoryData = Object.entries(categoriesMap).map(([name, value], index) => ({
      name,
      value,
      color: categoryColors[index % categoryColors.length]
    }));
    setCategoryData(mappedCategoryData);

    // Shift / Status Stacked Bar Data
    const shiftStatusMap: Record<string, { name: string, 'รอรับงาน': number, 'รับงานแล้ว': number }> = {
      'เช้า': { name: 'เช้า', 'รอรับงาน': 0, 'รับงานแล้ว': 0 },
      'บ่าย': { name: 'บ่าย', 'รอรับงาน': 0, 'รับงานแล้ว': 0 },
      'ดึก': { name: 'ดึก', 'รอรับงาน': 0, 'รับงานแล้ว': 0 },
    };

    filteredData.forEach(h => {
      let s = 'อื่น ๆ';
      if (h.shift) {
        s = h.shift;
      } else {
        const catField = h.category || '';
        if (catField.includes('|')) {
          const [shiftPart] = catField.split('|');
          s = shiftPart || 'อื่น ๆ';
        } else if (catField) {
          s = catField;
        }
      }

      if (s !== 'เช้า' && s !== 'บ่าย' && s !== 'ดึก') {
        if (!shiftStatusMap[s]) {
          shiftStatusMap[s] = { name: s, 'รอรับงาน': 0, 'รับงานแล้ว': 0 };
        }
      }

      const isPending = h.status === 'Pending';
      const targetShift = shiftStatusMap[s];
      if (targetShift) {
        if (isPending) {
          targetShift['รอรับงาน']++;
        } else {
          targetShift['รับงานแล้ว']++;
        }
      }
    });

    setShiftStatusData(Object.values(shiftStatusMap));

    // Activity Trend
    const trendMap: Record<string, { name: string, pending: number, accepted: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
      trendMap[dateStr] = { name: dateStr, pending: 0, accepted: 0 };
    }

    filteredData.forEach(h => {
      const dateStr = new Date(h.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
      if (trendMap[dateStr]) {
        if (h.status === 'Pending') trendMap[dateStr].pending++;
        else if (h.status === 'Accepted') trendMap[dateStr].accepted++;
      }
    });
    setDashboardData(Object.values(trendMap).reverse());

    // Top Senders
    const senderMap: Record<string, { name: string, count: number }> = {};
    filteredData.forEach(h => {
      const name = h.sender?.full_name || 'System';
      if (!senderMap[name]) senderMap[name] = { name, count: 0 };
      senderMap[name].count++;
    });
    setTopSenders(Object.values(senderMap).sort((a, b) => b.count - a.count).slice(0, 4));

  }, [handovers, divisionFilter, statusFilter]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleExportImage = async () => {
    const captureArea = document.getElementById('dashboard-capture-area');
    if (!captureArea) return;

    setIsExporting(true);

    // Save original styles to restore them later
    const originalWidth = captureArea.style.width;
    const originalMaxWidth = captureArea.style.maxWidth;
    const originalHeight = captureArea.style.height;

    try {
      const targetWidth = 1400;
      
      // Temporarily set the element to full desktop width to trigger desktop responsive grid layout rules
      captureArea.style.width = `${targetWidth}px`;
      captureArea.style.maxWidth = `${targetWidth}px`;
      captureArea.style.height = 'auto';

      // Query the exact height needed by the element at 1400px width
      const targetHeight = captureArea.scrollHeight || 1000;

      // html-to-image directly converts the node to a PNG using the browser's native engine,
      // which fully supports modern colors like oklch() and oklab(), grid layout, custom SVGs, and fonts.
      const dataUrl = await toPng(captureArea, {
        cacheBust: true,
        backgroundColor: '#f3f7fa',
        width: targetWidth,
        height: targetHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: `${targetWidth}px`,
          height: `${targetHeight}px`,
        },
        pixelRatio: 2, // Capture in 2x density for a high-definition crystal clear output
      });

      setExportedImage(dataUrl);
      setIsExportModalOpen(true);

      try {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `handover-dashboard-${new Date().toISOString().substring(0, 10)}.png`;
        link.click();
      } catch (downloadErr) {
        console.warn('Programmatic download blocked by browser/iframe sandbox. Fallback modal handles saving.', downloadErr);
      }
    } catch (err) {
      console.error('Error rendering image:', err);
    } finally {
      // Always restore original styles
      captureArea.style.width = originalWidth;
      captureArea.style.maxWidth = originalMaxWidth;
      captureArea.style.height = originalHeight;
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f7fa] dark:bg-slate-950 text-slate-800 dark:text-wrap">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
           <p className="font-thai font-black text-[#0f2d52] dark:text-slate-200">กำลังเตรียมข้อมูลแผงควบคุม...</p>
        </div>
      </div>
    );
  }

  // Filter user list based on search term and filters
  const filteredUsers = usersList.filter(user => {
    // Search text filter
    const searchLower = userSearchText.toLowerCase();
    const idMatches = (user.id || '').toLowerCase().includes(searchLower);
    const nameMatches = (user.full_name || '').toLowerCase().includes(searchLower);
    const emailMatches = (user.email || '').toLowerCase().includes(searchLower);
    
    if (userSearchText && !idMatches && !nameMatches && !emailMatches) {
      return false;
    }
    
    // Role filter
    if (userRoleFilter !== 'All' && user.role !== userRoleFilter) {
      return false;
    }
    
    // Status filter
    if (userStatusFilter !== 'All') {
      const isUserActive = user.is_active !== false;
      if (userStatusFilter === 'Active' && !isUserActive) return false;
      if (userStatusFilter === 'Inactive' && isUserActive) return false;
    }
    
    return true;
  });

  const USERS_PER_PAGE = 10;
  const paginatedUsers = filteredUsers.slice((usersPage - 1) * USERS_PER_PAGE, usersPage * USERS_PER_PAGE);
  const totalUserPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE) || 1;

  const filteredHandovers = handovers.filter(item => {
    let match = true;
    if (historySearch) {
      const hSearch = historySearch.toLowerCase();
      const matchTitle = (item.title || '').toLowerCase().includes(hSearch);
      const matchDesc = (item.description || '').toLowerCase().includes(hSearch);
      const matchSender = (item.sender?.full_name || '').toLowerCase().includes(hSearch);
      const matchReceiver = (item.receiver?.full_name || '').toLowerCase().includes(hSearch);
      const matchDivision = (item.division || '').toLowerCase().includes(hSearch);
      if (!matchTitle && !matchDesc && !matchSender && !matchReceiver && !matchDivision) match = false;
    }
    if (historyDivisionFilter !== 'All' && item.division !== historyDivisionFilter) match = false;
    if (historyShiftFilter !== 'All') {
      let itemShift = item.shift || '';
      const catField = item.category || '';
      if (!itemShift && catField.includes('|')) {
        const [s] = catField.split('|');
        itemShift = s || '';
      } else if (!itemShift) itemShift = catField;
      if (itemShift !== historyShiftFilter) match = false;
    }
    if (historyStatusFilter !== 'All' && item.status !== historyStatusFilter) match = false;
    if (historyDateFilter) {
      const itemDate = item.handover_date ? String(item.handover_date).substring(0, 10) : '';
      if (itemDate !== historyDateFilter) match = false;
    }
    return match;
  });

  const HANDOVERS_PER_PAGE = 10;
  const paginatedHandovers = filteredHandovers.slice((historyPage - 1) * HANDOVERS_PER_PAGE, historyPage * HANDOVERS_PER_PAGE);
  const totalHandoverPages = Math.ceil(filteredHandovers.length / HANDOVERS_PER_PAGE) || 1;

  return (
    <div className="flex min-h-screen bg-[#f3f7fa] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-thai">
      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] overflow-x-auto no-scrollbar gap-2 scroll-smooth">
        <div className="flex items-center gap-1 min-w-max px-4 w-full justify-between">
          <MobileNavItem icon={<LayoutDashboard size={18} />} label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
          <MobileNavItem icon={<ClipboardList size={18} />} label="History" active={activeTab === 'Handovers'} onClick={() => setActiveTab('Handovers')} />
          <MobileNavItem icon={<Users size={18} />} label="Users" active={activeTab === 'Users'} onClick={() => setActiveTab('Users')} />
          <MobileNavItem icon={<Megaphone size={18} />} label="News" active={activeTab === 'Announcements'} onClick={() => setActiveTab('Announcements')} />
          <MobileNavItem icon={<Settings size={18} />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
          <MobileNavItem icon={<Activity size={18} />} label="Logs" active={activeTab === 'Logs'} onClick={() => setActiveTab('Logs')} />
          <MobileNavItem icon={<LogOut size={18} />} label="Exit" active={false} onClick={onLogout} color="text-red-500" />
        </div>
      </nav>

      {/* Sidebar (Desktop Only) */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:flex bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col z-50 sticky top-0 h-screen overflow-hidden whitespace-nowrap"
      >
        <div className={`p-4 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center border-b border-slate-50 dark:border-slate-800 pb-4'}`}>
          {isSidebarOpen ? (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 bg-brand-blue rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-brand-blue/20">
                  <Microscope size={20} />
                </div>
                <div>
                  <h1 className="font-[900] text-[#0f2d52] dark:text-white leading-none">SmartBoard</h1>
                  <span className="text-[12px] font-black text-brand-blue bg-brand-blue/10 px-1.5 py-0.5 rounded-md mt-1 inline-block uppercase tracking-wider">BETA</span>
                </div>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="หุบเมนู / Collapse Sidebar"
              >
                <Menu size={20} />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="ขยายเมนู / Expand Sidebar"
            >
              <Menu size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-1">
          {isSidebarOpen && <p className="text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 mb-2 p-1">Main</p>}
          <NavItem icon={<LayoutDashboard size={18} />} label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} collapsed={!isSidebarOpen} />
          <NavItem icon={<ClipboardList size={18} />} label="All Handovers" active={activeTab === 'Handovers'} onClick={() => setActiveTab('Handovers')} badge={handovers.length.toString()} collapsed={!isSidebarOpen} />
          <NavItem icon={<Users size={18} />} label="Users" active={activeTab === 'Users'} onClick={() => setActiveTab('Users')} collapsed={!isSidebarOpen} />
          
          <div className="pt-6">
            {isSidebarOpen && <p className="text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 mb-2 p-1">Content</p>}
            <NavItem icon={<Megaphone size={18} />} label="Announcements" active={activeTab === 'Announcements'} onClick={() => setActiveTab('Announcements')} collapsed={!isSidebarOpen} />
            <NavItem icon={<Settings size={18} />} label="LINE Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} collapsed={!isSidebarOpen} />
            <NavItem icon={<Activity size={18} />} label="System Logs" active={activeTab === 'Logs'} onClick={() => setActiveTab('Logs')} collapsed={!isSidebarOpen} />
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
          <button 
            onClick={onLogout}
            className={`w-full h-10 flex items-center gap-3 px-3 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all font-black text-sm uppercase tracking-wider ${!isSidebarOpen ? 'justify-center' : ''}`}
          >
            <LogOut size={16} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen md:h-screen overflow-y-visible md:overflow-y-auto overflow-x-hidden pb-24 md:pb-12 min-w-0 w-full">
        {/* Header */}
        <header className="h-[70px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
          </div>

          <div className="flex items-center gap-6">


            <div className="hidden lg:flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
               <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm shadow-green-500/50" />
               <span className="text-[12px] font-black text-[#0f2d52] dark:text-slate-200 uppercase">Live</span>
               <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
               <span className="text-[12px] font-bold text-slate-400">Last updated: {lastUpdated}</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all relative cursor-pointer"
                  title="การแจ้งเตือนข่าวสาร"
                >
                  <Bell size={20} />
                  {announcements.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                      {announcements.filter(a => a.pinned || a.category === 'critical').length || announcements.length}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown List */}
                <AnimatePresence>
                  {isNotificationOpen && (
                    <>
                      {/* Invisible backdrop to dismiss with a click anywhere */}
                      <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="fixed top-16 left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:w-80 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden font-thai font-sans"
                      >
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-black text-[#0f2d52] dark:text-white">ประกาศข่าวสารหลังบ้าน ({announcements.length})</span>
                          <button 
                            type="button"
                            onClick={() => {
                              setIsNotificationOpen(false);
                              setActiveTab('Announcements');
                            }}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer bg-transparent border-none"
                          >
                            ดูทั้งหมด
                          </button>
                        </div>
                        <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-850">
                          {announcements.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400 font-bold">ไม่มีการแจ้งเตือนข้อผิดพลาดหรือข่าวในขณะนี้</div>
                          ) : (
                            announcements.slice(0, 5).map((ann) => (
                              <div
                                key={ann.id}
                                onClick={() => {
                                  setViewedAnnouncement(ann);
                                  setIsNotificationOpen(false);
                                }}
                                className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all cursor-pointer space-y-1 text-left"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                    ann.category === 'critical' 
                                      ? 'bg-red-50 text-red-500 border border-red-100 dark:bg-red-950/20' 
                                      : ann.category === 'important'
                                      ? 'bg-yellow-50 text-yellow-600 border border-yellow-101 dark:bg-yellow-950/20'
                                      : 'bg-blue-50 text-brand-blue border border-blue-101 dark:bg-blue-950/20'
                                  }`}>
                                    {ann.category === 'critical' ? 'ด่วนที่สุด' : ann.category === 'important' ? 'สำคัญ' : 'ทั่วไป'}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-bold">{ann.date}</span>
                                </div>
                                <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{ann.title}</h4>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 font-bold leading-normal">{ann.content}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {onToggleDarkMode && (
                <button
                  onClick={onToggleDarkMode}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                  title={isDarkMode ? "เปิดโหมดสว่าง" : "เปิดโหมดมืด"}
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              )}
              
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-[900] text-[#0f2d52] dark:text-slate-200 leading-none">{user?.email?.split('@')[0] || 'Admin User'}</p>
                </div>
                <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">
                  AD
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Conditionally Render Content Based on Active Tab */}
        {activeTab === 'Overview' ? (
          <div className="animate-fadeIn flex flex-col font-thai">

            <div id="dashboard-capture-area" className="p-4 sm:p-6 space-y-6 sm:space-y-8">
            {/* Kaggle welcome card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden">
              {/* Background minimal graphic effect */}
              <div className="absolute right-0 top-0 w-64 h-64 bg-slate-50/50 dark:bg-slate-950/20 rounded-full pointer-events-none -translate-y-12 translate-x-12" />
              
              <div className="space-y-4 relative z-10 max-w-xl text-center md:text-left flex-1 w-full">
                <div className="space-y-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-[900] text-slate-900 dark:text-white tracking-tight leading-tight">
                      Welcome back, {user?.full_name || 'SAMITA SINGSARD'}.
                    </h1>
                  </div>
                  <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                    Everything is under your control. Let's keep the lab running.
                  </p>
                </div>

                {/* Action shortcuts */}
                <div className="grid grid-cols-2 gap-2.5 pt-1 w-full md:flex md:w-auto">
                  <button 
                    type="button"
                    onClick={() => setActiveTab('Handovers')}
                    className="w-full md:w-auto h-11 px-2.5 sm:px-5 bg-brand-blue text-white rounded-xl text-[10px] min-xs:text-[11.5px] sm:text-xs font-black shadow-lg shadow-brand-blue/15 hover:bg-brand-dark transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ClipboardList size={13} className="shrink-0" />
                    <span>จัดการข้อมูลส่งเวร</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveTab('Announcements')}
                    className="w-full md:w-auto h-11 px-2.5 sm:px-5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-705 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] min-xs:text-[11.5px] sm:text-xs font-black border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Megaphone size={13} className="shrink-0" />
                    <span>ดูข่าวสาร</span>
                  </button>
                </div>
              </div>

              {/* Custom SVG Illustration for beautiful UI representation */}
              <div className="hidden md:block shrink-0 relative z-10 w-40 h-40">
                <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
                  <rect x="30" y="40" width="100" height="90" rx="16" fill="#00A3FF" fillOpacity="0.05" stroke="#00A3FF" strokeWidth="2" strokeDasharray="4 4" />
                  <rect x="45" y="55" width="70" height="12" rx="6" fill="#22C55E" fillOpacity="0.15" />
                  <circle cx="53" cy="61" r="3" fill="#22C55E" />
                  <path d="M45 105 L70 90 L95 100 L115 80" stroke="#00A3FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="115" cy="80" r="5" fill="#00A3FF" />
                  <circle cx="70" cy="90" r="4" fill="#EAB308" />
                  <g filter="blur(1px)">
                    <circle cx="130" cy="35" r="8" fill="#EAB308" fillOpacity="0.2" />
                    <circle cx="25" cy="115" r="12" fill="#22C55E" fillOpacity="0.1" />
                  </g>
                  <circle cx="130" cy="35" r="3" fill="#EAB308" />
                  <circle cx="25" cy="115" r="4" fill="#22C55E" />
                </svg>
              </div>
            </div>

            {/* Filter & Export Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm font-thai">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 flex-1">
                {/* Division Filter Tabs */}
                <div className="space-y-1.5 flex-shrink-0">
                  <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">หน่วยงาน / Division</p>
                  <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1">
                    {[
                      { key: 'All', label: 'ทั้งหมด (All)' },
                      { key: 'Central Lab', label: 'Central Lab' },
                      { key: 'Blood Bank', label: 'Blood Bank' }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setDivisionFilter(tab.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black min-w-[70px] transition-all cursor-pointer ${
                          divisionFilter === tab.key
                            ? 'bg-white dark:bg-slate-900 text-brand-blue shadow-sm'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Filter Tabs */}
                <div className="space-y-1.5 flex-shrink-0">
                  <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">สถานะการรับเวร / Status</p>
                  <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1">
                    {[
                      { key: 'All', label: 'ทั้งหมด (All)' },
                      { key: 'Pending', label: 'รอรับงาน' },
                      { key: 'Accepted', label: 'รับงานแล้ว' }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setStatusFilter(tab.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black min-w-[70px] transition-all cursor-pointer ${
                          statusFilter === tab.key
                            ? 'bg-white dark:bg-slate-900 text-brand-blue shadow-sm'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Moved Export Button */}
              <div className="w-full lg:w-auto lg:self-center">
                <button 
                  type="button"
                  onClick={handleExportImage}
                  disabled={isExporting}
                  className="w-full lg:w-auto h-11 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-700/60 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer border border-transparent"
                  title="Export Dashboard Image"
                >
                  {isExporting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  <span>{isExporting ? 'Exporting...' : 'Export Dashboard Image'}</span>
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<LayoutDashboard className="text-brand-blue" size={20} />} title={stats.pending.toString()} subtitle="Pending" trend="Real-time" trendUp={true} color="blue" />
              <StatCard icon={<CheckCircle2 className="text-indigo-500" size={20} />} title={stats.acceptedToday.toString()} subtitle="Accepted" trend="Today" color="indigo" />
              <StatCard icon={<Clock className="text-sky-500" size={20} />} title={stats.avgAcceptTime} subtitle="Avg Wait" trend="Lifetime" color="sky" />
              <StatCard icon={<Users className="text-violet-500" size={20} />} title={stats.activeSenders.toString()} subtitle="Senders" trend="Active" trendUp={true} color="violet" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Recent Activity Section */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-base font-[900] text-[#0f2d52] dark:text-white">Recent activity</h3>
                  <button onClick={() => setActiveTab('Handovers')} className="text-[10px] font-black text-brand-blue bg-brand-blue/5 px-2.5 py-1 rounded-lg hover:bg-brand-blue/10 transition-all uppercase tracking-wider">View all</button>
                </div>
                
                {/* Desktop View: Table */}
                <div className="hidden md:block flex-1 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-850 text-left border-b border-slate-100 dark:border-slate-800">
                        <th className="px-5 py-3 text-[12px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                        <th className="px-5 py-3 text-[12px] font-black text-slate-400 uppercase tracking-widest font-thai">รายการ</th>
                        <th className="px-5 py-3 text-[12px] font-black text-slate-400 uppercase tracking-widest font-thai">หน่วยงาน</th>
                        <th className="px-5 py-3 text-[12px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-5 py-3 text-[12px] font-black text-slate-400 uppercase tracking-widest">Sender</th>
                        <th className="px-5 py-3 text-[12px] font-black text-slate-400 uppercase tracking-widest">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActivity.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/55 transition-colors">
                          <td className="px-5 py-3 text-[13px] font-black text-slate-400">{item.id}</td>
                          <td className="px-5 py-3 text-[13px] font-[900] text-[#0f2d52] dark:text-slate-200">{item.title}</td>
                          <td className="px-5 py-3">
                             <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                               item.division === 'Central Lab' ? 'text-brand-blue border-brand-blue/20 bg-brand-blue/5' : item.division === 'Blood Bank' ? 'text-violet-500 border-violet-500/20 bg-violet-50 dark:bg-violet-950/20' : 'text-slate-500 border-slate-200 bg-slate-50 dark:bg-slate-800'
                             }`}>
                               {item.division}
                             </span>
                          </td>
                          <td className="px-5 py-3">
                             <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'Pending' ? 'bg-[#facc15]' : 'bg-[#22c55e]'}`} />
                                <span className={`text-[12px] font-bold ${item.status === 'Pending' ? 'text-yellow-500' : 'text-green-600'}`}>{item.status}</span>
                             </div>
                          </td>
                          <td className="px-5 py-3 text-[13px] font-bold text-[#0f2d52] dark:text-slate-200">{item.sender}</td>
                          <td className="px-5 py-3 text-[13px] font-bold text-slate-400">{item.time}</td>
                        </tr>
                      ))}
                      {recentActivity.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No recent data</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Flexible Cards Layout for Recent Activity */}
                <div className="block md:hidden flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {recentActivity.length === 0 ? (
                    <div className="px-5 py-10 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No recent data</div>
                  ) : (
                    recentActivity.map((item, idx) => (
                      <div key={idx} className="p-4 flex flex-col space-y-1.5 active:bg-slate-50 dark:active:bg-slate-800/40">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-slate-400">ID: {item.id}</span>
                          <span className="text-[11px] text-slate-400 font-bold">{item.time}</span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-black text-[#0f2d52] dark:text-white leading-normal">
                          {item.title}
                        </h4>
                        <div className="flex items-center justify-between pt-1 text-[11px] font-bold">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              item.division === 'Central Lab' ? 'text-brand-blue border-brand-blue/20 bg-brand-blue/5' : item.division === 'Blood Bank' ? 'text-violet-500 border-violet-500/20 bg-violet-50 dark:bg-violet-950/20' : 'text-slate-500 border-slate-200 bg-slate-50 dark:bg-slate-800'
                            }`}>
                              {item.division}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">By {item.sender}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'Pending' ? 'bg-[#facc15]' : 'bg-[#22c55e]'}`} />
                            <span className={`text-[11px] font-bold ${item.status === 'Pending' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-emerald-400'}`}>{item.status}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Sidebar widgets */}
              <div className="space-y-4">
                {/* Category Breakdown Widget (ประเภทงาน) */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  <h3 className="text-sm font-[900] text-[#0f2d52] dark:text-white mb-4">ประเภทงาน (Category)</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            innerRadius={25}
                            outerRadius={40}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2 max-h-[120px] overflow-y-auto pr-1">
                      {categoryData.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] font-bold">
                           <div className="flex items-center gap-2 max-w-[85px] truncate">
                             <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                             <span className="text-slate-500 dark:text-slate-400 truncate" title={item.name}>{item.name}</span>
                           </div>
                           <span className="text-[#0f2d52] dark:text-slate-200">{item.value}</span>
                        </div>
                      ))}
                      {categoryData.length === 0 && <p className="text-[10px] text-center text-slate-400">No category data</p>}
                    </div>
                  </div>
                </div>

                {/* Division Breakdown widget */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  <h3 className="text-sm font-[900] text-[#0f2d52] dark:text-white mb-4">สัดส่วนหน่วยงาน (Division)</h3>
                  <div className="space-y-3">
                    {divisionData.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                         <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-slate-500 dark:text-slate-400">{item.name}</span>
                            <span className="text-[#0f2d52] dark:text-slate-200">{item.value}</span>
                         </div>
                         <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(item.value / stats.activeSenders) * 100 || 0}%`, backgroundColor: item.color }} />
                         </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reception Channel Breakdown widget (Web vs LINE) */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm font-thai">
                  <h3 className="text-sm font-[900] text-[#0f2d52] dark:text-white mb-4">สัดส่วนรับงานผ่านเว็บ และผ่านไลน์</h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          รับงานผ่านไลน์ (LINE LIFF)
                        </span>
                        <span className="text-[#0f2d52] dark:text-slate-200">{stats.viaLine} งาน ({stats.viaLinePercent}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${stats.viaLinePercent}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          รับงานผ่านเว็บ (Web)
                        </span>
                        <span className="text-[#0f2d52] dark:text-slate-200">{stats.viaWeb} งาน ({stats.viaWebPercent}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${stats.viaWebPercent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  <h3 className="text-sm font-[900] text-[#0f2d52] dark:text-white mb-4">สัดส่วนเวรตามสถานะ (Shift/Status)</h3>
                  <div className="h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={shiftStatusData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ fontSize: '12px', fontWeight: 'bold', borderRadius: '8px' }} />
                          <Legend verticalAlign="top" height={24} iconSize={6} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                          <Bar dataKey="รอรับงาน" stackId="shift" fill="#facc15" />
                          <Bar dataKey="รับงานแล้ว" stackId="shift" fill="#22c55e" />
                       </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

               <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  <h3 className="text-base font-[900] text-[#0f2d52] dark:text-white mb-4">แนวโน้ม 7 วัน (7d Trend)</h3>
                  <div className="h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={dashboardData}>
                          <defs>
                            <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" hide />
                          <Tooltip contentStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                          <Area type="monotone" dataKey="pending" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPending)" />
                       </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  <h3 className="text-sm font-[900] text-[#0f2d52] dark:text-white mb-4">Top Senders</h3>
                  <div className="space-y-2.5">
                    {topSenders.map((sender, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                         <div className="flex items-center gap-2.5">
                           <div className="w-5 h-5 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg">{idx + 1}</div>
                           <span className="text-[11px] font-bold text-[#0f2d52] dark:text-slate-250">{sender.name}</span>
                         </div>
                         <span className="text-[11px] font-black text-brand-blue">{sender.count}</span>
                      </div>
                    ))}
                    {topSenders.length === 0 && <p className="text-center text-slate-400 text-xs py-4">No data</p>}
                  </div>
               </div>
            </div>
          </div>
          </div>
        ) : activeTab === 'Handovers' ? (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fadeIn">
            {/* History Mini Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-xl">
                  <ClipboardList size={22} />
                </div>
                <div>
                  <p className="text-2xl font-[905] text-[#0f2d52] dark:text-white leading-none">
                    {handovers.filter(item => {
                      let match = true;
                      if (historySearch) {
                        const hSearch = historySearch.toLowerCase();
                        const matchTitle = (item.title || '').toLowerCase().includes(hSearch);
                        const matchDesc = (item.description || '').toLowerCase().includes(hSearch);
                        const matchSender = (item.sender?.full_name || '').toLowerCase().includes(hSearch);
                        const matchReceiver = (item.receiver?.full_name || '').toLowerCase().includes(hSearch);
                        const matchDivision = (item.division || '').toLowerCase().includes(hSearch);
                        if (!matchTitle && !matchDesc && !matchSender && !matchReceiver && !matchDivision) match = false;
                      }
                      if (historyDivisionFilter !== 'All' && item.division !== historyDivisionFilter) match = false;
                      if (historyShiftFilter !== 'All') {
                        let itemShift = item.shift || '';
                        const catField = item.category || '';
                        if (!itemShift && catField.includes('|')) {
                          const [s] = catField.split('|');
                          itemShift = s || '';
                        } else if (!itemShift) itemShift = catField;
                        if (itemShift !== historyShiftFilter) match = false;
                      }
                      if (historyStatusFilter !== 'All' && item.status !== historyStatusFilter) match = false;
                      if (historyDateFilter) {
                        const itemDate = item.handover_date ? String(item.handover_date).substring(0, 10) : '';
                        if (itemDate !== historyDateFilter) match = false;
                      }
                      return match;
                    }).length}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5">รายการส่งเวรทั้งหมด</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-500 rounded-xl">
                  <Clock size={22} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-2xl font-[905] text-yellow-500 leading-none">
                    {handovers.filter(item => {
                      let match = item.status === 'Pending';
                      if (!match) return false;
                      if (historySearch) {
                        const hSearch = historySearch.toLowerCase();
                        const matchTitle = (item.title || '').toLowerCase().includes(hSearch);
                        const matchDesc = (item.description || '').toLowerCase().includes(hSearch);
                        const matchSender = (item.sender?.full_name || '').toLowerCase().includes(hSearch);
                        const matchReceiver = (item.receiver?.full_name || '').toLowerCase().includes(hSearch);
                        const matchDivision = (item.division || '').toLowerCase().includes(hSearch);
                        if (!matchTitle && !matchDesc && !matchSender && !matchReceiver && !matchDivision) match = false;
                      }
                      if (historyDivisionFilter !== 'All' && item.division !== historyDivisionFilter) match = false;
                      if (historyShiftFilter !== 'All') {
                        let itemShift = item.shift || '';
                        const catField = item.category || '';
                        if (!itemShift && catField.includes('|')) {
                          const [s] = catField.split('|');
                          itemShift = s || '';
                        } else if (!itemShift) itemShift = catField;
                        if (itemShift !== historyShiftFilter) match = false;
                      }
                      if (historyDateFilter) {
                        const itemDate = item.handover_date ? String(item.handover_date).substring(0, 10) : '';
                        if (itemDate !== historyDateFilter) match = false;
                      }
                      return match;
                    }).length}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5">รอรับมอบหมายเวร</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-950/30 text-green-500 rounded-xl">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <p className="text-2xl font-[905] text-green-500 leading-none">
                    {filteredHandovers.filter(item => item.status === 'Accepted').length}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5">รับมอบหมายเวรสำเร็จ</p>
                </div>
              </div>
            </div>

            {/* Filter and Action Card (Kaggle Theme) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[1.5rem] p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                
                {/* Search Bar */}
                <div className="relative flex-grow flex items-center bg-slate-50 dark:bg-slate-950 px-4 h-11 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-brand-blue/30 transition-all">
                  <Search size={16} className="text-slate-400 mr-2.5" />
                  <input 
                    type="text" 
                    placeholder="ค้นหาตามหัวข้อ, รายละเอียด, ผู้ส่ง, ผู้รับ, หน่วยงาน..." 
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 w-full"
                  />
                  {historySearch && (
                    <button onClick={() => setHistorySearch('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer">
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* CSV download button & Reset */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => {
                      handleExportCSV(filteredHandovers);
                    }}
                    className="flex-1 sm:flex-initial h-11 px-4 bg-brand-blue hover:bg-brand-dark text-white rounded-xl text-xs font-black shadow-md shadow-brand-blue/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <FileDown size={14} />
                    <span>Export CSV</span>
                  </button>

                  {(historySearch || historyDivisionFilter !== 'All' || historyShiftFilter !== 'All' || historyStatusFilter !== 'All' || historyDateFilter) && (
                    <button
                      onClick={() => {
                        setHistorySearch('');
                        setHistoryDivisionFilter('All');
                        setHistoryShiftFilter('All');
                        setHistoryStatusFilter('All');
                        setHistoryDateFilter('');
                      }}
                      className="flex-1 sm:flex-initial h-11 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl text-xs font-black transition-all flex items-center justify-center cursor-pointer whitespace-nowrap"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}
                </div>
              </div>

              {/* Advanced Controls Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <CustomSelect
                  label="หน่วยงาน"
                  value={historyDivisionFilter}
                  onChange={(val) => setHistoryDivisionFilter(val)}
                  options={[
                    { value: 'All', label: 'ทุกหน่วยงาน' },
                    { value: 'Central Lab', label: 'Central Lab' },
                    { value: 'Blood Bank', label: 'Blood Bank' }
                  ]}
                />

                <CustomSelect
                  label="รอบปฏิบัติงาน"
                  value={historyShiftFilter}
                  onChange={(val) => setHistoryShiftFilter(val)}
                  options={[
                    { value: 'All', label: 'ทุกรอบเวร' },
                    { value: 'เช้า', label: 'เวรเช้า' },
                    { value: 'บ่าย', label: 'เวรบ่าย' },
                    { value: 'ดึก', label: 'เวรดึก' }
                  ]}
                />

                <CustomSelect
                  label="สถานะเวร"
                  value={historyStatusFilter}
                  onChange={(val) => setHistoryStatusFilter(val)}
                  options={[
                    { value: 'All', label: 'ทุกสถานะ' },
                    { value: 'Pending', label: 'รอตอบรับ' },
                    { value: 'Accepted', label: 'ตอบรับสำเร็จ' }
                  ]}
                />

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">ระบุวันที่ส่งเวร</label>
                    <button
                      type="button"
                      onClick={() => setHistoryDateFilter(new Date().toISOString().split('T')[0])}
                      className="text-[9px] font-bold text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-md hover:bg-brand-blue/20 transition-all cursor-pointer"
                    >
                      วันนี้
                    </button>
                  </div>
                  <div className="relative custom-datepicker">
                    <input
                      type="date"
                      value={historyDateFilter}
                      onChange={(e) => setHistoryDateFilter(e.target.value)}
                      className="w-full h-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 pr-8 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-brand-blue/30 cursor-pointer"
                    />
                    <Calendar size={11} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* List & Robust Table Container */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[1.5rem] overflow-hidden shadow-sm flex flex-col">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/20 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-brand-blue rounded-full" />
                  <h3 className="text-sm font-[900] text-[#0f2d52] dark:text-white uppercase tracking-wider">ประวัติการส่งมอบเวรในห้องปฏิบัติการ</h3>
                </div>
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-850/50 text-left border-b border-slate-100 dark:border-slate-800 text-slate-450 dark:text-slate-350">
                      <th className="px-5 py-4 text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-6">ID</th>
                      <th className="px-5 py-4 text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">วันที่ปฏิบัติงาน</th>
                      <th className="px-5 py-4 text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">หน่วยงาน/เวร/ประเภท</th>
                      <th className="px-5 py-4 text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">เรื่อง/รายละเอียดส่งเวร</th>
                      <th className="px-5 py-4 text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">ผู้ส่งมอบ</th>
                      <th className="px-5 py-4 text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">ผู้ตอบรับ</th>
                      <th className="px-5 py-4 text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">สถานะ</th>
                      <th className="px-5 py-4 text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center pr-6">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHandovers.map((item, idx) => {
                      const catField = item.category || '';
                      let itemShift = item.shift || '';
                      let itemCat = '';
                      if (!itemShift && catField.includes('|')) {
                        const [s, c] = catField.split('|');
                        itemShift = s || 'ไม่ระบุ';
                        itemCat = c || '';
                      } else if (!itemShift) {
                        itemShift = catField || 'ไม่ระบุ';
                        itemCat = '';
                      } else {
                        itemCat = catField;
                      }

                      return (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors cursor-pointer" onClick={() => setSelectedHandover(item)}>
                          <td className="px-5 py-4 text-[13px] font-black text-slate-400 pl-6" onClick={(e) => e.stopPropagation()}>
                            <span 
                              onClick={() => navigator.clipboard.writeText(item.task_number || item.id)}
                              className="cursor-copy bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-250/20 dark:border-slate-700 font-mono text-[12px]"
                              title={item.task_number ? "คลิกเพื่อคัดลอกรหัสงาน" : "คลิกเพื่อคัดลอกรหัสหลัก"}
                            >
                              {item.task_number || item.id.substring(0, 8).toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-4 min-w-[130px]">
                            <p className="text-[13px] font-[900] text-[#0f2d52] dark:text-white leading-none">{formatThaiDate(item.handover_date)}</p>
                            <span className="text-[12px] text-slate-400 font-bold flex items-center gap-1 mt-1"><Clock size={10} /> {formatTimeStr(item.created_at)}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border block w-fit ${
                              item.division === 'Central Lab' ? 'text-brand-blue border-brand-blue/20 bg-brand-blue/5' : item.division === 'Blood Bank' ? 'text-violet-500 border-violet-500/20 bg-violet-50 dark:bg-violet-950/20' : 'text-slate-500 border-slate-200 bg-slate-50 dark:bg-slate-850 dark:border-slate-700'
                            }`}>
                              {item.division}
                            </span>
                            <span className="text-[12px] text-slate-400 font-[900] block mt-1">เวร{itemShift} {itemCat && `• ${itemCat}`}</span>
                          </td>
                          <td className="px-5 py-4 max-w-[200px]">
                            <p className="text-sm font-[900] text-[#0f2d52] dark:text-slate-200 truncate leading-snug">{item.title}</p>
                            <p className="text-[12px] text-slate-400 dark:text-slate-500 font-bold truncate mt-1">{item.description}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-[13px] font-[900] text-[#0f2d52] dark:text-slate-200 leading-snug">{item.sender?.full_name || 'System'}</p>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">Staff Sender</span>
                          </td>
                          <td className="px-5 py-4">
                            {item.status === 'Accepted' ? (
                              <div>
                                <p className="text-[13px] font-[900] text-green-600 dark:text-green-400 leading-snug">{item.receiver?.full_name || item.receiver_line_name || 'ไม่ระบุ'}</p>
                                <span className="text-[11px] font-bold text-green-500 uppercase tracking-widest mt-0.5 block">Accepted Staff</span>
                              </div>
                            ) : (
                              <span className="text-[11px] font-extrabold text-amber-500 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/10 px-2 py-0.5 rounded block w-fit">รอมอบหมาย</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'Pending' ? 'bg-[#facc15]' : 'bg-[#22c55e]'}`} />
                              <span className={`text-[12px] font-black ${item.status === 'Pending' ? 'text-yellow-600 dark:text-yellow-500' : 'text-green-600 dark:text-green-400'}`}>
                                {item.status === 'Pending' ? 'รอรับเวร' : 'รับเวรแล้ว'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center pr-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => setSelectedHandover(item)}
                                className="w-8 h-8 rounded-lg text-[#0f2d52] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-150/10 dark:border-slate-800 flex items-center justify-center transition-all"
                                title="ดูรายละเอียดครบถ้วน"
                              >
                                <ExternalLink size={13} />
                              </button>
                              <button 
                                onClick={() => {
                                  setHandoverToDelete(item);
                                  setIsDeleteConfirmOpen(true);
                                }}
                                className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-100 dark:border-red-950/40 flex items-center justify-center transition-all"
                                title="ลบรายการส่งเวรนี้"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredHandovers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest pl-6 pr-6">
                          ไม่พบประวัติการส่งเวรที่ตรงกับคำค้นหาหรือการคัดกรองในขณะนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Flexible Cards Layout */}
              <div className="block md:hidden divide-y divide-slate-105 dark:divide-slate-800/60">
                {paginatedHandovers.map((item, idx) => {
                  const catField = item.category || '';
                  let itemShift = item.shift || '';
                  let itemCat = '';
                  if (!itemShift && catField.includes('|')) {
                    const [s, c] = catField.split('|');
                    itemShift = s || 'ไม่ระบุ';
                    itemCat = c || '';
                  } else if (!itemShift) {
                    itemShift = catField || 'ไม่ระบุ';
                    itemCat = '';
                  } else {
                    itemCat = catField;
                  }

                  return (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedHandover(item)}
                      className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-all cursor-pointer space-y-3"
                    >
                      {/* Top Header line */}
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-450 dark:text-slate-500">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(item.task_number || item.id);
                          }}
                          className="cursor-copy bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]"
                        >
                          ID: {item.task_number || item.id.substring(0, 8).toUpperCase()}
                        </span>
                        <span>{formatThaiDate(item.handover_date)} · {formatTimeStr(item.created_at)}</span>
                      </div>

                      {/* Title and details */}
                      <div className="space-y-1 text-left">
                        <h4 className="text-xs sm:text-sm font-[900] text-[#0f2d52] dark:text-white leading-snug line-clamp-1">
                          {item.title}
                        </h4>
                        <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Division, Shift and Status */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          item.division === 'Central Lab' ? 'text-brand-blue border-brand-blue/20 bg-brand-blue/5' : item.division === 'Blood Bank' ? 'text-violet-500 border-violet-500/20 bg-violet-50 dark:bg-violet-950/20' : 'text-slate-500 border-slate-200 bg-slate-50 dark:bg-slate-850 dark:border-slate-700'
                        }`}>
                          {item.division}
                        </span>
                        <span className="text-[10px] text-slate-400 font-[900] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          เวร{itemShift} {itemCat && `· ${itemCat}`}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${item.status === 'Pending' ? 'text-yellow-600 border-yellow-500/20 bg-yellow-505/5' : 'text-green-600 border-green-500/20 bg-green-505/5'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'Pending' ? 'bg-[#facc15]' : 'bg-[#22c55e]'}`} />
                          {item.status === 'Pending' ? 'รอรับเวร' : 'รับเวรแล้ว'}
                        </span>
                      </div>

                      {/* Flow Stakeholders and Action buttons */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100/50 dark:border-slate-850/40 text-[10px] font-bold text-slate-400">
                        <div className="flex flex-col gap-0.5 text-left">
                          <div>
                            <span className="font-medium text-slate-400">ผู้ส่ง: </span>
                            <span className="font-extrabold text-[#0f2d52] dark:text-slate-300">{item.sender?.full_name || 'System'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-400">ผู้รับ: </span>
                            {item.status === 'Accepted' ? (
                              <span className="font-extrabold text-green-600 dark:text-green-400">{item.receiver?.full_name || item.receiver_line_name || 'ไม่ระบุ'}</span>
                            ) : (
                              <span className="font-extrabold text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded text-[9px]">รอมอบหมาย ⌛</span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => setSelectedHandover(item)}
                            className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-[#0f2d52] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800 flex items-center justify-center transition-all cursor-pointer"
                            title="ดูรายละเอียดครบถ้วน"
                          >
                            <ExternalLink size={12} />
                          </button>
                          <button 
                            onClick={() => {
                              setHandoverToDelete(item);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="w-8 h-8 rounded-lg bg-red-50/50 dark:bg-red-950/20 text-red-500 hover:bg-red-100/50 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-950/50 flex items-center justify-center transition-all cursor-pointer"
                            title="ลบรายการส่งเวรนี้"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredHandovers.length === 0 && (
                  <div className="px-5 py-12 text-center text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest pl-6 pr-6">
                    ไม่พบประวัติการส่งเวรที่ตรงกับคำค้นหาหรือการคัดกรองในขณะนี้
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {filteredHandovers.length > HANDOVERS_PER_PAGE && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4.5 bg-slate-50/50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 gap-4">
                  <div className="text-[12px] text-slate-400 font-extrabold font-thai">
                    แสดง {((historyPage - 1) * HANDOVERS_PER_PAGE) + 1} - {Math.min(historyPage * HANDOVERS_PER_PAGE, filteredHandovers.length)} จาก {filteredHandovers.length} รายการ
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                      disabled={historyPage === 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-blue disabled:opacity-30 disabled:hover:text-slate-400 transition-colors bg-white dark:bg-slate-800 border border-slate-150/10 shadow-sm"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    {(() => {
                      const maxDisplayedPages = 5;
                      let startPage = 1;
                      let endPage = totalHandoverPages;

                      if (totalHandoverPages > maxDisplayedPages) {
                        const half = Math.floor(maxDisplayedPages / 2);
                        startPage = historyPage - half;
                        endPage = historyPage + half;

                        if (startPage < 1) {
                          startPage = 1;
                          endPage = maxDisplayedPages;
                        } else if (endPage > totalHandoverPages) {
                          endPage = totalHandoverPages;
                          startPage = totalHandoverPages - maxDisplayedPages + 1;
                        }
                      }

                      const pages = [];
                      for (let p = startPage; p <= endPage; p++) {
                        pages.push(p);
                      }

                      return (
                        <div className="flex items-center gap-1">
                          {pages.map((pageNum) => (
                            <button
                              key={pageNum}
                              onClick={() => setHistoryPage(pageNum)}
                              className={`w-8 h-8 rounded-lg text-[12px] font-black transition-all shadow-sm ${
                                historyPage === pageNum 
                                  ? 'bg-brand-blue text-white' 
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-150/10'
                              }`}
                            >
                              {pageNum}
                            </button>
                          ))}
                        </div>
                      );
                    })()}

                    <button 
                      onClick={() => setHistoryPage(prev => Math.min(totalHandoverPages, prev + 1))}
                      disabled={historyPage === totalHandoverPages}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-blue disabled:opacity-30 disabled:hover:text-slate-400 transition-colors bg-white dark:bg-slate-800 border border-slate-150/10 shadow-sm"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'Users' ? (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fadeIn font-thai">
            {/* Header section with summary stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-brand-blue/10 rounded-lg text-brand-blue">
                    <Users size={18} />
                  </div>
                  <h3 className="text-lg font-black text-[#0f2d52] dark:text-white">จัดการข้อมูลผู้ใช้งานและเจ้าหน้าที่</h3>
                </div>
                <p className="text-xs text-slate-400 font-bold">เพิ่มเจ้าหน้าที่ใหม่ มอบสิทธิ์ผู้ดูแลระบบ (Admin) หรือปิดระงับบัญชี โดยไม่ต้องไปกดแก้ที่ฐานข้อมูลหลัก</p>
              </div>
              <button
                type="button"
                onClick={openCreateUserModal}
                className="h-11 px-5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 cursor-pointer"
              >
                <UserPlus size={14} />
                <span>เพิ่มผู้ใช้งานใหม่</span>
              </button>
            </div>

            {/* Filter toolbar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาตามชื่อรหัส หรืออีเมล..."
                  value={userSearchText}
                  onChange={(e) => setUserSearchText(e.target.value)}
                  className="w-full pl-11 pr-4 h-11 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-[#0f2d52] dark:text-white outline-none border border-transparent focus:bg-white focus:border-brand-blue/20 dark:focus:bg-slate-850 dark:focus:border-brand-blue/30 transition-all placeholder:text-slate-300"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 md:flex md:items-center gap-2.5 w-full md:w-auto">
                <CustomSelect
                  inlineLabel="ประเภทสิทธิ์:"
                  value={userRoleFilter}
                  onChange={(val) => setUserRoleFilter(val)}
                  options={[
                    { value: 'All', label: 'ทั้งหมด' },
                    { value: 'staff', label: 'Staff' },
                    { value: 'admin', label: 'Admin' }
                  ]}
                  className="w-full md:w-auto md:min-w-32"
                />

                <CustomSelect
                  inlineLabel="สถานะ:"
                  value={userStatusFilter}
                  onChange={(val) => setUserStatusFilter(val)}
                  options={[
                    { value: 'All', label: 'ทั้งหมด' },
                    { value: 'Active', label: 'Active' },
                    { value: 'Inactive', label: 'Inactive' }
                  ]}
                  className="w-full md:w-auto md:min-w-32"
                />

                <button
                  type="button"
                  onClick={fetchUsersData}
                  className="col-span-2 md:col-span-auto h-11 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-xl flex items-center justify-center text-[#0f2d52] dark:text-slate-250 border border-slate-150 dark:border-slate-800 transition cursor-pointer gap-2"
                  title="รีเฟรชข้อมูลผู้ใช้"
                >
                  <RefreshCw size={13} className={isLoadingUsers ? "animate-spin" : ""} />
                  <span className="text-xs font-bold md:hidden">รีเฟรชข้อมูลบัญชี</span>
                </button>
              </div>
            </div>

            {/* Users table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              {isLoadingUsers ? (
                <div className="p-16 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mb-3" />
                  <p className="text-xs text-slate-400 font-black">กำลังดาวน์โหลดข้อมูลบัญชีผู้ใช้งาน...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-16 text-center text-slate-400 font-black text-xs uppercase tracking-widest flex flex-col items-center justify-center gap-3">
                  <Users className="text-slate-200 dark:text-slate-800" size={40} />
                  <span>ไม่พบข้อมูลผู้ใช้ที่เหมาะสมในปัจจุบัน</span>
                </div>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/20 text-slate-400 text-[12px] uppercase font-black tracking-widest">
                        <th className="px-6 py-4 pl-8">ชื่อ-นามสกุล / เจ้าหน้าที่</th>
                        <th className="px-6 py-4">อีเมลรับรอง (Email)</th>
                        <th className="px-6 py-4">ประเภทสิทธิ์</th>
                        <th className="px-6 py-4">สถานะใช้งาน</th>
                        <th className="px-6 py-4 text-center pr-8">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map((user) => {
                        const isActive = user.is_active !== false;
                        return (
                          <tr key={user.id} className="border-b border-slate-50 dark:border-slate-850 hover:bg-slate-50/30 dark:hover:bg-slate-850/30 transition-all font-bold text-sm">
                            {/* USER FULLNAME */}
                            <td className="px-6 py-4 pl-8 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-[#0f2d52] dark:text-white leading-snug">
                                  {user.full_name || 'ไม่ระบุชื่อ'}
                                </span>
                                <span className="text-[12px] text-slate-400 dark:text-slate-500 font-extrabold flex items-center gap-1 mt-1 font-mono">
                                  รหัสผ่าน: •••••••• (เปิดใช้งานแล้ว)
                                </span>
                              </div>
                            </td>

                            {/* EMAIL */}
                            <td className="px-6 py-4 truncate max-w-[150px]">
                              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                {user.email || '-'}
                              </span>
                            </td>

                            {/* ACCESS ROLE BADGE */}
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                                user.role === 'admin' 
                                  ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400' 
                                  : 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400'
                              }`}>
                                <div className={`w-1 h-1 rounded-full ${user.role === 'admin' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                                {user.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'เจ้าหน้าที่เวร (Staff)'}
                              </span>
                            </td>

                            {/* ACTIVE TOGGLE SENDER STATUS */}
                            <td className="px-6 py-4">
                              <button
                                type="button"
                                onClick={() => toggleUserActiveStatus(user)}
                                className="flex items-center gap-1.5 cursor-pointer bg-transparent border-none text-left"
                                title="คลิกเพื่อสลับเปิด/ปิดสถานะผู้ใช้"
                              >
                                <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-300 pointer-events-none ${
                                  isActive ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                                }`}>
                                  <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform duration-300 ${
                                    isActive ? 'translate-x-4' : 'translate-x-0.5'
                                  }`} />
                                </div>
                                <span className={`text-[12px] font-black uppercase tracking-wider ${
                                  isActive ? 'text-green-500' : 'text-slate-400'
                                }`}>
                                  {isActive ? 'Active' : 'Inactive'}
                                </span>
                              </button>
                            </td>

                            {/* ACTIONS */}
                            <td className="px-6 py-4 text-center pr-8">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditUserModal(user)}
                                  className="w-8 h-8 rounded-lg text-brand-blue hover:bg-brand-blue/5 border border-brand-blue/10 flex items-center justify-center transition cursor-pointer dark:text-blue-400"
                                  title="แก้ไขข้อมูลเจ้าหน้าที่"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setIsUserDeleteConfirmOpen(true);
                                  }}
                                  className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-100 dark:border-red-950/40 flex items-center justify-center transition cursor-pointer"
                                  title="ลบเจ้าหน้าที่ออกถาวร"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: User Cards Layout */}
                {!isLoadingUsers && filteredUsers.length > 0 && (
                  <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedUsers.map((user) => {
                      const isActive = user.is_active !== false;
                      return (
                        <div key={user.id} className="p-4 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-850/20 space-y-3">
                          {/* Header metadata row */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              user.role === 'admin' 
                                ? 'bg-rose-50 border-rose-250/25 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30' 
                                : 'bg-indigo-50 border-indigo-250/25 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/30'
                            }`}>
                              <div className={`w-1 h-1 rounded-full ${user.role === 'admin' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                              {user.role === 'admin' ? 'Admin' : 'Staff'}
                            </span>

                            {/* Toggle Active Switch */}
                            <button
                              type="button"
                              onClick={() => toggleUserActiveStatus(user)}
                              className="flex items-center gap-1.5 cursor-pointer bg-transparent border-none text-left"
                              title="คลิกเพื่อสลับเปิด/ปิดสถานะผู้ใช้"
                            >
                              <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-300 pointer-events-none ${
                                isActive ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                              }`}>
                                <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform duration-300 ${
                                  isActive ? 'translate-x-4' : 'translate-x-0.5'
                                }`} />
                              </div>
                              <span className={`text-[11px] font-black uppercase tracking-wider ${
                                isActive ? 'text-green-500' : 'text-slate-400'
                              }`}>
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </button>
                          </div>

                          {/* Name and Email details */}
                          <div className="space-y-1 text-left">
                            <h4 className="text-sm font-black text-[#0f2d52] dark:text-white leading-snug">
                              {user.full_name || 'ไม่ระบุชื่อ'}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {user.email || '-'}
                            </p>
                          </div>

                          {/* PIN indicator & action buttons */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800/40 text-[10px] font-bold text-slate-400">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-extrabold font-mono">
                              รหัสผ่าน: ••••••••
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditUserModal(user)}
                                className="w-8 h-8 rounded-lg text-brand-blue hover:bg-brand-blue/5 border border-brand-blue/10 flex items-center justify-center transition cursor-pointer dark:text-blue-400"
                                title="แก้ไขข้อมูลเจ้าหน้าที่"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUserToDelete(user);
                                  setIsUserDeleteConfirmOpen(true);
                                }}
                                className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-100 dark:border-red-950/40 flex items-center justify-center transition cursor-pointer"
                                title="ลบเจ้าหน้าที่ออกถาวร"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

              {/* User Table Pagination Controls */}
              {!isLoadingUsers && filteredUsers.length > USERS_PER_PAGE && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4.5 bg-slate-50/50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 gap-4">
                  <div className="text-[12px] text-slate-400 font-extrabold font-thai">
                    แสดง {((usersPage - 1) * USERS_PER_PAGE) + 1} - {Math.min(usersPage * USERS_PER_PAGE, filteredUsers.length)} จาก {filteredUsers.length} บัญชี
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                      disabled={usersPage === 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-blue disabled:opacity-30 disabled:hover:text-slate-400 transition-colors bg-white dark:bg-slate-800 border border-slate-150/10 shadow-sm"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    {(() => {
                      const maxDisplayedPages = 5;
                      let startPage = 1;
                      let endPage = totalUserPages;

                      if (totalUserPages > maxDisplayedPages) {
                        const half = Math.floor(maxDisplayedPages / 2);
                        startPage = usersPage - half;
                        endPage = usersPage + half;

                        if (startPage < 1) {
                          startPage = 1;
                          endPage = maxDisplayedPages;
                        } else if (endPage > totalUserPages) {
                          endPage = totalUserPages;
                          startPage = totalUserPages - maxDisplayedPages + 1;
                        }
                      }

                      const pages = [];
                      for (let p = startPage; p <= endPage; p++) {
                        pages.push(p);
                      }

                      return (
                        <div className="flex items-center gap-1">
                          {pages.map((pageNum) => (
                            <button
                              key={pageNum}
                              onClick={() => setUsersPage(pageNum)}
                              className={`w-8 h-8 rounded-lg text-[12px] font-black transition-all shadow-sm ${
                                usersPage === pageNum 
                                  ? 'bg-brand-blue text-white' 
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-150/10'
                              }`}
                            >
                              {pageNum}
                            </button>
                          ))}
                        </div>
                      );
                    })()}

                    <button 
                      onClick={() => setUsersPage(prev => Math.min(totalUserPages, prev + 1))}
                      disabled={usersPage === totalUserPages}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-blue disabled:opacity-30 disabled:hover:text-slate-400 transition-colors bg-white dark:bg-slate-800 border border-slate-150/10 shadow-sm"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'Announcements' ? (
          <div className="space-y-4 sm:space-y-6 animate-fadeIn font-thai p-4 sm:p-6 md:p-8">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-500">
                    <Megaphone size={18} />
                  </div>
                  <h3 className="text-lg font-black text-[#0f2d52] dark:text-white">จัดการข่าวสารและประกาศประชาสัมพันธ์</h3>
                </div>
                <p className="text-xs text-slate-400 font-bold">สร้างและจัดการข่าวสารสำคัญ กฎระเบียบปฏิบัติ หรือข้อความแจ้งเตือนที่เผยแพร่ให้เจ้าหน้าที่ทราบในระบบ</p>
              </div>
              <button
                type="button"
                onClick={openCreateAnnModal}
                className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 cursor-pointer border border-transparent"
              >
                <Plus size={14} />
                <span>เพิ่มประกาศใหม่</span>
              </button>
            </div>

            {/* Filter toolbar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาตามชื่อ หัวเรื่อง หรือเนื้อหา..."
                  value={announcementSearch}
                  onChange={(e) => setAnnouncementSearch(e.target.value)}
                  className="w-full pl-11 pr-4 h-11 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-[#0f2d52] dark:text-white outline-none border border-transparent focus:bg-white focus:border-brand-blue/20 dark:focus:bg-slate-850 dark:focus:border-brand-blue/30 transition-all placeholder:text-slate-300"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 md:flex md:items-center gap-2.5 w-full md:w-auto">
                <CustomSelect
                  inlineLabel="กลุ่ม:"
                  value={announcementCategoryFilter}
                  onChange={(val) => setAnnouncementCategoryFilter(val)}
                  options={[
                    { value: 'All', label: 'ทุกระดับ' },
                    { value: 'critical', label: 'ด่วนที่สุด' },
                    { value: 'important', label: 'สำคัญ' },
                    { value: 'general', label: 'ทั่วไป' }
                  ]}
                  className="w-full md:w-auto md:min-w-32"
                />

                <CustomSelect
                  inlineLabel="ปักหมุด:"
                  value={announcementPinnedFilter}
                  onChange={(val) => setAnnouncementPinnedFilter(val)}
                  options={[
                    { value: 'All', label: 'ทั้งหมด' },
                    { value: 'Pinned', label: 'ปักหมุด' },
                    { value: 'Unpinned', label: 'ไม่ปักหมุด' }
                  ]}
                  className="w-full md:w-auto md:min-w-32"
                />

                <button
                  type="button"
                  onClick={loadAnnouncements}
                  className="col-span-2 md:col-span-auto h-11 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-xl flex items-center justify-center text-[#0f2d52] dark:text-slate-250 border border-slate-150 dark:border-slate-800 transition cursor-pointer gap-2"
                  title="รีเฟรชประกาศ"
                >
                  <RefreshCw size={13} className={isAnnouncementsLoading ? "animate-spin" : ""} />
                  <span className="text-xs font-bold md:hidden">รีเฟรชประกาศ</span>
                </button>
              </div>
            </div>

            {/* Content Table / Cards */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              {isAnnouncementsLoading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-400 font-bold">กำลังโหลดประกาศล่าสุด...</p>
                </div>
              ) : announcements.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                  ไม่มีข่าวสารประชาสัมพันธ์ในคลังขณะนี้
                </div>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
                        <th className="w-12 px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">หมุด</th>
                        <th className="w-32 px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ระดับ</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">เรื่องที่ประกาศ</th>
                        <th className="w-44 px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ผู้ลงนามประกาศ</th>
                        <th className="w-32 px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">วันที่แก้ไขล่าสุด</th>
                        <th className="w-24 px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[12px] font-bold">
                      {announcements
                        .filter(ann => {
                          const searchLower = announcementSearch.toLowerCase();
                          const matchesSearch = 
                            ann.title.toLowerCase().includes(searchLower) || 
                            ann.content.toLowerCase().includes(searchLower) || 
                            ann.author.toLowerCase().includes(searchLower);
                            
                          const matchesCategory = announcementCategoryFilter === 'All' || ann.category === announcementCategoryFilter;
                          
                          const matchesPinned = announcementPinnedFilter === 'All' || 
                                                (announcementPinnedFilter === 'Pinned' && ann.pinned) || 
                                                (announcementPinnedFilter === 'Unpinned' && !ann.pinned);
                                                
                          return matchesSearch && matchesCategory && matchesPinned;
                        })
                        .map((ann) => {
                          return (
                            <tr key={ann.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                              {/* PIN PIN PIN */}
                              <td className="px-6 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePinAnnouncement(ann)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    ann.pinned 
                                      ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/20' 
                                      : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                                  }`}
                                  title={ann.pinned ? 'ถอนหมุดออก' : 'ปักหมุดประกาศนี้ไว้บนสุด'}
                                >
                                  <Pin size={14} className={ann.pinned ? 'fill-current' : ''} />
                                </button>
                              </td>

                              {/* CATEGORY / LEVEL */}
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase text-center min-w-[70px] inline-block ${
                                  ann.category === 'critical' 
                                    ? 'bg-red-50 text-red-500 border border-red-100/50 dark:bg-red-950/20 dark:border-red-900/30' 
                                    : ann.category === 'important'
                                    ? 'bg-yellow-50 text-yellow-600 border border-yellow-101 dark:bg-yellow-950/20 dark:border-yellow-905/30'
                                    : 'bg-blue-50 text-brand-blue border border-blue-101 dark:bg-blue-950/20 dark:border-blue-900/30'
                                }`}>
                                  {ann.category === 'critical' ? 'ด่วนที่สุด' : ann.category === 'important' ? 'สำคัญ' : 'ทั่วไป'}
                                </span>
                              </td>

                              {/* TITLE & CONTENT PREVIEW */}
                              <td className="px-6 py-4 max-w-sm md:max-w-md">
                                <div className="space-y-0.5" onClick={() => setViewedAnnouncement(ann)}>
                                  <span className="text-slate-800 dark:text-slate-200 font-black block text-sm truncate hover:underline cursor-pointer">{ann.title}</span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block truncate max-w-lg">{ann.content}</span>
                                </div>
                              </td>

                              {/* AUTHOR */}
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {ann.author}
                              </td>

                              {/* DATE */}
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {ann.date}
                              </td>

                              {/* ACTIONS */}
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditAnnModal(ann)}
                                    className="w-8 h-8 rounded-lg text-brand-blue hover:bg-brand-blue/5 border border-brand-blue/10 flex items-center justify-center transition cursor-pointer dark:text-blue-400"
                                    title="แก้ไขข้อมูลประกาศ"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAnnToDelete(ann);
                                      setIsAnnDeleteConfirmOpen(true);
                                    }}
                                    className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-100 dark:border-red-950/40 flex items-center justify-center transition cursor-pointer"
                                    title="ลบประกาศถาวร"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Announcement Cards Layout */}
                {!isAnnouncementsLoading && announcements.length > 0 && (
                  <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                    {announcements
                      .filter(ann => {
                        const searchLower = announcementSearch.toLowerCase();
                        const matchesSearch = 
                          ann.title.toLowerCase().includes(searchLower) || 
                          ann.content.toLowerCase().includes(searchLower) || 
                          ann.author.toLowerCase().includes(searchLower);
                          
                        const matchesCategory = announcementCategoryFilter === 'All' || ann.category === announcementCategoryFilter;
                        
                        const matchesPinned = announcementPinnedFilter === 'All' || 
                                              (announcementPinnedFilter === 'Pinned' && ann.pinned) || 
                                              (announcementPinnedFilter === 'Unpinned' && !ann.pinned);
                                              
                        return matchesSearch && matchesCategory && matchesPinned;
                      })
                      .map((ann) => {
                        return (
                          <div 
                            key={ann.id} 
                            className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-all space-y-3"
                          >
                            {/* Header row: level and pin */}
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase text-center min-w-[65px] inline-block ${
                                ann.category === 'critical' 
                                  ? 'bg-red-50 text-red-500 border border-red-100/50 dark:bg-red-950/20' 
                                  : ann.category === 'important'
                                  ? 'bg-yellow-50 text-yellow-600 border border-yellow-101 dark:bg-yellow-950/20'
                                  : 'bg-blue-50 text-brand-blue border border-blue-101 dark:bg-blue-950/20'
                              }`}>
                                {ann.category === 'critical' ? 'ด่วนที่สุด' : ann.category === 'important' ? 'สำคัญ' : 'ทั่วไป'}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleTogglePinAnnouncement(ann)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  ann.pinned 
                                    ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-400' 
                                    : 'text-slate-300 hover:text-slate-500'
                                }`}
                                title={ann.pinned ? 'ถอนหมุดออก' : 'ปักหมุดประกาศนี้ไว้บนสุด'}
                              >
                                <Pin size={14} className={ann.pinned ? 'fill-current' : ''} />
                              </button>
                            </div>

                            {/* Body row: details */}
                            <div className="space-y-1 text-left" onClick={() => setViewedAnnouncement(ann)}>
                              <h4 className="text-sm font-black text-[#0f2d52] dark:text-white hover:underline cursor-pointer leading-snug">
                                {ann.title}
                              </h4>
                              <p className="text-xs text-slate-450 dark:text-slate-500 font-bold line-clamp-2 leading-relaxed">
                                {ann.content}
                              </p>
                            </div>

                            {/* Footer row: author details and actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800/40 text-[10px] font-bold text-slate-400">
                              <div className="text-left leading-normal space-y-0.5">
                                <div>
                                  <span className="font-normal text-slate-400">ผู้ประกาศ: </span>
                                  <span className="font-black text-slate-600 dark:text-slate-350">{ann.author}</span>
                                </div>
                                <div className="text-[9px] text-slate-400 font-medium">
                                  อัปเดต: {ann.date}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditAnnModal(ann)}
                                  className="w-8 h-8 rounded-lg text-brand-blue hover:bg-brand-blue/5 border border-brand-blue/10 flex items-center justify-center transition cursor-pointer dark:text-blue-400"
                                  title="แก้ไขข้อมูลประกาศ"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAnnToDelete(ann);
                                    setIsAnnDeleteConfirmOpen(true);
                                  }}
                                  className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-100 dark:border-red-950/40 flex items-center justify-center transition cursor-pointer"
                                  title="ลบประกาศถาวร"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}
            </div>
          </div>
        ) : activeTab === 'Settings' ? (
          <div className="p-4 sm:p-6 pb-6 space-y-4 sm:space-y-6 md:space-y-8 animate-fadeIn min-h-[500px] max-w-full font-thai">
            {/* Header section with styling matching other pages */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#06C755] animate-pulse"></span>
                  <p className="text-[10px] font-black uppercase text-[#06C755] tracking-widest font-mono">LINE Integration</p>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-[#0f2d52] dark:text-white leading-tight font-thai">
                  ตั้งค่าระบบแจ้งเตือน LINE
                </h1>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={fetchLineSettings}
                disabled={isLoadingLineSettings}
                className="w-full md:w-auto h-11 px-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-slate-850 rounded-2xl flex items-center justify-center gap-2 text-xs font-black text-[#0f2d52] dark:text-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50 flex-shrink-0"
              >
                <RefreshCw size={14} className={isLoadingLineSettings ? "animate-spin" : "text-slate-400"} />
                <span>รีเฟรชการเชื่อมต่อ</span>
              </button>
            </div>

            {isLoadingLineSettings && lineGroups.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-16 text-center flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-3 border-[#06C755]/30 border-t-[#06C755] rounded-full animate-spin"></div>
                <p className="text-xs text-slate-400 font-bold font-thai">กำลังตรวจสอบข้อมูลกลุ่ม LINE ในระบบ...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto w-full">
                
                {/* Column - Forms & Testing */}
                <div className="space-y-6 max-w-full">
                  
                  {/* Active Status Display Box */}
                  <div className="bg-gradient-to-br from-[#06C755]/8 to-[#05b34c]/5 dark:from-[#06C755]/12 dark:to-emerald-950/20 border border-[#06C755]/20 dark:border-[#06C755]/30 rounded-[2.5rem] p-6 relative overflow-hidden flex flex-col md:flex-row items-center gap-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
                    <div className="absolute right-0 bottom-0 opacity-5 select-none pointer-events-none translate-x-4 translate-y-4">
                      <Bell size={180} className="text-[#06C755]" />
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-[#06C755] flex items-center justify-center text-white flex-shrink-0 shadow-[0_10px_25px_rgba(6,199,85,0.22)] transition hover:scale-105">
                      <Bell size={24} />
                    </div>
                    <div className="text-center md:text-left space-y-1.5 min-w-0 flex-1 relative z-10">
                      <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">สถานะการเชื่อมต่อล่าสุด</span>
                      <h4 className="text-base font-black text-[#0f2d52] dark:text-white leading-none font-thai">
                        {activeLineGroupId ? 'เชื่อมต่อกับ LINE สำเร็จแล้ว' : 'ยังไม่ได้เชื่อมต่อกลุ่ม LINE'}
                      </h4>
                      
                      {activeLineGroupId ? (
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold font-thai">
                            LINE Group ID:
                          </span>
                          <span className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-emerald-500/15 font-mono text-emerald-700 dark:text-emerald-300 font-black text-xs select-all">
                            {activeLineGroupId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyGroupId(activeLineGroupId)}
                            className="p-1 px-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-[10px]"
                            title="คัดลอกรหัสกลุ่ม LINE"
                          >
                            {copiedGroupId === activeLineGroupId ? (
                              <>
                                <Check size={11} className="text-emerald-600" />
                                <span className="text-emerald-600 font-thai font-black">คัดลอกสำเร็จ</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span className="font-thai font-black">คัดลอก ID</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-550 dark:text-slate-400 font-bold max-w-sm font-thai leading-relaxed">
                          กรุณากรอกและเปิดใช้งาน Group ID เพื่อให้ระบบส่งเสริมและแจ้งเตือนเข้าสู่กลุ่ม LINE แผนกของคุณ
                        </p>
                      )}
                    </div>
                    {activeLineGroupId && (
                      <div className="flex-shrink-0 md:ml-auto flex items-center gap-1.5 px-3.5 py-1.5 bg-[#06C755]/15 text-[#06C755] dark:bg-[#06C755]/20 border border-[#06C755]/15 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-[#06C755] relative flex">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#06C755] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#06C755]"></span>
                        </span>
                        <span>ACTIVE</span>
                      </div>
                    )}
                  </div>

                  {/* Settings Input Form */}
                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-[#0f2d52] dark:text-white font-thai leading-none">ระบุกลุ่มแจ้งเตือนใหม่</h3>
                      <p className="text-xs text-slate-400 font-bold font-thai">อัปเดต ID กลุ่ม LINE เพื่อเปลี่ยนสถานที่รับข่าวสารและการส่งรายงานเวร</p>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleSaveLineGroup(newLineGroupId); }} className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-wider block font-thai">LINE GROUP ID (ค้นหาแรกรหัสกลุ่มได้จากห้องแชท LINE)</label>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={newLineGroupId}
                            onChange={(e) => setNewLineGroupId(e.target.value)}
                            placeholder="ป้อนรหัสกลุ่มตัวอย่าง เช่น C2bac21be00b17f53809..."
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 font-mono text-sm font-bold text-slate-850 dark:text-white focus:ring-2 focus:ring-[#06C755] focus:border-transparent outline-none transition-all duration-300 shadow-inner"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={isSavingLineSettings || !newLineGroupId.trim()}
                          className="w-full sm:w-auto px-6 h-12 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-xl text-xs font-black transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(6,199,85,0.22)] disabled:opacity-50"
                        >
                          {isSavingLineSettings ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <CheckCircle2 size={15} />
                          )}
                          <span>อัปเดตและเปิดใช้งานกลุ่ม (Save & Activate)</span>
                        </button>
                      </div>
                    </form>

                    {/* How-to guide info list */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-[2rem] border border-slate-100 dark:border-slate-805 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                          <HelpCircle size={12} />
                        </div>
                        <span className="text-xs font-black text-[#0f2d52] dark:text-slate-350 font-thai">วิธีการรับสิทธิ์และค้นหา LINE Group ID:</span>
                      </div>

                      <div className="space-y-0.5 ml-1">
                        {/* Step 1 */}
                        <div className="relative pl-6 pb-4">
                          {/* Vertical Connector Line */}
                          <div className="absolute left-[5px] top-4 bottom-0 w-[2px] bg-emerald-500/15 dark:bg-emerald-500/10"></div>
                          
                          {/* Indicator Dot */}
                          <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-[#06C755] border-2 border-white dark:border-slate-950 shadow-sm z-10"></div>
                          
                          <p className="text-xs text-slate-550 dark:text-slate-450 font-bold font-thai">
                            <span className="text-[#06C755] font-black mr-1">1.</span> เชิญบอทไลน์ของระบบเข้าร่วมกลุ่ม LINE ของแผนก
                          </p>
                        </div>

                        {/* Step 2 */}
                        <div className="relative pl-6 pb-4">
                          {/* Vertical Connector Line */}
                          <div className="absolute left-[5px] top-4 bottom-0 w-[2px] bg-emerald-500/15 dark:bg-emerald-500/10"></div>
                          
                          {/* Indicator Dot */}
                          <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-[#06C755] border-2 border-white dark:border-slate-950 shadow-sm z-10"></div>
                          
                          <p className="text-xs text-slate-550 dark:text-slate-450 font-bold font-thai leading-relaxed">
                            <span className="text-[#06C755] font-black mr-1">2.</span> บอทจะพิมพ์ข้อความตอบรับพร้อมแจ้ง ID กลุ่มลงในแชทโดยอัตโนมัติ
                          </p>
                        </div>

                        {/* Step 3 */}
                        <div className="relative pl-6 pb-4">
                          {/* Vertical Connector Line */}
                          <div className="absolute left-[5px] top-4 bottom-0 w-[2px] bg-emerald-500/15 dark:bg-emerald-500/10"></div>
                          
                          {/* Indicator Dot */}
                          <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-[#06C755] border-2 border-white dark:border-slate-950 shadow-sm z-10"></div>
                          
                          <p className="text-xs text-slate-550 dark:text-slate-450 font-bold font-thai">
                            <span className="text-[#06C755] font-black mr-1">3.</span> คัดลอกรหัสกลุ่มดังกล่าวมาระบุในรูปแบบฟอร์มด้านบนนี้เพื่อบันทึก
                          </p>
                        </div>

                        {/* Step 4 */}
                        <div className="relative pl-6">
                          {/* NO Vertical Connector Line here! */}
                          
                          {/* Indicator Dot */}
                          <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-[#06C755] border-2 border-white dark:border-slate-950 shadow-sm z-10"></div>
                          
                          <p className="text-xs text-slate-550 dark:text-slate-450 font-bold font-thai">
                            <span className="text-[#06C755] font-black mr-1">4.</span> ทดสอบส่งการแจ้งเตือนโดยกดปุ่มยิงข้อความทดสอบด้านขวาได้ทันที
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Column - Registered Groups List */}
                <div className="space-y-6 max-w-full">
                  
                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h3 className="text-base font-black text-[#0f2d52] dark:text-white font-thai leading-none">กลุ่มที่เคยลงทะเบียน ({lineGroups.length})</h3>
                        <p className="text-[10px] text-slate-400 font-bold font-thai">ประวัติกลุ่มที่มีการจดรหัสในฐานระบบ</p>
                      </div>
                      <span className="text-[9px] bg-slate-50 dark:bg-slate-950 text-slate-400 border border-slate-150 dark:border-slate-800 px-2.5 py-0.5 rounded-full font-bold">History Log</span>
                    </div>

                    {lineGroups.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider font-thai">
                        ยังไม่มีประวัติกลุ่ม LINE ที่เชื่อมต่อ
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {lineGroups.map((group) => {
                          const isActive = group.group_id === activeLineGroupId;
                          return (
                            <div 
                              key={group.group_id}
                              className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-3 ${
                                isActive 
                                  ? 'bg-[#06C755]/5 dark:bg-[#06C755]/10 border-[#06C755]/30 dark:border-[#06C755]/40 shadow-sm' 
                                  : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/50 dark:hover:bg-slate-950/80 shadow-inner'
                              }`}
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-slate-850 dark:text-slate-200 font-mono font-bold text-xs truncate max-w-[100px] xs:max-w-[150px] sm:max-w-[200px] md:max-w-[120px] lg:max-w-[100px] xl:max-w-[150px] block font-extrabold" title={group.group_id}>
                                    {group.group_id}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyGroupId(group.group_id)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-[#06C755] rounded-md transition cursor-pointer flex-shrink-0"
                                    title="คัดลอกรหัสกลุ่ม"
                                  >
                                    {copiedGroupId === group.group_id ? (
                                      <Check size={11} className="text-emerald-600" />
                                    ) : (
                                      <Copy size={11} />
                                    )}
                                  </button>
                                  {isActive && (
                                    <span className="flex-shrink-0 px-2 py-0.2 bg-emerald-100 dark:bg-[#06C755]/20 text-[#06C755] dark:text-emerald-400 border border-emerald-250/20 rounded text-[8px] font-black uppercase">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 block font-bold font-thai">
                                  เชื่อมต่อเมื่อ: {new Date(group.joined_at).toLocaleDateString('th-TH', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    year: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {!isActive && (
                                  <button
                                    type="button"
                                    onClick={() => handleSaveLineGroup(group.group_id)}
                                    className="px-3 h-8 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-150 dark:border-slate-750 text-slate-600 dark:text-slate-250 rounded-lg text-[10px] font-black transition cursor-pointer"
                                  >
                                    เข้าใช้
                                  </button>
                                )}
                                
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLineGroup(group.group_id)}
                                  className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-100 flex items-center justify-center transition cursor-pointer"
                                  title="ลบกลุ่มจากประวัติ"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Diagnostics & Connection Test */}
                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-[#0f2d52] dark:text-white font-thai leading-none">ทดสอบระบบแจ้งเตือน</h3>
                      <p className="text-xs text-slate-400 font-bold font-thai">ตรวจสอบสถานะการรับส่งข้อความ Flex Message ไปยังกลุ่ม LINE</p>
                    </div>

                    <div className="space-y-4">
                      {testNotificationStatus.status === 'success' && (
                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold leading-relaxed font-thai break-words">
                          ✓ {testNotificationStatus.message}
                        </div>
                      )}
                      
                      {testNotificationStatus.status === 'error' && (
                        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 text-red-550 text-xs font-bold leading-relaxed font-thai break-words">
                          ⚠ {testNotificationStatus.message}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleTestNotification}
                        disabled={testNotificationStatus.status === 'loading'}
                        className="w-full px-5 h-12 bg-gradient-to-r from-[#06C755] to-[#05b34c] hover:brightness-105 active:scale-[0.99] text-white rounded-xl text-xs font-black transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(6,199,85,0.18)] disabled:opacity-50"
                      >
                        {testNotificationStatus.status === 'loading' ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <RefreshCw size={14} />
                        )}
                        <span>ยิงข้อความทดสอบไปยัง LINE Group (Send Test Message)</span>
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        ) : activeTab === 'Logs' ? (
          <AdminLogViewer />
        ) : (
          <div className="p-8 md:p-12 flex flex-col items-center justify-center min-h-[400px] animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center text-brand-blue mb-4">
              <Settings size={28} />
            </div>
            <h3 className="text-base font-black text-[#0f2d52] dark:text-white mb-2 font-thai">หน้า {activeTab} ระบบผู้ดูแลระบบ</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm text-center font-thai leading-relaxed">
              หน้านี้อยู่ระหว่างการพัฒนาปรับปรุงสำหรับการเชื่อมต่อข้อมูล ขออภัยในความไม่สะดวก
            </p>
          </div>
        )}

      {/* Detail Modal Overlay */}
      <AnimatePresence>
        {selectedHandover && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-2.5 sm:p-4 z-50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2rem] border border-slate-200 dark:border-slate-800 w-full max-w-2xl shadow-2xl overflow-y-auto flex flex-col max-h-[86vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between font-thai">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-blue/10 dark:bg-brand-blue/20 rounded-xl text-brand-blue flex-shrink-0 animate-fadeIn">
                    {isEditHandoverMode ? <Edit2 size={22} /> : <ClipboardList size={22} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-[#0f2d52] dark:text-white leading-none">
                      {isEditHandoverMode ? 'แก้ไขข้อมูลการส่ง-รับเวร' : 'รายละเอียดการส่งมอบเวร'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono font-bold mt-1 truncate">ID: {selectedHandover.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeHandoverDetail}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              {isEditHandoverMode ? (
                /* --- EDIT MODE VIEW --- */
                <div className="p-6 overflow-y-auto space-y-5 font-thai">
                  {editHandoverError && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-2xl text-[13px] font-black flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse.shrink-0" />
                      {editHandoverError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider block ml-1">
                      หัวข้อส่งมอบงาน / บันทึกเวร
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="ระบุหัวข้อหลัก..."
                      className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl outline-none text-[13px] font-bold text-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider block ml-1">
                        งาน / แผนก
                      </label>
                      <select
                        value={editDivision}
                        onChange={(e) => setEditDivision(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl outline-none text-[13px] font-bold text-slate-800 dark:text-white cursor-pointer"
                      >
                        <option value="Central Lab">Central Lab</option>
                        <option value="Blood Bank">Blood Bank</option>
                        <option value="Microbiology">Microbiology</option>
                        <option value="Pathology">Pathology</option>
                        <option value="Immunology">Immunology</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider block ml-1">
                        เวรปฏิบัติงาน (Shift)
                      </label>
                      <input
                        type="text"
                        value={editShift}
                        onChange={(e) => setEditShift(e.target.value)}
                        placeholder="เช่น เช้า, บ่าย, ดึก, กลางวัน"
                        className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl outline-none text-[13px] font-bold text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider block ml-1">
                        วันที่ระบุเวร
                      </label>
                      <input
                        type="date"
                        value={editHandoverDate}
                        onChange={(e) => setEditHandoverDate(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl outline-none text-[13px] font-bold text-slate-800 dark:text-white cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider block ml-1">
                        สถานะใบงาน
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl outline-none text-[13px] font-bold text-slate-800 dark:text-white cursor-pointer"
                      >
                        <option value="Pending">Pending (รอผู้ตอบรับเวร)</option>
                        <option value="Accepted">Accepted (ตอบรับเวรสำเร็จ)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider block ml-1">
                        เจ้าหน้าที่ผู้ส่งมอบงาน
                      </label>
                      <select
                        value={editSenderId}
                        onChange={(e) => setEditSenderId(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl outline-none text-[13px] font-bold text-slate-800 dark:text-white cursor-pointer"
                      >
                        <option value="">-- ไม่ระบุ (System / LINE Webhook) --</option>
                        {usersList.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider block ml-1">
                        เจ้าหน้าที่ผู้รับส่งเวร
                      </label>
                      <select
                        value={editReceiverId}
                        onChange={(e) => setEditReceiverId(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl outline-none text-[13px] font-bold text-slate-800 dark:text-white cursor-pointer"
                      >
                        <option value="">-- ยังไม่มีการตอบรับเวร --</option>
                        {usersList.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider block ml-1">
                      ชื่อแสดงตัวตนบน LINE (ผู้รับเวรผ่าน Webhook / LIFF)
                    </label>
                    <input
                      type="text"
                      value={editReceiverLineName}
                      onChange={(e) => setEditReceiverLineName(e.target.value)}
                      placeholder="ระบุกรณีผู้ใช้ตอบรับงานผ่าน LINE เท่านั้น..."
                      className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl outline-none text-[13px] font-bold text-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider block ml-1">
                      รายละเอียดการส่งเวร (Full Description)
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="ระบุรายละเอียดทางคลินิก, ข้อมูลผู้ป่วย, อาการสิ่งตรวจสิ่งแวดล้อมต่างๆ..."
                      rows={4}
                      className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl outline-none text-[13px] font-bold text-slate-800 dark:text-white leading-relaxed resize-none"
                    />
                  </div>
                </div>
              ) : (
                /* --- READ ONLY VIEW (CURRENT) --- */
                <div className="p-6 overflow-y-auto space-y-6">
                  <div>
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border w-fit block mb-1.5 ${
                      selectedHandover.division === 'Central Lab' ? 'text-brand-blue border-brand-blue/20 bg-brand-blue/5' : selectedHandover.division === 'Blood Bank' ? 'text-violet-500 border-violet-500/20 bg-violet-50 dark:bg-violet-950/20' : 'text-slate-500 border-slate-200 bg-slate-50'
                    }`}>
                      {selectedHandover.division}
                    </span>
                    <h4 className="text-base font-black text-[#0f2d52] dark:text-white leading-snug">{selectedHandover.title}</h4>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">วันที่ระบุเวร</span>
                      <p className="text-xs font-black text-[#0f2d52] dark:text-slate-250 mt-1">{formatThaiDate(selectedHandover.handover_date)}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">ถูกบันทึกเมื่อ</span>
                      <p className="text-xs font-black text-[#0f2d52] dark:text-slate-250 mt-1">{formatTimeStr(selectedHandover.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">ปฏิบัติงาน (Shift)</span>
                      <p className="text-xs font-black text-[#0f2d52] dark:text-slate-250 mt-1">เวร{selectedHandover.shift || selectedHandover.category?.split('|')[0] || 'ไม่ระบุ'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">สถานะใบงาน</span>
                      <p className="mt-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black inline-block ${selectedHandover.status === 'Pending' ? 'bg-[#facc15] text-slate-950' : 'bg-green-500 text-white'}`}>
                          {selectedHandover.status === 'Pending' ? 'รอผู้ตอบรับเวร' : 'ตอบรับเวรสำเร็จ'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">รายละเอียดส่งเวร (Full Description)</span>
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-350 font-bold whitespace-pre-wrap min-h-[100px]">
                      {selectedHandover.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-brand-blue/5 dark:bg-brand-blue/10 border border-brand-blue/10 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-blue flex items-center justify-center text-white text-xs font-black shrink-0">
                        ST
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">เจ้าหน้าที่ผู้ส่งมอบงาน</span>
                        <p className="text-xs font-black text-[#0f2d52] dark:text-white mt-0.5">{selectedHandover.sender?.full_name || 'System'}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-green-50/50 dark:bg-green-950/15 border border-green-500/10 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center text-white text-xs font-black shrink-0">
                        RE
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">เจ้าหน้าที่ผู้รับส่งเวร</span>
                        <p className="text-xs font-black text-green-600 dark:text-green-400 mt-0.5">{selectedHandover.receiver?.full_name || selectedHandover.receiver_line_name || 'ยังไม่มีการยืนยันการรับเวร'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900 font-thai">
                {isEditHandoverMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditHandoverMode(false)}
                      className="px-4 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black transition-all"
                    >
                      ยกเลิก
                    </button>

                    <button
                      type="button"
                      disabled={isSavingHandover}
                      onClick={handleSaveHandover}
                      className="px-5 h-10 bg-brand-blue hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                    >
                      {isSavingHandover ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setHandoverToDelete(selectedHandover);
                        setIsDeleteConfirmOpen(true);
                      }}
                      className="px-4 h-10 bg-red-50 dark:bg-red-950/20 hover:bg-red-100/80 dark:hover:bg-red-950/30 text-red-500 rounded-xl text-xs font-black border border-red-200/50 dark:border-red-950/50 transition-all flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>ลบข้อมูลจากประวัติ</span>
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={startEditingHandover}
                        className="px-4 h-10 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-black border border-amber-200/50 dark:border-amber-950/50 transition-all flex items-center gap-1.5"
                      >
                        <Edit2 size={13} />
                        <span>แก้ไขข้อมูล</span>
                      </button>

                      <button
                        type="button"
                        onClick={closeHandoverDetail}
                        className="px-5 h-10 bg-[#0f2d52] hover:bg-[#081f3d] text-white rounded-xl text-xs font-black transition-all"
                      >
                        ปิดหน้ารายละเอียด
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && handoverToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-2.5 sm:p-4 z-[60] backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[86vh]"
            >
              <div className="flex items-center gap-3 text-red-500">
                <div className="p-2.5 bg-red-50 dark:bg-red-950/20 rounded-xl shrink-0">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-none">ยืนยันการลบตัวส่งมอบเวร</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-tight">สิทธิ์ขั้นสูง (ผู้ดูแลระบบ) เท่านั้นที่มีสิทธิ์ลบข้อมูล</p>
                </div>
              </div>

              <p className="text-xs font-bold text-slate-500 leading-relaxed dark:text-slate-400">
                คุณแน่ใจว่าต้องการลบรายการส่งเวรเรื่อง <strong className="text-[#0f2d52] dark:text-white">"{handoverToDelete.title}"</strong> ใช่หรือไม่? การกระทำนี้ไม่สามารถกู้คืนกลับมาได้หลังจากลบออกจากคลาวด์ Supabase แล้ว
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setHandoverToDelete(null);
                  }}
                  className="flex-1 h-11 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-xl text-xs font-black border border-slate-250/20 dark:border-slate-705 hover:bg-slate-100 transition-all"
                  disabled={isDeleting}
                >
                  ยกเลิกคืนค่า
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteHandover(handoverToDelete.id)}
                  className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-red-500/15 transition-all flex items-center justify-center gap-1.5"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  <span>ลบข้อมูลออกถาวร</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit User Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-2.5 sm:p-4 z-50 backdrop-blur-sm font-thai font-bold text-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[420px] shadow-2xl overflow-hidden flex flex-col max-h-[86vh]"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
                    <UserPlus size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-[#0f2d52] dark:text-white leading-none">
                      {selectedUser ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานระบบคนใหม่'}
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-1">กรอกข้อมูลเพื่อจัดการสิทธิ์ในโปรแกรม</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="w-7 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveUser} className="p-5 space-y-3.5 flex-1 text-[#0f2d52] dark:text-white overflow-y-auto">
                {userFormError && (
                  <div className="p-3 bg-red-50 dark:bg-red-955/20 border border-red-200/50 dark:border-red-900/30 rounded-xl flex items-start gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span className="text-[10px] font-bold leading-normal">{userFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3.5">
                  {/* User ID / Employee ID */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      รหัสเจ้าหน้าที่ / บัญชีล็อกอิน (USER ID) <span className="text-red-500">*จำเป็นและแก้ไขไม่ได้ภายหลัง</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={selectedUser !== null}
                      value={userIdInput}
                      onChange={(e) => setUserIdInput(e.target.value.toUpperCase().replace(/\s/g, ''))}
                      placeholder="เช่น S009, LAB_SAMITA"
                      className="w-full px-3 h-10 bg-slate-50 dark:bg-slate-800 disabled:bg-slate-150 disabled:text-slate-400 disabled:cursor-not-allowed border border-transparent dark:border-slate-800 rounded-xl text-xs font-bold text-[#0f2d52] dark:text-white outline-none focus:bg-white focus:border-brand-blue/20 dark:focus:bg-slate-850 dark:focus:border-brand-blue/30 transition-all placeholder:text-slate-350"
                    />
                  </div>

                  {/* Display Full Name */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      ชื่อ-นามสกุลจริง (FULL NAME) <span className="text-red-500">*จำเป็น</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={userFullNameInput}
                      onChange={(e) => setUserFullNameInput(e.target.value)}
                      placeholder="เช่น ทนพญ. สมิตา สิงห์สาด"
                      className="w-full px-3 h-10 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-800 rounded-xl text-xs font-bold text-[#0f2d52] dark:text-white outline-none focus:bg-white focus:border-brand-blue/20 dark:focus:bg-slate-850 dark:focus:border-brand-blue/30 transition-all placeholder:text-slate-355"
                    />
                  </div>

                  {/* Password / PIN Code */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      รหัสผ่านสำหรับบันทึกเวร (PASSWORD / รหัสผ่าน) {selectedUser ? <span className="text-slate-400 font-bold"> (ว่างไว้หากไม่ต้องการเปลี่ยน)</span> : <span className="text-red-500">*จำเป็น</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showUserPassword ? "text" : "password"}
                        required={!selectedUser}
                        value={userPasswordInput}
                        onChange={(e) => setUserPasswordInput(e.target.value)}
                        placeholder={selectedUser ? "•••••••• (เว้นว่างใช้รหัสเดิม)" : "กรอกรหัสผ่าน 4-6 หลัก หรือรหัสเซ็นรับเวร"}
                        className="w-full pl-3 pr-10 h-10 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-800 rounded-xl text-xs font-bold text-[#0f2d52] dark:text-white outline-none focus:bg-white focus:border-brand-blue/20 dark:focus:bg-slate-850 dark:focus:border-brand-blue/30 transition-all placeholder:text-slate-355"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserPassword(!showUserPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      >
                        {showUserPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Access Role selection */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">
                      กำหนดสิทธิ์โปรแกรม (USER ROLE)
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setUserRoleInput('staff')}
                        className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition cursor-pointer ${
                          userRoleInput === 'staff'
                            ? 'border-indigo-500 bg-indigo-50/25 dark:bg-indigo-950/10 text-indigo-900 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                          userRoleInput === 'staff' ? 'border-indigo-500 text-indigo-500' : 'border-slate-300'
                        }`}>
                          {userRoleInput === 'staff' && <div className="w-1 h-1 bg-indigo-500 rounded-full" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold">เจ้าหน้าที่ (Staff)</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5">ระบุส่งเวร, รับเวรปกติ</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUserRoleInput('admin')}
                        className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition cursor-pointer ${
                          userRoleInput === 'admin'
                            ? 'border-rose-500 bg-rose-50/25 dark:bg-rose-950/10 text-rose-900 dark:text-rose-200'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                          userRoleInput === 'admin' ? 'border-rose-500 text-rose-500' : 'border-slate-300'
                        }`}>
                          {userRoleInput === 'admin' && <div className="w-1 h-1 bg-rose-500 rounded-full" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold">แอดมิน (Admin)</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5">ดูแลผู้ใช้และระบบหลังบ้าน</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Optional Email */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      อีเมลสิทธิ์แอดมิน (EMAIL - เฉพาะผู้ดูแลระบบ)
                    </label>
                    <input
                      type="email"
                      value={userEmailInput}
                      onChange={(e) => setUserEmailInput(e.target.value)}
                      placeholder="เช่น member@sangkha.com"
                      className="w-full px-3 h-10 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-800 rounded-xl text-xs font-bold text-[#0f2d52] dark:text-white outline-none focus:bg-white focus:border-brand-blue/20 dark:focus:bg-slate-850 dark:focus:border-brand-blue/30 transition-all placeholder:text-slate-355"
                    />
                  </div>

                  {/* Is Active Status checkbox */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150/40 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-black text-[#0f2d52] dark:text-white uppercase leading-none">สถานะบัญชี (ACTIVE STATUS)</p>
                      <p className="text-[9px] text-slate-400 font-bold">เปิดใช้งานเพื่อสิทธิ์ส่ง/รับเวร</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUserIsActiveInput(!userIsActiveInput)}
                      className="flex items-center gap-1.5 cursor-pointer bg-transparent border-none"
                    >
                      <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-300 pointer-events-none ${
                        userIsActiveInput ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`}>
                        <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform duration-300 ${
                          userIsActiveInput ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Confirm Cancel actions */}
                <div className="flex items-center gap-3 pt-3.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="flex-1 h-10 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition"
                    disabled={isLoadingUsers}
                  >
                    ยกเลิกเก็บบันทึก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    disabled={isLoadingUsers}
                  >
                    {isLoadingUsers ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>{selectedUser ? 'ปรับปรุงเจ้าหน้าที่' : 'บันทึกเจ้าหน้าที่ใหม่'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Announcement Modal */}
      <AnimatePresence>
        {isAnnModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-2.5 sm:p-4 z-50 backdrop-blur-sm font-thai font-bold text-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[460px] shadow-2xl overflow-hidden flex flex-col max-h-[86vh]"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-500">
                    <Megaphone size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-[#0f2d52] dark:text-white leading-none">
                      {selectedAnnouncement ? 'แก้ไขข้อมูลข่าวสารประกาศ' : 'เพิ่มประกาศประชาสัมพันธ์ใหม่'}
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-1">กรอกข้อมูลข่าวสารที่ต้องการให้เจ้าหน้าที่ทุกคนในกลุ่มงานรับทราบ</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAnnModalOpen(false)}
                  className="w-7 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveAnnouncement} className="p-5 space-y-3.5 flex-1 text-[#0f2d52] dark:text-white overflow-y-auto">
                {annFormError && (
                  <div className="p-3 bg-red-50 dark:bg-red-955/20 border border-red-200/50 dark:border-red-900/30 rounded-xl flex items-start gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span className="text-[10px] font-bold leading-normal">{annFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3.5">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      ระดับความเร่งด่วน / หมวดหมู่ข่าวประกาศ <span className="text-red-500">*จำเป็น</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAnnCategoryInput('critical')}
                        className={`p-2 rounded-xl text-center border text-[11px] font-black transition cursor-pointer flex flex-col items-center justify-center gap-1 leading-snug ${
                          annCategoryInput === 'critical'
                            ? 'border-red-500 bg-red-55 dark:bg-red-950/25 text-red-650 dark:text-red-400 font-black'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block">ด่วนที่สุด</span>
                        <span className="text-[9px] text-slate-400 font-bold">Critical</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAnnCategoryInput('important')}
                        className={`p-2 rounded-xl text-center border text-[11px] font-black transition cursor-pointer flex flex-col items-center justify-center gap-1 leading-snug ${
                          annCategoryInput === 'important'
                            ? 'border-yellow-500 bg-yellow-55 dark:bg-yellow-950/25 text-yellow-650 dark:text-yellow-400 font-black'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block">ข่าวสำคัญ</span>
                        <span className="text-[9px] text-slate-400 font-bold">Important</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAnnCategoryInput('general')}
                        className={`p-2 rounded-xl text-center border text-[11px] font-black transition cursor-pointer flex flex-col items-center justify-center gap-1 leading-snug ${
                          annCategoryInput === 'general'
                            ? 'border-blue-500 bg-blue-55 dark:bg-blue-950/25 text-brand-blue dark:text-blue-400 font-black'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block">ประกาศทั่วไป</span>
                        <span className="text-[9px] text-slate-400 font-bold">General</span>
                      </button>
                    </div>
                  </div>

                  {/* Title Input */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      หัวข้อข่าวสารประกาศ (TITLE) <span className="text-red-500">*จำเป็น</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={annTitleInput}
                      onChange={(e) => setAnnTitleInput(e.target.value)}
                      placeholder="เช่น แจ้งปรับปรุงระบบโปรแกรมฐานข้อมูลส่งเวร"
                      className="w-full px-3 h-10 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-800 rounded-xl text-xs font-bold text-[#0f2d52] dark:text-white outline-none focus:bg-white focus:border-indigo-500/30 dark:focus:bg-slate-850 dark:focus:border-indigo-500/20 transition-all placeholder:text-slate-350"
                    />
                  </div>

                  {/* Content (Textarea) */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      รายละเอียดเนื้อประกาศ (CONTENT) <span className="text-red-500">*จำเป็น</span>
                    </label>
                    <textarea
                      required
                      value={annContentInput}
                      onChange={(e) => setAnnContentInput(e.target.value)}
                      rows={5}
                      placeholder="กรอกข้อความข่าวสารหรือข้อมูลอัปเดตต่าง ๆ แบบละเอียดที่นี่..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-800 rounded-xl text-xs font-bold text-[#0f2d52] dark:text-white outline-none focus:bg-white focus:border-indigo-500/30 dark:focus:bg-slate-850 dark:focus:border-indigo-500/20 transition-all placeholder:text-slate-350 resize-none leading-relaxed font-thai"
                    />
                  </div>

                  {/* Author / Signatory Input */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      ผู้ลงประทับตรา / ผู้เขียนประกาศ (AUTHOR)
                    </label>
                    <input
                      type="text"
                      required
                      value={annAuthorInput}
                      onChange={(e) => setAnnAuthorInput(e.target.value)}
                      placeholder="เช่น หัวหน้ากลุ่มงานเทคนิคการแพทย์"
                      className="w-full px-3 h-10 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-800 rounded-xl text-xs font-bold text-[#0f2d52] dark:text-white outline-none focus:bg-white focus:border-indigo-500/30 dark:focus:bg-slate-850 dark:focus:border-indigo-500/20 transition-all placeholder:text-slate-350"
                    />
                  </div>

                  {/* Pinned status toggle */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150/40 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-black text-[#0f2d52] dark:text-white uppercase leading-none flex items-center gap-1.5">
                        <Pin size={12} className="text-indigo-500 shrink-0" />
                        <span>ปักหมุดข่าวนี้ไว้ด้านบน (PINNED STATUS)</span>
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold">เพื่อกักข่าวสารประชาสัมพันธ์สำคัญนี้ไว้ให้อยู่บนหน้าหลักเสมอ</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAnnPinnedInput(!annPinnedInput)}
                      className="flex items-center gap-1.5 cursor-pointer bg-transparent border-none"
                    >
                      <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-300 pointer-events-none ${
                        annPinnedInput ? 'bg-indigo-650' : 'bg-slate-200 dark:bg-slate-700'
                      }`}>
                        <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform duration-300 ${
                          annPinnedInput ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center gap-3 pt-3.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAnnModalOpen(false)}
                    className="flex-1 h-10 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition"
                  >
                    ยกเลิกเก็บบันทึก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    disabled={isAnnouncementsLoading}
                  >
                    {isAnnouncementsLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>{selectedAnnouncement ? 'บันทึกการแก้ไข' : 'ลงประกาศใหม่'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Announcement Confirmation Dialog */}
      <AnimatePresence>
        {isAnnDeleteConfirmOpen && annToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-2.5 sm:p-4 z-50 backdrop-blur-sm font-thai font-bold text-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 p-5 sm:p-6 w-full max-w-[380px] shadow-2xl text-center space-y-4 overflow-y-auto max-h-[86vh]"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-500 m-auto flex items-center justify-center shadow-lg shadow-red-500/10">
                <Trash2 size={20} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-snug">คุณแน่ใจหรือไม่ที่จะลบประกาศข่าวดังกล่าว?</h3>
                <p className="text-[10px] text-slate-400 font-black">"{annToDelete.title}"</p>
                <p className="text-[10px] text-red-500 font-bold leading-relaxed">การกระทำนี้จะลบข้อมูลประกาศออก และกู้คืนไม่ได้อีกภายหลัง</p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAnnDeleteConfirmOpen(false);
                    setAnnToDelete(null);
                  }}
                  className="flex-1 h-10 rounded-xl bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-355 hover:bg-slate-100 border border-slate-150/50 dark:border-slate-800 transition font-black"
                  disabled={isAnnDeleting}
                >
                  ถอยกลับ / ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAnnouncement}
                  className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white transition shadow-lg shadow-red-500/15 font-black flex items-center justify-center gap-1 cursor-pointer"
                  disabled={isAnnDeleting}
                >
                  {isAnnDeleting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>ลบประกาศออก</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Announcement Detail Modal Overlay (Admin View) */}
      <AnimatePresence>
        {viewedAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm font-thai font-bold">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-[500px] shadow-2xl p-5 sm:p-6 flex flex-col justify-between space-y-4 relative overflow-y-auto max-h-[86vh]"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                      {viewedAnnouncement.category === 'critical' ? 'ด่วนที่สุด' : viewedAnnouncement.category === 'important' ? 'สำคัญ' : 'ทั่วไป'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold">{viewedAnnouncement.date}</span>
                  </div>
                  <h3 className="text-base font-black text-[#0f2d52] dark:text-white leading-tight mt-1">{viewedAnnouncement.title}</h3>
                </div>
                <button 
                  onClick={() => setViewedAnnouncement(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-xs sm:text-sm text-[#0f2d52] dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed font-thai">
                {viewedAnnouncement.content}
              </div>

              <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/80 pt-4">
                <div className="text-[11px] font-bold text-slate-400">
                  <span className="block">ผู้ประสานงาน: {viewedAnnouncement.author}</span>
                  <span className="block mt-0.5">กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลสังขะ</span>
                </div>
                <button
                  onClick={() => setViewedAnnouncement(null)}
                  className="h-9 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  ปิดหน้าต่างนี้
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Permanently Delete User Confirmation Modal */}
      <AnimatePresence>
        {isUserDeleteConfirmOpen && userToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-2.5 sm:p-4 z-[60] backdrop-blur-sm font-thai font-bold text-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[86vh]"
            >
              <div className="flex items-center gap-3 text-red-500">
                <div className="p-2.5 bg-red-50 dark:bg-red-950/20 rounded-xl shrink-0">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-none">ลบสมาชิกออกจากระบบถาวร</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-none">โปรดระวัง: การลบนี้ลบจริงบนฐานข้อมูลคลาวด์</p>
                </div>
              </div>

              <p className="text-xs font-bold text-slate-500 leading-relaxed dark:text-slate-400">
                คุณแน่ใจว่าต้องการลบบัญชีผู้ใช้ของคุณ <strong className="text-[#0f2d52] dark:text-white">"{userToDelete.full_name}"</strong> ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนคืนค่าข้อมูลได้
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserDeleteConfirmOpen(false);
                    setUserToDelete(null);
                  }}
                  className="flex-1 h-11 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-xl text-xs font-black border border-slate-250/20 dark:border-slate-700 hover:bg-slate-100 transition"
                  disabled={isUserDeleting}
                >
                  ยกเลิกย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-red-500/15 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  disabled={isUserDeleting}
                >
                  {isUserDeleting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  <span>ยืนยันลบเจ้าหน้าที่</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Relational Lock / Delete Fallback Modal */}
      <AnimatePresence>
        {userDeleteErrorModal && userToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-2.5 sm:p-4 z-[70] backdrop-blur-sm font-thai font-bold text-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[86vh]"
            >
              <div className="flex items-center gap-3 text-amber-500">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-955/25 rounded-xl shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-amber-700 dark:text-amber-400 leading-none">ไม่สามารถลบข้อมูลผู้ใช้งานได้</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-none">ระบบควบคุมความปลอดภัย (Foreign Key Restrict)</p>
                </div>
              </div>

              <p className="text-xs font-bold text-slate-550 dark:text-slate-400 leading-relaxed">
                {userDeleteErrorModal}
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    const tempUser = userToDelete;
                    setUserDeleteErrorModal(null);
                    setIsUserDeleteConfirmOpen(false);
                    setUserToDelete(null);
                    await toggleUserActiveStatus(tempUser);
                  }}
                  className="w-full h-11 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-black shadow-lg shadow-green-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} />
                  <span>เปลี่ยนสถานะเป็น Inactive ทันที</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserDeleteErrorModal(null);
                    setIsUserDeleteConfirmOpen(false);
                    setUserToDelete(null);
                  }}
                  className="w-full h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-1000/10 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-xl text-xs font-black transition cursor-pointer"
                >
                  ยกเลิกและปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Dashboard Image Preview Modal */}
      <AnimatePresence>
        {isExportModalOpen && exportedImage && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-2.5 sm:p-4 z-[100] backdrop-blur-sm font-thai font-sans font-bold text-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[640px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-600">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-[#0f2d52] dark:text-white leading-none">
                      Export Dashboard Successful
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">Preview image for shift summary</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer border-none bg-transparent"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content / Preview Image */}
              <div className="p-5 overflow-y-auto flex-1 flex flex-col items-center gap-4 bg-slate-100 dark:bg-slate-950">
                <p className="text-center text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed max-w-sm mt-1">
                  💡 If the image does not start downloading automatically, click the <strong>"Save Image"</strong> button below, or long-press the image (on mobile devices) or right-click and choose "Save image as..." (on computer) to save it directly.
                </p>
                
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white shadow-lg max-w-full">
                  <img 
                    src={exportedImage} 
                    alt="Dashboard Export" 
                    className="max-h-[50vh] object-contain w-auto hover:scale-[1.01] transition-all" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3.5 bg-slate-50/50 dark:bg-slate-850/50">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 transition-all text-xs font-black cursor-pointer bg-transparent"
                >
                  Close
                </button>
                <a
                  href={exportedImage}
                  download={`handover-dashboard-${new Date().toISOString().substring(0, 10)}.png`}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-650/15 transition-all flex items-center gap-1.5 cursor-pointer decoration-transparent"
                >
                  <Download size={14} />
                  <span>Save Image</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </main>
    </div>
  );
}

function MobileNavItem({ icon, label, active, onClick, color }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, color?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all ${
        active ? 'text-brand-blue' : color || 'text-slate-400'
      }`}
    >
      <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform`}>
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
      {active && <motion.div layoutId="activeDot" className="w-1 h-1 rounded-full bg-brand-blue" />}
    </button>
  );
}

function NavItem({ icon, label, active, onClick, badge, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: string, collapsed?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full h-11 flex items-center gap-3 px-3 rounded-xl transition-all font-[900] text-xs relative group ${
        active ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-slate-500 hover:bg-slate-50'
      }`}
    >
      <div className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-brand-blue transition-colors'}`}>
        {icon}
      </div>
      {!collapsed && <span className="flex-1 text-left">{label}</span>}
      {!collapsed && badge && <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${active ? 'bg-white/20 text-white' : 'bg-brand-blue/10 text-brand-blue'}`}>{badge}</span>}
      {collapsed && active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full" />}
    </button>
  );
}

function StatCard({ icon, title, subtitle, trend, trendUp, color }: { icon: React.ReactNode, title: string, subtitle: string, trend: string, trendUp?: boolean, color: string }) {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className={`p-3 rounded-2xl ${colorMap[color]} mb-3 w-fit group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <p className="text-2xl font-[900] text-[#0f2d52] dark:text-white tracking-tight">{title}</p>
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{subtitle}</p>
      <div className="mt-3 flex items-center gap-1.5 pt-3 border-t border-slate-50 dark:border-slate-800/60">
         <span className={`text-[9px] font-black uppercase ${trendUp ? 'text-green-500' : 'text-slate-400 dark:text-slate-500'}`}>
            {trend}
         </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-8 opacity-5 pointer-events-none">
         <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={Array.from({length: 8}).map((_, i) => ({v: Math.random()}))}>
               <Area type="monotone" dataKey="v" stroke="#3b82f6" fill="#3b82f6" strokeWidth={1} />
            </AreaChart>
         </ResponsiveContainer>
      </div>
    </div>
  );
}

function FilterSelect({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black text-[#0f2d52] uppercase tracking-wider hover:bg-slate-100 transition-colors">
       {label}
       <ChevronDown size={14} className="text-slate-400" />
    </button>
  );
}

interface StatusIndicatorProps {
  color: string;
  label: string;
  value: string;
  percent: string;
}

function StatusIndicator({ color, label, value, percent }: StatusIndicatorProps) {
  return (
    <div className="flex items-center justify-between text-[11px] font-bold">
       <div className="flex items-center gap-2">
         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
         <span className="text-slate-500">{label}</span>
       </div>
       <span className="text-[#0f2d52]">{value} <span className="text-slate-300 ml-1">({percent})</span></span>
    </div>
  );
}
