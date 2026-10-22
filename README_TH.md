# BCVENT — ชุดเริ่มต้นสร้างโซเชียลเน็ตเวิร์ก

ชุดนี้เป็น **starter project** สำหรับทำ BCVENT ด้วย React + TypeScript + Vite, Supabase และ GitHub โดยแก้ไฟล์จากเบราว์เซอร์ได้ ไม่จำเป็นต้องติดตั้งโปรแกรมเขียนโค้ดในคอมพิวเตอร์

## สิ่งที่ทำได้แล้วในชุดเริ่มต้น

- เปิดหน้าแอปตัวอย่างได้แม้ยังไม่เชื่อม Supabase (โพสต์/ไลก์/รีโพสต์/บันทึกในโหมดตัวอย่างจะอยู่ในหน่วยความจำชั่วคราวเท่านั้น)
- หน้าตา Responsive สำหรับจอคอมและมือถือ และ PWA manifest/ไอคอนดอกไม้สีขาว 4 กลีบ
- สมัครและเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน, ปุ่ม OAuth สำหรับ Google และ Facebook (ต้องตั้งค่าผู้ให้บริการใน Supabase ก่อน)
- ฟีด “สำหรับคุณ” ที่สุ่มเรียงโพสต์ที่โหลดมาใหม่, ฟีด “กำลังติดตาม” เมื่อมีข้อมูลการติดตาม
- โพสต์ไม่เกิน 500 ตัวอักษร, แนบรูป/วิดีโอ/PDF ไม่เกิน 10 MB ต่อไฟล์, ซ่อนเนื้อหาเซนซิทีฟจนกดดู, เปิด/ปิดคอมเมนต์
- ไลก์, รีโพสต์, โควต, บันทึกโพสต์, คอมเมนต์ที่แสดงใต้โพสต์เมื่อผู้ใช้กดเปิด, หน้าโปรไฟล์และการแก้ไขโปรไฟล์
- หน้าการแจ้งเตือนและ trigger สำหรับไลก์/คอมเมนต์/รีโพสต์/โควต
- SQL เตรียมโครงสร้างกลุ่มแชท, สมาชิก/บทบาท, คอมมูนิตี้ และโพล เพื่อพัฒนาต่อ

## สิ่งที่ยังไม่เสร็จและห้ามถือว่าเปิดใช้ได้แล้ว

- หน้าส่งข้อความแบบเรียลไทม์, การส่งไฟล์ใน DM, การสร้างกลุ่มแชท/เตะสมาชิก, หน้าจัดการคอมมูนิตี้ และหน้าโหวต ยังเป็นโครงสร้างฐานข้อมูล/หน้าร่าง ต้องเขียน UI, เชื่อม Supabase Realtime/Storage และทดสอบสิทธิ์ก่อนใช้จริง
- ยังไม่มีระบบติดตาม/เลิกติดตามจากหน้า UI, การค้นหาทั้งระบบ, แนะนำเนื้อหาจริง, trend จากข้อมูลจริง, block/mute/report, moderation, rate limit, spam protection, password reset, account deletion หรือระบบสำรองข้อมูล
- การสลับบัญชีในชุดนี้คือออกจากระบบแล้วเข้าสู่อีกบัญชี ไม่ใช่การเก็บหลาย session แล้วสลับทันทีแบบ native client
- โพสต์ `is_sensitive` เป็นคำเตือนเนื้อหา ไม่ใช่สิทธิ์ความเป็นส่วนตัวของไฟล์ สื่อใน bucket `post-media` เป็นไฟล์สาธารณะ ผู้ที่มี URL อาจเปิดไฟล์ได้ แม้หน้าโพสต์จะถูกซ่อนอยู่
- ยังไม่ได้รับรองความปลอดภัย/การรองรับผู้ใช้จำนวนมาก/การใช้งานจริง โปรดทดสอบ RLS ทุกกรณีก่อนเปิดสู่สาธารณะ

