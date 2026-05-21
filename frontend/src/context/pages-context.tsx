"use client";

import {
  BookOpen,
  Coins,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Target,
  Users,
  Vault,
  Vote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

export type PageSection = "command" | "governance" | "capital" | "learning" | "admin";

export interface DAOPageContext {
  id: string;
  name: string;
  shortName?: string;
  href: string;
  icon: LucideIcon;
  description: string;
  keywords: string[];
  section: PageSection;
  parentId?: string;
  nav?: boolean;
  mobileNav?: boolean;
  status?: string;
}

interface PagesContextValue {
  pages: DAOPageContext[];
  navigationPages: DAOPageContext[];
  mobileNavigationPages: DAOPageContext[];
  currentPage: DAOPageContext;
  breadcrumbs: DAOPageContext[];
  pathname: string;
  getPageById: (id: string) => DAOPageContext | undefined;
  isActiveHref: (href: string) => boolean;
  searchPages: (query: string) => DAOPageContext[];
}

export const DAO_PAGES: DAOPageContext[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "DAO command center for proposals, treasury, training, and TUT readiness.",
    keywords: ["home", "overview", "command", "metrics", "dao"],
    section: "command",
    nav: true,
    mobileNav: true,
    status: "Live",
  },
  {
    id: "proposals",
    name: "Proposals",
    href: "/proposals",
    icon: FileText,
    description: "Create, inspect, and monitor governance proposals.",
    keywords: ["proposal", "governor", "queue", "execute", "timelock"],
    section: "governance",
    nav: true,
    mobileNav: true,
    status: "On-chain",
  },
  {
    id: "proposal-create",
    name: "Create Proposal",
    href: "/proposals/create",
    icon: FileText,
    description: "Draft executable governance actions for DAO review.",
    keywords: ["create", "draft", "governance action", "calldata"],
    section: "governance",
    parentId: "proposals",
  },
  {
    id: "proposal-detail",
    name: "Proposal Detail",
    href: "/proposals/detail",
    icon: FileText,
    description: "Review proposal status, votes, and execution controls.",
    keywords: ["detail", "votes", "for", "against", "abstain"],
    section: "governance",
    parentId: "proposals",
  },
  {
    id: "vote",
    name: "Vote",
    href: "/vote",
    icon: Vote,
    description: "Cast votes and review active governance decisions.",
    keywords: ["vote", "ballot", "quorum", "delegate"],
    section: "governance",
    nav: true,
    mobileNav: true,
    status: "Action",
  },
  {
    id: "treasury",
    name: "Treasury",
    href: "/treasury",
    icon: Vault,
    description: "Track treasury balances, execution reserves, escrow, and payroll.",
    keywords: ["treasury", "funds", "escrow", "payroll", "assets"],
    section: "capital",
    nav: true,
    mobileNav: true,
    status: "Timelock",
  },
  {
    id: "staking",
    name: "Staking",
    href: "/staking",
    icon: Coins,
    description: "Manage TUT staking and participation alignment.",
    keywords: ["stake", "staking", "rewards", "participation", "tokens"],
    section: "capital",
    nav: true,
    mobileNav: true,
  },
  {
    id: "bounties",
    name: "Bounties",
    href: "/bounties",
    icon: Target,
    description: "Coordinate DAO work, delivery incentives, and task rewards.",
    keywords: ["bounty", "tasks", "work", "contributors", "milestones"],
    section: "capital",
    nav: true,
  },
  {
    id: "training",
    name: "Training",
    href: "/training",
    icon: BookOpen,
    description: "Administer credential-backed training paths and TUT reward access.",
    keywords: ["training", "ibm", "google", "microsoft", "revit", "bim", "rewards"],
    section: "learning",
    nav: true,
    status: "Rewards",
  },
  {
    id: "training-base",
    name: "Base Training",
    href: "/training/base",
    icon: BookOpen,
    description: "Low-fee Base network training and reward flow.",
    keywords: ["base", "l2", "training", "gas", "session"],
    section: "learning",
    parentId: "training",
  },
  {
    id: "training-skillsbuild",
    name: "IBM SkillsBuild",
    href: "/training/skillsbuild",
    icon: BookOpen,
    description: "IBM SkillsBuild credential path with TUT rewards support.",
    keywords: ["ibm", "skillsbuild", "credential", "course"],
    section: "learning",
    parentId: "training",
  },
  {
    id: "learn",
    name: "Learn",
    href: "/learn",
    icon: GraduationCap,
    description: "Learning hub for governance, BIM, professional certs, and DAO education.",
    keywords: ["learn", "academy", "certs", "education", "bim"],
    section: "learning",
    nav: true,
  },
  {
    id: "payments",
    name: "Payments",
    href: "/payments",
    icon: CreditCard,
    description: "Merchant payments and ecosystem transaction tooling.",
    keywords: ["payments", "merchant", "checkout", "commerce", "processor"],
    section: "capital",
    nav: true,
  },
  {
    id: "delegates",
    name: "Delegates",
    href: "/delegates",
    icon: Users,
    description: "Discover delegates and manage voting representation.",
    keywords: ["delegates", "representation", "voting power", "members"],
    section: "governance",
    nav: true,
  },
  {
    id: "settings",
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Configure wallet, network, notification, and application preferences.",
    keywords: ["settings", "preferences", "network", "notifications"],
    section: "admin",
    nav: true,
  },
  {
    id: "landing",
    name: "Landing",
    href: "/landing",
    icon: LayoutDashboard,
    description: "Public-facing DAO entry page.",
    keywords: ["landing", "public", "home"],
    section: "command",
  },
];

