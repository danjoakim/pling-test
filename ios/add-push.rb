# Run from ios/ in CI after `cap add ios`: adds the push entitlement and the ring.caf sound to the App target.
require "xcodeproj"
proj = Xcodeproj::Project.open("ios/App/App.xcodeproj")
target = proj.targets.find { |t| t.name == "App" } or abort("no App target")
group = proj.main_group.find_subpath("App", true)
%w[ring.caf App.entitlements].each do |n|
  ref = group.files.find { |f| f.path == n } || group.new_file(n)
  target.resources_build_phase.add_file_reference(ref, true) if n == "ring.caf"
end
target.build_configurations.each { |c| c.build_settings["CODE_SIGN_ENTITLEMENTS"] = "App/App.entitlements" }
proj.save
puts "push: entitlements + ring.caf added"
