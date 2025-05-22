import React from 'react';
import './CardSuit.css';

const CardSuit = ({ suit = 'spade', color = 'white', size = 'medium' }) => {
  const suitSymbols = {
    spade: '♠',
    heart: '♥',
    diamond: '♦',
    club: '♣'
  };

  return (
    <span 
      className={`card-suit ${size}`}
      style={{ color }}
    >
      {suitSymbols[suit]}
    </span>
  );
};

export default CardSuit; 