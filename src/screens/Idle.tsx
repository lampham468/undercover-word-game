import Top from '../components/Top';
import Bottom from '../components/Bottom';
import Middle from '../components/Middle';

export default function Idle({ onHost, onJoin, gameInSession }: { 
    onHost: () => void; 
    onJoin?: () => void;
    gameInSession?: boolean;
}) {
    const isGameInSession = gameInSession || false;
    
    return (
        <section className="h-screen flex flex-col text-center">
            <div className="pt-8 flex justify-center">
                <Top>UNDERCOVER</Top>
            </div>

            <div className="flex-1 flex items-center justify-center px-4">
                <Middle>
                    instructions…
                </Middle>
            </div>

            <div className="pb-8 flex justify-center">
                <Bottom onClick={isGameInSession ? onJoin : onHost}>
                    {isGameInSession ? 'Join' : 'Host'}
                </Bottom>
            </div>
        </section>
    );
}
