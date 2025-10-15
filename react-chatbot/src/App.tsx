import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from './components/MainLayout';
import ChatContainer from './components/ChatContainer';
import './App.css';

/**
 * Main App component that provides the dual-pane layout structure
 * Integrates MainLayout with ChatContainer and TheorySection for complete chat experience
 */
function App() {

  return (
    <ErrorBoundary>
      <div className="app">
        {/* Skip link for keyboard navigation */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        
        <header className="app-header" role="banner">
          <h1 id="app-title">A clinical chatbot with logically-verified responses</h1>
        </header>
        
        <main 
          id="main-content"
          className="app-main" 
          role="main"
          aria-labelledby="app-title"
        >
          <MainLayout
            initialChatWidth={70}
            minChatWidth={300}
            minTheoryWidth={250}
          >
            <ChatContainer />
          </MainLayout>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
