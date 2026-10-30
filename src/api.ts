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
  from(table: string): Query<any>;
  storage: { from(bucket: string): StorageBucket };
  functions: { invoke(name: string, opts: { body: unknown }): PromiseLike<Result<any>> };
  channel(name: string): LiveChannel;
  removeAllChannels(): unknown;
}

/** A table query. Awaiting it gives { data, error }, exactly like the supabase-js builder it stands for. */
export interface Query<T> extends PromiseLike<Result<T>> {
  select(columns?: string): Query<T>;
  insert(row: object): Query<T>;
  update(patch: object): Query<T>;
  upsert(row: object, opts?: { onConflict: string }): Query<T>;
  delete(): Query<T>;
  eq(column: string, value: unknown): Query<T>;
  in(column: string, values: unknown[]): Query<T>;
  lt(column: string, value: unknown): Query<T>;
  order(column: string, opts: { ascending: boolean }): Query<T>;
  limit(n: number): Query<T>;
}

export interface StorageBucket {
  upload(path: string, body: Blob, opts: { contentType: string }): PromiseLike<{ error: { message: string } | null }>;
  remove(paths: string[]): PromiseLike<unknown>;
  download(path: string): PromiseLike<{ data: Blob | null; error: { message: string } | null }>;
}

export interface LiveChannel {
  on(type: "postgres_changes", filter: { event: "*"; schema: "public"; table: string }, cb: (payload: any) => void): LiveChannel;
  subscribe(): unknown;
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

// Rows, as in supabase/migrations/ (columns the app reads; dates arrive as ISO strings).
export interface ProfileRow { id: string; fp: string; name: string; pub: any; pm: string | null }
export interface MessageRow { id: number; chat_id: string; sender: string; iv: string; ct: string; exp: string | null; created_at: string; file: string | null }
export interface ReactionRow { msg_id: number; user_id: string; iv: string; ct: string }
export interface KeyBackupRow { user_id: string; salt: string; iv: string; ct: string; iter: number; updated_at: string }
export interface KeyTransferRow {
  id: string; user_id: string; eph_pub: any; status: "pending" | "approved"; sender_pub: any | null;
  iv: string | null; ct: string | null; created_at: string;
}
export interface FriendRow { a: string; b: string }
export interface FriendRequestRow { from_id: string; to_id: string }

/** Name of the private storage bucket for encrypted images. */
export const FILE_BUCKET = "chat-files";

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
    // ---- tables ----
    // key backup (recovery code)
    saveKeyBackup: (row: Omit<KeyBackupRow, "updated_at">) => c.from("key_backups").upsert(row) as Query<null>,
    getKeyBackup: (userId: string) => c.from("key_backups").select("*").eq("user_id", userId) as Query<KeyBackupRow[]>,
    getKeyBackupInfo: (userId: string) =>
      c.from("key_backups").select("user_id,updated_at").eq("user_id", userId) as Query<Pick<KeyBackupRow, "user_id" | "updated_at">[]>,
    // device transfer
    pendingTransfers: () => c.from("key_transfers").select("*").eq("status", "pending") as Query<KeyTransferRow[]>,
    getTransfer: (id: string) => c.from("key_transfers").select("*").eq("id", id) as Query<KeyTransferRow[]>,
    askTransfer: (row: { id: string; user_id: string; eph_pub: unknown }) => c.from("key_transfers").insert(row) as Query<null>,
    approveTransfer: (id: string, p: { sender_pub: unknown; iv: string; ct: string }) =>
      c.from("key_transfers").update({ status: "approved", sender_pub: p.sender_pub, iv: p.iv, ct: p.ct }).eq("id", id) as Query<null>,
    deleteTransfer: (id: string) => c.from("key_transfers").delete().eq("id", id) as Query<null>,
    // profiles and avatars
    getProfile: (id: string) => c.from("profiles").select("*").eq("id", id) as Query<ProfileRow[]>,
    getProfiles: (ids: string[]) => c.from("profiles").select("id,name,fp,pub,pm").in("id", ids) as Query<ProfileRow[]>,
    createProfile: (row: { id: string; fp: string; name: string; pub: unknown }) => c.from("profiles").insert(row) as Query<null>,
    updateProfile: (id: string, patch: { name?: string; pm?: string | null }) => c.from("profiles").update(patch).eq("id", id) as Query<null>,
    getAvatars: (ids: string[]) => c.from("avatars").select("id,data").in("id", ids) as Query<{ id: string; data: string }[]>,
    saveAvatar: (row: { id: string; data: string; updated_at: string }) => c.from("avatars").upsert(row) as Query<null>,
    // friends, requests, blocks
    listFriends: () => c.from("friends").select("*") as Query<FriendRow[]>,
    listRequests: () => c.from("friend_requests").select("*") as Query<FriendRequestRow[]>,
    declineRequest: (fromId: string, toId: string) => c.from("friend_requests").delete().eq("from_id", fromId).eq("to_id", toId) as Query<null>,
    listBlocks: () => c.from("blocks").select("blocked,name") as Query<{ blocked: string; name: string }[]>,
    // chats
    listChatMembers: () => c.from("chat_members").select("chat_id,user_id") as Query<{ chat_id: string; user_id: string }[]>,
    listChats: () => c.from("chats").select("id,exp_days") as Query<{ id: string; exp_days: number }[]>,
    listReads: () => c.from("chat_reads").select("chat_id,last_id") as Query<{ chat_id: string; last_id: number }[]>,
    // messages, newest first
    latestMessages: (chat: string, n: number) =>
      c.from("messages").select("*").eq("chat_id", chat).order("id", { ascending: false }).limit(n) as Query<MessageRow[]>,
    olderMessages: (chat: string, beforeId: number, n: number) =>
      c.from("messages").select("*").eq("chat_id", chat).lt("id", beforeId).order("id", { ascending: false }).limit(n) as Query<MessageRow[]>,
    sendMessage: (row: { chat_id: string; sender: string; iv: string; ct: string; file?: string }) => c.from("messages").insert(row) as Query<null>,
    deleteMyMessages: (chat: string, sender: string) => c.from("messages").delete().eq("chat_id", chat).eq("sender", sender) as Query<null>,
    // reactions
    listReactions: (chat: string) => c.from("reactions").select("msg_id,user_id,iv,ct").eq("chat_id", chat) as Query<ReactionRow[]>,
    saveReaction: (row: { msg_id: number; chat_id: string; user_id: string; iv: string; ct: string }) =>
      c.from("reactions").upsert(row, { onConflict: "msg_id,user_id" }) as Query<null>,

