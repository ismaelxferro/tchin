import { useState } from "react";
import { api } from "../../api/api";
import type { Role } from "../../types";
import { useAppModal } from "../shared/AppModalProvider";

type Props = {
  goHome: () => void;
};

function RegisterScreen({ goHome }: Props) {
  const [form, setForm] = useState({
    email: "",
    username: "",
    fullName: "",
    password: "",
    role: "STUDENT" as Role,
  });

  const { showAlert } = useAppModal();
  const [loading, setLoading] = useState(false);

  const register = async () => {
  if (loading) return;

  if (
    !form.email.trim() ||
    !form.username.trim() ||
    !form.fullName.trim() ||
    !form.password.trim()
  ) {
    await showAlert({
      title: "Missing information",
      message: "Complete all fields before creating your account.",
    });
    return;
  }

  try {
    setLoading(true);

    await api.post("/auth/register", form);

    await showAlert({
      title: "Account created",
      message: "Your account was created successfully. You can now log in.",
    });

    goHome();
  } catch {
    await showAlert({
      title: "Could not create account",
      message: "The email or username may already be in use.",
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
          <div className="auth-role-pill">Create account</div>
        </div>

        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />

        <input
          placeholder="Full name"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
        >
          <option value="STUDENT">Student</option>
          <option value="TEACHER">Teacher</option>
        </select>

        <button onClick={register} disabled={loading}>
  {loading ? "Creating account..." : "Create account"}
</button>

        <button className="secondary" onClick={goHome}>
          Back
        </button>
      </section>
    </main>
  );
}

export default RegisterScreen;