---

# วิธีสร้างโดยไม่ติดตั้งโปรแกรม

## ขั้นที่ 1 — สร้างที่เก็บโค้ดบน GitHub

1. เปิด https://github.com และสมัคร/เข้าสู่ระบบ
2. กด **New repository** ตั้งชื่อ `bcvent-social` เลือก Public ถ้าต้องการใช้ StackBlitz ฟรีที่นำเข้า public repository ได้ง่าย หรือ Private ถ้าต้องการเก็บโค้ดส่วนตัว (สิทธิ์นำเข้า private repository อาจขึ้นกับแผนของผู้ให้บริการ)
3. สร้าง repository โดยเลือก Add a README ได้หรือไม่เลือกก็ได้
4. แตก ZIP ของ BCVENT starter ด้วยเครื่องมือในระบบปฏิบัติการ แล้วใน GitHub เปิด **Add file → Upload files** และลากไฟล์/โฟลเดอร์ของโปรเจกต์เข้าไปทั้งหมด โดยรักษาโครงสร้างโฟลเดอร์ไว้ เช่น `src/App.tsx`, `src/styles.css`, `supabase/schema.sql`, `public/manifest.webmanifest`
5. อย่าอัปโหลดไฟล์ `.env` หรือรหัสลับใด ๆ ขึ้น GitHub ให้ใช้ `.env.example` เป็นเพียงตัวอย่างเท่านั้น
6. กด **Commit changes**

คู่มือ GitHub: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository

## ขั้นที่ 2 — เปิดโค้ดและดูตัวอย่างผ่าน StackBlitz

1. เปิด https://stackblitz.com/github/ชื่อบัญชีGitHub/bcvent-social (แทน `ชื่อบัญชีGitHub` ด้วยชื่อจริงของคุณ)
2. StackBlitz จะพยายามติดตั้ง dependencies และเริ่ม Vite ให้อัตโนมัติ ถ้าไม่เริ่ม ให้เปิด Terminal ที่อยู่ในหน้าเว็บและรัน `npm install` จากนั้น `npm run dev`
3. เมื่อหน้า Preview เปิดขึ้น จะเห็นฟีดตัวอย่าง BCVENT แม้ยังไม่ได้ตั้ง Supabase
4. แก้ไฟล์ `src/styles.css` เพื่อปรับสีและหน้าตา, `src/App.tsx` เพื่อปรับการทำงาน และ `public/flower.svg` สำหรับไอคอน

คู่มือ StackBlitz import จาก GitHub: https://developer.stackblitz.com/guides/user-guide/importing-projects

## ขั้นที่ 3 — สร้างโปรเจกต์ Supabase ฟรี

1. เปิด https://supabase.com และสร้าง Project ใหม่ ตั้งชื่อ `BCVENT` และตั้งรหัสผ่านฐานข้อมูลที่คาดเดายาก เก็บรหัสผ่านไว้อย่างปลอดภัย
2. เมื่อสร้างโปรเจกต์เสร็จ เข้าเมนู **SQL Editor → New query**
3. เปิดไฟล์ `supabase/schema.sql` ใน GitHub คัดลอกเนื้อหาทั้งไฟล์ไปวางใน SQL Editor แล้วกด **Run** เพียงครั้งแรก
4. ตารางหลักจะถูกสร้าง เช่น `profiles`, `posts`, `post_likes`, `post_saves`, `comments`, `notifications`, `chat_rooms`, `messages`, `communities` และ `polls`
5. ตรวจสอบเมนู **Table Editor** ว่ามีตารางเหล่านี้ และตรวจสอบ **Authentication → Users** หลังสมัครสมาชิกทดสอบ
6. SQL นี้เหมาะเป็นจุดเริ่มต้นสำหรับโปรเจกต์ใหม่ ไม่ควรรันซ้ำบนฐานข้อมูลที่มีข้อมูล/มี policy เดิมโดยไม่สำรองและตรวจสอบก่อน

