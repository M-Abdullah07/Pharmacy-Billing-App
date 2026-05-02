import React from 'react';
import { MdOutlineBackup } from 'react-icons/md';
import { RxDashboard } from 'react-icons/rx';
import { TfiPackage } from 'react-icons/tfi';
import { HiOutlineBuildingOffice, HiOutlineCreditCard, HiOutlineUser } from 'react-icons/hi2';
import { HiOutlineDocumentReport } from 'react-icons/hi';
import {
  IoLayersOutline,
  IoLogOutOutline,
  IoPricetagOutline,
  IoSettingsOutline,
} from 'react-icons/io5';
import { Factory, FileText } from 'lucide-react';

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
} from './ui/sidebar';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

// ── SALES ─────────────────────────────────────────────────────────────────────
const salesItems = [
  { title: 'Dashboard', icon: RxDashboard },
  { title: 'Add Sale', icon: IoPricetagOutline },
  { title: 'Customers', icon: HiOutlineUser },
  { title: 'Credit Dues', icon: HiOutlineCreditCard },
  { title: 'Sales Reports', icon: HiOutlineDocumentReport },
];

// ── INVENTORY ─────────────────────────────────────────────────────────────────
const inventoryItems = [
  { title: 'Products', icon: TfiPackage },
  { title: 'Manufacturers', icon: Factory },
  { title: 'Companies', icon: HiOutlineBuildingOffice },
  { title: 'Batches', icon: IoLayersOutline },
  { title: 'Purchase Invoice', icon: FileText },
];

export default function AppSidebar({ onNavigate, onLogout, username }) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="text-2xl font-bold px-2 py-3">Pharmax.</div>
      </SidebarHeader>

      <SidebarContent>
        {/* ── Sales & Customers ─────────────────────────────────────────────── */}
        <SidebarGroup>
          <SidebarGroupLabel>Sales</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {salesItems.map((item) => (
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

        {/* ── Inventory ─────────────────────────────────────────────────────── */}
        <SidebarGroup>
          <SidebarGroupLabel>Inventory</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {inventoryItems.map((item) => (
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
            <SidebarMenuButton
              className="cursor-pointer"
              onClick={() => onNavigate('Backup & Export')}
            >
              <MdOutlineBackup />
              <span>Backup & Export</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton className="cursor-pointer" onClick={() => onNavigate('Settings')}>
              <IoSettingsOutline />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton className="cursor-pointer" onClick={onLogout}>
              <IoLogOutOutline />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarSeparator className="mb-2 mt-2" />
            <SidebarMenuButton>
              <Avatar>
                <AvatarImage src="https://i.pravatar.cc/20" />
                <AvatarFallback>{username?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span>{username}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
