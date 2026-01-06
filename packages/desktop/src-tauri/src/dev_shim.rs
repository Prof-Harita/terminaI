use std::process::Command;
use std::env;

fn main() {
    // Rust shim to forward arguments to Node.js CLI
    // Resolves: packages/cli/dist/index.js relative to this binary location
    let exe_path = env::current_exe().expect("Failed to get current exe path");
    let bin_dir = exe_path.parent().expect("Failed to get bin dir");
    
    // Navigate up from packages/desktop/src-tauri/bin/ to packages/cli/dist/
    let cli_path = bin_dir
        .parent().unwrap() // src-tauri
        .parent().unwrap() // desktop
        .parent().unwrap() // packages
        .parent().unwrap() // root
        .join("packages/cli/dist/index.js");

    if !cli_path.exists() {
        eprintln!("Error: CLI not found at {}", cli_path.display());
        std::process::exit(1);
    }
    
    // Forward all arguments
    let args: Vec<String> = env::args().skip(1).collect();

    let status = Command::new("node")
        .arg(cli_path)
        .args(&args)
        .status()
        .expect("Failed to run node");

    std::process::exit(status.code().unwrap_or(1));
}
