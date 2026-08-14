import {
  getPartnerByEmail, getPartners, updatePartnerStatus, approvePartnerOnboarding,
  getCustomerByEmail, getCustomers, getCustomerById, createCustomer,
  getExpertByEmail, getExperts, getExpertById,
  getUserRoles, addUserRole, updateUserProfileRoles, getUserProfileByEmail,
  getKanbanTasks, createKanbanTask, updateKanbanTask, deleteKanbanTask,
  getActivities, createActivity,
  getServicePackages, getCustomerPackages, getCustomerPackageById, createCustomerPackage,
  getSessionsByPackage, getSessionsByExpert, getSessionsByCustomer, getSessionById, getAllSessions, createSession,
  scheduleSession, completeSession, updateSessionSchedule, assignExpertToPackage,
  getSalesOffers, createSalesOffer, getSalesOfferItems, createSalesOfferItem,
  getSalesOrders, createSalesOrder, getSalesOrderItems, createSalesOrderItem,
  getCoinWallet, createCoinWallet, updateWalletBalance, getWalletTransactions, createCoinTransaction,
  getReferrals, createReferral, updateReferral,
  getPayouts, createPayout, updatePayoutStatus,
  getExpertPayments, approveExpertPayment, markExpertPaymentPaid,
  getCertificates, createCertificate, getCertificateByCode,
  getCandidates, getCandidateById, createCandidate, updateCandidate, advanceCandidateStatus,
  getCandidateServices, createCandidateService, deleteCandidateServices,
  getCandidateTasks, getCandidateTasksByPartner, getAllCandidateTasks, createCandidateTask, updateCandidateTask, deleteCandidateTask,
  getHelpdeskTickets, createHelpdeskTicket, updateHelpdeskTicket,
  getHelpdeskMessages, createHelpdeskMessage,
  getEmailTemplateByKey,
} from "@/lib/sharepoint";
import type {
  Partner, Customer, Expert, UserRoleEntry, KanbanTask, Activity,
  UserRoleType, UserProfile, ServicePackage, CustomerPackage, Session,
  SalesOffer, SalesOfferItem, SalesOrder, SalesOrderItem, CoinWallet, CoinTransaction,
  Referral, Payout, ExpertPayment, SchoolCertificate,
  Candidate, CandidateService, CandidateTask,
  HelpdeskTicket, HelpdeskMessage, EmailTemplate,
} from "@/types";

/**
 * Unified Entity Repository
 * 
 * Provides a single source of truth for core entities, managing 
 * the hybrid storage (SharePoint + Firestore) transparently.
 */
