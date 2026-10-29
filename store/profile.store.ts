import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProfileStore {
  /** Child the parent is currently viewing; null falls back to the first child */
  selectedStudentId: string | null;
  selectStudent: (id: string) => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      selectedStudentId: null,
      selectStudent: (id) => set({ selectedStudentId: id }),
    }),
    { name: "selected-student" }
  )
);
