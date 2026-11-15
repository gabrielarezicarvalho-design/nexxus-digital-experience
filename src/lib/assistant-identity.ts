// Email and ID must come from the caller's server-verified user/claims, never request body.
export function assistantClientFilter(userId: string, verifiedEmail?: string | null) {
  const email = (verifiedEmail ?? "").replace(/[\\%_,()]/g, "");
  return email ? `user_id.eq.${userId},email.ilike.${email}` : `user_id.eq.${userId}`;
}