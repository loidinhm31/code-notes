use qm_sync_client::{ReqwestHttpClient, QmSyncClient, SyncClientConfig};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri_plugin_store::StoreExt;
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    ChaCha20Poly1305
};
use argon2::{Argon2, PasswordHasher};
use argon2::password_hash::SaltString;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use jsonwebtoken::{decode, decode_header, DecodingKey, Validation};
use tokio::sync::RwLock;

/// Authentication service for managing user authentication with qm-sync
pub struct AuthService {
    sync_client: Arc<RwLock<QmSyncClient<ReqwestHttpClient>>>,
    server_url: String,
    default_app_id: String,
    default_api_key: String,
}

impl Clone for AuthService {
    fn clone(&self) -> Self {
        Self {
            sync_client: Arc::clone(&self.sync_client),
            server_url: self.server_url.clone(),
            default_app_id: self.default_app_id.clone(),
            default_api_key: self.default_api_key.clone(),
        }
    }
}

/// Response from register/login endpoints
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AuthResponse {
    pub user_id: String,
    pub access_token: String,
    pub refresh_token: String,
    #[serde(default)]
    pub apps: Option<Vec<String>>,
    #[serde(default)]
    pub is_admin: Option<bool>,
}

/// Authentication status
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatus {
    pub is_authenticated: bool,
    pub user_id: Option<String>,
    pub apps: Option<Vec<String>>,
    pub is_admin: Option<bool>,
    pub server_url: Option<String>,
}

const STORE_FILE: &str = "auth.json";
const KEY_ACCESS_TOKEN: &str = "access_token";
const KEY_REFRESH_TOKEN: &str = "refresh_token";
const KEY_USER_ID: &str = "user_id";
const KEY_APPS: &str = "apps";
const KEY_IS_ADMIN: &str = "is_admin";
const KEY_SERVER_URL: &str = "server_url";
const KEY_APP_ID: &str = "app_id";
const KEY_API_KEY: &str = "api_key";

/// JWT token claims for validation
#[derive(Debug, serde::Deserialize)]
struct TokenClaims {
    exp: i64,
    #[allow(dead_code)]
    iat: Option<i64>,
    #[allow(dead_code)]
    sub: Option<String>,
}

/// Check if a JWT token is expired
fn is_token_expired(token: &str) -> Result<bool, String> {
    let header = decode_header(token)
        .map_err(|e| format!("Failed to decode token header: {}", e))?;

    let mut validation = Validation::new(header.alg);
    validation.insecure_disable_signature_validation();
    validation.validate_exp = false;

    let token_data = decode::<TokenClaims>(
        token,
        &DecodingKey::from_secret(&[]),
        &validation,
    )
    .map_err(|e| format!("Failed to decode token: {}", e))?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("Failed to get current time: {}", e))?
        .as_secs() as i64;

    Ok(token_data.claims.exp < now)
}

/// Encryption helpers for secure token storage
mod crypto {
    use super::*;

    /// Get a device-unique identifier
    /// On desktop: uses machine-uid crate
    /// On Android: uses a hash of a stable identifier
    fn get_device_identifier() -> Result<String, String> {
        #[cfg(target_os = "android")]
        {
            // On Android, we use a combination of known stable values
            // Since we can't easily access Android's Settings.Secure.ANDROID_ID from Rust,
            // we use environment variables or fallback to a build-time constant
            // The app's data directory path is unique per app installation
            let android_id = std::env::var("ANDROID_DATA")
                .or_else(|_| std::env::var("EXTERNAL_STORAGE"))
                .unwrap_or_else(|_| "code-notes-android-device".to_string());

            // Hash it for consistency
            use sha2::{Sha256, Digest};
            let mut hasher = Sha256::new();
            hasher.update(android_id.as_bytes());
            hasher.update(b"code-notes-unique-salt");
            let result = hasher.finalize();
            Ok(hex::encode(result))
        }

        #[cfg(not(target_os = "android"))]
        {
            machine_uid::get()
                .map_err(|e| format!("Failed to get machine ID: {}", e))
        }
    }

    /// Derive a 32-byte encryption key from machine ID and app identifier
    /// This ensures each device has a unique encryption key
    fn derive_encryption_key() -> Result<[u8; 32], String> {
        // Get machine-specific identifier
        let machine_id = get_device_identifier()?;

        // Use app identifier as additional salt
        let app_salt = b"code-notes-auth-v1";

        // Combine machine ID with app salt
        let combined = format!("{}{}", machine_id, String::from_utf8_lossy(app_salt));

        // Use a fixed salt for derivation (since machine_id already provides uniqueness)
        let salt = SaltString::from_b64("Y29kZW5vdGVzc2FsdDEyMzQ1Njc4OTA")
            .map_err(|e| format!("Failed to create salt: {}", e))?;

        // Derive key using Argon2
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(combined.as_bytes(), &salt)
            .map_err(|e| format!("Failed to hash password: {}", e))?;

        // Extract the hash bytes (first 32 bytes)
        let hash_str = password_hash.hash.ok_or("No hash generated")?;
        let hash_bytes = hash_str.as_bytes();

        if hash_bytes.len() < 32 {
            return Err("Hash too short".to_string());
        }

        let mut key = [0u8; 32];
        key.copy_from_slice(&hash_bytes[..32]);
        Ok(key)
    }

