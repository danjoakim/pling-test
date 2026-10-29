// Every user-visible text lives here (Norwegian Bokmål, the only language during the test phase).
// Placeholders look like {name}. Keys are grouped by area. Add a key here before using it in the app;
// tests/i18n-unit.js fails if the app uses a missing key or if a key here is unused.
export const nb = {
  // device transfer
  "device.sent": "Nøkkelen er sendt til den nye enheten",
  // invitations
  "invite.nowFriends": "Du og {name} er nå kompiser",
  "invite.fallbackName": "kompisen din",
  "invite.failed": "Invitasjonen virket ikke: den er utløpt, allerede brukt eller din egen.",
  "invite.copied": "Lenken er kopiert",
  "invite.selectToCopy": "Merk lenken og kopier den",
  "invite.revoked": "{n} aktive invitasjoner er trukket tilbake",
  // friends and blocking
  "friend.nowFriends": "Dere er kompiser nå",
  "friend.requestSent": "Forespørsel sendt til {name}",
  "block.removed": "Blokkeringen er fjernet",
  "block.done": "Blokkert",
  "mute.on": "Samtalen er dempet",
  "mute.off": "Lyden er på igjen",
  // messages
  "msg.copied": "Meldingen er kopiert",
  "msg.copyFailed": "Kunne ikke kopiere",
  "msg.mineDeleted": "Dine meldinger er slettet",
  "exp.on": "Nye meldinger slettes etter {when}",
  "exp.off": "Nye meldinger utløper ikke",
  // images, GIFs, camera, avatar
  "img.notReadable": "Dette er ikke et bilde nettleseren kan lese",
  "img.readFailed": "Kunne ikke lese bildet",
  "img.avatarTooBig": "Bildet ble for stort",
  "img.onlyImages": "Bare bilder kan sendes",
  "img.sending": "Krypterer og sender bildet …",
  "img.sent": "Bildet er sendt",
  "img.uploadFailed": "Laste opp: {msg}",
  "gif.noDecoder": "Nettleseren din kan ikke gjøre GIF-er mindre. Velg en mindre GIF.",
  "gif.tooLarge": "GIF-en er altfor stor til å bli gjort mindre (over 40 MB)",
  "gif.cannotShrink": "Klarte ikke å gjøre GIF-en liten nok",
  "gif.shrinking": "GIF-en er stor, gjør den mindre ({i}/{n}) …",
  "cam.denied": "Fikk ikke tilgang til kameraet. Sjekk tillatelsen i nettleseren, eller velg et bilde fra enheten med binders-knappen.",
  "avatar.saved": "Bildet er lagret. Bare kompisene dine ser det.",
  // keys and recovery
  "key.noBackup": "Det finnes ingen sikkerhetskopi på denne kontoen",
  "key.wrongCode": "Koden stemmer ikke",
  "key.wrongAccount": "Nøkkelen passer ikke til denne kontoen",
} as const;