เอกสาร Supabase Auth: https://supabase.com/docs/guides/auth
เอกสาร Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security

## ขั้นที่ 4 — ใส่ค่า Supabase ให้เว็บรู้จักฐานข้อมูล

1. ใน Supabase เปิด **Project Settings → API** (หรือหน้า Connect/API Keys ตามหน้าตา Dashboard ปัจจุบัน)
2. คัดลอก Project URL และ publishable/anon key สำหรับ browser client
3. ใน StackBlitz สร้างไฟล์ชื่อ `.env.local` ที่ root ระดับเดียวกับ `package.json` แล้วใส่:

```env
VITE_SUPABASE_URL=https://รหัสโปรเจกต์ของคุณ.supabase.co
VITE_SUPABASE_ANON_KEY=คีย์สำหรับฝั่งเว็บของคุณ
```

4. อย่านำ `service_role` key หรือ secret key มาใส่ในเว็บเด็ดขาด เพราะโค้ด frontend ถูกส่งให้ผู้เข้าชมอ่านได้
5. หยุดแล้วเริ่ม Preview ใหม่ถ้า environment variable ไม่ถูกโหลด จากนั้นลองสมัครด้วยอีเมลและรหัสผ่านอย่างน้อย 8 ตัวอักษร
6. หลังสมัคร ระบบ trigger จะสร้างแถวโปรไฟล์ให้โดยอัตโนมัติ หากเปิดยืนยันอีเมลใน Supabase ต้องคลิกลิงก์ยืนยันก่อนจึงจะเข้าสู่ระบบได้

## ขั้นที่ 5 — เปิด Google Login และ Facebook Login

ปุ่มในหน้า Login จะใช้งานได้เมื่อสร้าง OAuth App และตั้งค่ากับ Supabase เท่านั้น การใส่โค้ดปุ่มอย่างเดียวไม่เพียงพอ

### Google

1. เปิด Authentication → Providers → Google ใน Supabase และอ่านขั้นตอนที่ Dashboard แสดง
2. สร้าง OAuth Client ใน Google Cloud Console; ตั้ง Authorized redirect URI เป็น Callback URL ที่ Supabase แสดง
3. นำ Client ID และ Client Secret ไปตั้งใน Supabase และเปิด Provider
4. ใน Supabase Authentication → URL Configuration เพิ่ม URL ที่ใช้ทดสอบและ URL จริงในรายการ Redirect URLs

เอกสาร: https://supabase.com/docs/guides/auth/social-login/auth-google

### Facebook

1. สร้างแอปที่ https://developers.facebook.com และเพิ่ม Facebook Login
2. ใช้ Callback URL ที่ Supabase แสดงใน Provider settings เป็น Valid OAuth Redirect URI
3. ตั้งค่า Client ID/Secret ใน Supabase และเพิ่ม URL สำหรับทดสอบ/เว็บจริงใน Redirect URLs
4. ทดสอบด้วยบัญชีที่ได้รับอนุญาตใน Meta App ก่อนเปิดให้สาธารณะ

เอกสาร: https://supabase.com/docs/guides/auth/social-login/auth-facebook

## ขั้นที่ 6 — เผยแพร่เว็บด้วย Vercel

1. เปิด https://vercel.com แล้วเชื่อมบัญชี GitHub (หมายเหตุ: แผน Hobby ฟรีของ Vercel จำกัดการใช้งานส่วนตัว/ไม่ใช่เชิงพาณิชย์ หาก BCVENT ใช้ในเชิงธุรกิจต้องตรวจแผนที่อนุญาตก่อน: https://vercel.com/legal/terms)
2. กด **Add New → Project** เลือก repository `bcvent-social`
3. Framework ควรตรวจพบเป็น Vite; Build Command คือ `npm run build`, Output Directory คือ `dist`
4. ใน Project Settings → Environment Variables เพิ่ม `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` สำหรับ Production/Preview ตามต้องการ
5. กด Deploy แล้วเปิด URL ที่ Vercel ให้มา
6. กลับไป Supabase → Authentication → URL Configuration ใส่ Vercel URL เป็น Site URL และ Redirect URL เช่น `https://ชื่อโปรเจกต์.vercel.app/**`
7. ทดสอบในหน้าต่างไม่ระบุตัวตน: สมัคร, ยืนยันอีเมล, เข้าสู่ระบบ, โพสต์, ไลก์, รีโพสต์, บันทึก, คอมเมนต์ และลองเปิดลิงก์จากมือถือ

