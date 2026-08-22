import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";
import { useToast } from "@/providers/ToastProvider";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { useResponsiveMetrics } from "@/theme/responsive";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";

import {
  Page,
  Card,
  Section,
  Field,
  Button,
  Pill,
  PrivacyToggle,
  formatCurrency,
  formatDate,
} from "@/components/migrated-page";
import {
  Badge,
  EmptyState,
  Table,
  TableCell,
  TableRow,
} from "@/components/data-surface";
import { HouseholdMemberSelect } from "@/components/household-member-select";
import { GroupedAccountSelect } from "@/components/grouped-account-select";
import {
  GroupedDestinationSelect,
  type DestinationSelection,
} from "@/components/grouped-destination-select";
import { DatePickerField as SharedDatePickerField } from "@/components/date-picker-field";
import { AttachmentPreview } from "@/components/attachment-preview";
import { useAuth } from "../../providers/AuthProvider";
import { useAccountsWithBalances } from "../../features/accounts/hooks";
import { useCategories } from "../../features/categories/hooks";
import { CategoryPicker } from "@/components/category-picker";
import { useHouseholdMemberDetails } from "../../features/households/hooks";
import { useTransactionMovementsInfinite, useTransactionMovementsSummary } from "../../features/transactions/hooks/useTransactions";
import { useCreateTransaction } from "../../features/transactions/hooks/useCreateTransaction";
import { useDeleteTransaction } from "../../features/transactions/hooks/useDeleteTransaction";
import { useDeleteCompletedTransfer } from "../../features/transactions/hooks/useDeleteCompletedTransfer";
import { useUpdateCompletedTransfer } from "../../features/transactions/hooks/useUpdateCompletedTransfer";
import { useCreateTransfer } from "../../features/transfers/hooks";
import { useUpdateTransaction } from "../../features/transactions/hooks/useUpdateTransaction";
import { useBulkUpdateTransactionCategories } from "../../features/transactions/hooks/useBulkUpdateTransactionCategories";
import { useBulkUpdateTransferCategories } from "../../features/transactions/hooks/useBulkUpdateTransferCategories";
import { useTransactionAttachments } from "../../features/transactions/attachments/useTransactionAttachments";
import { useTransactionCategorySuggestion } from "../../features/transactions/category-suggestions";
import { useTransactionTitleSuggestions } from "../../features/transactions/title-suggestions";
import { resolveCategorySelection } from "../../features/transactions/category-suggestions/selection";
import { validateTransactionAttachment } from "../../features/transactions/services/transaction.service";
import {
  compareTransactions,
  type TransactionListSortKey,
} from "../../features/transactions/utils/transaction-list";
import {
  movementAmountColor,
  movementAmountSign,
  movementIconBackground,
  resolveMovementKind,
} from "../../features/transactions/utils/transaction-amount";
import {
  getAddAnotherTransactionReset,
  getFreshTransactionCreateReset,
  getLocalCalendarDate,
  type TransactionCreateReset,
} from "../../features/transactions/utils/transaction-create-form";
import {
  SHARED_ACCOUNT_OWNER_KEY,
  getAccountOwnerToneIndex,
} from "../../features/accounts/account-ordering";
import { RecurringTransferCreateForm, TransfersContent } from "./transfers";
import { createStyles } from "@/features/transactions/ui-styles";
import { DropdownField, type DropdownFieldProps } from "@/features/transactions/components/dropdown-field";
import { DateFilterField, DatePickerField, formatDateInputValue, parseDateInputValue } from "@/features/transactions/components/transaction-date-field";
import { SplitAllocationsEditor, type SplitInputMode } from "@/features/transactions/components/split-allocations-editor";
import {
  useSavingPotAccountAssignments,
  useSavingPots,
} from "@/features/saving-pots/hooks";
import {
  useSaveTransactionAllocations,
  useTransactionAllocations,
} from "@/features/transactions/hooks/useTransactionAllocations";
import {
  allocationEntriesShareOneOwner,
  allocationEntryName,
  createEmptyAllocationDraft,
  resolveAllocationOwnerProfileId,
  validateAllocations,
  type AllocationDraft,
  type AllocationMovementEntry,
} from "@/features/transactions/utils/transaction-allocations";

type TransactionEditDraft = {
  id: string;
  title: string;
  amount: string;
  date: string;
  notes: string;
  type: "income" | "expense";
  accountId: string;
  categoryId: string | null;
  createdById: string;
};

type TransferEditDraft = {
  transferGroupId: string;
  title: string;
  amount: string;
  date: string;
  notes: string;
  sourceAccountId: string;
  destinationAccountId: string;
  categoryId: string | null;
};

type AttachmentDraft = {
  file: Blob | ArrayBuffer | File;
  fileName: string;
  fileSize: number;
  mimeType: string;
  previewUri: string;
};

const TRANSACTIONS_PAGE_SIZE = 25;

type WizardStepKey = "type" | "accounts" | "extras";

