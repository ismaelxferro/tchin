import { useEffect, useState } from "react";
import { api } from "./api/api";
import type { Role, User } from "./types";

import LoginScreen from "./components/auth/LoginScreen";
import RegisterScreen from "./components/auth/RegisterScreen";
import TeacherDashboard from "./components/teacher/TeacherDashboard";
import StudentDashboard from "./components/student/StudentDashboard";
import AppLayout from "./components/shared/AppLayout";
import ProfileView from "./components/shared/ProfileView";
import FloatingChat from "./components/shared/FloatingChat";
import MainView from "./components/shared/MainView";

import "./App.css";

type AppView = "main" | "courses" | "profile";

function App() {
  const [screen, setScreen] = useState<"home" | "login" | "register" | "dashboard">("home");
  const [loginRole, setLoginRole] = useState<Role>("TEACHER");
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>("main");
  const [chatTarget, setChatTarget] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await api.get("/auth/me");
        setUser(response.data);
        setCurrentView("main");
        setScreen("dashboard");
      } catch {
        localStorage.removeItem("token");
      }
    };

    loadUser();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setChatTarget(null);
    setCurrentView("main");
    setScreen("home");
  };

  if (screen === "home") {
    return (
      <main className="app">
        <section className="card">
  <div className="auth-hero">
    <img className="auth-logo" src="/tchin-logo.png" alt="T-Chin logo" />
    <p className="auth-subtitle">
      Learning made easier.
    </p>
  </div>

  <div className="auth-button-group">
    <button
      onClick={() => {
        setLoginRole("TEACHER");
        setScreen("login");
      }}
    >
      I am a teacher
    </button>

    <button
      onClick={() => {
        setLoginRole("STUDENT");
        setScreen("login");
      }}
    >
      I am a student
    </button>
  </div>

  <div className="auth-divider">or</div>

  <button className="secondary" onClick={() => setScreen("register")}>
    Create an account
  </button>
</section>
      </main>
    );
  }

  if (screen === "register") {
    return <RegisterScreen goHome={() => setScreen("home")} />;
  }

  if (screen === "login") {
    return (
      <LoginScreen
        role={loginRole}
        onLogin={(loggedUser) => {
          setUser(loggedUser);
          setCurrentView("main");
          setScreen("dashboard");
        }}
        goHome={() => setScreen("home")}
      />
    );
  }

  if (!user) return null;

  return (
    <AppLayout
      user={user}
      currentView={currentView}
      setCurrentView={setCurrentView}
      onLogout={logout}
    >
      {currentView === "main" && (
  <>
    <MainView user={user} setCurrentView={setCurrentView} />
  </>
)}

      {currentView === "courses" && user.role === "TEACHER" && (
        <TeacherDashboard currentUser={user} setChatTarget={setChatTarget} />
      )}

      {currentView === "courses" && user.role === "STUDENT" && (
        <StudentDashboard currentUser={user} setChatTarget={setChatTarget} />
      )}

      {currentView === "profile" && <ProfileView currentUser={user} />}

      <FloatingChat
        currentUser={user}
        chatTarget={chatTarget}
        setChatTarget={setChatTarget}
      />
    </AppLayout>
  );
}

export default App;