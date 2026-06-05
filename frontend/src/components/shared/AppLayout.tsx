import { useState } from "react";
import type { User } from "../../types";
import { getInitials } from "../../utils";

type View = "main" | "courses" | "profile";

type Props = {
  user: User;
  currentView: View;
  setCurrentView: (view: View) => void;
  onLogout: () => void;
  children: React.ReactNode;
};

function AppLayout({ user, currentView, setCurrentView, onLogout, children }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const goTo = (view: View) => {
    setCurrentView(view);
    setDrawerOpen(false);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <button className="menu-button" onClick={() => setDrawerOpen(true)}>
          ☰
        </button>

        <img className="app-header-logo" src="/tchin-logo.png" alt="T-Chin logo" />

        <div className="header-spacer" />
      </header>

      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <aside className="side-drawer" onClick={(e) => e.stopPropagation()}>
            <img className="drawer-logo" src="/tchin-logo.png" alt="T-Chin logo" />

            <div className="drawer-profile">
              <div className="drawer-avatar">{getInitials(user.fullName)}</div>

              <div>
                <p className="drawer-user">{user.fullName}</p>
                <p className="drawer-role">{user.role === "TEACHER" ? "Teacher" : "Student"}</p>
              </div>
            </div>

            <button
              className={currentView === "main" ? "drawer-item active" : "drawer-item"}
              onClick={() => goTo("main")}
            >
              Main
            </button>

            <button
              className={currentView === "courses" ? "drawer-item active" : "drawer-item"}
              onClick={() => goTo("courses")}
            >
              My courses
            </button>

            <button
              className={currentView === "profile" ? "drawer-item active" : "drawer-item"}
              onClick={() => goTo("profile")}
            >
              Profile
            </button>

            <button className="drawer-item logout-item" onClick={onLogout}>
              <span>↩</span>
              Log out
            </button>
          </aside>
        </div>
      )}

      <section className="app-content">{children}</section>
    </main>
  );
}

export default AppLayout;