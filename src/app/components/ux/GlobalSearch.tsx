import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Building2,
  CreditCard,
  FileText,
  Home,
  MessageCircle,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/Button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "../ui/command";
import { WORKSPACE_ENTRY_PATH } from "../../../lib/workspace";

type SearchItem = {
  id: string;
  label: string;
  href: string;
  group: string;
  keywords?: string[];
};

const BASE_ITEMS: SearchItem[] = [
  { id: "home", label: "Home", href: "/", group: "Navigate" },
  { id: "search", label: "Explore Properties", href: "/search", group: "Navigate", keywords: ["rent", "buy", "listings"] },
  { id: "app", label: "My BaytMiftah", href: "/app", group: "Consumer" },
  { id: "saved", label: "Saved Properties", href: "/app/saved", group: "Consumer" },
  { id: "messages", label: "Messages", href: "/app/messages", group: "Consumer" },
  { id: "payments", label: "Wallet & Payments", href: "/app/payments", group: "Consumer", keywords: ["wallet", "escrow"] },
  { id: "leases", label: "Leases", href: "/app/leases", group: "Consumer" },
  { id: "maintenance", label: "Maintenance", href: "/app/maintenance", group: "Consumer" },
  { id: "documents", label: "Documents", href: "/app/documents", group: "Consumer" },
  { id: "notifications", label: "Notifications", href: "/app/notifications", group: "Consumer" },
  { id: "applications", label: "Offers & Applications", href: "/app/applications", group: "Consumer", keywords: ["offers"] },
  { id: "workspace", label: "Workspace", href: WORKSPACE_ENTRY_PATH, group: "Workspace", keywords: ["agency", "listings", "team"] },
  { id: "settings", label: "Profile & Settings", href: "/app/settings", group: "Consumer" },
];

export function GlobalSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const items = useMemo(() => {
    if (!user) {
      return BASE_ITEMS.filter((item) => !item.href.startsWith("/app"));
    }
    return BASE_ITEMS;
  }, [user]);

  const groups = useMemo(() => {
    const map = new Map<string, SearchItem[]>();
    for (const item of items) {
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    }
    return map;
  }, [items]);

  const iconFor = (id: string) => {
    switch (id) {
      case "search":
        return Search;
      case "messages":
        return MessageCircle;
      case "payments":
        return CreditCard;
      case "documents":
        return FileText;
      case "workspace":
        return Building2;
      case "settings":
        return Settings;
      case "leases":
      case "maintenance":
        return Users;
      default:
        return Home;
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden md:flex items-center gap-2 text-muted-foreground min-w-52 justify-between"
        onClick={() => setOpen(true)}
        aria-label="Open global search"
      >
        <span className="flex items-center gap-2">
          <Search className="w-4 h-4" />
          Search BaytMiftah
        </span>
        <CommandShortcut>⌘K</CommandShortcut>
      </Button>

      <button
        type="button"
        className="md:hidden p-2 hover:bg-secondary rounded-full transition-colors"
        aria-label="Open global search"
        onClick={() => setOpen(true)}
      >
        <Search className="w-5 h-5" />
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Global Search"
        description="Search pages, actions, and areas across BaytMiftah"
      >
        <CommandInput placeholder="Search properties, pages, messages, documents..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Array.from(groups.entries()).map(([group, groupItems], index) => (
            <div key={group}>
              {index > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading={group}>
                {groupItems.map((item) => {
                  const Icon = iconFor(item.id);
                  return (
                    <CommandItem
                      key={item.id}
                      value={[item.label, ...(item.keywords || [])].join(" ")}
                      onSelect={() => {
                        setOpen(false);
                        navigate(item.href);
                      }}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
