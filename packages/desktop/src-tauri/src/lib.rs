// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod cli_bridge;
// mod oauth;
mod pty_session;
mod voice;

use cli_bridge::CliBridge;
use pty_session::PtySession;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{Manager, State};

struct AppState {
    cli: Mutex<Option<CliBridge>>,
    pty_sessions: Mutex<HashMap<String, PtySession>>,
}

#[derive(serde::Serialize)]
struct FileEntry {
    name: String,
    is_dir: bool,
    path: String,
}

#[tauri::command]
async fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let entries = std::fs::read_dir(&path)
        .map_err(|e| format!("Failed to read directory '{}': {}", path, e))?;

    let mut result = Vec::new();
    for entry in entries.filter_map(|e| e.ok()) {
        let name = entry.file_name().to_string_lossy().to_string();
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let path = entry.path().to_string_lossy().to_string();
        result.push(FileEntry { name, is_dir, path });
    }

    // Sort: directories first, then alphabetically
    result.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            return b.is_dir.cmp(&a.is_dir);
        }
        a.name.to_lowercase().cmp(&b.name.to_lowercase())
    });

    Ok(result)
}

#[tauri::command]
fn get_current_dir() -> Result<String, String> {
    std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Failed to get current dir: {}", e))
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn start_cli(app: tauri::AppHandle, state: State<AppState>) -> Result<(), String> {
    // Use home directory as default workspace instead of deprecated spawn()
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| "/tmp".to_string());
    let bridge = CliBridge::spawn_web_remote(app, home)?;
    *state.cli.lock().unwrap() = Some(bridge);
    Ok(())
}

#[tauri::command]
fn spawn_cli_backend(
    app: tauri::AppHandle,
    state: State<AppState>,
    workspace: String,
) -> Result<(), String> {
    // Stop existing instance if running (Clean Restart)
    let mut guard = state.cli.lock().unwrap();
    if let Some(ref existing) = *guard {
        existing.stop();
    }
    
    // Spawn CLI with web-remote enabled
    let bridge = cli_bridge::CliBridge::spawn_web_remote(app, workspace)?;
    *guard = Some(bridge);
    Ok(())
}

#[tauri::command]
fn send_to_cli(_message: String, _state: State<AppState>) -> Result<(), String> {
    // In web-remote mode, we communicate via HTTP, not stdin
    Err("CLI stdin not connected in web-remote mode. Use HTTP API instead.".to_string())
}

#[tauri::command]
fn stop_cli(state: State<AppState>) -> Result<(), String> {
    let guard = state.cli.lock().unwrap();
    if let Some(ref cli) = *guard {
        cli.stop();
    }
    Ok(())
}

#[tauri::command]
fn start_pty_session(
    app: tauri::AppHandle,
    state: State<AppState>,
    session_id: String,
    command: String,
    args: Vec<String>,
) -> Result<(), String> {
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let session = PtySession::spawn(app, session_id.clone(), &command, &args_refs)?;
    state
        .pty_sessions
        .lock()
        .unwrap()
        .insert(session_id, session);
    Ok(())
}

#[tauri::command]
fn send_terminal_input(
    state: State<AppState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    let guard = state.pty_sessions.lock().unwrap();
    guard
        .get(&session_id)
        .ok_or("Session not found")?
        .write(data.as_bytes())
}

#[tauri::command]
fn stop_pty_session(state: State<AppState>, session_id: String) -> Result<(), String> {
    let mut guard = state.pty_sessions.lock().unwrap();
    if let Some(session) = guard.remove(&session_id) {
        session.stop();
    }
    Ok(())
}

#[tauri::command]
fn kill_pty_session(state: State<AppState>, session_id: String) -> Result<(), String> {
    let mut guard = state.pty_sessions.lock().unwrap();
    if let Some(session) = guard.remove(&session_id) {
        session.kill_now();
    }
    Ok(())
}

#[tauri::command]
fn resize_pty_session(
    state: State<AppState>,
    session_id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    let guard = state.pty_sessions.lock().unwrap();
    guard
        .get(&session_id)
        .ok_or("Session not found")?
        .resize(rows, cols)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            cli: Mutex::new(None),
            pty_sessions: Mutex::new(HashMap::new()),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main").expect("no main window").set_focus();
        }))
        .invoke_handler(tauri::generate_handler![
            greet,
            get_current_dir,
            start_cli,
            spawn_cli_backend,
            send_to_cli,
            stop_cli,
            start_pty_session,
            send_terminal_input,
            stop_pty_session,
            kill_pty_session,
            resize_pty_session,
            voice::stt_transcribe,
            voice::tts_synthesize,
            read_directory,
            // oauth::start_oauth
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
