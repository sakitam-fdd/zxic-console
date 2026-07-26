import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { AlertTriangle } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFunction | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFunction>((nextOptions) => {
    resolver.current?.(false);
    setOptions(nextOptions);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={options !== null} onClose={() => close(false)} className="relative z-[80]">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm transition duration-200 data-closed:opacity-0"
        />
        <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
          <DialogPanel
            transition
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl transition duration-200 data-closed:translate-y-3 data-closed:scale-95 data-closed:opacity-0"
          >
            <div className="flex gap-4">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  options?.destructive
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                }`}
              >
                <AlertTriangle className="size-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="font-semibold">{options?.title}</DialogTitle>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {options?.description}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => close(false)}>
                {options?.cancelLabel || "取消"}
              </Button>
              <Button
                type="button"
                variant={options?.destructive ? "destructive" : "default"}
                onClick={() => close(true)}
              >
                {options?.confirmLabel || "继续"}
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const value = useContext(ConfirmContext);
  if (!value) throw new Error("useConfirm must be used within ConfirmProvider");
  return value;
}
