import React from 'react'
import { Link } from "react-router-dom"

const navBarStyle = {
    display: 'flex',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    alignItems: 'center',
    gap: '1rem',
    justifyContent: 'space-between',
    paddingLeft: '50px',
    backgroundColor: 'black'
}

const textColor = {
    color: 'white'
}

const NavBar = () => {
    return (
        <nav style={ navBarStyle }>
            <Link style={ textColor } to="/">
                <h1 style={{ ...textColor, margin: 0 }}>TradeSense</h1>
            </Link>
            <div style={{display:'flex', gap:'1rem', paddingRight:'50px'}}>
                <Link style={ textColor } to="/signup">Sign up</Link>
                <Link style={ textColor } to="/login">Log in</Link>
            </div>
        </nav>
    )
}

export default NavBar