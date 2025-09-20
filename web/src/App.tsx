import Idle from './screens/Idle';
import Lobby from './screens/Lobby';
import Game from './screens/Game';
import { useRoom } from './services/useRoom';

export default function App() {
  const { state, svc } = useRoom();

  return (
    <main className="h-screen border border-neutral-300 bg-white text-[16px] leading-7 overflow-hidden">
      {state.status === 'Idle' && (
        <Idle
          onHost={() => svc.claimHost()}
          onJoin={() => svc.join()}
          roomState={{
            claimed: state.players > 0,
            size: state.players,
            maxSize: state.maxPlayers,
            gameStarted: state.gameStarted || false
          }}
        />
      )}

      {state.status === 'Lobby' && (
        <Lobby
          players={state.players || 1}
          isHost={state.you?.isHost || false}
          onStart={() => svc.startGame()}
          onLeave={() => svc.leave()}
        />
      )}

      {state.status === 'InGame' && (
        <Game 
          onEnd={() => svc.endGame()} 
          playerRole={state.you?.role}
          playerWord={state.you?.word}
        />
      )}
    </main>
  );
}
