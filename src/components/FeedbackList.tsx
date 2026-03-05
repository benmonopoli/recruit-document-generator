import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Star, 
  Check, 
  Trash2, 
  ExternalLink,
  RefreshCw,
  Loader2,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Feedback {
  id: string;
  user_id: string;
  category: string;
  rating: number | null;
  message: string;
  page_url: string | null;
  is_read: boolean;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  improvement: "Improvement",
  content: "Content Quality",
  other: "Other",
};

const categoryColors: Record<string, string> = {
  bug: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  feature: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  improvement: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  content: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

interface FeedbackListProps {
  onUnreadCountChange?: (count: number) => void;
}

export function FeedbackList({ onUnreadCountChange }: FeedbackListProps) {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeedback(data || []);
      
      const unreadCount = (data || []).filter(f => !f.is_read).length;
      onUnreadCountChange?.(unreadCount);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast.error("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("feedback")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
      
      setFeedback(prev => 
        prev.map(f => f.id === id ? { ...f, is_read: true } : f)
      );
      
      const unreadCount = feedback.filter(f => !f.is_read && f.id !== id).length;
      onUnreadCountChange?.(unreadCount);
    } catch (error) {
      console.error("Error marking as read:", error);
      toast.error("Failed to update feedback");
    }
  };

  const deleteFeedback = async (id: string) => {
    try {
      const { error } = await supabase
        .from("feedback")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      const removed = feedback.find(f => f.id === id);
      setFeedback(prev => prev.filter(f => f.id !== id));
      
      if (removed && !removed.is_read) {
        const unreadCount = feedback.filter(f => !f.is_read && f.id !== id).length;
        onUnreadCountChange?.(unreadCount);
      }
      
      toast.success("Feedback deleted");
    } catch (error) {
      console.error("Error deleting feedback:", error);
      toast.error("Failed to delete feedback");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 5) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredFeedback = filter === "unread" 
    ? feedback.filter(f => !f.is_read) 
    : feedback;

  const unreadCount = feedback.filter(f => !f.is_read).length;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            User Feedback
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              <Button
                variant={filter === "all" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => setFilter("all")}
              >
                All ({feedback.length})
              </Button>
              <Button
                variant={filter === "unread" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setFilter("unread")}
              >
                Unread ({unreadCount})
              </Button>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchFeedback}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredFeedback.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {filter === "unread" ? "No unread feedback" : "No feedback yet"}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredFeedback.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "p-4 rounded-lg border transition-colors",
                  !item.is_read && "bg-accent/50 border-primary/20"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={categoryColors[item.category] || categoryColors.other}>
                        {categoryLabels[item.category] || item.category}
                      </Badge>
                      {item.rating && (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "h-3.5 w-3.5",
                                star <= item.rating!
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-muted-foreground/30"
                              )}
                            />
                          ))}
                        </div>
                      )}
                      {!item.is_read && (
                        <Badge variant="outline" className="text-xs">New</Badge>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap mb-2">{item.message}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(item.created_at)}
                      </span>
                      {item.page_url && (
                        <a
                          href={item.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View page
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!item.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => markAsRead(item.id)}
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete feedback?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteFeedback(item.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
