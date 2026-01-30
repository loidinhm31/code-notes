use qm_sync_client::{ReqwestHttpClient, QmSyncClient, SyncClientConfig};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri_plugin_store::StoreExt;
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

    /// Get the stored access token
    pub async fn get_access_token(&self, app_handle: &tauri::AppHandle) -> Result<String, String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        store
            .get(KEY_ACCESS_TOKEN)
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .ok_or_else(|| "No access token found".to_string())
    }

    /// Get the stored refresh token
    pub async fn get_refresh_token(
        &self,
        app_handle: &tauri::AppHandle,
    ) -> Result<String, String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        store
            .get(KEY_REFRESH_TOKEN)
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .ok_or_else(|| "No refresh token found".to_string())
    }

    /// Get the stored API key
    pub fn get_stored_api_key(&self, app_handle: &tauri::AppHandle) -> Result<String, String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        store
            .get(KEY_API_KEY)
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .ok_or_else(|| "No API key found".to_string())
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

        let token = store
            .get(KEY_ACCESS_TOKEN)
            .and_then(|v| v.as_str().map(|s| s.to_string()));

        if token.is_none() {
            return AuthStatus {
                is_authenticated: false,
                user_id: None,
                apps: None,
                is_admin: None,
                server_url: Some(self.server_url.clone()),
            };
        }

        let is_expired = is_token_expired(&token.unwrap()).unwrap_or(true);
        if is_expired {
            if self.refresh_token(app_handle).await.is_err() {
                return AuthStatus {
                    is_authenticated: false,
                    user_id: None,
                    apps: None,
                    is_admin: None,
                    server_url: Some(self.server_url.clone()),
                };
            }
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

    /// Store authentication data
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

        store.set(KEY_ACCESS_TOKEN, serde_json::json!(&auth_response.access_token));
        store.set(KEY_REFRESH_TOKEN, serde_json::json!(&auth_response.refresh_token));
        store.set(KEY_USER_ID, serde_json::json!(&auth_response.user_id));
        store.set(KEY_SERVER_URL, serde_json::json!(&self.server_url));
        store.set(KEY_APP_ID, serde_json::json!(app_id));
        store.set(KEY_API_KEY, serde_json::json!(api_key));

        if let Some(apps) = &auth_response.apps {
            store.set(KEY_APPS, serde_json::json!(apps));
        }

        if let Some(is_admin) = auth_response.is_admin {
            store.set(KEY_IS_ADMIN, serde_json::json!(is_admin));
        }

        store.save().map_err(|e| format!("Failed to save store: {}", e))?;

        Ok(())
    }

    /// Update stored tokens
    async fn update_tokens_raw(
        &self,
        app_handle: &tauri::AppHandle,
        access_token: &str,
        refresh_token: &str,
    ) -> Result<(), String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        store.set(KEY_ACCESS_TOKEN, serde_json::json!(access_token));
        store.set(KEY_REFRESH_TOKEN, serde_json::json!(refresh_token));

        store.save().map_err(|e| format!("Failed to save store: {}", e))?;

        Ok(())
    }
}
