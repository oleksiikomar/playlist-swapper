
export const extractPlaylistId = (url: string): string | null => {
  try {
    const matches = url.match(/playlist\/([a-zA-Z0-9]+)/);
    return matches ? matches[1] : null;
  } catch {
    return null;
  }
};

export const fetchPlaylistTracks = async (playlistId: string) => {
  try {
    // First, get an access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa('36ef1be038e24481a2c053bc16a3b86d:12968ee60d974b24938800f7d64c6a9b'),
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token');
    }

    const { access_token } = await tokenResponse.json();

    // Then use the token to fetch playlist data
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch playlist');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching playlist:', error);
    throw error;
  }
};
