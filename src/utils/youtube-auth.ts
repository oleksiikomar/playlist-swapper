
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

    // Store current URL to return to after auth
    sessionStorage.setItem('return_to', window.location.pathname);

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

export const handleYouTubeCallback = async (code: string): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('youtube-auth-callback', {
      body: { code }
    });

    if (error) {
      throw new Error('Failed to complete authentication');
    }

    // Store the access token temporarily
    sessionStorage.setItem('youtube_access_token', data.accessToken);
    
    // Return to the original page
    const returnTo = sessionStorage.getItem('return_to') || '/';
    window.location.href = returnTo;
  } catch (error) {
    console.error('Error handling callback:', error);
    throw error;
  }
};
