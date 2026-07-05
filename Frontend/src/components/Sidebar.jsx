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
import {
  Factory,
  FileText,
  RotateCcw as RotateCcwIcon,
  BookOpen as BookOpenIcon,
  ChevronsUpDown,
  ShieldCheck,
} from 'lucide-react';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

// ── NAVIGATION GROUPS ────────────────────────────────────────────────────────
const navigation = {
  overview: [{ title: 'Dashboard', icon: RxDashboard }],
  sales: [
    { title: 'Add Sale', icon: IoPricetagOutline },
    { title: 'Customers', icon: HiOutlineUser },
    { title: 'Credit Dues', icon: HiOutlineCreditCard },
  ],
  inventory: [
    { title: 'Products', icon: TfiPackage },
    { title: 'Batches', icon: IoLayersOutline },
  ],
  procurement: [
    { title: 'Purchase Invoice', icon: FileText },
    { title: 'Purchase Returns', icon: RotateCcwIcon },
    { title: 'Companies', icon: HiOutlineBuildingOffice },
    { title: 'Supplier Ledger', icon: BookOpenIcon },
  ],
  reports: [{ title: 'Sales Reports', icon: HiOutlineDocumentReport }],
};

export default function AppSidebar({ onNavigate, onLogout, username }) {
  const NavItem = ({ item }) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        asChild
        className="cursor-pointer transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97]"
      >
        <a onClick={() => onNavigate(item.title)}>
          {item.icon && <item.icon />}
          <span>{item.title}</span>
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="text-xl font-bold tracking-tight">Pharmax.</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
              Pharmacy Suite
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.overview.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
            Sales & CRM
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.sales.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
            Inventory Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.inventory.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
            Procurement
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.procurement.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
            Analysis
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.reports.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-zinc-100 dark:border-zinc-800">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-zinc-100 dark:data-[state=open]:bg-zinc-800 transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97]"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
                    />
                    <AvatarFallback className="rounded-lg bg-blue-100 text-blue-700 font-bold">
                      {username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                    <span className="truncate font-semibold">{username || 'User Account'}</span>
                    <span className="truncate text-xs text-zinc-500">Administrator</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-zinc-400" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" side="right" sideOffset={8}>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-blue-100 text-blue-700">
                        {username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{username}</span>
                      <span className="truncate text-xs text-zinc-500">Pharmacy Admin</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate('Settings')}>
                  <IoSettingsOutline className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onNavigate('Backup & Export')}
                >
                  <MdOutlineBackup className="mr-2 h-4 w-4" />
                  <span>Backup & Export</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50"
                  onClick={onLogout}
                >
                  <IoLogOutOutline className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
