// The app is only a frame around the page in ../dist (the same page as the web version). All logic, including the
// encryption, is in the page. The one thing Rust adds is the opener plugin: links in messages open in the system browser.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running Prek");
}
