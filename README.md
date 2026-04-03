<<<<<<< HEAD
# Face ID Scanner (Node.js + React)

Ung dung demo quet khuon mat bang browser va sinh ma dinh danh rieng cho tung nguoi dung.

## Cong nghe

- Frontend: React + Vite + @vladmandic/face-api
- Backend: Node.js + Express

## Cach chay

Yeu cau: da cai Node.js 18+.

1. Cai dependencies:

```bash
npm install
npm run install:all
```

2. Cau hinh backend:

- Sao chep `backend/.env.example` thanh `backend/.env`
- Chinh `ID_SALT` thanh chuoi bi mat rieng cua ban

3. Chay app:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## Luong hoat dong

1. Browser mo webcam va lay 5 mau descriptor khuon mat lien tiep.
2. Frontend tinh descriptor trung binh de giam nhieu.
3. Frontend gui descriptor trung binh ve backend.
4. Backend so khop voi ho so da luu bang khoang cach L2.
5. Neu khoang cach <= nguong (`MATCH_THRESHOLD`) thi tra ve ID cu.
6. Neu khong khop thi tao ID moi, luu profile vao `backend/data/profiles.json`.

## Cau hinh do chinh xac

- `MATCH_THRESHOLD` trong `backend/.env` (mac dinh `0.46`):
  - Giam nguong (vd `0.42`) -> it nham nguoi khac, nhung de tach ID cung nguoi hon.
  - Tang nguong (vd `0.50`) -> de map ve cung ID hon, nhung tang nguy co nham nguoi.
- Nen quet trong anh sang on dinh, mat huong truc dien camera.

## Luu y quan trong

- Day la demo ky thuat, khong phai he thong xac thuc sinh trac hoc cap doanh nghiep.
- Da co co che giam dao dong descriptor bang lay nhieu mau + so khop nguong.
- De dat muc do production, ban nen them anti-spoofing, co che enroll/chinh sua profile, va quy trinh bao mat du lieu sinh trac hoc.

## Deploy Vercel/Render (tranh loi Failed to fetch)

1. Frontend (Vercel): tao env `VITE_API_URL` tro toi backend public URL, vi du `https://your-backend.onrender.com`
2. Backend (Render/Railway/...): tao env `CORS_ORIGIN` la domain frontend, vi du `https://your-app.vercel.app`
3. Neu co nhieu domain, dung danh sach phan tach boi dau phay trong `CORS_ORIGIN`
  - Vi du: `https://your-app.vercel.app,https://www.your-app.vercel.app`
=======
# test_quetKhuonMat
>>>>>>> 667bb2d559a7963f08202d1fc2a12567a6f7bad9
