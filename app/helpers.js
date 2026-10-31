//# Small pure helpers (invitation from the page address, URL-safe base64, the mute list, "N dager") live in src/helpers.ts
//# (bundled as PrekHelpers). This line gives them their names in the page script.
const {inviteFromHash,b64url,isMuted,withMuted,daysText}=PrekHelpers;
