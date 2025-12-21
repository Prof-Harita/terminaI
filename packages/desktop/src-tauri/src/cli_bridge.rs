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

impl CliBridge {
    pub fn spawn(app: AppHandle) -> Result<Self, String> {
        // Try to find termai/gemini binary
        let cli_cmd = std::env::var("TERMAI_CLI_PATH").unwrap_or_else(|_| "gemini".to_string());

        let mut child = Command::new(&cli_cmd)
            .args(["--output-format", "stream-json"])
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

        // Stream stdout to frontend
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if !*running_clone.lock().unwrap() {
                    break;
                }
                if let Ok(line) = line {
                    let _ = app.emit("cli-output", line);
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
}
