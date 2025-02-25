
import { supabase } from "@/integrations/supabase/client";

export const createYouTubePlaylist = async (tracks: any[], spotifyPlaylistTitle: string) => {
  try {
    // Try to get stored access token first
    let accessToken = sessionStorage.getItem('youtube_access_token');

    // If no token, get a new one
    if (!accessToken) {
      // Redirect to auth
      await initiateYouTubeAuth();
      return;
    }

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

    // If token is invalid, clear it and redirect to auth
    if (playlistResponse.status === 401) {
      sessionStorage.removeItem('youtube_access_token');
      await initiateYouTubeAuth();
      return;
    }

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

    // Clear the access token after successful creation
    sessionStorage.removeItem('youtube_access_token');
    
    return playlist.id;
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error;
  }
};

export const initiateYouTubeAuth = async () => {
  // Store current tracks and title before redirecting
  const currentTracks = sessionStorage.getItem('playlist_tracks');
  const currentTitle = sessionStorage.getItem('playlist_title');
  if (currentTracks && currentTitle) {
    sessionStorage.setItem('pending_playlist_tracks', currentTracks);
    sessionStorage.setItem('pending_playlist_title', currentTitle);
  }
  
  try {
    // Get client ID from edge function
    const { data: clientData, error: clientError } = await supabase
      .functions.invoke('get-secret', {
        body: { secretName: 'GOOGLE_CLIENT_ID' }
      });

    if (clientError || !clientData?.secret) {
      throw new Error('Failed to get client ID');
    }

    const clientId = clientData.secret;
    
    // Define OAuth parameters
    const scopes = [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ].join(' ');

    // Use current URL as redirect
    const redirectUri = `${window.location.origin}/playlist-tracks`;
    
    // Generate random state for security
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('youtube_oauth_state', state);

    // Construct OAuth URL
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&access_type=offline` +
      `&state=${state}` +
      `&prompt=consent`;

    // Redirect to Google OAuth
    window.location.href = authUrl;
  } catch (error) {
    console.error('Error initiating auth:', error);
    throw error;
  }
};
