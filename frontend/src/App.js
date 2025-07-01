import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext({
  user: null,
  token: null,
  login: () => {},
  logout: () => {}
});

// Theme Context
const ThemeContext = React.createContext({
  isDark: false,
  toggleTheme: () => {}
});

// Simple Captcha Component
const SimpleCaptcha = ({ onVerify }) => {
  const [num1] = useState(Math.floor(Math.random() * 10) + 1);
  const [num2] = useState(Math.floor(Math.random() * 10) + 1);
  const [answer, setAnswer] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const correctAnswer = num1 + num2;

  const handleVerify = () => {
    if (parseInt(answer) === correctAnswer) {
      setIsVerified(true);
      onVerify(true);
    } else {
      alert('Captcha không đúng, vui lòng thử lại');
      setAnswer('');
    }
  };

  if (isVerified) {
    return <div className="text-green-500 font-semibold">✅ Captcha đã xác thực</div>;
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4">
      <div className="text-center mb-2">
        <span className="text-lg font-bold">{num1} + {num2} = ?</span>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Nhập kết quả"
          className="flex-1 px-3 py-2 border rounded dark:bg-gray-600 dark:text-white"
        />
        <button
          onClick={handleVerify}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Xác thực
        </button>
      </div>
    </div>
  );
};

// Components
const ThemeToggle = () => {
  const { isDark, toggleTheme } = React.useContext(ThemeContext);
  
  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-all duration-300 ${
        isDark 
          ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400' 
          : 'bg-gray-700 text-white hover:bg-gray-600'
      }`}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
};

const Navigation = ({ currentPage, setCurrentPage }) => {
  const { isDark } = React.useContext(ThemeContext);
  const { user, logout } = React.useContext(AuthContext);
  
  const getNavItems = () => {
    if (!user) {
      return [
        { id: 'home', label: '🏠 Trang Chủ', icon: '🏠' },
        { id: 'grades', label: '📊 Tra Cứu Điểm', icon: '📊' }
      ];
    } else if (user.user_type === 'teacher') {
      return [
        { id: 'dashboard', label: '📋 Bảng Điều Khiển', icon: '📋' },
        { id: 'students', label: '👥 Học Sinh', icon: '👥' },
        { id: 'grades-manage', label: '📝 Quản Lý Điểm', icon: '📝' },
        { id: 'attendance', label: '📅 Điểm Danh', icon: '📅' },
        { id: 'news-manage', label: '📰 Quản Lý Tin Tức', icon: '📰' }
      ];
    } else {
      return [
        { id: 'home', label: '🏠 Trang Chủ', icon: '🏠' },
        { id: 'my-grades', label: '📊 Xem Điểm', icon: '📊' }
      ];
    }
  };
  
  const navItems = getNavItems();
  
  return (
    <nav className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg transition-all duration-300`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⛪</span>
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Giáo Xứ Phú Lý
            </h1>
          </div>
          
          <div className="flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  currentPage === item.id
                    ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                    : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">{item.icon}</span>
              </button>
            ))}
            
            {user && (
              <button
                onClick={logout}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  isDark ? 'text-red-300 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-100'
                }`}
              >
                <span className="hidden md:inline">🚪 Đăng Xuất</span>
                <span className="md:hidden">🚪</span>
              </button>
            )}
            
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' : 
      type === 'error' ? 'bg-red-500 text-white' : 
      'bg-blue-500 text-white'
    }`}>
      {message}
    </div>
  );
};

// Login Pages
const TeacherLogin = ({ onLogin }) => {
  const { isDark } = React.useContext(ThemeContext);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/teacher-login`, credentials);
      onLogin(response.data);
    } catch (error) {
      alert('Tên đăng nhập hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`max-w-md w-full mx-4 p-8 rounded-xl shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="text-center mb-8">
          <span className="text-6xl mb-4 block">⛪</span>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Đăng Nhập Giáo Lý Viên
          </h2>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Giáo Xứ Phú Lý
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              className={`w-full px-4 py-3 rounded-lg border ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-800'
              } focus:ring-2 focus:ring-blue-500`}
              required
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Mật khẩu
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              className={`w-full px-4 py-3 rounded-lg border ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-800'
              } focus:ring-2 focus:ring-blue-500`}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Demo: admin / admin123
          </p>
        </div>
      </div>
    </div>
  );
};

