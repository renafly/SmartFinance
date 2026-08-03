import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import * as DocumentPicker from "expo-document-picker";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { useResponsiveMetrics } from "@/theme/responsive";

import {
  Page,
  Card,
  Section,
  Field,
  Button,
  Pill,
  formatCurrency,
  formatDate,
} from "@/components/migrated-page";
import {
  EmptyState,
  Table,
  TableCell,
  TableRow,
} from "@/components/data-surface";
import { HouseholdMemberSelect } from "@/components/household-member-select";
import {
  SelectionOptionRow,
  SelectionShell,
  SelectionTrigger,
} from "@/components/selection-shell";
import { GroupedAccountSelect } from "@/components/grouped-account-select";
import {
  GroupedDestinationSelect,
  type DestinationSelection,
} from "@/components/grouped-destination-select";
import { DatePickerField as SharedDatePickerField } from "@/components/date-picker-field";
import { useAuth } from "../../providers/AuthProvider";
import { useAccountsWithBalances } from "../../features/accounts/hooks";
import { useTopLevelCategories } from "../../features/categories/hooks";
import { useHouseholdMemberDetails } from "../../features/households/hooks";
import { useTransactionMovementsInfinite } from "../../features/transactions/hooks/useTransactions";
import { useCreateTransaction } from "../../features/transactions/hooks/useCreateTransaction";
import { useDeleteTransaction } from "../../features/transactions/hooks/useDeleteTransaction";
import { useDeleteCompletedTransfer } from "../../features/transactions/hooks/useDeleteCompletedTransfer";
import { useUpdateCompletedTransfer } from "../../features/transactions/hooks/useUpdateCompletedTransfer";
import { useCreateTransfer } from "../../features/transfers/hooks";
import { useUpdateTransaction } from "../../features/transactions/hooks/useUpdateTransaction";
import { useTransactionCategorySuggestion } from "../../features/transactions/category-suggestions";
import { useTransactionTitleSuggestions } from "../../features/transactions/title-suggestions";
import { resolveCategorySelection } from "../../features/transactions/category-suggestions/selection";
import { validateTransactionAttachment } from "../../features/transactions/services/transaction.service";
import {
  compareTransactions,
  type TransactionListSortKey,
} from "../../features/transactions/utils/transaction-list";
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
import { TransfersContent } from "./transfers";

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

type DropdownFieldProps = {
  label: string;
  valueLabel: string;
  placeholder: string;
  hint?: string;
  selectedKey?: string;
  options: {
    key: string;
    label: string;
    subtitle?: string;
    iconName?: keyof typeof Ionicons.glyphMap;
  }[];
  onChange: (key: string) => void;
};

function DropdownField({
  label,
  valueLabel,
  placeholder,
  hint,
  selectedKey,
  options,
  onChange,
}: DropdownFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: spacing(2) }}>
      <SelectionTrigger
        label={label}
        valueLabel={valueLabel}
        hint={hint}
        placeholder={placeholder}
        iconName="chevron-down-outline"
        onPress={() => setOpen(true)}
      />
      <SelectionShell
        visible={open}
        title={label}
        subtitle={hint ?? placeholder}
        closeLabel={placeholder}
        onClose={() => setOpen(false)}
      >
        <View style={{ gap: spacing(2) }}>
          {options.map((option) => (
            <SelectionOptionRow
              key={option.key}
              title={option.label}
              subtitle={option.subtitle}
              iconName={option.iconName ?? "ellipse-outline"}
              active={
                selectedKey
                  ? option.key === selectedKey
                  : option.label === valueLabel
              }
              onPress={() => {
                onChange(option.key);
                setOpen(false);
              }}
            />
          ))}
        </View>
      </SelectionShell>
    </View>
  );
}

function parseDateInputValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const nextDate = new Date(year, month, day);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DatePickerField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(
    () => parseDateInputValue(value) ?? new Date(),
  );

  if (Platform.OS === "web") {
    return (
      <SharedDatePickerField
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    );
  }

  return (
    <View style={{ gap: spacing(2) }}>
      <Text
        style={
          {
            color: colors.textSecondary,
            fontWeight: typography.fontWeight.semibold as any,
          } as any
        }
      >
        {label}
      </Text>
      <Pressable
        onPress={() => {
          if (!open) {
            setDraftDate(parseDateInputValue(value) ?? new Date());
          }
          setOpen((current) => !current);
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing(3.5),
          paddingVertical: spacing(3),
          borderRadius: radius.mdPlus,
          backgroundColor: colors.surfaceMuted,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={
            {
              color:
                value.trim().length > 0 ? colors.text : colors.textSecondary,
              fontWeight: typography.fontWeight.bold as any,
            } as any
          }
        >
          {value.trim().length > 0 ? value : placeholder}
        </Text>
        <Text
          style={
            {
              color: colors.textSecondary,
              fontWeight: typography.fontWeight.bold as any,
            } as any
          }
        >
          {open ? "▴" : "▾"}
        </Text>
      </Pressable>
      {open ? (
        <View
          style={{
            gap: spacing(2),
            padding: spacing(3),
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <DateTimePicker
            value={draftDate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            presentation={Platform.OS === "android" ? "dialog" : "inline"}
            onValueChange={(_, date) => {
              if (!date) return;
              setDraftDate(date);
              if (Platform.OS === "android") {
                onChange(formatDateInputValue(date));
                setOpen(false);
              }
            }}
            onDismiss={() => setOpen(false)}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: spacing(2),
            }}
          >
            <Button
              label={t("cancel")}
              variant="secondary"
              onPress={() => setOpen(false)}
            />
            <Button
              label={t("done")}
              onPress={() => {
                onChange(formatDateInputValue(draftDate));
                setOpen(false);
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function DateFilterField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation("common");

  return (
    <View style={{ gap: spacing(1.5) }}>
      <DatePickerField
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      {value ? (
        <Pressable
          onPress={() => onChange("")}
          style={({ pressed }) => [
            {
              alignSelf: "flex-start",
              paddingHorizontal: spacing(2.5),
              paddingVertical: spacing(1.5),
              borderRadius: radius.full,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceMuted,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text
            style={
              {
                color: colors.textSecondary,
                fontSize: typography.fontSize[12],
                fontWeight: typography.fontWeight.semibold as any,
              } as any
            }
          >
            {t("clear")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type AttachmentDraft = {
  file: Blob | ArrayBuffer | File;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

const TRANSACTIONS_PAGE_SIZE = 25;

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const responsive = useResponsiveMetrics();
  const { t } = useTranslation("common");
  const { householdId, profile } = useAuth();
  const accountsQuery = useAccountsWithBalances();
  const membersQuery = useHouseholdMemberDetails();
  const createTransaction = useCreateTransaction();
  const createTransfer = useCreateTransfer();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const deleteCompletedTransfer = useDeleteCompletedTransfer();
  const updateCompletedTransfer = useUpdateCompletedTransfer();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [createMovementKind, setCreateMovementKind] = useState<
    "transaction" | "transfer"
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
  const [filtersType, setFiltersType] = useState<
    "all" | "income" | "expense" | "transfer"
  >("all");
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
  const [sortBy, setSortBy] = useState<TransactionListSortKey>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTransaction, setEditTransaction] =
    useState<TransactionEditDraft | null>(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [transferToDelete, setTransferToDelete] = useState<any | null>(null);
  const [transferEdit, setTransferEdit] = useState<TransferEditDraft | null>(null);

  const transactionsQuery = useTransactionMovementsInfinite(
    {
      kind: filtersType === "all" ? undefined : filtersType,
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
      sortBy,
    },
    TRANSACTIONS_PAGE_SIZE,
  );
  const activeCategoryType = editTransaction?.type ?? type;
  const categoriesQuery = useTopLevelCategories(activeCategoryType);
  const filterCategoriesQuery = useTopLevelCategories(
    filtersType === "all" || filtersType === "transfer"
      ? undefined
      : filtersType,
  );
  const transferCategoriesQuery = useTopLevelCategories("account");

  const accounts = accountsQuery.data ?? [];
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  );
  const categoryOptions = useMemo(
    () => [
      {
        key: "",
        label: t("none"),
        iconName: "close-circle-outline" as const,
      },
      ...categories.map((category: any) => ({
        key: category.id,
        label: category.name,
        iconName:
          (category.icon as keyof typeof Ionicons.glyphMap | null) ??
          "pricetag-outline",
      })),
    ],
    [categories, t],
  );
  const filterCategoryOptions = useMemo(
    () => {
      const filterCategories =
        filtersType === "transfer"
          ? (transferCategoriesQuery.data ?? [])
          : (filterCategoriesQuery.data ?? []).filter(
              (category: any) => category.type !== "account",
            );
      return [
        { key: "all", label: t("transactions.allCategories") },
        { key: "uncategorized", label: t("transactions.uncategorized") },
        ...filterCategories.map((category: any) => ({
          key: category.id,
          label: category.name,
          iconName:
            (category.icon as keyof typeof Ionicons.glyphMap | null) ??
            "pricetag-outline",
        })),
      ];
    },
    [
      filterCategoriesQuery.data,
      filtersType,
      t,
      transferCategoriesQuery.data,
    ],
  );
  const acceptedMembers = useMemo(
    () =>
      (membersQuery.data ?? []).filter(
        (member) => member.status === "accepted",
      ),
    [membersQuery.data],
  );
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

    const rows = [...rowsById.values()];

    rows.sort((a: any, b: any) => compareTransactions(a, b, sortBy));

    return rows;
  }, [sortBy, transactionsQuery.data]);
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
  const selectedFilterCategoryLabel =
    filterCategoryOptions.find((item) => item.key === categoryFilter)?.label ??
    t("transactions.allCategories");
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
  const canCreateTransaction =
    !createTransaction.isPending &&
    Boolean(householdId) &&
    Boolean(profile?.id) &&
    Boolean(effectiveAccountId) &&
    title.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date);
  const canCreateMovement =
    canCreateTransaction &&
    (createMovementKind === "transaction" ||
      (Boolean(transferDestination?.id) &&
        transferDestination?.id !== effectiveAccountId));

  const getTransactionAccount = (item: any) => {
    const account =
      item.movement_kind === "transfer"
        ? item.source_account ??
          (accounts as any[]).find(
            (entry) => entry.id === item.source_account_id,
          )
        : (accounts as any[]).find((entry) => entry.id === item.account_id) ??
          item.account;
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
  const handleTransactionsScroll = useCallback(
    (event: any) => {
      if (
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
    [transactionsQuery],
  );

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
  }

  function openCreateTransaction() {
    applyCreateFormReset(getFreshTransactionCreateReset());
    setCreateMovementKind("transaction");
    setTransferDestination(null);
    setCreateModalOpen(true);
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
      await createTransaction.mutateAsync({
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
      return;
    }

    applyCreateFormReset(getFreshTransactionCreateReset());
    setTransferDestination(null);
    setCreateModalOpen(false);
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
    ) return;

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
                  filtersOpen ? "chevron-up-outline" : "chevron-down-outline"
                }
                size={18}
                color={colors.text}
              />
              <Text style={[styles.filterToggleLabel, { color: colors.text }]}>
                {filtersOpen
                  ? t("transactions.hideFilters")
                  : t("transactions.showFilters")}
              </Text>
            </Pressable>
          }
        >
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
                  {(["all", "income", "expense", "transfer"] as const).map((item) => (
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
                        }
                      }}
                    />
                  ))}
                </View>
              </View>
              {filtersType === "transfer" ? (
                <>
                  <View style={[styles.filterGridItem, { flexBasis: filterItemWidth, maxWidth: filterItemWidth }]}>
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
                      allOption={{ value: "all", label: t("transactions.allSourceAccounts") }}
                      typeLabels={{ bank: t("accounts.types.bank"), cash: t("accounts.types.cash"), savings: t("accounts.types.savings"), credit_card: t("accounts.types.credit_card"), investment: t("accounts.types.investment"), ppr: t("accounts.types.ppr") }}
                    />
                  </View>
                  <View style={[styles.filterGridItem, { flexBasis: filterItemWidth, maxWidth: filterItemWidth }]}>
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
                      allOption={{ value: "all", label: t("transactions.allDestinationAccounts") }}
                      typeLabels={{ bank: t("accounts.types.bank"), cash: t("accounts.types.cash"), savings: t("accounts.types.savings"), credit_card: t("accounts.types.credit_card"), investment: t("accounts.types.investment"), ppr: t("accounts.types.ppr") }}
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
                    ["newest", "oldest", "amount_desc", "amount_asc"] as const
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
                  label={t("transactions.categoryFilter")}
                  valueLabel={selectedFilterCategoryLabel}
                  placeholder={t("transactions.allCategories")}
                  hint={t("transactions.categoryFilterHint")}
                  selectedKey={categoryFilter}
                  onChange={(value) => setCategoryFilter(value || "all")}
                  options={filterCategoryOptions}
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
                    { key: "all", label: t("all", { defaultValue: "All" }) },
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
                <DateFilterField
                  label={t("transactions.dateFrom")}
                  value={dateFrom}
                  onChange={setDateFrom}
                  placeholder={t("transactions.dateFromPlaceholder")}
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
                <DateFilterField
                  label={t("transactions.dateTo")}
                  value={dateTo}
                  onChange={setDateTo}
                  placeholder={t("transactions.dateToPlaceholder")}
                />
              </View>
            </View>
          ) : null}
        </Section>
      </Card>

      <Modal
        visible={createModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCreateModalOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t("cancel")}
          />
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
                  onPress={() => setCreateModalOpen(false)}
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
              <ScrollView
                style={styles.createModalScroll}
                contentContainerStyle={styles.createModalBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.typeSelector}>
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                  {(["income", "expense", "transfer"] as const).map((item) => (
                    <Pill
                      key={item}
                      label={t(
                        item === "transfer"
                          ? "transactions.movementKinds.transfer"
                          : `transactions.types.${item}`,
                      )}
                      active={
                        item === "transfer"
                          ? createMovementKind === "transfer"
                          : createMovementKind === "transaction" && type === item
                      }
                      onPress={() => {
                        const isTransfer = item === "transfer";
                        setCreateMovementKind(
                          isTransfer ? "transfer" : "transaction",
                        );
                        if (!isTransfer) setType(item);
                        setCategoryId(null);
                        setCategoryIsAutomatic(!isTransfer);
                        if (isTransfer) setAttachment(null);
                        else setTransferDestination(null);
                      }}
                    />
                  ))}
                </View>
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
                      setTimeout(() => setTitleSuggestionsFocused(false), 120)
                    }
                    onKeyPress={({ nativeEvent }) => {
                      if (!visibleTitleSuggestions.length) return;
                      if (nativeEvent.key === "ArrowDown") {
                        setActiveTitleSuggestion(
                          (current) =>
                            (current + 1) % visibleTitleSuggestions.length,
                        );
                      } else if (nativeEvent.key === "ArrowUp") {
                        setActiveTitleSuggestion(
                          (current) =>
                            (current - 1 + visibleTitleSuggestions.length) %
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
                    accessibilityHint={t("transactions.titleSuggestionHint")}
                  />
                  {titleSuggestionsFocused &&
                  visibleTitleSuggestions.length > 0 ? (
                    <View
                      style={styles.titleSuggestionBox}
                      accessibilityRole="menu"
                      accessibilityLabel={t("transactions.titleSuggestions")}
                    >
                      {visibleTitleSuggestions.map((suggestion, index) => {
                        const accountName = accounts.find(
                          (item: any) => item.id === suggestion.accountId,
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
                            <Text style={styles.titleSuggestionContext}>
                              {context}
                            </Text>
                          </Pressable>
                        );
                      })}
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
                      .filter((account: any) => account.id !== effectiveAccountId)
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
                {createMovementKind === "transaction" ? <DropdownField
                  label={t("transactions.categories")}
                  valueLabel={
                    effectiveCategoryId
                      ? (categories?.find(
                          (item: any) => item.id === effectiveCategoryId,
                        )?.name ??
                        categorySuggestion.data?.categoryName ??
                        t("transactions.uncategorized"))
                      : t("none")
                  }
                  placeholder={t("transactions.categories")}
                  hint={t("transactions.categories")}
                  selectedKey={effectiveCategoryId ?? ""}
                  onChange={(value) => {
                    setCategoryId(value || null);
                    setCategoryIsAutomatic(false);
                  }}
                  options={categoryOptions}
                /> : null}
                {createMovementKind === "transaction" ? <View
                  style={styles.categorySuggestionStatus}
                  accessibilityLiveRegion="polite"
                >
                  {categoryIsAutomatic && categorySuggestion.isFetching ? (
                    <Text style={styles.categorySuggestionText}>
                      {t("transactions.categorySuggestionLoading")}
                    </Text>
                  ) : categoryIsAutomatic && categorySuggestion.isError ? (
                    <Text style={styles.categorySuggestionText}>
                      {t("transactions.categorySuggestionUnavailable")}
                    </Text>
                  ) : categoryIsAutomatic &&
                    categorySuggestion.data?.confidence === "high" ? (
                    <Text style={styles.categorySuggestionText}>
                      {t("transactions.categorySuggestionHigh", {
                        count: categorySuggestion.data.matchCount,
                      })}
                    </Text>
                  ) : categoryIsAutomatic &&
                    categorySuggestion.data?.confidence === "medium" ? (
                    <Text style={styles.categorySuggestionText}>
                      {t("transactions.categorySuggestionMedium", {
                        category: categorySuggestion.data.categoryName,
                        count: categorySuggestion.data.matchCount,
                      })}
                    </Text>
                  ) : null}
                </View> : null}
                {createMovementKind === "transaction" ? <View style={{ gap: spacing(2) } as any}>
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
                          fontWeight: typography.fontWeight.semibold as any,
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
                            fontWeight: typography.fontWeight.semibold as any,
                          } as any
                        }
                      >
                        {t("transactions.attachmentSelected")}
                      </Text>
                      <Text style={{ color: colors.textSecondary } as any}>
                        {attachment.fileName} ·{" "}
                        {(attachment.fileSize / 1024).toFixed(1)} KB
                      </Text>
                      <Button
                        label={t("transactions.removeAttachment")}
                        onPress={() => setAttachment(null)}
                        variant="secondary"
                      />
                    </View>
                  ) : null}
                </View> : null}
              </ScrollView>
              <View
                style={[
                  styles.createModalFooter,
                  { borderColor: colors.border },
                ]}
              >
                <Button
                  label={t("cancel")}
                  variant="secondary"
                  onPress={() => setCreateModalOpen(false)}
                />
                <View style={styles.createModalPrimaryActions}>
                  <Button
                    label={
                      createTransaction.isPending || createTransfer.isPending
                        ? t("saving")
                        : t("transactions.createAndNew")
                    }
                    variant="secondary"
                    onPress={() => void handleCreate(true)}
                    disabled={!canCreateMovement}
                  />
                  <Button
                    label={
                      createTransaction.isPending || createTransfer.isPending
                        ? t("saving")
                        : createMovementKind === "transfer"
                          ? t("transactions.createTransfer")
                          : t("transactions.create")
                    }
                    onPress={() => void handleCreate()}
                    disabled={!canCreateMovement}
                  />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Section
        title={t("transactions.latestTitle")}
        subtitle={t("transactions.latestSubtitle", {
          count: transactions.length,
        })}
        action={
          <Button
            label={t("transactions.addTransaction")}
            onPress={openCreateTransaction}
          />
        }
      >
        {transactions.length ? (
          <>
            <Table
              columns={[
                { label: t("transactions.titleLabel"), flex: 2.2 },
                { label: t("transactions.account"), flex: 1.3 },
                { label: t("transactions.accountOwner"), flex: 1.15 },
                { label: t("transactions.createdBy"), flex: 1.15 },
                { label: t("transactions.amountLabel"), align: "right" },
                { label: t("transactions.balanceAfter"), align: "right" },
                { label: "", flex: 0.35, align: "right" },
              ]}
            >
              {transactions.map((item: any) => {
                const ownerTone = getTransactionAccountOwnerTone(item);
                const rowTone =
                  item.movement_kind === "transfer"
                    ? {
                        surface: colors.transferRow,
                        accent: colors.financialNeutral,
                      }
                    : ownerTone;

                return (
                  <TableRow
                    key={item.id}
                    backgroundColor={rowTone.surface}
                    accentColor={rowTone.accent}
                  >
                    <TableCell flex={2.2}>
                      <View style={styles.transactionIdentity}>
                        <View
                          style={[
                            styles.transactionIcon,
                            {
                              backgroundColor:
                                item.movement_kind === "transfer"
                                  ? colors.surface
                                  : item.type === "expense"
                                  ? colors.destructiveSoft
                                  : colors.successSoft,
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              item.movement_kind === "transfer"
                                ? "swap-horizontal-outline"
                                : (item.category?.icon ?? "pricetag-outline") as any
                            }
                            size={18}
                            color={
                              item.movement_kind === "transfer"
                                ? colors.financialNeutral
                                : item.type === "expense"
                                ? colors.destructive
                                : colors.success
                            }
                          />
                        </View>
                        <View style={styles.transactionDetails}>
                          <Text style={styles.transactionTitle}>
                            {item.title}
                          </Text>
                          <Text style={styles.transactionContext}>
                            {item.movement_kind === "transfer"
                              ? t("transactions.filters.transfer")
                              : item.category?.name ??
                                t("transactions.uncategorized")}{" "}
                            · {formatDate(item.transaction_date)}
                          </Text>
                        </View>
                      </View>
                    </TableCell>
                    <TableCell flex={1.3}>
                      <Text style={styles.transactionAccount}>
                        {item.movement_kind === "transfer"
                          ? `${item.source_account?.name ?? t("transactions.sourceAccount")} → ${item.destination_account?.name ?? t("transactions.destinationAccount")}`
                          : getTransactionAccountLabel(item)}
                      </Text>
                    </TableCell>
                    <TableCell flex={1.15}>
                      <View style={styles.personIdentity}>
                        <Ionicons
                          name="person-outline"
                          size={15}
                          color={rowTone.accent}
                        />
                        <Text style={styles.transactionAccount}>
                          {getTransactionAccountOwnerLabel(item)}
                        </Text>
                      </View>
                    </TableCell>
                    <TableCell flex={1.15}>
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
                    <TableCell align="right">
                      <Text
                        style={[
                          styles.transactionAmount,
                          {
                            color:
                              item.movement_kind === "transfer"
                                ? colors.financialNeutral
                                : item.type === "expense"
                                ? colors.destructive
                                : colors.success,
                          },
                        ]}
                      >
                        {item.movement_kind === "transfer"
                          ? ""
                          : item.type === "expense"
                            ? "-"
                            : "+"}
                        {formatCurrency(item.amount)}
                      </Text>
                    </TableCell>
                    <TableCell align="right">
                      <Text style={styles.transactionBalance}>
                        {item.movement_kind === "transfer" ||
                        item.balance_after_transaction == null
                          ? "—"
                          : formatCurrency(item.balance_after_transaction)}
                      </Text>
                    </TableCell>
                    <TableCell flex={0.35} align="right" mobilePinned>
                      {item.movement_kind !== "transfer" ? <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("transactions.editTitle")}
                        onPress={() => openEditTransaction(item)}
                        style={({ pressed }) =>
                          [styles.menuButton, pressed && styles.pressed] as any
                        }
                      >
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color={colors.text}
                        />
                      </Pressable> : (
                        <View style={{ flexDirection: "row", gap: spacing(1) }}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("transactions.editTransfer")}
                            onPress={() => setTransferEdit({
                              transferGroupId: item.transfer_group_id,
                              title: item.title ?? "",
                              amount: String(item.amount ?? ""),
                              date: item.transaction_date?.slice?.(0, 10) ?? "",
                              notes: item.notes ?? "",
                              sourceAccountId: item.source_account_id ?? "",
                              destinationAccountId: item.destination_account_id ?? "",
                              categoryId: item.category_id ?? null,
                            })}
                            style={({ pressed }) => [styles.menuButton, pressed && styles.pressed] as any}
                          >
                            <Ionicons name="create-outline" size={18} color={colors.text} />
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("transactions.deleteTransfer")}
                            onPress={() => setTransferToDelete(item)}
                            style={({ pressed }) => [styles.menuButton, pressed && styles.pressed] as any}
                          >
                            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                          </Pressable>
                        </View>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </Table>
            {transactionsQuery.isFetchingNextPage ? (
              <Text
                style={
                  { color: colors.textSecondary, marginTop: spacing(2) } as any
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

      <TransfersContent embedded />

      <Modal
        visible={transferEdit !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTransferEdit(null)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTransferEdit(null)} />
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={[styles.modalCard, { width: responsive.isPhone ? "100%" : spacing(120), borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t("transactions.editTransfer")}</Text>
              {transferEdit ? <>
                <Field label={t("transactions.titleLabel")} value={transferEdit.title} onChangeText={(title) => setTransferEdit((current) => current ? { ...current, title } : current)} />
                <Field label={t("transactions.amountLabel")} value={transferEdit.amount} keyboardType="decimal-pad" onChangeText={(amount) => setTransferEdit((current) => current ? { ...current, amount } : current)} />
                <DatePickerField label={t("transactions.dateLabel")} value={transferEdit.date} placeholder={t("transactions.dateLabel")} onChange={(date) => setTransferEdit((current) => current ? { ...current, date } : current)} />
                <DropdownField
                  label={t("transactions.sourceAccount")}
                  valueLabel={accounts.find((account: any) => account.id === transferEdit.sourceAccountId)?.name ?? t("transactions.sourceAccount")}
                  placeholder={t("transactions.sourceAccount")}
                  selectedKey={transferEdit.sourceAccountId}
                  options={accounts.filter((account: any) => account.id !== transferEdit.destinationAccountId).map((account: any) => ({ key: account.id, label: account.name }))}
                  onChange={(sourceAccountId) => setTransferEdit((current) => current ? { ...current, sourceAccountId } : current)}
                />
                <DropdownField
                  label={t("transactions.destinationAccount")}
                  valueLabel={accounts.find((account: any) => account.id === transferEdit.destinationAccountId)?.name ?? t("transactions.destinationAccount")}
                  placeholder={t("transactions.destinationAccount")}
                  selectedKey={transferEdit.destinationAccountId}
                  options={accounts.filter((account: any) => account.id !== transferEdit.sourceAccountId).map((account: any) => ({ key: account.id, label: account.name }))}
                  onChange={(destinationAccountId) => setTransferEdit((current) => current ? { ...current, destinationAccountId } : current)}
                />
                <DropdownField
                  label={t("transactions.categoryFilter")}
                  valueLabel={transferEdit.categoryId ? transferCategoriesQuery.data?.find((category: any) => category.id === transferEdit.categoryId)?.name ?? t("transactions.uncategorized") : t("none")}
                  placeholder={t("none")}
                  selectedKey={transferEdit.categoryId ?? ""}
                  options={[{ key: "", label: t("none") }, ...(transferCategoriesQuery.data ?? []).map((category: any) => ({ key: category.id, label: category.name }))]}
                  onChange={(categoryId) => setTransferEdit((current) => current ? { ...current, categoryId: categoryId || null } : current)}
                />
                <Field label={t("transactions.notesLabel")} value={transferEdit.notes} multiline onChangeText={(notes) => setTransferEdit((current) => current ? { ...current, notes } : current)} />
              </> : null}
              <View style={styles.modalActions}>
                <Button label={t("cancel")} variant="secondary" onPress={() => setTransferEdit(null)} />
                <Button label={updateCompletedTransfer.isPending ? t("saving") : t("transactions.saveTransfer")} disabled={updateCompletedTransfer.isPending} onPress={() => void handleSaveTransfer()} />
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
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTransferToDelete(null)} />
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("transactions.deleteTransferTitle")}
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              {t("transactions.deleteTransferMessage", { title: transferToDelete?.title })}
            </Text>
            <View style={styles.modalActions}>
              <Button label={t("cancel")} variant="secondary" onPress={() => setTransferToDelete(null)} />
              <Button
                label={deleteCompletedTransfer.isPending ? t("deleting") : t("transactions.deleteTransfer")}
                variant="danger"
                disabled={deleteCompletedTransfer.isPending}
                onPress={() => {
                  const groupId = transferToDelete?.transfer_group_id;
                  if (!groupId) return;
                  void deleteCompletedTransfer.mutateAsync(groupId).then(() => setTransferToDelete(null));
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
          />
          <View style={styles.modalCard}>
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
                <View style={{ flexDirection: "row", gap: spacing(2) } as any}>
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
                <DropdownField
                  label={t("transactions.categories")}
                  valueLabel={
                    editTransaction.categoryId
                      ? (categories.find(
                          (item: any) => item.id === editTransaction.categoryId,
                        )?.name ?? t("transactions.uncategorized"))
                      : t("none")
                  }
                  placeholder={t("transactions.categories")}
                  hint={t("transactions.categories")}
                  selectedKey={editTransaction.categoryId ?? ""}
                  options={categoryOptions}
                  onChange={(value) =>
                    setEditTransaction((current) =>
                      current
                        ? { ...current, categoryId: value || null }
                        : current,
                    )
                  }
                />
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
                        deleteTransaction.isPending
                      }
                    />
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </Page>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    transactionHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing(3),
    },
    transactionIdentity: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing(2),
    },
    transactionIcon: {
      width: spacing(9),
      height: spacing(9),
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    transactionDetails: { flex: 1, gap: spacing(0.5) },
    transactionTitle: {
      color: colors.text,
      fontWeight: String(typography.fontWeight.bold),
    },
    transactionAccount: {
      color: colors.text,
      fontWeight: String(typography.fontWeight.semibold),
    },
    transactionCreator: {
      color: colors.primary,
      fontWeight: String(typography.fontWeight.bold),
    },
    transactionContext: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
    },
    transactionAmount: {
      fontSize: typography.fontSize[16],
      fontWeight: String(typography.fontWeight.extraBold),
    },
    transactionBalance: {
      color: colors.text,
      fontSize: typography.fontSize[14],
      fontWeight: String(typography.fontWeight.bold),
    },
    personIdentity: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing(1.5),
    },
    menuButton: {
      width: spacing(10.5),
      height: spacing(10.5),
      borderRadius: radius.mdPlus,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    menuButtonText: {
      color: colors.text,
      fontSize: typography.fontSize[22],
      fontWeight: String(typography.fontWeight.extraBold),
      lineHeight: typography.lineHeight[22],
    },
    floatingCreateButton: {
      position: "absolute",
      right: spacing(6),
      bottom: spacing(6),
      zIndex: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing(2),
      paddingHorizontal: spacing(4),
      paddingVertical: spacing(3),
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    floatingCreateButtonText: {
      color: colors.primaryForeground,
      fontSize: typography.fontSize[14],
      fontWeight: String(typography.fontWeight.extraBold),
    },
    floatingCreateSpacer: {
      height: spacing(16),
    },
    filterToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing(1.5),
      borderWidth: 1,
      borderRadius: radius.lg,
      paddingHorizontal: spacing(3),
      paddingVertical: spacing(2),
    },
    filterToggleLabel: {
      fontSize: typography.fontSize[13],
      fontWeight: typography.fontWeight.semibold as any,
    },
    filtersGrid: {
      width: "100%",
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-start",
      gap: spacing(3),
    },
    filterGridItem: {
      minWidth: 0,
      alignSelf: "stretch",
    },
    filterChoiceGroup: {
      gap: spacing(2),
      padding: spacing(3),
      borderWidth: 1,
      borderRadius: radius.lg,
    },
    filterGroupLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing(1.5),
    },
    filterGroupLabelText: {
      fontSize: typography.fontSize[13],
      fontWeight: typography.fontWeight.semibold as any,
    },
    filterPills: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: spacing(2),
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: "center",
      padding: spacing(5),
      backgroundColor: "rgba(2, 6, 23, 0.82)",
    },
    modalKeyboardView: {
      width: "100%",
      maxHeight: "92%",
      alignSelf: "center",
    },
    createModalCard: {
      width: "100%",
      maxWidth: spacing(190),
      maxHeight: "100%",
      alignSelf: "center",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
    },
    createModalHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing(3),
      paddingHorizontal: spacing(5),
      paddingVertical: spacing(4),
      borderBottomWidth: 1,
    },
    modalIcon: {
      width: spacing(11),
      height: spacing(11),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.lg,
    },
    modalHeading: {
      flex: 1,
      gap: spacing(0.5),
    },
    modalClose: {
      width: spacing(10),
      height: spacing(10),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderRadius: radius.full,
    },
    modalPressed: {
      opacity: 0.72,
    },
    createModalScroll: {
      flexShrink: 1,
    },
    createModalBody: {
      gap: spacing(3.5),
      padding: spacing(5),
    },
    typeSelector: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: spacing(2),
      padding: spacing(2),
      borderWidth: 1,
      borderRadius: radius.full,
    },
    formGrid: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing(3),
    },
    formGridCompact: {
      flexDirection: "column",
    },
    formGridItem: {
      flex: 1,
      width: "100%",
      minWidth: 0,
    },
    createModalFooter: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing(2.5),
      paddingHorizontal: spacing(5),
      paddingVertical: spacing(3.5),
      borderTopWidth: 1,
      backgroundColor: colors.surface,
    },
    createModalPrimaryActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: spacing(2.5),
    },
    modalCard: {
      width: "100%",
      maxWidth: spacing(160),
      alignSelf: "center",
      gap: spacing(3.5),
      padding: spacing(4.5),
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
    },
    menuCard: {
      width: "100%",
      maxWidth: spacing(96),
      alignSelf: "center",
      gap: spacing(3),
      padding: spacing(4.5),
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
    },
    modalTitle: {
      color: colors.text,
      fontSize: typography.fontSize[20],
      fontWeight: String(typography.fontWeight.extraBold),
    },
    modalSubtitle: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[13],
      lineHeight: typography.lineHeight[18],
    },
    categorySuggestionStatus: {
      minHeight: spacing(4.5),
      justifyContent: "center",
    },
    categorySuggestionText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
      lineHeight: typography.lineHeight[18],
    },
    titleSuggestionBox: {
      marginTop: spacing(1.5),
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
    },
    titleSuggestionRow: {
      gap: spacing(0.5),
      paddingHorizontal: spacing(3.5),
      paddingVertical: spacing(2.5),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    titleSuggestionRowActive: { backgroundColor: colors.primarySoft },
    titleSuggestionTitle: {
      color: colors.text,
      fontSize: typography.fontSize[14],
      fontWeight: String(typography.fontWeight.bold),
    },
    titleSuggestionContext: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
    },
    modalActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing(2.5),
      justifyContent: "flex-end",
    },
    menuItem: {
      paddingVertical: spacing(3.5),
      paddingHorizontal: spacing(3.5),
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    menuItemDanger: {
      paddingVertical: spacing(3.5),
      paddingHorizontal: spacing(3.5),
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.destructiveBorder,
      backgroundColor: colors.destructiveSoft,
    },
    menuItemText: {
      color: colors.text,
      fontSize: typography.fontSize[14],
      fontWeight: String(typography.fontWeight.bold),
    },
    menuItemTextDanger: {
      color: colors.destructive,
      fontSize: typography.fontSize[14],
      fontWeight: String(typography.fontWeight.bold),
    },
    pressed: {
      opacity: 0.85,
    },
  } as any);
}
