import { createContext, useContext, useState } from "react";

type AlertOptions = {
  title?: string;
  message: string;
  buttonText?: string;
};

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type ModalState =
  | {
      type: "alert";
      title: string;
      message: string;
      buttonText: string;
      resolve: () => void;
    }
  | {
      type: "confirm";
      title: string;
      message: string;
      confirmText: string;
      cancelText: string;
      danger: boolean;
      resolve: (value: boolean) => void;
    }
  | null;

type AppModalContextValue = {
  showAlert: (options: AlertOptions) => Promise<void>;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
};

const AppModalContext = createContext<AppModalContextValue | null>(null);

export function AppModalProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState>(null);

  const showAlert = (options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setModal({
        type: "alert",
        title: options.title || "Notice",
        message: options.message,
        buttonText: options.buttonText || "OK",
        resolve,
      });
    });
  };

  const showConfirm = (options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setModal({
        type: "confirm",
        title: options.title || "Confirm action",
        message: options.message,
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        danger: options.danger || false,
        resolve,
      });
    });
  };

  const closeAlert = () => {
    if (!modal || modal.type !== "alert") return;

    modal.resolve();
    setModal(null);
  };

  const confirmAction = () => {
    if (!modal || modal.type !== "confirm") return;

    modal.resolve(true);
    setModal(null);
  };

  const cancelAction = () => {
    if (!modal || modal.type !== "confirm") return;

    modal.resolve(false);
    setModal(null);
  };

  return (
    <AppModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {modal && (
        <div className="app-modal-overlay">
          <div className="app-modal">
            <h2>{modal.title}</h2>
            <p>{modal.message}</p>

            {modal.type === "alert" && (
              <button onClick={closeAlert}>{modal.buttonText}</button>
            )}

            {modal.type === "confirm" && (
              <div className="app-modal-actions">
                <button className="secondary" onClick={cancelAction}>
                  {modal.cancelText}
                </button>

                <button
                  className={modal.danger ? "danger-button" : ""}
                  onClick={confirmAction}
                >
                  {modal.confirmText}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppModalContext.Provider>
  );
}

export function useAppModal() {
  const context = useContext(AppModalContext);

  if (!context) {
    throw new Error("useAppModal must be used inside AppModalProvider");
  }

  return context;
}