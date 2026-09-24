// Types that describe the database (see supabase/migrations). Keep in sync when the schema changes.

type Timestamp = string;
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Build Insert/Update types from a Row: `Req` keys are required on insert, everything else optional.
type TableDef<Row, Req extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Req> & Partial<Omit<Row, Req>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Role = "student" | "admin";
export type AccessType = "one_time" | "monthly" | "manual";
export type ProgressStatus = "started" | "completed";
export type RevokeReason = "limit" | "user" | "admin" | "logout";

export type Profile = {
  id: string;
  telegram_id: number | null;
  full_name: string;
  username: string | null;
  photo_url: string | null;
  phone: string | null;
  role: Role;
  created_at: Timestamp;
  last_seen_at: Timestamp | null;
};

export type Course = {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_url: string | null;
  position: number;
  is_published: boolean;
  archived_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  is_published: boolean;
  archived_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  position: number;
  is_free_preview: boolean;
  is_published: boolean;
  archived_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type LessonContent = {
  lesson_id: string;
  youtube_url: string | null;
  content_md: string;
  updated_at: Timestamp;
};

export type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  access_type: AccessType;
  note: string | null;
  granted_by: string | null;
  granted_at: Timestamp;
  expires_at: Timestamp | null;
  revoked_at: Timestamp | null;
  revoked_by: string | null;
};

export type LessonProgress = {
  user_id: string;
  lesson_id: string;
  status: ProgressStatus;
  started_at: Timestamp;
  completed_at: Timestamp | null;
};

export type DeviceSession = {
  id: string;
  user_id: string;
  device_id: string;
  auth_session_id: string | null;
  user_agent: string | null;
  created_at: Timestamp;
  last_seen_at: Timestamp;
  revoked_at: Timestamp | null;
  revoked_reason: RevokeReason | null;
};

export type Dataset = {
  id: string;
  name: string;
  table_name: string;
  storage_path: string;
  columns: Json;
  row_count: number;
  created_at: Timestamp;
};

export type Exercise = {
  id: string;
  lesson_id: string;
  prompt_md: string;
  dataset_ids: string[];
  points: number;
  position: number;
  created_at: Timestamp;
};

export type ExerciseKey = {
  exercise_id: string;
  reference_sql: string;
  expected_result: Json | null;
  check_rules: Json;
  hints: Json;
};

export type ExerciseSubmission = {
  id: string;
  user_id: string;
  exercise_id: string;
  submitted_sql: string;
  passed_checks: number;
  total_checks: number;
  is_correct: boolean;
  created_at: Timestamp;
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

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile, "id">;
      courses: TableDef<Course, "title" | "slug">;
      modules: TableDef<Module, "course_id" | "title">;
      lessons: TableDef<Lesson, "module_id" | "title" | "slug">;
      lesson_content: TableDef<LessonContent, "lesson_id">;
      enrollments: TableDef<Enrollment, "user_id" | "course_id">;
      lesson_progress: TableDef<LessonProgress, "user_id" | "lesson_id">;
      device_sessions: TableDef<DeviceSession, "user_id" | "device_id">;
      datasets: TableDef<Dataset, "name" | "table_name" | "storage_path">;
      exercises: TableDef<Exercise, "lesson_id">;
      exercise_keys: TableDef<ExerciseKey, "exercise_id">;
      exercise_submissions: TableDef<ExerciseSubmission, "user_id" | "exercise_id" | "submitted_sql">;
      audit_log: TableDef<AuditLog, "action" | "entity">;
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      has_course_access: { Args: { p_course_id: string }; Returns: boolean };
      can_view_lesson_content: { Args: { p_lesson_id: string }; Returns: boolean };
      touch_device_session: { Args: { p_device_id: string }; Returns: boolean };
      revoke_device_session: { Args: { p_id: string; p_reason: RevokeReason }; Returns: undefined };
      register_device_session: {
        Args: {
          p_user_id: string;
          p_device_id: string;
          p_auth_session_id: string | null;
          p_user_agent: string;
          p_limit?: number;
        };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
