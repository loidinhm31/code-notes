import React, { useState } from "react";
import { Lock, Mail, ShieldCheck, User, KeyRound } from "lucide-react";
import { getAuthService } from "@code-notes/ui/adapters/factory";
import { Button, Input, Label } from "@code-notes/ui/components/atoms";

interface LoginPageProps {
  onLoginSuccess: () => void;
  onSkip?: () => void;
}

type FormMode = "login" | "register";

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onSkip,
}) => {
  const [mode, setMode] = useState<FormMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await getAuthService().login(loginEmail, loginPassword);
      onLoginSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (registerPassword !== registerConfirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (registerPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!registerUsername || !registerEmail) {
      setError("All fields are required");
      return;
    }

    setIsLoading(true);

    try {
      await getAuthService().register(
        registerUsername,
        registerEmail,
        registerPassword,
      );
      onLoginSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-background">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-primary/20">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold mb-2 text-foreground">
            Code Notes
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in to sync your notes across devices
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl p-6 border border-border bg-card">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6 p-1 rounded-lg bg-muted">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all ${
                mode === "login"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all ${
                mode === "register"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Register
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm border border-destructive/30 bg-destructive/10 text-destructive">
              {error}
            </div>
          )}

          {/* Login Form */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </div>
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="your@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="login-password">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </div>
                </Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-6"
                disabled={isLoading || !loginEmail || !loginPassword}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          )}

          {/* Registration Form */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="register-username">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Username
                  </div>
                </Label>
                <Input
                  id="register-username"
                  type="text"
                  placeholder="johndoe"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="register-email">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </div>
                </Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="your@email.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="register-password">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </div>
                </Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="••••••••"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={8}
                />
                <p className="text-xs mt-1 text-muted-foreground">
                  At least 8 characters
                </p>
              </div>

              <div>
                <Label htmlFor="register-confirm-password">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    Confirm Password
                  </div>
                </Label>
                <Input
                  id="register-confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-6"
                disabled={
                  isLoading ||
                  !registerUsername ||
                  !registerEmail ||
                  !registerPassword ||
                  !registerConfirmPassword
                }
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          )}

          {/* Skip Option */}
          {onSkip && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={onSkip}
                className="text-sm font-medium hover:underline transition-colors text-muted-foreground"
                disabled={isLoading}
              >
                Skip for now (Local only)
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-6 text-muted-foreground">
          Your data is encrypted and secure
        </p>
      </div>
    </div>
  );
};
