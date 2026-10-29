"use client";

import { ChevronDownIcon, LogOutIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSelectedStudent } from "@/hooks/use-selected-student";
import { getInitials } from "@/lib/format";
import { useLogout, useRequireSession } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {getInitials(name)}
    </span>
  );
}

/**
 * Shows the child being viewed; parents with more than one child switch here.
 * Lives in the portal header, so it also guards the portal session and holds sign out.
 */
export function ProfileSwitcher() {
  useRequireSession();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { students, student, selectStudent } = useSelectedStudent();

  // No child on the enquiry yet: show the parent
  const name = student?.name ?? user?.name;
  if (!name) return <span className="h-10 w-28 animate-pulse rounded-full bg-muted" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full bg-muted py-1 pr-3 pl-1 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={students.length > 1 ? `Viewing ${name}. Switch child or sign out` : `${name}. Account menu`}
      >
        <Avatar name={name} />
        {name.split(" ")[0]}
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {students.length > 1 && student && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Your children</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={student.id} onValueChange={(id) => selectStudent(id as string)}>
                {students.map((s) => (
                  <DropdownMenuRadioItem key={s.id} value={s.id} className="gap-2 py-1.5">
                    <Avatar name={s.name} />
                    <span className="flex flex-col">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.grade}</span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          {user && <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>}
          <DropdownMenuItem onClick={logout}>
            <LogOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
