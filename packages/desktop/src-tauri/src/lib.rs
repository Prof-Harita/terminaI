// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod cli_bridge;
// mod oauth;
mod pty_session;
mod voice;

use cli_bridge::CliBridge;
use pty_session::PtySession;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

struct AppState {
    cli: Mutex<Option<CliBridge>>,
    pty_sessions: Mutex<HashMap<String, PtySession>>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn start_cli(app: tauri::AppHandle, state: State<AppState>) -> Result<(), String> {
    let bridge = CliBridge::spawn(app)?;
    *state.cli.lock().unwrap() = Some(bridge);
    Ok(())
}

#[tauri::command]
fn send_to_cli(message: String, state: State<AppState>) -> Result<(), String> {
    let guard = state.cli.lock().unwrap();
    guard.as_ref().ok_or("CLI not started")?.send(&message)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            cli: Mutex::new(None),
            pty_sessions: Mutex::new(HashMap::new()),
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            start_cli,
            send_to_cli,
            stop_cli,
            start_pty_session,
            send_terminal_input,
            stop_pty_session,
            voice::stt_transcribe,
            voice::tts_synthesize,
            // oauth::start_oauth
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
