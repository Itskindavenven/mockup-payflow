// Server-only — never import in client components or middleware
import fs from "fs";
import path from "path";
import type { Permission } from "./auth-types";

const DATA_FILE = path.join(process.cwd(), "src/data/users.json");

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "employee";
  permissions: Permission[];
}

function read(): StoredUser[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")).users as StoredUser[];
  } catch {
    return [];
  }
}

function write(users: StoredUser[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users }, null, 2), "utf-8");
}

export const userStore = {
  getAll(): StoredUser[] {
    return read();
  },
  findByEmail(email: string): StoredUser | undefined {
    return read().find((u) => u.email.toLowerCase() === email.toLowerCase());
  },
  findById(id: string): StoredUser | undefined {
    return read().find((u) => u.id === id);
  },
  update(id: string, updates: Partial<Omit<StoredUser, "id">>): boolean {
    const users = read();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return false;
    users[idx] = { ...users[idx], ...updates };
    write(users);
    return true;
  },
  create(user: StoredUser): { ok: boolean; error?: string } {
    const users = read();
    if (users.some((u) => u.email.toLowerCase() === user.email.toLowerCase())) {
      return { ok: false, error: "Email sudah terdaftar." };
    }
    users.push(user);
    write(users);
    return { ok: true };
  },
  delete(id: string): boolean {
    const users = read();
    const filtered = users.filter((u) => u.id !== id);
    if (filtered.length === users.length) return false;
    write(filtered);
    return true;
  },
};
