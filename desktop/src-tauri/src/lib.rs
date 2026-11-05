// The app is only a frame around the page in ../dist (the same page as the web version). All logic, including the
// encryption, is in the page. Rust adds only plugins: opener (links in messages open in the system browser), updater (checks GitHub for a
// newer signed build, see claude/oppdatering.md) and process (restart after an update).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .run(tauri::generate_context!())
        .expect("error while running Prek");
}
