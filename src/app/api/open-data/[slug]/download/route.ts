import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { downloadName } from "@/lib/storage-links";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Free data library download: anyone may browse, but downloading needs a (free) account.
// Logged-out visitors go to the login page and come back here afterwards.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) {
    const next = `/dataset/${slug}`;
    return NextResponse.redirect(new URL(`/kirish?sabab=kerak&next=${encodeURIComponent(next)}`, request.url));
  }
  if (!(await rateLimit(`open-data:${userId}`, 30, 3600))) return new NextResponse("Too many downloads, try later", { status: 429 });

  // RLS: only published datasets are visible.
  const { data: ds } = await supabase.from("open_datasets").select("id, title, file_path, file_name").eq("slug", slug).maybeSingle();
  if (!ds?.file_path) return new NextResponse("Not found", { status: 404 });

  const ext = (ds.file_name.split(".").pop() || ds.file_path.split(".").pop() || "csv").toLowerCase();
  const { data, error } = await createAdminClient()
    .storage.from("open-data")
    .createSignedUrl(ds.file_path, 600, { download: `${downloadName(ds.title) || "dataset"}.${ext}` });
  if (error || !data) return new NextResponse("Download failed", { status: 500 });
  await supabase.rpc("open_dataset_downloaded", { p_id: ds.id });
  return NextResponse.redirect(data.signedUrl, { status: 302 });
}
