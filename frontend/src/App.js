import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Theme Context
const ThemeContext = React.createContext({
  isDark: false,
  toggleTheme: () => {}
});

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
  
  const navItems = [
    { id: 'home', label: '🏠 Trang Chủ', icon: '🏠' },
    { id: 'search', label: '🔍 Tra Cứu Điểm', icon: '🔍' },
    { id: 'teachers', label: '👨‍🏫 Giáo Lý Viên', icon: '👨‍🏫' },
    { id: 'qr', label: '📱 QR Điểm Danh', icon: '📱' }
  ];
  
  return (
    <nav className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg transition-all duration-300`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⛪</span>
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Quản Lý Giáo Xứ
            </h1>
          </div>
          
          <div className="flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  currentPage === item.id
                    ? isDark 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-blue-500 text-white'
                    : isDark
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">{item.icon}</span>
              </button>
            ))}
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

const HomePage = () => {
  const { isDark } = React.useContext(ThemeContext);
  const [stats, setStats] = useState({});
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, newsRes] = await Promise.all([
          axios.get(`${API}/stats/overview`),
          axios.get(`${API}/news`)
        ]);
        setStats(statsRes.data);
        setNews(newsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
        {/* Hero Section */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 mb-8 transition-all duration-300`}>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              <span className="text-blue-500">⛪</span> Chào Mừng Đến Với Hệ Thống Quản Lý Giáo Xứ
            </h1>
            <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Hệ thống hiện đại để quản lý học sinh, điểm số và hoạt động Giáo lý
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Tổng Học Sinh', value: stats.total_students || 0, icon: '👥', color: 'blue' },
            { label: 'Giáo Lý Viên', value: stats.total_teachers || 0, icon: '👨‍🏫', color: 'green' },
            { label: 'Lớp Học', value: stats.total_classes || 0, icon: '🏫', color: 'yellow' },
            { label: 'Điểm Danh Hôm Nay', value: stats.today_attendance || 0, icon: '✅', color: 'purple' }
          ].map((stat, index) => (
            <div key={index} className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`text-4xl bg-${stat.color}-100 p-3 rounded-full`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* News Section */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8`}>
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="mr-2">📰</span> Tin Tức Giáo Xứ
          </h2>
          <div className="space-y-4">
            {news.map((item) => (
              <div key={item.id} className={`p-4 rounded-lg border-l-4 border-blue-500 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} hover:shadow-md transition-all duration-300`}>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>{item.content}</p>
                <div className="flex justify-between items-center text-sm">
                  <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Bởi: {item.author}</span>
                  <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {new Date(item.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SearchPage = () => {
  const { isDark } = React.useContext(ThemeContext);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentGrades, setStudentGrades] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/students`, {
        params: {
          search: searchTerm || undefined,
          class_name: classFilter || undefined
        }
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentGrades = async (studentId) => {
    try {
      const response = await axios.get(`${API}/grades/student/${studentId}`);
      setStudentGrades(response.data);
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, classFilter]);

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    fetchStudentGrades(student.id);
  };

  const subjectNames = {
    'kinh_thanh': 'Kinh Thánh',
    'giao_ly': 'Giáo Lý',
    'hanh_vi': 'Hạnh Vi',
    'tham_gia': 'Tham Gia'
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 mb-8`}>
          <h1 className="text-3xl font-bold mb-6 flex items-center">
            <span className="mr-2">🔍</span> Tra Cứu Điểm Học Sinh
          </h1>
          
          {/* Search Controls */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Tìm kiếm theo tên</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nhập tên học sinh..."
                className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-800'
                } focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Lọc theo lớp</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-800'
                } focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Tất cả lớp</option>
                <option value="Lớp 1A">Lớp 1A</option>
                <option value="Lớp 2A">Lớp 2A</option>
                <option value="Lớp 3A">Lớp 3A</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Students List */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Danh sách học sinh ({students.length})</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => handleStudentSelect(student)}
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                        selectedStudent?.id === student.id
                          ? isDark ? 'bg-blue-600' : 'bg-blue-500 text-white'
                          : isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{student.name}</h3>
                          <p className={`text-sm ${selectedStudent?.id === student.id ? 'text-gray-200' : isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {student.class_name}
                          </p>
                        </div>
                        <span className="text-2xl">👤</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student Details */}
              <div>
                {selectedStudent ? (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Chi tiết học sinh</h2>
                    <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-6 mb-4`}>
                      <h3 className="text-2xl font-bold mb-2">{selectedStudent.name}</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Lớp:</span>
                          <span className="ml-2 font-medium">{selectedStudent.class_name}</span>
                        </div>
                        <div>
                          <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Phụ huynh:</span>
                          <span className="ml-2 font-medium">{selectedStudent.parent_name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Điện thoại:</span>
                          <span className="ml-2 font-medium">{selectedStudent.phone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {studentGrades && (
                      <div>
                        <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-6 mb-4`}>
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-semibold">Kết quả học tập</h4>
                            <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                              studentGrades.status === 'Lên lớp' 
                                ? 'bg-green-500 text-white' 
                                : 'bg-red-500 text-white'
                            }`}>
                              {studentGrades.status}
                            </div>
                          </div>
                          <div className="text-center mb-4">
                            <div className="text-3xl font-bold text-blue-500">{studentGrades.average}</div>
                            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Điểm trung bình</div>
                          </div>
                        </div>

                        <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-6`}>
                          <h4 className="text-lg font-semibold mb-4">Điểm chi tiết</h4>
                          <div className="space-y-3">
                            {Object.entries(studentGrades.subjects).map(([subject, scores]) => (
                              <div key={subject} className="flex justify-between items-center">
                                <span className="font-medium">{subjectNames[subject] || subject}</span>
                                <div className="flex space-x-2">
                                  {scores.map((score, index) => (
                                    <span key={index} className={`px-3 py-1 rounded-full text-sm ${
                                      score >= 8 ? 'bg-green-500 text-white' :
                                      score >= 6.5 ? 'bg-yellow-500 text-white' :
                                      'bg-red-500 text-white'
                                    }`}>
                                      {score}
                                    </span>
                                  ))}
                                  <span className="font-bold text-blue-500">
                                    TB: {(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">👆</span>
                    <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Chọn một học sinh để xem chi tiết điểm số
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TeachersPage = () => {
  const { isDark } = React.useContext(ThemeContext);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await axios.get(`${API}/teachers`);
        setTeachers(response.data);
      } catch (error) {
        console.error('Error fetching teachers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
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
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8`}>
          <h1 className="text-3xl font-bold mb-6 flex items-center">
            <span className="mr-2">👨‍🏫</span> Đội Ngũ Giáo Lý Viên
          </h1>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teachers.map((teacher) => (
              <div key={teacher.id} className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-6 transform hover:scale-105 transition-all duration-300`}>
                <div className="text-center mb-4">
                  <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl text-white">👨‍🏫</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{teacher.name}</h3>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm ${
                    teacher.role === 'coordinator' ? 'bg-purple-500 text-white' :
                    teacher.role === 'admin' ? 'bg-red-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    {teacher.role === 'coordinator' ? 'Điều phối viên' :
                     teacher.role === 'admin' ? 'Quản trị' : 'Giáo lý viên'}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {teacher.email && (
                    <div className="flex items-center">
                      <span className="text-lg mr-2">📧</span>
                      <span className="text-sm">{teacher.email}</span>
                    </div>
                  )}
                  {teacher.phone && (
                    <div className="flex items-center">
                      <span className="text-lg mr-2">📱</span>
                      <span className="text-sm">{teacher.phone}</span>
                    </div>
                  )}
                  {teacher.classes.length > 0 && (
                    <div className="flex items-start">
                      <span className="text-lg mr-2">🏫</span>
                      <div className="text-sm">
                        {teacher.classes.map((className, index) => (
                          <span key={index} className={`inline-block px-2 py-1 rounded mr-1 mb-1 ${
                            isDark ? 'bg-gray-600' : 'bg-gray-200'
                          }`}>
                            {className}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const QRPage = () => {
  const { isDark } = React.useContext(ThemeContext);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [scanResult, setScanResult] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await axios.get(`${API}/students`);
        setStudents(response.data);
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    fetchStudents();
  }, []);

  const generateQR = async (student) => {
    try {
      const response = await axios.get(`${API}/qr-code/${student.id}`);
      setQrCode(response.data.qr_code);
      setSelectedStudent(student);
    } catch (error) {
      console.error('Error generating QR code:', error);
      showToast('Lỗi tạo mã QR', 'error');
    }
  };

  const handleScanQR = async () => {
    if (!scanResult.trim()) {
      showToast('Vui lòng nhập dữ liệu QR', 'error');
      return;
    }

    try {
      const response = await axios.post(`${API}/scan-qr`, { data: scanResult });
      showToast(`Điểm danh thành công cho ${response.data.student.name}`, 'success');
      setScanResult('');
    } catch (error) {
      console.error('Error scanning QR:', error);
      showToast('Lỗi quét mã QR', 'error');
    }
  };

  const showToast = (message, type) => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      {toastMessage && (
        <Toast 
          message={toastMessage} 
          type={toastType} 
          onClose={() => setToastMessage('')} 
        />
      )}
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 mb-8`}>
          <h1 className="text-3xl font-bold mb-6 flex items-center">
            <span className="mr-2">📱</span> QR Code Điểm Danh
          </h1>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Generate QR Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Tạo mã QR cho học sinh</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Chọn học sinh</label>
                <select
                  value={selectedStudent?.id || ''}
                  onChange={(e) => {
                    const student = students.find(s => s.id === e.target.value);
                    if (student) generateQR(student);
                  }}
                  className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  } focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">Chọn học sinh...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} - {student.class_name}
                    </option>
                  ))}
                </select>
              </div>

              {qrCode && selectedStudent && (
                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6 text-center`}>
                  <h3 className="text-lg font-semibold mb-4">
                    QR Code cho {selectedStudent.name}
                  </h3>
                  <img 
                    src={qrCode} 
                    alt="QR Code" 
                    className="mx-auto mb-4 border-4 border-white rounded-lg"
                  />
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Học sinh có thể scan mã này để điểm danh
                  </p>
                </div>
              )}
            </div>

            {/* Scan QR Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Quét mã QR điểm danh</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Dữ liệu QR Code</label>
                <textarea
                  value={scanResult}
                  onChange={(e) => setScanResult(e.target.value)}
                  placeholder="Paste dữ liệu QR code vào đây hoặc nhập thủ công..."
                  rows="4"
                  className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-800'
                  } focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              <button
                onClick={handleScanQR}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                ✅ Xác Nhận Điểm Danh
              </button>

              <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-blue-50'}`}>
                <h4 className="font-semibold mb-2">💡 Hướng dẫn sử dụng:</h4>
                <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <li>1. Chọn học sinh và tạo mã QR</li>
                  <li>2. Học sinh scan mã QR bằng điện thoại</li>
                  <li>3. Copy dữ liệu QR và paste vào ô trên</li>
                  <li>4. Nhấn "Xác Nhận Điểm Danh"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotFoundPage = () => {
  const { isDark } = React.useContext(ThemeContext);
  
  return (
    <div className={`min-h-screen flex items-center justify-center transition-all duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <div className="text-center">
        <div className="text-9xl mb-4">🤔</div>
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl mb-8">Trang không tìm thấy</p>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-8`}>
          Có vẻ như bạn đã đi lạc. Hãy quay về trang chủ nhé!
        </p>
      </div>
    </div>
  );
};

function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [currentPage, setCurrentPage] = useState('home');
  const [initialized, setInitialized] = useState(false);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('darkMode', JSON.stringify(newTheme));
  };

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
        setInitialized(true); // Still set to true to prevent infinite loading
      }
    };

    if (!initialized) {
      initializeData();
    }
  }, [initialized]);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'search':
        return <SearchPage />;
      case 'teachers':
        return <TeachersPage />;
      case 'qr':
        return <QRPage />;
      default:
        return <NotFoundPage />;
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
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <div className={`min-h-screen transition-all duration-300 ${isDark ? 'dark' : ''}`}>
        <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
        {renderPage()}
      </div>
    </ThemeContext.Provider>
  );
}

export default App;