const fallbackPage = DAO_PAGES[0];

function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/$/, "");
}

function getMatchScore(page: DAOPageContext, pathname: string) {
  const normalizedPageHref = normalizePathname(page.href);
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPageHref === "/") {
    return normalizedPathname === "/" ? 1 : 0;
  }

  if (normalizedPathname === normalizedPageHref) {
    return normalizedPageHref.length + 1000;
  }

  if (normalizedPathname.startsWith(`${normalizedPageHref}/`)) {
    return normalizedPageHref.length;
  }

  return 0;
}

function resolveCurrentPage(pathname: string) {
  return DAO_PAGES.reduce(
    (best, page) => {
      const score = getMatchScore(page, pathname);
      return score > best.score ? { page, score } : best;
    },
    { page: fallbackPage, score: 0 }
  ).page;
}

function buildBreadcrumbs(
  currentPage: DAOPageContext,
  pagesById: Map<string, DAOPageContext>
) {
  const chain: DAOPageContext[] = [];
  let page: DAOPageContext | undefined = currentPage;

  while (page) {
    chain.unshift(page);
    page = page.parentId ? pagesById.get(page.parentId) : undefined;
  }

  return chain;
}

const PagesContext = createContext<PagesContextValue | undefined>(undefined);

export function PagesProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const normalizedPathname = normalizePathname(pathname);

  const pagesById = useMemo(
    () => new Map(DAO_PAGES.map((page) => [page.id, page])),
    []
  );
  const currentPage = useMemo(
    () => resolveCurrentPage(normalizedPathname),
    [normalizedPathname]
  );
  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(currentPage, pagesById),
    [currentPage, pagesById]
  );
  const navigationPages = useMemo(
    () => DAO_PAGES.filter((page) => page.nav),
    []
  );
  const mobileNavigationPages = useMemo(
    () => DAO_PAGES.filter((page) => page.mobileNav),
    []
  );

  const getPageById = useCallback(
    (id: string) => pagesById.get(id),
    [pagesById]
  );

  const isActiveHref = useCallback(
    (href: string) => getMatchScore({ ...fallbackPage, href }, normalizedPathname) > 0,
    [normalizedPathname]
  );

  const searchPages = useCallback((query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return navigationPages;
    }

    return DAO_PAGES.filter((page) => {
      const searchable = [
        page.name,
        page.shortName,
        page.href,
        page.description,
        page.status,
        page.section,
        ...page.keywords,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [navigationPages]);

  const value = useMemo<PagesContextValue>(
    () => ({
      pages: DAO_PAGES,
      navigationPages,
      mobileNavigationPages,
      currentPage,
      breadcrumbs,
      pathname: normalizedPathname,
      getPageById,
      isActiveHref,
      searchPages,
    }),
    [
      breadcrumbs,
      currentPage,
      getPageById,
      isActiveHref,
      mobileNavigationPages,
      navigationPages,
      normalizedPathname,
      searchPages,
    ]
  );

  return <PagesContext.Provider value={value}>{children}</PagesContext.Provider>;
}

export function usePages() {
  const context = useContext(PagesContext);

  if (!context) {
    throw new Error("usePages must be used within PagesProvider");
  }

  return context;
}
