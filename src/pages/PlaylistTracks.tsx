
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { createYouTubePlaylist } from "@/utils/youtube";
import { useToast } from "@/hooks/use-toast";

const PlaylistTracks = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const tracks = location.state?.tracks || [];

  const handleCreateYouTubePlaylist = async () => {
    try {
      toast({
        title: "Creating YouTube playlist",
        description: "Please wait while we create your playlist...",
      });

      const playlistId = await createYouTubePlaylist(tracks);
      
      toast({
        title: "Success!",
        description: "YouTube playlist has been created.",
        variant: "default",
      });

      // Open the created playlist in a new tab
      window.open(`https://www.youtube.com/playlist?list=${playlistId}`, '_blank');
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to create YouTube playlist. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container px-4 py-16 mx-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="mb-4"
            >
              ← Back
            </Button>
            <Button
              onClick={handleCreateYouTubePlaylist}
              className="bg-youtube hover:bg-youtube/90 text-white"
            >
              Create YouTube Playlist
            </Button>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Playlist Tracks</h2>
            <div className="space-y-2">
              {tracks.map((track: any, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-medium">{track.track?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {track.track?.artists?.map((artist: any) => artist.name).join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistTracks;
