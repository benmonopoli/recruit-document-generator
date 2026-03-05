import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Lock, AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import logoImage from "@/assets/logo.png";
import { validatePassword, getPasswordRequirementsText } from "@/lib/passwordValidation";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const allowedDomain = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN; if (allowedDomain && !email.toLowerCase().endsWith(`@${allowedDomain}`)) {
      setError(`Only @${import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || 'your company domain'} email addresses are allowed`);
      setLoading(false);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || "Invalid password");
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password);
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Account created! You can now sign in.");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!email) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Password reset link sent! Check your email.");
    }
    setLoading(false);
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src={logoImage} alt="RDG Logo" className="h-16 w-16 rounded-lg" />
            </div>
            <h1 className="text-2xl font-semibold">Reset Password</h1>
            <p className="text-lg text-muted-foreground">Enter your email to receive a reset link</p>
          </div>

          <Card>
            <form onSubmit={handleForgotPassword}>
              <CardContent className="space-y-4 pt-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-500 text-green-600">
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@yourcompany.com"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send Reset Link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logoImage} alt="RDG Logo" className="h-16 w-16 rounded-lg" />
          </div>
          <h1 className="text-2xl font-semibold">Recruit Document Generation</h1>
          <p className="text-lg text-muted-foreground">AI-powered recruiting documents</p>
        </div>

        <Card>
          <Tabs defaultValue="signin">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <CardDescription className="text-lg">
                    Sign in with your work email to continue.
                  </CardDescription>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@yourcompany.com"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                  <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Sign In
                  </Button>
                  
                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-sm uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={loading || googleLoading}
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    Continue with Google
                  </Button>
                  
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot your password?
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <CardDescription className="text-lg">
                    Create an account with your work email.
                  </CardDescription>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="border-success text-success">
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@yourcompany.com"
                        className="pl-9"
                        required
                      />
                    </div>
                    <p className="text-base text-muted-foreground">
                      Only work emails are allowed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      placeholder={getPasswordRequirementsText()}
                        className="pl-9"
                        minLength={12}
                        required
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Account
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
