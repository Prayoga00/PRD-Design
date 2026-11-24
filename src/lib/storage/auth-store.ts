export type UserRolePreference = 'user-awam' | 'ui-ux-designer';

export interface PrdinUser {
  id: string;
  name: string;
  email: string;
  role: UserRolePreference;
}

interface StoredAccount extends PrdinUser {
  password: string;
}

export interface AuthSnapshot {
  user: PrdinUser | null;
}

const SESSION_KEY = 'prdin.auth.session.v1';
const ACCOUNTS_KEY = 'prdin.auth.accounts.v1';

const DEMO_ACCOUNT: StoredAccount = {
  id: 'usr-demo',
  name: 'Desainer Demo',
  email: 'demo@prdin.app',
  password: 'prdin1234',
  role: 'ui-ux-designer',
};

const SERVER_AUTH_SNAPSHOT: AuthSnapshot = {
  user: null,
};

let clientAuthSnapshot: AuthSnapshot | null = null;
const authListeners = new Set<() => void>();

function notifyAuthListeners(): void {
  for (const listener of authListeners) {
    listener();
  }
}

function readAccounts(): StoredAccount[] {
  if (typeof window === 'undefined') return [DEMO_ACCOUNT];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [DEMO_ACCOUNT];
    const parsed = JSON.parse(raw) as StoredAccount[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [DEMO_ACCOUNT];
    const hasDemo = parsed.some((a) => a.email.toLowerCase() === DEMO_ACCOUNT.email);
    return hasDemo ? parsed : [DEMO_ACCOUNT, ...parsed];
  } catch {
    return [DEMO_ACCOUNT];
  }
}

function writeAccounts(accounts: StoredAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore storage quota errors
  }
}

function readInitialAuthSnapshot(): AuthSnapshot {
  if (typeof window === 'undefined') return SERVER_AUTH_SNAPSHOT;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return SERVER_AUTH_SNAPSHOT;
    const parsed = JSON.parse(raw) as PrdinUser | null;
    if (!parsed || !parsed.email) return SERVER_AUTH_SNAPSHOT;
    return { user: parsed };
  } catch {
    return SERVER_AUTH_SNAPSHOT;
  }
}

export function getAuthSnapshot(): AuthSnapshot {
  if (!clientAuthSnapshot) {
    clientAuthSnapshot = readInitialAuthSnapshot();
  }
  return clientAuthSnapshot;
}

export function getServerAuthSnapshot(): AuthSnapshot {
  return SERVER_AUTH_SNAPSHOT;
}

export function subscribeAuth(listener: () => void): () => void {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

function setSessionUser(user: PrdinUser | null): void {
  clientAuthSnapshot = { user };
  if (typeof window !== 'undefined') {
    try {
      if (user) {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // Ignore
    }
  }
  notifyAuthListeners();
}

export function registerAccount(input: {
  name: string;
  email: string;
  password: string;
  role: UserRolePreference;
}): { ok: true; user: PrdinUser } | { ok: false; error: string } {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!name) return { ok: false, error: 'Nama lengkap wajib diisi.' };
  if (!email.includes('@')) return { ok: false, error: 'Format email tidak valid.' };
  if (password.length < 8) {
    return { ok: false, error: 'Kata sandi minimal 8 karakter.' };
  }

  const accounts = readAccounts();
  if (accounts.some((a) => a.email.toLowerCase() === email)) {
    return { ok: false, error: 'Email ini sudah terdaftar. Silakan masuk lewat halaman Login.' };
  }

  const newAccount: StoredAccount = {
    id: `usr-${Date.now().toString(36)}`,
    name,
    email,
    password,
    role: input.role,
  };

  writeAccounts([...accounts, newAccount]);
  const sessionUser: PrdinUser = {
    id: newAccount.id,
    name: newAccount.name,
    email: newAccount.email,
    role: newAccount.role,
  };
  setSessionUser(sessionUser);
  return { ok: true, user: sessionUser };
}

export function loginAccount(input: {
  email: string;
  password: string;
}): { ok: true; user: PrdinUser } | { ok: false; error: string } {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  const accounts = readAccounts();
  const match = accounts.find(
    (a) => a.email.toLowerCase() === email && a.password === password
  );

  if (!match) {
    return { ok: false, error: 'Email atau kata sandi tidak cocok.' };
  }

  const sessionUser: PrdinUser = {
    id: match.id,
    name: match.name,
    email: match.email,
    role: match.role,
  };
  setSessionUser(sessionUser);
  return { ok: true, user: sessionUser };
}

export function loginDemoAccount(): PrdinUser {
  const sessionUser: PrdinUser = {
    id: DEMO_ACCOUNT.id,
    name: DEMO_ACCOUNT.name,
    email: DEMO_ACCOUNT.email,
    role: DEMO_ACCOUNT.role,
  };
  setSessionUser(sessionUser);
  return sessionUser;
}

export function resetAccountPassword(input: {
  email: string;
  newPassword: string;
}): { ok: true } | { ok: false; error: string } {
  const email = input.email.trim().toLowerCase();
  const newPassword = input.newPassword;

  if (!email.includes('@')) return { ok: false, error: 'Format email tidak valid.' };
  if (newPassword.length < 8) {
    return { ok: false, error: 'Kata sandi baru minimal 8 karakter.' };
  }
  if (email === DEMO_ACCOUNT.email) {
    return {
      ok: false,
      error: 'Akun demo menggunakan sandi bawaan (prdin1234). Gunakan akun terdaftar atau buat akun baru.',
    };
  }

  const accounts = readAccounts();
  const idx = accounts.findIndex((a) => a.email.toLowerCase() === email);
  if (idx < 0) {
    return { ok: false, error: 'Email belum terdaftar di perangkat ini.' };
  }

  const nextAccounts = accounts.map((acc, i) =>
    i === idx ? { ...acc, password: newPassword } : acc
  );
  writeAccounts(nextAccounts);
  return { ok: true };
}

export function logoutAccount(): void {
  setSessionUser(null);
}
