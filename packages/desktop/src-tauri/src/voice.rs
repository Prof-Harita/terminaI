use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

#[derive(Serialize, Deserialize)]
pub struct SttResult {
    pub text: String,
    pub confidence: Option<f32>,
}

#[derive(Serialize, Deserialize)]
pub struct TtsResult {
    pub wav_bytes: Vec<u8>,
}

/// Get voice cache directory path
fn get_voice_cache_dir() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME not set")?;
    Ok(PathBuf::from(home).join(".terminai").join("voice"))
}

/// Transcribe WAV audio using whisper.cpp
#[tauri::command]
pub fn stt_transcribe(wav_bytes: Vec<u8>) -> Result<SttResult, String> {
    let cache_dir = get_voice_cache_dir()?;
    let whisper_bin = cache_dir.join(if cfg!(windows) {
        "whisper.exe"
    } else {
        "whisper"
    });
    let model_path = cache_dir.join("ggml-base.en.bin");

    if !whisper_bin.exists() {
        return Err("Whisper binary not found. Run 'terminai voice install' first.".to_string());
    }

    if !model_path.exists() {
        return Err("Whisper model not found. Run 'terminai voice install' first.".to_string());
    }

    // Write WAV to temp file
    let temp_dir = std::env::temp_dir();
    let temp_wav = temp_dir.join(format!("whisper_input_{}.wav", std::process::id()));
    fs::write(&temp_wav, wav_bytes).map_err(|e| format!("Failed to write temp WAV: {}", e))?;

    // Spawn whisper.cpp
    let output = Command::new(&whisper_bin)
        .arg("-m")
        .arg(&model_path)
        .arg("-f")
        .arg(&temp_wav)
        .arg("--no-timestamps")
        .arg("--output-txt")
        .arg("--output-file")
        .arg(&temp_dir.join(format!("whisper_output_{}", std::process::id())))
        .output()
        .map_err(|e| format!("Failed to run whisper: {}", e))?;

    // Clean up temp WAV
    let _ = fs::remove_file(&temp_wav);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Whisper failed: {}", stderr));
    }

    // Read output
    let output_txt = temp_dir.join(format!("whisper_output_{}.txt", std::process::id()));
    let text = fs::read_to_string(&output_txt)
        .map_err(|e| format!("Failed to read whisper output: {}", e))?
        .trim()
        .to_string();

    // Clean up output file
    let _ = fs::remove_file(&output_txt);

    Ok(SttResult {
        text,
        confidence: None, // Whisper doesn't provide confidence in simple mode
    })
}

/// Synthesize speech using piper
#[tauri::command]
pub fn tts_synthesize(text: String) -> Result<TtsResult, String> {
    let cache_dir = get_voice_cache_dir()?;
    let piper_bin = cache_dir.join(if cfg!(windows) { "piper.exe" } else { "piper" });
    let voice_model = cache_dir.join("en_US-lessac-medium.onnx");

    if !piper_bin.exists() {
        return Err("Piper binary not found. Run 'terminai voice install' first.".to_string());
    }

    if !voice_model.exists() {
        return Err("Piper voice model not found. Run 'terminai voice install' first.".to_string());
    }

    // Spawn piper with stdin for text
    let mut child = Command::new(&piper_bin)
        .arg("--model")
        .arg(&voice_model)
        .arg("--output-raw")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn piper: {}", e))?;

    // Write text to stdin
    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(text.as_bytes())
            .map_err(|e| format!("Failed to write to piper stdin: {}", e))?;
    }

    // Read output
    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to wait for piper: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Piper failed: {}", stderr));
    }

    // Piper outputs raw PCM, we need to add WAV header
    let pcm_data = output.stdout;
    let wav_bytes = create_wav_header(pcm_data.len(), 22050, 1, 16);

    let mut result = wav_bytes;
    result.extend_from_slice(&pcm_data);

    Ok(TtsResult { wav_bytes: result })
}

/// Create WAV header for PCM data
fn create_wav_header(
    data_size: usize,
    sample_rate: u32,
    channels: u16,
    bits_per_sample: u16,
) -> Vec<u8> {
    let byte_rate = sample_rate * u32::from(channels) * u32::from(bits_per_sample) / 8;
    let block_align = channels * bits_per_sample / 8;

    let mut header = Vec::with_capacity(44);

    // RIFF header
    header.extend_from_slice(b"RIFF");
    header.extend_from_slice(&(36 + data_size as u32).to_le_bytes());
    header.extend_from_slice(b"WAVE");

    // fmt chunk
    header.extend_from_slice(b"fmt ");
    header.extend_from_slice(&16u32.to_le_bytes()); // chunk size
    header.extend_from_slice(&1u16.to_le_bytes()); // PCM format
    header.extend_from_slice(&channels.to_le_bytes());
    header.extend_from_slice(&sample_rate.to_le_bytes());
    header.extend_from_slice(&byte_rate.to_le_bytes());
    header.extend_from_slice(&block_align.to_le_bytes());
    header.extend_from_slice(&bits_per_sample.to_le_bytes());

    // data chunk
    header.extend_from_slice(b"data");
    header.extend_from_slice(&(data_size as u32).to_le_bytes());

    header
}
