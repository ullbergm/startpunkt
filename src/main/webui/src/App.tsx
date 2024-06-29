import { useEffect, useState } from 'react';
import './App.scss';
import Header from './Header';
import ApplicationGroupList from './views/ApplicationGroupList/ApplicationGroupList';

function App() {
    const [apps, setApps] = useState([]);

    useEffect(() => {
        fetch('/api/apps')
            .then(response => response.json())
            .then(data => setApps(data))
            .catch(error => console.error(error));
    }, []);

    return (
        <div className="App">
            <Header />

            <header className="App-header">
                <div className="container h2">Applications</div>
            </header>
            <div>
                <ApplicationGroupList groups={apps} />
            </div>
        </div>
    );
}

export default App;
