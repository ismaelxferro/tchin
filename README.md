# T-Chin

T-Chin is a full-stack mobile-first education platform for teachers and students.
It allows teachers to create courses, manage assignments, receive PDF submissions, review student work, upload corrected PDFs, assign grades, and communicate with students through an internal messaging system.

The app was built as a portfolio project with a production-oriented architecture: a React/TypeScript frontend packaged as an Android app with Capacitor, a Node.js/Express backend, PostgreSQL with Prisma, and Supabase Storage for online PDF file handling.

## Features

### Authentication and roles

* Custom registration and login system.
* Teacher and student roles.
* Role-based dashboards and permissions.
* Protected backend routes using JWT authentication.

### Course management

* Teachers can create courses.
* Students can join courses using a course code.
* Course participants can be viewed from inside each course.
* Course owners can delete courses.
* Courses support co-teachers.

### Assignments and submissions

* Teachers and co-teachers can create assignments.
* Students can submit assignments as PDF files.
* Teachers can review submissions with:

  * written feedback,
  * corrected PDF files,
  * grades from 1 to 10,
  * reviewed status.
* Students can view submitted work, corrections, teacher comments, grades, and late submission indicators.

### Messaging system

* Internal messaging between course participants.
* Conversation list with last message preview.
* Unread message count.
* Floating chat popup.
* Mobile-friendly chat UI.

### File storage

* PDF submissions and corrections are stored in Supabase Storage.
* Files are accessed through protected signed URLs.
* Backend validates access before generating file links.

### Mobile-first UI

* Responsive layout.
* Mobile drawer navigation.
* Floating chat button.
* Custom modals instead of browser alerts.
* App splash screen and app icon.
* Android APK generated with Capacitor.

## Tech stack

### Frontend

* React
* Vite
* TypeScript
* Capacitor
* Axios
* CSS

### Backend

* Node.js
* Express
* TypeScript
* Prisma ORM
* PostgreSQL
* JWT authentication
* Multer
* Supabase Storage

### Database and storage

* Supabase PostgreSQL
* Supabase Storage

### Deployment

* Backend deployed on Render.
* PostgreSQL and file storage hosted on Supabase.
* Android app generated with Capacitor.

## Architecture

The app is divided into three main parts:

```txt
frontend/   React + Vite + TypeScript + Capacitor
backend/    Node.js + Express + Prisma
database/   PostgreSQL through Supabase
storage/    Supabase Storage for PDFs
```

The Android APK contains the frontend build.
The frontend communicates with the online backend through a REST API.
The backend communicates with PostgreSQL and Supabase Storage.

## Main user flows

### Teacher flow

1. Create an account as teacher.
2. Create a course.
3. Share the course code with students.
4. Create assignments.
5. Review submitted PDFs.
6. Upload corrected PDFs.
7. Add comments and grades.
8. Message students or co-teachers.

### Student flow

1. Create an account as student.
2. Join a course using a course code.
3. View participants.
4. Submit assignments as PDFs.
5. View reviewed work, grades, comments, and corrected PDFs.
6. Message teachers or classmates.

## Environment variables

### Backend

Create a `.env` file inside `backend/`:

```env
DATABASE_URL=""
DIRECT_URL=""
JWT_SECRET=""
CLIENT_URLS=""
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
SUPABASE_BUCKET=""
PORT=3000
```

### Frontend

Create a `.env` file inside `frontend/` for local development:

```env
VITE_API_URL=http://localhost:3000
```

Create a `.env.production` file for APK/production builds:

```env
VITE_API_URL=https://your-backend-url.onrender.com
```

## Running locally

### Backend

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Building the Android APK

```bash
cd frontend
npm run build
npx cap sync android
cd android
gradlew assembleDebug
```

The debug APK will be generated at:

```txt
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

## Notes

This project was developed as a full-stack portfolio application focused on real-world workflows: authentication, permissions, relational data, file uploads, cloud storage, mobile UI, deployment, and Android packaging.
