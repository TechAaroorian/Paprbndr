import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './store';
import { clearNotification } from './store/uiSlice';
import { Header } from './components/Header';
import { MergeView } from './components/merge/MergeView';
import { Viewer } from './components/viewer/Viewer';
import { DiffView } from './components/diff/DiffView';
import { MarkdownStudio } from './components/markdown/MarkdownStudio';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector((state) => state.ui.activeTab);
  const notification = useAppSelector((state) => state.ui.notification);

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        dispatch(clearNotification());
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [notification, dispatch]);

  return (
    <div className="app-container">
      <Header />

      <main className="main-content">
        {activeTab === 'viewer' && <Viewer />}
        {activeTab === 'merge' && <MergeView />}
        {activeTab === 'diff' && <DiffView />}
        {activeTab === 'markdown' && <MarkdownStudio />}
      </main>

      {/* Toast Notification Banner */}
      {notification && (
        <div className={`toast-banner ${notification.type}`}>
          {notification.type === 'success' && <CheckCircle2 size={18} />}
          {notification.type === 'error' && <AlertCircle size={18} />}
          {notification.type === 'info' && <Info size={18} />}
          {notification.type === 'warning' && <AlertCircle size={18} />}
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => dispatch(clearNotification())}
            style={{ color: 'inherit', marginLeft: '8px', display: 'flex', alignItems: 'center' }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
