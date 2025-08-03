import {
  Calculator,
  Calendar,
  Upload,
  Settings,
  User,
  Tag,
  Layers,
  Package,
  User2,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

const quickAccess = [
  { icon: Tag, label: "Add Sale" },
  { icon: Layers, label: "Add Batch" },
  { icon: Package, label: "Products" },
  { icon: User2, label: "Customers" },
];

const suggestions = [
  { icon: Calendar, label: "Calendar" },
  { icon: Calculator, label: "Calculator" },
];

const settings = [
  { icon: User, label: "Profile", shortcut: "⌘P" },
  { icon: Upload, label: "Backup & Export", shortcut: "⌘B" },
  { icon: Settings, label: "Settings", shortcut: "⌘S" },
];

export default function CommandMenu({ open, setOpen }) {
  const renderGroup = (heading, items) => (
    <CommandGroup heading={heading}>
      {items.map(({ icon: Icon, label, shortcut }) => (
        <CommandItem
          key={label}
        >
          <Icon className="mr-2 h-4 w-4" />
          <span>{label}</span>
          {shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
        </CommandItem>
      ))}
    </CommandGroup>
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {renderGroup("Quick Access", quickAccess)}
        <CommandSeparator />

        {renderGroup("Suggestions", suggestions)}
        <CommandSeparator />

        {renderGroup("Settings", settings)}
      </CommandList>
    </CommandDialog>
  );
}
