export type TransactionRow = {
  id: string;
  date: string;
  dateIso: string;
  description: string;
  category: string;
  categoryId: string;
  method: string;
  paymentMethodId: string;
  amount: number;
  type: "expense" | "income";
  notes: string | null;
  createdByName: string;
  categoryColor: string;
};

export type SelectOption = { id: string; name: string; color?: string };

export type BookRole = "owner" | "editor" | "viewer";

export type BookMember = {
  userId: string;
  displayName: string;
  role: BookRole;
  joinedAt: string;
  expiresAt: string | null;
};

export type ShareLink = {
  id: string;
  role: "editor" | "viewer";
  expiresAt: string | null;
  usageCount: number;
  maxUses: number | null;
  createdAt: string;
};

export type DashboardData = {
  book: { id: string; name: string };
  books: { id: string; name: string }[];
  role: BookRole;
  accessExpiresAt: string | null;
  members: BookMember[];
  shareLinks: ShareLink[];
  profileName: string;
  month: string;
  monthLabel: string;
  openingBalance: number;
  categories: SelectOption[];
  paymentMethods: SelectOption[];
  transactions: TransactionRow[];
};
