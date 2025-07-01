import requests
import sys
import time
from datetime import datetime

class ParishManagementAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.student_id = None
        self.token = None
        self.user_type = None
        self.parent_phone = None
        self.parent_password = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, auth=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Add authorization header if token is available and auth is required
        if auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                return success, response.json() if response.content else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "api",
            200
        )
        return success

    def test_teacher_login(self, username="admin", password="admin123"):
        """Test teacher login"""
        success, response = self.run_test(
            "Teacher Login",
            "POST",
            "api/auth/teacher-login",
            200,
            data={"username": username, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_type = response['user_type']
            print(f"Logged in as {username} with role: {response['user_info']['role']}")
            return True
        return False

    def test_parent_login(self):
        """Test parent login"""
        if not self.parent_phone or not self.parent_password:
            print("❌ No parent credentials available for testing")
            return False
            
        success, response = self.run_test(
            "Parent Login",
            "POST",
            "api/auth/parent-login",
            200,
            data={"phone": self.parent_phone, "password": self.parent_password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_type = response['user_type']
            print(f"Logged in as parent for student: {response['user_info']['student']['name']}")
            self.student_id = response['user_info']['student']['id']
            return True
        return False

    def test_init_sample_data(self):
        """Test initializing sample data"""
        success, response = self.run_test(
            "Initialize Sample Data",
            "POST",
            "api/init-sample-data",
            200
        )
        return success

    def test_get_students(self):
        """Test getting all students"""
        success, response = self.run_test(
            "Get All Students",
            "GET",
            "api/students",
            200
        )
        if success and len(response) > 0:
            self.student_id = response[0]['id']
            print(f"Found student ID: {self.student_id}")
        return success

    def test_get_students_with_filter(self):
        """Test getting students with filter"""
        success, response = self.run_test(
            "Get Students with Filter",
            "GET",
            "api/students",
            200,
            params={"class_name": "Lớp 1A"}
        )
        if success:
            print(f"Found {len(response)} students in Lớp 1A")
        return success

    def test_get_students_with_search(self):
        """Test getting students with search"""
        success, response = self.run_test(
            "Get Students with Search",
            "GET",
            "api/students",
            200,
            params={"search": "Nguyễn"}
        )
        if success:
            print(f"Found {len(response)} students matching 'Nguyễn'")
        return success

    def test_get_student_by_id(self):
        """Test getting a student by ID"""
        if not self.student_id:
            print("❌ No student ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Student by ID",
            "GET",
            f"api/students/{self.student_id}",
            200
        )
        if success:
            print(f"Student name: {response['name']}")
        return success

    def test_get_student_grades(self):
        """Test getting student grades"""
        if not self.student_id:
            print("❌ No student ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Student Grades",
            "GET",
            f"api/grades/student/{self.student_id}",
            200
        )
        if success:
            print(f"Student average: {response['average']}, Status: {response['status']}")
            print(f"Subjects: {list(response['subjects'].keys())}")
        return success

    def test_get_teachers(self):
        """Test getting all teachers"""
        success, response = self.run_test(
            "Get All Teachers",
            "GET",
            "api/teachers",
            200
        )
        if success:
            print(f"Found {len(response)} teachers")
        return success

    def test_get_news(self):
        """Test getting news"""
        success, response = self.run_test(
            "Get News",
            "GET",
            "api/news",
            200
        )
        if success:
            print(f"Found {len(response)} news items")
        return success

    def test_get_stats(self):
        """Test getting overview stats"""
        success, response = self.run_test(
            "Get Overview Stats",
            "GET",
            "api/stats/overview",
            200
        )
        if success:
            print(f"Stats: {response}")
        return success

    def test_generate_qr_code(self):
        """Test generating QR code"""
        if not self.student_id:
            print("❌ No student ID available for testing")
            return False
            
        success, response = self.run_test(
            "Generate QR Code",
            "GET",
            f"api/qr-code/{self.student_id}",
            200
        )
        if success:
            print(f"QR code generated for student: {response['student']['name']}")
            # Check if QR code data is present
            if 'qr_code' in response and response['qr_code'].startswith('data:image/png;base64,'):
                print("QR code data is valid")
            else:
                print("❌ QR code data is invalid")
                return False
        return success

    def test_scan_qr(self):
        """Test scanning QR code"""
        if not self.student_id:
            print("❌ No student ID available for testing")
            return False
            
        # Create QR data in the format expected by the API
        qr_data = f"STUDENT:{self.student_id}:Test Student"
        
        success, response = self.run_test(
            "Scan QR Code",
            "POST",
            "api/scan-qr",
            200,
            data={"data": qr_data}
        )
        if success:
            print(f"QR scan result: {response['message']}")
        return success

def main():
    # Get the backend URL from the frontend .env file
    backend_url = "https://cff936e5-49ae-4024-a347-0f09f659396d.preview.emergentagent.com"
    
    print(f"Testing API at: {backend_url}")
    
    # Setup tester
    tester = ParishManagementAPITester(backend_url)
    
    # Run tests - focusing on the fixed endpoints first
    print("\n🔍 TESTING FIXED ENDPOINTS FOR MONGODB OBJECTID SERIALIZATION:")
    fixed_tests = [
        tester.test_init_sample_data,
        tester.test_get_students,
        tester.test_get_student_grades,
        tester.test_generate_qr_code,
        tester.test_scan_qr
    ]
    
    # Run fixed tests
    for test in fixed_tests:
        test()
        time.sleep(0.5)  # Small delay between tests
    
    # Run remaining tests
    print("\n🔍 TESTING OTHER ENDPOINTS:")
    other_tests = [
        tester.test_root_endpoint,
        tester.test_get_students_with_filter,
        tester.test_get_students_with_search,
        tester.test_get_student_by_id,
        tester.test_get_teachers,
        tester.test_get_news,
        tester.test_get_stats
    ]
    
    # Run all other tests
    for test in other_tests:
        test()
        time.sleep(0.5)  # Small delay between tests
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())