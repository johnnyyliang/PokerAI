import React, { useEffect, useState } from 'react';
import { Button, Slider } from '@mui/material';
import { Link } from 'react-router-dom';
import './PlayPage.css';
import { createTheme, ThemeProvider} from '@mui/material/styles';
import Card from '../components/Card'
import cardTurnedOver from '../assets/card-turned-over.png'

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

    // AI response when user makes a move
    useEffect(() => {
        if (turn === "AI") {
            aiAction()
        }
    }, [turn])

    // Ends the hand when a winner is determined, i.e. when a player folds or hand goes to showdown
    // winner in ["AI", "Player"]
    useEffect(() => {

    }, [winner])

    // When betting is complete, advance the stage and set actionComplete back to false
    // TODO: When stage === "Showdown", will make a request to the backend to evaluate the hand 
    useEffect(() => {
        if (actionComplete) {
            if (stage === "Preflop") {
                setStage("Flop");
            } else if (stage === "Flop") {
                setStage("Turn");
            } else if (stage === "Turn") {
                setStage("River");
            } else if (stage === "River") {
                setStage("Showdown");
                // api call goes here
            }
            setActionComplete(false);
        }
    }, [actionComplete]);

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
                setTurn("AI")
            } else {
                setAiStack(aiStack - betSize)
                setPot(pot + betSize)
                setHandHistory(prev => [...prev, `AI bets $${betSize}`])
                setTurn("Player")
            }
            toggleDisplay()
        }
    }

    function handleCall() {
        if (turn === "Player") {
            setSelfStack(selfStack - betSize)
            setPot(pot + betSize)
            setHandHistory(prev => [...prev, "Player calls"])
            setTurn("AI")
        } else {
            setAiStack(aiStack - betSize)
            setPot(pot + betSize)
            setHandHistory(prev => [...prev, "AI calls"])
            setTurn("Player")
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
        setTimeout(() => setTurn("Player"), 1000)
    }

    const blackwhiteTheme = createTheme({
        palette: {
            primary: {
                main: '#fff',
            }
        }
    });

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
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
            </div>
            <h1 className = "text"> Pot: ${ pot }</h1>
            <div className = "community-cards" style={{position: 'relative'}}>
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
                {/* Sidebar for hand history */}
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
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
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
        </div>
    );
}

export default PlayPage;