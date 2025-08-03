import React from "react";
import { Button } from "./ui/button";
import { SidebarTrigger } from "./ui/sidebar";

export default function Header({ username, onLogout }) {
  return (
    <header className="flex justify-start items-center py-2 bg-gray-100 border-b">
      <SidebarTrigger />
    </header>
  );
}
