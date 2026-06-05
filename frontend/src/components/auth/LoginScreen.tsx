import { useState } from "react";
import { api } from "../../api/api";
import type { Role, User } from "../../types";
import { useAppModal } from "../shared/AppModalProvider";

type Props = {
  role: Role;
  onLogin: (user: User) => void;
  goHome: () => void;
};

function LoginScreen({ role, onLogin, goHome }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { showAlert } = useAppModal();
  const [loading, setLoading] = useState(false);

  const login = async () => {
  if (loading) return;

  if (!email.trim() || !password.trim()) {
    await showAlert({
      title: "Missing information",
      message: "Email and password are required.",
    });
    return;
  }

  try {
    setLoading(true);

    const response = await api.post("/auth/login", {
      email,
      password,
      role,
    });

    localStorage.setItem("token", response.data.token);
    onLogin(response.data.user);
  } catch {
    await showAlert({
      title: "Invalid login",
      message: "Check your email, password and selected role.",
    });
  } finally {
    setLoading(false);
  }
};

  return (
    <main className="app">
      <section className="card">
        <div className="auth-hero">
          <img className="auth-logo" src="/tchin-logo.png" alt="T-Chin logo" />
          <div className="auth-role-pill">
            {role === "TEACHER" ? "Teacher login" : "Student login"}
          </div>
        </div>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={login} disabled={loading}>
  {loading ? "Logging in..." : "Log in"}
</button>

        <button className="secondary" onClick={goHome}>
          Back
        </button>
      </section>
    </main>
  );
}

export default LoginScreen;