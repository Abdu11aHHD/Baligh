import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/logo";
import { requireAdminPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireAdminPage();
  return (
    <div className="min-h-screen bg-[#f8f7fb] lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-white print:hidden lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-e">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block lg:px-5 lg:py-6">
          <Logo href="/admin" />
          <AdminNav email={user.email ?? ""} role={role} />
        </div>
      </aside>
      <div className="min-w-0">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