export const Repository = {
  partners: {
    async getByEmail(email: string): Promise<Partner | null> {
      return getPartnerByEmail(email);
    },
    async getById(id: string): Promise<Partner | null> {
      const { getPartnerById } = await import("@/lib/sharepoint");
      return getPartnerById(id);
    },
    async getAll(): Promise<Partner[]> {
      return getPartners();
    },
    async updateStatus(id: string, status: Partner["status"]): Promise<void> {
      return updatePartnerStatus(id, status);
    },
    async approveOnboarding(id: string): Promise<void> {
      return approvePartnerOnboarding(id);
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
    async getById(id: string): Promise<Expert | null> {
      return getExpertById(id);
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
    },
    async assignExpert(packageId: string, expertId: string, expertName: string): Promise<void> {
      return assignExpertToPackage(packageId, expertId, expertName);
    }
  },

  // --- Sessions ---
  sessions: {
    async getByPackage(packageId: string): Promise<Session[]> {
      return getSessionsByPackage(packageId);
    },
    async getByExpert(expertId: string): Promise<Session[]> {
      return getSessionsByExpert(expertId);
    },
    async getByCustomer(customerId: string): Promise<Session[]> {
      return getSessionsByCustomer(customerId);
    },
    async create(data: Omit<Session, "id">): Promise<Session> {
      return createSession(data);
    },
    async getById(id: string): Promise<Session | null> {
      return getSessionById(id);
    },
    async getAll(): Promise<Session[]> {
      return getAllSessions();
    },
    async schedule(id: string, date: string): Promise<void> {
      return scheduleSession(id, date);
    },
    async update(id: string, updates: Partial<Pick<Session, "scheduledAt" | "meetingUrl" | "status" | "expertId" | "expertName" | "durationMinutes">>): Promise<void> {
      return updateSessionSchedule(id, updates);
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

  expertPayments: {
    async getAll(expertId?: string, partnerId?: string): Promise<ExpertPayment[]> {
      return getExpertPayments(expertId, partnerId);
    },
    async approve(id: string, adminId: string): Promise<void> {
      return approveExpertPayment(id, adminId);
    },
    async markPaid(id: string): Promise<void> {
      return markExpertPaymentPaid(id);
    },
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
  },

  // --- Email Templates ---
  emailTemplates: {
    async getAll(): Promise<EmailTemplate[]> {
      const { getAllEmailTemplates } = await import("@/lib/sharepoint");
      return getAllEmailTemplates();
    },
    async getByTemplateKey(key: string): Promise<EmailTemplate | null> {
      return getEmailTemplateByKey(key);
    },
    async create(data: Omit<EmailTemplate, "id">): Promise<EmailTemplate> {
      const { createEmailTemplate } = await import("@/lib/sharepoint");
      return createEmailTemplate(data);
    },
    async update(id: string, data: Partial<EmailTemplate>): Promise<void> {
      const { updateEmailTemplate } = await import("@/lib/sharepoint");
      return updateEmailTemplate(id, data);
    },
    async delete(id: string): Promise<void> {
      const { deleteEmailTemplate } = await import("@/lib/sharepoint");
      return deleteEmailTemplate(id);
    }
  },

  // --- Candidates ---
  candidates: {
    async getAll(partnerId?: string): Promise<Candidate[]> {
      return getCandidates(partnerId);
    },
    async getById(id: string): Promise<Candidate | null> {
      return getCandidateById(id);
    },
    async create(data: Omit<Candidate, "id">): Promise<Candidate> {
      return createCandidate(data);
    },
    async update(id: string, data: Partial<Candidate>): Promise<void> {
      return updateCandidate(id, data);
    },
    async advanceStatus(id: string, nextStatus: Candidate["currentStatus"]): Promise<void> {
      return advanceCandidateStatus(id, nextStatus);
    },
    async getServices(candidateId: string): Promise<CandidateService[]> {
      return getCandidateServices(candidateId);
    },
    async addService(data: Omit<CandidateService, "id">): Promise<CandidateService> {
      return createCandidateService(data);
    },
    async clearServices(candidateId: string): Promise<void> {
      return deleteCandidateServices(candidateId);
    },
    async getTasks(candidateId: string): Promise<CandidateTask[]> {
      return getCandidateTasks(candidateId);
    },
    async getTasksByPartner(partnerId: string): Promise<CandidateTask[]> {
      return getCandidateTasksByPartner(partnerId);
    },
    async getAllTasks(): Promise<CandidateTask[]> {
      return getAllCandidateTasks();
    },
    async addTask(data: Omit<CandidateTask, "id">): Promise<CandidateTask> {
      return createCandidateTask(data);
    },
    async updateTask(id: string, data: Partial<CandidateTask>): Promise<void> {
      return updateCandidateTask(id, data);
    },
    async deleteTask(id: string): Promise<void> {
      return deleteCandidateTask(id);
    },
  },

  // --- Helpdesk ---
  helpdesk: {
    async getTickets(partnerId?: string): Promise<HelpdeskTicket[]> {
      return getHelpdeskTickets(partnerId);
    },
    async createTicket(data: Omit<HelpdeskTicket, "id">): Promise<HelpdeskTicket> {
      return createHelpdeskTicket(data);
    },
    async updateTicket(id: string, data: Parameters<typeof updateHelpdeskTicket>[1]): Promise<void> {
      return updateHelpdeskTicket(id, data);
    },
    async getMessages(ticketId: string): Promise<HelpdeskMessage[]> {
      return getHelpdeskMessages(ticketId);
    },
    async addMessage(data: Omit<HelpdeskMessage, "id">): Promise<HelpdeskMessage> {
      return createHelpdeskMessage(data);
    },
  },

  // --- Users ---
  users: {
    async getAll() {
      const { getAllManagedUsers } = await import("@/lib/admin-users");
      return getAllManagedUsers();
    },
  },
};
