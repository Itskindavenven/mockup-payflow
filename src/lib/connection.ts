export interface AccurateConnection {
  companyName: string;
  userEmail: string;
  connectedAt: string;
  accessToken: string;
}

const KEY = "ap_accurate_connection";

export function getConnection(): AccurateConnection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AccurateConnection) : null;
  } catch {
    return null;
  }
}

export function saveConnection(conn: AccurateConnection) {
  localStorage.setItem(KEY, JSON.stringify(conn));
}

export function clearConnection() {
  localStorage.removeItem(KEY);
}
