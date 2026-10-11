"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Button, Modal } from "./ui";

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  icon?: ReactNode;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm>(async () => false);

/** Boîte de confirmation partagée par toute l'application. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  const confirm = useCallback<Confirm>(
    (options) => new Promise<boolean>((resolve) => setRequest({ ...options, resolve })),
    [],
  );

  const close = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!request} onClose={() => close(false)}>
        {request && (
          <div className="text-center">
            <div
              className={`mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full text-2xl ${
                request.tone === "danger" ? "bg-red-100" : "bg-amber-100"
              }`}
            >
              {request.icon ?? (request.tone === "danger" ? "⚠️" : "❓")}
            </div>
            <h2 className="text-lg font-black text-slate-900">{request.title}</h2>
            <div className="mt-2 text-sm leading-relaxed text-slate-600">{request.message}</div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => close(false)}>
                {request.cancelLabel ?? "Annuler"}
              </Button>
              <Button variant={request.tone === "danger" ? "dangerSolid" : "primary"} onClick={() => close(true)} autoFocus>
                {request.confirmLabel ?? "Confirmer"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  return useContext(ConfirmContext);
}
