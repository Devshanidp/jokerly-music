'use client';
import React, { useState } from 'react';

const initialSongs = [
  { id: '1', title: 'Bohemian Rhapsody', artist: 'Queen' },
  { id: '2', title: 'Midnight City', artist: 'M83' },
  { id: '3', title: 'Starboy', artist: 'The Weeknd' },
];

export default function DraggablePlaylist() {
  const [songs, setSongs] = useState(initialSongs);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const onDragStart = (index: number) => {
    setDraggingIndex(index);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === index) return;

    // Reorder the list
    const newSongs = [...songs];
    const draggedItem = newSongs[draggingIndex];
    newSongs.splice(draggingIndex, 1); // Remove from old position
    newSongs.splice(index, 0, draggedItem); // Insert at new position
    
    setDraggingIndex(index);
    setSongs(newSongs);
  };

  return (
    <ul style={{ listStyle: 'none', padding: 0, width: '300px' }}>
      {songs.map((song, index) => (
        <li
          key={song.id}
          draggable
          onDragStart={() => onDragStart(index)}
          onDragOver={(e) => onDragOver(e, index)}
          onDragEnd={() => setDraggingIndex(null)}
          style={{
            padding: '10px',
            margin: '5px 0',
            backgroundColor: draggingIndex === index ? '#eee' : '#fff',
            border: '1px solid #ccc',
            cursor: 'grab',
            opacity: draggingIndex === index ? 0.5 : 1,
          }}
        >
          {index + 1}. {song.title} - {song.artist}
        </li>
      ))}
    </ul>
  );
}
