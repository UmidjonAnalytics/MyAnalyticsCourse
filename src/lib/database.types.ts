// TypeScript description of the database in supabase/migrations. Keep in sync when the schema changes.

type Timestamp = string;
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel<Name extends string, Col extends string, Ref extends string> = {
  foreignKeyName: Name;
  columns: [Col];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ["id"];
};

// Insert: `Req` keys are required, everything else optional. Update: all optional.
type Table<Row, Req extends keyof Row, Rels extends unknown[] = []> = {
  Row: Row;
  Insert: Pick<Row, Req> & Partial<Omit<Row, Req>>;
  Update: Partial<Row>;
  Relationships: Rels;
};

export type Role = "student" | "admin";
export type ProductType = "course" | "bundle";
export type OrderStatus = "pending" | "paid" | "cancelled" | "refunded";
export type PaymentProviderName = "payme" | "click" | "paynet";
export type PaymentState = "created" | "performed" | "cancelled" | "cancelled_after_perform" | "failed";
export type EnrollmentSource = "purchase" | "bundle" | "manual";
export type ProgressStatus = "started" | "completed";
export type RevokeReason = "limit" | "user" | "admin" | "logout";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  phone_verified: boolean;
  email: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_seen_at: Timestamp | null;
};

export type DeviceSession = {
  id: string;
  user_id: string;
  device_id: string;
  auth_session_id: string | null;
  user_agent: string;
  created_at: Timestamp;
  last_seen_at: Timestamp;
  revoked_at: Timestamp | null;
  revoke_reason: RevokeReason | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  position: number;
  created_at: Timestamp;
};

export type Course = {
  id: string;
  category_id: string | null;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  cover_url: string | null;
  price: number;
  monthly_price: number | null;
  is_published: boolean;
  position: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  archived_at: Timestamp | null;
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  is_published: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  archived_at: Timestamp | null;
};

export type Lesson = {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  slug: string;
  position: number;
  is_free_preview: boolean;
  is_published: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  archived_at: Timestamp | null;
};

export type LessonContent = {
  lesson_id: string;
  youtube_url: string | null;
  content_md: string;
  task_md: string;
  updated_at: Timestamp;
};

export type Bundle = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  cover_url: string | null;
  price: number;
  monthly_price: number | null;
  allow_upgrade_pricing: boolean;
  is_published: boolean;
  position: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  archived_at: Timestamp | null;
};

export type BundleCourse = {
  bundle_id: string;
  course_id: string;
  position: number;
};

export type PromoCode = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  valid_from: Timestamp | null;
  valid_to: Timestamp | null;
  usage_limit: number | null;
  used_count: number;
  applies_to: Json;
  is_active: boolean;
  created_at: Timestamp;
  archived_at: Timestamp | null;
};

export type Order = {
  id: string;
  user_id: string;
  product_type: ProductType;
  course_id: string | null;
  bundle_id: string | null;
  product_id: string;
  plan: "lifetime" | "monthly";
  access_days: number | null;
  amount: number;
  discount: number;
  final_amount: number;
  promo_code_id: string | null;
  status: OrderStatus;
  provider: PaymentProviderName | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  paid_at: Timestamp | null;
  cancelled_at: Timestamp | null;
  refunded_at: Timestamp | null;
};

export type Payment = {
  id: string;
  order_id: string;
  provider: PaymentProviderName;
  provider_transaction_id: string | null;
  amount: number;
  state: PaymentState;
  provider_state: number | null;
  reason: number | null;
  created_at: Timestamp;
  performed_at: Timestamp | null;
  cancelled_at: Timestamp | null;
};

export type PaymentEvent = {
  id: number;
  provider: string;
  method: string | null;
  payload: Json;
  response: Json | null;
  received_at: Timestamp;
  processed: boolean;
  error: string | null;
};

export type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  source: EnrollmentSource;
  order_id: string | null;
  note: string | null;
  granted_by: string | null;
  granted_at: Timestamp;
  expires_at: Timestamp | null;
  revoked_at: Timestamp | null;
  revoked_by: string | null;
  revoke_reason: string | null;
};

