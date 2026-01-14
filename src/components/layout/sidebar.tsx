"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Inbox,
  Calendar,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Chat", href: "/", icon: MessageSquare },
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Pipeline", href: "/pipeline", icon: TrendingUp },
  { name: "Memos", href: "/memos", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-16 flex-col items-center border-r bg-background py-4">
      {/* Logo */}
      <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
        P9
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                size="icon"
                className={cn("relative", isActive && "bg-secondary")}
                title={item.name}
              >
                <item.icon className="h-5 w-5" />
                {isActive && (
                  <span className="absolute -left-1 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="space-y-2">
        <Button variant="ghost" size="icon" title="Settings">
          <Settings className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" title="Logout">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
