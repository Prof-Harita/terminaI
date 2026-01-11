// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(feature = "dev")]
    {
        // Notice: This is a dev-only feature.
        // This will panic if not run via `cargo tauri dev`
        desktop_lib::dev_shim::run_tauri_dev();
    }

    #[cfg(not(feature = "dev"))]
    {
        desktop_lib::run()
    }
}
