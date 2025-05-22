import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import CardSuit from '../components/CardSuit';
function LandingPage() {
  return (
    <div className='landing-page'>
        <h1 className='title'>
          <CardSuit suit="spade" size="large" />
          Poker Trainer AI
        </h1>
        <p className='subtitle'>Welcome to the Poker Trainer AI</p>
    </div>
  );
}

export default LandingPage;
