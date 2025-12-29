use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};

pub struct CliBridge {
    stdin: Arc<Mutex<std::process::ChildStdin>>,
    #[allow(dead_code)]
    child: Arc<Mutex<Child>>,
    running: Arc<Mutex<bool>>,
}

#[derive(Clone, serde::Serialize)]
pub struct CliReadyEvent {
    pub url: String,
    pub token: String,
    pub workspace: String,
}

impl CliBridge {
    pub fn spawn_web_remote(app: AppHandle, workspace: String) -> Result<Self, String> {
        // Try to find termai/gemini binary
        let cli_cmd = std::env::var("TERMAI_CLI_PATH").unwrap_or_else(|_| "terminai".to_string());

        // Fixed port for predictable connection
        let port = std::env::var("CODER_AGENT_PORT").unwrap_or_else(|_| "41242".to_string());

        let mut child = Command::new(&cli_cmd)
            .args([
                "--web-remote",
                "--web-remote-port", &port,
                "--output-format", "stream-json",
            ])
            .current_dir(&workspace)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn CLI '{}': {}", cli_cmd, e))?;

        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "Failed to capture stdin".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Failed to capture stdout".to_string())?;

        let stdin = Arc::new(Mutex::new(stdin));
        let running = Arc::new(Mutex::new(true));
        let running_clone = running.clone();
        let child = Arc::new(Mutex::new(child));

        let workspace_clone = workspace.clone();
        let app_clone = app.clone();

        // Stream stdout and capture web-remote ready signal
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            let mut token_found = false;

            for line in reader.lines() {
                if !*running_clone.lock().unwrap() {
                    break;
                }
                if let Ok(line) = line {
                    // Look for the web-remote token in output
                    // Format: "Token stored at /path" or contains token
                    if !token_found && line.contains("Token") {
                        // Try to read token from auth file
                        if let Ok(token) = Self::read_web_remote_token() {
                            let url = format!("http://127.0.0.1:{}", port);
                            let _ = app.emit("cli-ready", CliReadyEvent {
                                url: url.clone(),
                                token: token.clone(),
                                workspace: workspace_clone.clone(),
                            });
                            token_found = true;
                        }
                    }

                    // Also check for "Server listening" message
                    if !token_found && line.contains("listening") {
                        if let Ok(token) = Self::read_web_remote_token() {
                            let url = format!("http://127.0.0.1:{}", port);
                            let _ = app.emit("cli-ready", CliReadyEvent {
                                url,
                                token,
                                workspace: workspace_clone.clone(),
                            });
                            token_found = true;
                        }
                    }

                    let _ = app_clone.emit("cli-output", line);
                }
            }
        });

        Ok(Self {
            stdin,
            child,
            running,
        })
    }

    pub fn send(&self, message: &str) -> Result<(), String> {
        let mut stdin = self.stdin.lock().unwrap();
        writeln!(stdin, "{}", message).map_err(|e| format!("Failed to send: {}", e))
    }

    pub fn stop(&self) {
        *self.running.lock().unwrap() = false;
    }

    fn read_web_remote_token() -> Result<String, String> {
        // Read from ~/.terminai/web-remote-auth.json
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let auth_path = format!("{}/.terminai/web-remote-auth.json", home);

        let content = std::fs::read_to_string(&auth_path)
            .map_err(|e| format!("Failed to read auth file: {}", e))?;

        // Parse JSON to extract token
        // Format: {"token": "xxx", "tokenHash": "yyy"}
        if let Some(start) = content.find("\"token\":") {
            let rest = &content[start + 9..];
            if let Some(end) = rest.find('"') {
                let after_quote = &rest[1..];
                if let Some(close) = after_quote.find('"') {
                    return Ok(after_quote[..close].to_string());
                }
            }
        }

        Err("Token not found in auth file".to_string())
    }

    // Keep the old spawn for backward compatibility
    pub fn spawn(app: AppHandle) -> Result<Self, String> {
        Self::spawn_web_remote(app, "/tmp".to_string())
    }
}
