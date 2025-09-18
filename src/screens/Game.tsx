import { useState } from 'react';
import Top from '../components/Top';
import Bottom from '../components/Bottom';
import Middle from '../components/Middle';

export default function Game({ onEnd }: { onEnd: () => void }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="h-screen flex flex-col text-center">
      <div className="pt-8 flex justify-center">
        <Top>UNDERCOVER</Top>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <Middle>
          <div onClick={() => setRevealed(v => !v)} className="cursor-pointer select-none w-full h-full flex items-center justify-center">
            {revealed ? 'your word (mock)' : 'click to show word, imposter sees blank'}
          </div>
        </Middle>
      </div>

      <div className="pb-8 flex justify-center">
        <Bottom onClick={onEnd}>End Game</Bottom>
      </div>
    </section>
  );
}
