# Labsangkha Smartboard 🏥📊
### ระบบบอร์ดอัจฉริยะสำหรับการส่งเวรและประสานงานห้องปฏิบัติการ (Sangkha Laboratory Shift Handover System)

ระบบรายงาน ข้อมูล และการส่งเวรอัจฉริยะ (Smartboard) สำหรับเจ้าหน้าที่และบุคลากรสังขะห้องปฏิบัติการ (Sangkha Laboratory) เชื่อมต่อระบบฐานข้อมูลกลางและแจ้งเตือนผ่านช่องทาง LINE ทันทีเมื่อมีการส่งเวรหรือข่าวสารสำคัญ

---

## 🌟 คุณสมบัติหลักของระบบ (Key Features)

*   **Portal สำหรับผู้ใช้งานทั่วไป (User Portal)**:
    *   ระบบลงทะเบียนเข้าเวรและส่งมอบงานการปฏิบัติการ (Handover Form)
    *   ดูประวัติการส่งเวรย้อนหลังของตนเองและบุคลากรในทีม
    *   แถบประกาศข่าวด่วนและมาตรการความปลอดภัยแบบเรียลไทม์
*   **ระบบจัดการสำหรับผู้ดูแล (Admin Portal)**:
    *   หน้าควบคุมกลาง (Dashboard) แสดงสถานะและแนวโน้มการส่งเวร
    *   จัดการและแจ้งลบโพสต์/รายงานกรณีเขียนข้อมูลผิดพลาด
    *   จัดการข้อมูลสมาชิกและผู้มีสิทธิ์ใช้งานในระบบ
    *   ระบุประกาศ (Announcements) ของห้องปฏิบัติการเพื่อเผยแพร่บนหน้าบอร์ด
*   **การเชื่อมต่อ LINE Messaging API (Direct LINE Integration)**:
    *   มี Supabase Edge Functions รับ Webhook จาก LINE
    *   แจ้งเตือนข้อมูลการส่งเวรใหม่และประกาศด่วนตรงเข้ากลุ่มเจ้าหน้าที่ทันทีแบบเรียลไทม์

---

## 🛠️ เทคโนโลยีที่เลือกใช้ (Tech Stack)

*   **Frontend**: React (Vite) + Typescript + Tailwind CSS (สำหรับการจัดแต่งหน้าจอที่ทันสมัยและตอบสนองได้ดีเยี่ยมบน Smartboard)
*   **Backend & Database**: [Supabase](https://supabase.com/) (Database, Authentication & Edge Functions แทนการใช้งานผ่าน Third-party ดั้งเดิม)
*   **Notification Engine**: LINE Messaging Webhook (แจ้งเตือนสถานะต่างๆ ภายในองค์กร)

---

## 🚀 การจัดการและรันระบบเบื้องต้น (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. กำหนดค่า Environment Variables สำหรับฝั่ง Client
สร้างไฟล์ `.env` ที่โฟลเดอร์หลัก และกำหนดค่าเชื่อมต่อของ Supabase:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. รันระบบในโหมดพัฒนา (Local Development)
```bash
npm run dev
```

### 4. การจัดการ Supabase Database & Edge Functions
สคริปต์สำหรับการ Deploy ฟังก์ชันรับส่งข้อความไลน์ (LINE Webhook) และบันทึกข้อมูลอยู่ภายใต้โฟลเดอร์ `/supabase`

---

*พัฒนาและดูแลโดยห้องปฏิบัติการโรงพยาบาลสังขะ (Sangkha Laboratory)*
