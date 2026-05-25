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
 * Fetch announcements asynchronously.
 * Tries Supabase first, falls back to local storage.
 */
export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase announcements query failed, using local storage fallback:', error.message);
      return getLocalAnnouncements();
    }

    if (data) {
      // Map database schema to App schema
      const mapped = data.map((item: any) => ({
        id: item.id.toString(),
        title: item.title,
        category: item.category || 'general',
        content: item.content || '',
        date: item.date || new Date(item.created_at || Date.now()).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
        author: item.author || 'ระบบ',
        pinned: !!item.pinned,
        created_at: item.created_at
      }));
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
  const isEdit = !!ann.id;
  const newId = ann.id || 'ann-' + Math.random().toString(36).substr(2, 9);
  const now = new Date();
  
  const formattedDate = now.toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  const completeAnn: Announcement = {
    id: newId,
    title: ann.title,
    category: ann.category,
    content: ann.content,
    date: ann.date || formattedDate,
    author: ann.author || 'ผู้ดูแลระบบ',
    pinned: !!ann.pinned,
    created_at: ann.created_at || now.toISOString()
  };

  // 1. Try to sync with Supabase
  try {
    const dbValue = {
      title: completeAnn.title,
      category: completeAnn.category,
      content: completeAnn.content,
      date: completeAnn.date,
      author: completeAnn.author,
      pinned: completeAnn.pinned,
      created_at: completeAnn.created_at,
    };

    if (isEdit) {
      // Check if numeric or string key for ID in database
      const idToUse = isNaN(Number(completeAnn.id)) ? completeAnn.id : Number(completeAnn.id);
      const { error } = await supabase
        .from('announcements')
        .update(dbValue)
        .eq('id', idToUse);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('announcements')
        .insert([dbValue]);
      if (error) throw error;
    }
  } catch (err: any) {
    console.warn('Could not sync announcement with Supabase database:', err.message || err);
  }

  // 2. Always persist details in local storage for instant fallback
  const locals = getLocalAnnouncements();
  let updatedLocals: Announcement[];
  if (isEdit) {
    updatedLocals = locals.map(item => item.id === completeAnn.id ? completeAnn : item);
  } else {
    updatedLocals = [completeAnn, ...locals];
  }

  saveLocalAnnouncements(updatedLocals);
  return completeAnn;
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncement(id: string): Promise<boolean> {
  // 1. Try deleted from Supabase
  try {
    const idToUse = isNaN(Number(id)) ? id : Number(id);
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', idToUse);
    if (error) throw error;
  } catch (err: any) {
    console.warn('Could not sync deletion with Supabase:', err.message || err);
  }

  // 2. Always apply to local storage
  const locals = getLocalAnnouncements();
  const updated = locals.filter(item => item.id !== id);
  saveLocalAnnouncements(updated);
  return true;
}
