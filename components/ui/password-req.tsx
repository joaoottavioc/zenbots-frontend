import { Check } from "lucide-react";

interface PasswordReqProps {
  met: boolean;
  text: string;
}

export function PasswordReq({ met, text }: PasswordReqProps) {
  return (
    <div className={`flex items-center gap-1.5 text-[11px] transition-colors duration-200 ${met ? "text-emerald-600" : "text-muted-foreground/60"}`}>
      {met ? <Check className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />}
      <span className={met ? "font-medium" : ""}>{text}</span>
    </div>
  );
}
