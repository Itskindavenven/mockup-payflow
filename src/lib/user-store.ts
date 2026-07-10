// Server-only — never import in client components or middleware
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import type { Permission } from "./auth-types";
import { isSupabaseConfigured, supabaseAdmin } from "./supabase";

const DATA_FILE = path.join(process.cwd(), "src/data/users.json");

// passwordHash: bcrypt hash, never the raw password — see supabase/schema.sql
// (app_users.password_hash) and supabase/seed.sql for how existing dev users
// were migrated.
export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "employee";
  permissions: Permission[];
}

function readFs(): StoredUser[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")).users as StoredUser[];
  } catch {
    return [];
  }
}

function writeFs(users: StoredUser[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users }, null, 2), "utf-8");
}

function rowToUser(row: {
  id: string; name: string; email: string; password_hash: string;
  role: "admin" | "employee"; permissions: Permission[];
}): StoredUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    permissions: row.permissions,
  };
}

export const userStore = {
  async getAll(): Promise<StoredUser[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin().from("app_users").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []).map(rowToUser);
    }
    return readFs();
  },

  async findByEmail(email: string): Promise<StoredUser | undefined> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin()
        .from("app_users")
        .select("*")
        .ilike("email", email)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToUser(data) : undefined;
    }
    return readFs().find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  async findById(id: string): Promise<StoredUser | undefined> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin().from("app_users").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? rowToUser(data) : undefined;
    }
    return readFs().find((u) => u.id === id);
  },

  async update(id: string, updates: Partial<Omit<StoredUser, "id">>): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const patch: Record<string, unknown> = {};
      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.email !== undefined) patch.email = updates.email;
      if (updates.passwordHash !== undefined) patch.password_hash = updates.passwordHash;
      if (updates.role !== undefined) patch.role = updates.role;
      if (updates.permissions !== undefined) patch.permissions = updates.permissions;
      const { data, error } = await supabaseAdmin().from("app_users").update(patch).eq("id", id).select("id");
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    }
    const users = readFs();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return false;
    users[idx] = { ...users[idx], ...updates };
    writeFs(users);
    return true;
  },

  // `password` di sini plaintext — di-hash sebelum disimpan, di kedua backend.
  async create(user: Omit<StoredUser, "passwordHash"> & { password: string }): Promise<{ ok: boolean; error?: string }> {
    const passwordHash = await bcrypt.hash(user.password, 10);
    if (isSupabaseConfigured()) {
      const { error } = await supabaseAdmin().from("app_users").insert({
        id: user.id,
        name: user.name,
        email: user.email,
        password_hash: passwordHash,
        role: user.role,
        permissions: user.permissions,
      });
      if (error) {
        if (error.code === "23505") return { ok: false, error: "Email sudah terdaftar." };
        throw error;
      }
      return { ok: true };
    }
    const users = readFs();
    if (users.some((u) => u.email.toLowerCase() === user.email.toLowerCase())) {
      return { ok: false, error: "Email sudah terdaftar." };
    }
    users.push({ id: user.id, name: user.name, email: user.email, passwordHash, role: user.role, permissions: user.permissions });
    writeFs(users);
    return { ok: true };
  },

  async delete(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin().from("app_users").delete().eq("id", id).select("id");
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    }
    const users = readFs();
    const filtered = users.filter((u) => u.id !== id);
    if (filtered.length === users.length) return false;
    writeFs(filtered);
    return true;
  },

  async verifyPassword(user: StoredUser, plaintext: string): Promise<boolean> {
    return bcrypt.compare(plaintext, user.passwordHash);
  },
};
