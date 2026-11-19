import { create } from 'zustand';

interface Confirm { title: string; body: string; ok: string; onOk: () => void }
interface UiState {
  toast: string | null;
  reportWordId: string | null;
  confirm: Confirm | null;
  showToast: (msg: string) => void;
  openReport: (wordId: string) => void;
  closeReport: () => void;
  askConfirm: (c: Confirm) => void;
  closeConfirm: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useUi = create<UiState>()((set) => ({
  toast: null,
  reportWordId: null,
  confirm: null,
  showToast: (msg) => {
    clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 3200);
  },
  openReport: (wordId) => set({ reportWordId: wordId }),
  closeReport: () => set({ reportWordId: null }),
  askConfirm: (confirm) => set({ confirm }),
  closeConfirm: () => set({ confirm: null }),
}));
