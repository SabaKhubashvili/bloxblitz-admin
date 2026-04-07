"use client";
import React, { useEffect, useRef, useState,useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  UserCircleIcon,
  GameControllerIcon,
  ShootingStarIcon,
} from "../icons/index";
import { Gift, ShieldUser } from 'lucide-react';

type NavSubLeaf = {
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
};

/** A top-level sub entry is either a single link or a group with nested links. */
type NavSubItem = NavSubLeaf | { name: string; subItems: NavSubLeaf[] };

function isNavSubGroup(
  item: NavSubItem,
): item is { name: string; subItems: NavSubLeaf[] } {
  return (
    "subItems" in item &&
    Array.isArray(item.subItems) &&
    item.subItems.length > 0
  );
}

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: NavSubItem[];
};

/** Use `{ name, path }` for a link, or `{ name, subItems: [...] }` for a nested group (one level only). */
const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
  },
  {
    icon: <GameControllerIcon />,
    name: "Games",
    subItems: [
      { name: "Crash", subItems:[

          { name: "Crash overview", path: "/admin/crash" },
          { name: "Crash chain", path: "/admin/crash/chain" },
   
    ]},
      { name: "Cases admin", path: "/admin/cases" },
      { name: "Coinflip admin", path: "/admin/coinflip" },
      { name: "Mines admin", path: "/admin/mines" },
      { name: "Dice admin", path: "/admin/dice" },
    ],
  },
  {
    icon: <ShootingStarIcon />,
    name: "Race",
    subItems: [
      { name: "Race Overview", path: "/admin/race" },
      { name: "Create Race", path: "/admin/race/create" },
      { name: "Race Controls", path: "/admin/race/controls" },
      { name: "Race History", path: "/admin/race/history" },
    ],
  },
  {
    icon: <Gift />,
    name: "Rewards",
    subItems: [
      { name: "Rewards Overview", path: "/admin/rewards" },
      { name: "Reward configuration", path: "/admin/rewards/config" },
      { name: "User keys", path: "/admin/rewards/keys" },
      { name: "Reward history", path: "/admin/rewards/history" },
      { name: "Reward case opens", path: "/admin/rewards/cases" },
    ],
  },
  {
    icon: <UserCircleIcon />,
    name: "Users Manager",
    path: "/admin/users",
  },
  {
    icon: <ShieldUser />,
    name: "My Profile",
    path: "/profile",
  },
];


