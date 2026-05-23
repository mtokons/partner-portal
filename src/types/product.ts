// ─── Product Types ───

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string[];
  price: number;
  currency: "BDT" | "EUR";
  stock: number;
  imageUrl?: string;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}
