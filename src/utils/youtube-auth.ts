
import { supabase } from "@/integrations/supabase/client";

export const initiateYouTubeAuth = async () => {
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

    // Store current playlist details
    const currentTracks = sessionStorage.getItem('playlist_tracks');
    const currentTitle = sessionStorage.getItem('playlist_title');
    if (currentTracks && currentTitle) {
      sessionStorage.setItem('pending_playlist_tracks', currentTracks);
      sessionStorage.setItem('pending_playlist_title', currentTitle);
    }

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

export const handleYouTubeCallback = async (code: string): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('youtube-auth-callback', {
      body: { code }
    });

    if (error || !data?.refreshToken) {
      throw new Error('Failed to complete authentication');
    }

    return data.refreshToken;
  } catch (error) {
    console.error('Error handling callback:', error);
    throw error;
  }
};
