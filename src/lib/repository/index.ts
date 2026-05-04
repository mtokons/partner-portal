import { 
  getPartnerByEmail, getPartners, updatePartnerStatus,
  getCustomerByEmail, getCustomers, getCustomerById, createCustomer,
  getExpertByEmail, getExperts,
  getUserRoles, addUserRole, updateUserProfileRoles, getUserProfileByEmail,
  getKanbanTasks, createKanbanTask, updateKanbanTask, deleteKanbanTask,
  getActivities, createActivity,
  getServicePackages, getCustomerPackages, getCustomerPackageById, createCustomerPackage,
  getSessionsByPackage, scheduleSession, completeSession,
  getSalesOffers, createSalesOffer, getSalesOfferItems, createSalesOfferItem,
  getSalesOrders, createSalesOrder, getSalesOrderItems, createSalesOrderItem,
  getCoinWallet, createCoinWallet, updateWalletBalance, getWalletTransactions, createCoinTransaction,
  getReferrals, createReferral, updateReferral,
  getPayouts, createPayout, updatePayoutStatus,
  getCertificates, createCertificate, getCertificateByCode
} from "@/lib/sharepoint";
import type { 
  Partner, Customer, Expert, UserRoleEntry, KanbanTask, Activity, 
  UserRoleType, UserProfile, ServicePackage, CustomerPackage, Session,
  SalesOffer, SalesOfferItem, SalesOrder, SalesOrderItem, CoinWallet, CoinTransaction,
  Referral, Payout, SchoolCertificate
} from "@/types";

/**
 * Unified Entity Repository
 * 
 * Provides a single source of truth for core entities, managing 
 * the hybrid storage (SharePoint + Firestore) transparently.
 */
