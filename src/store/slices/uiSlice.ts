import { StateCreator } from "zustand";

export interface UISlice {
  sidebarOpen: boolean;
  modalOpen: boolean;
  modalContent: React.ReactNode | null;
  toast: {
    message: string;
    type: "success" | "error" | "info" | "warning";
    visible: boolean;
  };
  fontSize: number;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (content: React.ReactNode) => void;
  closeModal: () => void;
  showToast: (
    message: string,
    type?: "success" | "error" | "info" | "warning",
  ) => void;
  hideToast: () => void;
  setFontSize: (size: number) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  sidebarOpen: true,
  modalOpen: false,
  modalContent: null,
  toast: {
    message: "",
    type: "info",
    visible: false,
  },
  fontSize: 100,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  openModal: (content: React.ReactNode) =>
    set({ modalOpen: true, modalContent: content }),

  closeModal: () => set({ modalOpen: false, modalContent: null }),

  showToast: (
    message: string,
    type: "success" | "error" | "info" | "warning" = "info",
  ) => {
    set({ toast: { message, type, visible: true } });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      set((state) => ({ toast: { ...state.toast, visible: false } }));
    }, 3000);
  },

  hideToast: () =>
    set((state) => ({ toast: { ...state.toast, visible: false } })),

  setFontSize: (size: number) => {
    const clampedSize = Math.max(80, Math.min(150, size));
    set({ fontSize: clampedSize });
  },

  increaseFontSize: () =>
    set((state) => ({
      fontSize: Math.min(150, state.fontSize + 10),
    })),

  decreaseFontSize: () =>
    set((state) => ({
      fontSize: Math.max(80, state.fontSize - 10),
    })),

  resetFontSize: () => set({ fontSize: 100 }),
});