const ParentLogin = ({ onLogin }) => {
  const { isDark } = React.useContext(ThemeContext);
  const [credentials, setCredentials] = useState({ phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!captchaVerified) {
      alert('Vui lòng xác thực Captcha');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/parent-login`, credentials);
      onLogin(response.data);
    } catch (error) {
      alert('Số điện thoại hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`max-w-md w-full mx-4 p-8 rounded-xl shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="text-center mb-8">
          <span className="text-6xl mb-4 block">👨‍👩‍👧‍👦</span>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Tra Cứu Điểm
          </h2>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Phụ Huynh - Giáo Xứ Phú Lý
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Số điện thoại
            </label>
            <input
              type="tel"
              value={credentials.phone}
              onChange={(e) => setCredentials({...credentials, phone: e.target.value})}
              className={`w-full px-4 py-3 rounded-lg border ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-800'
              } focus:ring-2 focus:ring-blue-500`}
              placeholder="0123456789"
              required
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Mật khẩu
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              className={`w-full px-4 py-3 rounded-lg border ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-800'
              } focus:ring-2 focus:ring-blue-500`}
              placeholder="Mật khẩu được cấp bởi giáo lý viên"
              required
            />
          </div>
          
          <SimpleCaptcha onVerify={setCaptchaVerified} />
          
          <button
            type="submit"
            disabled={loading || !captchaVerified}
            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang tra cứu...' : 'Tra Cứu Điểm'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Liên hệ giáo lý viên để được cấp mật khẩu
          </p>
        </div>
      </div>
    </div>
  );
};

// Home Page
const HomePage = () => {
  const { isDark } = React.useContext(ThemeContext);
  const { user } = React.useContext(AuthContext);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await axios.get(`${API}/news`);
        setNews(response.data);
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Banner */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 mb-8 transition-all duration-300`}>
          <div className="text-center">
            <div className="mb-6">
              <span className="text-8xl block mb-4">⛪</span>
              <div className="w-32 h-1 bg-blue-500 mx-auto mb-4"></div>
            </div>
            <h1 className="text-4xl font-bold mb-4 gradient-text">
              Giáo Xứ Phú Lý
            </h1>
            <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
              Hệ thống quản lý Giáo lý hiện đại - Đồng hành cùng các em trên con đường đức tin
            </p>
            {!user && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => window.location.href = '#grades'}
                  className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  📊 Tra Cứu Điểm
                </button>
                <button
                  onClick={() => window.location.href = '#teacher-login'}
                  className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  👨‍🏫 Giáo Lý Viên
                </button>
              </div>
            )}
          </div>
        </div>

        {/* News Section */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8`}>
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="mr-2">📰</span> Tin Tức Giáo Xứ
          </h2>
          
          {news.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">📝</span>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Chưa có tin tức nào được đăng
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {news.map((item) => (
                <article key={item.id} className={`p-6 rounded-lg border-l-4 border-blue-500 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} hover:shadow-md transition-all duration-300`}>
                  <h3 className="font-bold text-xl mb-3">{item.title}</h3>
                  <div className="prose prose-lg max-w-none">
                    <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                      {item.content}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} flex items-center`}>
                      <span className="mr-2">✍️</span>
                      {item.author}
                    </span>
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} flex items-center`}>
                      <span className="mr-2">📅</span>
                      {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Grade Lookup Page
const GradesPage = ({ setCurrentPage }) => {
  const { isDark } = React.useContext(ThemeContext);
  const [showLogin, setShowLogin] = useState(false);

  if (showLogin) {
    return <ParentLogin onLogin={(data) => {
      // Handle successful login - show grades
      setCurrentPage('my-grades');
    }} />;
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 text-center`}>
          <span className="text-8xl mb-6 block">📊</span>
          <h1 className="text-3xl font-bold mb-4">Tra Cứu Điểm Số</h1>
          <p className={`text-lg mb-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Phụ huynh có thể tra cứu điểm số của con em mình
          </p>
          
          <button
            onClick={() => setShowLogin(true)}
            className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            Đăng Nhập Để Tra Cứu
          </button>
          
          <div className={`mt-8 p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-blue-50'}`}>
            <h3 className="font-semibold mb-2">💡 Hướng dẫn:</h3>
            <ul className={`text-sm text-left space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• Nhập số điện thoại đã đăng ký với giáo xứ</li>
              <li>• Nhập mật khẩu được cấp bởi giáo lý viên</li>
              <li>• Hoàn thành captcha để xác thực</li>
              <li>• Liên hệ giáo lý viên nếu chưa có mật khẩu</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Student Grades Display
const MyGradesPage = () => {
  const { isDark } = React.useContext(ThemeContext);
  const { user } = React.useContext(AuthContext);
  const [gradesData, setGradesData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      if (!user || user.user_type !== 'parent') return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API}/grades/student/${user.user_info.student.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setGradesData(response.data);
      } catch (error) {
        console.error('Error fetching grades:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [user]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!gradesData) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
        <div className="text-center">
          <span className="text-6xl mb-4 block">❌</span>
          <p className="text-xl">Không thể tải dữ liệu điểm số</p>
        </div>
      </div>
    );
  }

  const renderGradeTable = (semester, semesterData, average) => (
    <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6 mb-6`}>
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <span className="mr-2">📚</span>
        Học Kỳ {semester} - Môn Giáo Lý
        <span className={`ml-auto px-3 py-1 rounded-full text-sm font-bold ${
          average >= 8 ? 'bg-green-500 text-white' :
          average >= 6.5 ? 'bg-blue-500 text-white' :
          'bg-red-500 text-white'
        }`}>
          TB: {average}
        </span>
      </h3>
      
      {semesterData ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className={`${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
                <th className="border p-3 text-left font-bold">Loại Điểm</th>
                <th className="border p-3 text-center font-bold">TX1</th>
                <th className="border p-3 text-center font-bold">TX2</th>
                <th className="border p-3 text-center font-bold">TX3</th>
                <th className="border p-3 text-center font-bold">TX4</th>
                <th className="border p-3 text-center font-bold">Giữa Kỳ</th>
                <th className="border p-3 text-center font-bold">Cuối Kỳ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-3 font-semibold">Giáo Lý</td>
                <td className="border p-3 text-center">{semesterData.tx1 || '-'}</td>
                <td className="border p-3 text-center">{semesterData.tx2 || '-'}</td>
                <td className="border p-3 text-center">{semesterData.tx3 || '-'}</td>
                <td className="border p-3 text-center">{semesterData.tx4 || '-'}</td>
                <td className={`border p-3 text-center font-bold ${semesterData.gk ? 'bg-yellow-100 dark:bg-yellow-800' : ''}`}>
                  {semesterData.gk || '-'}
                </td>
                <td className={`border p-3 text-center font-bold ${semesterData.ck ? 'bg-red-100 dark:bg-red-800' : ''}`}>
                  {semesterData.ck || '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Chưa có điểm số cho học kỳ này
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Student Info */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 mb-8`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">📊 Bảng Điểm</h1>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Học sinh:</span>
                  <span className="ml-2 font-bold text-xl">{gradesData.student.name}</span>
                </div>
                <div>
                  <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Lớp:</span>
                  <span className="ml-2 font-semibold">{gradesData.student.class_name}</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${
                gradesData.final_average >= 8 ? 'text-green-500' :
                gradesData.final_average >= 6.5 ? 'text-blue-500' :
                'text-red-500'
              }`}>
                {gradesData.final_average}
              </div>
              <div className={`px-6 py-2 rounded-full font-bold ${
                gradesData.status === 'Lên lớp' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
              }`}>
                {gradesData.status}
              </div>
            </div>
          </div>
        </div>

        {/* Grade Tables */}
        {renderGradeTable(1, gradesData.semester_1, gradesData.semester_1_average)}
        {renderGradeTable(2, gradesData.semester_2, gradesData.semester_2_average)}

        {/* Legend */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
          <h3 className="font-bold mb-4">📋 Chú Thích</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>TX:</strong> Điểm Thường Xuyên</p>
              <p><strong>Giữa Kỳ:</strong> Điểm Kiểm Tra Giữa Kỳ (hệ số 2)</p>
              <p><strong>Cuối Kỳ:</strong> Điểm Thi Cuối Kỳ (hệ số 3)</p>
            </div>
            <div>
              <p><strong>Điều kiện lên lớp:</strong> Điểm trung bình ≥ 6.5</p>
              <p><strong>Công thức tính:</strong> (TX + GK×2 + CK×3) ÷ 6</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Teacher Login Selection
const TeacherLoginPage = ({ setCurrentPage }) => {
  const { isDark } = React.useContext(ThemeContext);

  return <TeacherLogin onLogin={(data) => {
    // Handle successful login
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data));
    window.location.reload(); // Refresh to update auth context
  }} />;
};

function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [currentPage, setCurrentPage] = useState('home');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('darkMode', JSON.stringify(newTheme));
  };

  const login = (loginData) => {
    setUser(loginData);
    setToken(loginData.access_token);
    localStorage.setItem('token', loginData.access_token);
    localStorage.setItem('user', JSON.stringify(loginData));
    
    if (loginData.user_type === 'teacher') {
      setCurrentPage('dashboard');
    } else if (loginData.user_type === 'parent') {
      setCurrentPage('my-grades');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentPage('home');
  };

  useEffect(() => {
    // Check for existing auth
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setToken(savedToken);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        logout();
      }
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    // Initialize sample data
    const initializeData = async () => {
      try {
        await axios.post(`${API}/init-sample-data`);
        setInitialized(true);
      } catch (error) {
        console.error('Error initializing data:', error);
        setInitialized(true);
      }
    };

    if (!initialized) {
      initializeData();
    }
  }, [initialized]);

  const renderPage = () => {
    // Handle auth-required pages
    if (currentPage === 'teacher-login') {
      return <TeacherLoginPage setCurrentPage={setCurrentPage} />;
    }

    // Redirect based on URL hash
    if (window.location.hash === '#grades') {
      return <GradesPage setCurrentPage={setCurrentPage} />;
    }
    
    if (window.location.hash === '#teacher-login') {
      return <TeacherLoginPage setCurrentPage={setCurrentPage} />;
    }

    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'grades':
        return <GradesPage setCurrentPage={setCurrentPage} />;
      case 'my-grades':
        return user && user.user_type === 'parent' ? <MyGradesPage /> : <HomePage />;
      case 'dashboard':
        return user && user.user_type === 'teacher' ? (
          <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
            <div className="max-w-7xl mx-auto px-4 py-8">
              <h1 className="text-3xl font-bold mb-8">📋 Bảng Điều Khiển Giáo Lý Viên</h1>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl shadow-lg`}>
                  <h3 className="font-semibold mb-2">👥 Quản Lý Học Sinh</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                    Thêm, sửa, xóa thông tin học sinh
                  </p>
                  <button
                    onClick={() => setCurrentPage('students')}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg"
                  >
                    Truy Cập
                  </button>
                </div>
                
                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl shadow-lg`}>
                  <h3 className="font-semibold mb-2">📝 Quản Lý Điểm</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                    Nhập và chỉnh sửa điểm số
                  </p>
                  <button
                    onClick={() => setCurrentPage('grades-manage')}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg"
                  >
                    Truy Cập
                  </button>
                </div>
                
                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl shadow-lg`}>
                  <h3 className="font-semibold mb-2">📅 Điểm Danh</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                    Điểm danh học sinh và QR code
                  </p>
                  <button
                    onClick={() => setCurrentPage('attendance')}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg"
                  >
                    Truy Cập
                  </button>
                </div>
                
                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl shadow-lg`}>
                  <h3 className="font-semibold mb-2">📰 Tin Tức</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                    Quản lý tin tức giáo xứ
                  </p>
                  <button
                    onClick={() => setCurrentPage('news-manage')}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg"
                  >
                    Truy Cập
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : <HomePage />;
      default:
        return <HomePage />;
    }
  };

  if (!initialized) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl">Đang khởi tạo hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      <ThemeContext.Provider value={{ isDark, toggleTheme }}>
        <div className={`min-h-screen transition-all duration-300 ${isDark ? 'dark' : ''}`}>
          <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
          {renderPage()}
        </div>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;