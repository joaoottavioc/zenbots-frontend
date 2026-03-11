"use client";

import { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { clearAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, LogOut } from "lucide-react";

export function UserNav() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: rawUser } = useQuery<{ email: string; name?: string }>({
    queryKey: ['currentUser'],
    queryFn: async () => (await api.get("/auth/me")).data,
  });

  const userData = useMemo(() => {
    const email = rawUser?.email || "";
    let displayName = rawUser?.name || "";

    if (!displayName && email) {
      const namePart = email.split("@")[0];
      displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }

    const initials = displayName
      ? displayName.substring(0, 2).toUpperCase()
      : "U";

    return {
      name: displayName || "Usuário",
      email,
      initials,
    };
  }, [rawUser]);

  const handleLogout = async () => {
      try {
        await api.post('/auth/logout');
      } catch {
        // server-side revocation failed — proceed with local cleanup
      }
      queryClient.clear();
      clearAuth();
      router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border border-slate-200">
            <AvatarFallback className="bg-sky-100 text-sky-700 font-bold">
                {userData.initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userData.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userData.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
