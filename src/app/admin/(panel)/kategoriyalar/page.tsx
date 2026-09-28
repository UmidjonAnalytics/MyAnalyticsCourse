import type { Metadata } from "next";
import { CategoryEditor } from "@/components/admin/CategoryEditor";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.categories.title };

export default async function Categories() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, name, courses(count)").order("position");
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">{uz.admin.categories.title}</h1>
      <p className="mb-6 mt-1 text-muted">{uz.admin.categories.lead}</p>
      <CategoryEditor categories={(data ?? []).map((c) => ({ id: c.id, name: c.name, courseCount: c.courses[0]?.count ?? 0 }))} />
    </div>
  );
}
