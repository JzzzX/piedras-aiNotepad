'use client';

import Sidebar from '@/components/Sidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F9F9F8]">
      <Sidebar />
      <main className="min-w-0 flex-1 h-full overflow-y-auto bg-[#F6F2EB] flex flex-col">{children}</main>
    </div>
  );
}
