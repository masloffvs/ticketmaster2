import { useState } from "react";
import type { ShellNavGroup } from "../repositories/shellNavbarRepository";

export const useNavbarShell = (groups: ShellNavGroup[]) => {
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeItem, setActiveItem] = useState(groups[0]?.items[0] ?? "");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((group) => [group.title, true])),
  );

  const toggleSidebar = () => {
    setSidebarVisible((current) => !current);
  };

  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups((current) => ({
      ...current,
      [groupTitle]: !current[groupTitle],
    }));
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredGroups = groups
    .map((group) => {
      if (!normalizedQuery) {
        return group;
      }

      return {
        ...group,
        items: group.items.filter((item) =>
          item.toLowerCase().includes(normalizedQuery),
        ),
      };
    })
    .filter((group) => group.items.length > 0);

  return {
    activeItem,
    filteredGroups,
    closeSidebar,
    isSidebarVisible,
    openGroups,
    searchQuery,
    setActiveItem,
    setSearchQuery,
    toggleGroup,
    toggleSidebar,
  };
};
