"use client";

import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { useAccount } from "wagmi";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  DollarSign,
  FileText,
  Filter,
  Hammer,
  Layers3,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Target,
  Users,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useIsConvexConfigured } from "@/components/convex-provider";
import { Badge, ProgressBar } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

type WorkType = "Open Job" | "DAO Task";
type WorkStatus = "intake" | "estimating" | "ready" | "active" | "submitted" | "review";
type Priority = "Low" | "Medium" | "High" | "Critical";
type PersistedWorkItem = Doc<"constructionWorkItems">;

interface ConstructionWorkItem {
  _id?: Id<"constructionWorkItems">;
  id: string;
  title: string;
  type: WorkType;
  status: WorkStatus;
  trade: string;
  location: string;
  owner: string;
  budgetUsd: number;
  rewardTut: number;
  due: string;
  priority: Priority;
  crew: string;
  certification: string;
  risk: string;
  progress: number;
  scope: string;
  deliverables: string[];
  dependencies: string[];
  daoRequired: boolean;
  flagged: boolean;
}

interface WorkForm {
  title: string;
  type: WorkType;
  trade: string;
  location: string;
  rewardTut: string;
  budgetUsd: string;
  priority: Priority;
}

interface BoardActions {
  create: (form: WorkForm, itemCount: number) => Promise<void> | void;
  claim: (item: ConstructionWorkItem) => Promise<void> | void;
  advance: (item: ConstructionWorkItem) => Promise<void> | void;
  toggleFlag: (item: ConstructionWorkItem) => Promise<void> | void;
  seedDefaults?: () => Promise<void> | void;
}

const STATUS_COLUMNS: Array<{
  id: WorkStatus;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  { id: "intake", title: "Intake", description: "New opportunities and DAO requests", icon: FileText },
  { id: "estimating", title: "Estimating", description: "Takeoff, scope, schedule, and risk review", icon: Layers3 },
  { id: "ready", title: "Ready", description: "Funded work ready for crews or contributors", icon: Target },
  { id: "active", title: "Active", description: "Claimed work in progress", icon: Hammer },
  { id: "submitted", title: "Submitted", description: "Deliverables ready for owner or DAO review", icon: ClipboardCheck },
  { id: "review", title: "DAO Review", description: "Governance, payment, or dispute queue", icon: ShieldCheck },
];

const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Critical"];
const TRADES = [
  "All trades",
  "BIM/VDC",
  "MEP",
  "Estimating",
  "Site Ops",
  "Safety",
  "Permitting",
  "Concrete",
  "Procurement",
];

