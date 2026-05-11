// app/dashboard/layout.tsx  — Vendor Dashboard Layout
// Pattern: Sidebar (desktop) + Drawer (tablet) + BottomNav (mobile)

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar'
import { DashboardBottomNav } from '@/components/dashboard/DashboardBottomNav'
import { MobileDrawer } from '@/components/dashboard/MobileDrawer'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side auth guard (middleware handles redirect, this is a second check)
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/dashboard')

  // Fetch seller profile for sidebar
  const { data: store } = await supabase
    .from('stores')
    .select('name, slug, rating_avg, sales_count')
    .eq('owner_id', user.id)
    .single()

  return (
    /*
      CSS Grid layout:
      ┌─────────────┬──────────────────────────────────┐
      │   Sidebar   │  Topbar (sticky)                  │
      │  (desktop)  ├──────────────────────────────────┤
      │             │  Main content (scrollable)        │
      │             │                                   │
      └─────────────┴──────────────────────────────────┘
                      BottomNav (mobile, fixed bottom)
    */
    <div className="dashboard-shell">
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <DashboardSidebar store={store} userEmail={user.email!} />

      {/* Mobile drawer — slides in from left, triggered by topbar menu btn */}
      <MobileDrawer store={store} userEmail={user.email!} />

      <div className="dashboard-main">
        <DashboardTopbar storeName={store?.name} />

        <main className="dashboard-content">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <DashboardBottomNav />
    </div>
  )
}
