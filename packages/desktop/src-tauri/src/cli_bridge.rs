use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use rand::Rng;
use serde_json::Value;
use std::io::Write; // Added for logging

use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

pub struct CliBridge {
    #[allow(dead_code)]
    child: Arc<Mutex<Option<CommandChild>>>,
    running: Arc<Mutex<bool>>,
}

#[derive(Clone, serde::Serialize)]
pub struct CliReadyEvent {
    pub url: String,
    pub token: String,
    pub workspace: String,
}

fn generate_token() -> String {
    let mut rng = rand::rng();
    (0..32)
        .map(|_| format!("{:02x}", rng.random::<u8>()))
        .collect()
}

impl CliBridge {
    pub fn spawn_web_remote(app: AppHandle, workspace: String) -> Result<Self, String> {
        // V2: Dynamic Port Assignment
        let port = 0; 

        // Generate a token that we control
        let token = std::env::var("TERMINAI_WEB_REMOTE_TOKEN")
            .ok()
            .unwrap_or_else(generate_token);
        
        // Resolve bundled Web UI path (Legacy support, though sidecar usually serves its own or none)
        let resource_dir = app.path().resource_dir().unwrap_or_default();
        let mut web_ui_path = resource_dir.join("resources").join("web-ui").to_string_lossy().to_string();
        
        if !std::path::Path::new(&web_ui_path).exists() {
             // Fallback for dev
            web_ui_path = std::env::var("TERMINAI_DEV_UI_PATH")
            .unwrap_or_else(|_| "./packages/desktop/dist".to_string());
        }

        println!("[CLI BRIDGE] Spawning sidecar 'terminai-cli' (Dynamic Port)...");

        // Spawn Sidecar with V2 Flags
        let (mut rx, child) = app.shell()
            .sidecar("terminai-cli") // use the configured externalBin name
            .map_err(|e| format!("Failed to create sidecar command: {}", e))?
            .args(&[
                "--web-remote",
                "--web-remote-port", &port.to_string(), // 0 = Dynamic
                "--web-remote-token", &token,
                "--output-format", "json", // Request JSON mode if supported
            ])
            .env("TERMINAI_SIDECAR", "1") // V2 Signal
            .env("GEMINI_WEB_CLIENT_PATH", &web_ui_path)
            .spawn()
            .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

        println!("[CLI BRIDGE] Sidecar spawned successfully");
        
        // Store child for cleanup
        let child_arc = Arc::new(Mutex::new(Some(child)));
        let running = Arc::new(Mutex::new(true));
        
        let running_clone = running.clone();    
        let workspace_clone = workspace.clone();
        let token_clone = token.clone();
        let app_clone = app.clone();

        tauri::async_runtime::spawn(async move {
            // Resolve log path
            let log_dir = app_clone.path().app_log_dir().unwrap_or_else(|_| {
                std::path::PathBuf::from("/tmp")
            });
            let _ = std::fs::create_dir_all(&log_dir);
            let log_path = log_dir.join("sidecar.log");
            
            // Truncate on start
            let _ = std::fs::write(&log_path, format!("--- Sidecar Started at {} ---\n", chrono::Local::now()));

            while let Some(event) = rx.recv().await {
                if !*running_clone.lock().unwrap() {
                     break;
                }
                
                // Open file for append (inefficient per line but safe for now)
                let mut log_file = std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(&log_path)
                    .ok();

                match event {
                    CommandEvent::Stdout(line_bytes) => {
                         let raw_output = String::from_utf8_lossy(&line_bytes).to_string();
                         print!("[SIDECAR] {}", raw_output); 
                         
                         if let Some(ref mut file) = log_file {
                             let _ = writeln!(file, "[STDOUT] {}", raw_output.trim_end());
                         }
                         
                         // V2: Try parsing JSON handshake
                         // Looking for {"terminai_status": "ready", ...}
                         if let Ok(json) = serde_json::from_str::<Value>(&raw_output) {
                             if json["terminai_status"] == "ready" {
                                 let port = json["port"].as_u64().unwrap_or(41242);
                                 let _token = json["token"].as_str().unwrap_or(&token_clone);
                                 let url = format!("http://127.0.0.1:{}", port);
                                 
                                 println!("[SIDECAR READY] Parsed JSON Handshake. URL: {}", url);
                                 let _ = app_clone.emit("cli-ready", CliReadyEvent {
                                     url,
                                     token: _token.to_string(),
                                     workspace: workspace_clone.clone(),
                                 });
                                 continue;
                             }
                         }

                         // V1 Fallback
                         if raw_output.contains("Web Remote") {
                             if let Some(start) = raw_output.find("http://127.0.0.1:") {
                                 let rest = &raw_output[start..];
                                 if let Some(end) = rest.find(&['/', ' '][..]) {
                                     let url = &rest[..end];
                                     println!("[SIDECAR READY] Scraped Legacy URL: {}", url);
                                     let _ = app_clone.emit("cli-ready", CliReadyEvent {
                                         url: url.to_string(),
                                         token: token_clone.clone(),
                                         workspace: workspace_clone.clone(),
                                     });
                                 }
                             }
                         }
                    }
                    CommandEvent::Stderr(line_bytes) => {
                        let line = String::from_utf8_lossy(&line_bytes).to_string();
                        eprint!("[SIDECAR ERROR] {}", line);
                         if let Some(ref mut file) = log_file {
                             let _ = writeln!(file, "[STDERR] {}", line.trim_end());
                         }
                    }
                    CommandEvent::Terminated(payload) => {
                        println!("[SIDECAR] Terminated: {:?}", payload);
                         if let Some(ref mut file) = log_file {
                             let _ = writeln!(file, "[EXIT] Terminated: {:?}", payload);
                         }
                        break;
                    }
                    _ => {}
                }
            }
        });
        
        Ok(Self {
            child: child_arc,
            running,
        })
    }

    pub fn stop(&self) {
        println!("[CLI BRIDGE] Stopping sidecar...");
        *self.running.lock().unwrap() = false;
        if let Some(child) = self.child.lock().unwrap().take() {
            let _ = child.kill();
        }
    }

    // G-6 FIX: Deprecate legacy spawn method that hardcoded /tmp
    // Now uses home directory as a safer fallback
    #[deprecated(since = "0.21.0", note = "Use spawn_web_remote with explicit workspace")]
    pub fn spawn(app: AppHandle) -> Result<Self, String> {
        // Use home directory instead of /tmp as a safer fallback
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| "/tmp".to_string());
        eprintln!("[CLI BRIDGE] Warning: spawn() is deprecated. Use spawn_web_remote with explicit workspace.");
        Self::spawn_web_remote(app, home)
    }
}
