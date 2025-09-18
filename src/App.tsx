import { useState } from 'react';
import Idle from './screens/Idle';
import Lobby from './screens/Lobby';
import Game from './screens/Game';

type Screen = 'idle' | 'lobby' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('idle');
  const [players, setPlayers] = useState(1);
  const [gameInSession, setGameInSession] = useState(false);

  return (
    <main className="h-screen border border-neutral-300 bg-white text-[16px] leading-7 overflow-hidden">
      {screen === 'idle' && (
        <Idle 
          onHost={() => {
            setGameInSession(true);
            setScreen('lobby');
          }}
          onJoin={() => setScreen('lobby')}
          gameInSession={gameInSession}
        />
      )}

      {screen === 'lobby' && (
        <Lobby
          players={players}
          onAddPlayer={() => setPlayers(x => Math.min(8, x + 1))}
          onRemovePlayer={() => setPlayers(x => Math.max(1, x - 1))}
          onStart={() => setScreen('game')}
          onLeave={() => { 
            setPlayers(1); 
            setGameInSession(false);
            setScreen('idle'); 
          }}
        />
      )}

      {screen === 'game' && (
        <Game onEnd={() => { 
          setPlayers(1); 
          setGameInSession(false);
          setScreen('idle'); 
        }} />
      )}
    </main>
  );
}