const INITIAL_WORK: ConstructionWorkItem[] = [
  {
    id: "JOB-1042",
    title: "Mixed-use tenant improvement BIM coordination",
    type: "Open Job",
    status: "ready",
    trade: "BIM/VDC",
    location: "Atlanta, GA",
    owner: "Tolani Construction Studio",
    budgetUsd: 18500,
    rewardTut: 3200,
    due: "Jun 7, 2026",
    priority: "High",
    crew: "1 BIM lead, 2 Revit modelers",
    certification: "Revit Professional or BIM coordination portfolio",
    risk: "MEP clash density and late owner design updates",
    progress: 62,
    scope:
      "Coordinate architectural, structural, and MEP models for a fast-turn tenant improvement package. Build a weekly clash report and issue log for owner review.",
    deliverables: ["Federated Revit model", "Navisworks clash report", "Sheet issue tracker"],
    dependencies: ["Owner background set", "MEP engineer model export", "Shared coordinate confirmation"],
    daoRequired: false,
    flagged: false,
  },
  {
    id: "DAO-220",
    title: "Approve training reward policy for BIM credential tasks",
    type: "DAO Task",
    status: "review",
    trade: "BIM/VDC",
    location: "DAO",
    owner: "Tolani DAO",
    budgetUsd: 0,
    rewardTut: 1250,
    due: "May 30, 2026",
    priority: "Critical",
    crew: "Governance reviewer, training admin",
    certification: "DAO reviewer access",
    risk: "Reward permissions must match TUT treasury controls",
    progress: 84,
    scope:
      "Finalize the policy that maps IBM, Google, Microsoft, Revit, and BIM proof-of-completion into claimable TUT training rewards.",
    deliverables: ["Reward policy memo", "Admin role matrix", "Governor proposal draft"],
    dependencies: ["Training contract address", "Tolani Labs completion evidence schema"],
    daoRequired: true,
    flagged: true,
  },
  {
    id: "JOB-1048",
    title: "Quantity takeoff for concrete podium package",
    type: "Open Job",
    status: "estimating",
    trade: "Estimating",
    location: "Charlotte, NC",
    owner: "Regional GC Partner",
    budgetUsd: 9200,
    rewardTut: 1800,
    due: "Jun 3, 2026",
    priority: "High",
    crew: "Estimator, concrete reviewer",
    certification: "Bluebeam, OST, or equivalent takeoff experience",
    risk: "Structural addenda expected before bid close",
    progress: 38,
    scope:
      "Produce a verified concrete quantity takeoff with alternates, exclusions, bid clarifications, and owner-ready pricing assumptions.",
    deliverables: ["Takeoff workbook", "Assumption log", "Bid summary"],
    dependencies: ["Latest structural set", "Spec section 03", "Subcontractor unit pricing"],
    daoRequired: false,
    flagged: false,
  },
  {
    id: "DAO-224",
    title: "Create DAO task template for field safety audits",
    type: "DAO Task",
    status: "active",
    trade: "Safety",
    location: "DAO",
    owner: "Operations Guild",
    budgetUsd: 0,
    rewardTut: 900,
    due: "May 28, 2026",
    priority: "Medium",
    crew: "Safety lead, platform admin",
    certification: "OSHA 30 preferred",
    risk: "Template must distinguish field evidence from training evidence",
    progress: 55,
    scope:
      "Design a repeatable DAO work template for site safety walkthroughs, evidence uploads, incident notes, and reward approval.",
    deliverables: ["Audit checklist", "Evidence fields", "Approval workflow"],
    dependencies: ["Wallet role policy", "Task bounty approval rules"],
    daoRequired: true,
    flagged: false,
  },
  {
    id: "JOB-1051",
    title: "Permit closeout tracker for multifamily renovation",
    type: "Open Job",
    status: "intake",
    trade: "Permitting",
    location: "Houston, TX",
    owner: "Owner Rep Network",
    budgetUsd: 6400,
    rewardTut: 1100,
    due: "Jun 12, 2026",
    priority: "Medium",
    crew: "Permit coordinator",
    certification: "Municipal permitting experience",
    risk: "Jurisdiction response time and inspection sequencing",
    progress: 16,
    scope:
      "Build a live closeout tracker for permit dependencies, inspections, renewal deadlines, and responsible parties.",
    deliverables: ["Permit matrix", "Inspection calendar", "Closeout risk list"],
    dependencies: ["Current permit numbers", "Inspection history", "Owner contact list"],
    daoRequired: false,
    flagged: false,
  },
  {
    id: "DAO-231",
    title: "Review subcontractor payout milestone rules",
    type: "DAO Task",
    status: "submitted",
    trade: "Procurement",
    location: "DAO",
    owner: "Treasury Guild",
    budgetUsd: 0,
    rewardTut: 1500,
    due: "May 27, 2026",
    priority: "High",
    crew: "Treasury reviewer, contract admin",
    certification: "Construction contract administration",
    risk: "Payment rules must align with escrow and dispute handling",
    progress: 76,
    scope:
      "Translate construction milestone payment logic into DAO task approval states for mobilization, rough-in, inspection, and closeout.",
    deliverables: ["Milestone policy", "Escrow trigger map", "Dispute review criteria"],
    dependencies: ["Treasury approval path", "Escrow contract review"],
    daoRequired: true,
    flagged: false,
  },
];

const emptyForm: WorkForm = {
  title: "",
  type: "Open Job",
  trade: "BIM/VDC",
  location: "",
  rewardTut: "750",
  budgetUsd: "5000",
  priority: "Medium",
};

function priorityClass(priority: Priority) {
  if (priority === "Critical") return "border-red-500/40 bg-red-500/10 text-red-300";
  if (priority === "High") return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  if (priority === "Medium") return "border-blue-500/40 bg-blue-500/10 text-blue-300";
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
}

function typeBadge(type: WorkType) {
  return type === "Open Job" ? "info" : "success";
}

function nextStatus(status: WorkStatus): WorkStatus {
  const order = STATUS_COLUMNS.map((column) => column.id);
  const index = order.indexOf(status);
  return order[Math.min(index + 1, order.length - 1)];
}

function statusProgress(status: WorkStatus, current: number) {
  if (status === "review") return Math.max(current, 88);
  if (status === "submitted") return Math.max(current, 76);
  if (status === "active") return Math.max(current, 45);
  if (status === "ready") return Math.max(current, 35);
  if (status === "estimating") return Math.max(current, 20);
  return Math.max(current, 8);
}

