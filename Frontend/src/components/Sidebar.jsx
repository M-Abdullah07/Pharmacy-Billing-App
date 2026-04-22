import React from "react";
import { MdOutlineBackup } from "react-icons/md";
import { RxDashboard } from "react-icons/rx";
import { TfiPackage } from "react-icons/tfi";
import { HiOutlineBuildingOffice, HiOutlineCreditCard, HiOutlineUser } from "react-icons/hi2";
import { HiOutlineDocumentReport } from "react-icons/hi";
import { IoLayersOutline, IoLogOutOutline, IoPricetagOutline, IoSettingsOutline } from "react-icons/io5";
import { Factory, FileText, LayoutDashboard, Receipt, Package, PlusCircle, Users, Truck, BarChart3, Settings, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, key: "Dashboard" },
  { title: "Billing / POS", icon: Receipt, key: "Add Sale" },
  { title: "Inventory", icon: Package, key: "Products" },
  { title: "Add Batch", icon: PlusCircle, key: "Add Batch" },
  { title: "Customers", icon: Users, key: "Customers" },
  { title: "Companies", icon: Truck, key: "Companies" },
  { title: "Manufacturers", icon: Truck, key: "Manufacturers" },
  { title: "Sales Reports", icon: BarChart3, key: "Sales Reports" },
  { title: "Credit Dues", icon: BarChart3, key: "Credit Dues" },
  { title: "Backup & Export", icon: BarChart3, key: "Backup & Export" },
  { title: "Settings", icon: Settings, key: "Settings" },
];

// ── INVENTORY ─────────────────────────────────────────────────────────────────
const inventoryItems = [
  { title: "Products",      icon: TfiPackage },
  { title: "Manufacturers", icon: Factory },
  { title: "Companies",     icon: HiOutlineBuildingOffice },
  { title: "Add Batch",     icon: IoLayersOutline },
  { title: "Purchase Invoice", icon: FileText }, // import FileText from lucide-react
];

export default function Sidebar({ onNavigate, activePage, onLogout, username, state }) {
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-sm">
            Rx
          </div>
          {state !== "collapsed" && (
            <div>
              <p className="font-semibold text-xl tracking-tight text-sidebar-foreground">PharmaFlow</p>
              <p className="text-xs text-sidebar-foreground/70 -mt-1">Pharmacy OS</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    onClick={() => onNavigate(item.key)}
                    isActive={activePage === item.key}
                    className={cn(
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all",
                      activePage === item.key &&
                        "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {username?.slice(0, 2).toUpperCase() || "PH"}
            </AvatarFallback>
          </Avatar>
          {state !== "collapsed" && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{username}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">Online</p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          className="w-full justify-start gap-2 mt-4 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" />
          {state !== "collapsed" && <span>Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}