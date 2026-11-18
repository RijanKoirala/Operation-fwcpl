import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Landmark,
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  ShieldAlert,
  ArrowUpDown,
  History,
  Check,
  ChevronRight,
  Info,
  DollarSign,
  Ban,
  ArrowRightLeft,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  PiggyBank,
  Eye,
  Sliders,
  Layers,
  FileCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  BranchRevenue,
  AccountsDashboardCards,
  BranchRevenueSummaryItem,
  AccountsReportTrendPoint,
  BranchComparisonItem,
  AccountsReportMetrics,
  AccountItem,
  AccountTransactionItem,
  CashDepositCollectionQueueItem,
  CashDepositItem,
  CashDepositAllocationItem,
  AccountExpenseItem,
} from '../types';

interface AccountsProps {
  initialTab?: 'dashboard' | 'revenue' | 'deposits' | 'banks' | 'reports';
  onNavigate?: (path: string) => void;
}

// Chart color palette
const CHART_COLORS = [
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#3b82f6', '#d946ef', '#eab308', '#0ea5e9', '#a855f7',
  '#64748b', '#22c55e', '#ef4444', '#e11d48', '#0284c7'
];

export const Accounts: React.FC<AccountsProps> = ({ initialTab = 'dashboard', onNavigate }) => {
  const { user, hasPermission } = useAuth();

  // Role & Scope Detection
  const roleNameUpper = (user?.role || '').toUpperCase().replace(/\s+/g, '_');
  const roleNameAlt = ((user as any)?.roleName || (user as any)?.role_name || '').toUpperCase().replace(/\s+/g, '_');
  const usernameLower = (user?.username || '').toLowerCase();

  const isSuperAdmin =
    roleNameUpper === 'SUPER_ADMIN' ||
    roleNameAlt === 'SUPER_ADMIN' ||
    usernameLower === 'superadmin' ||
    hasPermission('accounts.dashboard') ||
    hasPermission('accounts.view');

  const hasRevenueView = isSuperAdmin || hasPermission('accounts.revenue.view') || hasPermission('accounts');
  const hasRevenueCreate = isSuperAdmin || hasPermission('accounts.revenue.create') || hasPermission('accounts');
  const hasRevenueEdit = isSuperAdmin || hasPermission('accounts.revenue.edit') || hasPermission('accounts');
  const hasDepositsView = isSuperAdmin || hasPermission('accounts.deposits.view') || hasRevenueView;
  const hasBanksView = isSuperAdmin || hasPermission('accounts.banks.view');
  const hasReportsView = isSuperAdmin || hasPermission('accounts.reports.view');
  const hasExport = isSuperAdmin || hasPermission('accounts.export');

  const userBranchId = user?.branchId || (user as any)?.branch_id;
  const userBranchName = user?.branchName || (user as any)?.branch_name || 'My Branch';

  // Navigation tab state: Super Admin defaults to dashboard or initialTab; Branch user defaults to revenue
  const [activeTab, setActiveTab] = useState<'dashboard' | 'revenue' | 'deposits' | 'banks' | 'reports'>(() => {
    if (!isSuperAdmin) {
      return initialTab === 'deposits' ? 'deposits' : 'revenue';
    }
    return initialTab || 'dashboard';
  });

  // Keep active tab in sync if initialTab changes
  useEffect(() => {
    if (initialTab) {
      if (!isSuperAdmin) {
        if (initialTab === 'deposits' || initialTab === 'revenue') {
          setActiveTab(initialTab);
        }
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [initialTab, isSuperAdmin]);

  // Handle tab switch and update URL
  const handleTabChange = (tab: 'dashboard' | 'revenue' | 'deposits' | 'banks' | 'reports') => {
    setActiveTab(tab);
    if (onNavigate) {
      if (tab === 'dashboard') onNavigate('accounts');
      else if (tab === 'revenue') onNavigate('accounts/revenue');
      else if (tab === 'deposits') onNavigate('accounts/deposits');
      else if (tab === 'banks') onNavigate('accounts/banks');
      else if (tab === 'reports') onNavigate('accounts/report');
    }
  };

  // Branches catalog
  const [branches, setBranches] = useState<any[]>([]);
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/branches');
        if (res && res.success && Array.isArray(res.data)) {
          setBranches(res.data);
        } else if (res && Array.isArray(res.branches)) {
          setBranches(res.branches);
        }
      } catch (err) {
        console.warn('Failed to load branches list:', err);
      }
    };
    fetchBranches();
  }, []);

  // Active Bank / Wallet / Cash Accounts
  const [activeAccounts, setActiveAccounts] = useState<AccountItem[]>([]);
  const fetchActiveAccounts = async () => {
    try {
      const res = await api.accounts.getActiveAccounts();
      if (res && res.success && Array.isArray(res.accounts)) {
        setActiveAccounts(
          res.accounts.map((a: any) => ({
            ...a,
            accountName: a.accountName || a.account_name,
            accountType: a.accountType || a.account_type,
          }))
        );
      }
    } catch (err) {
      console.warn('Failed to load active bank accounts:', err);
    }
  };

  useEffect(() => {
    fetchActiveAccounts();
  }, []);

  // Helpers
  const getTodayInputStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // ============================================================
  // TAB 1: DASHBOARD STATE & LOGIC
  // ============================================================
  const [dashLoading, setDashLoading] = useState(false);
  const [dashPeriod, setDashPeriod] = useState<string>('month');
  const [dashBranch, setDashBranch] = useState<string>('ALL');
  const [dashStartDate, setDashStartDate] = useState<string>('');
  const [dashEndDate, setDashEndDate] = useState<string>('');
  const [dashSortBy, setDashSortBy] = useState<string>('revenue');
  const [dashSortOrder, setDashSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dashBranchSearch, setDashBranchSearch] = useState('');

  const [dashCards, setDashCards] = useState<AccountsDashboardCards>({
    today: 0,
    yesterday: 0,
    thisWeek: 0,
    thisMonth: 0,
    thisYear: 0,
    selectedPeriod: 0,
    selectedEntries: 0,
    periodLabel: 'This Month',
    todayCash: 0,
    todayOnline: 0,
    cashUndeposited: 0,
    todayDeposits: 0,
    todayExpenses: 0,
    totalBankBalance: 0,
    totalCashBalance: 0,
    totalAvailableFunds: 0,
  });
  const [dashBranchSummary, setDashBranchSummary] = useState<BranchRevenueSummaryItem[]>([]);

  const fetchDashboardData = async () => {
    if (!isSuperAdmin) return;
    setDashLoading(true);
    try {
      const params: any = {
        period: dashPeriod,
        branchId: dashBranch,
        sortBy: dashSortBy,
        sortOrder: dashSortOrder,
      };
      if (dashPeriod === 'custom' && dashStartDate && dashEndDate) {
        params.startDate = dashStartDate;
        params.endDate = dashEndDate;
      }
      const res = await api.accounts.getDashboard(params);
      if (res && res.success) {
        setDashCards(res.summaryCards || {});
        setDashBranchSummary(res.branchesSummary || []);
      }
    } catch (err: any) {
      console.error('Failed to load accounts dashboard:', err);
    } finally {
      setDashLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard' && isSuperAdmin) {
      fetchDashboardData();
    }
  }, [activeTab, dashPeriod, dashBranch, dashSortBy, dashSortOrder]);

  const filteredBranchSummary = useMemo(() => {
    if (!dashBranchSearch.trim()) return dashBranchSummary;
    const q = dashBranchSearch.toLowerCase().trim();
    return dashBranchSummary.filter(
      b =>
        b.branchName.toLowerCase().includes(q) ||
        (b.branchCode && b.branchCode.toLowerCase().includes(q)) ||
        (b.city && b.city.toLowerCase().includes(q))
    );
  }, [dashBranchSummary, dashBranchSearch]);

  // ============================================================
  // TAB 2: REVENUE ENTRIES STATE & LOGIC
  // ============================================================
  const [revLoading, setRevLoading] = useState(false);
  const [revenues, setRevenues] = useState<BranchRevenue[]>([]);
  const [revPage, setRevPage] = useState(1);
  const [revTotalPages, setRevTotalPages] = useState(1);
  const [revTotalCount, setRevTotalCount] = useState(0);
  const [revTotalAmount, setRevTotalAmount] = useState(0);

  // Revenue Filters
  const [revSearch, setRevSearch] = useState('');
  const [revBranchFilter, setRevBranchFilter] = useState<string>(isSuperAdmin ? 'ALL' : String(userBranchId || ''));
  const [revStatusFilter, setRevStatusFilter] = useState<string>('Active');
  const [revTypeFilter, setRevTypeFilter] = useState<string>('ALL');
  const [revStartDate, setRevStartDate] = useState<string>('');
  const [revEndDate, setRevEndDate] = useState<string>('');
  const [revSortBy, setRevSortBy] = useState<string>('revenue_date');
  const [revSortOrder, setRevSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchRevenues = async (page = revPage) => {
    setRevLoading(true);
    try {
      const params: any = {
        page,
        limit: 20,
        search: revSearch.trim(),
        branchId: isSuperAdmin ? revBranchFilter : userBranchId,
        status: revStatusFilter,
        sortBy: revSortBy,
        sortOrder: revSortOrder,
      };
      if (revTypeFilter !== 'ALL') params.collectionType = revTypeFilter;
      if (revStartDate) params.startDate = revStartDate;
      if (revEndDate) params.endDate = revEndDate;

      const res = await api.accounts.getRevenues(params);
      if (res && res.success) {
        setRevenues(res.revenues || []);
        setRevTotalPages(res.pagination?.totalPages || 1);
        setRevTotalCount(res.pagination?.total || 0);
        setRevTotalAmount(res.totalAmount || 0);
      }
    } catch (err: any) {
      console.error('Failed to load revenues:', err);
    } finally {
      setRevLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'revenue') {
      fetchRevenues(revPage);
    }
  }, [activeTab, revPage, revBranchFilter, revStatusFilter, revTypeFilter, revSortBy, revSortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRevPage(1);
    fetchRevenues(1);
  };

  const handleClearFilters = () => {
    setRevSearch('');
    if (isSuperAdmin) setRevBranchFilter('ALL');
    setRevStatusFilter('Active');
    setRevTypeFilter('ALL');
    setRevStartDate('');
    setRevEndDate('');
    setRevPage(1);
  };

  const handleJumpToBranchRevenue = (bId: number) => {
    if (!isSuperAdmin) return;
    setRevBranchFilter(String(bId));
    setActiveTab('revenue');
  };

  // ============================================================
  // TAB 3: DEPOSITS STATE & LOGIC
  // ============================================================
  const [depLoading, setDepLoading] = useState(false);
  const [depCards, setDepCards] = useState<any>({
    totalCashCollected: 0,
    totalUndepositedCash: 0,
    undepositedCash: 0,
    totalDepositedCash: 0,
    depositedCash: 0,
    todayDeposits: 0,
    undepositedCollectionsCount: 0,
  });
  const [depCollections, setDepCollections] = useState<CashDepositCollectionQueueItem[]>([]);
  const [depPage, setDepPage] = useState(1);
  const [depTotalPages, setDepTotalPages] = useState(1);
  const [depTotalCount, setDepTotalCount] = useState(0);
  const [depBranchFilter, setDepBranchFilter] = useState('ALL');
  const [depStatusFilter, setDepStatusFilter] = useState('UNDEPOSITED_OR_PARTIAL');
  const [depSearch, setDepSearch] = useState('');

  const fetchDepositsData = async (page = depPage) => {
    if (!hasDepositsView) return;
    setDepLoading(true);
    try {
      const summaryRes = await api.accounts.getDepositsSummary({
        branchId: isSuperAdmin ? depBranchFilter : userBranchId,
      });
      if (summaryRes && summaryRes.success) {
        const cards = summaryRes.summaryCards || summaryRes.summary || {};
        setDepCards({
          totalCashCollected: Number(cards.totalCashCollected || 0),
          totalUndepositedCash: Number(cards.totalUndepositedCash ?? cards.undepositedCash ?? 0),
          undepositedCash: Number(cards.undepositedCash ?? cards.totalUndepositedCash ?? 0),
          totalDepositedCash: Number(cards.totalDepositedCash ?? cards.depositedCash ?? 0),
          depositedCash: Number(cards.depositedCash ?? cards.totalDepositedCash ?? 0),
          todayDeposits: Number(cards.todayDeposits || 0),
          undepositedCollectionsCount: Number(cards.undepositedCollectionsCount || 0),
        });
      }

      const params: any = {
        page,
        limit: 20,
        branchId: isSuperAdmin ? depBranchFilter : userBranchId,
        depositStatus: depStatusFilter,
        search: depSearch.trim(),
      };
      const collRes = await api.accounts.getDepositCollections(params);
      if (collRes && collRes.success) {
        setDepCollections(collRes.collections || []);
        setDepTotalPages(collRes.pagination?.totalPages || 1);
        setDepTotalCount(collRes.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load deposits data:', err);
    } finally {
      setDepLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'deposits' && hasDepositsView) {
      fetchDepositsData(depPage);
    }
  }, [activeTab, depPage, depBranchFilter, depStatusFilter]);

  // Deposit Modal State (Used both from Deposits tab AND Revenue table)
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [targetCollection, setTargetCollection] = useState<CashDepositCollectionQueueItem | null>(null);
  const [depAllocDate, setDepAllocDate] = useState(getTodayInputStr());
  const [depAllocRef, setDepAllocRef] = useState('');
  const [depAllocRemarks, setDepAllocRemarks] = useState('');
  const [allocations, setAllocations] = useState<Array<{ accountId: string; amount: string }>>([
    { accountId: '', amount: '' },
  ]);
  const [depSaving, setDepSaving] = useState(false);
  const [depError, setDepError] = useState<string | null>(null);

  const openDepositModal = (coll: CashDepositCollectionQueueItem | BranchRevenue) => {
    const amt = Number(coll.amount || 0);
    const depAmt = Number(coll.depositedAmount || 0);
    const rem = coll.remainingAmount !== undefined ? Number(coll.remainingAmount) : Math.max(0, amt - depAmt);

    const normColl: CashDepositCollectionQueueItem = {
      id: coll.id,
      revenueCode: coll.revenueCode || `REV-${String(coll.id).padStart(5, '0')}`,
      revenueDate: coll.revenueDate,
      branchId: coll.branchId,
      branchName: coll.branchName,
      amount: amt,
      depositedAmount: depAmt,
      remainingAmount: rem,
      depositStatus: (coll as any).depositStatus || 'Undeposited',
      remarks: coll.remarks,
      createdByName: coll.createdByName,
      createdAt: (coll as any).createdAt || '',
    };

    setTargetCollection(normColl);
    setDepAllocDate(getTodayInputStr());
    setDepAllocRef('');
    setDepAllocRemarks('');

    const firstBank = activeAccounts.find(a => a.accountType === 'BANK') || activeAccounts[0];
    setAllocations([
      {
        accountId: firstBank ? String(firstBank.id) : '',
        amount: String(rem > 0 ? rem : amt),
      },
    ]);
    setDepError(null);
    setShowDepositModal(true);
  };

  const handleAddAllocationRow = () => {
    setAllocations(prev => [...prev, { accountId: '', amount: '' }]);
  };

  const handleRemoveAllocationRow = (index: number) => {
    if (allocations.length <= 1) return;
    setAllocations(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAllocationChange = (index: number, field: 'accountId' | 'amount', value: string) => {
    setAllocations(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const totalAllocatedAmount = useMemo(() => {
    return allocations.reduce((sum, item) => {
      const val = parseFloat(item.amount);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [allocations]);

  const handleSaveDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCollection) return;

    if (totalAllocatedAmount <= 0) {
      setDepError('Total deposit amount must be greater than zero.');
      return;
    }
    if (totalAllocatedAmount > targetCollection.remainingAmount + 0.001) {
      setDepError(
        `Total allocated (Rs. ${totalAllocatedAmount.toLocaleString()}) cannot exceed remaining cash (Rs. ${targetCollection.remainingAmount.toLocaleString()}).`
      );
      return;
    }

    for (let i = 0; i < allocations.length; i++) {
      const a = allocations[i];
      if (!a.accountId) {
        setDepError(`Please select a bank/account for allocation #${i + 1}.`);
        return;
      }
      const amt = parseFloat(a.amount);
      if (isNaN(amt) || amt <= 0) {
        setDepError(`Invalid amount for allocation #${i + 1}.`);
        return;
      }
    }

    setDepSaving(true);
    setDepError(null);
    try {
      const res = await api.accounts.createDeposit({
        revenueId: targetCollection.id,
        depositDate: depAllocDate,
        allocations: allocations.map(a => ({
          accountId: parseInt(a.accountId, 10),
          amount: parseFloat(a.amount),
        })),
        referenceNo: depAllocRef.trim(),
        remarks: depAllocRemarks.trim(),
      });
      if (res && res.success) {
        setShowDepositModal(false);
        fetchDepositsData(depPage);
        fetchRevenues(revPage);
        fetchActiveAccounts();
        if (isSuperAdmin) {
          fetchDashboardData();
          fetchBanksData();
        }
      } else {
        setDepError(res?.message || 'Failed to save deposit.');
      }
    } catch (err: any) {
      setDepError(err.message || 'Error saving deposit.');
    } finally {
      setDepSaving(false);
    }
  };

  // ============================================================
  // TAB 4: BANKS & ACCOUNTS STATE & LOGIC
  // ============================================================
  const [bankLoading, setBankLoading] = useState(false);
  const [bankCards, setBankCards] = useState<any>({
    totalBankBalance: 0,
    totalCashBalance: 0,
    totalOnlineCollection: 0,
    totalCashDeposited: 0,
    totalExpenses: 0,
    totalAvailableFunds: 0,
  });
  const [bankAccounts, setBankAccounts] = useState<AccountItem[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountItem | null>(null);
  const [accountTransactions, setAccountTransactions] = useState<AccountTransactionItem[]>([]);
  const [accountTxLoading, setAccountTxLoading] = useState(false);

  const fetchBanksData = async () => {
    if (!hasBanksView) return;
    setBankLoading(true);
    try {
      const res = await api.accounts.getBanks();
      if (res && res.success) {
        setBankCards(res.summaryCards || {});
        setBankAccounts(res.accounts || []);
      }
    } catch (err) {
      console.error('Failed to load bank accounts:', err);
    } finally {
      setBankLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'banks' && hasBanksView) {
      fetchBanksData();
    }
  }, [activeTab]);

  const handleSelectAccountForLedger = async (account: AccountItem) => {
    setSelectedAccount(account);
    setAccountTxLoading(true);
    try {
      const res = await api.accounts.getBankById(account.id, { limit: 100 });
      if (res && res.success) {
        setAccountTransactions(res.transactions || []);
      }
    } catch (err) {
      console.warn('Failed to load ledger transactions:', err);
    } finally {
      setAccountTxLoading(false);
    }
  };

  // Add Bank / Account Modal State
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'BANK' | 'DIGITAL_WALLET' | 'CASH'>('BANK');
  const [newAccBankName, setNewAccBankName] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccOpeningBal, setNewAccOpeningBal] = useState('0');
  const [newAccRemarks, setNewAccRemarks] = useState('');
  const [newAccSaving, setNewAccSaving] = useState(false);
  const [newAccError, setNewAccError] = useState<string | null>(null);

  const handleSaveNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) {
      setNewAccError('Account name is required.');
      return;
    }
    const openBal = parseFloat(newAccOpeningBal);
    if (isNaN(openBal) || openBal < 0) {
      setNewAccError('Opening balance must be 0 or positive.');
      return;
    }

    setNewAccSaving(true);
    setNewAccError(null);
    try {
      const res = await api.accounts.createBank({
        accountName: newAccName.trim(),
        accountType: newAccType,
        bankName: newAccBankName.trim() || undefined,
        accountNumber: newAccNumber.trim() || undefined,
        openingBalance: openBal,
        remarks: newAccRemarks.trim(),
      });
      if (res && res.success) {
        setShowAddBankModal(false);
        fetchBanksData();
        fetchActiveAccounts();
      } else {
        setNewAccError(res?.message || 'Failed to create account.');
      }
    } catch (err: any) {
      setNewAccError(err.message || 'Error creating account.');
    } finally {
      setNewAccSaving(false);
    }
  };

  // Opening Balance Modal State
  const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);
  const [targetAccountForOpening, setTargetAccountForOpening] = useState<AccountItem | null>(null);
  const [selectedAccountIdForOpening, setSelectedAccountIdForOpening] = useState<string>('');
  const [openingBalanceInput, setOpeningBalanceInput] = useState<string>('0');
  const [openingBalanceSaving, setOpeningBalanceSaving] = useState(false);
  const [openingBalanceError, setOpeningBalanceError] = useState<string | null>(null);

  const openOpeningBalanceModal = (acc?: AccountItem) => {
    if (acc) {
      setTargetAccountForOpening(acc);
      setSelectedAccountIdForOpening(String(acc.id));
      setOpeningBalanceInput(String(acc.openingBalance ?? 0));
    } else {
      const first = bankAccounts[0] || activeAccounts[0];
      setTargetAccountForOpening(first || null);
      setSelectedAccountIdForOpening(first ? String(first.id) : '');
      setOpeningBalanceInput(first ? String(first.openingBalance ?? 0) : '0');
    }
    setOpeningBalanceError(null);
    setShowOpeningBalanceModal(true);
  };

  const handleSaveOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const accId = parseInt(selectedAccountIdForOpening, 10);
    if (!accId) {
      setOpeningBalanceError('Please select an account.');
      return;
    }
    const val = parseFloat(openingBalanceInput);
    if (isNaN(val) || val < 0) {
      setOpeningBalanceError('Opening balance must be 0 or positive.');
      return;
    }

    setOpeningBalanceSaving(true);
    setOpeningBalanceError(null);
    try {
      const res = await api.accounts.updateOpeningBalance(accId, { openingBalance: val });
      if (res && res.success) {
        setShowOpeningBalanceModal(false);
        fetchBanksData();
        fetchActiveAccounts();
        if (isSuperAdmin) fetchDashboardData();
      } else {
        setOpeningBalanceError(res?.message || 'Failed to update opening balance.');
      }
    } catch (err: any) {
      setOpeningBalanceError(err.message || 'Error updating opening balance.');
    } finally {
      setOpeningBalanceSaving(false);
    }
  };

  // Add Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expAccountId, setExpAccountId] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Office Supplies');
  const [expPaidTo, setExpPaidTo] = useState('');
  const [expDate, setExpDate] = useState(getTodayInputStr());
  const [expRefNo, setExpRefNo] = useState('');
  const [expRemarks, setExpRemarks] = useState('');
  const [expSaving, setExpSaving] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);

  const openExpenseModal = () => {
    setExpAccountId(bankAccounts[0] ? String(bankAccounts[0].id) : (activeAccounts[0] ? String(activeAccounts[0].id) : ''));
    setExpAmount('');
    setExpCategory('Office Supplies');
    setExpPaidTo('');
    setExpDate(getTodayInputStr());
    setExpRefNo('');
    setExpRemarks('');
    setExpError(null);
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAccountId) {
      setExpError('Please select payment account.');
      return;
    }
    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) {
      setExpError('Amount must be greater than zero.');
      return;
    }
    if (!expPaidTo.trim()) {
      setExpError('Please specify payee / paid to.');
      return;
    }

    setExpSaving(true);
    setExpError(null);
    try {
      const res = await api.accounts.createExpense({
        accountId: parseInt(expAccountId, 10),
        amount: amt,
        category: expCategory,
        paidTo: expPaidTo.trim(),
        expenseDate: expDate,
        referenceNo: expRefNo.trim(),
        remarks: expRemarks.trim(),
      });
      if (res && res.success) {
        setShowExpenseModal(false);
        fetchBanksData();
        fetchActiveAccounts();
        if (selectedAccount && selectedAccount.id === parseInt(expAccountId, 10)) {
          handleSelectAccountForLedger(selectedAccount);
        }
      } else {
        setExpError(res?.message || 'Failed to record expense.');
      }
    } catch (err: any) {
      setExpError(err.message || 'Error recording expense.');
    } finally {
      setExpSaving(false);
    }
  };

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [trFromAccId, setTrFromAccId] = useState('');
  const [trToAccId, setTrToAccId] = useState('');
  const [trAmount, setTrAmount] = useState('');
  const [trDate, setTrDate] = useState(getTodayInputStr());
  const [trRemarks, setTrRemarks] = useState('');
  const [trSaving, setTrSaving] = useState(false);
  const [trError, setTrError] = useState<string | null>(null);

  const openTransferModal = () => {
    setTrFromAccId(bankAccounts.length > 0 ? String(bankAccounts[0].id) : '');
    setTrToAccId(bankAccounts.length > 1 ? String(bankAccounts[1].id) : '');
    setTrAmount('');
    setTrDate(getTodayInputStr());
    setTrRemarks('');
    setTrError(null);
    setShowTransferModal(true);
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trFromAccId || !trToAccId) {
      setTrError('Please select source and destination accounts.');
      return;
    }
    if (trFromAccId === trToAccId) {
      setTrError('Source and destination accounts must be different.');
      return;
    }
    const amt = parseFloat(trAmount);
    if (isNaN(amt) || amt <= 0) {
      setTrError('Transfer amount must be greater than zero.');
      return;
    }

    setTrSaving(true);
    setTrError(null);
    try {
      const res = await api.accounts.createTransfer({
        fromAccountId: parseInt(trFromAccId, 10),
        toAccountId: parseInt(trToAccId, 10),
        amount: amt,
        transferDate: trDate,
        remarks: trRemarks.trim(),
      });
      if (res && res.success) {
        setShowTransferModal(false);
        fetchBanksData();
        fetchActiveAccounts();
      } else {
        setTrError(res?.message || 'Failed to record transfer.');
      }
    } catch (err: any) {
      setTrError(err.message || 'Error executing transfer.');
    } finally {
      setTrSaving(false);
    }
  };

  // Reconciliation Check Modal State
  const [showReconModal, setShowReconModal] = useState(false);
  const [reconData, setReconData] = useState<any>(null);
  const [reconLoading, setReconLoading] = useState(false);

  const handleCheckReconciliation = async () => {
    setShowReconModal(true);
    setReconLoading(true);
    try {
      const res = await api.accounts.getReconciliation();
      if (res && res.success) {
        setReconData(res.reconciliation);
      }
    } catch (err) {
      console.warn('Reconciliation check failed:', err);
    } finally {
      setReconLoading(false);
    }
  };

  // ============================================================
  // TAB 5: REPORTS STATE & LOGIC
  // ============================================================
  const [repLoading, setRepLoading] = useState(false);
  const [repPeriod, setRepPeriod] = useState<string>('month');
  const [repBranch, setRepBranch] = useState<string>('ALL');
  const [repStartDate, setRepStartDate] = useState<string>('');
  const [repEndDate, setRepEndDate] = useState<string>('');

  const [repMetrics, setRepMetrics] = useState<AccountsReportMetrics>({
    totalRevenue: 0,
    totalEntries: 0,
    averageDaily: 0,
    activeDays: 0,
    highestBranch: null,
    lowestBranch: null,
  });
  const [repTrend, setRepTrend] = useState<AccountsReportTrendPoint[]>([]);
  const [repBranchComparison, setRepBranchComparison] = useState<BranchComparisonItem[]>([]);

  const fetchReportsData = async () => {
    if (!hasReportsView) return;
    setRepLoading(true);
    try {
      const params: any = {
        period: repPeriod,
        branchId: repBranch,
      };
      if (repPeriod === 'custom' && repStartDate && repEndDate) {
        params.startDate = repStartDate;
        params.endDate = repEndDate;
      }
      const res = await api.accounts.getReports(params);
      if (res && res.success) {
        setRepMetrics(res.metrics || {});
        setRepTrend(res.trend || []);
        setRepBranchComparison(res.branchComparison || []);
      }
    } catch (err: any) {
      console.error('Failed to load accounts reports:', err);
    } finally {
      setRepLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports' && hasReportsView) {
      fetchReportsData();
    }
  }, [activeTab, repPeriod, repBranch]);

  // Export CSV Handler
  const handleExportCsv = () => {
    const params: any = {};
    if (activeTab === 'reports') {
      if (repPeriod) params.period = repPeriod;
      if (repBranch && repBranch !== 'ALL') params.branchId = repBranch;
      if (repPeriod === 'custom') {
        if (repStartDate) params.startDate = repStartDate;
        if (repEndDate) params.endDate = repEndDate;
      }
    } else {
      if (revBranchFilter && revBranchFilter !== 'ALL') params.branchId = revBranchFilter;
      if (revStatusFilter && revStatusFilter !== 'all') params.status = revStatusFilter;
      if (revTypeFilter && revTypeFilter !== 'ALL') params.collectionType = revTypeFilter;
      if (revStartDate) params.startDate = revStartDate;
      if (revEndDate) params.endDate = revEndDate;
      if (revSearch) params.search = revSearch;
    }
    const url = api.accounts.exportCsvUrl(params);
    window.open(url, '_blank');
  };

  // ============================================================
  // REVENUE MODALS: Add, Edit, Void, Audit
  // ============================================================
  const [showAddModal, setShowAddModal] = useState(false);
  const [addBranchId, setAddBranchId] = useState<string>(isSuperAdmin ? '' : String(userBranchId || ''));
  const [addDate, setAddDate] = useState<string>(getTodayInputStr());
  const [addAmount, setAddAmount] = useState<string>('');
  const [addCollectionType, setAddCollectionType] = useState<'CASH' | 'ONLINE'>('CASH');
  const [addReceivedAccountId, setAddReceivedAccountId] = useState<string>('');
  const [addRemarks, setAddRemarks] = useState<string>('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const openAddModal = () => {
    setAddBranchId(isSuperAdmin ? (revBranchFilter !== 'ALL' ? revBranchFilter : '') : String(userBranchId || ''));
    setAddDate(getTodayInputStr());
    setAddAmount('');
    setAddCollectionType('CASH');
    const firstBank = activeAccounts.find(a => a.accountType !== 'CASH') || activeAccounts[0];
    setAddReceivedAccountId(firstBank ? String(firstBank.id) : '');
    setAddRemarks('');
    setAddError(null);
    setShowAddModal(true);
  };

  const handleSaveRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(addAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setAddError('Amount must be greater than zero.');
      return;
    }
    if (isSuperAdmin && !addBranchId) {
      setAddError('Please select a branch.');
      return;
    }
    if (addCollectionType === 'ONLINE' && !addReceivedAccountId) {
      setAddError('Please select the receiving bank/digital wallet.');
      return;
    }

    setAddSaving(true);
    setAddError(null);
    try {
      const payload: any = {
        amount: parsedAmt,
        revenueDate: addDate,
        collectionType: addCollectionType,
        remarks: addRemarks.trim(),
      };
      if (addCollectionType === 'ONLINE') {
        payload.receivedAccountId = parseInt(addReceivedAccountId, 10);
      }
      if (isSuperAdmin) {
        payload.branchId = parseInt(addBranchId, 10);
      } else {
        payload.branchId = userBranchId;
      }

      const res = await api.accounts.createRevenue(payload);
      if (res && res.success) {
        setShowAddModal(false);
        if (activeTab === 'revenue') fetchRevenues(1);
        if (isSuperAdmin) fetchDashboardData();
        fetchActiveAccounts();
      } else {
        setAddError(res?.message || 'Failed to save revenue.');
      }
    } catch (err: any) {
      setAddError(err.message || 'Error saving revenue.');
    } finally {
      setAddSaving(false);
    }
  };

  const QUICK_REMARKS = [
    'Daily customer collection',
    'New connection revenue',
    'Renewal collection',
    'Counter collection',
    'Field collection',
    'Merchant QR collection',
  ];

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BranchRevenue | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editRemarks, setEditRemarks] = useState<string>('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = (entry: BranchRevenue) => {
    setEditingEntry(entry);
    setEditDate(entry.revenueDate);
    setEditAmount(String(entry.amount));
    setEditRemarks(entry.remarks || '');
    setEditError(null);
    setShowEditModal(true);
  };

  const handleUpdateRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    const parsedAmt = parseFloat(editAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setEditError('Amount must be greater than zero.');
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      const res = await api.accounts.updateRevenue(editingEntry.id, {
        amount: parsedAmt,
        revenueDate: editDate,
        remarks: editRemarks.trim(),
      });
      if (res && res.success) {
        setShowEditModal(false);
        fetchRevenues(revPage);
        if (isSuperAdmin) fetchDashboardData();
        fetchActiveAccounts();
      } else {
        setEditError(res?.message || 'Failed to update revenue.');
      }
    } catch (err: any) {
      setEditError(err.message || 'Error updating revenue.');
    } finally {
      setEditSaving(false);
    }
  };

  // Void Confirmation Modal
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidingEntry, setVoidingEntry] = useState<BranchRevenue | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [voidSaving, setVoidSaving] = useState(false);

  const openVoidModal = (entry: BranchRevenue) => {
    setVoidingEntry(entry);
    setVoidReason('');
    setShowVoidModal(true);
  };

  const handleConfirmVoid = async () => {
    if (!voidingEntry) return;
    setVoidSaving(true);
    try {
      const res = await api.accounts.voidRevenue(voidingEntry.id, { reason: voidReason.trim() });
      if (res && res.success) {
        setShowVoidModal(false);
        fetchRevenues(revPage);
        if (isSuperAdmin) fetchDashboardData();
        fetchActiveAccounts();
      } else {
        alert(res?.message || 'Failed to void entry.');
      }
    } catch (err: any) {
      alert(err.message || 'Error voiding entry.');
    } finally {
      setVoidSaving(false);
    }
  };

  // History / Audit Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyEntry, setHistoryEntry] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openHistoryModal = async (entry: BranchRevenue) => {
    setShowHistoryModal(true);
    setHistoryEntry(entry);
    setHistoryLoading(true);
    try {
      const res = await api.accounts.getRevenueById(entry.id);
      if (res && res.success) {
        setHistoryEntry(res.revenue);
        setHistoryList(res.history || []);
      }
    } catch (err) {
      console.warn('Failed to load audit history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Accounts & Ledger</h1>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {isSuperAdmin ? 'Central Operations' : userBranchName}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isSuperAdmin
                  ? 'Manage branch revenues, cash deposits, bank accounts & wallets, expenses and real-time ledger balances'
                  : `Record daily revenue collections, deposit cash to banks, and track financial history for ${userBranchName}`}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sub-tabs for Super Admin */}
          {isSuperAdmin && (
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => handleTabChange('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Dashboard
              </button>
              <button
                onClick={() => handleTabChange('revenue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'revenue'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                Revenue
              </button>
              <button
                onClick={() => handleTabChange('deposits')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'deposits'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                Deposits
                {Number(dashCards?.cashUndeposited || 0) > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => handleTabChange('banks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'banks'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PiggyBank className="w-3.5 h-3.5" />
                Banks & Ledger
              </button>
              <button
                onClick={() => handleTabChange('reports')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'reports'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PieChartIcon className="w-3.5 h-3.5" />
                Reports
              </button>
            </div>
          )}

          {/* Sub-tabs for Branch Users (Revenue & Deposits) */}
          {!isSuperAdmin && (
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => handleTabChange('revenue')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'revenue'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                Revenue Entry
              </button>
              <button
                onClick={() => handleTabChange('deposits')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'deposits'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                Bank Deposits
                {Number(depCards?.totalUndepositedCash || depCards?.undepositedCash || 0) > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            </div>
          )}

          {/* Quick Action Button */}
          {hasRevenueCreate && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Revenue
            </button>
          )}

          {hasExport && (
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Export revenue data to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* VIEW 1: SUPER ADMIN DASHBOARD */}
      {/* ============================================================ */}
      {activeTab === 'dashboard' && isSuperAdmin && (
        <div className="space-y-6">
          {/* Dashboard Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Period:</span>
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'year', label: 'This Year' },
                { id: 'custom', label: 'Custom' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setDashPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    dashPeriod === p.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}

              {dashPeriod === 'custom' && (
                <div className="flex items-center gap-1.5 ml-1">
                  <input
                    type="date"
                    value={dashStartDate}
                    onChange={e => setDashStartDate(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={dashEndDate}
                    onChange={e => setDashEndDate(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                  />
                  <button
                    onClick={fetchDashboardData}
                    className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={dashBranch}
                  onChange={e => setDashBranch(e.target.value)}
                  className="text-xs border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchDashboardData}
                disabled={dashLoading}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                title="Refresh Metrics"
              >
                <RefreshCw className={`w-4 h-4 ${dashLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Revenue Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Today</span>
                <Clock className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-lg font-black text-slate-900 tracking-tight">
                Rs. {Number(dashCards?.today || 0).toLocaleString()}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                <span className="text-amber-600 font-bold">C: {Number(dashCards?.todayCash || 0).toLocaleString()}</span>
                <span>•</span>
                <span className="text-indigo-600 font-bold">O: {Number(dashCards?.todayOnline || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Yesterday</span>
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-lg font-black text-slate-900 tracking-tight">
                Rs. {Number(dashCards?.yesterday || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 block mt-1">Full Day Total</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">This Week</span>
                <TrendingUp className="w-4 h-4 text-cyan-500" />
              </div>
              <p className="text-lg font-black text-slate-900 tracking-tight">
                Rs. {Number(dashCards?.thisWeek || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 block mt-1">Sun to Current</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">This Month</span>
                <Wallet className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-lg font-black text-slate-900 tracking-tight">
                Rs. {Number(dashCards?.thisMonth || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-emerald-600 font-bold block mt-1">Current Month</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">This Year</span>
                <Building2 className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-lg font-black text-slate-900 tracking-tight">
                Rs. {Number(dashCards?.thisYear || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 block mt-1">YTD Collections</span>
            </div>

            <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-indigo-200 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">{dashCards?.periodLabel || 'Selected Period'}</span>
                <DollarSign className="w-4 h-4 text-indigo-200" />
              </div>
              <p className="text-lg font-black tracking-tight">
                Rs. {Number(dashCards?.selectedPeriod || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-indigo-200 block mt-1">
                {Number(dashCards?.selectedEntries || 0)} Entries Recorded
              </span>
            </div>
          </div>

          {/* Ledger & Liquidity Status Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Available Funds
                </span>
                <p className="text-xl font-black text-slate-900 mt-0.5">
                  Rs. {Number(dashCards?.totalAvailableFunds || 0).toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-500">Bank + Available Cash</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Bank Balance
                </span>
                <p className="text-xl font-black text-indigo-600 mt-0.5">
                  Rs. {Number(dashCards?.totalBankBalance || 0).toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-500">Across all banks & digital wallets</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Landmark className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Undeposited Cash
                </span>
                <p className="text-xl font-black text-amber-600 mt-0.5">
                  Rs. {Number(dashCards?.cashUndeposited || 0).toLocaleString()}
                </p>
                <button
                  onClick={() => handleTabChange('deposits')}
                  className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  Deposit into Banks →
                </button>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Today's Deposits & Expenses
                </span>
                <p className="text-sm font-bold text-slate-800 mt-1">
                  Deposited: <strong className="text-emerald-700">Rs. {Number(dashCards?.todayDeposits || 0).toLocaleString()}</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  Expenses: <strong className="text-rose-600">Rs. {Number(dashCards?.todayExpenses || 0).toLocaleString()}</strong>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Branch-Wise Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Branch-Wise Revenue Summary</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Real-time collection performance across Fiberworld network
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search branch..."
                    value={dashBranchSearch}
                    onChange={e => setDashBranchSearch(e.target.value)}
                    className="text-xs border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 w-44 bg-white"
                  />
                </div>

                <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                  <button
                    onClick={() => setDashSortBy('revenue')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      dashSortBy === 'revenue' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-500'
                    }`}
                  >
                    Revenue
                  </button>
                  <button
                    onClick={() => setDashSortBy('name')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      dashSortBy === 'name' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-500'
                    }`}
                  >
                    Name
                  </button>
                  <button
                    onClick={() => setDashSortOrder(dashSortOrder === 'desc' ? 'asc' : 'desc')}
                    className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                    title="Toggle Sort Order"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Branch Name</th>
                    <th className="py-3 px-4 text-right">Today's Revenue</th>
                    <th className="py-3 px-4 text-right">Yesterday</th>
                    <th className="py-3 px-4 text-right">This Month</th>
                    <th className="py-3 px-4 text-right">This Year</th>
                    <th className="py-3 px-4 text-right">
                      {dashCards?.periodLabel || 'Selected'}
                    </th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBranchSummary.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No branch records found.
                      </td>
                    </tr>
                  ) : (
                    filteredBranchSummary.map(row => (
                      <tr key={row.branchId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{row.branchName}</span>
                            {row.branchCode && (
                              <span className="text-[10px] text-slate-400 font-mono">({row.branchCode})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          Rs. {Number(row.todayRevenue || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          Rs. {Number(row.yesterdayRevenue || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-indigo-600">
                          Rs. {Number(row.monthRevenue || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-800">
                          Rs. {Number(row.yearRevenue || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-700 bg-emerald-50/30">
                          Rs. {Number(row.selectedRevenue || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleJumpToBranchRevenue(row.branchId)}
                            className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer transition-colors"
                          >
                            View Entries →
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 2: REVENUE TAB */}
      {/* ============================================================ */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          {/* Revenue Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row md:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search remarks, entry code, staff name..."
                  value={revSearch}
                  onChange={e => setRevSearch(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl pl-9 pr-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Branch Filter */}
              {isSuperAdmin && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <select
                    value={revBranchFilter}
                    onChange={e => {
                      setRevBranchFilter(e.target.value);
                      setRevPage(1);
                    }}
                    className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium"
                  >
                    <option value="ALL">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Collection Type Filter */}
              <div className="flex items-center gap-1.5">
                <select
                  value={revTypeFilter}
                  onChange={e => {
                    setRevTypeFilter(e.target.value);
                    setRevPage(1);
                  }}
                  className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium"
                >
                  <option value="ALL">All Types (Cash & Online)</option>
                  <option value="CASH">Cash Only</option>
                  <option value="ONLINE">Online Only</option>
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={revStatusFilter}
                onChange={e => {
                  setRevStatusFilter(e.target.value);
                  setRevPage(1);
                }}
                className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium"
              >
                <option value="Active">Active Only</option>
                <option value="Voided">Voided Entries</option>
                <option value="all">All Statuses</option>
              </select>

              {/* Date Filters */}
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={revStartDate}
                  onChange={e => setRevStartDate(e.target.value)}
                  className="text-xs border border-slate-300 rounded-xl px-2 py-2 bg-white"
                  title="From Date"
                />
                <span className="text-xs text-slate-400">-</span>
                <input
                  type="date"
                  value={revEndDate}
                  onChange={e => setRevEndDate(e.target.value)}
                  className="text-xs border border-slate-300 rounded-xl px-2 py-2 bg-white"
                  title="To Date"
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Filter
                </button>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>
                Found <strong>{revTotalCount}</strong> entries • Total Filtered Amount:{' '}
                <strong className="text-emerald-700 font-black">Rs. {Number(revTotalAmount || 0).toLocaleString()}</strong>
              </span>
              <button
                onClick={() => fetchRevenues(revPage)}
                className="text-indigo-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${revLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Revenue Entries Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Branch</th>
                    <th className="py-3.5 px-4">Collection Type & Account</th>
                    <th className="py-3.5 px-4 text-right">Revenue Amount</th>
                    <th className="py-3.5 px-4 text-center">Deposit Status</th>
                    <th className="py-3.5 px-4">Remarks</th>
                    <th className="py-3.5 px-4">Entered By</th>
                    <th className="py-3.5 px-4 text-center">Status & Deposit Action</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                        Loading revenue entries...
                      </td>
                    </tr>
                  ) : revenues.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No revenue entries found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    revenues.map(entry => {
                      const isVoided = entry.status === 'Voided';
                      const isCash = entry.collectionType === 'CASH';
                      const isOnline = entry.collectionType === 'ONLINE';

                      const entryAmt = Number(entry.amount || 0);
                      const depAmt = Number(entry.depositedAmount || 0);
                      const remAmt = entry.remainingAmount !== undefined ? Number(entry.remainingAmount) : Math.max(0, entryAmt - depAmt);
                      const isFullyDeposited = entry.depositStatus === 'Fully Deposited' || (depAmt >= entryAmt && entryAmt > 0);

                      return (
                        <tr
                          key={entry.id}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            isVoided ? 'bg-rose-50/20 opacity-75' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{entry.revenueDate}</span>
                            </div>
                            {entry.revenueCode && (
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {entry.revenueCode}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{entry.branchName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isCash ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                💵 Cash Collection
                              </span>
                            ) : isOnline ? (
                              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                <CreditCard className="w-3 h-3 text-indigo-600" />
                                <span>Online</span>
                                {entry.receivedAccountName && (
                                  <span className="font-extrabold text-indigo-900">
                                    • {entry.receivedAccountName}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Legacy</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <span
                              className={`font-black text-sm ${
                                isVoided ? 'text-slate-400 line-through' : 'text-emerald-700'
                              }`}
                            >
                              Rs. {entryAmt.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {isVoided ? (
                              <span className="text-slate-400 text-[10px]">Voided</span>
                            ) : isOnline ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Auto-Credited
                              </span>
                            ) : isFullyDeposited ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Fully Deposited
                              </span>
                            ) : depAmt > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200" title={`Deposited: Rs. ${depAmt.toLocaleString()} | Rem: Rs. ${remAmt.toLocaleString()}`}>
                                Partially Deposited
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                Undeposited Cash
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate text-slate-600" title={entry.remarks}>
                            {entry.remarks || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">
                            {entry.createdByName || 'Staff'}
                          </td>

                          {/* Status & Deposit Action Column */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {isVoided ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Voided
                              </span>
                            ) : isOnline ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-indigo-600" /> Auto-Credited
                              </span>
                            ) : isFullyDeposited ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" /> Deposited
                              </span>
                            ) : (
                              <button
                                onClick={() => openDepositModal(entry)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer hover:shadow"
                                title="Deposit this cash collection into a bank"
                              >
                                <Landmark className="w-3.5 h-3.5" />
                                Deposit Now
                              </button>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {/* Audit trail button */}
                              <button
                                onClick={() => openHistoryModal(entry)}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="View Audit History"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Button */}
                              {hasRevenueEdit && !isVoided && (
                                <button
                                  onClick={() => openEditModal(entry)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Edit Entry"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Void Button (Super Admin only) */}
                              {isSuperAdmin && !isVoided && (
                                <button
                                  onClick={() => openVoidModal(entry)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Void Revenue Entry"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {revTotalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Page {revPage} of {revTotalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={revPage <= 1}
                    onClick={() => setRevPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={revPage >= revTotalPages}
                    onClick={() => setRevPage(p => Math.min(revTotalPages, p + 1))}
                    className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 3: DEPOSITS TAB */}
      {/* ============================================================ */}
      {activeTab === 'deposits' && hasDepositsView && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Cash Collected
              </span>
              <p className="text-xl font-black text-slate-900 mt-1">
                Rs. {Number(depCards?.totalCashCollected || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">All cash revenues to date</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                  Undeposited Cash
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {Number(depCards?.undepositedCollectionsCount || 0)} Pending
                </span>
              </div>
              <p className="text-xl font-black text-amber-600 mt-1">
                Rs. {Number(depCards?.totalUndepositedCash ?? depCards?.undepositedCash ?? 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-amber-700">Available cash awaiting bank deposit</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Deposited Cash
              </span>
              <p className="text-xl font-black text-emerald-700 mt-1">
                Rs. {Number(depCards?.totalDepositedCash ?? depCards?.depositedCash ?? 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">Successfully deposited into banks</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Deposits Today
              </span>
              <p className="text-xl font-black text-indigo-600 mt-1">
                Rs. {Number(depCards?.todayDeposits || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">Bank deposits processed today</span>
            </div>
          </div>

          {/* Queue Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search branch or code..."
                  value={depSearch}
                  onChange={e => setDepSearch(e.target.value)}
                  className="text-xs border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 w-48 bg-white"
                />
              </div>

              {isSuperAdmin && (
                <select
                  value={depBranchFilter}
                  onChange={e => {
                    setDepBranchFilter(e.target.value);
                    setDepPage(1);
                  }}
                  className="text-xs border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-medium"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={depStatusFilter}
                onChange={e => {
                  setDepStatusFilter(e.target.value);
                  setDepPage(1);
                }}
                className="text-xs border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-medium"
              >
                <option value="UNDEPOSITED_OR_PARTIAL">Pending (Undeposited & Partial)</option>
                <option value="Undeposited">Undeposited Only</option>
                <option value="Partially Deposited">Partially Deposited Only</option>
                <option value="Fully Deposited">Fully Deposited Only</option>
                <option value="ALL">All Collections</option>
              </select>
            </div>

            <button
              onClick={() => fetchDepositsData(depPage)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${depLoading ? 'animate-spin' : ''}`} />
              Refresh Queue
            </button>
          </div>

          {/* Collections Queue Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Cash Collections Pending Deposit</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Process full deposits or split cash collections across multiple bank accounts
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Collection ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4 text-right">Collection Amount</th>
                    <th className="py-3 px-4 text-right">Deposited</th>
                    <th className="py-3 px-4 text-right">Remaining Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {depLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                        Loading deposit queue...
                      </td>
                    </tr>
                  ) : depCollections.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No cash collections pending deposit matching your filters.
                      </td>
                    </tr>
                  ) : (
                    depCollections.map(coll => {
                      const collAmt = Number(coll.amount || 0);
                      const collDepAmt = Number(coll.depositedAmount || 0);
                      const collRemAmt = Number(coll.remainingAmount || 0);
                      const isFullyDep = coll.depositStatus === 'Fully Deposited' || collRemAmt <= 0;

                      return (
                        <tr key={coll.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {coll.revenueCode || `#${coll.id}`}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-medium text-slate-800">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{coll.revenueDate}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{coll.branchName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-slate-900">
                            Rs. {collAmt.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                            Rs. {collDepAmt.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-amber-600 bg-amber-50/20">
                            Rs. {collRemAmt.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isFullyDep ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Fully Deposited
                              </span>
                            ) : coll.depositStatus === 'Partially Deposited' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Partially Deposited
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Undeposited
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {!isFullyDep ? (
                              <button
                                onClick={() => openDepositModal(coll)}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1 ml-auto"
                              >
                                <Landmark className="w-3.5 h-3.5" />
                                DEPOSIT
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs font-medium">Completed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {depTotalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Page {depPage} of {depTotalPages} ({depTotalCount} items)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={depPage <= 1}
                    onClick={() => setDepPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={depPage >= depTotalPages}
                    onClick={() => setDepPage(p => Math.min(depTotalPages, p + 1))}
                    className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 4: BANKS & LEDGER TAB (Super Admin) */}
      {/* ============================================================ */}
      {activeTab === 'banks' && hasBanksView && (
        <div className="space-y-6">
          {/* Action Header */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">Bank & Cash Accounts</h2>
              <p className="text-xs text-slate-500 font-medium">
                Live balances calculated strictly from the financial ledger credits and debits
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => openOpeningBalanceModal()}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-300 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="Set actual starting opening balance for banks so live figures are accurate"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                + Set Opening Balance
              </button>
              <button
                onClick={openExpenseModal}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Receipt className="w-3.5 h-3.5 text-rose-600" />
                + Add Expense / Payment
              </button>
              <button
                onClick={openTransferModal}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                + Transfer Funds
              </button>
              <button
                onClick={() => {
                  setNewAccName('');
                  setNewAccType('BANK');
                  setNewAccBankName('');
                  setNewAccNumber('');
                  setNewAccOpeningBal('0');
                  setNewAccRemarks('');
                  setNewAccError(null);
                  setShowAddBankModal(true);
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Bank / Account
              </button>
              <button
                onClick={handleCheckReconciliation}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer"
                title="Verify transaction ledger integrity"
              >
                <FileCheck className="w-3.5 h-3.5 text-slate-600" />
                Reconcile
              </button>
            </div>
          </div>

          {/* 6 Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Available Funds
              </span>
              <p className="text-lg font-black text-slate-900 mt-1">
                Rs. {Number(bankCards?.totalAvailableFunds || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-emerald-600 font-bold">Total Liquid Balance</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Bank Balance
              </span>
              <p className="text-lg font-black text-indigo-600 mt-1">
                Rs. {Number(bankCards?.totalBankBalance || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">Commercial Banks & Wallets</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Cash Balance
              </span>
              <p className="text-lg font-black text-amber-600 mt-1">
                Rs. {Number(bankCards?.totalCashBalance || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">Undeposited Collection</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Online Collection
              </span>
              <p className="text-lg font-black text-cyan-600 mt-1">
                Rs. {Number(bankCards?.totalOnlineCollection || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">Credited Directly</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Cash Deposited
              </span>
              <p className="text-lg font-black text-emerald-700 mt-1">
                Rs. {Number(bankCards?.totalCashDeposited || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">Transferred Cash → Bank</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Expenses
              </span>
              <p className="text-lg font-black text-rose-600 mt-1">
                Rs. {Number(bankCards?.totalExpenses || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">Debited From Accounts</span>
            </div>
          </div>

          {/* Accounts Grid / Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map(acc => {
              const isSelected = selectedAccount?.id === acc.id;
              const isCash = acc.accountType === 'CASH';
              const isWallet = acc.accountType === 'DIGITAL_WALLET';
              const curBal = Number(acc.currentBalance || 0);
              const openBal = Number(acc.openingBalance || 0);

              return (
                <div
                  key={acc.id}
                  onClick={() => handleSelectAccountForLedger(acc)}
                  className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                          isCash
                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                            : isWallet
                            ? 'bg-purple-50 text-purple-600 border border-purple-200'
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                        }`}
                      >
                        {isCash ? <Wallet className="w-5 h-5" /> : isWallet ? <CreditCard className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{acc.accountName}</h4>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">
                          {acc.accountType.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        acc.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {acc.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  {acc.accountNumber && (
                    <p className="text-[11px] font-mono text-slate-500 mb-2 truncate">
                      Acc: {acc.accountNumber}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Current Balance</span>
                      <p className="text-lg font-black text-slate-900">
                        Rs. {curBal.toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Opening: Rs. {openBal.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right text-[10px] text-slate-500 space-y-0.5">
                      <p>
                        In: <strong className="text-emerald-700 font-bold">Rs. {Number(acc.totalCredits || 0).toLocaleString()}</strong>
                      </p>
                      <p>
                        Out: <strong className="text-rose-600 font-bold">Rs. {Number(acc.totalDebits || 0).toLocaleString()}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openOpeningBalanceModal(acc);
                      }}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] rounded-lg border border-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Set / Adjust opening balance for this bank account"
                    >
                      <Sliders className="w-3 h-3 text-amber-600" />
                      Set Opening Balance
                    </button>

                    <span className="text-[11px] text-indigo-600 font-bold flex items-center gap-1">
                      View Ledger →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Account Ledger Detail Section */}
          {selectedAccount && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden animate-in fade-in duration-200">
              <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Transaction Ledger — {selectedAccount.accountName}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Current balance: <strong className="text-slate-900">Rs. {Number(selectedAccount.currentBalance || 0).toLocaleString()}</strong> • Opening Balance: Rs. {Number(selectedAccount.openingBalance || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openOpeningBalanceModal(selectedAccount)}
                    className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-lg border border-amber-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Sliders className="w-3 h-3 text-amber-600" />
                    Adjust Opening Balance
                  </button>
                  <button
                    onClick={() => setSelectedAccount(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Tx Code</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4 text-right">Credit (+)</th>
                      <th className="py-3 px-4 text-right">Debit (-)</th>
                      <th className="py-3 px-4 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accountTxLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                          Loading account ledger transactions...
                        </td>
                      </tr>
                    ) : accountTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No ledger transactions recorded for this account.
                        </td>
                      </tr>
                    ) : (
                      accountTransactions.map(tx => {
                        const hasCredit = Number(tx.creditAmount || 0) > 0;
                        const hasDebit = Number(tx.debitAmount || 0) > 0;

                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                              {tx.transactionDate}
                              <span className="block text-[10px] text-slate-400">
                                {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {tx.transactionCode}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {tx.transactionType}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-sm truncate text-slate-700" title={tx.description}>
                              {tx.description}
                              {tx.referenceNumber && (
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  Ref: {tx.referenceNumber}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-700 font-medium">
                              {tx.branchName || '—'}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-emerald-700">
                              {hasCredit ? `+ Rs. ${Number(tx.creditAmount).toLocaleString()}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-rose-600">
                              {hasDebit ? `- Rs. ${Number(tx.debitAmount).toLocaleString()}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap font-black text-slate-900 bg-slate-50/50">
                              Rs. {Number(tx.balanceAfter || 0).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 5: REPORTS TAB */}
      {/* ============================================================ */}
      {activeTab === 'reports' && hasReportsView && (
        <div className="space-y-6">
          {/* Reports Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Period:</span>
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'year', label: 'This Year' },
                { id: 'custom', label: 'Custom' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setRepPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    repPeriod === p.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}

              {repPeriod === 'custom' && (
                <div className="flex items-center gap-1.5 ml-1">
                  <input
                    type="date"
                    value={repStartDate}
                    onChange={e => setRepStartDate(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={repEndDate}
                    onChange={e => setRepEndDate(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                  />
                  <button
                    onClick={fetchReportsData}
                    className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={repBranch}
                  onChange={e => setRepBranch(e.target.value)}
                  className="text-xs border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchReportsData}
                disabled={repLoading}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                title="Refresh Report"
              >
                <RefreshCw className={`w-4 h-4 ${repLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Collection</span>
              <p className="text-xl font-black text-slate-900 mt-1">
                Rs. {Number(repMetrics?.totalRevenue || 0).toLocaleString()}
              </p>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <span className="text-amber-600 font-bold">Cash: Rs. {Number(repMetrics?.totalCashCollection || 0).toLocaleString()}</span>
                <span>•</span>
                <span className="text-indigo-600 font-bold">Online: Rs. {Number(repMetrics?.totalOnlineCollection || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Daily Collection</span>
              <p className="text-xl font-black text-indigo-600 mt-1">
                Rs. {Number(repMetrics?.averageDaily || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500 block mt-1">
                Calculated across {repMetrics?.activeDays || 0} active days
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Highest Branch</span>
              <p className="text-base font-black text-slate-900 mt-1 truncate">
                {repMetrics?.highestBranch?.name || '—'}
              </p>
              <span className="text-xs font-bold text-emerald-700 block">
                {repMetrics?.highestBranch ? `Rs. ${Number(repMetrics.highestBranch.amount || 0).toLocaleString()}` : '—'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lowest Branch</span>
              <p className="text-base font-black text-slate-900 mt-1 truncate">
                {repMetrics?.lowestBranch?.name || '—'}
              </p>
              <span className="text-xs font-bold text-slate-600 block">
                {repMetrics?.lowestBranch ? `Rs. ${Number(repMetrics.lowestBranch.amount || 0).toLocaleString()}` : '—'}
              </span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend Bar Chart */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Revenue Collection Trend</h3>
                  <p className="text-xs text-slate-500 font-medium">Daily collection trajectory over the period</p>
                </div>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                  NPR (Rs.)
                </span>
              </div>

              <div className="h-64">
                {repTrend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No data recorded for the selected period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={repTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                      />
                      <Tooltip
                        formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, 'Revenue']}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }}
                      />
                      <Bar dataKey="amount" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Distribution Pie Chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Branch Share</h3>
                <p className="text-xs text-slate-500 font-medium">Top contributing branch percentages</p>
              </div>

              <div className="h-48 my-2">
                {repBranchComparison.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No data available.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={repBranchComparison.slice(0, 8)}
                        dataKey="totalAmount"
                        nameKey="branchName"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {repBranchComparison.slice(0, 8).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, 'Revenue']}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Mini Legend */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
                {repBranchComparison
                  .filter(b => b.totalAmount > 0)
                  .slice(0, 6)
                  .map((b, idx) => (
                    <div key={b.branchId} className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="truncate text-slate-700" title={b.branchName}>
                        {b.branchName}: <strong>{b.percentage}%</strong>
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Report Summary Detailed Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Detailed Revenue Report</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Itemized metrics, averages, and peak collections by branch
                </p>
              </div>
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Export Table
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4 text-center">Entries</th>
                    <th className="py-3 px-4 text-right">Total Revenue</th>
                    <th className="py-3 px-4 text-right">Contribution %</th>
                    <th className="py-3 px-4 text-right">Average Daily</th>
                    <th className="py-3 px-4 text-right">Highest Single Entry</th>
                    <th className="py-3 px-4 text-right">Lowest Single Entry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {repBranchComparison.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No report data available.
                      </td>
                    </tr>
                  ) : (
                    repBranchComparison.map(row => (
                      <tr key={row.branchId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {row.branchName}
                          {row.branchCode && (
                            <span className="text-[10px] text-slate-400 font-mono ml-1.5">({row.branchCode})</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-medium">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            {row.entriesCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          Rs. {Number(row.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-indigo-600">
                          {row.percentage}%
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {row.avgDaily > 0 ? `Rs. ${Number(row.avgDaily).toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700">
                          {row.maxDaily > 0 ? `Rs. ${Number(row.maxDaily).toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {row.minDaily > 0 ? `Rs. ${Number(row.minDaily).toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: ADD REVENUE */}
      {/* ============================================================ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Record Revenue Collection</h3>
                  <p className="text-xs text-slate-500">Enter daily collection amount for branch accounts</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRevenue} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {/* Branch Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Branch</label>
                {isSuperAdmin ? (
                  <select
                    value={addBranchId}
                    onChange={e => setAddBranchId(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Target Branch...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.code ? `(${b.code})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span>{userBranchName}</span>
                    <span className="text-[10px] text-slate-500 font-normal ml-auto">Locked to your login</span>
                  </div>
                )}
              </div>

              {/* Revenue Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Revenue Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={addDate}
                  max={getTodayInputStr()}
                  onChange={e => setAddDate(e.target.value)}
                  required
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Collection Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Collection Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAddCollectionType('CASH')}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      addCollectionType === 'CASH'
                        ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">💵 Cash</span>
                      {addCollectionType === 'CASH' && <Check className="w-4 h-4 text-amber-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Increases cash balance. Ready to be deposited to banks.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAddCollectionType('ONLINE');
                      if (!addReceivedAccountId) {
                        const firstBank = activeAccounts.find(a => a.accountType !== 'CASH') || activeAccounts[0];
                        if (firstBank) setAddReceivedAccountId(String(firstBank.id));
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      addCollectionType === 'ONLINE'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">💳 Online</span>
                      {addCollectionType === 'ONLINE' && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Auto-credited directly to bank / digital wallet ledger.
                    </p>
                  </button>
                </div>
              </div>

              {/* Conditional Receiving Bank for Online Collection */}
              {addCollectionType === 'ONLINE' && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-1.5 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-indigo-900">
                    Deposited To / Received Through <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addReceivedAccountId}
                    onChange={e => setAddReceivedAccountId(e.target.value)}
                    required
                    className="w-full text-xs border border-indigo-200 rounded-xl px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Receiving Bank / Wallet...</option>
                    {activeAccounts
                      .filter(a => a.accountType !== 'CASH')
                      .map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountName} ({acc.accountType})
                        </option>
                      ))}
                  </select>
                  <p className="text-[10px] text-indigo-700">
                    Amount will automatically be credited to this account's ledger balance upon save.
                  </p>
                </div>
              )}

              {/* Revenue Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Revenue Amount (NPR / Rs.) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                    Rs.
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 125000"
                    value={addAmount}
                    onChange={e => setAddAmount(e.target.value)}
                    required
                    className="w-full text-sm font-black border border-slate-300 rounded-xl pl-11 pr-3 py-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                {addAmount && !isNaN(parseFloat(addAmount)) && parseFloat(addAmount) > 0 && (
                  <p className="text-[11px] font-bold text-emerald-600 mt-1">
                    Entered: Rs. {parseFloat(addAmount).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Remarks / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Daily customer counter collection, new connection payments..."
                  value={addRemarks}
                  onChange={e => setAddRemarks(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-indigo-500"
                />

                {/* Quick Suggestion Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_REMARKS.map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAddRemarks(q)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors cursor-pointer"
                    >
                      + {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {addSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{addSaving ? 'Saving...' : 'Save Revenue'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: DEPOSIT MODAL (Single Bank or Split Allocations) */}
      {/* ============================================================ */}
      {showDepositModal && targetCollection && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Deposit Cash Collection
                  </h3>
                  <p className="text-xs text-slate-500">
                    {targetCollection.branchName} • Ref: {targetCollection.revenueCode || `#${targetCollection.id}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDepositModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeposit} className="p-6 space-y-4">
              {depError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{depError}</span>
                </div>
              )}

              {/* Collection Status Summary Box */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Original Collection</span>
                  <p className="font-black text-slate-900 mt-0.5">
                    Rs. {Number(targetCollection.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Already Deposited</span>
                  <p className="font-bold text-emerald-700 mt-0.5">
                    Rs. {Number(targetCollection.depositedAmount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Remaining Cash</span>
                  <p className="font-black text-amber-600 mt-0.5">
                    Rs. {Number(targetCollection.remainingAmount || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Deposit Date & Ref */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deposit Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={depAllocDate}
                    max={getTodayInputStr()}
                    onChange={e => setDepAllocDate(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bank Slip / Ref No.</label>
                  <input
                    type="text"
                    placeholder="e.g. SLIP-88492"
                    value={depAllocRef}
                    onChange={e => setDepAllocRef(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
              </div>

              {/* Bank Allocation Rows */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Deposit Destination (Bank Name & Amount) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAllocationRow}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Split into another bank
                  </button>
                </div>

                <div className="space-y-2.5">
                  {allocations.map((alloc, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2"
                    >
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Bank / Account #{idx + 1}
                        </label>
                        <select
                          value={alloc.accountId}
                          onChange={e => handleAllocationChange(idx, 'accountId', e.target.value)}
                          required
                          className="w-full text-xs border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white font-medium"
                        >
                          <option value="">Select Destination Bank...</option>
                          {activeAccounts
                            .filter(a => a.accountType !== 'CASH')
                            .map(a => (
                              <option key={a.id} value={a.id}>
                                {a.accountName} ({a.accountType})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="w-36">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Amount (Rs.)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={alloc.amount}
                          onChange={e => handleAllocationChange(idx, 'amount', e.target.value)}
                          placeholder="Amount"
                          required
                          className="w-full text-xs font-black border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                        />
                      </div>

                      {allocations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAllocationRow(idx)}
                          className="p-1.5 mt-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Remove allocation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Calculation Summary Footer */}
                <div className="mt-3 p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-600 font-medium">Total Being Deposited: </span>
                    <strong className="text-indigo-900 font-black text-sm">
                      Rs. {totalAllocatedAmount.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-600 font-medium">Remaining Cash After: </span>
                    <strong
                      className={`font-black text-sm ${
                        targetCollection.remainingAmount - totalAllocatedAmount < 0
                          ? 'text-rose-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      Rs. {Math.max(0, targetCollection.remainingAmount - totalAllocatedAmount).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deposit Remarks <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daily cash collection deposited at counter..."
                  value={depAllocRemarks}
                  onChange={e => setDepAllocRemarks(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={depSaving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {depSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{depSaving ? 'Saving Deposit...' : 'Confirm Deposit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: SET / ADJUST OPENING BALANCE */}
      {/* ============================================================ */}
      {showOpeningBalanceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Set Bank Opening Balance</h3>
                  <p className="text-xs text-slate-500">Keep actual current bank amount accurate in system</p>
                </div>
              </div>
              <button
                onClick={() => setShowOpeningBalanceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOpeningBalance} className="p-6 space-y-4">
              {openingBalanceError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{openingBalanceError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Bank / Account</label>
                <select
                  value={selectedAccountIdForOpening}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedAccountIdForOpening(val);
                    const found = bankAccounts.find(a => String(a.id) === val);
                    if (found) {
                      setTargetAccountForOpening(found);
                      setOpeningBalanceInput(String(found.openingBalance ?? 0));
                    }
                  }}
                  required
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium"
                >
                  <option value="">Select Account...</option>
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} ({a.accountType}) — Current: Rs. {Number(a.currentBalance || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {targetAccountForOpening && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase">Current Opening Bal</span>
                    <p className="font-bold text-slate-700 mt-0.5">Rs. {Number(targetAccountForOpening.openingBalance || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase">Live Ledger Balance</span>
                    <p className="font-black text-indigo-700 mt-0.5">Rs. {Number(targetAccountForOpening.currentBalance || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Opening Balance (NPR / Rs.) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                    Rs.
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 500000"
                    value={openingBalanceInput}
                    onChange={(e) => setOpeningBalanceInput(e.target.value)}
                    required
                    className="w-full text-sm font-black border border-slate-300 rounded-xl pl-11 pr-3 py-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  This starting balance will be credited into the account ledger and automatically update live bank balances.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOpeningBalanceModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={openingBalanceSaving}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {openingBalanceSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{openingBalanceSaving ? 'Saving...' : 'Set Opening Balance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: ADD BANK / ACCOUNT */}
      {/* ============================================================ */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add Bank / Account</h3>
                  <p className="text-xs text-slate-500">Configure new ledger bank or digital wallet account</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddBankModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewAccount} className="p-6 space-y-4">
              {newAccError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{newAccError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Name / Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. EBL, NIMB, NIC ASIA, ESEWA-MERCHANT"
                  value={newAccName}
                  onChange={e => setNewAccName(e.target.value)}
                  required
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Type</label>
                <select
                  value={newAccType}
                  onChange={e => setNewAccType(e.target.value as any)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium"
                >
                  <option value="BANK">Commercial Bank</option>
                  <option value="DIGITAL_WALLET">Digital Wallet (eSewa, Khalti, NepalPay)</option>
                  <option value="CASH">Cash Drawer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. Everest Bank Ltd."
                  value={newAccBankName}
                  onChange={e => setNewAccBankName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 01200105200001"
                  value={newAccNumber}
                  onChange={e => setNewAccNumber(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Opening Balance (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAccOpeningBal}
                  onChange={e => setNewAccOpeningBal(e.target.value)}
                  className="w-full text-xs font-black border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newAccSaving}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {newAccSaving ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: ADD EXPENSE / PAYMENT */}
      {/* ============================================================ */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Record Expense / Payment</h3>
                  <p className="text-xs text-slate-500">Debits selected account without altering revenue totals</p>
                </div>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              {expError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{expError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Paid From (Bank / Cash) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={expAccountId}
                  onChange={e => setExpAccountId(e.target.value)}
                  required
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium"
                >
                  <option value="">Select Account...</option>
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} (Balance: Rs. {Number(a.currentBalance || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amount (Rs.) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 5000"
                    value={expAmount}
                    onChange={e => setExpAmount(e.target.value)}
                    required
                    className="w-full text-xs font-black border border-slate-300 rounded-xl px-3 py-2 bg-white text-rose-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Expense Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={expDate}
                    max={getTodayInputStr()}
                    onChange={e => setExpDate(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={expCategory}
                    onChange={e => setExpCategory(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Utilities & Electricity">Utilities & Electricity</option>
                    <option value="Internet & Bandwidth">Internet & Bandwidth</option>
                    <option value="Rent">Office Rent</option>
                    <option value="Maintenance & Repair">Maintenance & Repair</option>
                    <option value="Salary & Advance">Salary & Advance</option>
                    <option value="Travel & Fuel">Travel & Fuel</option>
                    <option value="Refreshments">Refreshments</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Paid To / Payee</label>
                  <input
                    type="text"
                    placeholder="Vendor or staff name"
                    value={expPaidTo}
                    onChange={e => setExpPaidTo(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Voucher / Bill Ref</label>
                <input
                  type="text"
                  placeholder="e.g. BILL-9932"
                  value={expRefNo}
                  onChange={e => setExpRefNo(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Purpose of expenditure"
                  value={expRemarks}
                  onChange={e => setExpRemarks(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expSaving}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {expSaving ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 6: INTERNAL TRANSFER */}
      {/* ============================================================ */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Internal Fund Transfer</h3>
                  <p className="text-xs text-slate-500">Transfers between accounts without altering net company funds</p>
                </div>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransfer} className="p-6 space-y-4">
              {trError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{trError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">From Account (Source)</label>
                <select
                  value={trFromAccId}
                  onChange={e => setTrFromAccId(e.target.value)}
                  required
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium"
                >
                  <option value="">Select Source Account...</option>
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} (Balance: Rs. {Number(a.currentBalance || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">To Account (Destination)</label>
                <select
                  value={trToAccId}
                  onChange={e => setTrToAccId(e.target.value)}
                  required
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium"
                >
                  <option value="">Select Destination Account...</option>
                  {bankAccounts
                    .filter(a => String(a.id) !== trFromAccId)
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.accountName} (Balance: Rs. {Number(a.currentBalance || 0).toLocaleString()})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Transfer Amount (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 50000"
                    value={trAmount}
                    onChange={e => setTrAmount(e.target.value)}
                    required
                    className="w-full text-xs font-black border border-slate-300 rounded-xl px-3 py-2 bg-white text-indigo-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Transfer Date</label>
                  <input
                    type="date"
                    value={trDate}
                    max={getTodayInputStr()}
                    onChange={e => setTrDate(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Transfer excess counter cash to EBL"
                  value={trRemarks}
                  onChange={e => setTrRemarks(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={trSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {trSaving ? 'Executing...' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 7: RECONCILIATION VERIFICATION */}
      {/* ============================================================ */}
      {showReconModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Ledger Balance Reconciliation</h3>
                  <p className="text-xs text-slate-500">Double-entry audit verification of all financial accounts</p>
                </div>
              </div>
              <button
                onClick={() => setShowReconModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {reconLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  Running automated ledger reconciliation check...
                </div>
              ) : reconData ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-emerald-900">
                        {reconData.isReconciled ? 'All Accounts Fully Reconciled' : 'Discrepancy Detected'}
                      </h4>
                      <p className="text-[11px] text-emerald-700">
                        {reconData.isReconciled
                          ? 'Total calculated company liquid funds match net revenue receipts minus total disbursements perfectly.'
                          : 'Please review transaction history for discrepancy.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500">Total Revenue Inflows</span>
                      <p className="font-black text-slate-900 text-sm mt-0.5">
                        Rs. {Number(reconData.totalRevenues || 0).toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        Cash: Rs. {Number(reconData.totalCashCollection || 0).toLocaleString()} • Online: Rs. {Number(reconData.totalOnlineCollection || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500">Total Disbursements / Expenses</span>
                      <p className="font-black text-rose-600 text-sm mt-0.5">
                        Rs. {Number(reconData.totalExpenses || 0).toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-400">Debited from accounts</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        Net Available Liquid Funds
                      </span>
                      <p className="text-lg font-black mt-0.5">
                        Rs. {Number(reconData.netCompanyFunds || 0).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white">
                      Verified
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="pt-2 text-right">
                <button
                  onClick={() => setShowReconModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 8: EDIT REVENUE */}
      {/* ============================================================ */}
      {showEditModal && editingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Edit Revenue Entry {editingEntry.revenueCode || `#${editingEntry.id}`}
                  </h3>
                  <p className="text-xs text-slate-500">Branch: {editingEntry.branchName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRevenue} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Modifications to revenue amounts will automatically adjust associated ledger balances and be recorded in the security audit trail.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Revenue Date</label>
                <input
                  type="date"
                  value={editDate}
                  max={getTodayInputStr()}
                  onChange={e => setEditDate(e.target.value)}
                  required
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Revenue Amount (Rs.) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                    Rs.
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    required
                    className="w-full text-sm font-black border border-slate-300 rounded-xl pl-11 pr-3 py-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {editAmount && !isNaN(parseFloat(editAmount)) && (
                  <p className="text-[11px] font-bold text-slate-600 mt-1">
                    Previous: Rs. {Number(editingEntry.amount || 0).toLocaleString()} → New: Rs.{' '}
                    {parseFloat(editAmount).toLocaleString()}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Remarks / Reason for edit</label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={e => setEditRemarks(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {editSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editSaving ? 'Updating...' : 'Update Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 9: VOID REVENUE */}
      {/* ============================================================ */}
      {showVoidModal && voidingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center font-bold">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Void Revenue Entry</h3>
                <p className="text-xs text-slate-500">Entry #{voidingEntry.id} • {voidingEntry.branchName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to void this revenue collection of{' '}
              <strong className="text-slate-900">Rs. {Number(voidingEntry.amount || 0).toLocaleString()}</strong> from{' '}
              <strong className="text-slate-900">{voidingEntry.revenueDate}</strong>? This entry will be marked as Voided and removed from active ledger balances.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for voiding</label>
              <input
                type="text"
                placeholder="e.g. Duplicate entry by staff, erroneous receipt amount..."
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVoidModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Keep Entry
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={voidSaving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
              >
                {voidSaving ? 'Voiding...' : 'Yes, Void Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 10: AUDIT HISTORY */}
      {/* ============================================================ */}
      {showHistoryModal && historyEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Audit Trail — Revenue #{historyEntry.id}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {historyEntry.branchName} • {historyEntry.revenueDate} • Rs. {Number(historyEntry.amount || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {historyLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading audit trail...</div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No subsequent modification records logged for this entry.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyList.map((h, i) => (
                    <div
                      key={h.id || i}
                      className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          {h.action}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {h.createdAt ? new Date(h.createdAt).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        Actor: <strong className="text-slate-800">{h.actorName}</strong>
                      </p>
                      {h.details && typeof h.details === 'object' && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-[11px] space-y-1">
                          {h.details.oldAmount !== undefined && (
                            <p>
                              Amount changed: <strong className="text-slate-500">Rs. {h.details.oldAmount}</strong> →{' '}
                              <strong className="text-emerald-700 font-bold">Rs. {h.details.newAmount}</strong>
                            </p>
                          )}
                          {h.details.oldDate !== undefined && h.details.oldDate !== h.details.newDate && (
                            <p>
                              Date changed: <span className="text-slate-500">{h.details.oldDate}</span> →{' '}
                              <span className="text-slate-900 font-bold">{h.details.newDate}</span>
                            </p>
                          )}
                          {h.details.oldRemarks !== undefined && h.details.oldRemarks !== h.details.newRemarks && (
                            <p>
                              Remarks: <span className="text-slate-500">{h.details.oldRemarks || '—'}</span> →{' '}
                              <span className="text-slate-900">{h.details.newRemarks || '—'}</span>
                            </p>
                          )}
                          {h.details.reason && (
                            <p className="text-rose-600 font-semibold">Reason: {h.details.reason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
