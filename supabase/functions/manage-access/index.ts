import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const primaryOrigin = "https://app.damargaleri.com";

const allowedOrigins = new Set([
  primaryOrigin,
  "https://damargaleri.pages.dev",
  "https://damargaleriorganizer.netlify.app",
  "http://localhost:5173",
]);

function corsHeaders(origin: string | null) {
  const safeOrigin = origin && allowedOrigins.has(origin)
    ? origin
    : primaryOrigin;
  return {
    "Access-Control-Allow-Origin": safeOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(origin: string | null, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function cleanEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return json(origin, { error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(origin, { error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const publicAuth = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json(origin, { error: "Unauthorized" }, 401);

    const callerId = userData.user.id;
    const { data: callerProfile, error: profileError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", callerId)
      .single();

    if (profileError || !callerProfile || !["superadmin", "admin"].includes(callerProfile.role)) {
      return json(origin, { error: "Akses ditolak" }, 403);
    }

    const body = await req.json();
    const action = String(body.action ?? "");
    const email = cleanEmail(body.email);
    const fullName = String(body.full_name ?? body.client_name ?? "").trim();

    if (action === "delete_project") {
      if (callerProfile.role !== "superadmin") {
        return json(origin, { error: "Hanya super admin yang dapat menghapus project" }, 403);
      }

      const projectId = String(body.project_id ?? "");
      if (!projectId) return json(origin, { error: "Project wajib dipilih" }, 400);

      const { data: project, error: projectError } = await admin
        .from("projects")
        .select("id, slug")
        .eq("id", projectId)
        .single();
      if (projectError || !project) return json(origin, { error: "Project tidak ditemukan" }, 404);
      if (project.slug === "demo") {
        return json(origin, { error: "Project demo dilindungi dan tidak dapat dihapus" }, 400);
      }

      const { data: coverFiles, error: coverListError } = await admin.storage
        .from("project-assets")
        .list("covers", { search: project.id });
      if (coverListError) throw coverListError;
      const coverPaths = (coverFiles ?? [])
        .filter((file) => file.name.startsWith(project.id + "."))
        .map((file) => `covers/${file.name}`);
      if (coverPaths.length > 0) {
        const { error: coverRemoveError } = await admin.storage
          .from("project-assets")
          .remove(coverPaths);
        if (coverRemoveError) throw coverRemoveError;
      }

      const { error: deleteError } = await admin
        .from("projects")
        .delete()
        .eq("id", project.id);
      if (deleteError) throw deleteError;

      return json(origin, { ok: true, deleted_project_id: project.id });
    }

    if (action === "update_project") {
      if (callerProfile.role !== "superadmin") {
        return json(origin, { error: "Hanya super admin yang dapat mengubah dan memindahkan project" }, 403);
      }

      const projectId = String(body.project_id ?? "");
      if (!projectId) return json(origin, { error: "Project wajib dipilih" }, 400);

      const brideName = String(body.bride_name ?? "").trim();
      const groomName = String(body.groom_name ?? "").trim();
      if (!brideName || !groomName) {
        return json(origin, { error: "Nama pasangan wajib diisi" }, 400);
      }

      const assignedAdmin = String(body.assigned_admin ?? "").trim() || null;
      const estimatedMonth = String(body.estimated_wedding_month ?? "").trim();
      if (estimatedMonth && !/^(20[0-9]{2}|21[0-9]{2})-(0[1-9]|1[0-2])$/.test(estimatedMonth)) {
        return json(origin, { error: "Perkiraan bulan tidak valid" }, 400);
      }
      if (assignedAdmin) {
        const { data: targetAdmin, error: targetError } = await admin
          .from("profiles")
          .select("id, role")
          .eq("id", assignedAdmin)
          .single();
        if (targetError || !targetAdmin || !["admin", "superadmin"].includes(targetAdmin.role)) {
          return json(origin, { error: "Project Manager yang dipilih tidak valid" }, 400);
        }
      }

      const updateData = {
        bride_name: brideName,
        groom_name: groomName,
        wedding_date: String(body.wedding_date ?? "").trim() || null,
        estimated_wedding_month: body.wedding_date ? null : estimatedMonth || null,
        venue: String(body.venue ?? "").trim() || null,
        location: String(body.location ?? "").trim() || null,
        guest_count: String(body.guest_count ?? "").trim() || null,
        budget_total: Math.max(0, Number(body.budget_total) || 0),
        package_name: String(body.package_name ?? "").trim() || null,
        assigned_admin: assignedAdmin,
      };

      const { data: updatedProject, error: updateError } = await admin
        .from("projects")
        .update(updateData)
        .eq("id", projectId)
        .select("id, slug, assigned_admin")
        .single();
      if (updateError || !updatedProject) {
        return json(origin, { error: updateError?.message ?? "Project tidak ditemukan" }, 400);
      }

      return json(origin, { ok: true, project: updatedProject });
    }

    if (action === "convert_lead") {
      const leadId = String(body.lead_id ?? "");
      if (!leadId) return json(origin, { error: "Calon client wajib dipilih" }, 400);

      const { data: lead, error: leadError } = await admin
        .from("leads")
        .select("id, owner_admin, converted_project_id, bride_name, groom_name, event_date, estimated_event_month, venue, location, interested_package, estimated_budget")
        .eq("id", leadId)
        .single();
      if (leadError || !lead) return json(origin, { error: "Calon client tidak ditemukan" }, 404);

      const canManage = callerProfile.role === "superadmin" || lead.owner_admin === callerId;
      if (!canManage) return json(origin, { error: "Anda tidak menangani calon client ini" }, 403);

      // Existing deployed clients send only lead_id. Keep that request compatible
      // while the new review dialog reaches Cloudflare production.
      const input = body.project ?? lead;
      if (!input || typeof input !== "object" || Array.isArray(input)) {
        return json(origin, { error: "Lengkapi data project terlebih dahulu" }, 400);
      }
      const read = (key: string) => typeof input[key] === "string" ? input[key].trim() : "";
      const brideName = read("bride_name");
      const groomName = read("groom_name");
      const eventDate = read("event_date");
      const eventMonth = read("estimated_event_month");
      const budget = Number(input.estimated_budget ?? 0);
      if (!brideName || !groomName || brideName.length > 100 || groomName.length > 100 ||
          ["venue", "location", "interested_package"].some(key => read(key).length > 200)) {
        return json(origin, { error: "Lengkapi nama pasangan dan periksa panjang isian" }, 400);
      }
      if (eventDate && (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) ||
          Number.isNaN(Date.parse(`${eventDate}T00:00:00Z`)) ||
          new Date(`${eventDate}T00:00:00Z`).toISOString().slice(0, 10) !== eventDate)) {
        return json(origin, { error: "Tanggal acara tidak valid" }, 400);
      }
      if (eventMonth && !/^(20[0-9]{2}|21[0-9]{2})-(0[1-9]|1[0-2])$/.test(eventMonth)) {
        return json(origin, { error: "Bulan acara tidak valid" }, 400);
      }
      if (eventDate && eventMonth) return json(origin, { error: "Pilih tanggal atau perkiraan bulan" }, 400);
      if (!Number.isSafeInteger(budget) || budget < 0) return json(origin, { error: "Budget tidak valid" }, 400);

      let assignedAdmin = body.project ? callerId : (lead.owner_admin || callerId);
      if (callerProfile.role === "superadmin" && read("assigned_admin")) {
        const { data: pm } = await admin.from("profiles").select("id, role")
          .eq("id", read("assigned_admin")).in("role", ["admin", "superadmin"]).maybeSingle();
        if (!pm) return json(origin, { error: "Project Manager tidak valid" }, 400);
        assignedAdmin = pm.id;
      }

      const { data: projectId, error: convertError } = await admin.rpc("convert_lead_to_project_with_details", {
        p_lead_id: lead.id,
        p_actor_id: callerId,
        p_details: {
          bride_name: brideName, groom_name: groomName,
          event_date: eventDate, estimated_event_month: eventMonth,
          venue: read("venue"), location: read("location"),
          interested_package: read("interested_package"), estimated_budget: budget,
          assigned_admin: assignedAdmin,
        },
      });
      if (convertError) return json(origin, { error: convertError.message }, 400);

      const { data: project, error: projectError } = await admin
        .from("projects")
        .select("id, slug, bride_name, groom_name")
        .eq("id", projectId)
        .single();
      if (projectError || !project) throw projectError ?? new Error("Project gagal dimuat");

      return json(origin, { ok: true, project });
    }

    if (!validEmail(email)) return json(origin, { error: "Email tidak valid" }, 400);

    if (action === "create_pm") {
      if (callerProfile.role !== "superadmin") {
        return json(origin, { error: "Hanya super admin yang dapat membuat PM" }, 403);
      }

      const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listError) throw listError;
      const existing = existingUsers.users.find((user) => user.email?.toLowerCase() === email);
      if (existing) {
        return json(origin, { error: "Email sudah memiliki akun. Jangan mempromosikan akun client menjadi PM." }, 409);
      }

      const redirectTo = `${origin && allowedOrigins.has(origin) ? origin : primaryOrigin}/admin/setup-password`;
      const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name: fullName || email.split("@")[0] },
      });
      if (inviteError || !inviteData.user) {
        return json(origin, { error: inviteError?.message ?? "Gagal membuat undangan PM" }, 400);
      }

      const { error: profileUpdateError } = await admin.from("profiles").upsert({
        id: inviteData.user.id,
        full_name: fullName || email.split("@")[0],
        full_name_display: fullName || email.split("@")[0],
        role: "admin",
        wa_number: String(body.wa_number ?? "").trim() || null,
      });
      if (profileUpdateError) throw profileUpdateError;

      return json(origin, { ok: true, status: "sent", user_id: inviteData.user.id });
    }

    if (action === "invite_client") {
      const projectId = String(body.project_id ?? "");
      if (!projectId) return json(origin, { error: "Project wajib dipilih" }, 400);

      const { data: project, error: projectError } = await admin
        .from("projects")
        .select("id, slug, assigned_admin")
        .eq("id", projectId)
        .single();
      if (projectError || !project) return json(origin, { error: "Project tidak ditemukan" }, 404);

      const canManage = callerProfile.role === "superadmin" || project.assigned_admin === callerId;
      if (!canManage) return json(origin, { error: "Anda tidak menangani project ini" }, 403);

      await admin.from("project_invitations").upsert({
        project_id: project.id,
        email,
        client_name: fullName || null,
        status: "pending",
        invited_by: callerId,
        last_error: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "project_id,email" });

      const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listError) throw listError;
      let invitedUser = existingUsers.users.find((user) => user.email?.toLowerCase() === email);
      const redirectBase = origin && allowedOrigins.has(origin)
        ? origin
        : primaryOrigin;
      const redirectTo = `${redirectBase}/${project.slug}`;
      let deliveryStatus = "sent";

      if (!invitedUser) {
        const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: { full_name: fullName || email.split("@")[0] },
        });
        if (inviteError || !inviteData.user) {
          await admin.from("project_invitations").update({
            status: "error",
            last_error: inviteError?.message ?? "Gagal mengirim undangan",
            updated_at: new Date().toISOString(),
          }).eq("project_id", project.id).eq("email", email);
          return json(origin, { error: inviteError?.message ?? "Gagal mengirim undangan" }, 400);
        }
        invitedUser = inviteData.user;
      } else {
        const { error: magicError } = await publicAuth.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
        });
        if (magicError) {
          await admin.from("project_invitations").update({
            status: "error",
            last_error: magicError.message,
            updated_at: new Date().toISOString(),
          }).eq("project_id", project.id).eq("email", email);
          return json(origin, { error: magicError.message }, 400);
        }
        deliveryStatus = "resent";
      }

      const { error: profileUpsertError } = await admin.from("profiles").upsert({
        id: invitedUser.id,
        full_name: fullName || email.split("@")[0],
        full_name_display: fullName || email.split("@")[0],
        role: "client",
      }, { onConflict: "id", ignoreDuplicates: true });
      if (profileUpsertError) throw profileUpsertError;

      const { error: memberError } = await admin.from("project_members").upsert({
        project_id: project.id,
        user_id: invitedUser.id,
      }, { onConflict: "project_id,user_id", ignoreDuplicates: true });
      if (memberError) throw memberError;

      const isAlreadyActive = Boolean(invitedUser.email_confirmed_at);
      const { error: invitationUpdateError } = await admin.from("project_invitations").update({
        status: isAlreadyActive ? "accepted" : "sent",
        user_id: invitedUser.id,
        invited_by: callerId,
        sent_at: new Date().toISOString(),
        accepted_at: isAlreadyActive ? new Date().toISOString() : null,
        last_error: null,
        updated_at: new Date().toISOString(),
      }).eq("project_id", project.id).eq("email", email);
      if (invitationUpdateError) throw invitationUpdateError;

      return json(origin, { ok: true, status: deliveryStatus, user_id: invitedUser.id });
    }

    return json(origin, { error: "Action tidak dikenali" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan";
    return json(origin, { error: message }, 500);
  }
});
