export interface ShellNavGroup {
  title: string;
  items: string[];
}

const SHELL_NAVBAR_GROUPS: ShellNavGroup[] = [
  {
    title: "Network",
    items: ["Proxy Traffic", "Recent Requests"],
  },
];

export const shellNavbarRepository = {
  getAll(): ShellNavGroup[] {
    return SHELL_NAVBAR_GROUPS.map((group) => ({
      ...group,
      items: [...group.items],
    }));
  },
};
