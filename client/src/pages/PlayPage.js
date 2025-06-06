import React, { useEffect, useState } from 'react';
import { Button, Slider } from '@mui/material';
import { Link } from 'react-router-dom';
import './PlayPage.css';
import { createTheme, ThemeProvider} from '@mui/material/styles';
import Card from '../components/Card'
import cardTurnedOver from '../assets/card-turned-over.png'

function getCardInfo(cardIndex) {
    const suits = ['spade', 'heart', 'diamond', 'club'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suit = suits[Math.floor(cardIndex / 13)];
    const rank = ranks[cardIndex % 13];
    return { rank, suit };
}

function PlayPage() {

    const [ aiStack, setAiStack ] = useState(1000)
    const [ selfStack, setSelfStack ] = useState(1000)
    const [ pot, setPot ] = useState(0)
    // "Player", "AI", or "None", if action is complete
    const [ turn, setTurn ] = useState("Player")
    // Determines how action begins for a given hand
    const [ dealer, setDealer ] = useState("Player")
    const [ betSize, setBetSize ] = useState(0)
    const [ winner, setWinner ] = useState(null)
    // valid stages are "Preflop", "Flop", "Turn", "River", "Showdown"
    const [ stage, setStage ] = useState("Preflop")
    const [ actionComplete, setActionComplete ] = useState(false)
    const bigBlind = 10
    const smallBlind = 5
    const [handHistory, setHandHistory] = useState([]);
    const [deck, setDeck] = useState([]);
    const [playerHoleCards, setPlayerHoleCards] = useState([]);
    const [aiHoleCards, setAiHoleCards] = useState([]);
    const [communityCards, setCommunityCards] = useState([]);
    // Add state to track if a bet has occurred this round
    const [betInRound, setBetInRound] = useState(false);

    // AI response when user makes a move
    useEffect(() => {
        if (turn === "AI") {
            aiAction();
        }
        // eslint-disable-next-line
    }, [turn, pot, selfStack, aiStack, handHistory]);

    // Ends the hand when a winner is determined, i.e. when a player folds or hand goes to showdown
    // winner in ["AI", "Player"]
    useEffect(() => {

    }, [winner])

    // When betting is complete, advance the stage and set actionComplete back to false
    // TODO: When stage === "Showdown", will make a request to the backend to evaluate the hand 
    useEffect(() => {
        if (actionComplete) {
            if (stage === "Preflop") {
                setCommunityCards([deck[0], deck[1], deck[2]]);
                setStage("Flop");
            } else if (stage === "Flop") {
                setCommunityCards([...communityCards, deck[3]]);
                setStage("Turn");
            } else if (stage === "Turn") {
                setCommunityCards([...communityCards, deck[4]]);
                setStage("River");
            } else if (stage === "River") {
                setStage("Showdown");
                // api call goes here
            }
            setActionComplete(false);
        }
    }, [actionComplete]);

    useEffect(() => {
        initializeHand();
    }, []);

    function toggleDisplay() {
        const div = document.getElementById("bet-slider");
        if (div.style.display === "none" || div.style.display === "") {
          div.style.display = "block";
        } else {
          div.style.display = "none";
        }
    }

    function advance() {
        if (stage === "Preflop") {
            setStage("Flop");
        } else if (stage === "Flop") {
            setStage("Turn");
        } else if (stage === "Turn") {
            setStage("River");
        } else if (stage === "River") {
            setStage("Showdown");
        }
        // If already at Showdown, do nothing
    }

    function handleBet() {
        if (document.getElementById("bet-slider").style.display === "none"){
            toggleDisplay()
        } else {
            if (turn === "Player") {
                setSelfStack(selfStack - betSize)
                setPot(pot + betSize)
                setHandHistory(prev => [...prev, `Player bets $${betSize}`])
                setBetInRound(true)
                setTurn("AI")
            } else {
                setAiStack(aiStack - betSize)
                setPot(pot + betSize)
                setHandHistory(prev => [...prev, `AI bets $${betSize}`])
                setBetInRound(true)
                setTurn("Player")
            }
            toggleDisplay()
        }
    }

    function handleCall() {
        if (turn === "Player") {
            if (!betInRound) {
                // No outstanding bet, treat as a check
                setHandHistory(prev => [...prev, "Player checks"])
                setTurn("AI")
            } else {
                setSelfStack(prev => prev - betSize)
                setPot(prev => prev + betSize)
                setHandHistory(prev => [...prev, "Player calls"])
                setBetInRound(false)
                setActionComplete(true)
                setTurn("Player")
            }
        } else {
            if (!betInRound) {
                setHandHistory(prev => [...prev, "AI checks"])
                setActionComplete(true)
                setTurn("Player")
            } else {
                setAiStack(prev => prev - betSize)
                setPot(prev => prev + betSize)
                setHandHistory(prev => [...prev, "AI calls"])
                setBetInRound(false)
                setActionComplete(true)
                setTurn("Player")
            }
        }
    }

    function handleCheck() {
        if (turn === "Player") {
            setHandHistory(prev => [...prev, "Player checks"])
            setTurn("AI")
        } else {
            setHandHistory(prev => [...prev, "AI checks"])
            setTurn("Player")
        }
    }

    function handleFold() {
        setHandHistory(prev => [...prev, `${turn} folds`])
        setWinner(turn === "Player" ? "AI" : "Player")
    }

    function handleEndTurn() {
        setTurn("None")
    }

    function aiAction() {
        // Construct the game state object to send to the backend
        const gameState = {
            deck: deck,
            board: communityCards,
            hole_cards: [[], aiHoleCards],
            player: 1, // AI is player 1
            dealer: dealer === "Player" ? 0 : 1,
            stage: ["Preflop", "Flop", "Turn", "River", "Showdown"].indexOf(stage),
            pot: pot,
            to_call: betSize, // or actual to_call value
            checked: false, // TODO: fill with actual checked state if available
            history: handHistory.join(";"),
            terminal: false,
            winner: null
        };
        console.log('AI gameState:', gameState);
        fetch('http://localhost:5000/ai-move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gameState)
        })
        .then(res => res.json())
        .then(data => {
            console.log('Raw AI response:', data);
            console.log('AI move:', data.move);
            // Determine moveType for numeric or string responses
            const rawMove = data.move;
            let moveType;
            if (typeof rawMove === 'number') {
                if (rawMove === 0) {
                    moveType = 'fold';
                } else if (rawMove === 1) {
                    moveType = betSize > 0 ? 'call' : 'check';
                } else if (rawMove === 2) {
                    moveType = 'bet';
                }
            } else {
                moveType = rawMove;
            }
            const amount = data.amount ?? betSize;
            switch (moveType) {
                case 'bet':
                    setAiStack(prev => prev - amount);
                    setPot(prev => prev + amount);
                    setHandHistory(prev => [...prev, `AI bets $${amount}`]);
                    setBetInRound(true);
                    setTurn("Player");
                    break;
                case 'call':
                    setAiStack(prev => prev - amount);
                    setPot(prev => prev + amount);
                    setHandHistory(prev => [...prev, "AI calls"]);
                    setBetInRound(false);
                    setActionComplete(true);
                    setTurn("Player");
                    break;
                case 'check':
                    setHandHistory(prev => [...prev, "AI checks"]);
                    setActionComplete(true);
                    setTurn("Player");
                    break;
                case 'fold':
                    setHandHistory(prev => [...prev, "AI folds"]);
                    setWinner("Player");
                    setTurn("None");
                    break;
                default:
                    setTurn("Player");
            }
        })
        .catch(err => {
            console.error('Error fetching AI move:', err);
            setTurn("Player");
        });
    }

    function initializeHand() {
        // Create a deck: 0-51
        let newDeck = Array.from({length: 52}, (_, i) => i);

        // Shuffle
        for (let i = newDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
        }

        // Deal two to player, two to AI
        const playerCards = [newDeck.pop(), newDeck.pop()];
        const aiCards = [newDeck.pop(), newDeck.pop()];

        setDeck(newDeck);
        setPlayerHoleCards(playerCards);
        setAiHoleCards(aiCards);

        // Reset other game state as needed
        setPot(0);
        setSelfStack(1000);
        setAiStack(1000);
        setStage("Preflop");
        setHandHistory([]);
        setTurn("Player");
        setWinner(null);
        setCommunityCards([]);
    }

    const blackwhiteTheme = createTheme({
        palette: {
            primary: {
                main: '#fff',
            }
        }
    });

    // Placeholder hand evaluator
    function evaluateWinner(playerCards, aiCards, community) {
        // TODO: Replace with real hand evaluator or backend call
        // For now, randomly pick a winner for demonstration
        const r = Math.random();
        if (r < 0.5) return "Player";
        else return "AI";
    }

    // Add effect to determine winner at showdown
    useEffect(() => {
        if (stage === "Showdown" && winner === null) {
            const result = evaluateWinner(playerHoleCards, aiHoleCards, communityCards);
            setWinner(result);
        }
        // If someone folded, winner is already set
        // eslint-disable-next-line
    }, [stage, winner]);

    return (
        <div className='play-page' style={{position: 'relative'}}>
            <div className="header-row">
                <ThemeProvider theme={blackwhiteTheme}>
                    <Button variant="contained" component={Link} to="/" className='back-button'>Back</Button>
                </ThemeProvider>
            <h1 className='title'>Play</h1>
            </div>
            <h1 className = "text stack"> AI Stack: ${ aiStack } </h1>
            <h1 className = 'text'> AI Cards </h1>
            <div className = "ai-cards">
                {stage === "Showdown" ? (
                    aiHoleCards.map((card, idx) => {
                        const { rank, suit } = getCardInfo(card);
                        return <Card key={idx} rank={rank} suit={suit} />;
                    })
                ) : (
                    <>
                        <img src={cardTurnedOver} alt="Card Turned Over" className="turned-over" />
                        <img src={cardTurnedOver} alt="Card Turned Over" className="turned-over" />
                    </>
                )}
            </div>
            <h1 className = "text"> Pot: ${ pot }</h1>
            <div className = "community-cards" style={{position: 'relative'}}>
                {[0,1,2,3,4].map((_, idx) => {
                    if (idx < communityCards.length) {
                        const { rank, suit } = getCardInfo(communityCards[idx]);
                        return <Card key={idx} rank={rank} suit={suit} />;
                    } else {
                        return <img key={idx} src={cardTurnedOver} alt="Card Turned Over" className="turned-over" />;
                    }
                })}
                <div className="hand-history-sidebar">
                    <h3>Hand History</h3>
                    <ul>
                        {handHistory.length === 0 ? (
                            <li>No actions yet</li>
                        ) : (
                            handHistory.map((action, idx) => (
                                <li key={idx}>{action}</li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
            <div className = "self-cards">
                {playerHoleCards.map((card, idx) => {
                    const { rank, suit } = getCardInfo(card);
                    return <Card key={idx} rank={rank} suit={suit} />;
                })}
            </div>
            <h1 className = "text"> Your Hand </h1>
            <div className = "option-container">
                <ThemeProvider theme = {blackwhiteTheme} className = "options">
                    <Button onClick = { handleBet } variant = "contained" className = "option" disabled = {turn === "AI"}> Bet </Button>
                    <Button onClick = { handleCall } variant = "contained" className = "option" disabled = {turn === "AI"}> Call </Button>
                    <Button onClick = { handleFold } variant = "contained" className = "option" disabled = {turn === "AI"}> Fold </Button>
                    <Button onClick = { handleCheck } variant = "contained" className = "option" disabled = {turn === "AI"}> Check </Button>
                </ThemeProvider>
            </div>
            <div id = "bet-slider" style = {{ display: "none" }}>
                <ThemeProvider theme = {blackwhiteTheme}>
                    <h3 className='text'> Bet Size: { betSize }</h3>
                    <Slider min = {1} max = { selfStack } 
                            onChange={(e, value) => setBetSize(value)}/>
                </ThemeProvider>
            </div>
            <div className = "text stack">
                <h1>Stack: ${ selfStack } </h1>
            </div>
            {winner && (
                <div className="winner-modal" style={{position: 'absolute', top: 100, left: '50%', transform: 'translateX(-50%)', background: 'white', padding: 24, borderRadius: 8, zIndex: 10, textAlign: 'center'}}>
                    <h2>{winner} wins the hand!</h2>
                    <Button variant="contained" color="primary" onClick={initializeHand}>Next Hand</Button>
                </div>
            )}
        </div>
    );
}

export default PlayPage;