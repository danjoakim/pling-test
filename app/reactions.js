//# The logic behind reactions (reading and checking them, grouping, your own choice, where the menu goes) lives in src/reactions.ts
//# (bundled as PrekReactions). This file gives loadReacts() its old name and passes in what is page-specific: the api call, the
//# decryption with the chat key, and the list of reaction kinds (RX_OK, defined in main.js next to the texts). (Lines starting with //# are not built into the page.)
const {groupReactions,applyReaction,reactionPayload,menuPosition}=PrekReactions;
const loadReacts=(cid,key)=>PrekReactions.loadReactions(()=>api.listReactions(cid),(iv,ct)=>open(key,iv,ct),RX_OK);
