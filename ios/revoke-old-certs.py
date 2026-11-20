# Removes the old development certificates that earlier CI runs created ("Created via API"), so Apple's limit is not reached.
# Every build makes a new one (Xcode, -allowProvisioningUpdates). Only certificates of that kind are touched, never the ones you made yourself.
# Never fails the build: if the API key is not allowed to do this, it only says so.
import os, sys, time, json, urllib.request, urllib.error
import jwt

key = open(sys.argv[1]).read()
now = int(time.time())
tok = jwt.encode({"iss": os.environ["ASC_ISSUER_ID"], "iat": now, "exp": now + 600, "aud": "appstoreconnect-v1"},
                 key, algorithm="ES256", headers={"kid": os.environ["ASC_KEY_ID"]})
BASE = "https://api.appstoreconnect.apple.com/v1/certificates"

def call(method, url):
    req = urllib.request.Request(url, method=method, headers={"Authorization": "Bearer " + tok})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

st, body = call("GET", BASE + "?limit=200")
if st != 200:
    print("::warning title=certificates::could not list certificates (HTTP %d): %s" % (st, body[:300].decode("utf8", "replace")))
    sys.exit(0)
rows = json.loads(body).get("data", [])
print("certificates on the account: %d" % len(rows))
gone = failed = 0
for c in rows:
    a = c.get("attributes", {})
    label = "%s | %s | %s | expires %s" % (c["id"], a.get("certificateType"), a.get("displayName") or a.get("name"), a.get("expirationDate"))
    mine = "Created via API" in ((a.get("displayName") or "") + " " + (a.get("name") or ""))
    dev = "DEVELOPMENT" in (a.get("certificateType") or "")
    if mine and dev:
        s2, b2 = call("DELETE", BASE + "/" + c["id"])
        if s2 in (200, 204):
            gone += 1; print("revoked: " + label)
        else:
            failed += 1; print("::warning title=certificates::could not revoke %s (HTTP %d): %s" % (label, s2, b2[:200].decode("utf8", "replace")))
    else:
        print("kept:    " + label)
print("revoked %d, failed %d" % (gone, failed))
