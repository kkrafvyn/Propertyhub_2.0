import { Link } from "react-router";
import {
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  User,
  Briefcase,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { WORKSPACE_ENTRY_PATH } from "../../../lib/workspace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

function getInitials(user: { user_metadata?: { full_name?: string }; email?: string }) {
  return (
    user?.user_metadata?.full_name
      ?.split(" ")
      .map((part: string) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    "BM"
  );
}

function getDisplayName(user: { user_metadata?: { full_name?: string }; email?: string }) {
  return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest";
}

export function UserMenu() {
  const { user, signOut } = useAuth();
  const isAuthenticated = !!user;
  const workspacePath = `${WORKSPACE_ENTRY_PATH}?next=new`;

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-1">
        <Link to="/login" className="nav-pill hidden sm:inline-flex">
          Log in
        </Link>
        <Link
          to="/signup"
          className="user-menu-trigger flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition"
        >
          <Menu className="h-4 w-4" />
          <User className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const initials = getInitials(user);
  const displayName = getDisplayName(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="user-menu-trigger flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          aria-label="Account menu"
        >
          <Menu className="h-4 w-4 opacity-80" />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-[#c45d44] text-xs font-semibold text-white shadow-sm ring-2 ring-white/15">
            {initials}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="bm-user-menu-panel w-[min(92vw,280px)] overflow-hidden rounded-2xl border-white/12 bg-[#0f2922] p-0 text-white shadow-menu"
      >
        <div className="border-b border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-[#c45d44] text-sm font-bold text-white shadow-md">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{displayName}</p>
              <p className="truncate text-xs text-white/55">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="p-1.5">
          <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Account
          </DropdownMenuLabel>
          <DropdownMenuItem asChild className="bm-menu-item">
            <Link to="/app">
              <LayoutDashboard className="h-4 w-4 text-white/70" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="bm-menu-item">
            <Link to="/app/saved">
              <Heart className="h-4 w-4 text-white/70" />
              Saved properties
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="bm-menu-item">
            <Link to="/workspace">
              <Briefcase className="h-4 w-4 text-white/70" />
              Workspace
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-white/10" />

        <div className="p-1.5">
          <DropdownMenuItem asChild className="bm-menu-item bm-menu-item-cta">
            <Link to={workspacePath}>
              <PlusCircle className="h-4 w-4" />
              List property
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-white/10" />

        <div className="p-1.5">
          <DropdownMenuItem
            variant="destructive"
            className="bm-menu-item text-red-300 focus:bg-red-500/15 focus:text-red-200"
            onSelect={() => void signOut()}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