    /// Encrypt a string value using ChaCha20Poly1305
    pub fn encrypt(plaintext: &str) -> Result<String, String> {
        let key_bytes = derive_encryption_key()?;
        let cipher = ChaCha20Poly1305::new_from_slice(&key_bytes)
            .map_err(|e| format!("Failed to create cipher: {}", e))?;

        // Generate a random nonce (12 bytes for ChaCha20Poly1305)
        let nonce_bytes: [u8; 12] = rand::random();
        let nonce = chacha20poly1305::Nonce::from(nonce_bytes);

        // Encrypt the plaintext
        let ciphertext = cipher
            .encrypt(&nonce, plaintext.as_bytes())
            .map_err(|e| format!("Encryption failed: {}", e))?;

        // Prepend nonce to ciphertext
        let mut result = Vec::with_capacity(nonce_bytes.len() + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);

        // Encode as base64 for storage
        Ok(BASE64.encode(&result))
    }

    /// Decrypt a string value using ChaCha20Poly1305
    pub fn decrypt(encrypted: &str) -> Result<String, String> {
        let key_bytes = derive_encryption_key()?;
        let cipher = ChaCha20Poly1305::new_from_slice(&key_bytes)
            .map_err(|e| format!("Failed to create cipher: {}", e))?;

        // Decode from base64
        let encrypted_bytes = BASE64
            .decode(encrypted)
            .map_err(|e| format!("Failed to decode base64: {}", e))?;

        if encrypted_bytes.len() < 12 {
            return Err("Encrypted data too short".to_string());
        }

        // Extract nonce (first 12 bytes) and ciphertext
        let (nonce_bytes, ciphertext) = encrypted_bytes.split_at(12);

        // Convert nonce bytes to array
        let mut nonce_array = [0u8; 12];
        nonce_array.copy_from_slice(nonce_bytes);
        let nonce = chacha20poly1305::Nonce::from(nonce_array);

        // Decrypt
        let plaintext_bytes = cipher
            .decrypt(&nonce, ciphertext)
            .map_err(|e| format!("Decryption failed: {}", e))?;

        // Convert to string
        String::from_utf8(plaintext_bytes)
            .map_err(|e| format!("Failed to convert decrypted data to string: {}", e))
    }
}

impl AuthService {
    /// Create a new AuthService
    pub fn new(server_url: String, default_app_id: String, default_api_key: String) -> Self {
        let config = SyncClientConfig::new(&server_url, &default_app_id, &default_api_key);
        let http = ReqwestHttpClient::new();
        let sync_client = QmSyncClient::new(config, http);

        Self {
            sync_client: Arc::new(RwLock::new(sync_client)),
            server_url,
            default_app_id,
            default_api_key,
        }
    }

    /// Register a new user
    pub async fn register(
        &self,
        app_handle: &tauri::AppHandle,
        username: String,
        email: String,
        password: String,
    ) -> Result<AuthResponse, String> {
        let app_id = self.default_app_id.clone();
        let api_key = self.default_api_key.clone();

        let client = self.sync_client.read().await;
        let result = client
            .register(&username, &email, &password)
            .await
            .map_err(|e| format!("Registration failed: {}", e))?;

        let auth_response = AuthResponse {
            user_id: result.user_id,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            apps: if result.apps.is_empty() { None } else { Some(result.apps) },
            is_admin: if result.is_admin { Some(true) } else { None },
        };

        self.store_auth_data(app_handle, &auth_response, &app_id, &api_key).await?;

        Ok(auth_response)
    }

    /// Login an existing user
    pub async fn login(
        &self,
        app_handle: &tauri::AppHandle,
        email: String,
        password: String,
    ) -> Result<AuthResponse, String> {
        let app_id = self.default_app_id.clone();
        let api_key = self.default_api_key.clone();

        let client = self.sync_client.read().await;
        let result = client
            .login(&email, &password)
            .await
            .map_err(|e| format!("Login failed: {}", e))?;

        let auth_response = AuthResponse {
            user_id: result.user_id,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            apps: if result.apps.is_empty() { None } else { Some(result.apps) },
            is_admin: if result.is_admin { Some(true) } else { None },
        };

        self.store_auth_data(app_handle, &auth_response, &app_id, &api_key).await?;

        Ok(auth_response)
    }