function createLocalWorkItem(form: WorkForm, itemCount: number): ConstructionWorkItem {
  const typePrefix = form.type === "Open Job" ? "JOB" : "DAO";
  return {
    id: `${typePrefix}-${300 + itemCount * 17}`,
    title: form.title.trim(),
    type: form.type,
    status: "intake",
    trade: form.trade,
    location: form.location.trim() || (form.type === "DAO Task" ? "DAO" : "Unassigned"),
    owner: form.type === "DAO Task" ? "Tolani DAO" : "Open construction partner",
    budgetUsd: Number.parseInt(form.budgetUsd, 10) || 0,
    rewardTut: Number.parseInt(form.rewardTut, 10) || 0,
    due: "Triage needed",
    priority: form.priority,
    crew: "Needs assignment",
    certification: "To be verified during intake",
    risk: "Scope, schedule, and approval path need confirmation",
    progress: 8,
    scope: "New work request created from the construction platform intake form.",
    deliverables: ["Scope confirmation", "Owner approval path", "Reward estimate"],
    dependencies: ["Task owner", "Budget approval", "Required credentials"],
    daoRequired: form.type === "DAO Task",
    flagged: false,
  };
}

function fromConvex(item: PersistedWorkItem): ConstructionWorkItem {
  return {
    _id: item._id,
    id: item.publicId,
    title: item.title,
    type: item.type,
    status: item.status,
    trade: item.trade,
    location: item.location,
    owner: item.owner,
    budgetUsd: item.budgetUsd,
    rewardTut: item.rewardTut,
    due: item.due,
    priority: item.priority,
    crew: item.crew,
    certification: item.certification,
    risk: item.risk,
    progress: item.progress,
    scope: item.scope,
    deliverables: item.deliverables,
    dependencies: item.dependencies,
    daoRequired: item.daoRequired,
    flagged: item.flagged,
  };
}

export default function BountiesPage() {
  const isConfigured = useIsConvexConfigured();
  return isConfigured ? <ConvexConstructionBoard /> : <LocalConstructionBoard />;
}

function LocalConstructionBoard() {
  const [workItems, setWorkItems] = useState(INITIAL_WORK);

  const actions: BoardActions = {
    create: (form, itemCount) => {
      const created = createLocalWorkItem(form, itemCount);
      setWorkItems((items) => [created, ...items]);
    },
    claim: (item) => {
      setWorkItems((items) =>
        items.map((current) =>
          current.id === item.id
            ? { ...current, status: "active", progress: statusProgress("active", current.progress) }
            : current
        )
      );
    },
    advance: (item) => {
      const status = nextStatus(item.status);
      setWorkItems((items) =>
        items.map((current) =>
          current.id === item.id
            ? { ...current, status, progress: statusProgress(status, current.progress) }
            : current
        )
      );
    },
    toggleFlag: (item) => {
      setWorkItems((items) =>
        items.map((current) =>
          current.id === item.id ? { ...current, flagged: !current.flagged } : current
        )
      );
    },
  };

  return (
    <ConstructionBoardView
      workItems={workItems}
      actions={actions}
      dataMode="Local draft mode"
      dataModeDetail="Set NEXT_PUBLIC_CONVEX_URL to switch this board to Convex persistence."
    />
  );
}

function ConvexConstructionBoard() {
  const { address } = useAccount();
  const persistedItems = useQuery(api.workItems.list, {});
  const create = useMutation(api.workItems.create);
  const claim = useMutation(api.workItems.claim);
  const updateStatus = useMutation(api.workItems.updateStatus);
  const toggleFlag = useMutation(api.workItems.toggleFlag);
  const seedDefaults = useMutation(api.workItems.seedDefaults);

  const workItems = useMemo(
    () => (persistedItems ?? []).map(fromConvex),
    [persistedItems]
  );

  const actions: BoardActions = {
    create: async (form) => {
      await create({
        title: form.title.trim(),
        type: form.type,
        trade: form.trade,
        location: form.location.trim() || (form.type === "DAO Task" ? "DAO" : "Unassigned"),
        budgetUsd: Number.parseInt(form.budgetUsd, 10) || 0,
        rewardTut: Number.parseInt(form.rewardTut, 10) || 0,
        priority: form.priority,
        createdByWallet: address,
      });
    },
    claim: async (item) => {
      if (!item._id) return;
      await claim({ id: item._id, wallet: address });
    },
    advance: async (item) => {
      if (!item._id) return;
      await updateStatus({ id: item._id, status: nextStatus(item.status) });
    },
    toggleFlag: async (item) => {
      if (!item._id) return;
      await toggleFlag({ id: item._id });
    },
    seedDefaults: async () => {
      await seedDefaults({});
    },
  };

  return (
    <ConstructionBoardView
      workItems={workItems.length ? workItems : INITIAL_WORK}
      actions={actions}
      isLoading={persistedItems === undefined}
      isSeedable={Boolean(persistedItems && workItems.length === 0)}
      dataMode="Convex persistence"
      dataModeDetail={
        persistedItems && workItems.length === 0
          ? "Convex is connected. Seed the board or create a new construction work item."
          : "Live work items are backed by Convex tables and mutations."
      }
    />
  );
}

