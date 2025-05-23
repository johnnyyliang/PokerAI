import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import CardSuit from '../components/CardSuit';
import { Button } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#fff',
    },
  },
});

function LandingPage() {
  return (
    <div className='landing-page'>
        <h1 className='title'>
          <CardSuit suit="spade" size="large" />
          Poker Trainer AI
        </h1>
        <p className='subtitle'>Improve your poker skills with an AI-powered trainer</p>
        <div className='button-container'>
          <ThemeProvider theme={theme}>
            <Button variant="contained" component={Link} to="/play">Get Started</Button>
          </ThemeProvider>
        </div>
    </div>
  );
}

export default LandingPage;