// "type" now covers both what used to be separate "type" and "details"
// (or "form", for recurring transfers) steps: choosing income/expense/
// transfer and filling in the title/amount/date/notes (or the recurring
// form) happen on the same first step, since picking a type with nothing
// else to look at felt like a wasted extra tap.
const WIZARD_STEP_COPY: Record<WizardStepKey, { titleKey: string; subtitleKey: string }> = {
  type: {
    titleKey: "transactions.wizard.stepTypeTitle",
    subtitleKey: "transactions.wizard.stepTypeSubtitle",
  },
  accounts: {
    titleKey: "transactions.wizard.stepAccountsTitle",
    subtitleKey: "transactions.wizard.stepAccountsSubtitle",
  },
  extras: {
    titleKey: "transactions.wizard.stepExtrasTitle",
    subtitleKey: "transactions.wizard.stepExtrasSubtitle",
  },
};

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);
  const responsive = useResponsiveMetrics();
  const { t } = useTranslation("common");
  const { show } = useToast();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const { householdId, profile } = useAuth();
  const accountsQuery = useAccountsWithBalances();
  const membersQuery = useHouseholdMemberDetails();
  const createTransaction = useCreateTransaction();
  const createTransfer = useCreateTransfer();
  const updateTransaction = useUpdateTransaction();
  const bulkUpdateCategories = useBulkUpdateTransactionCategories();
  const bulkUpdateTransferCategories = useBulkUpdateTransferCategories();
  const isBulkApplyPending =
    bulkUpdateCategories.isPending || bulkUpdateTransferCategories.isPending;
  const deleteTransaction = useDeleteTransaction();
  const deleteCompletedTransfer = useDeleteCompletedTransfer();
  const updateCompletedTransfer = useUpdateCompletedTransfer();
  const savingPotsQuery = useSavingPots();
  const splitPots = useMemo(
    () => (savingPotsQuery.data ?? []).map((pot) => ({ id: pot.id, name: pot.name })),
    [savingPotsQuery.data],
  );
  const saveTransactionAllocations = useSaveTransactionAllocations();
  // Which accounts/pots a split transaction is funded by is available on
  // the list row itself (list_transaction_movements' `allocations` column,
  // see 20260821090000_transaction_movements_allocations.sql) -- resolving
  // "whose money" for a pot allocation still needs the pot -> backing
  // account mapping, which the list doesn't carry per-row.
  const potAccountAssignmentsQuery = useSavingPotAccountAssignments();
  const potAccountAssignments = useMemo(
    () => potAccountAssignmentsQuery.data ?? [],
    [potAccountAssignmentsQuery.data],
  );
  const [expandedTransactionIds, setExpandedTransactionIds] = useState<
    Set<string>
  >(new Set());
  const toggleTransactionExpanded = useCallback((id: string) => {
    setExpandedTransactionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [createMovementKind, setCreateMovementKind] = useState<
    "transaction" | "transfer" | "recurring-transfer"
  >("transaction");
  const [transferDestination, setTransferDestination] =
    useState<DestinationSelection | null>(null);
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryIsAutomatic, setCategoryIsAutomatic] = useState(true);
  const [createdById, setCreatedById] = useState("");
  const [title, setTitle] = useState("");
  const [titleSuggestionsFocused, setTitleSuggestionsFocused] = useState(false);
  const [activeTitleSuggestion, setActiveTitleSuggestion] = useState(0);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => getLocalCalendarDate());
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitAllocations, setSplitAllocations] = useState<AllocationDraft[]>([]);
  const [splitInputMode, setSplitInputMode] = useState<SplitInputMode>("value");
  const [activeView, setActiveView] = useState<"activity" | "scheduled">(
    "activity",
  );
  // Defaults to "movements" (income + expense, transfers hidden) rather than
  // "all", since transfers between your own accounts usually just clutter
  // the activity list. "all" is still one tap away for anyone who wants
  // transfers back in the mix.
  const [filtersType, setFiltersType] = useState<
    "movements" | "all" | "income" | "expense" | "transfer"
  >("movements");
  const [accountFilter, setAccountFilter] = useState<"all" | string>("all");
  const [sourceAccountFilter, setSourceAccountFilter] = useState<
    "all" | string
  >("all");
  const [destinationAccountFilter, setDestinationAccountFilter] = useState<
    "all" | string
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "uncategorized" | string
  >("all");
  const [createdByFilter, setCreatedByFilter] = useState<"all" | string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [minAmountFilter, setMinAmountFilter] = useState("");
  const [maxAmountFilter, setMaxAmountFilter] = useState("");
  const [sortBy, setSortBy] = useState<TransactionListSortKey>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [editTransaction, setEditTransaction] =
    useState<TransactionEditDraft | null>(null);
  const editAttachmentsQuery = useTransactionAttachments(editTransaction?.id);
  const [editSplitEnabled, setEditSplitEnabled] = useState(false);
  const [editSplitAllocations, setEditSplitAllocations] = useState<AllocationDraft[]>([]);
  const [editSplitInputMode, setEditSplitInputMode] = useState<SplitInputMode>("value");
  // True when the transaction being edited already had allocations when the
  // edit modal opened -- distinguishes "user turned split off" (needs an
  // empty-array save to revert is_split) from "was never split and still
  // isn't" (nothing to save), so a plain non-split edit never fires an
  // extra round-trip.
  const [editSplitWasOriginallySplit, setEditSplitWasOriginallySplit] = useState(false);
  const editAllocationsQuery = useTransactionAllocations(editTransaction?.id, {
    enabled: !!editTransaction,
  });
  // Syncs the loaded allocations into local edit-draft state exactly once
  // per opened transaction (not on every background refetch, which would
  // otherwise clobber whatever the user is actively typing).
  const syncedEditAllocationsIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!editTransaction) {
      syncedEditAllocationsIdRef.current = null;
      return;
    }
    if (syncedEditAllocationsIdRef.current === editTransaction.id) return;
    if (editAllocationsQuery.isLoading) return;
    syncedEditAllocationsIdRef.current = editTransaction.id;
    const rows = editAllocationsQuery.data ?? [];
    if (rows.length > 0) {
      setEditSplitEnabled(true);
      setEditSplitWasOriginallySplit(true);
      setEditSplitAllocations(
        rows.map((row) => ({
          id: row.id,
          sourceType: row.source_type as "account" | "pot",
          accountId: row.account_id,
          potId: row.pot_id,
          amount: Number(row.amount),
        })),
      );
    } else {
      setEditSplitEnabled(false);
      setEditSplitWasOriginallySplit(false);
      setEditSplitAllocations([]);
    }
    setEditSplitInputMode("value");
  }, [editTransaction, editAllocationsQuery.data, editAllocationsQuery.isLoading]);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [transferToDelete, setTransferToDelete] = useState<any | null>(null);
  const [transferEdit, setTransferEdit] = useState<TransferEditDraft | null>(
    null,
  );
  const [bulkSelectionOpen, setBulkSelectionOpen] = useState(false);
  const [bulkSelectionType, setBulkSelectionType] = useState<
    "income" | "expense" | "transfer" | null
  >(null);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<
    Set<string>
  >(() => new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState("");

  // Debounce free-text search and amount inputs so every keystroke doesn't
  // fire its own network request -- the input fields themselves stay
  // immediate (searchFilter/minAmountFilter/maxAmountFilter), only the value
  // handed to the query is delayed.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchFilter.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchFilter]);
  const [debouncedMinAmount, setDebouncedMinAmount] = useState("");
  const [debouncedMaxAmount, setDebouncedMaxAmount] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMinAmount(minAmountFilter), 300);
    return () => clearTimeout(timer);
  }, [minAmountFilter]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMaxAmount(maxAmountFilter), 300);
    return () => clearTimeout(timer);
  }, [maxAmountFilter]);

  const parsedMinAmount = useMemo(() => {
    const trimmed = debouncedMinAmount.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [debouncedMinAmount]);
  const parsedMaxAmount = useMemo(() => {
    const trimmed = debouncedMaxAmount.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [debouncedMaxAmount]);

  // Shared by the infinite list query and the full-set summary query below --
  // both must see identical filters so the summary bar's totals always match
  // what's actually being listed.
  const movementFilters = useMemo(
    () => ({
      // The backend's "kind" filter only understands a single exact
      // movement_kind ("income" | "expense" | "transfer"), so there's no
      // server-side way to ask for "income and expense but not transfer" via
      // p_kind alone. For "movements" we instead fetch every kind (p_kind
      // left null) and set excludeTransfers so the RPC drops transfer rows
      // in its WHERE clause -- unlike the previous client-side post-filter,
      // this keeps every returned page correctly sized for infinite scroll.
      kind:
        filtersType === "all" || filtersType === "movements"
          ? undefined
          : filtersType,
      excludeTransfers: filtersType === "movements",
      accountId: accountFilter === "all" ? undefined : accountFilter,
      sourceAccountId:
        sourceAccountFilter === "all" ? undefined : sourceAccountFilter,
      destinationAccountId:
        destinationAccountFilter === "all"
          ? undefined
          : destinationAccountFilter,
      categoryId:
        categoryFilter === "all"
          ? undefined
          : categoryFilter === "uncategorized"
            ? null
            : categoryFilter,
      createdBy: createdByFilter === "all" ? undefined : createdByFilter,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      search: debouncedSearch || undefined,
      minAmount: parsedMinAmount,
      maxAmount: parsedMaxAmount,
    }),
    [
      filtersType,
      accountFilter,
      sourceAccountFilter,
      destinationAccountFilter,
      categoryFilter,
      createdByFilter,
      dateFrom,
      dateTo,
      debouncedSearch,
      parsedMinAmount,
      parsedMaxAmount,
    ],
  );

  const transactionsQuery = useTransactionMovementsInfinite(
    { ...movementFilters, sortBy },
    TRANSACTIONS_PAGE_SIZE,
  );
  const movementsSummaryQuery = useTransactionMovementsSummary(movementFilters);
  const activeCategoryType = editTransaction?.type ?? type;
  // A single fetch-all-types query, with every view-specific list (create
  // form, filter dropdown, transfer categories, bulk-edit) derived from it
  // client-side. Previously each of those was its own useCategories() call
  // (4 separate network round trips fetching heavily overlapping data) --
  // one query is enough since categories are cheap to hold in memory and
  // rarely change.
  const allCategoriesQuery = useCategories();
  const allCategories = useMemo(
    () => allCategoriesQuery.data ?? [],
    [allCategoriesQuery.data],
  );
  // Full flat lists (main categories + their subcategories) rather than
  // top-level-only — the shared CategoryPicker groups them into
  // expand/collapse sections itself, so every call site just hands it
  // whichever flat list makes sense for that context.
  const categories = useMemo(
    () => allCategories.filter((category: any) => category.type === activeCategoryType),
    [allCategories, activeCategoryType],
  );
  const bulkCategories = useMemo(
    () =>
      bulkSelectionType === "transfer"
        // Same rule as the single-transfer edit modal: a transfer's category
        // can be either an "account" category (its original purpose) or an
        // "expense" category (what a Monthly Budget allocation assigns).
        ? allCategories.filter(
            (category: any) => category.type === "account" || category.type === "expense",
          )
        : allCategories.filter((category: any) => category.type === bulkSelectionType),
    [allCategories, bulkSelectionType],
  );
  // Filter category list shown in the "Category" filter dropdown, with a
  // synthetic "uncategorized" entry prepended so it can live inside the
  // same unified picker as a selectable pseudo-category.
  const filterCategories = useMemo(() => {
    const source =
      filtersType === "transfer"
        // Transfers can carry either an "account" category (the original,
        // narrower "which external context" tag) or an "expense" category
        // (what a Monthly Budget allocation assigns, e.g. "Investments") --
        // both need to be selectable here or a categorized budget-generated
        // transfer could never be found through this filter.
        ? allCategories.filter((category: any) => category.type === "account" || category.type === "expense")
        : filtersType === "income" || filtersType === "expense"
          ? allCategories.filter((category: any) => category.type === filtersType)
          : allCategories.filter((category: any) => category.type !== "account");
    return [
      {
        id: "uncategorized",
        name: t("transactions.uncategorized"),
        icon: "help-circle-outline",
        parent_id: null,
      },
      ...source,
    ];
  }, [allCategories, filtersType, t]);

  const accounts = accountsQuery.data ?? [];
  const acceptedMembers = useMemo(
    () =>
      (membersQuery.data ?? []).filter(
        (member) => member.status === "accepted",
      ),
    [membersQuery.data],
  );
  // In a single-member household, "Account owner" and "Created by" are
  // always the same person on every row -- the columns carry no
  // information, just extra height per row (especially on the mobile card
  // layout, where every column becomes its own labeled line). Hide them
  // there; multi-member households keep both, where they're genuinely
  // useful.
  const isSingleMemberHousehold = acceptedMembers.length <= 1;
  const accountMemberOptions = useMemo(
    () =>
      acceptedMembers.map((member) => ({
        id: member.userId,
        label: member.fullName?.trim() || member.email || member.userId,
      })),
    [acceptedMembers],
  );
  const transactions = useMemo(() => {
    const rowsById = new Map<string, any>();
    for (const page of transactionsQuery.data?.pages ?? []) {
      for (const item of page ?? []) {
        if (item?.movement_id) {
          rowsById.set(item.movement_id, {
            ...item,
            id: item.movement_id,
            type: item.movement_kind,
          });
        }
      }
    }

    // The RPC already excludes transfers server-side for "movements" (via
    // excludeTransfers), so this is now a defensive no-op rather than the
    // primary filter -- kept in case a stale cached page ever slips through.
    const rows =
      filtersType === "movements"
        ? [...rowsById.values()].filter(
            (row) => row.movement_kind !== "transfer",
          )
        : [...rowsById.values()];

    rows.sort((a: any, b: any) => compareTransactions(a, b, sortBy));

    return rows;
  }, [filtersType, sortBy, transactionsQuery.data]);
  const memberLabelMap = new Map(
    acceptedMembers.map((member) => [
      member.userId,
      member.fullName?.trim() || member.email || member.userId,
    ]),
  );
  const ownerOrder = [
    ...acceptedMembers.map((member) => member.userId),
    SHARED_ACCOUNT_OWNER_KEY,
  ];
  const ownerTones = [
    { accent: colors.primary, surface: colors.primarySoft },
    { accent: colors.financialPositive, surface: colors.financialPositiveSoft },
    { accent: colors.financialNeutral, surface: colors.financialNeutralSoft },
    {
      accent: colors.financialAttention,
      surface: colors.financialAttentionSoft,
    },
    { accent: colors.financialGoal, surface: colors.financialGoalSoft },
  ];
  const filterItemWidth =
    responsive.width >= 1500
      ? "31.8%"
      : responsive.width >= 700
        ? "48.8%"
        : "100%";
  const currentUserLabel =
    profile?.full_name?.trim() || profile?.email?.trim() || t("settings.you");
  const currentUserId = profile?.id ?? "";
  const firstAccount = accounts[0]?.id ?? "";
  const parsedAmount = Number(amount);
  const effectiveAccountId = accountId || firstAccount;
  const titleSuggestions = useTransactionTitleSuggestions({
    title,
    transactionType: type,
    accountId: effectiveAccountId || null,
    enabled: createModalOpen && titleSuggestionsFocused,
  });
  const visibleTitleSuggestions = titleSuggestions.data ?? [];
  const selectedCreatorLabel =
    createdByFilter === "all"
      ? t("all", { defaultValue: "All" })
      : createdByFilter === currentUserId || createdByFilter === ""
        ? currentUserLabel
        : (memberLabelMap.get(createdByFilter) ?? t("settings.unnamedUser"));

  // Every non-default filter gets a removable chip so it stays visible even
  // once the filter panel is collapsed, plus a single "Clear all" action --
  // otherwise a forgotten narrow filter (e.g. a stale date range) silently
  // hides transactions with no visible explanation.
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filtersType !== "movements") {
      chips.push({
        key: "filtersType",
        label: t(`transactions.filters.${filtersType}`),
        onClear: () => setFiltersType("movements"),
      });
    }
    if (sortBy !== "newest") {
      chips.push({
        key: "sortBy",
        label: `${t("transactions.sortBy")}: ${t(`transactions.sorts.${sortBy}`)}`,
        onClear: () => setSortBy("newest"),
      });
    }
    if (accountFilter !== "all") {
      const account = (accounts as any[]).find(
        (entry) => entry.id === accountFilter,
      );
      chips.push({
        key: "account",
        label: `${t("transactions.account")}: ${account?.name ?? accountFilter}`,
        onClear: () => setAccountFilter("all"),
      });
    }
    if (filtersType === "transfer" && sourceAccountFilter !== "all") {
      const account = (accounts as any[]).find(
        (entry) => entry.id === sourceAccountFilter,
      );
      chips.push({
        key: "sourceAccount",
        label: `${t("transactions.sourceAccount")}: ${account?.name ?? sourceAccountFilter}`,
        onClear: () => setSourceAccountFilter("all"),
      });
    }
    if (filtersType === "transfer" && destinationAccountFilter !== "all") {
      const account = (accounts as any[]).find(
        (entry) => entry.id === destinationAccountFilter,
      );
      chips.push({
        key: "destinationAccount",
        label: `${t("transactions.destinationAccount")}: ${account?.name ?? destinationAccountFilter}`,
        onClear: () => setDestinationAccountFilter("all"),
      });
    }
    if (categoryFilter !== "all") {
      const category = (filterCategories as any[]).find(
        (entry) => entry.id === categoryFilter,
      );
      chips.push({
        key: "category",
        label: `${t("transactions.categoryFilter")}: ${category?.name ?? t("transactions.uncategorized")}`,
        onClear: () => setCategoryFilter("all"),
      });
    }
    if (createdByFilter !== "all") {
      chips.push({
        key: "createdBy",
        label: `${t("transactions.createdBy")}: ${selectedCreatorLabel}`,
        onClear: () => setCreatedByFilter("all"),
      });
    }
    if (dateFrom) {
      chips.push({
        key: "dateFrom",
        label: `${t("transactions.dateFrom")}: ${dateFrom}`,
        onClear: () => setDateFrom(""),
      });
    }
    if (dateTo) {
      chips.push({
        key: "dateTo",
        label: `${t("transactions.dateTo")}: ${dateTo}`,
        onClear: () => setDateTo(""),
      });
    }
    if (searchFilter.trim()) {
      chips.push({
        key: "search",
        label: `${t("transactions.searchLabel")}: ${searchFilter.trim()}`,
        onClear: () => setSearchFilter(""),
      });
    }
    if (minAmountFilter.trim()) {
      chips.push({
        key: "minAmount",
        label: `${t("transactions.minAmountLabel")}: ${minAmountFilter.trim()}`,
        onClear: () => setMinAmountFilter(""),
      });
    }
    if (maxAmountFilter.trim()) {
      chips.push({
        key: "maxAmount",
        label: `${t("transactions.maxAmountLabel")}: ${maxAmountFilter.trim()}`,
        onClear: () => setMaxAmountFilter(""),
      });
    }
    return chips;
  }, [
    filtersType,
    sortBy,
    accountFilter,
    sourceAccountFilter,
    destinationAccountFilter,
    categoryFilter,
    createdByFilter,
    dateFrom,
    dateTo,
    searchFilter,
    minAmountFilter,
    maxAmountFilter,
    accounts,
    filterCategories,
    selectedCreatorLabel,
    t,
  ]);

  function clearAllFilters() {
    setFiltersType("movements");
    setAccountFilter("all");
    setSourceAccountFilter("all");
    setDestinationAccountFilter("all");
    setCategoryFilter("all");
    setCreatedByFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearchFilter("");
    setMinAmountFilter("");
    setMaxAmountFilter("");
  }
  const effectiveCreatedById = createdById || currentUserId;
  const categorySuggestion = useTransactionCategorySuggestion({
    title,
    transactionType: type,
    accountId: effectiveAccountId || null,
    enabled: createModalOpen && categoryIsAutomatic,
  });
  const effectiveCategoryId = resolveCategorySelection({
    currentCategoryId: categoryId,
    automatic: categoryIsAutomatic,
    suggestion: categorySuggestion.data,
  });
  const selectedCreateCreatorLabel =
    effectiveCreatedById === currentUserId
      ? currentUserLabel
      : (memberLabelMap.get(effectiveCreatedById) ?? t("settings.unnamedUser"));
  const splitValidationErrors = useMemo(
    () =>
      splitEnabled && Number.isFinite(parsedAmount)
        ? validateAllocations(parsedAmount, splitAllocations)
        : [],
    [splitEnabled, parsedAmount, splitAllocations],
  );
  const canCreateTransaction =
    !createTransaction.isPending &&
    !saveTransactionAllocations.isPending &&
    Boolean(householdId) &&
    Boolean(profile?.id) &&
    Boolean(effectiveAccountId) &&
    title.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    (!splitEnabled || splitValidationErrors.length === 0);
  const canCreateMovement =
    canCreateTransaction &&
    (createMovementKind === "transaction" ||
      (Boolean(transferDestination?.id) &&
        transferDestination?.id !== effectiveAccountId));

  // The "Add movement" modal is a short step-by-step wizard rather than one
  // long scrolling form. Which steps exist depends on what kind of movement
  // is being created: a recurring transfer hands off entirely to its own
  // form (it already has its own save button and validation) with no
  // further steps, a one-off transfer skips the category/attachment step
  // since neither applies to transfers, and a plain transaction gets the
  // full set.
  const wizardSteps = useMemo<WizardStepKey[]>(() => {
    if (createMovementKind === "recurring-transfer") return ["type"];
    if (createMovementKind === "transfer") return ["type", "accounts"];
    return ["type", "accounts", "extras"];
  }, [createMovementKind]);
  const currentWizardStep = Math.min(wizardStep, wizardSteps.length - 1);
  const currentWizardStepKey = wizardSteps[currentWizardStep];
  const isLastWizardStep = currentWizardStep === wizardSteps.length - 1;
  const canProceedFromDetailsStep =
    title.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date);
  const canProceedFromAccountsStep =
    Boolean(effectiveAccountId) &&
    (createMovementKind !== "transfer" ||
      (Boolean(transferDestination?.id) &&
        transferDestination?.id !== effectiveAccountId));
  const canProceedFromCurrentStep =
    currentWizardStepKey === "type"
      ? createMovementKind === "recurring-transfer" || canProceedFromDetailsStep
      : currentWizardStepKey === "accounts"
        ? canProceedFromAccountsStep
        : true;

  function goToWizardStep(nextStep: number) {
    setWizardStep(Math.max(0, Math.min(nextStep, wizardSteps.length - 1)));
  }

  const getTransactionAccount = (item: any) => {
    const account =
      item.movement_kind === "transfer"
        ? (item.source_account ??
          (accounts as any[]).find(
            (entry) => entry.id === item.source_account_id,
          ))
        : ((accounts as any[]).find((entry) => entry.id === item.account_id) ??
          item.account);
    return account ?? null;
  };
  const getTransactionAccountLabel = (item: any) =>
    getTransactionAccount(item)?.name ?? t("transactions.account");
  const getTransactionAccountOwnerLabel = (item: any) => {
    const ownerId = getTransactionAccount(item)?.owner_profile_id;
    return ownerId
      ? (memberLabelMap.get(ownerId) ?? t("settings.unnamedUser"))
      : t("dashboard.shared");
  };
  const getTransactionAccountOwnerTone = (item: any) => {
    const ownerId = getTransactionAccount(item)?.owner_profile_id;
    const toneIndex = getAccountOwnerToneIndex(
      ownerId,
      ownerOrder,
      ownerTones.length,
    );

    return ownerTones[toneIndex];
  };
  const getTransactionCreatorLabel = (item: any) => {
    const creatorId = item.created_by_profile?.id ?? item.created_by;

    return creatorId === profile?.id
      ? currentUserLabel
      : (memberLabelMap.get(creatorId) ??
          item.created_by_profile?.full_name ??
          t("settings.unnamedUser"));
  };
  // ------------------------------------------------------------
  // Split / multi-account transaction detail (the `allocations` column
  // list_transaction_movements returns for split rows -- see
  // 20260821090000_transaction_movements_allocations.sql).
  // ------------------------------------------------------------
  const accountOwnerById = useMemo(
    () =>
      new Map(
        (accounts as any[]).map((account) => [
          account.id,
          account.owner_profile_id ?? null,
        ]),
      ),
    [accounts],
  );
  const getAllocationEntries = (item: any): AllocationMovementEntry[] =>
    Array.isArray(item.allocations) ? (item.allocations as AllocationMovementEntry[]) : [];
  const getAllocationMemberLabel = (entry: AllocationMovementEntry) => {
    const ownerId = resolveAllocationOwnerProfileId(
      entry,
      potAccountAssignments,
      accountOwnerById,
    );
    if (!ownerId) return t("dashboard.shared");
    if (ownerId === profile?.id) return currentUserLabel;
    return memberLabelMap.get(ownerId) ?? t("settings.unnamedUser");
  };
  const getSplitOwnerSummaryLabel = (item: any) => {
    const entries = getAllocationEntries(item);
    if (entries.length === 0) return getTransactionAccountOwnerLabel(item);
    return allocationEntriesShareOneOwner(entries, potAccountAssignments, accountOwnerById)
      ? getAllocationMemberLabel(entries[0])
      : t("transactions.split.multipleMembers");
  };
  const getCategoryBreadcrumb = (item: any, movementKind: string) => {
    if (!item.category) {
      return movementKind === "transfer"
        ? t("transactions.filters.transfer")
        : t("transactions.uncategorized");
    }
    const category = (categories as any[]).find((c) => c.id === item.category.id);
    const parent = category?.parent_id
      ? (categories as any[]).find((c) => c.id === category.parent_id)
      : null;
    return parent ? `${parent.name} › ${category?.name ?? item.category.name}` : (category?.name ?? item.category.name);
  };
  const handleTransactionsScroll = useCallback(
    (event: any) => {
      if (
        activeView !== "activity" ||
        !transactionsQuery.hasNextPage ||
        transactionsQuery.isFetchingNextPage
      )
        return;

      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (layoutMeasurement.height + contentOffset.y);

      if (distanceFromBottom < 240) {
        void transactionsQuery.fetchNextPage();
      }
    },
    [activeView, transactionsQuery],
  );

  function closeBulkSelection() {
    setBulkSelectionOpen(false);
    setBulkSelectionType(null);
    setSelectedTransactionIds(new Set());
    setBulkCategoryId("");
  }

  // A row's bulk-selection "type" -- what has to match for it to be
  // selectable alongside whatever's already selected. Transfers get their
  // own bucket ("transfer") distinct from the income/expense type of either
  // leg, since a transfer's category rules (account/expense-type only) and
  // the RPC that applies them are entirely separate from a plain
  // transaction's.
  function getBulkItemType(item: any): "income" | "expense" | "transfer" {
    return item.movement_kind === "transfer" ? "transfer" : item.type;
  }

  function openBulkSelection() {
    setBulkSelectionOpen(true);
    setBulkSelectionType(
      filtersType === "income" ||
        filtersType === "expense" ||
        filtersType === "transfer"
        ? filtersType
        : null,
    );
    setSelectedTransactionIds(new Set());
    setBulkCategoryId("");
  }

  function toggleBulkTransaction(item: any) {
    const itemType = getBulkItemType(item);
    if (bulkSelectionType && bulkSelectionType !== itemType) return;

    setBulkSelectionType((current) => current ?? itemType);
    setSelectedTransactionIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      if (next.size === 0) {
        setBulkSelectionType(
          filtersType === "income" ||
            filtersType === "expense" ||
            filtersType === "transfer"
            ? filtersType
            : null,
        );
        setBulkCategoryId("");
      }
      return next;
    });
  }

  function selectLoadedBulkTransactions() {
    if (!bulkSelectionType) return;
    setSelectedTransactionIds(
      new Set(
        transactions
          .filter((item: any) => getBulkItemType(item) === bulkSelectionType)
          .map((item: any) => item.id),
      ),
    );
  }

  async function applyBulkCategory(categoryId: string | null) {
    if (!householdId || selectedTransactionIds.size === 0) return;
    const selectedCount = selectedTransactionIds.size;
    try {
      // Transfer rows carry the transfer_group_id as their `id` (see
      // list_transaction_movements), so the selected-id set doubles as the
      // group-id list the transfer RPC needs -- no separate lookup required.
      const updatedCount =
        bulkSelectionType === "transfer"
          ? await bulkUpdateTransferCategories.mutateAsync({
              householdId,
              transferGroupIds: [...selectedTransactionIds],
              categoryId,
            })
          : await bulkUpdateCategories.mutateAsync({
              householdId,
              transactionIds: [...selectedTransactionIds],
              categoryId,
            });
      closeBulkSelection();
      show(
        t("transactions.bulk.success", {
          count: updatedCount ?? selectedCount,
        }),
      );
    } catch (error) {
      show(
        t("transactions.bulk.error", {
          detail: error instanceof Error ? error.message : t("unknownError"),
        }),
      );
    }
  }

  async function handlePickAttachment() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
      multiple: false,
      base64: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const file = asset.file ?? (await (await fetch(asset.uri)).blob());
    const draft = {
      file,
      fileName: asset.name ?? `invoice-${Date.now()}`,
      fileSize: asset.size ?? ("size" in file ? file.size : 0),
      mimeType:
        asset.mimeType ??
        ("type" in file ? file.type : "application/octet-stream"),
      previewUri: asset.uri,
    };

    validateTransactionAttachment(draft);
    setAttachment(draft);
  }

  function applyCreateFormReset(reset: TransactionCreateReset) {
    setCategoryIsAutomatic(true);
    setType(reset.type);
    setAccountId(reset.accountId);
    setCategoryId(reset.categoryId);
    setCreatedById(reset.createdById);
    setTitle(reset.title);
    setAmount(reset.amount);
    setDate(reset.date);
    setNotes(reset.notes);
    setAttachment(reset.attachment);
    setSplitEnabled(false);
    setSplitAllocations([]);
    setSplitInputMode("value");
  }

  function openCreateTransaction() {
    applyCreateFormReset(getFreshTransactionCreateReset());
    setCreateMovementKind("transaction");
    setTransferDestination(null);
    setWizardStep(0);
    setCreateModalOpen(true);
  }

  function closeCreateModal() {
    setCreateModalOpen(false);
    setWizardStep(0);
  }

  async function handleCreate(keepOpen = false) {
    if (
      !householdId ||
      !profile?.id ||
      !effectiveAccountId ||
      !title.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    )
      return;
    if (createMovementKind === "transfer") {
      if (!transferDestination || transferDestination.id === effectiveAccountId)
        return;
      await createTransfer.mutateAsync({
        householdId,
        fromAccountId: effectiveAccountId,
        toAccountId: transferDestination.id,
        amount: parsedAmount,
        title: title.trim(),
        notes,
        transactionDate: date,
        createdBy: effectiveCreatedById || profile.id,
        categoryId: null,
      });
    } else {
      if (splitEnabled && validateAllocations(parsedAmount, splitAllocations).length > 0) {
        return;
      }

      const created = await createTransaction.mutateAsync({
        household_id: householdId,
        created_by: createdById || profile.id,
        account_id: effectiveAccountId,
        category_id: effectiveCategoryId,
        type,
        title: title.trim(),
        amount: parsedAmount,
        notes: notes || null,
        transaction_date: date,
        attachment,
      } as any);

      if (splitEnabled && created?.id) {
        await saveTransactionAllocations.mutateAsync({
          transactionId: created.id,
          totalAmount: parsedAmount,
          allocations: splitAllocations,
        });
      }
    }

    if (keepOpen) {
      applyCreateFormReset(
        getAddAnotherTransactionReset({
          accountId: effectiveAccountId,
          createdById: effectiveCreatedById,
          date,
          type,
        }),
      );
      setTransferDestination(null);
      setWizardStep(0);
      return;
    }

    applyCreateFormReset(getFreshTransactionCreateReset());
    setTransferDestination(null);
    closeCreateModal();
  }

  function closeEditTransaction() {
    setDeleteConfirmationOpen(false);
    setEditTransaction(null);
  }

  function openEditTransaction(item: any) {
    setDeleteConfirmationOpen(false);
    setEditTransaction({
      id: item.id,
      title: item.title ?? "",
      amount: String(item.amount ?? ""),
      date: item.transaction_date?.slice?.(0, 10) ?? getLocalCalendarDate(),
      notes: item.notes ?? "",
      type: item.type ?? "expense",
      accountId: item.account_id ?? "",
      categoryId: item.category_id ?? null,
      createdById:
        item.created_by_profile?.id ?? item.created_by ?? profile?.id ?? "",
    });
  }

  async function handleDeleteEditedTransaction() {
    if (!editTransaction) return;
    await deleteTransaction.mutateAsync(editTransaction.id);
    setDeleteConfirmationOpen(false);
    closeEditTransaction();
  }

  async function handleSaveTransaction() {
    if (!editTransaction || !householdId) return;

    const nextAmount = Number(editTransaction.amount);
    if (
      !editTransaction.title.trim() ||
      !editTransaction.accountId ||
      !Number.isFinite(nextAmount) ||
      nextAmount <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(editTransaction.date)
    ) {
      return;
    }

    if (
      editSplitEnabled &&
      validateAllocations(nextAmount, editSplitAllocations).length > 0
    ) {
      return;
    }

    await updateTransaction.mutateAsync({
      id: editTransaction.id,
      data: {
        title: editTransaction.title.trim(),
        amount: nextAmount,
        transaction_date: editTransaction.date,
        notes: editTransaction.notes || null,
        type: editTransaction.type,
        account_id: editTransaction.accountId,
        category_id: editTransaction.categoryId,
        created_by:
          editTransaction.createdById ||
          profile?.id ||
          editTransaction.createdById,
      } as any,
    });

    // The transaction's own amount just changed above; keep the funding-
    // source breakdown consistent with it (see
    // TransactionAllocationsService.replace's ordering-contract docstring).
    // `editSplitWasOriginallySplit` covers the "user just turned split off"
    // case, where this write clears out the previously-saved allocations.
    if (editSplitEnabled || editSplitWasOriginallySplit) {
      await saveTransactionAllocations.mutateAsync({
        transactionId: editTransaction.id,
        totalAmount: nextAmount,
        allocations: editSplitEnabled ? editSplitAllocations : [],
      });
    }

    setEditTransaction(null);
  }

  async function handleSaveTransfer() {
    if (!transferEdit) return;
    const nextAmount = Number(transferEdit.amount);
    if (
      !transferEdit.title.trim() ||
      !transferEdit.sourceAccountId ||
      !transferEdit.destinationAccountId ||
      transferEdit.sourceAccountId === transferEdit.destinationAccountId ||
      !Number.isFinite(nextAmount) ||
      nextAmount <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(transferEdit.date)
    )
      return;

    await updateCompletedTransfer.mutateAsync({
      transferGroupId: transferEdit.transferGroupId,
      sourceAccountId: transferEdit.sourceAccountId,
      destinationAccountId: transferEdit.destinationAccountId,
      amount: nextAmount,
      title: transferEdit.title.trim(),
      notes: transferEdit.notes || null,
      transactionDate: transferEdit.date,
      categoryId: transferEdit.categoryId,
    });
    setTransferEdit(null);
  }

  const latestSectionSubtitle =
    movementsSummaryQuery.data &&
    transactions.length < movementsSummaryQuery.data.movement_count
      ? t("transactions.latestSubtitleLoaded", {
          loaded: transactions.length,
          total: movementsSummaryQuery.data.movement_count,
        })
      : t("transactions.latestSubtitle", { count: transactions.length });

  return (
    <Page
      title={t("transactions.title")}
      subtitle={t("transactions.subtitle")}
      scrollViewProps={{
        onScroll: handleTransactionsScroll,
        scrollEventThrottle: 16,
      }}
      overlay={
        <Pressable
          accessibilityRole="button"
          onPress={openCreateTransaction}
          style={({ pressed }) =>
            [styles.floatingCreateButton, pressed && styles.pressed] as any
          }
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={colors.primaryForeground}
          />
          <Text style={styles.floatingCreateButtonText}>
            {t("transactions.addTransaction")}
          </Text>
        </Pressable>
      }
    >
      <View style={styles.viewTabs}>
        <Pill
          label={t("transactions.views.activity")}
          active={activeView === "activity"}
          onPress={() => setActiveView("activity")}
        />
        <Pill
          label={t("transactions.views.scheduled")}
          active={activeView === "scheduled"}
          onPress={() => setActiveView("scheduled")}
        />
      </View>

      {activeView === "activity" ? (
        <>
          <Card>
            <Section
              title={t("transactions.filtersTitle")}
              subtitle={
                filtersOpen
                  ? t("transactions.filtersSubtitle")
                  : t("transactions.filtersCollapsed")
              }
              action={
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setFiltersOpen((current) => !current)}
                  style={[
                    styles.filterToggle,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceMuted,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      filtersOpen
                        ? "chevron-up-outline"
                        : "chevron-down-outline"
                    }
                    size={18}
                    color={colors.text}
                  />
                  <Text
                    style={[styles.filterToggleLabel, { color: colors.text }]}
                  >
                    {filtersOpen
                      ? t("transactions.hideFilters")
                      : t("transactions.showFilters")}
                  </Text>
                </Pressable>
              }
            >
              <View style={styles.alwaysVisibleSearchRow}>
                <Field
                  label={t("transactions.searchLabel")}
                  value={searchFilter}
                  onChangeText={setSearchFilter}
                  placeholder={t("transactions.searchPlaceholder")}
                />
              </View>
              {activeFilterChips.length > 0 ? (
                <View style={styles.activeFiltersRow}>
                  {activeFilterChips.map((chip) => (
                    <Pressable
                      key={chip.key}
                      accessibilityRole="button"
                      onPress={chip.onClear}
                      style={styles.activeFilterChip}
                    >
                      <Text style={styles.activeFilterChipText}>
                        {chip.label}
                      </Text>
                      <Ionicons
                        name="close-circle"
                        size={14}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  ))}
                  <Pressable
                    accessibilityRole="button"
                    onPress={clearAllFilters}
                    style={styles.clearAllButton}
                  >
                    <Text style={styles.clearAllButtonText}>
                      {t("transactions.clearAllFilters")}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              {filtersOpen ? (
                <View style={styles.filtersGrid}>
                  <View
                    style={[
                      styles.filterGridItem,
                      styles.filterChoiceGroup,
                      {
                        flexBasis: filterItemWidth,
                        maxWidth: filterItemWidth,
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceMuted,
                      },
                    ]}
                  >
                    <View style={styles.filterGroupLabel}>
                      <Ionicons
                        name="funnel-outline"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.filterGroupLabelText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("transactions.filterType")}
                      </Text>
                    </View>
                    <View style={styles.filterPills}>
                      {(
                        [
                          "movements",
                          "all",
                          "income",
                          "expense",
                          "transfer",
                        ] as const
                      ).map(
                        (item) => (
                          <Pill
                            key={item}
                            label={t(`transactions.filters.${item}`)}
                            active={filtersType === item}
                            onPress={() => {
                              setFiltersType(item);
                              setCategoryFilter("all");
                              if (item !== "transfer") {
                                setSourceAccountFilter("all");
                                setDestinationAccountFilter("all");
                              } else {
                                setAccountFilter("all");
                              }
                            }}
                          />
                        ),
                      )}
                    </View>
                  </View>
                  {filtersType === "transfer" ? (
                    <>
                      <View
                        style={[
                          styles.filterGridItem,
                          {
                            flexBasis: filterItemWidth,
                            maxWidth: filterItemWidth,
                          },
                        ]}
                      >
                        <GroupedAccountSelect
                          label={t("transactions.sourceAccount")}
                          accounts={accounts as any}
                          members={acceptedMembers as any}
                          value={sourceAccountFilter}
                          placeholder={t("transactions.allSourceAccounts")}
                          hint={t("transactions.sourceAccountHint")}
                          onChange={setSourceAccountFilter}
                          closeLabel={t("close", { defaultValue: "Close" })}
                          sharedLabel={t("dashboard.shared")}
                          unassignedLabel={t("settings.unnamedUser")}
                          allOption={{
                            value: "all",
                            label: t("transactions.allSourceAccounts"),
                          }}
                          typeLabels={{
                            bank: t("accounts.types.bank"),
                            cash: t("accounts.types.cash"),
                            savings: t("accounts.types.savings"),
                            credit_card: t("accounts.types.credit_card"),
                            investment: t("accounts.types.investment"),
                            ppr: t("accounts.types.ppr"),
                          }}
                        />
                      </View>
                      <View
                        style={[
                          styles.filterGridItem,
                          {
                            flexBasis: filterItemWidth,
                            maxWidth: filterItemWidth,
                          },
                        ]}
                      >
                        <GroupedAccountSelect
                          label={t("transactions.destinationAccount")}
                          accounts={accounts as any}
                          members={acceptedMembers as any}
                          value={destinationAccountFilter}
                          placeholder={t("transactions.allDestinationAccounts")}
                          hint={t("transactions.destinationAccountHint")}
                          onChange={setDestinationAccountFilter}
                          closeLabel={t("close", { defaultValue: "Close" })}
                          sharedLabel={t("dashboard.shared")}
                          unassignedLabel={t("settings.unnamedUser")}
                          allOption={{
                            value: "all",
                            label: t("transactions.allDestinationAccounts"),
                          }}
                          typeLabels={{
                            bank: t("accounts.types.bank"),
                            cash: t("accounts.types.cash"),
                            savings: t("accounts.types.savings"),
                            credit_card: t("accounts.types.credit_card"),
                            investment: t("accounts.types.investment"),
                            ppr: t("accounts.types.ppr"),
                          }}
                        />
                      </View>
                    </>
                  ) : null}
                  <View
                    style={[
                      styles.filterGridItem,
                      styles.filterChoiceGroup,
                      {
                        flexBasis: filterItemWidth,
                        maxWidth: filterItemWidth,
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceMuted,
                      },
                    ]}
                  >
                    <View style={styles.filterGroupLabel}>
                      <Ionicons
                        name="swap-vertical-outline"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.filterGroupLabelText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("transactions.sortBy")}
                      </Text>
                    </View>
                    <View style={styles.filterPills}>
                      {(
                        [
                          "newest",
                          "oldest",
                          "amount_desc",
                          "amount_asc",
                          "title_asc",
                          "title_desc",
                        ] as const
                      ).map((item) => (
                        <Pill
                          key={item}
                          label={t(`transactions.sorts.${item}`)}
                          active={sortBy === item}
                          onPress={() => setSortBy(item)}
                        />
                      ))}
                    </View>
                  </View>
                  {filtersType !== "transfer" ? (
                    <View
                      style={[
                        styles.filterGridItem,
                        {
                          flexBasis: filterItemWidth,
                          maxWidth: filterItemWidth,
                        },
                      ]}
                    >
                      <GroupedAccountSelect
                        label={t("transactions.account")}
                        accounts={accounts as any}
                        members={acceptedMembers as any}
                        value={accountFilter}
                        placeholder={t("transactions.allAccounts")}
                        hint={t("transactions.selectAccountHint", {
                          defaultValue: t("transactions.account"),
                        })}
                        onChange={setAccountFilter}
                        closeLabel={t("close", { defaultValue: "Close" })}
                        sharedLabel={t("dashboard.shared")}
                        unassignedLabel={t("settings.unnamedUser")}
                        allOption={{
                          value: "all",
                          label: t("transactions.allAccounts"),
                        }}
                        typeLabels={{
                          bank: t("accounts.types.bank"),
                          cash: t("accounts.types.cash"),
                          savings: t("accounts.types.savings"),
                          credit_card: t("accounts.types.credit_card"),
                          investment: t("accounts.types.investment"),
                          ppr: t("accounts.types.ppr"),
                        }}
                      />
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.filterGridItem,
                      {
                        flexBasis: filterItemWidth,
                        maxWidth: filterItemWidth,
                      },
                    ]}
                  >
                    <CategoryPicker
                      label={t("transactions.categoryFilter")}
                      placeholder={t("transactions.allCategories")}
                      hint={t("transactions.categoryFilterHint")}
                      categories={filterCategories as any}
                      selectedId={categoryFilter === "all" ? null : categoryFilter}
                      clearLabel={t("transactions.allCategories")}
                      onChange={(value) => setCategoryFilter(value ?? "all")}
                    />
                  </View>
                  <View
                    style={[
                      styles.filterGridItem,
                      {
                        flexBasis: filterItemWidth,
                        maxWidth: filterItemWidth,
                      },
                    ]}
                  >
                    <DropdownField
                      label={t("transactions.createdBy")}
                      valueLabel={selectedCreatorLabel}
                      placeholder={t("transactions.createdBy")}
                      hint={t("transactions.createdBy")}
                      selectedKey={createdByFilter}
                      onChange={setCreatedByFilter}
                      options={[
                        {
                          key: "all",
                          label: t("all", { defaultValue: "All" }),
                        },
                        {
                          key: currentUserId,
                          label: currentUserLabel,
                          subtitle: t("settings.you"),
                        },
                        ...accountMemberOptions
                          .filter((item) => item.id !== currentUserId)
                          .map((item) => ({ key: item.id, label: item.label })),
                      ]}
                    />
                  </View>
                  <View
                    style={[
                      styles.filterGridItem,
                      {
                        flexBasis: filterItemWidth,
                        maxWidth: filterItemWidth,
                      },
                    ]}
                  >
                    <View style={styles.filterRangeRow}>
                      <View style={{ flex: 1, minWidth: spacing(30) }}>
                        <DateFilterField
                          label={t("transactions.dateFrom")}
                          value={dateFrom}
                          onChange={setDateFrom}
                          placeholder={t("transactions.dateFromPlaceholder")}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: spacing(30) }}>
                        <DateFilterField
                          label={t("transactions.dateTo")}
                          value={dateTo}
                          onChange={setDateTo}
                          placeholder={t("transactions.dateToPlaceholder")}
                        />
                      </View>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.filterGridItem,
                      {
                        flexBasis: filterItemWidth,
                        maxWidth: filterItemWidth,
                      },
                    ]}
                  >
                    <View style={styles.filterRangeRow}>
                      <View style={{ flex: 1, minWidth: spacing(30) }}>
                        <Field
                          label={t("transactions.minAmountLabel")}
                          value={minAmountFilter}
                          onChangeText={setMinAmountFilter}
                          placeholder={t("transactions.minAmountPlaceholder")}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: spacing(30) }}>
                        <Field
                          label={t("transactions.maxAmountLabel")}
                          value={maxAmountFilter}
                          onChangeText={setMaxAmountFilter}
                          placeholder={t("transactions.maxAmountPlaceholder")}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}
            </Section>
          </Card>

          <Modal
            visible={createModalOpen}
            transparent
            animationType="fade"
            onRequestClose={closeCreateModal}
          >
            <View style={styles.modalBackdrop}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={closeCreateModal}
                accessibilityRole="button"
                accessibilityLabel={t("cancel")}
              />
              <PrivacyToggle />
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.modalKeyboardView}
              >
                <View
                  style={styles.createModalCard}
                  accessibilityViewIsModal
                  accessibilityLabel={t("transactions.createTitle")}
                >
                  <View
                    style={[
                      styles.createModalHeader,
                      { borderColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.modalIcon,
                        { backgroundColor: colors.primarySoft },
                      ]}
                    >
                      <Ionicons name="add" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.modalHeading}>
                      <Text style={styles.modalTitle}>
                        {t("transactions.createTitle")}
                      </Text>
                      <Text style={styles.modalSubtitle}>
                        {t("transactions.createSubtitle")}
                      </Text>
                    </View>
                    <Pressable
                      onPress={closeCreateModal}
                      accessibilityRole="button"
                      accessibilityLabel={t("close", { defaultValue: "Close" })}
                      style={({ pressed }) => [
                        styles.modalClose,
                        {
                          backgroundColor: colors.surfaceMuted,
                          borderColor: colors.border,
                        },
                        pressed && styles.modalPressed,
                      ]}
                    >
                      <Ionicons
                        name="close"
                        size={20}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  </View>
                  <View
                    style={{
                      gap: spacing(2),
                      paddingHorizontal: spacing(5),
                      paddingTop: spacing(3.5),
                    }}
                  >
                    <View style={styles.wizardProgressTrack}>
                      {wizardSteps.map((step, index) => (
                        <View
                          key={step}
                          style={[
                            styles.wizardProgressSegment,
                            {
                              backgroundColor:
                                index <= currentWizardStep
                                  ? colors.primary
                                  : colors.border,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <View style={styles.wizardStepHeader}>
                      <Text style={styles.wizardStepIndicator}>
                        {t("transactions.wizard.stepOf", {
                          current: currentWizardStep + 1,
                          total: wizardSteps.length,
                        })}
                      </Text>
                      {currentWizardStep > 0 ? (
                        <Pressable
                          onPress={() => goToWizardStep(currentWizardStep - 1)}
                          accessibilityRole="button"
                          accessibilityLabel={t("transactions.wizard.back")}
                          style={styles.wizardBackButton}
                        >
                          <Ionicons
                            name="chevron-back"
                            size={16}
                            color={colors.textSecondary}
                          />
                          <Text style={styles.wizardBackLabel}>
                            {t("transactions.wizard.back")}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <Text style={styles.wizardStepTitle}>
                      {t(WIZARD_STEP_COPY[currentWizardStepKey].titleKey)}
                    </Text>
                    <Text style={styles.wizardStepSubtitle}>
                      {t(WIZARD_STEP_COPY[currentWizardStepKey].subtitleKey)}
                    </Text>
                  </View>
                  <ScrollView
                    style={styles.createModalScroll}
                    contentContainerStyle={styles.createModalBody}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.wizardStepBody}>
                    {currentWizardStepKey === "type" ? (
                    <>
                    <View style={styles.typeSelector}>
                      <Ionicons
                        name="swap-horizontal-outline"
                        size={16}
                        color={colors.textSecondary}
                      />
                      {(["income", "expense", "transfer"] as const).map(
                        (item) => (
                          <Pill
                            key={item}
                            label={t(
                              item === "transfer"
                                ? "transactions.movementKinds.transfer"
                                : `transactions.types.${item}`,
                            )}
                            active={
                              item === "transfer"
                                ? createMovementKind === "transfer" ||
                                  createMovementKind === "recurring-transfer"
                                : createMovementKind === "transaction" &&
                                  type === item
                            }
                            onPress={() => {
                              const isTransfer = item === "transfer";
                              setCreateMovementKind(
                                isTransfer ? "transfer" : "transaction",
                              );
                              if (item === "income" || item === "expense")
                                setType(item);
                              setCategoryId(null);
                              setCategoryIsAutomatic(!isTransfer);
                              if (isTransfer) setAttachment(null);
                              else setTransferDestination(null);
                            }}
                          />
                        ),
                      )}
                    </View>
                    {createMovementKind === "transfer" ||
                    createMovementKind === "recurring-transfer" ? (
                      <View style={styles.typeSelector}>
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color={colors.textSecondary}
                        />
                        <Pill
                          label={t("transfers.types.oneOff")}
                          active={createMovementKind === "transfer"}
                          onPress={() => setCreateMovementKind("transfer")}
                        />
                        <Pill
                          label={t("transfers.types.recurringTransfer")}
                          active={createMovementKind === "recurring-transfer"}
                          onPress={() => {
                            setCreateMovementKind("recurring-transfer");
                            setAttachment(null);
                          }}
                        />
                      </View>
                    ) : null}
                    {createMovementKind === "recurring-transfer" ? (
                      <RecurringTransferCreateForm
                        onCreated={() => {
                          closeCreateModal();
                          setActiveView("scheduled");
                        }}
                      />
                    ) : (
                      <>
                        <View>
                          <Field
                            label={t("transactions.titleLabel")}
                            value={title}
                            onChangeText={(value) => {
                              setTitle(value);
                              setActiveTitleSuggestion(0);
                            }}
                            onFocus={() => setTitleSuggestionsFocused(true)}
                            onBlur={() =>
                              setTimeout(
                                () => setTitleSuggestionsFocused(false),
                                120,
                              )
                            }
                            onKeyPress={({ nativeEvent }) => {
                              if (!visibleTitleSuggestions.length) return;
                              if (nativeEvent.key === "ArrowDown") {
                                setActiveTitleSuggestion(
                                  (current) =>
                                    (current + 1) %
                                    visibleTitleSuggestions.length,
                                );
                              } else if (nativeEvent.key === "ArrowUp") {
                                setActiveTitleSuggestion(
                                  (current) =>
                                    (current -
                                      1 +
                                      visibleTitleSuggestions.length) %
                                    visibleTitleSuggestions.length,
                                );
                              } else if (nativeEvent.key === "Enter") {
                                setTitle(
                                  visibleTitleSuggestions[activeTitleSuggestion]
                                    ?.title ?? title,
                                );
                                setTitleSuggestionsFocused(false);
                              } else if (nativeEvent.key === "Escape") {
                                setTitleSuggestionsFocused(false);
                              }
                            }}
                            placeholder={t("transactions.titlePlaceholder")}
                            autoFocus={Platform.OS === "web"}
                            returnKeyType="next"
                            accessibilityHint={t(
                              "transactions.titleSuggestionHint",
                            )}
                          />
                          {titleSuggestionsFocused &&
                          visibleTitleSuggestions.length > 0 ? (
                            <View
                              style={styles.titleSuggestionBox}
                              accessibilityRole="menu"
                              accessibilityLabel={t(
                                "transactions.titleSuggestions",
                              )}
                            >
                              {visibleTitleSuggestions.map(
                                (suggestion, index) => {
                                  const accountName = accounts.find(
                                    (item: any) =>
                                      item.id === suggestion.accountId,
                                  )?.name;
                                  const context = [
                                    suggestion.categoryName,
                                    accountName,
                                    t("transactions.titleSuggestionUses", {
                                      count: suggestion.usageCount,
                                    }),
                                  ]
                                    .filter(Boolean)
                                    .join(" · ");
                                  return (
                                    <Pressable
                                      key={`${suggestion.title}-${suggestion.accountId}`}
                                      accessibilityRole="menuitem"
                                      accessibilityLabel={`${suggestion.title}, ${context}`}
                                      onPress={() => {
                                        setTitle(suggestion.title);
                                        setTitleSuggestionsFocused(false);
                                      }}
                                      style={({ pressed }) => [
                                        styles.titleSuggestionRow,
                                        index === activeTitleSuggestion &&
                                          styles.titleSuggestionRowActive,
                                        pressed && styles.modalPressed,
                                      ]}
                                    >
                                      <Text style={styles.titleSuggestionTitle}>
                                        {suggestion.title}
                                      </Text>
                                      <Text
                                        style={styles.titleSuggestionContext}
                                      >
                                        {context}
                                      </Text>
                                    </Pressable>
                                  );
                                },
                              )}
                            </View>
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.formGrid,
                            responsive.isPhone && styles.formGridCompact,
                          ]}
                        >
                          <View style={styles.formGridItem}>
                            <Field
                              label={t("transactions.amountLabel")}
                              value={amount}
                              onChangeText={setAmount}
                              placeholder="0.00"
                              keyboardType="decimal-pad"
                            />
                          </View>
                          <View style={styles.formGridItem}>
                            <DatePickerField
                              label={t("transactions.dateLabel")}
                              value={date}
                              onChange={setDate}
                              placeholder={t("transactions.datePlaceholder", {
                                defaultValue: "DD-MM-YYYY",
                              })}
                            />
                          </View>
                        </View>
                        <Field
                          label={t("transactions.notesLabel")}
                          value={notes}
                          onChangeText={setNotes}
                          placeholder={t("transactions.notesPlaceholder")}
                        />
                      </>
                    )}
                    </>
                    ) : null}
                    {currentWizardStepKey === "accounts" ? (
                      <>
                        <DropdownField
                          label={t("transactions.createdBy")}
                          valueLabel={selectedCreateCreatorLabel}
                          placeholder={t("transactions.createdByPlaceholder")}
                          hint={t("transactions.createdByPlaceholder")}
                          selectedKey={effectiveCreatedById}
                          onChange={setCreatedById}
                          options={[
                            {
                              key: currentUserId,
                              label: currentUserLabel,
                              subtitle: t("settings.you"),
                            },
                            ...accountMemberOptions
                              .filter((member) => member.id !== currentUserId)
                              .map((member) => ({
                                key: member.id,
                                label: member.label,
                              })),
                          ]}
                        />
                        <GroupedAccountSelect
                          label={
                            createMovementKind === "transfer"
                              ? t("transactions.sourceAccount")
                              : t("transactions.account")
                          }
                          accounts={accounts as any}
                          members={
                            (membersQuery.data ?? []).filter(
                              (member) => member.status === "accepted",
                            ) as any
                          }
                          value={effectiveAccountId}
                          placeholder={t("transactions.selectAccount")}
                          hint={t("transactions.selectAccountHint", {
                            defaultValue: t("transactions.account"),
                          })}
                          onChange={setAccountId}
                          closeLabel={t("close", { defaultValue: "Close" })}
                          sharedLabel={t("dashboard.shared")}
                          unassignedLabel={t("settings.unnamedUser")}
                          typeLabels={{
                            bank: t("accounts.types.bank"),
                            cash: t("accounts.types.cash"),
                            savings: t("accounts.types.savings"),
                            credit_card: t("accounts.types.credit_card"),
                            investment: t("accounts.types.investment"),
                            ppr: t("accounts.types.ppr"),
                          }}
                        />
                        {createMovementKind === "transfer" ? (
                          <GroupedDestinationSelect
                            label={t("transactions.destinationAccount")}
                            accounts={accounts as any}
                            members={
                              (membersQuery.data ?? []).filter(
                                (member) => member.status === "accepted",
                              ) as any
                            }
                            value={transferDestination}
                            placeholder={t("transactions.destinationAccount")}
                            hint={t("transactions.destinationAccount")}
                            onChange={setTransferDestination}
                            allowedAccountIds={accounts
                              .filter(
                                (account: any) =>
                                  account.id !== effectiveAccountId,
                              )
                              .map((account: any) => account.id)}
                            closeLabel={t("close", { defaultValue: "Close" })}
                            sharedLabel={t("dashboard.shared")}
                            unassignedLabel={t("settings.unnamedUser")}
                            typeLabels={{
                              bank: t("accounts.types.bank"),
                              cash: t("accounts.types.cash"),
                              savings: t("accounts.types.savings"),
                              credit_card: t("accounts.types.credit_card"),
                              investment: t("accounts.types.investment"),
                              ppr: t("accounts.types.ppr"),
                            }}
                          />
                        ) : null}
                      </>
                    ) : null}
                    {currentWizardStepKey === "extras" ? (
                      <>
                        <CategoryPicker
                          label={t("transactions.categories")}
                          placeholder={t("transactions.categories")}
                          hint={t("transactions.categories")}
                          categories={categories as any}
                          selectedId={effectiveCategoryId ?? null}
                          clearLabel={t("none")}
                          onChange={(value) => {
                            setCategoryId(value);
                            setCategoryIsAutomatic(false);
                          }}
                        />
                        {createMovementKind === "transaction" ? (
                          <View
                            style={styles.categorySuggestionStatus}
                            accessibilityLiveRegion="polite"
                          >
                            {categoryIsAutomatic &&
                            categorySuggestion.isFetching ? (
                              <Text style={styles.categorySuggestionText}>
                                {t("transactions.categorySuggestionLoading")}
                              </Text>
                            ) : categoryIsAutomatic &&
                              categorySuggestion.isError ? (
                              <Text style={styles.categorySuggestionText}>
                                {t(
                                  "transactions.categorySuggestionUnavailable",
                                )}
                              </Text>
                            ) : categoryIsAutomatic &&
                              categorySuggestion.data?.confidence === "high" ? (
                              <Text style={styles.categorySuggestionText}>
                                {t("transactions.categorySuggestionHigh", {
                                  count: categorySuggestion.data.matchCount,
                                })}
                              </Text>
                            ) : categoryIsAutomatic &&
                              categorySuggestion.data?.confidence ===
                                "medium" ? (
                              <Text style={styles.categorySuggestionText}>
                                {t("transactions.categorySuggestionMedium", {
                                  category:
                                    categorySuggestion.data.categoryName,
                                  count: categorySuggestion.data.matchCount,
                                })}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                        {createMovementKind === "transaction" ? (
                          <SplitAllocationsEditor
                            enabled={splitEnabled}
                            onToggleEnabled={setSplitEnabled}
                            totalAmount={parsedAmount}
                            accounts={accounts as any}
                            members={
                              (membersQuery.data ?? []).filter(
                                (member) => member.status === "accepted",
                              ) as any
                            }
                            pots={splitPots}
                            allocations={splitAllocations}
                            onChangeAllocations={setSplitAllocations}
                            inputMode={splitInputMode}
                            onChangeInputMode={setSplitInputMode}
                            accountTypeLabels={{
                              bank: t("accounts.types.bank"),
                              cash: t("accounts.types.cash"),
                              savings: t("accounts.types.savings"),
                              credit_card: t("accounts.types.credit_card"),
                              investment: t("accounts.types.investment"),
                              ppr: t("accounts.types.ppr"),
                            }}
                            sharedLabel={t("dashboard.shared")}
                            unassignedLabel={t("settings.unnamedUser")}
                            closeLabel={t("close", { defaultValue: "Close" })}
                          />
                        ) : null}
                        {createMovementKind === "transaction" ? (
                          <View style={{ gap: spacing(2) } as any}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: spacing(2),
                              }}
                            >
                              <Ionicons
                                name="attach-outline"
                                size={16}
                                color={colors.textSecondary}
                              />
                              <Text
                                style={
                                  {
                                    color: colors.textSecondary,
                                    fontWeight: typography.fontWeight
                                      .semibold as any,
                                  } as any
                                }
                              >
                                {t("transactions.attachInvoice")}
                              </Text>
                            </View>
                            <Button
                              label={
                                attachment
                                  ? t("transactions.changeAttachment")
                                  : t("transactions.attachInvoice")
                              }
                              onPress={() => void handlePickAttachment()}
                              variant="secondary"
                            />
                            {attachment ? (
                              <View style={{ gap: spacing(1) }}>
                                <Text
                                  style={
                                    {
                                      color: colors.text,
                                      fontWeight: typography.fontWeight
                                        .semibold as any,
                                    } as any
                                  }
                                >
                                  {t("transactions.attachmentSelected")}
                                </Text>
                                <Text
                                  style={{ color: colors.textSecondary } as any}
                                >
                                  {attachment.fileName} ·{" "}
                                  {(attachment.fileSize / 1024).toFixed(1)} KB
                                </Text>
                                <AttachmentPreview
                                  uri={attachment.previewUri}
                                  mimeType={attachment.mimeType}
                                  fileName={attachment.fileName}
                                  previewLabel={t(
                                    "transactions.attachmentPreview",
                                  )}
                                  openLabel={t("transactions.openAttachment")}
                                />
                                <Button
                                  label={t("transactions.removeAttachment")}
                                  onPress={() => setAttachment(null)}
                                  variant="secondary"
                                />
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </>
                    ) : null}
                    </View>
                  </ScrollView>
                  {createMovementKind !== "recurring-transfer" ? (
                    <View
                      style={[
                        styles.createModalFooter,
                        { borderColor: colors.border },
                      ]}
                    >
                      <Button
                        label={
                          currentWizardStep > 0
                            ? t("transactions.wizard.back")
                            : t("cancel")
                        }
                        variant="secondary"
                        onPress={() =>
                          currentWizardStep > 0
                            ? goToWizardStep(currentWizardStep - 1)
                            : closeCreateModal()
                        }
                      />
                      {isLastWizardStep ? (
                        <View style={styles.createModalPrimaryActions}>
                          <Button
                            label={
                              createTransaction.isPending ||
                              createTransfer.isPending
                                ? t("saving")
                                : t("transactions.createAndNew")
                            }
                            variant="secondary"
                            onPress={() => void handleCreate(true)}
                            disabled={!canCreateMovement}
                          />
                          <Button
                            label={
                              createTransaction.isPending ||
                              createTransfer.isPending
                                ? t("saving")
                                : createMovementKind === "transfer"
                                  ? t("transactions.createTransfer")
                                  : t("transactions.create")
                            }
                            onPress={() => void handleCreate()}
                            disabled={!canCreateMovement}
                          />
                        </View>
                      ) : (
                        <Button
                          label={t("transactions.wizard.next")}
                          onPress={() => goToWizardStep(currentWizardStep + 1)}
                          disabled={!canProceedFromCurrentStep}
                        />
                      )}
                    </View>
                  ) : null}
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>

          {movementsSummaryQuery.data ? (
            <>
              {movementsSummaryQuery.isFetching ? (
                <Text
                  style={
                    {
                      color: colors.textSecondary,
                      fontSize: typography.fontSize[12],
                      marginBottom: spacing(1),
                    } as any
                  }
                >
                  {t("transactions.updating", { defaultValue: "Updating..." })}
                </Text>
              ) : null}
              <View style={styles.summaryBar}>
                <View style={styles.summaryBarItem}>
                <Text style={styles.summaryBarLabel}>
                  {t("transactions.summary.count", {
                    count: movementsSummaryQuery.data.movement_count,
                  })}
                </Text>
                <Text style={[styles.summaryBarValue, { color: colors.text }]}>
                  {movementsSummaryQuery.data.movement_count}
                </Text>
              </View>
              <View style={styles.summaryBarItem}>
                <Text style={styles.summaryBarLabel}>
                  {t("transactions.summary.income")}
                </Text>
                <Text
                  style={[
                    styles.summaryBarValue,
                    { color: colors.financialPositive },
                  ]}
                >
                  {displayCurrency(formatCurrency(movementsSummaryQuery.data.income_total), hideValues)}
                </Text>
              </View>
              <View style={styles.summaryBarItem}>
                <Text style={styles.summaryBarLabel}>
                  {t("transactions.summary.expense")}
                </Text>
                <Text
                  style={[
                    styles.summaryBarValue,
                    { color: colors.destructive },
                  ]}
                >
                  {displayCurrency(formatCurrency(movementsSummaryQuery.data.expense_total), hideValues)}
                </Text>
              </View>
              <View style={styles.summaryBarItem}>
                <Text style={styles.summaryBarLabel}>
                  {t("transactions.summary.net")}
                </Text>
                <Text
                  style={[
                    styles.summaryBarValue,
                    {
                      color:
                        movementsSummaryQuery.data.net_total < 0
                          ? colors.destructive
                          : colors.financialPositive,
                    },
                  ]}
                >
                  {displayCurrency(formatCurrency(movementsSummaryQuery.data.net_total), hideValues)}
                </Text>
              </View>
              </View>
            </>
          ) : null}

          <Section
            title={t("transactions.latestTitle")}
            subtitle={latestSectionSubtitle}
            action={
              <View style={styles.sectionActions}>
                <Button
                  label={
                    bulkSelectionOpen
                      ? t("transactions.bulk.cancelSelection")
                      : t("transactions.bulk.selectTransactions")
                  }
                  variant="secondary"
                  onPress={
                    bulkSelectionOpen ? closeBulkSelection : openBulkSelection
                  }
                />
                <Button
                  label={t("transactions.addTransaction")}
                  onPress={openCreateTransaction}
                />
              </View>
            }
          >
            {transactionsQuery.isPending ? (
              <View
                style={
                  {
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: spacing(8),
                    gap: spacing(2),
                  } as any
                }
              >
                <ActivityIndicator color={colors.primary} />
                <Text style={{ color: colors.textSecondary } as any}>
                  {t("loading", { defaultValue: "Loading transactions..." })}
                </Text>
              </View>
            ) : transactions.length ? (
              <>
                {bulkSelectionOpen ? (
                  <View style={styles.bulkActionBar}>
                    <View style={styles.bulkActionSummary}>
                      <Text style={styles.bulkActionTitle}>
                        {t("transactions.bulk.selected", {
                          count: selectedTransactionIds.size,
                        })}
                      </Text>
                      <Text style={styles.bulkActionHint}>
                        {bulkSelectionType
                          ? t("transactions.bulk.sameTypeHint", {
                              type:
                                bulkSelectionType === "transfer"
                                  ? t("transactions.movementKinds.transfer")
                                  : t(
                                      `transactions.types.${bulkSelectionType}`,
                                    ),
                            })
                          : t("transactions.bulk.chooseTypeHint")}
                      </Text>
                    </View>
                    <Button
                      label={t("transactions.bulk.selectLoaded")}
                      variant="secondary"
                      disabled={!bulkSelectionType}
                      onPress={selectLoadedBulkTransactions}
                    />
                    <View style={styles.bulkCategoryField}>
                      <CategoryPicker
                        label={t("transactions.bulk.category")}
                        placeholder={t("transactions.bulk.chooseCategory")}
                        hint={t("transactions.bulk.categoryHint")}
                        categories={bulkCategories as any}
                        selectedId={bulkCategoryId || null}
                        onChange={(value) => setBulkCategoryId(value ?? "")}
                      />
                    </View>
                    <Button
                      label={
                        isBulkApplyPending
                          ? t("saving")
                          : t("transactions.bulk.applyCategory")
                      }
                      disabled={
                        selectedTransactionIds.size === 0 ||
                        !bulkCategoryId ||
                        isBulkApplyPending
                      }
                      onPress={() => void applyBulkCategory(bulkCategoryId)}
                    />
                    <Button
                      label={t("transactions.bulk.clearCategory")}
                      variant="secondary"
                      disabled={
                        selectedTransactionIds.size === 0 ||
                        isBulkApplyPending
                      }
                      onPress={() => void applyBulkCategory(null)}
                    />
                  </View>
                ) : null}
                <Table
                  columns={
                    [
                      { label: t("transactions.titleLabel"), flex: 1.9 },
                      { label: t("transactions.transactionDate"), flex: 1.1 },
                      { label: t("transactions.account"), flex: 1.3 },
                      !isSingleMemberHousehold && {
                        label: t("transactions.accountOwner"),
                        flex: 1.15,
                      },
                      !isSingleMemberHousehold && {
                        label: t("transactions.createdBy"),
                        flex: 1.15,
                      },
                      { label: t("transactions.amountLabel"), align: "right" },
                      { label: t("transactions.balanceAfter"), align: "right" },
                      { label: "", flex: 0.35, align: "right" },
                    ].filter(Boolean) as any
                  }
                >
                  {transactions.map((item: any) => {
                    // Use the movement's own kind, not the stored amount's
                    // sign (transactions.amount is always stored positive),
                    // to decide expense vs. income styling and the +/- sign.
                    const movementKind = resolveMovementKind(item);
                    const ownerTone = getTransactionAccountOwnerTone(item);
                    const rowTone =
                      movementKind === "transfer"
                        ? {
                            surface: colors.transferRow,
                            accent: colors.financialNeutral,
                          }
                        : ownerTone;
                    const allocationEntries = getAllocationEntries(item);
                    const isExpandedSplit =
                      item.is_split && expandedTransactionIds.has(item.id);
                    const visibleAllocationEntries = allocationEntries.slice(0, 2);
                    const hiddenAllocationCount =
                      allocationEntries.length - visibleAllocationEntries.length;

                    return (
                      <Fragment key={item.id}>
                      <TableRow
                        backgroundColor={rowTone.surface}
                        accentColor={rowTone.accent}
                      >
                        {[
                        <TableCell key="title" flex={1.9}>
                          <View style={styles.transactionIdentity}>
                            <View
                              style={[
                                styles.transactionIcon,
                                {
                                  backgroundColor: movementIconBackground(
                                    movementKind,
                                    colors,
                                  ),
                                },
                              ]}
                            >
                              <Ionicons
                                name={
                                  // A transfer only falls back to the plain
                                  // swap icon when it has no category of its
                                  // own -- e.g. a Monthly Budget allocation
                                  // tagged "Investments" shows that
                                  // category's icon here exactly like a
                                  // manually-entered expense would, instead
                                  // of always being flattened to "Transfer".
                                  (item.category?.icon ??
                                    (movementKind === "transfer"
                                      ? "swap-horizontal-outline"
                                      : "pricetag-outline")) as any
                                }
                                size={18}
                                color={movementAmountColor(
                                  movementKind,
                                  colors,
                                )}
                              />
                            </View>
                            <View style={styles.transactionDetails}>
                              <Text style={styles.transactionTitle}>
                                {item.title}
                              </Text>
                              <Text style={styles.transactionContext}>
                                {item.category?.name ??
                                  (movementKind === "transfer"
                                    ? t("transactions.filters.transfer")
                                    : t("transactions.uncategorized"))}
                              </Text>
                              {item.is_split ? (
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={t(
                                    isExpandedSplit
                                      ? "transactions.split.hideBreakdown"
                                      : "transactions.split.viewBreakdown",
                                  )}
                                  onPress={() => toggleTransactionExpanded(item.id)}
                                  style={({ pressed }) =>
                                    [
                                      styles.splitBadgeRow,
                                      pressed && styles.pressed,
                                    ] as any
                                  }
                                >
                                  <Badge label={t("transactions.split.badge")} tone="primary" />
                                  <Text style={styles.transactionContext}>
                                    {t("transactions.split.entriesCount", {
                                      count: allocationEntries.length,
                                    })}
                                  </Text>
                                  <Ionicons
                                    name={isExpandedSplit ? "chevron-up" : "chevron-down"}
                                    size={13}
                                    color={colors.textSecondary}
                                  />
                                </Pressable>
                              ) : null}
                            </View>
                          </View>
                        </TableCell>,
                        <TableCell key="date" flex={1.1}>
                          <Text style={styles.transactionAccount}>
                            {formatDate(item.transaction_date)}
                          </Text>
                        </TableCell>,
                        <TableCell key="account" flex={1.3}>
                          {item.is_split && allocationEntries.length > 0 ? (
                            <View style={{ gap: spacing(0.5) }}>
                              {visibleAllocationEntries.map((entry) => (
                                <Text
                                  key={entry.id}
                                  style={styles.transactionAccount}
                                  numberOfLines={1}
                                >
                                  {allocationEntryName(entry)} ·{" "}
                                  {displayCurrency(formatCurrency(entry.amount), hideValues)}
                                </Text>
                              ))}
                              {hiddenAllocationCount > 0 ? (
                                <Text style={styles.transactionContext}>
                                  {t("transactions.split.moreSources", {
                                    count: hiddenAllocationCount,
                                  })}
                                </Text>
                              ) : null}
                            </View>
                          ) : (
                            <Text style={styles.transactionAccount}>
                              {movementKind === "transfer"
                                ? `${item.source_account?.name ?? t("transactions.sourceAccount")} → ${item.destination_account?.name ?? t("transactions.destinationAccount")}`
                                : getTransactionAccountLabel(item)}
                            </Text>
                          )}
                        </TableCell>,
                        !isSingleMemberHousehold && (
                          <TableCell key="owner" flex={1.15}>
                            <View style={styles.personIdentity}>
                              <Ionicons
                                name="person-outline"
                                size={15}
                                color={rowTone.accent}
                              />
                              <Text style={styles.transactionAccount}>
                                {item.is_split
                                  ? getSplitOwnerSummaryLabel(item)
                                  : getTransactionAccountOwnerLabel(item)}
                              </Text>
                            </View>
                          </TableCell>
                        ),
                        !isSingleMemberHousehold && (
                          <TableCell key="creator" flex={1.15}>
                            <View style={styles.personIdentity}>
                              <Ionicons
                                name="create-outline"
                                size={15}
                                color={colors.primary}
                              />
                              <Text style={styles.transactionCreator}>
                                {getTransactionCreatorLabel(item)}
                              </Text>
                            </View>
                          </TableCell>
                        ),
                        <TableCell key="amount" align="right">
                          <Text
                            style={[
                              styles.transactionAmount,
                              { color: movementAmountColor(movementKind, colors) },
                            ]}
                          >
                            {movementAmountSign(movementKind)}
                            {displayCurrency(formatCurrency(item.amount), hideValues)}
                          </Text>
                        </TableCell>,
                        <TableCell key="balance" align="right">
                          <Text style={styles.transactionBalance}>
                            {item.movement_kind === "transfer" ||
                            item.balance_after_transaction == null
                              ? "—"
                              : displayCurrency(formatCurrency(item.balance_after_transaction), hideValues)}
                          </Text>
                        </TableCell>,
                        <TableCell key="actions" flex={0.35} align="right" mobilePinned>
                          {bulkSelectionOpen ? (
                            <Pressable
                              accessibilityRole="checkbox"
                              accessibilityState={{
                                checked: selectedTransactionIds.has(item.id),
                                disabled:
                                  bulkSelectionType !== null &&
                                  getBulkItemType(item) !== bulkSelectionType,
                              }}
                              accessibilityLabel={t(
                                "transactions.bulk.selectTransaction",
                                { title: item.title },
                              )}
                              disabled={
                                bulkSelectionType !== null &&
                                getBulkItemType(item) !== bulkSelectionType
                              }
                              onPress={() => toggleBulkTransaction(item)}
                              style={[
                                styles.bulkCheckbox,
                                selectedTransactionIds.has(item.id) &&
                                  styles.bulkCheckboxSelected,
                                bulkSelectionType !== null &&
                                  getBulkItemType(item) !== bulkSelectionType &&
                                  styles.bulkCheckboxDisabled,
                              ]}
                            >
                              <Ionicons
                                name={
                                  selectedTransactionIds.has(item.id)
                                    ? "checkmark"
                                    : "ellipse-outline"
                                }
                                size={18}
                                color={
                                  selectedTransactionIds.has(item.id)
                                    ? colors.primaryForeground
                                    : colors.textSecondary
                                }
                              />
                            </Pressable>
                          ) : item.movement_kind !== "transfer" ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={t("transactions.editTitle")}
                              onPress={() => openEditTransaction(item)}
                              style={({ pressed }) =>
                                [
                                  styles.menuButton,
                                  pressed && styles.pressed,
                                ] as any
                              }
                            >
                              <Ionicons
                                name="create-outline"
                                size={18}
                                color={colors.text}
                              />
                            </Pressable>
                          ) : (
                            <View
                              style={{ flexDirection: "row", gap: spacing(1) }}
                            >
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t(
                                  "transactions.editTransfer",
                                )}
                                onPress={() =>
                                  setTransferEdit({
                                    transferGroupId: item.transfer_group_id,
                                    title: item.title ?? "",
                                    amount: String(item.amount ?? ""),
                                    date:
                                      item.transaction_date?.slice?.(0, 10) ??
                                      "",
                                    notes: item.notes ?? "",
                                    sourceAccountId:
                                      item.source_account_id ?? "",
                                    destinationAccountId:
                                      item.destination_account_id ?? "",
                                    categoryId: item.category_id ?? null,
                                  })
                                }
                                style={({ pressed }) =>
                                  [
                                    styles.menuButton,
                                    pressed && styles.pressed,
                                  ] as any
                                }
                              >
                                <Ionicons
                                  name="create-outline"
                                  size={18}
                                  color={colors.text}
                                />
                              </Pressable>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t(
                                  "transactions.deleteTransfer",
                                )}
                                onPress={() => setTransferToDelete(item)}
                                style={({ pressed }) =>
                                  [
                                    styles.menuButton,
                                    pressed && styles.pressed,
                                  ] as any
                                }
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={18}
                                  color={colors.destructive}
                                />
                              </Pressable>
                            </View>
                          )}
                        </TableCell>,
                        ].filter(Boolean)}
                      </TableRow>
                      {isExpandedSplit ? (
                        <View
                          style={[
                            styles.splitBreakdown,
                            {
                              backgroundColor: colors.surfaceMuted,
                              borderColor: colors.border,
                            },
                          ] as any}
                        >
                          <View style={styles.splitBreakdownHeaderRow}>
                            <Ionicons
                              name="pricetag-outline"
                              size={14}
                              color={colors.textSecondary}
                            />
                            <Text style={styles.splitBreakdownHeaderLabel}>
                              {t("transactions.split.breakdownCategoryLabel")}:{" "}
                            </Text>
                            <Text style={styles.transactionAccount}>
                              {getCategoryBreadcrumb(item, movementKind)}
                            </Text>
                          </View>
                          {allocationEntries.map((entry) => (
                            <View key={entry.id} style={styles.splitBreakdownEntryRow}>
                              <Ionicons
                                name={
                                  entry.source_type === "pot"
                                    ? "wallet-outline"
                                    : "card-outline"
                                }
                                size={15}
                                color={colors.primary}
                              />
                              <Text
                                style={[styles.transactionAccount, { flex: 1.4 }] as any}
                                numberOfLines={1}
                              >
                                {allocationEntryName(entry)}
                              </Text>
                              <View style={styles.personIdentity}>
                                <Ionicons
                                  name="person-outline"
                                  size={13}
                                  color={colors.textSecondary}
                                />
                                <Text style={styles.transactionContext}>
                                  {getAllocationMemberLabel(entry)}
                                </Text>
                              </View>
                              <Text style={styles.transactionAmount}>
                                {displayCurrency(formatCurrency(entry.amount), hideValues)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                      </Fragment>
                    );
                  })}
                </Table>
                {transactionsQuery.isFetchingNextPage ? (
                  <Text
                    style={
                      {
                        color: colors.textSecondary,
                        marginTop: spacing(2),
                      } as any
                    }
                  >
                    {t("loading", { defaultValue: "Loading more..." })}
                  </Text>
                ) : transactionsQuery.hasNextPage ? (
                  <Button
                    label={t("loadMore", { defaultValue: "Load more" })}
                    variant="secondary"
                    onPress={() => void transactionsQuery.fetchNextPage()}
                  />
                ) : null}
              </>
            ) : (
              <EmptyState
                title={t("transactions.emptyTitle", {
                  defaultValue: t("transactions.latestTitle"),
                })}
                description={t("transactions.latestSubtitle", { count: 0 })}
                icon="receipt-outline"
                actionLabel={t("transactions.addTransaction")}
                onAction={openCreateTransaction}
              />
            )}
          </Section>
        </>
      ) : (
        <TransfersContent embedded showCreate={false} />
      )}

      <Modal
        visible={transferEdit !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTransferEdit(null)}
      >
        <View
          style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setTransferEdit(null)}
            accessibilityRole="button"
            accessibilityLabel={t("cancel")}
          />
          <PrivacyToggle />
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View
              style={[
                styles.modalCard,
                {
                  width: responsive.isPhone ? "100%" : spacing(120),
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("transactions.editTransfer")}
              </Text>
              {transferEdit ? (
                <>
                  <Field
                    label={t("transactions.titleLabel")}
                    value={transferEdit.title}
                    onChangeText={(title) =>
                      setTransferEdit((current) =>
                        current ? { ...current, title } : current,
                      )
                    }
                  />
                  <Field
                    label={t("transactions.amountLabel")}
                    value={transferEdit.amount}
                    keyboardType="decimal-pad"
                    onChangeText={(amount) =>
                      setTransferEdit((current) =>
                        current ? { ...current, amount } : current,
                      )
                    }
                  />
                  <DatePickerField
                    label={t("transactions.dateLabel")}
                    value={transferEdit.date}
                    placeholder={t("transactions.dateLabel")}
                    onChange={(date) =>
                      setTransferEdit((current) =>
                        current ? { ...current, date } : current,
                      )
                    }
                  />
                  <DropdownField
                    label={t("transactions.sourceAccount")}
                    valueLabel={
                      accounts.find(
                        (account: any) =>
                          account.id === transferEdit.sourceAccountId,
                      )?.name ?? t("transactions.sourceAccount")
                    }
                    placeholder={t("transactions.sourceAccount")}
                    selectedKey={transferEdit.sourceAccountId}
                    options={accounts
                      .filter(
                        (account: any) =>
                          account.id !== transferEdit.destinationAccountId,
                      )
                      .map((account: any) => ({
                        key: account.id,
                        label: account.name,
                      }))}
                    onChange={(sourceAccountId) =>
                      setTransferEdit((current) =>
                        current ? { ...current, sourceAccountId } : current,
                      )
                    }
                  />
                  <DropdownField
                    label={t("transactions.destinationAccount")}
                    valueLabel={
                      accounts.find(
                        (account: any) =>
                          account.id === transferEdit.destinationAccountId,
                      )?.name ?? t("transactions.destinationAccount")
                    }
                    placeholder={t("transactions.destinationAccount")}
                    selectedKey={transferEdit.destinationAccountId}
                    options={accounts
                      .filter(
                        (account: any) =>
                          account.id !== transferEdit.sourceAccountId,
                      )
                      .map((account: any) => ({
                        key: account.id,
                        label: account.name,
                      }))}
                    onChange={(destinationAccountId) =>
                      setTransferEdit((current) =>
                        current
                          ? { ...current, destinationAccountId }
                          : current,
                      )
                    }
                  />
                  <CategoryPicker
                    label={t("transactions.categoryFilter")}
                    placeholder={t("none")}
                    categories={
                      // "account" categories are this field's original
                      // purpose; "expense" categories are what a Monthly
                      // Budget allocation assigns (e.g. "Investments",
                      // "Savings > PPR") -- both must be selectable here,
                      // or a budget-generated transfer's already-assigned
                      // category would show as unselected, and saving would
                      // silently clear it.
                      allCategories.filter(
                        (category: any) => category.type === "account" || category.type === "expense",
                      ) as any
                    }
                    selectedId={transferEdit.categoryId ?? null}
                    clearLabel={t("none")}
                    onChange={(categoryId) =>
                      setTransferEdit((current) =>
                        current ? { ...current, categoryId } : current,
                      )
                    }
                  />
                  <Field
                    label={t("transactions.notesLabel")}
                    value={transferEdit.notes}
                    multiline
                    onChangeText={(notes) =>
                      setTransferEdit((current) =>
                        current ? { ...current, notes } : current,
                      )
                    }
                  />
                </>
              ) : null}
              <View style={styles.modalActions}>
                <Button
                  label={t("cancel")}
                  variant="secondary"
                  onPress={() => setTransferEdit(null)}
                />
                <Button
                  label={
                    updateCompletedTransfer.isPending
                      ? t("saving")
                      : t("transactions.saveTransfer")
                  }
                  disabled={updateCompletedTransfer.isPending}
                  onPress={() => void handleSaveTransfer()}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={transferToDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTransferToDelete(null)}
      >
        <View
          style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setTransferToDelete(null)}
            accessibilityRole="button"
            accessibilityLabel={t("cancel")}
          />
          <PrivacyToggle />
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("transactions.deleteTransferTitle")}
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              {t("transactions.deleteTransferMessage", {
                title: transferToDelete?.title,
              })}
            </Text>
            <View style={styles.modalActions}>
              <Button
                label={t("cancel")}
                variant="secondary"
                onPress={() => setTransferToDelete(null)}
              />
              <Button
                label={
                  deleteCompletedTransfer.isPending
                    ? t("deleting")
                    : t("transactions.deleteTransfer")
                }
                variant="danger"
                disabled={deleteCompletedTransfer.isPending}
                onPress={() => {
                  const groupId = transferToDelete?.transfer_group_id;
                  if (!groupId) return;
                  void deleteCompletedTransfer
                    .mutateAsync(groupId)
                    .then(() => setTransferToDelete(null));
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.floatingCreateSpacer} />

      <Modal
        visible={editTransaction !== null}
        transparent
        animationType="fade"
        onRequestClose={closeEditTransaction}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeEditTransaction}
            accessibilityRole="button"
            accessibilityLabel={t("cancel")}
          />
          <PrivacyToggle />
          <View style={[styles.modalCard, styles.editModalCard]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.editModalContent}
              showsVerticalScrollIndicator
            >
              <View
                style={
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing(2),
                  } as any
                }
              >
                <Ionicons
                  name="pencil-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.modalTitle}>
                  {t("transactions.editTitle")}
                </Text>
              </View>
              <Text style={styles.modalSubtitle}>
                {t("settings.editDetails")}
              </Text>
              {editTransaction ? (
                <>
                  <View
                    style={{ flexDirection: "row", gap: spacing(2) } as any}
                  >
                    {(["income", "expense"] as const).map((item) => (
                      <Pill
                        key={item}
                        label={t(`transactions.types.${item}`)}
                        active={editTransaction.type === item}
                        onPress={() =>
                          setEditTransaction((current) =>
                            current
                              ? { ...current, type: item, categoryId: null }
                              : current,
                          )
                        }
                      />
                    ))}
                  </View>
                  <Field
                    label={t("transactions.titleLabel")}
                    value={editTransaction.title}
                    onChangeText={(value) =>
                      setEditTransaction((current) =>
                        current ? { ...current, title: value } : current,
                      )
                    }
                  />
                  <Field
                    label={t("transactions.amountLabel")}
                    value={editTransaction.amount}
                    onChangeText={(value) =>
                      setEditTransaction((current) =>
                        current ? { ...current, amount: value } : current,
                      )
                    }
                    keyboardType="numeric"
                  />
                  <SharedDatePickerField
                    label={t("transactions.dateLabel")}
                    value={editTransaction.date}
                    onChange={(value) =>
                      setEditTransaction((current) =>
                        current ? { ...current, date: value } : current,
                      )
                    }
                    placeholder={t("transactions.datePlaceholder", {
                      defaultValue: "DD-MM-YYYY",
                    })}
                  />
                  <Field
                    label={t("transactions.notesLabel")}
                    value={editTransaction.notes}
                    onChangeText={(value) =>
                      setEditTransaction((current) =>
                        current ? { ...current, notes: value } : current,
                      )
                    }
                    placeholder={t("transactions.notesPlaceholder")}
                  />
                  <HouseholdMemberSelect
                    label={t("transactions.createdBy")}
                    members={(membersQuery.data ?? []).filter(
                      (member) => member.status === "accepted",
                    )}
                    value={editTransaction.createdById || profile?.id || ""}
                    placeholder={t("transactions.createdByPlaceholder")}
                    hint={t("transactions.createdByPlaceholder")}
                    onChange={(value) =>
                      setEditTransaction((current) =>
                        current ? { ...current, createdById: value } : current,
                      )
                    }
                  />
                  <GroupedAccountSelect
                    label={t("transactions.account")}
                    accounts={accounts as any}
                    members={
                      (membersQuery.data ?? []).filter(
                        (member) => member.status === "accepted",
                      ) as any
                    }
                    value={editTransaction.accountId}
                    placeholder={t("transactions.selectAccount")}
                    hint={t("transactions.selectAccountHint", {
                      defaultValue: t("transactions.account"),
                    })}
                    onChange={(value) =>
                      setEditTransaction((current) =>
                        current ? { ...current, accountId: value } : current,
                      )
                    }
                    closeLabel={t("close", { defaultValue: "Close" })}
                    sharedLabel={t("dashboard.shared")}
                    unassignedLabel={t("settings.unnamedUser")}
                    typeLabels={{
                      bank: t("accounts.types.bank"),
                      cash: t("accounts.types.cash"),
                      savings: t("accounts.types.savings"),
                      credit_card: t("accounts.types.credit_card"),
                      investment: t("accounts.types.investment"),
                      ppr: t("accounts.types.ppr"),
                    }}
                  />
                  <CategoryPicker
                    label={t("transactions.categories")}
                    placeholder={t("transactions.categories")}
                    hint={t("transactions.categories")}
                    categories={categories as any}
                    selectedId={editTransaction.categoryId}
                    clearLabel={t("none")}
                    onChange={(value) =>
                      setEditTransaction((current) =>
                        current ? { ...current, categoryId: value } : current,
                      )
                    }
                  />
                  <SplitAllocationsEditor
                    enabled={editSplitEnabled}
                    onToggleEnabled={setEditSplitEnabled}
                    totalAmount={Number(editTransaction.amount) || 0}
                    accounts={accounts as any}
                    members={
                      (membersQuery.data ?? []).filter(
                        (member) => member.status === "accepted",
                      ) as any
                    }
                    pots={splitPots}
                    allocations={editSplitAllocations}
                    onChangeAllocations={setEditSplitAllocations}
                    inputMode={editSplitInputMode}
                    onChangeInputMode={setEditSplitInputMode}
                    accountTypeLabels={{
                      bank: t("accounts.types.bank"),
                      cash: t("accounts.types.cash"),
                      savings: t("accounts.types.savings"),
                      credit_card: t("accounts.types.credit_card"),
                      investment: t("accounts.types.investment"),
                      ppr: t("accounts.types.ppr"),
                    }}
                    sharedLabel={t("dashboard.shared")}
                    unassignedLabel={t("settings.unnamedUser")}
                    closeLabel={t("close", { defaultValue: "Close" })}
                  />
                  <View style={styles.editAttachmentsSection}>
                    <View style={styles.editAttachmentsHeading}>
                      <Ionicons
                        name="attach-outline"
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={styles.editAttachmentsTitle}>
                        {t("transactions.attachmentsTitle")}
                      </Text>
                    </View>
                    {editAttachmentsQuery.isPending ? (
                      <Text style={styles.editAttachmentsStatus}>
                        {t("transactions.loadingAttachments")}
                      </Text>
                    ) : editAttachmentsQuery.isError ? (
                      <View style={styles.editAttachmentsError}>
                        <Text style={styles.editAttachmentsStatus}>
                          {t("transactions.attachmentsLoadError")}
                        </Text>
                        <Button
                          label={t("retry")}
                          variant="secondary"
                          onPress={() => void editAttachmentsQuery.refetch()}
                        />
                      </View>
                    ) : editAttachmentsQuery.data?.length ? (
                      <View style={styles.editAttachmentsList}>
                        {editAttachmentsQuery.data.map((savedAttachment) => (
                          <View
                            key={savedAttachment.id}
                            style={styles.editAttachmentItem}
                          >
                            <AttachmentPreview
                              uri={savedAttachment.signedUrl}
                              mimeType={savedAttachment.mime_type}
                              fileName={savedAttachment.file_name}
                              previewLabel={t("transactions.attachmentPreview")}
                              openLabel={t("transactions.openAttachment")}
                            />
                            <Text style={styles.editAttachmentMeta}>
                              {(savedAttachment.file_size / 1024).toFixed(1)} KB
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.editAttachmentsStatus}>
                        {t("transactions.noAttachments")}
                      </Text>
                    )}
                  </View>
                  {deleteConfirmationOpen ? (
                    <View
                      style={{
                        gap: spacing(2),
                        padding: spacing(3),
                        borderWidth: 1,
                        borderColor: colors.destructive,
                        borderRadius: radius.lg,
                        backgroundColor: colors.surfaceMuted,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.destructive,
                          fontWeight: typography.fontWeight.bold,
                        }}
                      >
                        {t("transactions.deleteTitle")}
                      </Text>
                      <Text style={{ color: colors.textSecondary }}>
                        {t("transactions.deleteMessage")}
                      </Text>
                      <View style={styles.modalActions}>
                        <Button
                          label={t("cancel")}
                          variant="secondary"
                          onPress={() => setDeleteConfirmationOpen(false)}
                          disabled={deleteTransaction.isPending}
                        />
                        <Button
                          label={
                            deleteTransaction.isPending
                              ? t("deleting")
                              : t("transactions.delete")
                          }
                          variant="danger"
                          onPress={() => void handleDeleteEditedTransaction()}
                          disabled={deleteTransaction.isPending}
                        />
                      </View>
                    </View>
                  ) : null}
                  {!deleteConfirmationOpen ? (
                    <View style={styles.modalActions}>
                      <Button
                        label={t("transactions.delete")}
                        variant="danger"
                        onPress={() => setDeleteConfirmationOpen(true)}
                        disabled={
                          updateTransaction.isPending ||
                          deleteTransaction.isPending
                        }
                      />
                      <Button
                        label={t("cancel")}
                        variant="secondary"
                        onPress={closeEditTransaction}
                        disabled={deleteTransaction.isPending}
                      />
                      <Button
                        label={
                          updateTransaction.isPending
                            ? t("saving")
                            : t("transactions.saveChanges", {
                                defaultValue: t("settings.saveChanges"),
                              })
                        }
                        onPress={() => void handleSaveTransaction()}
                        disabled={
                          updateTransaction.isPending ||
                          deleteTransaction.isPending ||
                          saveTransactionAllocations.isPending ||
                          (editSplitEnabled &&
                            validateAllocations(
                              Number(editTransaction.amount) || 0,
                              editSplitAllocations,
                            ).length > 0)
                        }
                      />
                    </View>
                  ) : null}
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Page>
  );
}

