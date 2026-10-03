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
export type PaymentProviderName = "payme" | "click" | "paynet" | "uzum" | "test";
export type OrderProvider = PaymentProviderName | "free" | "manual";
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
  username: string | null;
  headline: string;
  bio: string;
  location: string;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
  is_public: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_seen_at: Timestamp | null;
};

/** Shape returned by the public_profile() function. */
export type PublicProfile = {
  username: string;
  full_name: string;
  avatar_url: string | null;
  headline: string;
  bio: string;
  location: string;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
  member_since: Timestamp;
  certificates: { code: string; course_title: string; hours: number; issued_at: Timestamp }[];
  projects: {
    title: string;
    slug: string;
    course_title: string;
    skills: string[];
    link_url: string;
    summary: string;
    reviewed_at: Timestamp | null;
  }[];
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
  instructor_id: string | null;
  level: CourseLevel | null;
  outcomes: string[];
  audience: string[];
  requirements: string[];
  created_at: Timestamp;
  updated_at: Timestamp;
  archived_at: Timestamp | null;
};

export type CourseLevel = "beginner" | "intermediate" | "advanced";

export type Instructor = {
  id: string;
  name: string;
  title: string;
  bio_md: string;
  photo_url: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type QuizQuestion = {
  id: string;
  lesson_id: string;
  position: number;
  prompt: string;
  options: string[];
  multiple: boolean;
  created_at: Timestamp;
};

export type QuizAnswerKey = { question_id: string; correct: number[]; explanation: string };

export type QuizAttempt = {
  id: string;
  user_id: string;
  lesson_id: string;
  answers: Json;
  correct: number;
  total: number;
  passed: boolean;
  created_at: Timestamp;
};

export type LessonResource = {
  id: string;
  lesson_id: string | null;
  project_id: string | null;
  title: string;
  file_path: string | null;
  url: string | null;
  size_bytes: number | null;
  position: number;
  created_at: Timestamp;
};

export type CourseReview = {
  id: string;
  course_id: string;
  user_id: string;
  rating: number;
  body: string;
  hidden_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type Certificate = {
  id: string;
  code: string;
  user_id: string;
  course_id: string;
  full_name: string;
  course_title: string;
  hours: number;
  issued_at: Timestamp;
  revoked_at: Timestamp | null;
};

export type LearningPath = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  cover_url: string | null;
  level: CourseLevel | null;
  outcomes: string[];
  bundle_id: string | null;
  is_published: boolean;
  position: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  archived_at: Timestamp | null;
};

export type LearningPathCourse = { path_id: string; course_id: string; position: number };

export type Project = {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  short_description: string;
  brief_md: string;
  steps_md: string;
  deliverable_md: string;
  cover_url: string | null;
  level: CourseLevel | null;
  hours: number | null;
  skills: string[];
  is_published: boolean;
  position: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  archived_at: Timestamp | null;
};

export type SubmissionStatus = "submitted" | "approved" | "needs_work";

export type ProjectSubmission = {
  id: string;
  project_id: string;
  user_id: string;
  link_url: string;
  summary: string;
  is_public: boolean;
  status: SubmissionStatus;
  feedback: string;
  submitted_at: Timestamp;
  reviewed_at: Timestamp | null;
};

export type SiteSettings = {
  id: number;
  company_name: string;
  stir: string;
  address: string;
  phone: string;
  email: string;
  telegram_url: string;
  instagram_url: string;
  support_hours: string;
  updated_at: Timestamp;
};

export type SitePage = { slug: string; title: string; body_md: string; updated_at: Timestamp };

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
  duration_minutes: number | null;
  quiz_pass_percent: number;
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
  provider: OrderProvider | null;
  number: number;
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
  public_id: number;
  provider_time: number | null;
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
  order_id: string | null;
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

export type Dataset = {
  id: string;
  name: string;
  table_name: string;
  description: string;
  storage_path: string;
  columns: Json;
  row_count: number;
  preview: Json;
  created_at: Timestamp;
  updated_at: Timestamp;
  archived_at: Timestamp | null;
};

export type Exercise = {
  id: string;
  lesson_id: string;
  title: string;
  task_md: string;
  points: number;
  position: number;
  is_published: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  archived_at: Timestamp | null;
};

export type ExerciseDataset = { exercise_id: string; dataset_id: string };

export type ExerciseKey = {
  exercise_id: string;
  reference_sql: string;
  expected: Json | null;
  check_rules: Json;
  updated_at: Timestamp;
};

export type ExerciseSubmission = {
  id: string;
  user_id: string;
  exercise_id: string;
  sql: string;
  passed: boolean;
  score: number;
  results: Json;
  created_at: Timestamp;
};

export type LessonComment = {
  id: string;
  lesson_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null;
};

export type Assignment = {
  id: string;
  lesson_id: string | null;
  project_id: string | null;
  title: string;
  instructions_md: string;
  embed_url: string | null;
  file_path: string | null;
  allow_download: boolean;
  points: number;
  position: number;
  is_published: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  archived_at: Timestamp | null;
};

export type AssignmentQuestion = {
  id: string;
  assignment_id: string;
  position: number;
  prompt: string;
  answer_type: "number" | "text";
  placeholder: string;
  hint: string;
};

export type AssignmentAnswerKey = { question_id: string; answers: string[]; tolerance: number; case_sensitive: boolean };

export type AssignmentSubmission = {
  id: string;
  user_id: string;
  assignment_id: string;
  answers: Json;
  results: Json;
  correct: number;
  total: number;
  passed: boolean;
  created_at: Timestamp;
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
      courses: Table<
        Course,
        "title" | "slug",
        [Rel<"courses_category_id_fkey", "category_id", "categories">, Rel<"courses_instructor_id_fkey", "instructor_id", "instructors">]
      >;
      instructors: Table<Instructor, "name">;
      site_settings: Table<SiteSettings, never>;
      site_pages: Table<SitePage, "slug" | "title">;
      quiz_questions: Table<QuizQuestion, "lesson_id" | "prompt" | "options", [Rel<"quiz_questions_lesson_id_fkey", "lesson_id", "lessons">]>;
      quiz_answer_keys: Table<
        QuizAnswerKey,
        "question_id" | "correct",
        [
          {
            foreignKeyName: "quiz_answer_keys_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: true;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
        ]
      >;
      quiz_attempts: Table<
        QuizAttempt,
        "user_id" | "lesson_id" | "answers" | "correct" | "total" | "passed",
        [Rel<"quiz_attempts_lesson_id_fkey", "lesson_id", "lessons">, Rel<"quiz_attempts_user_id_fkey", "user_id", "profiles">]
      >;
      lesson_resources: Table<
        LessonResource,
        "title",
        [Rel<"lesson_resources_lesson_id_fkey", "lesson_id", "lessons">, Rel<"lesson_resources_project_id_fkey", "project_id", "projects">]
      >;
      course_reviews: Table<
        CourseReview,
        "course_id" | "user_id" | "rating",
        [Rel<"course_reviews_course_id_fkey", "course_id", "courses">, Rel<"course_reviews_user_id_fkey", "user_id", "profiles">]
      >;
      certificates: Table<
        Certificate,
        "code" | "user_id" | "course_id" | "full_name" | "course_title",
        [Rel<"certificates_course_id_fkey", "course_id", "courses">, Rel<"certificates_user_id_fkey", "user_id", "profiles">]
      >;
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
      payment_events: Table<PaymentEvent, "provider" | "payload", [Rel<"payment_events_order_id_fkey", "order_id", "orders">]>;
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
      lesson_comments: Table<
        LessonComment,
        "lesson_id" | "user_id" | "body",
        [Rel<"lesson_comments_lesson_id_fkey", "lesson_id", "lessons">, Rel<"lesson_comments_user_id_fkey", "user_id", "profiles">]
      >;
      assignments: Table<
        Assignment,
        "title",
        [Rel<"assignments_lesson_id_fkey", "lesson_id", "lessons">, Rel<"assignments_project_id_fkey", "project_id", "projects">]
      >;
      learning_paths: Table<LearningPath, "title" | "slug", [Rel<"learning_paths_bundle_id_fkey", "bundle_id", "bundles">]>;
      learning_path_courses: Table<
        LearningPathCourse,
        "path_id" | "course_id",
        [Rel<"learning_path_courses_path_id_fkey", "path_id", "learning_paths">, Rel<"learning_path_courses_course_id_fkey", "course_id", "courses">]
      >;
      projects: Table<Project, "course_id" | "title" | "slug", [Rel<"projects_course_id_fkey", "course_id", "courses">]>;
      project_submissions: Table<
        ProjectSubmission,
        "project_id" | "user_id" | "link_url",
        [Rel<"project_submissions_project_id_fkey", "project_id", "projects">, Rel<"project_submissions_user_id_fkey", "user_id", "profiles">]
      >;
      assignment_questions: Table<
        AssignmentQuestion,
        "assignment_id" | "prompt",
        [Rel<"assignment_questions_assignment_id_fkey", "assignment_id", "assignments">]
      >;
      assignment_answer_keys: Table<
        AssignmentAnswerKey,
        "question_id",
        [
          {
            foreignKeyName: "assignment_answer_keys_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: true;
            referencedRelation: "assignment_questions";
            referencedColumns: ["id"];
          },
        ]
      >;
      assignment_submissions: Table<
        AssignmentSubmission,
        "user_id" | "assignment_id" | "answers" | "results" | "correct" | "total" | "passed",
        [Rel<"assignment_submissions_assignment_id_fkey", "assignment_id", "assignments">]
      >;
      datasets: Table<Dataset, "name" | "table_name" | "storage_path">;
      exercises: Table<Exercise, "lesson_id" | "title", [Rel<"exercises_lesson_id_fkey", "lesson_id", "lessons">]>;
      exercise_datasets: Table<
        ExerciseDataset,
        "exercise_id" | "dataset_id",
        [Rel<"exercise_datasets_exercise_id_fkey", "exercise_id", "exercises">, Rel<"exercise_datasets_dataset_id_fkey", "dataset_id", "datasets">]
      >;
      exercise_keys: Table<
        ExerciseKey,
        "exercise_id",
        [
          {
            foreignKeyName: "exercise_keys_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: true;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ]
      >;
      exercise_submissions: Table<
        ExerciseSubmission,
        "user_id" | "exercise_id" | "sql" | "passed",
        [Rel<"exercise_submissions_exercise_id_fkey", "exercise_id", "exercises">, Rel<"exercise_submissions_user_id_fkey", "user_id", "profiles">]
      >;
    };
    Views: {
      products: { Row: ProductRow; Relationships: [] };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      has_course_access: { Args: { p_course_id: string }; Returns: boolean };
      can_view_lesson: { Args: { p_lesson_id: string }; Returns: boolean };
      course_lesson_features: {
        Args: { p_course_id: string };
        Returns: Array<{ lesson_id: string; quiz_questions: number; exercises: number; assignments: number; resources: number }>;
      };
      course_reviews_public: {
        Args: { p_course_id: string };
        Returns: Array<{ id: string; rating: number; body: string; created_at: Timestamp; author: string }>;
      };
      issue_certificate: { Args: { p_course_id: string }; Returns: string };
      can_view_project: { Args: { p_project_id: string }; Returns: boolean };
      project_showcase: {
        Args: { p_project_id: string };
        Returns: Array<{ id: string; link_url: string; summary: string; reviewed_at: Timestamp | null; author: string; username: string | null }>;
      };
      public_profile: { Args: { p_username: string }; Returns: Json | null };
      certificate_public: {
        Args: { p_code: string };
        Returns: Array<{
          code: string;
          full_name: string;
          course_title: string;
          course_slug: string;
          hours: number;
          issued_at: Timestamp;
          instructor_name: string | null;
          instructor_title: string | null;
          owner_username: string | null;
        }>;
      };
      register_device_session: { Args: { p_device_id: string; p_user_agent: string }; Returns: undefined };
      touch_device_session: { Args: { p_device_id: string }; Returns: boolean };
      device_revoke_reason: { Args: { p_device_id: string }; Returns: string | null };
      revoke_my_device: { Args: { p_id: string }; Returns: undefined };
      end_device_session: { Args: { p_device_id: string }; Returns: undefined };
      admin_reset_devices: { Args: { p_user_id: string }; Returns: number };
      check_rate_limit: { Args: { p_key: string; p_limit: number; p_window_seconds: number }; Returns: boolean };
      order_mark_paid: { Args: { p_order_id: string; p_provider: string }; Returns: undefined };
      order_mark_refunded: { Args: { p_order_id: string; p_reason: string }; Returns: undefined };
      payme_check_order: { Args: { p_order_id: string; p_amount_tiyin: number }; Returns: Json };
      payme_create: { Args: { p_tx: string; p_time: number; p_amount_tiyin: number; p_order_id: string }; Returns: Json };
      payme_perform: { Args: { p_tx: string }; Returns: Json };
      payme_cancel: { Args: { p_tx: string; p_reason: number }; Returns: Json };
      payme_check: { Args: { p_tx: string }; Returns: Json };
      payme_statement: { Args: { p_from: number; p_to: number }; Returns: Json };
      click_prepare: { Args: { p_click_trans_id: string; p_order_id: string; p_amount: number }; Returns: Json };
      click_complete: {
        Args: { p_click_trans_id: string; p_prepare_id: number; p_order_id: string; p_amount: number; p_click_error: number };
        Returns: Json;
      };
      test_payment: { Args: { p_order_id: string; p_success: boolean }; Returns: undefined };
      admin_refund_order: { Args: { p_order_id: string; p_note: string }; Returns: undefined };
      admin_dashboard_stats: { Args: Record<string, never>; Returns: Json };
      lesson_comments_list: {
        Args: { p_lesson_id: string };
        Returns: Array<{
          id: string;
          parent_id: string | null;
          body: string;
          created_at: Timestamp;
          deleted: boolean;
          user_id: string;
          author_name: string;
          author_avatar: string | null;
          author_is_admin: boolean;
        }>;
      };
      can_view_assignment: { Args: { p_assignment_id: string }; Returns: boolean };
      can_view_exercise: { Args: { p_exercise_id: string }; Returns: boolean };
      can_access_dataset: { Args: { p_dataset_id: string }; Returns: boolean };
      admin_reorder: { Args: { p_table: "categories" | "courses" | "modules" | "lessons" | "bundles"; p_ids: string[] }; Returns: undefined };
      admin_set_role: { Args: { p_user_id: string; p_role: Role }; Returns: undefined };
      admin_purge: { Args: { p_entity: "course" | "module" | "lesson" | "bundle"; p_id: string }; Returns: undefined };
      admin_students: {
        Args: { p_search: string; p_limit: number; p_offset: number };
        Returns: Array<{
          id: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          role: Role;
          providers: string[];
          created_at: Timestamp;
          last_seen_at: Timestamp | null;
          course_count: number;
          total_count: number;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
