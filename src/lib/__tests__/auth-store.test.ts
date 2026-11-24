import { describe, expect, it } from 'vitest';
import {
  loginAccount,
  loginDemoAccount,
  logoutAccount,
  registerAccount,
  resetAccountPassword,
  getAuthSnapshot,
} from '@/lib/storage/auth-store';

describe('auth-store', () => {
  it('registers a new account, resets password, logs out, logs back in, and supports demo login', () => {
    const reg = registerAccount({
      name: 'Raka Pratama',
      email: 'raka@example.com',
      password: 'password123',
      role: 'ui-ux-designer',
    });

    expect(reg.ok).toBe(true);
    expect(getAuthSnapshot().user?.email).toBe('raka@example.com');

    logoutAccount();
    expect(getAuthSnapshot().user).toBeNull();

    const failLogin = loginAccount({
      email: 'raka@example.com',
      password: 'wrong-password',
    });
    expect(failLogin.ok).toBe(false);

    const resetFail = resetAccountPassword({
      email: 'unknown@example.com',
      newPassword: 'newpassword123',
    });
    expect(resetFail.ok).toBe(false);

    const okLogin = loginAccount({
      email: 'demo@prdin.app',
      password: 'prdin1234',
    });
    expect(okLogin.ok).toBe(true);

    logoutAccount();
    const demo = loginDemoAccount();
    expect(demo.email).toBe('demo@prdin.app');
  });
});
