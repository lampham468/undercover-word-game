import { useState } from 'react';
import Top from '../components/Top';
import Bottom from '../components/Bottom';
import Middle from '../components/Middle';

export default function Game({ 
  onEnd, 
  playerRole, 
  playerWord 
}: { 
  onEnd: () => void;
  playerRole?: 'citizen' | 'impostor';
  playerWord?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  
  const isImpostor = playerRole === 'impostor';
  const word = playerWord;

  return (
    <section className="h-screen flex flex-col text-center">
      <div className="pt-8 flex justify-center">
        <Top>UNDERCOVER</Top>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <Middle>
          <div onClick={() => setRevealed(v => !v)} className="cursor-pointer select-none w-full h-full flex items-center justify-center">
            <div className="space-y-4">
              <div className="text-sm text-neutral-600">
                You are the {isImpostor ? 'IMPOSTOR' : 'CITIZEN'}
              </div>
              <div className="text-lg">
                {revealed ? (
                  isImpostor ? '(You have no word - you are the impostor!)' : word || 'No word assigned'
                ) : (
                  'Click to reveal your word'
                )}
              </div>
            </div>
          </div>
        </Middle>
      </div>

      <div className="pb-8 flex justify-center">
        <Bottom onClick={onEnd}>End Game</Bottom>
      </div>
    </section>
  );
}