function nestedSubmenuKey(
  menuType: "main" | "others",
  navIndex: number,
  subIndex: number,
): string {
  return `${menuType}-${navIndex}-nested-${subIndex}`;
}

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={` ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                 className={`ml-auto w-5 h-5 transition-transform duration-200  ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem, subIdx) => {
                  const nKey = nestedSubmenuKey(menuType, index, subIdx);
                  const nestedOpen = !!openNestedSubmenus[nKey];

                  if (isNavSubGroup(subItem)) {
                    const groupActive = subItem.subItems.some((l) =>
                      isActive(l.path),
                    );
                    return (
                      <li key={`${subItem.name}-${subIdx}`}>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenNestedSubmenus((prev) => ({
                              ...prev,
                              [nKey]: !prev[nKey],
                            }))
                          }
                          className={`menu-dropdown-item w-full cursor-pointer border-none bg-transparent text-left ${
                            groupActive
                              ? "menu-dropdown-item-active"
                              : "menu-dropdown-item-inactive"
                          }`}
                        >
                          {subItem.name}
                          <ChevronDownIcon
                            className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
                              nestedOpen ? "rotate-180 text-brand-500" : ""
                            }`}
                          />
                        </button>
                        <div
                          ref={(el) => {
                            nestedSubMenuRefs.current[nKey] = el;
                          }}
                          className="overflow-hidden transition-all duration-300"
                          style={{
                            height: nestedOpen
                              ? `${
                                  nestedSubMenuHeight[nKey] ?? 0
                                }px`
                              : "0px",
                          }}
                        >
                          <ul className="mt-1 space-y-1 border-l border-gray-200 pl-3 dark:border-gray-700 ml-1">
                            {subItem.subItems.map((leaf) => (
                              <li key={leaf.path}>
                                <Link
                                  href={leaf.path}
                                  className={`menu-dropdown-item ${
                                    isActive(leaf.path)
                                      ? "menu-dropdown-item-active"
                                      : "menu-dropdown-item-inactive"
                                  }`}
                                >
                                  {leaf.name}
                                  <span className="flex items-center gap-1 ml-auto">
                                    {leaf.new && (
                                      <span
                                        className={`ml-auto ${
                                          isActive(leaf.path)
                                            ? "menu-dropdown-badge-active"
                                            : "menu-dropdown-badge-inactive"
                                        } menu-dropdown-badge `}
                                      >
                                        new
                                      </span>
                                    )}
                                    {leaf.pro && (
                                      <span
                                        className={`ml-auto ${
                                          isActive(leaf.path)
                                            ? "menu-dropdown-badge-active"
                                            : "menu-dropdown-badge-inactive"
                                        } menu-dropdown-badge `}
                                      >
                                        pro
                                      </span>
                                    )}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={subItem.path}>
                      <Link
                        href={subItem.path}
                        className={`menu-dropdown-item ${
                          isActive(subItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        }`}
                      >
                        {subItem.name}
                        <span className="flex items-center gap-1 ml-auto">
                          {subItem.new && (
                            <span
                              className={`ml-auto ${
                                isActive(subItem.path)
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge `}
                            >
                              new
                            </span>
                          )}
                          {subItem.pro && (
                            <span
                              className={`ml-auto ${
                                isActive(subItem.path)
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge `}
                            >
                              pro
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [openNestedSubmenus, setOpenNestedSubmenus] = useState<
    Record<string, boolean>
  >({});
  const [nestedSubMenuHeight, setNestedSubMenuHeight] = useState<
    Record<string, number>
  >({});
  const nestedSubMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => path === pathname;
   const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    let submenuMatched = false;
    const nextNestedOpen: Record<string, boolean> = {};

    ["main", "others"].forEach((menuType) => {
      const mt = menuType as "main" | "others";
      navItems.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem, subIdx) => {
            if (isNavSubGroup(subItem)) {
              const nKey = nestedSubmenuKey(mt, index, subIdx);
              subItem.subItems.forEach((leaf) => {
                if (isActive(leaf.path)) {
                  setOpenSubmenu({ type: mt, index });
                  nextNestedOpen[nKey] = true;
                  submenuMatched = true;
                }
              });
            } else if (subItem.path && isActive(subItem.path)) {
              setOpenSubmenu({ type: mt, index });
              submenuMatched = true;
            }
          });
        }
      });
    });

    const raceDetail = /^\/admin\/race\/([^/]+)$/.exec(pathname);
    if (raceDetail) {
      const seg = raceDetail[1];
      if (seg && !["create", "controls", "history"].includes(seg)) {
        const raceIdx = navItems.findIndex((n) => n.name === "Race");
        if (raceIdx >= 0) {
          setOpenSubmenu({ type: "main", index: raceIdx });
          submenuMatched = true;
        }
      }
    }

    if (/^\/admin\/rewards(\/.*)?$/.test(pathname)) {
      const rewardsIdx = navItems.findIndex((n) => n.name === "Rewards");
      if (rewardsIdx >= 0) {
        setOpenSubmenu({ type: "main", index: rewardsIdx });
        submenuMatched = true;
      }
    }

    if (!submenuMatched) {
      setOpenSubmenu(null);
      setOpenNestedSubmenus({});
    } else {
      setOpenNestedSubmenus(nextNestedOpen);
    }
  }, [pathname, isActive]);

  useEffect(() => {
    if (openSubmenu === null) return;
    const key = `${openSubmenu.type}-${openSubmenu.index}`;
    const measure = () => {
      const el = subMenuRefs.current[key];
      if (el) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: el.scrollHeight || 0,
        }));
      }
    };
    measure();
    const id = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(id);
  }, [openSubmenu, openNestedSubmenus, pathname]);

  useEffect(() => {
    const measureNested = () => {
      setNestedSubMenuHeight((prev) => {
        const next = { ...prev };
        let touched = false;
        for (const nKey of Object.keys(openNestedSubmenus)) {
          if (!openNestedSubmenus[nKey]) continue;
          const el = nestedSubMenuRefs.current[nKey];
          const h = el?.scrollHeight ?? 0;
          if (next[nKey] !== h) {
            next[nKey] = h;
            touched = true;
          }
        }
        return touched ? next : prev;
      });
    };
    measureNested();
    const id = window.requestAnimationFrame(measureNested);
    return () => window.cancelAnimationFrame(id);
  }, [openNestedSubmenus, openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        {/* <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link> */}
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