    // ---- encrypted files ----
    uploadFile: (path: string, blob: Uint8Array) =>
      c.storage.from(FILE_BUCKET).upload(path, new Blob([blob as BlobPart], { type: "application/octet-stream" }), { contentType: "application/octet-stream" }),
    downloadFile: (path: string) => c.storage.from(FILE_BUCKET).download(path),
    removeFiles: (paths: string[]) => c.storage.from(FILE_BUCKET).remove(paths),

    // ---- other ----
    /** Edge function that fetches a link preview. Returns { data, error } like the client does. */
    linkPreview: (url: string) => c.functions.invoke("linkpreview", { body: { url } }),
    /** Live updates. Same channel and tables as before; each callback just triggers a refresh in the app. */
    subscribeLive: (h: { onMessage: (p: any) => void; onChange: () => void; onPresence: (p: any) => void }) =>
      c.channel("pling-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, h.onMessage)
        .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, () => h.onChange())
        .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () => h.onChange())
        .on("postgres_changes", { event: "*", schema: "public", table: "friends" }, () => h.onChange())
        .on("postgres_changes", { event: "*", schema: "public", table: "presence" }, h.onPresence)
        .subscribe(),

    /** Closes every live channel (used when signing out). */
    closeLive: () => c.removeAllChannels(),

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
