
import { supabase } from "@/integrations/supabase/client";

export const createYouTubePlaylist = async (tracks: any[], spotifyPlaylistTitle: string) => {
  try {
    // Get access token from our edge function
    const { data: authData, error: authError } = await supabase
      .functions.invoke('youtube-auth');

    if (authError || !authData?.accessToken) {
      // Try using session storage token as fallback
      const refreshToken = sessionStorage.getItem('youtube_refresh_token');
      if (!refreshToken) {
        throw new Error('Failed to get YouTube authentication token');
      }

      // Call auth function with refresh token
      const { data: retryData, error: retryError } = await supabase
        .functions.invoke('youtube-auth', {
          body: { refreshToken }
        });

      if (retryError || !retryData?.accessToken) {
        throw new Error('Failed to get YouTube authentication token');
      }

      authData = retryData;
    }

    const accessToken = authData.accessToken;

    // Get YouTube API key for search operations
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .functions.invoke('get-secret', {
        body: { secretName: 'YOUTUBE_API_KEY' }
      });

    if (apiKeyError || !apiKeyData?.secret) {
      throw new Error('Failed to get YouTube API key');
    }

    const apiKey = apiKeyData.secret;

    // Create the playlist using OAuth token
    const playlistResponse = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          title: `${spotifyPlaylistTitle} - Imported from Spotify`,
          description: 'Playlist imported from Spotify using Playlist Converter',
        }
      })
    });

    if (!playlistResponse.ok) {
      const errorData = await playlistResponse.json();
      console.error('YouTube API Error:', errorData);
      throw new Error(`Failed to create YouTube playlist: ${errorData.error?.message || 'Unknown error'}`);
    }

    const playlist = await playlistResponse.json();

    // Add tracks to the playlist
    for (const track of tracks) {
      const searchQuery = `${track.track.name} ${track.track.artists[0].name}`;
      // Use API key for search operations
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&key=${apiKey}`
      );

      if (!searchResponse.ok) {
        console.error(`Failed to search for track: ${searchQuery}`);
        continue;
      }

      const searchResult = await searchResponse.json();
      if (searchResult.items && searchResult.items.length > 0) {
        const videoId = searchResult.items[0].id.videoId;
        
        // Use OAuth token for playlist operations
        await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snippet: {
              playlistId: playlist.id,
              resourceId: {
                kind: 'youtube#video',
                videoId: videoId
              }
            }
          })
        });
      }
    }

    return playlist.id;
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error;
  }
};
