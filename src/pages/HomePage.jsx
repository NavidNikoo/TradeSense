import NavBar from "../components/NavBar"
import ChartingTool from "../photos/ChartingTool.jpeg"
import NewsSources from "../photos/NewsSources.jpeg"
import SocialMedia from "../photos/SocialMedia.jpeg"
import Dashboard from "../photos/Dashboard.jpeg"
import Watchlist from "../photos/Watchlist.jpeg"
import TimeLapse from "../photos/Sentiment Time-Lapse.jpeg"

const borderStyle = {
    border:'1px solid black',
    borderRadius: '8px',
    flex: 1,
    padding: '1rem'
}

const titleStyle = {
    fontSize: '3rem',
    marginBottom: '-15px'
}

const sectionStyle = {
    display: 'flex',
    gap: '2rem',
    paddingLeft: '5rem',
    paddingRight: '5rem',
    alignItems: 'stretch'
}

const photoStyle = {
    width: '100%',
    height: '250px',
    objectFit: 'contain'
}

const textCenter = {
    textAlign: 'center'
}

export function HomePage() {
    return (
        <nav style={{ paddingBottom: '5rem' }}>
            <NavBar />
            <div style={ textCenter }>
                <h1 style={ titleStyle }>Welcome to TradeSense</h1>
                <h2>Prediction Trading Made Easy</h2>
                <p style={{ wordWrap:'break-word', overflowWrap:'break-word', maxWidth:'600px', textAlign:'center', margin:'0 auto', paddingBottom:'25px' }}>
                    TradeSense is a free intelligent tool that allows new users to understand, learn and 
                    make prediction trading without the hassle. Learning the ropes in prediction trading
                    can be overwhelming, complicated and can be time consuming. TradeSense takes away the 
                    pain and makes it easy for new traders to understand and makes it easier for well-seasoned 
                    traders to make their own predictions.
                </p>
            </div>
            <section style={ sectionStyle }>
                <div style={ borderStyle }>
                    <img src={ NewsSources } style={ photoStyle } />
                    <h1 style={ textCenter }><b>News Sources</b></h1>
                    <p style={ textCenter }>
                        Make trading predictions based on big news sources. Let the news outlets come to you with 
                        important trading information and TradeSense predict what will happen to certain stocks.
                    </p>
                </div>
                <div style={ borderStyle }>
                    <img src={ SocialMedia } style={ photoStyle }/>
                    <h1 style={ textCenter }><b>Social Media</b></h1>
                    <p style={ textCenter }>
                        Make trading predictions based on multiple social media platforms. TradeSense will analyze 
                        expert opinions and public statements to save you time and headaches from analyzing everything
                        yourself.
                    </p>
                </div>
                <div style={ borderStyle }>
                    <img src={ ChartingTool } style={ photoStyle }/>
                    <h1 style={ textCenter }><b>Charting Tools</b></h1>
                    <p style={ textCenter }>
                        Don't understand charting tools? Not to worry! TradeSense uses complex charting tools 
                        to make predictions and creates a basic charting tool that is easy to read and easier to understand.
                    </p>
                </div>
            </section>
            <div style={{ textAlign:'center', alignItems:'center', paddingBottom:'2rem' }}>
                <h1 style={ titleStyle }>TradeSense from the Inside</h1>
            </div>
            <section style={ sectionStyle }>
                <div style={ borderStyle }>
                    <img src={ Dashboard } style={ photoStyle } />
                    <h1 style={ textCenter }><b>Dashboard</b></h1>
                    <p style={ textCenter }>
                        The Dashboard welcomes you and saves your previous stock watchlist as soon as you log in.
                        No need to be overwhelmed with all of the stock options, rather you choose which stock you want
                        to watch. The Dashboard allows each stock to show up with a predicted price per stock, an increase
                        or decrease percentage, a simple stock chart with dates and price points and current news articles 
                        with an impact rating that drive the predictions.
                    </p>
                </div>
                <div style={ borderStyle }>
                    <img src={ Watchlist } style={ photoStyle } />
                    <h1 style = { textCenter }><b>Watchlist</b></h1>
                    <p style={ textCenter }>
                        The Watchlist allows you to search most stocks that you want to watch. Just search up the stock name 
                        or company name and it will appear in your list. You can search up companies, cryptocurrency and much more.
                        The arrows towards the right side of the stock allows you add stock importance towards the top of the list.
                        You can easily remove stock watches with ease.
                    </p>
                </div>
                <div style={ borderStyle }>
                    <img src={ TimeLapse } style={ photoStyle } />
                    <h1 style={ textCenter }><b>Sentiment Time-Lapse</b></h1>
                    <p style={ textCenter }>
                        The Sentiment Time-Lapse allows you to dive deeper into a stock and understand its behavior in order for you
                        to make better predictions. News sources, social media and expert charting tools help explain the behavior of
                        your wacthed stock, but our Sentiment Time-Lapse allows you to understand behaviors without being overwhelmed
                        with hundreds of different news sources and thousands of professional opinions. TradeSense allows you to understand 
                        the most important opinions in your own TradeSense account.
                    </p>
                </div>
            </section>
        </nav>
    )
}