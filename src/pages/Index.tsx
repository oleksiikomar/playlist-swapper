
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { extractPlaylistId, fetchPlaylistTracks } from "@/utils/spotify";

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const playlistId = extractPlaylistId(playlistUrl);
    
    if (!playlistId) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Spotify playlist URL",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchPlaylistTracks(playlistId);
      navigate("/playlist-tracks", { state: { tracks: data.items || [] } });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch playlist. Make sure the playlist is public.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container px-4 py-16 mx-auto animate-fadeIn">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 text-sm font-medium bg-accent text-accent-foreground rounded-full mb-4">
            Beta
          </span>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
            PlaylistConverter
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Convert your Spotify playlists to YouTube Music with just a few clicks.
            Simple, fast, and reliable.
          </p>
        </div>

        <Card className="max-w-md mx-auto backdrop-blur-sm bg-card/80 p-6 rounded-xl shadow-lg border border-border/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="url"
              placeholder="Paste your Spotify playlist URL"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              className="w-full bg-background/50"
            />
            <Button
              type="submit"
              className="w-full"
              disabled={!playlistUrl || isLoading}
            >
              {isLoading ? "Loading Playlist..." : "Load Playlist"}
            </Button>
          </form>
        </Card>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            By using this service, you agree to our Terms of Service and Privacy
            Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
