import React from 'react';
import CardSuit from './CardSuit';
import './Card.css';

const Card = ( {rank, suit} ) => {
    return (
        <div className = "card-container">
            <div className = "rank">
                <p> {rank} </p>
            </div>
            <div className = "suit">
                <CardSuit suit = {suit} color = "black" />
            </div>
        </div>
    );
};

export default Card;
