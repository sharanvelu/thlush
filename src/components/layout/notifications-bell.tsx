"use client";

import { Bell, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Notification centre. Low-stock alerts are wired in during the inventory
 * milestone; until then it always reports an empty inbox.
 */
export function NotificationsBell() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications, none unread">
          <Bell className="size-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-medium">Notifications</p>
        <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
          <CircleCheck className="size-8 text-success" aria-hidden />
          <p className="text-sm font-medium">You&apos;re all caught up</p>
          <p className="text-xs text-muted-foreground">Low-stock alerts will show up here.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
