/**
 * Typed access to the server functions (Supabase `rpc`). One function per database function, so names and
 * argument names exist in exactly one place. The result is returned exactly as supabase-js gives it
 * ({ data, error }); callers keep using `q()` for the error handling and context prefix they had before.
 *
 * Keep this in step with supabase/migrations/. tests/api-unit.js compares every call here against the SQL.
 */

export type Result<T> = { data: T | null; error: { message: string } | null };

/** What this module needs from the Supabase client: server functions and sign-in. */
export interface RpcClient {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<Result<any>>;
  auth: AuthClient;
}

export interface Session { access_token: string; user: { id: string; email?: string } }
/** The parts of supabase.auth used here. Results are passed through unchanged. */
export interface AuthClient {
  signUp(a: { email: string; password: string }): PromiseLike<Result<{ session: Session | null }>>;
  signInWithPassword(a: { email: string; password: string }): PromiseLike<Result<unknown>>;
  signInWithOtp(a: { email: string; options: { emailRedirectTo: string } }): PromiseLike<Result<unknown>>;
  verifyOtp(a: { email: string; token: string; type: "email" }): PromiseLike<Result<unknown>>;
  signOut(a?: { scope: "local" }): PromiseLike<{ error: unknown }>;
  getSession(): PromiseLike<{ data: { session: Session | null } }>;
  onAuthStateChange(cb: (event: string, session: Session | null) => void): unknown;
}

export interface FoundUser { id: string; name: string; fp: string; pub: unknown }
export interface PresenceRow {
  user_id: string; st: string; age_s: number; typ_chat: string | null; typ_age_s: number | null;
}
export interface RedeemedInvite { id: string; name: string }

export function createApi(c: RpcClient) {
  const call = <T>(name: string, args?: Record<string, unknown>) => c.rpc(name, args) as PromiseLike<Result<T>>;
  return {
    // sign-in. The link in the e-mail brings the user back to this page (same origin and path).
    signUp: (email: string, password: string) => c.auth.signUp({ email, password }),
    signIn: (email: string, password: string) => c.auth.signInWithPassword({ email, password }),
    sendLoginCode: (email: string, redirectTo: string) =>
      c.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } }),
    verifyLoginCode: (email: string, token: string) => c.auth.verifyOtp({ email, token, type: "email" }),
    /** Callers must not rely on this alone: see doLogout() in main.js for why. */
    signOut: (localOnly = false) => (localOnly ? c.auth.signOut({ scope: "local" }) : c.auth.signOut()),
    getSession: () => c.auth.getSession(),
    onAuthChange: (cb: (event: string, session: Session | null) => void) => c.auth.onAuthStateChange(cb),
    // friends and requests
    findByEmail: (email: string) => call<FoundUser[]>("find_by_email", { p_email: email }),
    /** Returns "friends" when the other side had already asked, otherwise "sent". */
    sendRequest: (to: string) => call<string>("send_request", { p_to: to }),
    acceptRequest: (from: string) => call<void>("accept_request", { p_from: from }),
    removeFriend: (other: string) => call<void>("remove_friend", { p_other: other }),
    // blocking
    blockUser: (other: string) => call<void>("block_user", { p_other: other }),
    unblockUser: (other: string) => call<void>("unblock_user", { p_other: other }),
    // chats
    openDm: (other: string) => call<string>("open_dm", { p_other: other }),
    setChatExpiry: (chat: string, days: number) => call<void>("set_chat_expiry", { p_chat: chat, p_days: days }),
    markRead: (chat: string, id: number) => call<void>("mark_read", { p_chat: chat, p_id: id }),
    // presence
    setPresence: (status: string, typing: string | null) => call<void>("set_presence", { p_st: status, p_typ: typing }),
    getPresence: () => call<PresenceRow[]>("get_presence"),
    // invitations (only the hash of the token is stored on the server)
    createInvite: (hash: string) => call<string>("create_invite", { p_hash: hash }),
    peekInvite: (token: string) => call<string | null>("peek_invite", { p_token: token }),
    redeemInvite: (token: string) => call<RedeemedInvite[]>("redeem_invite", { p_token: token }),
    revokeInvites: () => call<number>("revoke_invites"),
  };
}

export type Api = ReturnType<typeof createApi>;
