import type { Metadata } from "next";
import { deleteInstructor } from "@/app/admin/(panel)/actions/learning";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { InstructorForm } from "@/components/admin/InstructorForm";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.instructors.title };

export default async function Instructors() {
  const supabase = await createClient();
  const { data } = await supabase.from("instructors").select("id, name, title, bio_md, photo_url, courses(count)").order("name");
  const t = uz.admin.instructors;
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="mt-1 text-muted">{t.lead}</p>
      <ul className="mt-6 space-y-5">
        {(data ?? []).map((i) => (
          <li key={i.id} className="card p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">
                {i.name} <span className="text-sm font-normal text-muted">· {t.courseCount(i.courses[0]?.count ?? 0)}</span>
              </h2>
              <ConfirmButton label={t.delete} confirm={t.deleteConfirm} action={deleteInstructor.bind(null, i.id)} className="btn-danger" danger />
            </div>
            <InstructorForm instructor={i} />
          </li>
        ))}
        {!data?.length ? <li className="card p-5 text-muted">{t.empty}</li> : null}
      </ul>
      <section className="card mt-8 p-5 sm:p-6" aria-labelledby="new-instructor">
        <h2 id="new-instructor" className="mb-4 text-lg font-bold">
          {t.add}
        </h2>
        <InstructorForm />
      </section>
    </div>
  );
}
