import Top from '../components/Top';
import Bottom from '../components/Bottom';
import Middle from '../components/Middle';

export default function Idle({ onHost, onJoin, roomState }: { 
    onHost: () => void; 
    onJoin?: () => void;
    roomState: { claimed: boolean; size: number; maxSize: number; gameStarted: boolean };
}) {
    const { claimed, size, maxSize, gameStarted } = roomState;
    
    // Determine what button to show
    let buttonText = 'Host Room';
    let buttonAction = onHost;
    let buttonDisabled = false;
    
    if (!claimed) {
        // Room not claimed - show Host button
        buttonText = 'Host Room';
        buttonAction = onHost;
    } else if (gameStarted) {
        // Game is active - show Wait button
        buttonText = 'Wait...';
        buttonAction = () => {}; // Does nothing
        buttonDisabled = true;
    } else if (size < maxSize) {
        // Room claimed, game not started, not full - show Join button  
        buttonText = 'Join Lobby';
        buttonAction = onJoin || (() => {});
    } else {
        // Room full - show Wait button
        buttonText = 'Wait...';
        buttonAction = () => {}; // Does nothing
        buttonDisabled = true;
    }
    
    return (
        <section className="h-screen flex flex-col text-center">
            <div className="pt-8 flex justify-center">
                <Top>UNDERCOVER</Top>
            </div>

            <div className="flex-1 flex items-center justify-center px-4">
                <Middle>
                    <div className="space-y-4">
                        <p>
                            Host a room or join one. Only one game can run at a time.  
                            When 3+ players are in the lobby, the host can start.  
                            Everyone gets a secret word — except the impostor, who has none.  
                            Take turns giving clues, then discuss and vote out the impostor.  
                            The impostor wins if they avoid detection!
                        </p>
                    </div>
                </Middle>
            </div>

            <div className="pb-8 flex justify-center">
                <Bottom onClick={buttonAction} disabled={buttonDisabled}>
                    {buttonText}
                </Bottom>
            </div>
        </section>
    );
}
