use std::io::{Read, Write};
use std::net::TcpListener;
use tauri::{AppHandle, Emitter};

const REDIRECT_PORT: u16 = 9876;

#[tauri::command]
pub fn start_oauth(app: AppHandle) -> Result<(), String> {
    // Build OAuth URL
    let client_id = std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default();
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?\
        client_id={}&\
        redirect_uri=http://localhost:{}&\
        response_type=code&\
        scope=openid%20email%20profile",
        client_id, REDIRECT_PORT
    );

    // Open system browser
    open::that(&auth_url).map_err(|e| format!("Failed to open browser: {}", e))?;

    // Start local server to catch callback in background
    let app_clone = app.clone();
    std::thread::spawn(move || {
        if let Ok(listener) = TcpListener::bind(format!("127.0.0.1:{}", REDIRECT_PORT)) {
            // Set timeout so we don't block forever
            listener
                .set_nonblocking(false)
                .expect("Cannot set blocking");

            if let Ok((mut stream, _)) = listener.accept() {
                let mut buffer = [0u8; 2048];
                if stream.read(&mut buffer).is_ok() {
                    let request = String::from_utf8_lossy(&buffer);

                    // Extract authorization code from query string
                    if let Some(code) = extract_code(&request) {
                        let _ = app_clone.emit("oauth-callback", code);

                        // Send success response to browser
                        let response = "HTTP/1.1 200 OK\r\n\
                            Content-Type: text/html\r\n\r\n\
                            <html><body style=\"font-family: sans-serif; display: flex; \
                            justify-content: center; align-items: center; height: 100vh; \
                            background: #0f0f1a; color: white;\">\
                            <div style=\"text-align: center;\">\
                            <h1>✅ Signed in!</h1>\
                            <p>You can close this tab and return to TermAI.</p>\
                            </div></body></html>";
                        let _ = stream.write_all(response.as_bytes());
                    } else {
                        let _ = app_clone.emit("oauth-error", "No authorization code received");
                    }
                }
            }
        }
    });

    Ok(())
}

fn extract_code(request: &str) -> Option<String> {
    // Parse "GET /?code=xxx&... HTTP/1.1"
    request
        .split("code=")
        .nth(1)?
        .split(&['&', ' '][..])
        .next()
        .map(String::from)
}
