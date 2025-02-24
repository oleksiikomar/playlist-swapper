
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { createYouTubePlaylist } from "@/utils/youtube";
import { initiateYouTubeAuth, handleYouTubeCallback } from "@/utils/youtube-auth";
import { useToast } from "@/hooks/use-toast";

const PlaylistTracks = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tracks, setTracks] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState<string>('');

  // Initialize tracks and playlist title from location state or sessionStorage
  useEffect(() => {
    if (location.state?.tracks) {
      setTracks(location.state.tracks);
      setPlaylistTitle(location.state.playlistTitle || 'Spotify Playlist');
      sessionStorage.setItem('playlist_tracks', JSON.stringify(location.state.tracks));
      sessionStorage.setItem('playlist_title', location.state.playlistTitle || 'Spotify Playlist');
    } else {
      const storedTracks = sessionStorage.getItem('playlist_tracks');
      const storedTitle = sessionStorage.getItem('playlist_title');
      if (storedTracks) {
        setTracks(JSON.parse(storedTracks));
        setPlaylistTitle(storedTitle || 'Spotify Playlist');
      } else {
        navigate('/');
      }
    }
  }, [location.state, navigate]);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    if (code && state) {
      const storedState = sessionStorage.getItem('youtube_oauth_state');
      if (state !== storedState) {
        toast({
          title: "Error",
          description: "Invalid OAuth state",
          variant: "destructive",
        });
        return;
      }

      handleYouTubeCallback(code)
        .then(async (refreshToken) => {
          // Save refresh token to Supabase secrets
          const { error } = await supabase.functions.invoke('set-secret', {
            body: { 
              secretName: 'GOOGLE_REFRESH_TOKEN',
              secretValue: refreshToken
            }
          });

          if (error) {
            throw error;
          }

          toast({
            title: "Success",
            description: "YouTube authentication completed!",
          });

          // Clean up
          sessionStorage.removeItem('youtube_oauth_state');
          
          // Remove code from URL
          window.history.replaceState({}, document.title, "/playlist-tracks");
          
          // Try creating playlist now that we're authenticated
          await handleCreateYouTubePlaylist();
        })
        .catch((error) => {
          console.error('Error handling callback:', error);
          toast({
            title: "Error",
            description: "Failed to complete YouTube authentication",
            variant: "destructive",
          });
        });
    }
  }, [location.search]);

  const handleCreateYouTubePlaylist = async () => {
    setIsCreating(true);
    try {
      toast({
        title: "Creating playlist",
        description: "Please wait while we create your YouTube playlist...",
      });

      const playlistId = await createYouTubePlaylist(tracks, playlistTitle);
      
      toast({
        title: "Success!",
        description: "YouTube playlist has been created successfully.",
      });

      // Clean up
      sessionStorage.removeItem('playlist_tracks');
      sessionStorage.removeItem('playlist_title');
      
      // Open the created playlist in a new tab
      window.open(`https://www.youtube.com/playlist?list=${playlistId}`, '_blank');
      
      // Navigate back to home
      navigate('/', { replace: true });
    } catch (error: any) {
      console.error('Error creating playlist:', error);
      
      if (error.message.includes('Failed to get YouTube authentication token')) {
        // Start OAuth flow
        await initiateYouTubeAuth();
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to create YouTube playlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
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
            <h2 className="text-2xl font-bold">{playlistTitle}</h2>
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
