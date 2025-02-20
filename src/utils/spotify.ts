
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
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        headers: {
          // This is a public client ID that's safe to expose
          'client-id': '31d6b16327fb43a59ae8c62fce7f1cd4',
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
