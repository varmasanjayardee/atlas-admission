import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProfileStore {
  /** Child the parent is currently viewing; null falls back to the first child */
  selectedStudentId: string | null;
  selectStudent: (id: string) => void;
  /** Home screen: the step list ("new", default) or the original journey map ("classic") */
  journeyView: "new" | "classic";
  setJourneyView: (view: "new" | "classic") => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      selectedStudentId: null,
      selectStudent: (id) => set({ selectedStudentId: id }),
      journeyView: "new",
      setJourneyView: (journeyView) => set({ journeyView }),
    }),
    { name: "selected-student" }
  )
);
