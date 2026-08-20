import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";
import { ADMIN_NAV_ITEMS } from "@/components/admin/admin-nav";

const item = ADMIN_NAV_ITEMS.find((i) => i.href === "/admin/workspaces")!;

export default function AdminWorkspacesPage() {
  return <PlaceholderPage title={item.label} description={item.description} icon={item.icon} />;
}
