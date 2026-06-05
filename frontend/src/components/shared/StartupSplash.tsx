import { useEffect, useState } from "react";

function StartupSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="startup-splash">
      <div className="startup-splash-card">
        <img src="/tchin-logo.png" alt="T-Chin logo" />
      </div>
    </div>
  );
}

export default StartupSplash;