export type LessonProgress = {
  user_id: string;
  lesson_id: string;
  status: ProgressStatus;
  completed_at: Timestamp | null;
  updated_at: Timestamp;
};

export type AuditLog = {
  id: number;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Json;
  created_at: Timestamp;
};

export type RateLimit = {
  key: string;
  window_start: Timestamp;
  hits: number;
};

export type ProductRow = {
  product_type: ProductType;
  product_id: string;
  title: string;
  slug: string;
  price: number;
  monthly_price: number | null;
  is_published: boolean;
  archived_at: Timestamp | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, "id">;
      device_sessions: Table<DeviceSession, "user_id" | "device_id", [Rel<"device_sessions_user_id_fkey", "user_id", "profiles">]>;
      categories: Table<Category, "name" | "slug">;
      courses: Table<Course, "title" | "slug", [Rel<"courses_category_id_fkey", "category_id", "categories">]>;
      modules: Table<Module, "course_id" | "title", [Rel<"modules_course_id_fkey", "course_id", "courses">]>;
      lessons: Table<
        Lesson,
        "module_id" | "title" | "slug",
        [Rel<"lessons_module_id_fkey", "module_id", "modules">, Rel<"lessons_course_id_fkey", "course_id", "courses">]
      >;
      lesson_contents: Table<
        LessonContent,
        "lesson_id",
        [
          {
            foreignKeyName: "lesson_contents_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: true;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ]
      >;
      bundles: Table<Bundle, "title" | "slug">;
      bundle_courses: Table<
        BundleCourse,
        "bundle_id" | "course_id",
        [Rel<"bundle_courses_bundle_id_fkey", "bundle_id", "bundles">, Rel<"bundle_courses_course_id_fkey", "course_id", "courses">]
      >;
      promo_codes: Table<PromoCode, "code" | "discount_type" | "discount_value">;
      orders: Table<
        Order,
        "user_id" | "product_type" | "amount" | "final_amount",
        [
          Rel<"orders_user_id_fkey", "user_id", "profiles">,
          Rel<"orders_course_id_fkey", "course_id", "courses">,
          Rel<"orders_bundle_id_fkey", "bundle_id", "bundles">,
          Rel<"orders_promo_code_id_fkey", "promo_code_id", "promo_codes">,
        ]
      >;
      payments: Table<Payment, "order_id" | "provider" | "amount", [Rel<"payments_order_id_fkey", "order_id", "orders">]>;
      payment_events: Table<PaymentEvent, "provider" | "payload">;
      enrollments: Table<
        Enrollment,
        "user_id" | "course_id" | "source",
        [
          Rel<"enrollments_user_id_fkey", "user_id", "profiles">,
          Rel<"enrollments_course_id_fkey", "course_id", "courses">,
          Rel<"enrollments_order_id_fkey", "order_id", "orders">,
        ]
      >;
      lesson_progress: Table<
        LessonProgress,
        "user_id" | "lesson_id",
        [Rel<"lesson_progress_user_id_fkey", "user_id", "profiles">, Rel<"lesson_progress_lesson_id_fkey", "lesson_id", "lessons">]
      >;
      audit_log: Table<AuditLog, "action" | "entity", [Rel<"audit_log_actor_id_fkey", "actor_id", "profiles">]>;
      rate_limits: Table<RateLimit, "key">;
    };
    Views: {
      products: { Row: ProductRow; Relationships: [] };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      has_course_access: { Args: { p_course_id: string }; Returns: boolean };
      can_view_lesson: { Args: { p_lesson_id: string }; Returns: boolean };
      register_device_session: { Args: { p_device_id: string; p_user_agent: string }; Returns: undefined };
      touch_device_session: { Args: { p_device_id: string }; Returns: boolean };
      device_revoke_reason: { Args: { p_device_id: string }; Returns: string | null };
      revoke_my_device: { Args: { p_id: string }; Returns: undefined };
      end_device_session: { Args: { p_device_id: string }; Returns: undefined };
      admin_reset_devices: { Args: { p_user_id: string }; Returns: number };
      check_rate_limit: { Args: { p_key: string; p_limit: number; p_window_seconds: number }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