    /// Refresh the access token
    pub async fn refresh_token(
        &self,
        app_handle: &tauri::AppHandle,
    ) -> Result<(), String> {
        let refresh_token = self.get_refresh_token(app_handle).await?;
        let access_token = self.get_access_token(app_handle).await.unwrap_or_default();

        {
            let client = self.sync_client.read().await;
            client.set_tokens(access_token, refresh_token, None).await;
        }

        {
            let client = self.sync_client.read().await;
            client
                .refresh_token()
                .await
                .map_err(|e| format!("Token refresh failed: {}", e))?;
        }

        let (new_access, new_refresh) = {
            let client = self.sync_client.read().await;
            client.get_tokens().await
        };

        self.update_tokens_raw(
            app_handle,
            &new_access.ok_or_else(|| "No access token after refresh".to_string())?,
            &new_refresh.ok_or_else(|| "No refresh token after refresh".to_string())?,
        ).await?;

        Ok(())
    }

    /// Logout the current user
    pub async fn logout(&self, app_handle: &tauri::AppHandle) -> Result<(), String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        store.delete(KEY_ACCESS_TOKEN);
        store.delete(KEY_REFRESH_TOKEN);
        store.delete(KEY_USER_ID);
        store.delete(KEY_APPS);
        store.delete(KEY_IS_ADMIN);
        store.delete(KEY_APP_ID);
        store.delete(KEY_API_KEY);

        store.save().map_err(|e| format!("Failed to save store: {}", e))?;

