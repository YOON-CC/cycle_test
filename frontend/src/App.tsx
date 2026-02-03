import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoginForm } from './components/LoginForm';
import { MessagePage } from './pages/MessagePage';
import { PrivateRoute } from './components/PrivateRoute';

function App() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">풀스택 프로젝트</h1>
              <p className="text-sm text-gray-600">React + Spring Boot + JWT</p>
            </div>
            {isAuthenticated && (
              <div className="flex items-center gap-4">
                <span className="text-gray-700">
                  안녕하세요, <span className="font-semibold">{user?.username}</span>님
                </span>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </header>

        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MessagePage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
