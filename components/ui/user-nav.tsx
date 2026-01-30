"use client";

import { useEffect, useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { User, Settings, LogOut } from "lucide-react";

export function UserNav() {
  const router = useRouter();
  
  // Estado inicial vazio ou com placeholder
  const [userData, setUserData] = useState({ 
    name: "", 
    email: "", 
    initials: "" 
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/auth/me");
        
        // Lógica para formatar o nome se o campo 'name' estiver vazio no banco
        const email = data.email || "";
        let displayName = data.name;
        
        if (!displayName && email) {
             const namePart = email.split("@")[0];
             displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        }

        // Gera iniciais (Ex: Teste User -> TU)
        const initials = displayName
            ? displayName.substring(0, 2).toUpperCase()
            : "U";

        setUserData({
            name: displayName || "Usuário",
            email: email,
            initials: initials
        });
      } catch (error) {
        console.error("Erro ao carregar usuário no header", error);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = () => {
      // Ajuste conforme sua lógica de logout (limpar cookies/localStorage)
      localStorage.removeItem("token");
      router.push("/login"); 
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border border-slate-200">
            {/* Se você tiver URL de foto no banco, pode colocar aqui no src */}
            <AvatarImage src="" alt={userData.name} />
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