        Ok(())
    }

    /// Get the stored access token (decrypts automatically)
    pub async fn get_access_token(&self, app_handle: &tauri::AppHandle) -> Result<String, String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        let encrypted = store
            .get(KEY_ACCESS_TOKEN)
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .ok_or_else(|| "No access token found".to_string())?;

        crypto::decrypt(&encrypted)
    }

    /// Get the stored refresh token (decrypts automatically)
    pub async fn get_refresh_token(
        &self,
        app_handle: &tauri::AppHandle,
    ) -> Result<String, String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        let encrypted = store
            .get(KEY_REFRESH_TOKEN)
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .ok_or_else(|| "No refresh token found".to_string())?;

        crypto::decrypt(&encrypted)
    }

    /// Get the stored API key (decrypts automatically)
    pub fn get_stored_api_key(&self, app_handle: &tauri::AppHandle) -> Result<String, String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        let encrypted = store
            .get(KEY_API_KEY)
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .ok_or_else(|| "No API key found".to_string())?;

        crypto::decrypt(&encrypted)
    }

    /// Check if the user is authenticated
    pub async fn is_authenticated(&self, app_handle: &tauri::AppHandle) -> bool {
        let token = match self.get_access_token(app_handle).await {
            Ok(t) => t,
            Err(_) => return false,
        };

        match is_token_expired(&token) {
            Ok(true) => {
                self.refresh_token(app_handle).await.is_ok()
            }
            Ok(false) => true,
            Err(_) => false,
        }
    }

    /// Get the current authentication status
    /// Automatically attempts to refresh if token is expired
    pub async fn get_auth_status(&self, app_handle: &tauri::AppHandle) -> AuthStatus {
        let store = match app_handle.store(STORE_FILE) {
            Ok(s) => s,
            Err(_) => {
                return AuthStatus {
                    is_authenticated: false,
                    user_id: None,
                    apps: None,
                    is_admin: None,
                    server_url: Some(self.server_url.clone()),
                }
            }
        };

        // Get encrypted token from store
        let encrypted_token = store
            .get(KEY_ACCESS_TOKEN)
            .and_then(|v| v.as_str().map(|s| s.to_string()));

        if encrypted_token.is_none() {
            return AuthStatus {
                is_authenticated: false,
                user_id: None,
                apps: None,
                is_admin: None,
                server_url: Some(self.server_url.clone()),
            };
        }

        // Decrypt token to check expiration
        let access_token = match crypto::decrypt(&encrypted_token.unwrap()) {
            Ok(token) => token,
            Err(_) => {
                return AuthStatus {
                    is_authenticated: false,
                    user_id: None,
                    apps: None,
                    is_admin: None,
                    server_url: Some(self.server_url.clone()),
                }
            }
        };

        // Check if token is expired
        let is_expired = is_token_expired(&access_token).unwrap_or(true);
        if is_expired {
            // Try to refresh token
            if self.refresh_token(app_handle).await.is_err() {
                // Refresh failed, return unauthenticated status
                return AuthStatus {
                    is_authenticated: false,
                    user_id: None,
                    apps: None,
                    is_admin: None,
                    server_url: Some(self.server_url.clone()),
                };
            }
            // Token refreshed successfully, continue with status check
        }

        let user_id = store
            .get(KEY_USER_ID)
            .and_then(|v| v.as_str().map(|s| s.to_string()));

        let apps = store.get(KEY_APPS).and_then(|v| {
            v.as_array()
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        });

        let is_admin = store.get(KEY_IS_ADMIN).and_then(|v| v.as_bool());

        AuthStatus {
            is_authenticated: true,
            user_id,
            apps,
            is_admin,
            server_url: Some(self.server_url.clone()),
        }
    }

    /// Store authentication data securely (with encryption for sensitive fields)
    async fn store_auth_data(
        &self,
        app_handle: &tauri::AppHandle,
        auth_response: &AuthResponse,
        app_id: &str,
        api_key: &str,
    ) -> Result<(), String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        // Encrypt sensitive tokens before storing
        let encrypted_access_token = crypto::encrypt(&auth_response.access_token)?;
        let encrypted_refresh_token = crypto::encrypt(&auth_response.refresh_token)?;
        let encrypted_api_key = crypto::encrypt(api_key)?;

        store.set(KEY_ACCESS_TOKEN, serde_json::json!(encrypted_access_token));
        store.set(KEY_REFRESH_TOKEN, serde_json::json!(encrypted_refresh_token));
        store.set(KEY_USER_ID, serde_json::json!(&auth_response.user_id));
        store.set(KEY_SERVER_URL, serde_json::json!(&self.server_url));
        store.set(KEY_APP_ID, serde_json::json!(app_id));
        store.set(KEY_API_KEY, serde_json::json!(encrypted_api_key));

        if let Some(apps) = &auth_response.apps {
            store.set(KEY_APPS, serde_json::json!(apps));
        }

        if let Some(is_admin) = auth_response.is_admin {
            store.set(KEY_IS_ADMIN, serde_json::json!(is_admin));
        }

        store.save().map_err(|e| format!("Failed to save store: {}", e))?;

        Ok(())
    }

    /// Update stored tokens with raw string values (with encryption)
    async fn update_tokens_raw(
        &self,
        app_handle: &tauri::AppHandle,
        access_token: &str,
        refresh_token: &str,
    ) -> Result<(), String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        // Encrypt tokens before storing
        let encrypted_access_token = crypto::encrypt(access_token)?;
        let encrypted_refresh_token = crypto::encrypt(refresh_token)?;

        store.set(KEY_ACCESS_TOKEN, serde_json::json!(encrypted_access_token));
        store.set(KEY_REFRESH_TOKEN, serde_json::json!(encrypted_refresh_token));

        store.save().map_err(|e| format!("Failed to save store: {}", e))?;

        Ok(())
    }

    /// Update the server URL (recreates the underlying QmSyncClient)
    pub async fn set_server_url(&self, server_url: String) {
        let config = SyncClientConfig::new(&server_url, &self.default_app_id, &self.default_api_key);
        let http = ReqwestHttpClient::new();
        let new_client = QmSyncClient::new(config, http);

        let mut client = self.sync_client.write().await;
        *client = new_client;
    }

    /// Configure sync settings (server URL, app ID, API key)
    /// All parameters are optional and will use defaults from environment if not provided
    pub async fn configure_sync(
        &self,
        app_handle: &tauri::AppHandle,
        server_url: Option<String>,
        app_id: Option<String>,
        api_key: Option<String>,
    ) -> Result<(), String> {
        // Use provided values or fall back to current/default values
        let new_server_url = server_url.unwrap_or_else(|| self.server_url.clone());
        let app_id = app_id.unwrap_or_else(|| self.default_app_id.clone());
        let api_key = api_key.unwrap_or_else(|| self.default_api_key.clone());

        // Update the underlying QmSyncClient with new server URL
        self.set_server_url(new_server_url.clone()).await;

        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        // Encrypt API key before storing
        let encrypted_api_key = crypto::encrypt(&api_key)?;

        store.set(KEY_SERVER_URL, serde_json::json!(new_server_url));
        store.set(KEY_APP_ID, serde_json::json!(app_id));
        store.set(KEY_API_KEY, serde_json::json!(encrypted_api_key));

        store
            .save()
            .map_err(|e| format!("Failed to save store: {}", e))?;

        Ok(())
    }

    /// Get the underlying QmSyncClient for direct sync operations
    /// This allows reuse of the authenticated client for push/pull/delta operations
    pub fn sync_client(&self) -> Arc<RwLock<QmSyncClient<ReqwestHttpClient>>> {
        Arc::clone(&self.sync_client)
    }
}
