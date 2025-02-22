
import { supabase } from "@/integrations/supabase/client";

export const createYouTubePlaylist = async (tracks: any[]) => {
  try {
    // Get YouTube API credentials from Supabase
    const { data: secretData, error: secretError } = await supabase
      .functions.invoke('get-secret', {
        body: { secretName: 'YOUTUBE_API_KEY' }
      });

    if (secretError || !secretData?.secret) {
      throw new Error('Failed to get YouTube API key');
    }

    // First create the playlist
    const playlistResponse = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&key=${secretData.secret}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          title: 'Imported from Spotify',
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

    // Then search for each track and add it to the playlist
    for (const track of tracks) {
      const searchQuery = `${track.track.name} ${track.track.artists[0].name}`;
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&key=${secretData.secret}`
      );

      if (!searchResponse.ok) {
        console.error(`Failed to search for track: ${searchQuery}`);
        continue;
      }

      const searchResult = await searchResponse.json();
      if (searchResult.items && searchResult.items.length > 0) {
        const videoId = searchResult.items[0].id.videoId;
        
        await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&key=${secretData.secret}`, {
          method: 'POST',
          headers: {
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
    console.error('Error creating YouTube playlist:', error);
    throw error;
  }
};