export const Repository = {
  // --- Partners ---
  partners: {
    async getByEmail(email: string): Promise<Partner | null> {
      return getPartnerByEmail(email);
    },
    async getAll(): Promise<Partner[]> {
      return getPartners();
    },
    async updateStatus(id: string, status: Partner["status"]): Promise<void> {
      return updatePartnerStatus(id, status);
    }
  },

  // --- Customers (Clients) ---
  customers: {
    async getByEmail(email: string): Promise<Customer | null> {
      return getCustomerByEmail(email);
    },
    async getById(id: string): Promise<Customer | null> {
      return getCustomerById(id);
    },
    async getAll(partnerId?: string): Promise<Customer[]> {
      return getCustomers(partnerId);
    },
    async create(data: Omit<Customer, "id" | "createdAt">): Promise<Customer> {
      return createCustomer(data);
    }
  },

  // --- Activities ---
  activities: {
    async getAll(partnerId?: string, clientId?: string): Promise<Activity[]> {
      return getActivities(partnerId, clientId);
    },
    async create(data: Omit<Activity, "id">): Promise<Activity> {
      return createActivity(data);
    }
  },

  // --- Experts ---
  experts: {
    async getByEmail(email: string): Promise<Expert | null> {
      return getExpertByEmail(email);
    },
    async getAll(): Promise<Expert[]> {
      return getExperts();
    }
  },

  // --- User Roles ---
  roles: {
    async getForUser(firebaseUid: string): Promise<UserRoleEntry[]> {
      return getUserRoles(firebaseUid);
    },
    async add(entry: Omit<UserRoleEntry, "id">): Promise<UserRoleEntry> {
      return addUserRole(entry);
    },
    async updateForProfile(userId: string, roles: UserRoleType[]): Promise<void> {
      return updateUserProfileRoles(userId, roles);
    }
  },

  // --- Profiles ---
  profiles: {
    async getByEmail(email: string): Promise<UserProfile | null> {
      return getUserProfileByEmail(email);
    }
  },

  // --- Service Catalog ---
  services: {
    async getAll(): Promise<ServicePackage[]> {
      return getServicePackages();
    }
  },

  // --- Customer Purchases ---
  purchases: {
    async getAll(customerId?: string): Promise<CustomerPackage[]> {
      return getCustomerPackages(customerId);
    },
    async getById(id: string): Promise<CustomerPackage | null> {
      return getCustomerPackageById(id);
    },
    async create(data: Omit<CustomerPackage, "id">): Promise<CustomerPackage> {
      return createCustomerPackage(data);
    }
  },

  // --- Sessions ---
  sessions: {
    async getByPackage(packageId: string): Promise<Session[]> {
      return getSessionsByPackage(packageId);
    },
    async schedule(id: string, date: string): Promise<void> {
      return scheduleSession(id, date);
    },
    async complete(id: string, notes: string, duration: number): Promise<void> {
      return completeSession(id, notes, duration);
    }
  },

  // --- Sales Offers ---
  offers: {
    async getAll(partnerId?: string): Promise<SalesOffer[]> {
      return getSalesOffers(partnerId);
    },
    async create(offer: Omit<SalesOffer, "id">, items: Omit<SalesOfferItem, "id" | "salesOfferId">[]): Promise<SalesOffer> {
      const createdOffer = await createSalesOffer(offer);
      await Promise.all(items.map(item => createSalesOfferItem({ ...item, salesOfferId: createdOffer.id })));
      return createdOffer;
    },
    async getItems(offerId: string): Promise<SalesOfferItem[]> {
      return getSalesOfferItems(offerId);
    }
  },

  // --- Sales Orders ---
  orders: {
    async getAll(partnerId?: string): Promise<SalesOrder[]> {
      return getSalesOrders(partnerId);
    },
    async create(order: Omit<SalesOrder, "id">, items: Omit<SalesOrderItem, "id" | "salesOrderId">[]): Promise<SalesOrder> {
      const createdOrder = await createSalesOrder(order);
      await Promise.all(items.map(item => createSalesOrderItem({ ...item, salesOrderId: createdOrder.id })));
      return createdOrder;
    },
    async getItems(orderId: string): Promise<SalesOrderItem[]> {
      return getSalesOrderItems(orderId);
    }
  },

  // --- Finance & Wallets ---
  wallets: {
    async get(userId: string): Promise<CoinWallet | null> {
      return getCoinWallet(userId);
    },
    async ensure(userId: string, email: string): Promise<CoinWallet> {
      const existing = await getCoinWallet(userId);
      if (existing) return existing;
      return createCoinWallet({
        userId,
        userEmail: email,
        userName: email,
        balance: 0,
        currency: "SCCG",
        totalEarned: 0,
        totalSpent: 0,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    },
    async updateBalance(id: string, newBalance: number): Promise<void> {
      return updateWalletBalance(id, newBalance);
    },
    async getTransactions(userId: string): Promise<CoinTransaction[]> {
      return getWalletTransactions(userId);
    },
    async addTransaction(tx: Omit<CoinTransaction, "id">): Promise<CoinTransaction> {
      return createCoinTransaction(tx);
    }
  },

  // --- Referrals & Payouts ---
  referrals: {
    async getAll(partnerId?: string): Promise<Referral[]> {
      return getReferrals(partnerId);
    },
    async create(data: Omit<Referral, "id">): Promise<Referral> {
      return createReferral(data);
    }
  },

  payouts: {
    async getAll(recipientId?: string): Promise<Payout[]> {
      return getPayouts(recipientId);
    },
    async create(data: Omit<Payout, "id">): Promise<Payout> {
      return createPayout(data);
    }
  },

  // --- Certificates & Verification ---
  certificates: {
    async getAll(userId?: string): Promise<SchoolCertificate[]> {
      return getCertificates(userId);
    },
    async getByCode(code: string): Promise<SchoolCertificate | null> {
      return getCertificateByCode(code);
    },
    async register(cert: Omit<SchoolCertificate, "id">): Promise<SchoolCertificate> {
      return createCertificate(cert);
    }
  },

  // --- Kanban Tasks ---
  tasks: {
    async getAll(): Promise<KanbanTask[]> {
      return getKanbanTasks();
    },
    async create(data: Omit<KanbanTask, "id">): Promise<KanbanTask> {
      return createKanbanTask(data);
    },
    async update(id: string, data: Partial<KanbanTask>): Promise<void> {
      return updateKanbanTask(id, data);
    },
    async delete(id: string): Promise<void> {
      return deleteKanbanTask(id);
    }
  }
};
