import type { Metadata } from "next";
import { PathCardView } from "@/components/catalog/Cards";
import { listPaths } from "@/lib/data/paths";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.paths.title, description: uz.paths.lead };

export default async function PathsPage() {
  const paths = await listPaths(await createClient());
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">{uz.paths.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{uz.paths.lead}</p>
      {paths.length === 0 ? (
        <p className="mt-8 text-muted">{uz.paths.empty}</p>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((p) => (
            <PathCardView key={p.id} p={p} />
          ))}
        </ul>
      )}
    </div>
  );
}
