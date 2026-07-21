import { WORKSPACE_ENTRY_PATH } from "../../lib/workspace";

export type ShellNavLink = {
  to: string;
  label: string;
  end?: boolean;
};

export function workspacePage(page?: string, end = false): ShellNavLink {
  return {
    to: page ? `${WORKSPACE_ENTRY_PATH}?next=${page}` : WORKSPACE_ENTRY_PATH,
    label: "",
    end,
  };
}

export function workspaceLinks(
  items: Array<{ page?: string; label: string; end?: boolean }>
): ShellNavLink[] {
  return items.map((item) => ({
    to: item.page ? `${WORKSPACE_ENTRY_PATH}?next=${item.page}` : WORKSPACE_ENTRY_PATH,
    label: item.label,
    end: item.end,
  }));
}
