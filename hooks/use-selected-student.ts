"use client";

import { useStudents } from "@/services/admission.service";
import { useProfileStore } from "@/store/profile.store";

/** Children on the account plus the one being viewed (defaults to the first) */
export function useSelectedStudent() {
  const students = useStudents();
  const selectedId = useProfileStore((s) => s.selectedStudentId);
  const selectStudent = useProfileStore((s) => s.selectStudent);

  const list = students.data ?? [];
  const student = list.find((s) => s.id === selectedId) ?? list[0];

  // isPending, not isLoading: the query is disabled during SSR, so isLoading would differ on hydration
  return { students: list, student, selectStudent, isLoading: students.isPending };
}
