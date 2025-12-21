use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

pub struct PtySession {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    running: Arc<Mutex<bool>>,
}

impl PtySession {
    pub fn spawn(
        app: AppHandle,
        session_id: String,
        command: &str,
        args: &[&str],
    ) -> Result<Self, String> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let mut cmd = CommandBuilder::new(command);
        for arg in args {
            cmd.arg(*arg);
        }

        pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| e.to_string())?;
        let writer = Arc::new(Mutex::new(
            pair.master.take_writer().map_err(|e| e.to_string())?,
        ));
        let running = Arc::new(Mutex::new(true));
        let running_clone = running.clone();

        let event_name = format!("terminal-output-{}", session_id);
        let exit_event = format!("terminal-exit-{}", session_id);
        let app_clone = app.clone();

        std::thread::spawn(move || {
            let mut buffer = [0u8; 4096];
            while *running_clone.lock().unwrap() {
                match reader.read(&mut buffer) {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        let _ = app.emit(&event_name, buffer[..n].to_vec());
                    }
                    Err(_) => break,
                }
            }
            let _ = app_clone.emit(&exit_event, ());
        });

        Ok(Self { writer, running })
    }

    pub fn write(&self, data: &[u8]) -> Result<(), String> {
        self.writer
            .lock()
            .unwrap()
            .write_all(data)
            .map_err(|e| e.to_string())
    }

    pub fn resize(&self, _rows: u16, _cols: u16) -> Result<(), String> {
        // PTY resize would go here if needed
        Ok(())
    }

    pub fn stop(&self) {
        *self.running.lock().unwrap() = false;
    }
}
