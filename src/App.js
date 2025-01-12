import React from 'react';
import Dashboard from './pages/Dashboard.tsx';
import Layout from './components/Layout';

function App() {
  return (
    <div className="App">
      <Layout>
        <Dashboard />
      </Layout>
    </div>
  );
}

export default App;
