import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, AlertCircle, CheckCircle } from "lucide-react";
import logoImage from "@/assets/logo.png";
import { validatePassword, getPasswordRequirementsText } from "@/lib/passwordValidation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has a valid session from the reset link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      }
    });

    // Listen for auth state changes (password recovery event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setHasSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || "Invalid password");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    }

    setLoading(false);
  };

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logoImage} alt="Logo" className="h-16 w-16 rounded-lg" />
            </div>
            <CardTitle>Invalid or Expired Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Back to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logoImage} alt="Logo" className="h-16 w-16 rounded-lg" />
          </div>
          <h1 className="text-xl font-semibold">Set New Password</h1>
          <p className="text-muted-foreground">Enter your new password below</p>
        </div>

        <Card>
          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4 pt-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-500 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Password updated successfully! Redirecting...
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={getPasswordRequirementsText()}
                    className="pl-9"
                    minLength={12}
                    required
                    disabled={success}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="pl-9"
                    minLength={12}
                    required
                    disabled={success}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading || success}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Password
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}