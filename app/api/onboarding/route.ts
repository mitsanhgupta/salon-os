import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "../../../lib/supabase/server";

/**
 * POST /api/onboarding — Server-side first-time salon provisioning (service-role).
 *
 * The Clerk session is verified here (never trust the browser). Then the service
 * role client creates: profile → salon → owner membership, atomically.
 *
 * This keeps RLS enforced everywhere else and avoids the
 * "new row violates row-level security policy for table salons"
 * error caused by the old client-side INSERT-then-SELECT flow.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const fullName = String(body?.fullName ?? "").trim();
  const salonName = String(body?.salonName ?? "").trim();
  if (!fullName || !salonName) {
    return NextResponse.json({ error: "fullName and salonName are required" }, { status: 400 });
  }

  const sb = createServiceClient();

  // 1. Profile (id defaults to gen_random_uuid; clerk_id = Clerk user id)
  const { data: profile, error: profileErr } = await sb
    .from("profiles")
    .insert({ clerk_id: userId, full_name: fullName })
    .select("id")
    .single();

  if (profileErr) {
    // Already onboarded? Try to link to the existing profile.
    const { data: existing } = await sb
      .from("profiles")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();
    if (existing) {
      // Idempotent — return the existing mapping (also bounce the active session's new session.)
      return NextResponse.json({ profileId: existing.id, role: "owner", alreadyExisted: true });
    }
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }

  // 2. Salon backwards-compat: create
  const { data: salon, error: salonErr } = await sb
    .from("salons")
    .insert({ name: salonName })
    .select("id")
    .single();
  if (salonErr || !salon) {
    await sb.from("profiles").delete().eq("id", profile.id);
    return NextResponse.json({ error: "Failed to create salon" }, { status: 500 });
  }

  // 3. Owner membership.
  const { error: memberErr } = await sb.from("salon_members").insert({
    salon_id: salon.id,
    user_id: profile.id,
    role: "owner",
    status: "active",
  });
  if (memberErr) {
    // Rollback both prior rows for a clean failure.
    await sb.from("salons").delete().eq("id", salon.id);
    await sb.from("profiles").delete().eq("id", profile.id);
    return NextResponse.json({ error: "Failed to create membership" }, { status: 500 });
  }

  return NextResponse.json({ profileId: profile.id, salonId: salon.id, role: "owner" });
}