function ConstructionBoardView({
  workItems,
  actions,
  dataMode,
  dataModeDetail,
  isLoading = false,
  isSeedable = false,
}: {
  workItems: ConstructionWorkItem[];
  actions: BoardActions;
  dataMode: string;
  dataModeDetail: string;
  isLoading?: boolean;
  isSeedable?: boolean;
}) {
  const [selectedId, setSelectedId] = useState(workItems[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [tradeFilter, setTradeFilter] = useState("All trades");
  const [typeFilter, setTypeFilter] = useState<"All" | WorkType>("All");
  const [priorityFilter, setPriorityFilter] = useState<"All" | Priority>("All");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return workItems.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          item.id,
          item.title,
          item.scope,
          item.trade,
          item.location,
          item.owner,
          item.certification,
          ...item.deliverables,
          ...item.dependencies,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesTrade = tradeFilter === "All trades" || item.trade === tradeFilter;
      const matchesType = typeFilter === "All" || item.type === typeFilter;
      const matchesPriority = priorityFilter === "All" || item.priority === priorityFilter;

      return matchesQuery && matchesTrade && matchesType && matchesPriority;
    });
  }, [priorityFilter, query, tradeFilter, typeFilter, workItems]);

  const selectedItem =
    workItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? workItems[0];
  const totalTut = workItems.reduce((sum, item) => sum + item.rewardTut, 0);
  const totalBudget = workItems.reduce((sum, item) => sum + item.budgetUsd, 0);
  const openJobs = workItems.filter((item) => item.type === "Open Job").length;
  const daoTasks = workItems.filter((item) => item.type === "DAO Task").length;
  const criticalItems = workItems.filter((item) => item.priority === "Critical").length;
  const activeItems = workItems.filter((item) => item.status === "active").length;

  const createWorkItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) return;

    await actions.create(form, workItems.length);
    setSelectedId(`${form.type === "Open Job" ? "JOB" : "DAO"}-${300 + workItems.length * 17}`);
    setForm(emptyForm);
    setShowCreate(false);
  };

  const kpis = [
    { label: "Open Jobs", value: openJobs.toString(), icon: Building2, tone: "text-cyan-300" },
    { label: "DAO Tasks", value: daoTasks.toString(), icon: ShieldCheck, tone: "text-emerald-300" },
    { label: "Active Crews", value: activeItems.toString(), icon: Users, tone: "text-blue-300" },
    { label: "TUT Available", value: `${formatNumber(totalTut, 0)} TUT`, icon: Target, tone: "text-amber-300" },
    { label: "Project Value", value: `$${formatNumber(totalBudget, 0)}`, icon: DollarSign, tone: "text-lime-300" },
    { label: "Critical Path", value: criticalItems.toString(), icon: AlertTriangle, tone: "text-red-300" },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-cyan-400/20 bg-gray-950">
        <div className="border-b border-gray-800 bg-gradient-to-r from-cyan-950/40 via-gray-950 to-amber-950/30 p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="info">Construction platform</Badge>
                <Badge variant="success">DAO work queue</Badge>
                <Badge variant="warning">{dataMode}</Badge>
              </div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                Construction Work Board
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
                Run open construction jobs, DAO tasks, BIM/Revit training support, field
                operations, estimating, permitting, and reward approvals from one work surface.
              </p>
              <p className="mt-2 text-xs text-cyan-200">{dataModeDetail}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {isSeedable && actions.seedDefaults && (
                <button
                  type="button"
                  onClick={() => actions.seedDefaults?.()}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                >
                  <Plus className="h-4 w-4" />
                  Seed board
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-gray-950 transition hover:bg-cyan-400"
              >
                <Plus className="h-4 w-4" />
                New work item
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("Open Job")}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-cyan-300/60"
              >
                <Building2 className="h-4 w-4" />
                Open jobs
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("DAO Task")}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-emerald-300/60"
              >
                <ShieldCheck className="h-4 w-4" />
                DAO tasks
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-gray-800/70 sm:grid-cols-2 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-gray-950 p-4">
              <div className="mb-3 flex items-center justify-between">
                <kpi.icon className={cn("h-5 w-5", kpi.tone)} />
                <span className="text-xs text-gray-500">{isLoading ? "Syncing" : "Live board"}</span>
              </div>
              <p className="text-xs uppercase text-gray-500">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{kpi.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-gray-800 bg-gray-950 p-4 lg:grid-cols-[1fr_180px_180px_180px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search jobs, DAO tasks, trades, deliverables..."
            className="h-10 w-full rounded-lg border border-gray-800 bg-gray-900 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-400/60"
          />
        </label>

        <label className="relative block">
          <Filter className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <select
            value={tradeFilter}
            onChange={(event) => setTradeFilter(event.target.value)}
            className="h-10 w-full rounded-lg border border-gray-800 bg-gray-900 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan-400/60"
          >
            {TRADES.map((trade) => (
              <option key={trade}>{trade}</option>
            ))}
          </select>
        </label>

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as "All" | WorkType)}
          className="h-10 rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
        >
          <option>All</option>
          <option>Open Job</option>
          <option>DAO Task</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value as "All" | Priority)}
          className="h-10 rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
        >
          <option>All</option>
          {PRIORITIES.map((priority) => (
            <option key={priority}>{priority}</option>
          ))}
        </select>
      </section>

      {showCreate && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-cyan-400/30 bg-gray-950 p-5"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Create construction work item</h2>
              <p className="mt-1 text-sm text-gray-500">
                Add an open job or DAO task to intake. It can move through estimating, ready, active, submitted, and review.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"
              aria-label="Close create form"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={createWorkItem} className="grid gap-3 lg:grid-cols-[1fr_150px_160px_160px_140px_140px_auto]">
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Work title"
              className="h-10 rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-cyan-400/60"
            />
            <select
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as WorkType }))}
              className="h-10 rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
            >
              <option>Open Job</option>
              <option>DAO Task</option>
            </select>
            <select
              value={form.trade}
              onChange={(event) => setForm((current) => ({ ...current, trade: event.target.value }))}
              className="h-10 rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
            >
              {TRADES.filter((trade) => trade !== "All trades").map((trade) => (
                <option key={trade}>{trade}</option>
              ))}
            </select>
            <input
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              placeholder="Location"
              className="h-10 rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-cyan-400/60"
            />
            <input
              value={form.rewardTut}
              onChange={(event) => setForm((current) => ({ ...current, rewardTut: event.target.value }))}
              placeholder="TUT"
              inputMode="numeric"
              className="h-10 rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-cyan-400/60"
            />
            <select
              value={form.priority}
              onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as Priority }))}
              className="h-10 rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
            >
              {PRIORITIES.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
            <button
              type="submit"
              className="h-10 rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-gray-950 transition hover:bg-cyan-400"
            >
              Add
            </button>
          </form>
        </motion.section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1180px] grid-cols-6 gap-3">
            {STATUS_COLUMNS.map((column) => {
              const laneItems = filteredItems.filter((item) => item.status === column.id);
              return (
                <div key={column.id} className="rounded-lg border border-gray-800 bg-gray-950">
                  <div className="border-b border-gray-800 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <column.icon className="h-4 w-4 text-cyan-300" />
                        <h2 className="text-sm font-semibold text-white">{column.title}</h2>
                      </div>
                      <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
                        {laneItems.length}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-gray-500">{column.description}</p>
                  </div>

                  <div className="space-y-3 p-3">
                    {laneItems.map((item) => (
                      <motion.button
                        key={item.id}
                        type="button"
                        whileHover={{ y: -2 }}
                        onClick={() => setSelectedId(item.id)}
                        className={cn(
                          "w-full rounded-lg border bg-gray-900/70 p-3 text-left transition hover:border-cyan-400/40",
                          selectedItem?.id === item.id ? "border-cyan-400/60" : "border-gray-800"
                        )}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <Badge variant={typeBadge(item.type)}>{item.type}</Badge>
                          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", priorityClass(item.priority))}>
                            {item.priority}
                          </span>
                        </div>
                        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-white">{item.title}</h3>
                        <div className="mt-3 space-y-2 text-xs text-gray-400">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-gray-500" />
                            {item.location}
                          </div>
                          <div className="flex items-center gap-2">
                            <Wrench className="h-3.5 w-3.5 text-gray-500" />
                            {item.trade}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-gray-500" />
                            {item.due}
                          </div>
                        </div>
                        <div className="mt-4">
                          <ProgressBar value={item.progress} variant={item.progress >= 75 ? "success" : "default"} />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="font-medium text-amber-300">{formatNumber(item.rewardTut, 0)} TUT</span>
                          {item.flagged && <AlertTriangle className="h-4 w-4 text-red-300" />}
                        </div>
                      </motion.button>
                    ))}
                    {!laneItems.length && (
                      <div className="rounded-lg border border-dashed border-gray-800 p-4 text-center text-xs text-gray-600">
                        No matching work.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedItem && (
          <aside className="rounded-lg border border-gray-800 bg-gray-950">
            <div className="border-b border-gray-800 p-5">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase text-gray-500">{selectedItem.id}</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">{selectedItem.title}</h2>
                </div>
                <Badge variant={typeBadge(selectedItem.type)}>{selectedItem.type}</Badge>
              </div>
              <p className="text-sm leading-6 text-gray-400">{selectedItem.scope}</p>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
                  <p className="text-xs text-gray-500">Reward</p>
                  <p className="mt-1 text-lg font-semibold text-amber-300">
                    {formatNumber(selectedItem.rewardTut, 0)} TUT
                  </p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
                  <p className="text-xs text-gray-500">Budget</p>
                  <p className="mt-1 text-lg font-semibold text-lime-300">
                    ${formatNumber(selectedItem.budgetUsd, 0)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 text-sm">
                {[
                  { label: "Trade", value: selectedItem.trade, icon: Wrench },
                  { label: "Location", value: selectedItem.location, icon: MapPin },
                  { label: "Owner", value: selectedItem.owner, icon: Users },
                  { label: "Crew", value: selectedItem.crew, icon: Hammer },
                  { label: "Credential", value: selectedItem.certification, icon: CheckCircle2 },
                  { label: "Due", value: selectedItem.due, icon: Calendar },
                ].map((row) => (
                  <div key={row.label} className="flex items-start gap-3">
                    <row.icon className="mt-0.5 h-4 w-4 text-cyan-300" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">{row.label}</p>
                      <p className="mt-0.5 text-gray-200">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs uppercase text-gray-500">Progress</p>
                  <p className="text-xs text-gray-300">{selectedItem.progress}%</p>
                </div>
                <ProgressBar value={selectedItem.progress} variant={selectedItem.progress >= 75 ? "success" : "default"} />
              </div>

              <div>
                <p className="mb-2 text-xs uppercase text-gray-500">Deliverables</p>
                <div className="space-y-2">
                  {selectedItem.deliverables.map((deliverable) => (
                    <div key={deliverable} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      {deliverable}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase text-gray-500">Dependencies</p>
                <div className="space-y-2">
                  {selectedItem.dependencies.map((dependency) => (
                    <div key={dependency} className="flex items-center gap-2 text-sm text-gray-300">
                      <Clock3 className="h-4 w-4 text-blue-300" />
                      {dependency}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-amber-400/20 bg-amber-950/20 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-300" />
                  <p className="text-sm font-semibold text-white">Risk note</p>
                </div>
                <p className="text-sm leading-6 text-gray-300">{selectedItem.risk}</p>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => actions.claim(selectedItem)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-gray-950 transition hover:bg-cyan-400"
                >
                  <Hammer className="h-4 w-4" />
                  Claim work
                </button>
                <button
                  type="button"
                  onClick={() => actions.advance(selectedItem)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-emerald-300/60"
                >
                  Advance status
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => actions.toggleFlag(selectedItem)}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition",
                    selectedItem.flagged
                      ? "border-red-400/40 bg-red-500/10 text-red-300"
                      : "border-gray-700 bg-gray-900 text-white hover:border-amber-300/60"
                  )}
                >
                  <AlertTriangle className="h-4 w-4" />
                  {selectedItem.flagged ? "Remove DAO flag" : "Flag for DAO review"}
                </button>
              </div>
            </div>
          </aside>
        )}
      </section>
    </div>
  );
}
