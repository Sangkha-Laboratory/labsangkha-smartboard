import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  ArrowLeft, 
  Database, 
  Copy, 
  FileText,
  Globe
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SafetyPolicyProps {
  initialTab?: 'public_privacy' | 'public_terms';
  onClose: () => void;
}

export default function SafetyPolicy({ initialTab = 'public_privacy', onClose }: SafetyPolicyProps) {
  const [activeTab, setActiveTab] = useState<'public_privacy' | 'public_terms'>(
    initialTab === 'public_terms' ? 'public_terms' : 'public_privacy'
  );
  const [copiedText, setCopiedText] = useState<'privacy' | 'terms' | null>(null);
  const [safeRecordsCount, setSafeRecordsCount] = useState(0);
  const [loadingSafetyMetrics, setLoadingSafetyMetrics] = useState(true);

  useEffect(() => {
    if (initialTab === 'public_terms') {
      setActiveTab('public_terms');
    } else {
      setActiveTab('public_privacy');
    }
  }, [initialTab]);

  useEffect(() => {
    async function fetchSafetyMetrics() {
      try {
        setLoadingSafetyMetrics(true);
        const { count, error } = await supabase
          .from('handovers')
          .select('*', { count: 'exact', head: true });
        
        if (!error && count !== null) {
          setSafeRecordsCount(count);
        }
      } catch (err) {
        console.error('Error fetching safety metrics:', err);
      } finally {
        setLoadingSafetyMetrics(false);
      }
    }
    fetchSafetyMetrics();
  }, []);

  const copyToClipboard = (type: 'privacy' | 'terms', text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const docPrivacyNotice = `ประกาศนโยบายคุ้มครองข้อมูลส่วนบุคคล (Privacy Notice) ฉบับสาธารณชน
กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลสังขะ
สำนักงานปลัดกระทรวงสาธารณสุข กระทรวงสาธารณสุข

ประกาศฉบับนี้จัดทำขึ้นเพื่อชี้แจงรายละเอียดเกี่ยวกับการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล (PDPA) สำหรับผู้ใช้บริการและผู้เข้าถึงระบบสารสนเทศประสานงานและส่งมอบเวรทางห้องปฏิบัติการ (Labsangkha Handover System)

1. ข้อมูลส่วนบุคคลที่จัดเก็บเพื่อการทำงานของห้องปฏิบัติการ
เพื่อประโยชน์ในการประสานงานเวรทางการแพทย์และป้องกันความคลาดเคลื่อนในการส่งต่อการรักษา ระบบมีการบันทึกและรวบรวมข้อมูล ได้แก่ รหัสประจำตัวผู้ป่วยภายในโรงพยาบาล (HN), รหัสตัวเลขสิ่งส่งตรวจวิเคราะห์ (LN), ประเภทรายการสิ่งส่งตรวจตรวจวิเคราะห์, ข้อความบันทึกสิ่งส่งตรวจวิกฤต, และรายนามเจ้าหน้าที่ผู้ปฏิบัติหน้าที่ประจำเวร

2. วัตถุประสงค์และฐานทางกฎหมายในการประมวลผลข้อมูล
ระบบขับเคลื่อนการประมวลผลข้อมูลเพื่อวัตถุประสงค์ในการวินิจฉัย การเฝ้าระวังสิ่งส่งตรวจวิกฤต และประสานงานส่งต่อผู้ป่วยระหว่างกะ/เวรอย่างมีความปลอดภัยและถูกต้องแม่นยำ โดยพึงอยู่ภายใต้ฐานทางกฎหมายดังนี้:
- ฐานความจำเป็นในการป้องกันหรือระงับอันตรายต่อชีวิต ร่างกาย หรือสุขภาพของบุคคล (Vital Interest) ตามมาตรา 26 (5)(ก) แห่ง พรบ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
- ฐานความจำเป็นเพื่อการปฏิบัติหน้าที่ในการดำเนินภารกิจเพื่อประโยชน์สาธารณะของผู้ควบคุมข้อมูลส่วนบุคคล (Public Task) ตามมาตรา 26 (5)(ข) พรบ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562

3. มาตรการจำกัดการแสดงผลแบบพรางตัวตนอัตโนมัติ (Data Masking)
กลุ่มงานเทคนิคการแพทย์ ถือปฏิบัติมาตรการคุ้มครองความเป็นส่วนตัวขั้นสูง โดยใช้ระบบพรางรหัสข้อมูลผู้ป่วยอัตโนมัติก่อนแสดงผลสู่ภายนอก ดังนี้:
- พรางตัวเลข HN และ ชื่อ-นามสกุล บนรายงานหน้าเว็บสาธารณะและในระบบสรุปสถิติทั่วไป
- พรางรหัสและซ่อนข้อมูลละเอียดของผู้รับบริการทุกรายในการแจ้งเตือนแบบย่อผ่านข้อความ LINE Notify หรือกลุ่มประสานภายนอก เพื่อรับประกันว่าจะไม่มีการเผยแพร่ความลับผู้ป่วยเด็ดขาด

4. ระยะเวลาการเก็บรักษาข้อมูลทางการแพทย์
- ข้อมูลสิ่งส่งตรวจวิกฤตและรหัสผู้ป่วย (HN/LN) จะถูกจัดเก็บสำรองในฐานข้อมูลที่ปลอดภัยเป็นระยะเวลาไม่เกิน 10 ปี เพื่อความต่อเนื่องทางการดูแลรักษาโรคตามระเบียบกระทรวงสาธารณสุข
- ข้อมูลสรุปรอบเวลาตรวจสอบเวรจะถูกเก็บรักษาไว้เป็นเวลาอย่างน้อย 3 ปี เพื่อประโยชน์รอบกระบวนการตรวจสอบคุณภาพและการรับรองมาตรฐานวิชาชีพเทคนิคการแพทย์ (LA/ISO 15189)

5. สิทธิ์ตามกฎหมายของเจ้าของข้อมูล (Data Subject Rights)
ผู้รับบริการและเจ้าของข้อมูลส่วนบุคคลพึงรักษาไว้ซึ่งสิทธิ์ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 รวมถึงสิทธิ์ในการขอนำเข้าสำเนา ตรวจสอบ ขอแก้ไขข้อมูลที่คลาดเคลื่อน และยื่นขอระงับใช้อันอาจนำมาซึ่งการละเมิดความเป็นส่วนตัว โดยสามารถประสานแจ้งความประสงค์อย่างเป็นทางการต่อผู้ควบคุมข้อมูลและเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลของกลุ่มงานได้และจะดำเนินการตรวจสอบใน 30 วันทำการ`;

  const docTermsOfService = `# ข้อกำหนดและเงื่อนไขการใช้บริการ (Terms of Service)
**ระบบสารสนเทศประสานการส่งมอบเวรทางห้องปฏิบัติการ (Labsangkha Handover System)**
กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลสังขะ
สังกัดสำนักงานปลัดกระทรวงสาธารณสุข กระทรวงสาธารณสุข

> ฉบับที่ 1.0 | ประกาศใช้เดือนมิถุนายน พุทธศักราช 2568
> อ้างอิงตาม: พระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550 และที่แก้ไขเพิ่มเติม พ.ศ. 2560 · พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 · พระราชบัญญัติลิขสิทธิ์ พ.ศ. 2537

---

ข้อกำหนดและเงื่อนไขการใช้บริการฉบับนี้ จัดทำขึ้นเพื่อกำหนดสิทธิ หน้าที่ และความรับผิดชอบของผู้ใช้งานระบบสารสนเทศประสานการส่งมอบเวรทางห้องปฏิบัติการ การเข้าใช้งานระบบไม่ว่าด้วยวิธีการใด ถือว่าผู้ใช้งานได้อ่าน ทำความเข้าใจ และยอมรับที่จะปฏิบัติตามข้อกำหนดและเงื่อนไขนี้ทุกประการ

---

## 1. คำนิยาม

ในข้อกำหนดและเงื่อนไขนี้

1. **"ระบบ"** หมายความว่า ระบบสารสนเทศประสานการส่งมอบเวรทางห้องปฏิบัติการ (Labsangkha Handover System)
2. **"หน่วยงาน"** หมายความว่า กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลสังขะ
3. **"ผู้ใช้งาน"** หมายความว่า บุคคลผู้เข้าถึงหรือใช้งานระบบ ไม่ว่าจะในฐานะผู้เข้าชมทั่วไป บุคลากร หรือผู้ดูแลระบบ
4. **"รหัส PIN"** หมายความว่า รหัสยืนยันตัวบุคคลของผู้ส่งเวรซึ่งจัดเก็บในรูปแบบที่เข้ารหัสแล้ว

---

## 2. เงื่อนไขการเข้าใช้บริการ

ระบบนี้จัดทำขึ้นเพื่อสนับสนุนการปฏิบัติงานราชการของกลุ่มงานเทคนิคการแพทย์ โรงพยาบาลสังขะ แม้ระบบจะเปิดให้เข้าถึงผ่านเครือข่ายอินเทอร์เน็ตสาธารณะ ผู้ใช้งานพึงใช้บริการเพื่อวัตถุประสงค์ในการปฏิบัติงานและการให้บริการทางการแพทย์เท่านั้น

---

## 3. สิทธิการใช้งานจำแนกตามบทบาท

| บทบาท | การเข้าถึง | สิทธิการใช้งาน |
|---|---|---|
| ผู้เข้าชมทั่วไป (Public) | ไม่ต้องเข้าสู่ระบบ | เรียกดูรายการส่งมอบเวรย้อนหลัง 3 วัน และส่งเวรโดยยืนยันด้วยรหัส PIN |
| บุคลากร (User) | เข้าสู่ระบบด้วยบัญชีและรหัส PIN | เรียกดูประวัติการส่งมอบงานของตน และรับมอบงานเวร |
| ผู้ดูแลระบบ (Admin) | เข้าสู่ระบบผ่านช่องทางเฉพาะ | จัดการบัญชีผู้ใช้งาน จัดการรายการส่งมอบเวรทั้งหมด ตั้งค่าระบบ และการเชื่อมต่อ LINE |

---

## 4. หน้าที่และความรับผิดชอบของผู้ใช้งาน

ผู้ใช้งานมีหน้าที่และความรับผิดชอบ ดังต่อไปนี้

1. รักษารหัสผ่านและรหัส PIN ไว้เป็นความลับ และไม่เปิดเผยแก่บุคคลอื่นไม่ว่ากรณีใด
2. บันทึกข้อมูลการส่งมอบเวรและรายการงานให้ถูกต้อง ครบถ้วน และตรงตามความเป็นจริง เนื่องจากข้อมูลที่คลาดเคลื่อนอาจส่งผลกระทบต่อความปลอดภัยของผู้ป่วย
3. ออกจากระบบทุกครั้งภายหลังการใช้งานบนอุปกรณ์ที่ใช้งานร่วมกับผู้อื่น
4. รับผิดชอบต่อรายการส่งมอบเวรทั้งหมดที่ดำเนินการด้วยรหัส PIN ของตน
5. แจ้งต่อผู้ดูแลระบบโดยทันที เมื่อพบความผิดปกติหรือสงสัยว่ารหัสผ่านหรือรหัส PIN ถูกนำไปใช้โดยไม่ได้รับอนุญาต
6. ปฏิบัติตามนโยบายคุ้มครองข้อมูลส่วนบุคคลและนโยบายความมั่นคงปลอดภัยสารสนเทศของโรงพยาบาล

---

## 5. การรับมอบงานผ่านแอปพลิเคชัน LINE

ระบบมีการส่งข้อความแจ้งเตือนในรูปแบบ Flex Message ไปยังกลุ่ม LINE ที่กำหนด ซึ่งผู้ใช้งานสามารถดำเนินการรับมอบงานผ่านปุ่มดำเนินการ การกดรับมอบงานดังกล่าวถือเป็นการยืนยันการรับมอบงานอย่างเป็นทางการ และระบบจะบันทึกไว้เป็นหลักฐานการรับมอบงาน ผู้ใช้งานพึงตรวจสอบรายละเอียดของงานทุกครั้งก่อนกดรับ เนื่องจากอาจเกี่ยวข้องกับความปลอดภัยของผู้ป่วย

---

## 6. การกระทำอันเป็นข้อห้าม

ห้ามมิให้ผู้ใช้งานกระทำการอย่างหนึ่งอย่างใด ดังต่อไปนี้ การฝ่าฝืนถือเป็นความผิดทางวินัย และอาจเป็นความผิดทางอาญาตามพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550 และที่แก้ไขเพิ่มเติม และ/หรือพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562

1. เข้าถึงระบบโดยไม่ได้รับอนุญาต หรือใช้รหัส PIN หรือรหัสผ่านของผู้อื่น (มาตรา 5 และมาตรา 7 แห่งพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์)
2. นำข้อมูลสุขภาพของผู้ป่วยออกจากระบบ หรือเปิดเผยต่อบุคคลผู้ไม่มีสิทธิ (มาตรา 79 แห่งพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล)
3. แก้ไข เปลี่ยนแปลง ลบ หรือทำลายข้อมูลโดยไม่มีสิทธิ (มาตรา 9 แห่งพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์)
4. ดักรับข้อมูลที่อยู่ระหว่างการรับส่งภายในระบบ (มาตรา 8 แห่งพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์)
5. ทดสอบเจาะระบบหรือโจมตีระบบโดยมิได้รับอนุญาตเป็นลายลักษณ์อักษร
6. ส่งโปรแกรมอัตโนมัติ สคริปต์ หรือโปรแกรมเก็บข้อมูล (Crawler) เข้าสู่ระบบ
7. ใช้บัญชีผู้ใช้งานหรือรหัส PIN ร่วมกับบุคคลอื่น
8. บันทึกภาพหน้าจอหรือนำข้อมูลของผู้ป่วยไปใช้นอกเหนือจากวัตถุประสงค์ด้านการรักษาพยาบาล

---

## 7. ทรัพย์สินทางปัญญา

ซอฟต์แวร์ รหัสโปรแกรม การออกแบบส่วนติดต่อผู้ใช้ และเนื้อหาทั้งหมดของระบบ เป็นทรัพย์สินของกลุ่มงานเทคนิคการแพทย์ โรงพยาบาลสังขะ ซึ่งได้รับความคุ้มครองตามพระราชบัญญัติลิขสิทธิ์ พ.ศ. 2537 ห้ามมิให้ทำซ้ำ ดัดแปลง หรือเผยแพร่โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร

---

## 8. ข้อจำกัดความรับผิด

หน่วยงานจะไม่รับผิดชอบต่อความเสียหายอันเกิดจากกรณีดังต่อไปนี้

1. การหยุดชะงักของระบบอันเนื่องมาจากการบำรุงรักษา หรือเหตุสุดวิสัย
2. การเข้าถึงระบบโดยไม่ได้รับอนุญาตซึ่งเป็นผลจากความประมาทเลินเล่อของผู้ใช้งาน
3. ความสูญหายของข้อมูลอันเนื่องมาจากความผิดพลาดในการใช้งานของผู้ใช้งาน

---

## 9. การระงับหรือยกเลิกการเข้าใช้งาน

หน่วยงานสงวนสิทธิในการระงับหรือยกเลิกบัญชีผู้ใช้งานโดยไม่จำต้องแจ้งให้ทราบล่วงหน้า ในกรณีที่ผู้ใช้งานพ้นสภาพการเป็นบุคลากรของหน่วยงาน ฝ่าฝืนข้อกำหนดและเงื่อนไขนี้ หรือตรวจพบพฤติการณ์อันเป็นภัยต่อความมั่นคงปลอดภัยของระบบหรือข้อมูลของผู้ป่วย

---

## 10. การแก้ไขเปลี่ยนแปลงข้อกำหนด

หน่วยงานอาจปรับปรุงแก้ไขข้อกำหนดและเงื่อนไขนี้เป็นครั้งคราว โดยจะแจ้งให้ผู้ใช้งานทราบผ่านระบบล่วงหน้าไม่น้อยกว่า 15 วันก่อนวันที่มีผลใช้บังคับ การใช้งานระบบต่อไปภายหลังวันที่มีผลใช้บังคับ ถือว่าผู้ใช้งานยอมรับข้อกำหนดที่ปรับปรุงแก้ไขแล้ว

---

## 11. กฎหมายที่ใช้บังคับ

ข้อกำหนดและเงื่อนไขนี้อยู่ภายใต้บังคับแห่งกฎหมายไทย ข้อพิพาทใด ๆ ที่เกิดขึ้นให้อยู่ในเขตอำนาจของศาลไทยที่มีเขตอำนาจ

---

*ประกาศ ณ เดือนมิถุนายน พุทธศักราช 2568*
*กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลสังขะ สังกัดสำนักงานปลัดกระทรวงสาธารณสุข กระทรวงสาธารณสุข*`;

  return (
    <div className="bg-[#fcfdfe] dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen py-10 px-4 md:px-12 max-w-6xl mx-auto space-y-8 font-sans">
      
      {/* Header - Formal, Clean Institutional Design (No colorful gradients, no fluffy icons) */}
      <div className="border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative shadow-sm border-t-4 border-[#0F2D52] dark:border-t-slate-400">
        <div className="flex items-start gap-4">
          <button 
            type="button"
            onClick={onClose}
            className="w-10 h-10 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 hover:dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded flex items-center justify-center border border-slate-300 dark:border-slate-750 transition cursor-pointer"
            title="ย้อนกลับหน้าหลัก"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-650 dark:text-slate-400 font-bold uppercase tracking-wider">
              กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลสังขะ สำนักงานปลัดกระทรวงสาธารณสุข
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-[#0F2D52] dark:text-slate-150 tracking-tight font-thai leading-snug">
              นโยบายการคุ้มครองข้อมูลส่วนบุคคลและข้อกำหนดการใช้บริการ
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-450 font-normal font-thai leading-relaxed">
              สอดคล้องตามเกณฑ์มาตรฐานกฎหมายคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (PDPA) และมาตรฐานการรับรองคุณภาพห้องปฏิบัติการทางการแพทย์ (LA / ISO 15189)
            </p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full md:w-auto h-10 px-6 bg-[#0F2D52] hover:bg-[#183d65] dark:bg-slate-800 dark:hover:bg-slate-755 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-[#0F2D52] dark:border-transparent"
        >
          <CheckCircle size={14} />
          <span>ปิดหน้านโยบาย</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Navigation Sidebar (Vertical, Formal Institutional Menu) */}
        <div className="lg:col-span-1 space-y-4">
          
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 border-b border-slate-200 dark:border-slate-800 pb-1.5 font-thai">
              หน้าเว็บ (สาธารณะ)
            </h3>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('public_privacy')}
                className={`w-full text-left px-3 py-2.5 rounded text-xs font-bold font-thai transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'public_privacy' 
                    ? 'bg-slate-200 dark:bg-slate-800 text-[#0F2D52] dark:text-white font-extrabold border-l-2 border-[#0F2D52] dark:border-slate-400' 
                    : 'text-slate-650 dark:text-slate-450 hover:bg-slate-100 hover:dark:bg-slate-850'
                }`}
              >
                <Globe size={13} className="shrink-0 text-slate-500" />
                <span>ประกาศความเป็นส่วนตัว</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('public_terms')}
                className={`w-full text-left px-3 py-2.5 rounded text-xs font-bold font-thai transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'public_terms' 
                    ? 'bg-slate-200 dark:bg-slate-800 text-[#0F2D52] dark:text-white font-extrabold border-l-2 border-[#0F2D52] dark:border-slate-400' 
                    : 'text-slate-650 dark:text-slate-450 hover:bg-slate-100 hover:dark:bg-slate-850'
                }`}
              >
                <FileText size={13} className="shrink-0 text-slate-500" />
                <span>ข้อกำหนดการใช้บริการ</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Infobox (Minimalized and elegant) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2 text-xs text-slate-600 dark:text-slate-400 font-thai">
            <h4 className="font-bold text-[#0F2D52] dark:text-slate-300 flex items-center gap-1">
              <Database size={13} />
              <span>การคุ้มครองตามเวลาจริง</span>
            </h4>
            <p className="text-[11px] leading-relaxed">
              เซิร์ฟเวอร์สำรองฐานข้อมูลใช้โครงสร้างกระจายความปลอดภัยในพื้นที่ภูมิภาคโอเชียเนียที่ได้มาตรฐานสูง
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <span>ฐานข้อมูลผู้รับเวร:</span>
              <span>{loadingSafetyMetrics ? 'ตรวจสอบ...' : `${safeRecordsCount} เรคคอร์ด`}</span>
            </div>
          </div>

        </div>

        {/* Document Render Area (Lg: col-span-3, Minimal Page styled like elegant physical paper) */}
        <div className="lg:col-span-3">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-6 sm:p-10 space-y-6 shadow-sm min-h-[500px]">
            
            {activeTab === 'public_privacy' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-650 dark:text-slate-450 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      เอกสารสำหรับเผยแพร่ต่อผู้รับบริการ
                    </span>
                    <h3 className="text-lg font-bold text-[#0F2D52] dark:text-white font-thai leading-tight">
                      ประกาศความเป็นส่วนตัว (Privacy Notice)
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard('privacy', docPrivacyNotice)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 hover:dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700"
                  >
                    <Copy size={12} />
                    <span>{copiedText === 'privacy' ? 'คัดลอกร่างกฎหมายสำเร็จ' : 'คัดลอกเนื้อหา'}</span>
                  </button>
                </div>

                {/* Main Text Content */}
                <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed font-thai font-normal space-y-4 whitespace-pre-line text-justify animate-fade-in">
                  {docPrivacyNotice}
                </div>
              </div>
            )}

            {activeTab === 'public_terms' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-650 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      ข้อกำหนดการทำงานและวินัยคอมพิวเตอร์
                    </span>
                    <h3 className="text-lg font-bold text-[#0F2D52] dark:text-white font-thai leading-tight">
                      ข้อกำหนดการใช้บริการระบบสารสนเทศ (Terms of Service)
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard('terms', docTermsOfService)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 hover:dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700"
                  >
                    <Copy size={12} />
                    <span>{copiedText === 'terms' ? 'คัดลอกเงื่อนไขสำเร็จ' : 'คัดลอกเนื้อหา'}</span>
                  </button>
                </div>

                {/* Main Text Content */}
                <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed font-thai font-normal space-y-4 whitespace-pre-line text-justify animate-fade-in">
                  {docTermsOfService}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
