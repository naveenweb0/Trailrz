export type EventType = "TRAILRZ_ORIGINAL" | "CURATED" | "PARTNER";
export type EventStatus = "DRAFT" | "PUBLISHED" | "SOLD_OUT" | "CANCELLED" | "COMPLETED" | "ARCHIVED";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
export type PaymentStatus = "CREATED" | "PENDING" | "SUCCESSFUL" | "FAILED" | "REFUND_PENDING" | "PARTIALLY_REFUNDED" | "REFUNDED";
export type TicketStatus = "VALID" | "USED" | "CANCELLED" | "REFUNDED";

export interface TicketTypeInfo {
  id: string;
  name: string;
  description: string | null;
  price: number; // in paise
  quantityTotal: number;
  quantitySold: number;
  maxPerBooking: number;
  minPerBooking: number;
  status: string;
  availableQuantity?: number;
}

export interface EventListItem {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  category: string;
  subcategory: string | null;
  eventType: string;
  isFeatured: boolean;
  isOriginal: boolean;
  mood: string | null;
  coverImage: string;
  city: string;
  venueName: string;
  fullAddress: string;
  eventDate: string | Date;
  startTime: string;
  endTime: string | null;
  status: string;
  minPrice: number; // in paise
  ticketTypes: TicketTypeInfo[];
}

export interface CheckoutSelection {
  ticketTypeId: string;
  quantity: number;
}

export interface CustomerDetails {
  fullName: string;
  email: string;
  phone: string;
}

export interface OrderBreakdown {
  subtotal: number; // paise
  convenienceFee: number; // paise
  taxAmount: number; // paise
  totalAmount: number; // paise
}
