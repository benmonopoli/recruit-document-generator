import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { validatePassword, getPasswordRequirementsText } from "@/lib/passwordValidation";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Loader2, 
  Settings, 
  Palette, 
  FileText, 
  User,
  Sun,
  Moon,
  Monitor,
  Lock,
  Database,
  RefreshCw,
  LogOut
} from "lucide-react";
import { fetchGreenhouseJobs } from "@/lib/ai";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TONE_PRESETS = [
  { value: "company-standard", label: "Company Standard" },
  { value: "formal-corporate", label: "Formal Corporate" },
  { value: "startup-casual", label: "Startup Casual" },
  { value: "technical", label: "Technical Focus" },
];

const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Marketing",
  "Sales",
  "Customer Support",
  "Design",
  "Data",
  "Operations",
  "HR",
];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { settings, loading, updateSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [refreshingJobs, setRefreshingJobs] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  const fetchLastRefreshTime = async () => {
    const { data } = await supabase
      .from("greenhouse_jobs_cache")
      .select("cached_at")
      .order("cached_at", { ascending: false })
      .limit(1)
      .single();
    
    if (data?.cached_at) {
      setLastRefreshed(data.cached_at);
    }
  };

  useEffect(() => {
    fetchLastRefreshTime();
  }, []);

  const handleRefreshJobs = async () => {
    setRefreshingJobs(true);
    try {
      await fetchGreenhouseJobs(true);
      await fetchLastRefreshTime();
      toast.success("Job description database refreshed");
    } catch (error) {
      toast.error("Failed to refresh job database");
    } finally {
      setRefreshingJobs(false);
    }
  };

  const handleSave = async (updates: Parameters<typeof updateSettings>[0]) => {
    setSaving(true);
    try {
      await updateSettings(updates);
      toast.success("Settings saved");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const passwordValidation = validatePassword(passwordForm.newPassword);
    if (!passwordValidation.valid) {
      toast.error(passwordValidation.error || "Invalid password");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setShowPasswordDialog(false);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage your preferences and account</p>
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize how the app looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Theme</Label>
              <RadioGroup
                value={settings?.theme || "system"}
                onValueChange={(value) => handleSave({ theme: value as "light" | "dark" | "system" })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
                    <Sun className="h-4 w-4" />
                    Light
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
                    <Moon className="h-4 w-4" />
                    Dark
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="system" id="system" />
                  <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer">
                    <Monitor className="h-4 w-4" />
                    System
                  </Label>
                </div>
              </RadioGroup>
            </div>

          </CardContent>
        </Card>

        {/* Content Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Defaults
            </CardTitle>
            <CardDescription>Set defaults for new projects and documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Default Tone Preset</Label>
              <Select
                value={settings?.default_tone_preset || "company-standard"}
                onValueChange={(value) => handleSave({ default_tone_preset: value })}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Preferred Writing Style</Label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-16">Formal</span>
                <Slider
                  value={[settings?.preferred_writing_style || 50]}
                  onValueChange={([value]) => handleSave({ preferred_writing_style: value })}
                  max={100}
                  step={10}
                  className="flex-1 max-w-xs"
                />
                <span className="text-sm text-muted-foreground w-16">Casual</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Default Department</Label>
              <Select
                value={settings?.default_department || "none"}
                onValueChange={(value) => handleSave({ default_department: value === "none" ? null : value })}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="No default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No default</SelectItem>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data
            </CardTitle>
            <CardDescription>Manage application data and caches</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Job Description Database</Label>
              <p className="text-sm text-muted-foreground">
                Refresh the cached job descriptions from Greenhouse
              </p>
              {lastRefreshed && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {new Date(lastRefreshed).toLocaleString()}
                </p>
              )}
              <Button 
                variant="outline" 
                onClick={handleRefreshJobs}
                disabled={refreshingJobs}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshingJobs ? "animate-spin" : ""}`} />
                {refreshingJobs ? "Refreshing..." : "Refresh Job Database"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="max-w-xs bg-muted"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Password</Label>
              <p className="text-sm text-muted-foreground">Update your account password</p>
              <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Sign Out</Label>
              <p className="text-sm text-muted-foreground">Sign out of your account</p>
              <Button variant="outline" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password Change Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your new password below
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder={getPasswordRequirementsText()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Confirm your password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}