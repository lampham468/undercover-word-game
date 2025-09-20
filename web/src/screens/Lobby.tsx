import Top from '../components/Top';
import Bottom from '../components/Bottom';
import Middle from '../components/Middle';

export default function Lobby({
  players, isHost, onStart, onLeave,
}: {
  players: number;
  isHost: boolean;
  onStart: () => void;
  onLeave: () => void;
}) {
  const canStart = players >= 3;

  return (
    <section className="h-screen flex flex-col text-center">
      <div className="pt-8 flex justify-center">
        <Top>UNDERCOVER</Top>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <Middle>
          <div className="text-center space-y-4">
            <div>
              <p className="text-lg font-medium">{players}/8</p>
              <p className="text-neutral-600 mt-1">need 3 to play</p>
              {isHost && <p className="text-xs text-blue-600 mt-1">You are the host</p>}
            </div>



            {isHost && (
              <button
                className="w-full max-w-[200px] rounded-2xl py-2 text-sm font-medium transition disabled:opacity-50 border border-neutral-300 bg-white hover:shadow-sm active:translate-y-px"
                onClick={onStart}
                disabled={!canStart}
              >
                Start
              </button>
            )}
          </div>
        </Middle>
      </div>

      <div className="pb-8 flex justify-center">
        <Bottom onClick={onLeave}>Leave</Bottom>
      </div>
    </section>
  );
}
