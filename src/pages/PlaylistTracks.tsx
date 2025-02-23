
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { createYouTubePlaylist } from "@/utils/youtube";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PlaylistTracks = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tracks, setTracks] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Initialize tracks from location state or sessionStorage
  useEffect(() => {
    if (location.state?.tracks) {
      setTracks(location.state.tracks);
      sessionStorage.setItem('playlist_tracks', JSON.stringify(location.state.tracks));
    } else {
      const storedTracks = sessionStorage.getItem('playlist_tracks');
      if (storedTracks) {
        setTracks(JSON.parse(storedTracks));
      } else {
        navigate('/');
      }
    }
  }, [location.state, navigate]);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = sessionStorage.getItem('youtube_oauth_state');

    if (code && state === storedState && !isCreating) {
      const createPlaylist = async () => {
        setIsCreating(true);
        try {
          toast({
            title: "Creating playlist",
            description: "Please wait while we create your YouTube playlist...",
          });

          const playlistId = await createYouTubePlaylist(tracks);
          
          toast({
            title: "Success!",
            description: "YouTube playlist has been created successfully.",
          });

          // Clean up
          sessionStorage.removeItem('youtube_oauth_state');
          sessionStorage.removeItem('playlist_tracks');
          
          // Open the created playlist in a new tab
          window.open(`https://www.youtube.com/playlist?list=${playlistId}`, '_blank');
          
          // Navigate back to home
          navigate('/', { replace: true });
        } catch (error) {
          console.error('Error creating playlist:', error);
          toast({
            title: "Error",
            description: "Failed to create YouTube playlist. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsCreating(false);
        }
      };

      createPlaylist();
    }
  }, [location.search, tracks, navigate, toast, isCreating]);

  const handleCreateYouTubePlaylist = async () => {
    try {
      const { data: secretData, error: secretError } = await supabase
        .functions.invoke('get-secret', {
          body: { secretName: 'GOOGLE_CLIENT_ID' }
        });

      if (secretError || !secretData?.secret) {
        throw new Error('Failed to get Google Client ID');
      }

      const clientId = secretData.secret;
      
      // For local development
      let redirectUri = 'http://localhost:5173/playlist-tracks';
      // For production preview
      if (window.location.hostname !== 'localhost') {
        redirectUri = 'https://preview--playlist-swapper.lovable.app/playlist-tracks';
      }

      const scope = 'https://www.googleapis.com/auth/youtube.force-ssl';
      const state = Math.random().toString(36).substring(7);
      sessionStorage.setItem('youtube_oauth_state', state);
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}&access_type=offline`;
      
      // Open in a new tab instead of current window
      window.open(authUrl, '_blank');
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to start YouTube authorization. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!tracks || tracks.length === 0) {
    return null;
  }

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
              disabled={isCreating}
            >
              {isCreating ? "Creating Playlist..." : "Create YouTube Playlist"}
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
