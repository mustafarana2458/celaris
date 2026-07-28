"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthActionResult = {
  error?: string;
  needsConfirmation?: boolean;
};

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();

  if (!email || !password || !fullName || !businessName) {
    return { error: "Please fill in all fields." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, business_name: businessName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  const user = data.user;
  if (user) {
    const { error: profileError } = await supabase.from("users").insert({
      id: user.id,
      full_name: fullName,
      business_name: businessName,
      plan: "free",
    });
    // 23505 = unique_violation, safe to ignore (row already exists)
    if (profileError && profileError.code !== "23505") {
      return { error: profileError.message };
    }

    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({ name: businessName, owner_id: user.id, plan: "free" })
      .select("id")
      .single();

    if (workspaceError) {
      return { error: workspaceError.message };
    }

    const { error: memberError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError && memberError.code !== "23505") {
      return { error: memberError.message };
    }
  }

  if (!data.session) {
    return { needsConfirmation: true };
  }

  redirect("/dashboard");
}

export async function logIn(formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const user = data.user;
  if (user) {
    const meta = (user.user_metadata ?? {}) as {
      full_name?: string;
      business_name?: string;
    };

    let { data: profile } = await supabase
      .from("users")
      .select("full_name, business_name")
      .eq("id", user.id)
      .maybeSingle<{ full_name: string; business_name: string }>();

    if (!profile) {
      const fullName = meta.full_name ?? "";
      const businessName = meta.business_name ?? "";
      await supabase.from("users").insert({
        id: user.id,
        full_name: fullName,
        business_name: businessName,
        plan: "free",
      });
      profile = { full_name: fullName, business_name: businessName };
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({
          name: profile.business_name || "My Workspace",
          owner_id: user.id,
          plan: "free",
        })
        .select("id")
        .single();

      if (!workspaceError && workspace) {
        await supabase.from("workspace_members").insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: "owner",
        });
      }
    }
  }

  redirect("/dashboard");
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
