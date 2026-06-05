import { supabase } from './supabase';

export interface Announcement {
  id: string;
  title: string;
  category: 'critical' | 'important' | 'general';
  content: string;
  date: string;
  author: string;
  pinned: boolean;
  created_at?: string;
}

const PRESET_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'ประกาศปรับปรุงเกณฑ์รายงานค่าวิกฤต (Critical Value) ปี 2569',
    category: 'critical',
    content: 'เรียน เจ้าหน้าที่กลุ่มงานเทคนิคการแพทย์ทุกท่าน ทางคณะกรรมการปรับปรุงเกณฑ์มาตรฐานงานห้องปฏิบัติการ ได้มีการเสนอปรับเกณฑ์รายงานค่าวิกฤต (Critical Value) สำหรับกลุ่มงานตรวจวิเคราะห์ทั่วไป (Central Lab) เช่น ค่า Potassium, Hemoglobin และ Platelet Count โดยจะมีรายงานเกณฑ์ละเอียดแจ้งตามบอร์ดหลักและเริ่มปฏิบัติตามมาตรฐานใหม่ในวันที่ 1 มิถุนายน 2569 นี้เป็นต้นไป ขอความกรุณาทุกท่านทวนสอบข้อมูลเวรก่อนการส่งต่ออย่างละเอียด',
    date: '18 พ.ค. 2569',
    author: 'หัวหน้ากลุ่มงานเทคนิคการแพทย์',
    pinned: true,
    created_at: new Date('2026-05-18T08:00:00Z').toISOString()
  },
  {
    id: 'ann-2',
    title: 'ความสำคัญของช่องข้อมูลงานค้างคงค้าง (Pending Cases) เพื่อความปลอดภัยของผู้ป่วย',
    category: 'important',
    content: 'ขอเน้นย้ำถึงเจ้าหน้าที่ทุกคนที่รับและส่งปฏิบัติงานในเวรเช้า บ่าย และดึก กรุณากรอกรายละเอียดของสิ่งส่งตรวจที่ล่าช้า ค้างส่ง หรือเคสสำคัญที่ต้องประสานงานต่อในหน้าฟอร์มส่งเวรอย่างละเอียด หากไม่มีความคืบหน้าแจ้งให้ลงบันทึก "ปกติ" พร้อมรายละเอียด เพื่อหลีกเลี่ยงข้อผิดพลาดทางอายุรกรรมและป้องกันปัญหาผลตรวจล่าช้า',
    date: '15 พ.ค. 2569',
    author: 'งานคุณภาพทางห้องปฏิบัติการ',
    pinned: true,
    created_at: new Date('2026-05-15T09:00:00Z').toISOString()
  },
  {
    id: 'ann-3',
    title: 'เพิ่มช่องทางระบุเลขเอกสารและจัดส่งตัวอย่างสิ่งส่งตรวจเคสเร่งด่วนภายนอก',
    category: 'general',
    content: 'ระบบส่งเวรแบบใหม่สำหรับสิ่งส่งตรวจพิเศษที่ต้องส่งวิเคราะห์ต่อยังห้องปฏิบัติการภายนอก (Reference Lab) บัดนี้รองรับการอ้างอิงเลขตั๋วหรือรหัสดำเนินงานแล้วในหมวดหมู่การส่งมอบงาน เจ้าหน้าที่ที่สนใจวิธีการใช้สามารถปรึกษาที่เจ้าหน้าที่ประสานงานระบบสารสนเทศได้ตลอดเวลา',
    date: '10 พ.ค. 2569',
    author: 'งานบริการลูกค้าและประสานงาน',
    pinned: false,
    created_at: new Date('2026-05-10T11:00:00Z').toISOString()
  }
];

const LOCAL_STORAGE_KEY = 'sangkha_handover_announcements';

// Helper to load fallback local announcements
function getLocalAnnouncements(): Announcement[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading announcements from local storage:', e);
  }
  // Initialize local storage with presets if empty
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(PRESET_ANNOUNCEMENTS));
  return PRESET_ANNOUNCEMENTS;
}

// Helper to save to local storage
function saveLocalAnnouncements(list: Announcement[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving announcements to local storage:', e);
  }
}

/**
 * Check if a string is a valid UUID
 */
const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/**
 * Parses a database announcement row into our rich Announcement type,
 * handling both serialized JSON content and plain text seamlessly.
 */
function parseAnnouncementRow(item: any): Announcement {
  // If the database has proper individual columns (ideal state after running SQL)
  if (item.title !== undefined && item.title !== null) {
    return {
      id: item.id.toString(),
      title: item.title,
      category: item.category || 'general',
      content: item.content || '',
      date: item.date || new Date(item.created_at || Date.now()).toLocaleDateString('th-TH', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      }),
      author: item.author || 'ระบบ',
      pinned: !!item.pinned,
      created_at: item.created_at
    };
  }

  // Graceful fallback for old serialized JSON records stored in 'content' column
  let parsedContent = {
    title: 'ประกาศ',
    category: 'general' as const,
    content: item.content || '',
    date: '',
    author: 'ระบบ',
    pinned: false
  };

  const rawContent = (item.content || '').trim();

  if (rawContent.startsWith('{') && rawContent.endsWith('}')) {
    try {
      const parsed = JSON.parse(rawContent);
      parsedContent = {
        title: parsed.title || 'ประกาศ',
        category: parsed.category || 'general',
        content: parsed.content || '',
        date: parsed.date || '',
        author: parsed.author || 'ระบบ',
        pinned: !!parsed.pinned
      };
    } catch (e) {
      // Parsing failed, fallback to plain text treatment below
    }
  }

  // Fallback for plain text or if parsing failed
  if (!parsedContent.content) {
    const lines = rawContent.split('\n').filter((l: string) => l.trim().length > 0);
    const firstLine = lines[0] || 'ประกาศแจ้งเตือนกลุ่มงาน';
    parsedContent.title = firstLine.substring(0, 60) + (firstLine.length > 60 ? '...' : '');
    parsedContent.content = rawContent;
  }

  // Construct formatted date
  const thDate = new Date(item.created_at || Date.now()).toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  return {
    id: item.id.toString(),
    title: parsedContent.title,
    category: parsedContent.category,
    content: parsedContent.content,
    date: parsedContent.date || thDate,
    author: parsedContent.author,
    pinned: parsedContent.pinned,
    created_at: item.created_at
  };
}

