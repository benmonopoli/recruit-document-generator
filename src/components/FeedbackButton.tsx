import { useState } from "react";
import { MessageSquarePlus, Send, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const categories = [
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "improvement", label: "Improvement" },
  { value: "content", label: "Content Quality" },
  { value: "other", label: "Other" },
];

export function FeedbackButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");

  const resetForm = () => {
    setCategory("");
    setRating(0);
    setHoverRating(0);
    setMessage("");
  };

  const handleSubmit = async () => {
    if (!category || !message.trim()) {
      toast.error("Please select a category and enter your feedback");
      return;
    }

    setSubmitting(true);
    try {
      if (!user?.id) {
        toast.error("You must be logged in to submit feedback");
        return;
      }

      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        category,
        rating: rating || null,
        message: message.trim(),
        page_url: window.location.href,
      });

      if (error) throw error;

      toast.success("Thank you for your feedback!");
      resetForm();
      setOpen(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          <MessageSquarePlus className="h-4 w-4 mr-3" />
          Give Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve by sharing your thoughts, reporting bugs, or suggesting features.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Rating (optional)</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={cn(
                      "h-6 w-6 transition-colors",
                      (hoverRating || rating) >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/40"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Your Feedback</Label>
            <Textarea
              id="message"
              placeholder="Tell us what's on your mind..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/1000
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Feedback
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
