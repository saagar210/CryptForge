use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
}

#[derive(Deserialize)]
struct OllamaResponse {
    response: String,
}

/// Send a synchronous generation request to Ollama.
/// Returns the generated text or an error.
pub fn generate(url: &str, model: &str, prompt: &str, timeout_secs: u64) -> Result<String, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(timeout_secs))
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let request = OllamaRequest {
        model: model.to_string(),
        prompt: prompt.to_string(),
        stream: false,
    };

    let api_url = format!("{}/api/generate", url);

    let response = client
        .post(&api_url)
        .json(&request)
        .send()
        .map_err(|e| format!("Ollama request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama returned status: {}", response.status()));
    }

    let body: OllamaResponse = response
        .json()
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

    // Clean up the response — trim whitespace, remove quotes
    let text = body.response.trim().to_string();
    let text = text.trim_matches('"').trim_matches('\'').to_string();

    Ok(text)
}

/// Check if Ollama is available at the given URL.
pub fn check_available(url: &str) -> bool {
    let api_url = format!("{}/api/tags", url);
    reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .ok()
        .and_then(|c| c.get(&api_url).send().ok())
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}