/**
 * Fetch announcements asynchronously.
 * Tries Supabase first, falls back to local storage.
 */
export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase announcements query failed, using local storage fallback:', error.message);
      return getLocalAnnouncements();
    }

    if (data) {
      // Map database schema to App schema & filter out deactivated rows
      const activeRows = data.filter((item: any) => item.is_active !== false);
      const mapped = activeRows.map(parseAnnouncementRow);

      // Sort with pinned announcements taking absolute priority at the top, sorted by created_at desc
      mapped.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      saveLocalAnnouncements(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase network error in announcements, using local storage:', err);
  }

  return getLocalAnnouncements();
}

/**
 * Save / Create / Edit an announcement
 */
export async function saveAnnouncement(ann: Omit<Announcement, 'id'> & { id?: string }): Promise<Announcement> {
  const isEdit = !!ann.id && isUUID(ann.id);
  const now = new Date();
  
  const formattedDate = now.toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  const completeAnn: Announcement = {
    id: ann.id || 'ann-' + Math.random().toString(36).substr(2, 9),
    title: ann.title,
    category: ann.category,
    content: ann.content,
    date: ann.date || formattedDate,
    author: ann.author || 'ผู้ดูแลระบบ',
    pinned: !!ann.pinned,
    created_at: ann.created_at || now.toISOString()
  };

  // Get author_id from local storage if available
  let authorId: string | null = null;
  try {
    const localUserStr = localStorage.getItem('sangkha_handover_local_user');
    if (localUserStr) {
      const localUser = JSON.parse(localUserStr);
      if (localUser && localUser.id && isUUID(localUser.id)) {
        authorId = localUser.id;
      }
    }
  } catch (e) {
    console.warn('Error reading local user for author_id:', e);
  }

  const dbValue: any = {
    title: completeAnn.title,
    category: completeAnn.category,
    content: completeAnn.content,
    date: completeAnn.date,
    author: completeAnn.author,
    pinned: completeAnn.pinned,
    is_active: true,
    updated_at: now.toISOString()
  };

  if (authorId) {
    dbValue.author_id = authorId;
  }

  // 1. Try to sync with Supabase
  try {
    if (isEdit) {
      const { error } = await supabase
        .from('announcements')
        .update(dbValue)
        .eq('id', completeAnn.id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('announcements')
        .insert([dbValue])
        .select();

      if (error) throw error;
      if (data && data[0]) {
        completeAnn.id = data[0].id.toString();
        completeAnn.created_at = data[0].created_at;
      }
    }
  } catch (err: any) {
    console.warn('Could not sync announcement with Supabase database:', err.message || err);
  }

  // 2. Always persist details in local storage for instant fallback
  const locals = getLocalAnnouncements();
  let updatedLocals: Announcement[];
  
  const targetId = isEdit ? completeAnn.id : ann.id;
  const exists = locals.some(item => item.id === targetId);

  if (exists) {
    updatedLocals = locals.map(item => item.id === targetId ? completeAnn : item);
  } else {
    const customFiltered = locals.filter(item => item.id !== ann.id);
    updatedLocals = [completeAnn, ...customFiltered];
  }

  saveLocalAnnouncements(updatedLocals);
  return completeAnn;
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncement(id: string): Promise<boolean> {
  // 1. Try deleting from Supabase
  if (isUUID(id)) {
    try {
      const { error: delError } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
        
      if (delError) {
        // If hard delete gets rejected/fails, fall back to soft-deactivating
        await supabase
          .from('announcements')
          .update({ is_active: false })
          .eq('id', id);
      }
    } catch (err: any) {
      console.warn('Could not sync deletion with Supabase:', err.message || err);
    }
  }

  // 2. Always apply to local storage
  const locals = getLocalAnnouncements();
  const updated = locals.filter(item => item.id !== id);
  saveLocalAnnouncements(updated);
  return true;
}

/**
 * Subscribe to real-time changes to the announcements table
 */
export function subscribeToAnnouncements(onUpdate: (list: Announcement[]) => void) {
  // Use schema: 'handover_sys' to match the custom schema configured in our supabase client
  const channel = supabase
    .channel('realtime_announcements')
    .on(
      'postgres_changes',
      { event: '*', schema: 'handover_sys', table: 'announcements' },
      async () => {
        console.log('📢 Realtime: Announcement change detected! Fetching latest...');
        const updatedList = await getAnnouncements();
        onUpdate(updatedList);
      }
    )
    .subscribe((status) => {
      console.log(`📢 Realtime: Announcement subscription status: ${status}`);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

