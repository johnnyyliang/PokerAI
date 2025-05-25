import React from 'react';
import { Button } from '@mui/material';
import { Link } from 'react-router-dom';
import './PlayPage.css';
import { createTheme, ThemeProvider} from '@mui/material/styles';
import Card from '../components/Card'
import cardTurnedOver from '../assets/card-turned-over.png'

const blackwhiteTheme = createTheme({
    palette: {
        primary: {
            main: '#fff',
        }
    }
});

function PlayPage() {
    return (
        <div className='play-page'>
            <div className="header-row">
                <ThemeProvider theme={blackwhiteTheme}>
                    <Button variant="contained" component={Link} to="/" className='back-button'>Back</Button>
                </ThemeProvider>
            <h1 className='title'>Play</h1>
            </div>
            <h1 className = 'text'> AI Cards </h1>
            <div className = "ai-cards">
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
                <img src = { cardTurnedOver } alt = "Card Turned Over" className = "turned-over"></img>
            </div>
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
                    <Button variant = "contained" className = "option"> Bet </Button>
                    <Button variant = "contained" className = "option"> Call </Button>
                    <Button variant = "contained" className = "option"> Fold </Button>
                    <Button variant = "contained" className = "option"> Check </Button>
                </ThemeProvider>
            </div>
        </div>
    );
}

export default PlayPage;