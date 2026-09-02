export interface Gift {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  unique_item: boolean;
  active?: boolean;
  sort_order?: number;
  created_at?: string;
  order_id?: string | null;
  buyer_name?: string | null;
  order_status?: 'approved' | 'pending' | 'rejected' | null;
  order_amount_cents?: number | null;
  category?: string;
}

export interface GiftOrder {
  id: string;
  gift_id: string;
  buyer_name: string;
  buyer_message?: string | null;
  amount_cents: number;
  payment_method: 'pix_direct' | 'stripe' | 'card' | string;
  status: 'approved' | 'pending' | 'rejected';
  stripe_session_id?: string | null;
  created_at: string;
  updated_at?: string;
  gift_name?: string;
}

export interface Rsvp {
  id: string;
  name: string;
  attending: boolean;
  guests: number;
  message?: string | null;
  created_at: string;
}

export interface AppConfig {
  supabase_url?: string | null;
  supabase_anon_key?: string | null;
  has_stripe: boolean;
  pix_key: string;
  pix_receiver_name: string;
  pix_receiver_city: string;
}
