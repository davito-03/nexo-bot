export interface StorePlan {
  id: string;
  name: string;
  price: string;
  description?: string;
}

export interface StoreProduct {
  id: string;
  name: string;
  category: string;
  emoji: string;
  shortDesc: string;
  plans: StorePlan[];
}

export interface StorePaymentMethod {
  id: string;
  name: string;
  emoji: string;
  instructions: string;
}

export interface StoreOrderRow {
  id: number;
  guild_id: string;
  channel_id: string | null;
  user_id: string;
  product_id: string;
  product_name: string;
  plan_name: string | null;
  price: string | null;
  payment_method: string | null;
  claimed_by: string | null;
  status: "open" | "claimed" | "completed" | "closed";
  created_at: number;
  closed_at: number | null;
  close_reason: string | null;
}

export interface StoreOrderMessageRow {
  id: number;
  order_id: number;
  author_id: string;
  author_tag: string | null;
  content: string | null;
  attachments: string | null;
  created_at: number;
  is_bot: number;
}
