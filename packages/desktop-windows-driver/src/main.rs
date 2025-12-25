use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{self, BufRead};

#[derive(Serialize, Deserialize, Debug)]
struct Request {
    jsonrpc: String,
    method: String,
    params: Option<Value>,
    id: Option<Value>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Response {
    jsonrpc: String,
    result: Option<Value>,
    error: Option<ValueError>,
    id: Option<Value>,
}

#[derive(Serialize, Deserialize, Debug)]
struct ValueError {
    code: i32,
    message: String,
}

fn main() {
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        if let Ok(line_content) = line {
            if let Ok(request) = serde_json::from_str::<Request>(&line_content) {
                let response = handle_request(request);
                if let Ok(json_response) = serde_json::to_string(&response) {
                    println!("{}", json_response);
                }
            }
        }
    }
}

fn handle_request(req: Request) -> Response {
    // Mock implementation for MVP
    let result = match req.method.as_str() {
        "get_capabilities" => Some(json!({
            "platform": "windows",
            "driver": "uia",
            "version": "0.1.0",
            "actions": ["click", "type", "snapshot"],
            "native": true
        })),
        _ => None,
    };

    let error = if result.is_none() {
        Some(ValueError {
            code: -32601,
            message: format!("Method not found: {}", req.method),
        })
    } else {
        None
    };

    Response {
        jsonrpc: "2.0".to_string(),
        result,
        error,
        id: req.id,
    }
}
