# Run in CI after `cap add ios`: prints AppDelegate and makes sure the push token callbacks are forwarded to Capacitor.
import sys
p = "ios/App/App/AppDelegate.swift"
s = open(p).read()
had = ("didRegisterForRemoteNotificationsWithDeviceToken" in s, "didFailToRegisterForRemoteNotificationsWithError" in s)
add = ""
if "didRegisterForRemoteNotificationsWithDeviceToken" not in s:
    add += """
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }
"""
if "didFailToRegisterForRemoteNotificationsWithError" not in s:
    add += """
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
"""
if add:
    i = s.rstrip().rfind("}")
    s = s[:i] + add + "\n}\n"
    open(p, "w").write(s)
print(open(p).read())
print("---- AppDelegate had register/fail callbacks:", had, "| patched:", bool(add))
