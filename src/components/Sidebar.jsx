import React from "react";
import { MdOutlineBackup } from "react-icons/md";
import { RxDashboard } from "react-icons/rx"
import { TfiPackage } from "react-icons/tfi";
import { HiOutlineBuildingOffice, HiOutlineCreditCard, HiOutlineUser } from "react-icons/hi2"
import { HiOutlineDocumentReport } from "react-icons/hi"
import { IoLayersOutline, IoLocationOutline, IoLogOutOutline, IoPricetagOutline, IoSettingsOutline } from "react-icons/io5"
import {
  Sidebar,
  SidebarHeader,
  SidebarGroup,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "./ui/sidebar";
import { Avatar, AvatarImage } from "./ui/avatar";

const menuItems = [
  {
    title: "Dashboard",
    icon: RxDashboard,
  },
  {
    title: "Add Sale",
    icon: IoPricetagOutline,
  },
  {
    title: "Companies",
    icon: HiOutlineBuildingOffice,
  },
  {
    title: "Products",
    icon: TfiPackage,
  },
  {
    title: "Areas",
    icon: IoLocationOutline,
  },
  {
    title: "Add Batch",
    icon: IoLayersOutline,
  },
  {
    title: "Credit Dues",
    icon: HiOutlineCreditCard,
  },
  {
    title: "Sales Reports",
    icon: HiOutlineDocumentReport,
  },
  {
    title: "Customers",
    icon: HiOutlineUser,
  },
];

export default function AppSidebar({ onNavigate, onLogout, username }) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="text-2xl font-bold px-2 py-3">
          Pharmax.
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel> Vendor </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="cursor-pointer">
                    <a onClick={() => onNavigate(item.title)}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>

          <SidebarMenuItem>
            <SidebarMenuButton className="cursor-pointer" onClick={() => onNavigate("Backup & Export")}>
              <MdOutlineBackup />
              <span>Backup & Export</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton className="cursor-pointer" onClick={() => onNavigate("Settings")}>
              <IoSettingsOutline />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton className="cursor-pointer" onClick={onLogout}>
              <IoLogOutOutline />
              <span>SignOut</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarSeparator className="mb-2 mt-2" />
            <SidebarMenuButton>
              <Avatar>
                <AvatarImage src="https://i.pravatar.cc/20" />
              </Avatar>
              <span>{username}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
