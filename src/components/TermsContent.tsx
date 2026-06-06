import React from 'react';

const sectionStyle = "space-y-4";
const h4Style = "text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2";
const spanStyle = "flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-[#0F2D52] dark:text-slate-300";
const pStyle = "text-xs sm:text-sm text-slate-650 dark:text-slate-350 leading-relaxed text-left";

export default function TermsContent() {
  return (
    <div className="space-y-8 animate-fade-in font-thai px-4 pb-10 text-left">
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">ข้อกำหนดและเงื่อนไขการใช้บริการ (Terms of Service)</h2>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">ระบบสารสนเทศกระดานอัจฉริยะทางห้องปฏิบัติการ (Labsangkha SmartBoard System)</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลสังขะ สังกัดสำนักงานปลัดกระทรวงสาธารณสุข</p>
        <p className="text-xs text-slate-500 dark:text-slate-500">ฉบับที่ ๑ | ประกาศใช้เดือนมิถุนายน พุทธศักราช ๒๕๖๙</p>
        <p className="text-xs text-slate-500 dark:text-slate-500 italic">อ้างอิงตาม: พระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์, พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล, และพระราชบัญญัติลิขสิทธิ์</p>
      </div>

      <div className={pStyle}>
        ข้อกำหนดและเงื่อนไขการใช้บริการฉบับนี้ จัดทำขึ้นเพื่อกำหนดสิทธิ หน้าที่ และความรับผิดชอบของผู้ใช้งานระบบสารสนเทศกระดานอัจฉริยะ การเข้าใช้งานระบบไม่ว่าด้วยวิธีการใด ถือว่าผู้ใช้งานได้อ่าน ทำความเข้าใจ และยอมรับที่จะปฏิบัติตามข้อกำหนดและเงื่อนไขนี้ทุกประการ
      </div>

      <div className={sectionStyle}>
        <h4 className={h4Style}><span className={spanStyle}>๑</span>คำนิยามในข้อกำหนดและเงื่อนไขนี้</h4>
        <ul className="list-decimal pl-10 space-y-2 text-xs sm:text-sm text-slate-650 dark:text-slate-350">
          <li><b>ระบบ:</b> หมายความว่า ระบบสารสนเทศกระดานอัจฉริยะทางห้องปฏิบัติการ (Labsangkha SmartBoard System)</li>
          <li><b>หน่วยงาน:</b> หมายความว่า กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลสังขะ</li>
          <li><b>ผู้ใช้งาน:</b> หมายความว่า บุคคลผู้เข้าถึงหรือใช้งานระบบ ไม่ว่าจะในฐานะผู้เข้าชมทั่วไป เจ้าหน้าที่ห้องปฏิบัติการทางการแพทย์ หรือผู้ดูแลระบบ</li>
          <li><b>รหัสผ่าน:</b> หมายความว่า รหัสยืนยันตัวบุคคลของเจ้าหน้าที่ผู้ปฏิบัติงานซึ่งจัดเก็บในรูปแบบที่เข้ารหัสแล้ว</li>
        </ul>
      </div>

      <div className={sectionStyle}>
        <h4 className={h4Style}><span className={spanStyle}>๒</span>เงื่อนไขการเข้าใช้บริการ</h4>
        <div className={pStyle}>
          ระบบนี้จัดทำขึ้นเพื่อสนับสนุนการปฏิบัติงานราชการของกลุ่มงานเทคนิคการแพทย์ โรงพยาบาลสังขะ ในการบริหารจัดการงานคงค้าง ตรวจสอบความพร้อมเครื่องมือแพทย์ ประสานงานติดตามผลผู้ป่วย และรายงานผลการตรวจวิเคราะห์ทางห้องปฎิบัติการทางการแพทย์เคสส่งต่อ (Refer) ผู้ใช้งานพึงใช้บริการเพื่อวัตถุประสงค์ในการปฏิบัติงานและการให้บริการทางการแพทย์เท่านั้น
        </div>
      </div>

      <div className={sectionStyle}>
        <h4 className={h4Style}><span className={spanStyle}>๓</span>สิทธิการใช้งานจำแนกตามบทบาท</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse border border-slate-200 dark:border-slate-700">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800">
                <th className="border border-slate-200 dark:border-slate-700 p-2">บทบาทการเข้าถึง</th>
                <th className="border border-slate-200 dark:border-slate-700 p-2">สิทธิการใช้งาน</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 dark:border-slate-700 p-2">ผู้เข้าชมทั่วไป (Public)</td>
                <td className="border border-slate-200 dark:border-slate-700 p-2">ไม่ต้องเข้าสู่ระบบ, เรียกดูรายการกระดานอัจฉริยะและบันทึกเวรย้อนหลังแบบ พรางข้อมูลผู้ป่วย</td>
              </tr>
              <tr>
                <td className="border border-slate-200 dark:border-slate-700 p-2">บุคลากร (User)</td>
                <td className="border border-slate-200 dark:border-slate-700 p-2">เข้าสู่ระบบ, ส่งมอบงาน, บันทึกข้อมูล และกดรับมอบงานเวร</td>
              </tr>
              <tr>
                <td className="border border-slate-200 dark:border-slate-700 p-2">ผู้ดูแลระบบ (Admin)</td>
                <td className="border border-slate-200 dark:border-slate-700 p-2">จัดการบัญชีผู้ใช้งาน, ตั้งค่าระบบ, และจัดการเชื่อมต่อ LINE Messaging API</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={sectionStyle}>
        <h4 className={h4Style}><span className={spanStyle}>๔</span>หน้าที่และความรับผิดชอบของผู้ใช้งาน</h4>
        <ul className="list-decimal pl-10 space-y-2 text-xs sm:text-sm text-slate-650 dark:text-slate-350">
          <li>รักษารหัสผ่านไว้เป็นความลับสูงสุด</li>
          <li>บันทึกข้อมูลการปฏิบัติงาน รายงานสิ่งส่งตรวจวิกฤต และรายการงานให้ถูกต้อง ครบถ้วน</li>
          <li>ออกจากระบบทุกครั้งภายหลังการใช้งาน</li>
          <li>รับผิดชอบต่อรายการประมวลผลที่ดำเนินการด้วยรหัสผ่านของตน</li>
          <li>แจ้งผู้ดูแลระบบทันทีเมื่อพบความผิดปกติ</li>
          <li>ปฏิบัติตามนโยบายความมั่นคงปลอดภัยสารสนเทศอย่างเคร่งครัด</li>
        </ul>
      </div>

      <div className={sectionStyle}>
        <h4 className={h4Style}><span className={spanStyle}>๕</span>การประสานงานผ่านระบบ LINE Messaging API</h4>
        <div className={pStyle}>
          ระบบมีการส่งข้อความแจ้งเตือนผ่าน LINE Messaging API ซึ่งการกดดำเนินการรับมอบงานผ่านปุ่มคำสั่งบนแพลตฟอร์มดังกล่าว ถือเป็นการยืนยันตัวตนและรับมอบงานอย่างเป็นทางการ โดยระบบจะบันทึกรหัสเจ้าหน้าที่และเวลาปฏิบัติการไว้เป็นหลักฐาน
        </div>
      </div>

      <div className={sectionStyle}>
        <h4 className={h4Style}><span className={spanStyle}>๖</span>การกระทำอันเป็นข้อห้าม</h4>
        <div className={pStyle}>การฝ่าฝืนเป็นความผิดทางวินัยและอาจเป็นความผิดทางอาญา ตาม พ.ร.บ.คอมพิวเตอร์ และ พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล:</div>
        <ul className="list-disc pl-10 space-y-2 text-xs sm:text-sm text-slate-650 dark:text-slate-350">
          <li>เข้าถึงระบบ/ใช้บัญชีผู้อื่นโดยไม่ได้รับอนุญาต</li>
          <li>นำข้อมูลอ่อนไหวของผู้ป่วยออกจากระบบโดยมิชอบ</li>
          <li>แก้ไข เปลี่ยนแปลง ลบ หรือทำลายข้อมูลการปฏิบัติงานโดยไม่มีสิทธิ</li>
          <li>ทดสอบเจาะระบบ หรือส่งโปรแกรมอัตโนมัติ/สคริปต์ (Crawler) เข้าสู่ระบบ</li>
          <li>บันทึกภาพหน้าจอข้อมูลระบุตัวตนผู้ป่วยไปใช้นอกเหนือวัตถุประสงค์</li>
        </ul>
      </div>

      <div className={sectionStyle}>
        <h4 className={h4Style}><span className={spanStyle}>๗</span>ทรัพย์สินทางปัญญา</h4>
        <div className={pStyle}>เนื้อหาทั้งหมดของระบบเป็นทรัพย์สินของกลุ่มงานเทคนิคการแพทย์ โรงพยาบาลสังขะ ห้ามมิให้ทำซ้ำ ดัดแปลง หรือเผยแพร่โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร</div>
      </div>

      <div className={sectionStyle}>
        <h4 className={h4Style}><span className={spanStyle}>๘</span>การระงับหรือยกเลิกการเข้าใช้งาน</h4>
        <div className={pStyle}>หน่วยงานสงวนสิทธิในการระงับบัญชีผู้ใช้งานทันที ในกรณีที่ผู้ใช้งานพ้นสภาพการเป็นบุคลากร หรือฝ่าฝืนข้อกำหนดนี้</div>
      </div>
      
      <div className={sectionStyle}>
        <h4 className={h4Style}><span className={spanStyle}>๙</span>กฎหมายที่ใช้บังคับ</h4>
        <div className={pStyle}>ข้อกำหนดและเงื่อนไขนี้อยู่ภายใต้บังคับแห่งกฎหมายไทย</div>
      </div>
    </div>
  );
}
