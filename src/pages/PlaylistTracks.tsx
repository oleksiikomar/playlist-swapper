
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { createYouTubePlaylist } from "@/utils/youtube";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PlaylistTracks = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const tracks = location.state?.tracks || [];

  const handleCreateYouTubePlaylist = async () => {
    try {
      const clientId = 'YOUR_GOOGLE_CLIENT_ID'; // We'll need to get this from Supabase secrets
      const redirectUri = window.location.origin + '/playlist-tracks';
      const scope = 'https://www.googleapis.com/auth/youtube.force-ssl';
      
      // Generate random state
      const state = Math.random().toString(36).substring(7);
      sessionStorage.setItem('youtube_oauth_state', state);
      
      // Redirect to Google OAuth consent screen
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}&access_type=offline`;
      
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to start YouTube authorization. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = sessionStorage.getItem('youtube_oauth_state');

    if (code && state === storedState) {
      // Clear state
      sessionStorage.removeItem('youtube_oauth_state');

      // Exchange code for access token
      const exchangeCode = async () => {
        try {
          toast({
            title: "Creating YouTube playlist",
            description: "Please wait while we create your playlist...",
          });

          const response = await supabase.functions.invoke('youtube-auth', {
            body: { code }
          });

          if (response.error) {
            throw new Error(response.error);
          }

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

      exchangeCode();
    }
  }, [tracks, toast]);

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
