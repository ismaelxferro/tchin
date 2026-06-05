import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppModalProvider } from "./components/shared/AppModalProvider";
import StartupSplash from "./components/shared/StartupSplash";

import "./index.css";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppModalProvider>
      <App />
      <StartupSplash />
    </AppModalProvider>
  </React.StrictMode>
);