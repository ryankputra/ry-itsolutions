"use client";

import React, { useState } from "react";
import { AdminActivityLogsTab } from "@/components/admin/AdminActivityLogsTab";
import { AdminUserActivityModal } from "@/components/admin/AdminUserActivityModal";

export default function AdminLogsPage() {
  const [inspectUser, setInspectUser] = useState<{ id: string; name: string; email: string; role?: string } | null>(null);

  return (
    <div className="space-y-4">
      <AdminActivityLogsTab onInspectUser={(u) => setInspectUser(u)} />
      {inspectUser && (
        <AdminUserActivityModal
          user={inspectUser}
          onClose={() => setInspectUser(null)}
        />
      )}
    </div>
  );
}