## ขั้นที่ 7 — ทดสอบบนมือถือและเพิ่มเป็นไอคอน

- เปิด URL ของเว็บจาก Safari บน iPhone หรือ Chrome บน Android
- Android: เมนูเบราว์เซอร์ → Add to Home screen / Install app
- iPhone: Safari → Share → Add to Home Screen
- ตรวจสอบว่าเห็นไอคอนดอกไม้สีขาว 4 กลีบ หากชื่อ/ไอคอนไม่เปลี่ยน ให้ลบไอคอนเก่าแล้วเพิ่มใหม่
- PWA ไม่ได้แปลว่าแอป Native ที่มีการเข้าถึงความสามารถของระบบทั้งหมด และความเข้ากันได้ขึ้นกับเวอร์ชัน OS/เบราว์เซอร์

---

# แนวทางพัฒนาต่อให้พร้อมใช้งานจริง

1. **ก่อนเปิดสาธารณะ:** เขียน automated tests สำหรับ RLS, จำกัด rate ของการโพสต์/คอมเมนต์, เพิ่ม block/mute/report, ขั้นตอนลบบัญชีและดาวน์โหลดข้อมูล, นโยบายความเป็นส่วนตัว, ข้อตกลงชุมชน, ระบบตรวจสแปม และแผนสำรองฐานข้อมูล
2. **แชท:** เพิ่ม Supabase Realtime สำหรับข้อความ, unread counters, การอัปโหลดไป private bucket, signed URLs และตรวจสิทธิ์สมาชิกก่อนอ่านไฟล์ทุกครั้ง; จำกัดสมาชิกห้องที่ 200 ฝั่งฐานข้อมูลด้วย trigger/transaction และทดสอบกรณีกดเชิญพร้อมกัน
3. **คอมมูนิตี้:** หน้า create/edit, slug, role permissions, moderation queue, รายงานโพสต์ และการปิดชุมชน
4. **โพล:** UI สร้างตัวเลือก, วันสิ้นสุด, บันทึกคะแนน, ตรวจสิทธิ์โหวต 1 คน/1 ครั้งหรือหลายตัวเลือก และแสดงผลรวม
5. **หลายบัญชี:** ทำ account switcher ที่เก็บ session อย่างปลอดภัยและออกแบบการล็อกเอาต์แยกบัญชีโดยไม่เก็บรหัสผ่านไว้ใน localStorage
6. **ฟีดและเสถียรภาพ:** keyset pagination, ranking, cache, database indexes, monitoring, load test, backups และการจัดการไฟล์ขนาดใหญ่แบบ resumable upload

## ข้อควรทราบเรื่องแพ็กเกจฟรี

แพ็กเกจฟรีมีขีดจำกัดเรื่องพื้นที่/ทราฟฟิก/จำนวนโปรเจกต์ และอาจพักโปรเจกต์เมื่อไม่มีการใช้งาน ดังนั้นใช้เป็นเวอร์ชันทดลองและพัฒนาก่อน หากมีสมาชิกจริงจำนวนมาก แชทที่ส่งไฟล์วิดีโอ หรือจำเป็นต้องรับประกัน uptime ควรประเมินค่าใช้จ่ายและนโยบายล่าสุดของผู้ให้บริการก่อนเปิดจริง
