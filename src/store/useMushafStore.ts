import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  getMushafPagesForThumun,
  getThumunFromMushafPage,
  TOTAL_ATHMAN,
  TOTAL_MUSHAF_PAGES,
} from "@/lib/mushaf-mapping";

export type MushafTheme = "sepia" | "dark" | "light";

interface MushafStoreState {
  isOpen: boolean;
  thumunId: number;
  currentPage: number;
  thumunPages: number[];
  theme: MushafTheme;
  isZoomed: boolean;
  showAudio: boolean;

  openReader: (thumunId: number, startPage?: number) => void;
  openByPage: (pageNumber: number) => void;
  closeReader: () => void;
  setPage: (pageNumber: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  nextThumun: () => void;
  prevThumun: () => void;
  setTheme: (theme: MushafTheme) => void;
  toggleZoom: () => void;
  toggleAudio: () => void;
}

export const useMushafStore = create<MushafStoreState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      thumunId: 1,
      currentPage: 1,
      thumunPages: [1, 2, 3],
      theme: "sepia",
      isZoomed: false,
      showAudio: false,

      openReader: (thumunId: number, startPage?: number) => {
        if (!Number.isInteger(thumunId) || thumunId < 1 || thumunId > TOTAL_ATHMAN) return;
        const safeThumun = thumunId;
        const pages = getMushafPagesForThumun(safeThumun);
        const page = startPage && pages.includes(startPage) ? startPage : pages[0] || 1;
        set({
          isOpen: true,
          thumunId: safeThumun,
          currentPage: page,
          thumunPages: pages,
        });
      },

      openByPage: (pageNumber: number) => {
        const safePage = Math.max(1, Math.min(TOTAL_MUSHAF_PAGES, pageNumber));
        const thumunId = getThumunFromMushafPage(safePage);
        const pages = getMushafPagesForThumun(thumunId);
        set({
          isOpen: true,
          thumunId,
          currentPage: safePage,
          thumunPages: pages,
        });
      },

      closeReader: () => {
        set({ isOpen: false });
      },

      setPage: (pageNumber: number) => {
        if (!Number.isInteger(pageNumber)) return;
        const safePage = Math.max(1, Math.min(TOTAL_MUSHAF_PAGES, pageNumber));
        const current = get();
        const thumunId = current.thumunPages.includes(safePage) ? current.thumunId : getThumunFromMushafPage(safePage);
        const pages = getMushafPagesForThumun(thumunId);
        set({
          currentPage: safePage,
          thumunId,
          thumunPages: pages,
        });
      },

      nextPage: () => {
        const { currentPage, thumunPages } = get();
        // If current page is within current thumun and not the last page of thumun:
        const currentIndex = thumunPages.indexOf(currentPage);
        if (currentIndex >= 0 && currentIndex < thumunPages.length - 1) {
          set({ currentPage: thumunPages[currentIndex + 1] });
          return;
        }

        // If at the end of current thumun, advance to next page in next thumun
        if (currentPage < TOTAL_MUSHAF_PAGES) {
          const nextPageNum = currentPage + 1;
          const nextThumunId = getThumunFromMushafPage(nextPageNum);
          set({
            currentPage: nextPageNum,
            thumunId: nextThumunId,
            thumunPages: getMushafPagesForThumun(nextThumunId),
          });
        }
      },

      prevPage: () => {
        const { currentPage, thumunPages } = get();
        // If current page is within current thumun and not the first page of thumun:
        const currentIndex = thumunPages.indexOf(currentPage);
        if (currentIndex > 0) {
          set({ currentPage: thumunPages[currentIndex - 1] });
          return;
        }

        // If at the beginning of current thumun, go back to previous page
        if (currentPage > 1) {
          const prevPageNum = currentPage - 1;
          const prevThumunId = getThumunFromMushafPage(prevPageNum);
          set({
            currentPage: prevPageNum,
            thumunId: prevThumunId,
            thumunPages: getMushafPagesForThumun(prevThumunId),
          });
        }
      },

      nextThumun: () => {
        const { thumunId } = get();
        if (thumunId < TOTAL_ATHMAN) {
          const nextId = thumunId + 1;
          const pages = getMushafPagesForThumun(nextId);
          set({
            thumunId: nextId,
            currentPage: pages[0] || 1,
            thumunPages: pages,
          });
        }
      },

      prevThumun: () => {
        const { thumunId } = get();
        if (thumunId > 1) {
          const prevId = thumunId - 1;
          const pages = getMushafPagesForThumun(prevId);
          set({
            thumunId: prevId,
            currentPage: pages[0] || 1,
            thumunPages: pages,
          });
        }
      },

      setTheme: (theme: MushafTheme) => set({ theme }),
      toggleZoom: () => set((s) => ({ isZoomed: !s.isZoomed })),
      toggleAudio: () => set((s) => ({ showAudio: !s.showAudio })),
    }),
    {
      name: "hosoon-mushaf-reader",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        isZoomed: state.isZoomed,
      }),
    },
  ),
);
