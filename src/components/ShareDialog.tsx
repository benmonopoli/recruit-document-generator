import { useState, useEffect } from "react";
import { Share2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { searchUsersByEmail, shareDocument } from "@/lib/sharing";
import type { RegisteredUser } from "@/types";

interface ShareDialogProps {
  documentType: string;
  title: string;
  content: string;
  sourceProjectId?: string;
  trigger?: React.ReactNode;
}

export function ShareDialog({ 
  documentType, 
  title, 
  content, 
  sourceProjectId,
  trigger 
}: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<RegisteredUser[]>([]);
  const [sharing, setSharing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RegisteredUser | null>(null);

  // Debounced search as user types
  useEffect(() => {
    if (searchEmail.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setSearching(true);
      try {
        const users = await searchUsersByEmail(searchEmail);
        setSearchResults(users);
        setSelectedUser(null);
      } catch (error) {
        console.error("Failed to search users:", error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchEmail]);

  const handleShare = async () => {
    if (!selectedUser) {
      toast.error("Please select a recipient");
      return;
    }

    setSharing(true);
    try {
      await shareDocument(
        selectedUser.id,
        documentType,
        title,
        content,
        sourceProjectId
      );
      toast.success(`Shared with ${selectedUser.email}`);
      setOpen(false);
      setSearchEmail("");
      setSearchResults([]);
      setSelectedUser(null);
    } catch (error) {
      toast.error("Failed to share document");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>
            Send this document to a colleague's inbox. They can view and clone it to their own projects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document preview */}
          <div className="p-3 rounded-md bg-muted/50">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground capitalize">{documentType.replace(/_/g, " ")}</p>
          </div>

          {/* User search */}
          <div className="space-y-3">
            <div className="relative">
              <Input
                placeholder="Start typing email to search..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
              {searching && (
                <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
            {searchEmail.length > 0 && searchEmail.length < 3 && (
              <p className="text-xs text-muted-foreground">Type at least 3 characters to search</p>
            )}

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors ${
                      selectedUser?.id === user.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <span className="text-sm">{user.email}</span>
                    {selectedUser?.id === user.id && (
                      <span className="text-xs text-primary">Selected</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Share button */}
            {selectedUser && (
              <Button 
                className="w-full gap-2" 
                onClick={handleShare}
                disabled={sharing}
              >
                {sharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send to {selectedUser.email}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
