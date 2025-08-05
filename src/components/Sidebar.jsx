import React from "react";
import { HiOutlineClock } from "react-icons/hi2"
import { IoSettingsOutline } from "react-icons/io5"
import { BsArrowReturnLeft } from "react-icons/bs";
import { MdOutlinePayments } from "react-icons/md";
import { PiBuildingOffice, PiUsersDuotone } from "react-icons/pi";
import { CiLocationOn } from "react-icons/ci";
import { GoPackage } from "react-icons/go";
import { LuFileCog } from "react-icons/lu";
import { LiaUsersCogSolid } from "react-icons/lia";
import { Sidebar, SidebarHeader, SidebarGroup, SidebarContent, SidebarFooter, SidebarMenu, SidebarGroupLabel, SidebarGroupContent, SidebarMenuItem, SidebarMenuButton, SidebarSeparator, } from "./ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { ChevronUp, CreditCard, Layers, LayoutDashboard, LogOut, NotebookText, SlidersIcon, Tag, UploadCloud, User2, Wallet } from "lucide-react";
import "../index.css"
import { Separator } from "./ui/separator";

const core = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Add Sale",
    icon: Tag,
  },
  {
    title: "Add Batch",
    icon: Layers,
  },
  {
    title: "Return Handling",
    icon: BsArrowReturnLeft,
  },
]

const sidebar = [
  {
    title: "Inventory Items",
    items: [
      {
        title: "Products",
        icon: GoPackage,
      },
      {
        title: "Stock Adjustment",
        icon: LuFileCog,
      },
      {
        title: "Expiry Management",
        icon: HiOutlineClock,
      },
    ]
  },
  {
    title: "Finance",
    items: [
      {
        title: "Credit Dues",
        icon: CreditCard,
      },
      {
        title: "Customer Ledger",
        icon: NotebookText,
      },
      {
        title: "Supplier Payments",
        icon: MdOutlinePayments,
      },
      {
        title: "Expense Tracker",
        icon: Wallet,
      },
    ]
  },
  {
    title: "Stakeholders",
    items: [
      {
        title: "Companies",
        icon: PiBuildingOffice,
      },
      {
        title: "Customers",
        icon: PiUsersDuotone,
      },
      {
        title: "Areas",
        icon: CiLocationOn
      },
      {
        title: "Salesmen",
        icon: LiaUsersCogSolid,
      },
    ]
  }
]

export default function AppSidebar({ onNavigate, onLogout, username }) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="text-2xl font-bold px-2 py-3">
          Pharmax.
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="-mt-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {core.map((item) => (
                <SidebarMenuButton asChild className="cursor-pointer">
                  <a onClick={() => onNavigate(item.title)}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {sidebar.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
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
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator className="mb-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User2 /> {username}
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="anchor-width" >
                <DropdownMenuItem onClick={() => onNavigate("Settings")}>
                  <IoSettingsOutline />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate("Preferences")}>
                  <SlidersIcon />
                  <span>Prefrences</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate("Backup")}>
                  <UploadCloud />
                  <span>Backup & Export</span>
                </DropdownMenuItem>
                <Separator className="mt-1 mb-1" />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar >
  );
}
