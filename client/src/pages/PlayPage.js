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
    const [ turn, setTurn ] = useState("Player Turn")
    const [ dealer, setDealer ] = useState("Player")
    const [ betSize, setBetSize ] = useState(0)
    const [ winner, setWinner ] = useState(null)
    const bigBlind = 5

    // AI response when user makes a move
    useEffect(() => {
        if (turn === "AI Turn") {
            aiAction()
        }
    }, [turn])

    // Ends the hand when a winner is determined, i.e. when a player folds or hand goes to showdown
    useEffect(() => {

    }, [winner])

    function toggleDisplay() {
        const div = document.getElementById("bet-slider");
        if (div.style.display === "none" || div.style.display === "") {
          div.style.display = "block";
        } else {
          div.style.display = "none";
        }
    }

    function advance() {
        // implement advancing state, preflop -> flop, flop -> turn ... river -> end hand
    }

    function handleBet() {
        if (document.getElementById("bet-slider").style.display === "none"){
            toggleDisplay()
        } else {
            if (turn === "Player Turn") {
                setSelfStack(selfStack - betSize)
                setPot(pot + betSize)
                setTurn("AI Turn")
            } else {
                setAiStack(aiStack - betSize)
                setPot(pot + betSize)
                setTurn("Player Turn")
            }
            toggleDisplay()
        }
    }

    function handleCall() {
        if (turn === "Player Turn") {
            setSelfStack(selfStack - betSize)
            setPot(pot + betSize)
            setTurn("AI Turn")
        } else {
            setAiStack(aiStack - betSize)
            setPot(pot + betSize)
            setTurn("Player Turn")
        }
    }

    function handleCheck() {
        if (turn === "Player Turn") {
            setTurn("AI Turn")
        } else {
            setTurn("Player Turn")
        }
    }

    function handleFold() {
        // implement folding
    }

    function handleEndTurn() {
        setTurn("None")
    }

    function aiAction() {
        setTimeout(() => setTurn("Player Turn"), 1000)
    }

    const blackwhiteTheme = createTheme({
        palette: {
            primary: {
                main: '#fff',
            }
        }
    });

    return (
        <div className='play-page'>
            <div className="header-row">
                <ThemeProvider theme={blackwhiteTheme}>
                    <Button variant="contained" component={Link} to="/" className='back-button'>Back</Button>
                </ThemeProvider>
            <h1 className='title'>Play</h1>
            </div>
            <h1 className = "text stack"> AI Stack: { aiStack } BB </h1>
            <h1 className = 'text'> AI Cards </h1>
            <div className = "ai-cards">
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
            </div>
            <h1 className = "text"> Pot: { pot }</h1>
            <div className = "community-cards">
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
            </div>
            <div className = "self-cards">
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
            </div>
            <h1 className = "text"> Your Hand </h1>
            <div className = "option-container">
                <ThemeProvider theme = {blackwhiteTheme} className = "options">
                    <Button onClick = { handleBet } variant = "contained" className = "option" disabled = {turn === "AI Turn"}> Bet </Button>
                    <Button onClick = { handleCall } variant = "contained" className = "option" disabled = {turn === "AI Turn"}> Call </Button>
                    <Button onClick = { handleFold } variant = "contained" className = "option" disabled = {turn === "AI Turn"}> Fold </Button>
                    <Button onClick = { handleCheck } variant = "contained" className = "option" disabled = {turn === "AI Turn"}> Check </Button>
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
                <h1>Stack: { selfStack } BB</h1>
            </div>
        </div>
    );
}

export default PlayPage;