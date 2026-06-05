import { useEffect, useState } from "react";

function StartupSplash() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const startFade = setTimeout(() => {
      setLeaving(true);
    }, 1200);

    const removeSplash = setTimeout(() => {
      setVisible(false);
    }, 1600);

    return () => {
      clearTimeout(startFade);
      clearTimeout(removeSplash);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={leaving ? "startup-splash leaving" : "startup-splash"}>
      <div className="startup-splash-card">
        <img src="/tchin-logo.png" alt="T-Chin logo" />
      </div>
    </div>
  );
}

export default StartupSplash;