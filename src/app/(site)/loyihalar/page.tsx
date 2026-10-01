import type { Metadata } from "next";
import { ProjectCardView } from "@/components/catalog/Cards";
import { listProjects } from "@/lib/data/paths";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.projects.title, description: uz.projects.lead };

export default async function ProjectsPage() {
  const projects = await listProjects(await createClient());
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">{uz.projects.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{uz.projects.lead}</p>
      {projects.length === 0 ? (
        <p className="mt-8 text-muted">{uz.projects.empty}</p>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCardView key={p.id} p={p} />
          ))}
        </ul>
      )}
    </div>
  );
}
