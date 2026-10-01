import React, { useState } from 'react';
import { AlertTriangle, Clock3, Play, Ticket } from 'lucide-react';
import { SparkbookDialog } from '../SparkbookDialog';

interface GameCardProps {
    game: { title: string; thumbnail: string; costPerMinute: number; description: string };
    userCredits: number;
    onClose: () => void;
    onPlay: (game: any, minutes: number) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, userCredits, onClose, onPlay }) => {
    const [duration, setDuration] = useState(5);
    const totalCost = duration * game.costPerMinute;
    const canAfford = userCredits >= totalCost;

    return (
        <SparkbookDialog
            onClose={onClose}
            eyebrow="Play lab · timed ticket"
            title={game.title}
            description={game.description || 'Choose a short break, then return to your build.'}
            icon={<Play />}
            tone="rose"
            size="sm"
            bodyClassName="sq-game-ticket-body"
        >
            {game.thumbnail && <div className="sq-game-ticket-art"><img src={game.thumbnail} alt="" /></div>}
            <div className="sq-game-credit-line"><span><Ticket size={17} /> Available credits</span><strong>{userCredits}</strong></div>
            <fieldset className="sq-game-duration">
                <legend>Choose play time</legend>
                <div>{[5, 10, 15].map(minutes => {
                    const cost = minutes * game.costPerMinute;
                    const affordable = userCredits >= cost;
                    return <button key={minutes} type="button" disabled={!affordable} aria-pressed={duration === minutes} onClick={() => setDuration(minutes)}><Clock3 size={17} /><strong>{minutes} min</strong><span>{cost} credits</span></button>;
                })}</div>
            </fieldset>
            <div className={`sq-game-total ${canAfford ? '' : 'is-short'}`}><span>Total ticket</span><strong>{totalCost} credits</strong>{!canAfford && <small><AlertTriangle size={14} /> You need {totalCost - userCredits} more credits.</small>}</div>
            <button type="button" className="sq-action sq-action--primary sq-action--wide" disabled={!canAfford} onClick={() => onPlay(game, duration)}><Play size={18} /> {canAfford ? `Start ${duration}-minute session` : 'Not enough credits'}</button>
        </SparkbookDialog>
    );
};
