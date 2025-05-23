import React from 'react';
import { Button } from '@mui/material';
import { Link } from 'react-router-dom';
import './PlayPage.css';
import { createTheme, ThemeProvider} from '@mui/material/styles';

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
        </div>
    );
}

export default PlayPage;