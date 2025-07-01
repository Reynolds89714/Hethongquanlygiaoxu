from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date
import qrcode
import base64
from io import BytesIO
import jwt
from passlib.hash import bcrypt
import secrets
import string


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
JWT_SECRET = "phuly_parish_secret_key_2024"
JWT_ALGORITHM = "HS256"

# Create the main app
app = FastAPI(title="Giáo Xứ Phú Lý - Hệ Thống Quản Lý")
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Auth Models
class UserLogin(BaseModel):
    username: str
    password: str

class ParentLogin(BaseModel):
    phone: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_type: str
    user_info: dict

# Student Models
class Student(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    class_name: str
    birth_date: Optional[str] = None
    parent_name: str
    parent_phone: str
    parent_password: str  # Password for parent login
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class StudentCreate(BaseModel):
    name: str
    class_name: str
    birth_date: Optional[str] = None
    parent_name: str
    parent_phone: str
    address: Optional[str] = None

# Grade Models with Excel-like structure
class Grade(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    student_name: str
    class_name: str
    year: str = "2024-2025"
    semester: int = 1  # 1 or 2
    # Excel columns: TX1, TX2, TX3, TX4, GK (Giữa Kỳ), CK (Cuối Kỳ)
    tx1: Optional[float] = None
    tx2: Optional[float] = None
    tx3: Optional[float] = None
    tx4: Optional[float] = None
    gk: Optional[float] = None  # Giữa kỳ
    ck: Optional[float] = None  # Cuối kỳ
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GradeUpdate(BaseModel):
    tx1: Optional[float] = None
    tx2: Optional[float] = None
    tx3: Optional[float] = None
    tx4: Optional[float] = None
    gk: Optional[float] = None
    ck: Optional[float] = None

# Attendance Models
class Attendance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    student_name: str
    class_name: str
    date: str  # YYYY-MM-DD format
    status: str = "present"  # present, absent_with_permission, absent_without_permission
    method: str = "manual"   # manual, qr_code
    note: Optional[str] = None
    recorded_by: str  # teacher username
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AttendanceCreate(BaseModel):
    student_id: str
    date: str
    status: str = "present"
    method: str = "manual"
    note: Optional[str] = None

# User Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    full_name: str
    role: str  # admin, teacher
    classes: List[str] = []  # Classes this teacher manages
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "teacher"
    classes: List[str] = []

# News Models
class News(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    author: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    published: bool = True

class NewsCreate(BaseModel):
    title: str
    content: str
    author: str
    published: bool = True

# Auth functions
def create_access_token(data: dict):
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_password(length=8):
    """Generate random password for parents"""
    characters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))

# Auth endpoints
@api_router.post("/auth/teacher-login", response_model=TokenResponse)
async def teacher_login(login_data: UserLogin):
    user = await db.users.find_one({"username": login_data.username})
    if not user or not bcrypt.verify(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Clean up ObjectId
    if "_id" in user:
        del user["_id"]
    
    token_data = {
        "user_id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "user_type": "teacher"
    }
    
    token = create_access_token(token_data)
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_type="teacher",
        user_info=user
    )

@api_router.post("/auth/parent-login", response_model=TokenResponse)
async def parent_login(login_data: ParentLogin):
    student = await db.students.find_one({
        "parent_phone": login_data.phone,
        "parent_password": login_data.password
    })
    
    if not student:
        raise HTTPException(status_code=401, detail="Số điện thoại hoặc mật khẩu không đúng")
    
    # Clean up ObjectId
    if "_id" in student:
        del student["_id"]
    
    token_data = {
        "student_id": student["id"],
        "parent_phone": student["parent_phone"],
        "user_type": "parent"
    }
    
    token = create_access_token(token_data)
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_type="parent",
        user_info={
            "student": student,
            "parent_name": student["parent_name"],
            "parent_phone": student["parent_phone"]
        }
    )

# Student endpoints
@api_router.post("/students", response_model=Student)
async def create_student(student: StudentCreate, token_data: dict = Depends(verify_token)):
    if token_data["user_type"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create students")
    
    # Generate password for parent
    parent_password = generate_password()
    
    student_dict = student.dict()
    student_dict["parent_password"] = parent_password
    student_obj = Student(**student_dict)
    
    await db.students.insert_one(student_obj.dict())
    return student_obj

@api_router.get("/students", response_model=List[Student])
async def get_students(
    class_name: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    token_data: dict = Depends(verify_token)
):
    if token_data["user_type"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access student list")
    
    query = {}
    if class_name:
        query["class_name"] = class_name
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"class_name": {"$regex": search, "$options": "i"}},
            {"parent_name": {"$regex": search, "$options": "i"}}
        ]
    
    students_cursor = db.students.find(query)
    students = await students_cursor.to_list(1000)
    
    # Clean up ObjectId
    cleaned_students = []
    for student in students:
        if "_id" in student:
            del student["_id"]
        cleaned_students.append(Student(**student))
    
    return cleaned_students

@api_router.put("/students/{student_id}")
async def update_student(
    student_id: str,
    student_update: StudentCreate,
    token_data: dict = Depends(verify_token)
):
    if token_data["user_type"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update students")
    
    result = await db.students.update_one(
        {"id": student_id},
        {"$set": student_update.dict(exclude_unset=True)}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return {"message": "Student updated successfully"}

# Grade endpoints
@api_router.get("/grades/student/{student_id}")
async def get_student_grades(student_id: str, token_data: dict = Depends(verify_token)):
    # Allow both teachers and parents (if it's their child)
    if token_data["user_type"] == "parent":
        if token_data["student_id"] != student_id:
            raise HTTPException(status_code=403, detail="Parents can only view their own child's grades")
    elif token_data["user_type"] != "teacher":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get student info
    student = await db.students.find_one({"id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Clean up ObjectId
    if "_id" in student:
        del student["_id"]
    
    # Get grades for both semesters
    grades_cursor = db.grades.find({"student_id": student_id})
    grades = await grades_cursor.to_list(1000)
    
    # Clean up ObjectId and organize by semester
    semester_1 = None
    semester_2 = None
    
    for grade in grades:
        if "_id" in grade:
            del grade["_id"]
        
        if grade["semester"] == 1:
            semester_1 = grade
        elif grade["semester"] == 2:
            semester_2 = grade
    
    # Calculate averages and final result
    def calculate_semester_average(grade_record):
        if not grade_record:
            return 0
        
        scores = []
        # TX scores (if available)
        for tx in [grade_record.get("tx1"), grade_record.get("tx2"), 
                   grade_record.get("tx3"), grade_record.get("tx4")]:
            if tx is not None:
                scores.append(tx)
        
        gk = grade_record.get("gk")
        ck = grade_record.get("ck")
        
        if not scores and not gk and not ck:
            return 0
        
        # Calculate average: TX average + GK*2 + CK*3 / 6
        tx_avg = sum(scores) / len(scores) if scores else 0
        
        total_weight = 0
        total_score = 0
        
        if scores:
            total_score += tx_avg * 1
            total_weight += 1
        
        if gk is not None:
            total_score += gk * 2
            total_weight += 2
        
        if ck is not None:
            total_score += ck * 3
            total_weight += 3
        
        return total_score / total_weight if total_weight > 0 else 0
    
    sem1_avg = calculate_semester_average(semester_1)
    sem2_avg = calculate_semester_average(semester_2)
    
    # Final average
    final_avg = (sem1_avg + sem2_avg) / 2 if sem1_avg > 0 and sem2_avg > 0 else max(sem1_avg, sem2_avg)
    
    # Determine status
    status = "Lên lớp" if final_avg >= 6.5 else "Học lại"
    
    return {
        "student": student,
        "semester_1": semester_1,
        "semester_2": semester_2,
        "semester_1_average": round(sem1_avg, 2),
        "semester_2_average": round(sem2_avg, 2),
        "final_average": round(final_avg, 2),
        "status": status
    }

@api_router.put("/grades/student/{student_id}/semester/{semester}")
async def update_grades(
    student_id: str,
    semester: int,
    grade_update: GradeUpdate,
    token_data: dict = Depends(verify_token)
):
    if token_data["user_type"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update grades")
    
    # Get student info
    student = await db.students.find_one({"id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Check if grade record exists
    existing_grade = await db.grades.find_one({
        "student_id": student_id,
        "semester": semester
    })
    
    if existing_grade:
        # Update existing record
        await db.grades.update_one(
            {"student_id": student_id, "semester": semester},
            {"$set": grade_update.dict(exclude_unset=True)}
        )
    else:
        # Create new record
        grade_dict = grade_update.dict(exclude_unset=True)
        grade_dict.update({
            "student_id": student_id,
            "student_name": student["name"],
            "class_name": student["class_name"],
            "semester": semester
        })
        grade_obj = Grade(**grade_dict)
        await db.grades.insert_one(grade_obj.dict())
    
    return {"message": "Grades updated successfully"}

# Attendance endpoints
@api_router.get("/attendance/class/{class_name}")
async def get_class_attendance(
    class_name: str,
    date: Optional[str] = Query(None),
    token_data: dict = Depends(verify_token)
):
    if token_data["user_type"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view attendance")
    
    # Get all students in class
    students_cursor = db.students.find({"class_name": class_name})
    students = await students_cursor.to_list(1000)
    
    query = {"class_name": class_name}
    if date:
        query["date"] = date
    
    # Get attendance records
    attendance_cursor = db.attendance.find(query)
    attendance_records = await attendance_cursor.to_list(1000)
    
    # Clean up ObjectId
    for record in attendance_records:
        if "_id" in record:
            del record["_id"]
    
    # Create attendance matrix
    attendance_dict = {}
    for record in attendance_records:
        key = f"{record['student_id']}_{record['date']}"
        attendance_dict[key] = record
    
    return {
        "students": students,
        "attendance_records": attendance_records,
        "class_name": class_name,
        "date": date
    }

@api_router.post("/attendance")
async def create_attendance(
    attendance: AttendanceCreate,
    token_data: dict = Depends(verify_token)
):
    if token_data["user_type"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can mark attendance")
    
    # Get student info
    student = await db.students.find_one({"id": attendance.student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Check if attendance already exists for this date
    existing = await db.attendance.find_one({
        "student_id": attendance.student_id,
        "date": attendance.date
    })
    
    if existing:
        # Update existing
        await db.attendance.update_one(
            {"student_id": attendance.student_id, "date": attendance.date},
            {"$set": {
                "status": attendance.status,
                "method": attendance.method,
                "note": attendance.note,
                "recorded_by": token_data["username"]
            }}
        )
    else:
        # Create new
        attendance_dict = attendance.dict()
        attendance_dict.update({
            "student_name": student["name"],
            "class_name": student["class_name"],
            "recorded_by": token_data["username"]
        })
        attendance_obj = Attendance(**attendance_dict)
        await db.attendance.insert_one(attendance_obj.dict())
    
    return {"message": "Attendance recorded successfully"}

# QR Code endpoints
@api_router.get("/qr-code/{student_id}")
async def generate_qr_code(student_id: str, token_data: dict = Depends(verify_token)):
    if token_data["user_type"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can generate QR codes")
    
    student = await db.students.find_one({"id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Clean up ObjectId
    if "_id" in student:
        del student["_id"]
    
    # Generate QR code data
    qr_data = f"STUDENT:{student_id}:{student['name']}"
    
    # Create QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return {
        "qr_code": f"data:image/png;base64,{img_str}",
        "student": student
    }

@api_router.post("/scan-qr")
async def scan_qr_attendance(qr_data: dict, token_data: dict = Depends(verify_token)):
    if token_data["user_type"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can scan QR codes")
    
    try:
        data = qr_data.get("data", "")
        if not data.startswith("STUDENT:"):
            raise HTTPException(status_code=400, detail="Invalid QR code")
        
        parts = data.split(":")
        student_id = parts[1]
        
        # Check if student exists
        student = await db.students.find_one({"id": student_id})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Clean up ObjectId
        if "_id" in student:
            del student["_id"]
        
        # Create attendance record for today
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Check if already marked today
        existing = await db.attendance.find_one({
            "student_id": student_id,
            "date": today
        })
        
        if existing:
            return {"message": "Đã điểm danh hôm nay", "student": student}
        
        # Create attendance record
        attendance_obj = Attendance(
            student_id=student_id,
            student_name=student["name"],
            class_name=student["class_name"],
            date=today,
            status="present",
            method="qr_code",
            recorded_by=token_data["username"]
        )
        await db.attendance.insert_one(attendance_obj.dict())
        
        return {"message": f"Điểm danh thành công cho {student['name']}", "student": student}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing QR code: {str(e)}")

# News endpoints
@api_router.get("/news", response_model=List[News])
async def get_news():
    news_cursor = db.news.find({"published": True}).sort("created_at", -1)
    news_list = await news_cursor.to_list(100)
    
    # Clean up ObjectId
    cleaned_news = []
    for news in news_list:
        if "_id" in news:
            del news["_id"]
        cleaned_news.append(News(**news))
    
    return cleaned_news

@api_router.post("/news", response_model=News)
async def create_news(news: NewsCreate, token_data: dict = Depends(verify_token)):
    if token_data["user_type"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create news")
    
    news_obj = News(**news.dict())
    await db.news.insert_one(news_obj.dict())
    return news_obj

# Statistics endpoints
@api_router.get("/stats/overview")
async def get_overview_stats():
    total_students = await db.students.count_documents({})
    total_teachers = await db.users.count_documents({"role": {"$in": ["teacher", "admin"]}})
    total_classes = len(await db.students.distinct("class_name"))
    
    # Get today's attendance
    today = datetime.now().strftime("%Y-%m-%d")
    today_attendance = await db.attendance.count_documents({"date": today, "status": "present"})
    
    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "today_attendance": today_attendance
    }

# Initialize data
@api_router.post("/init-sample-data")
async def initialize_sample_data():
    # Check if data already exists
    student_count = await db.students.count_documents({})
    if student_count > 0:
        return {"message": "Sample data already exists"}
    
    # Create admin user
    admin_password_hash = bcrypt.hash("admin123")
    admin_user = User(
        username="admin",
        password_hash=admin_password_hash,
        full_name="Quản Trị Viên",
        role="admin"
    )
    await db.users.insert_one(admin_user.dict())
    
    # Create sample teachers
    teachers = [
        {"username": "glv_pedro", "password": "pedro123", "full_name": "Thầy Phêrô Nguyễn", "classes": ["Lớp 1A"]},
        {"username": "glv_maria", "password": "maria123", "full_name": "Cô Maria Trần", "classes": ["Lớp 2A"]},
        {"username": "glv_paulo", "password": "paulo123", "full_name": "Thầy Phao-lô Lê", "classes": ["Lớp 3A"]},
    ]
    
    for teacher_data in teachers:
        password_hash = bcrypt.hash(teacher_data["password"])
        teacher = User(
            username=teacher_data["username"],
            password_hash=password_hash,
            full_name=teacher_data["full_name"],
            role="teacher",
            classes=teacher_data["classes"]
        )
        await db.users.insert_one(teacher.dict())
    
    # Create sample students with parent passwords
    students = [
        {"name": "Nguyễn Văn An", "class_name": "Lớp 1A", "parent_name": "Nguyễn Văn Nam", "parent_phone": "0123456789"},
        {"name": "Trần Thị Bình", "class_name": "Lớp 1A", "parent_name": "Trần Văn Bách", "parent_phone": "0987654321"},
        {"name": "Lê Văn Cường", "class_name": "Lớp 2A", "parent_name": "Lê Thị Cúc", "parent_phone": "0123987456"},
        {"name": "Phạm Thị Dung", "class_name": "Lớp 2A", "parent_name": "Phạm Văn Đức", "parent_phone": "0987123456"},
        {"name": "Hoàng Văn Em", "class_name": "Lớp 3A", "parent_name": "Hoàng Thị Hoa", "parent_phone": "0123456987"},
    ]
    
    for student_data in students:
        parent_password = generate_password()
        student_data["parent_password"] = parent_password
        student_obj = Student(**student_data)
        await db.students.insert_one(student_obj.dict())
        
        # Create sample grades for both semesters
        for semester in [1, 2]:
            grade_obj = Grade(
                student_id=student_obj.id,
                student_name=student_obj.name,
                class_name=student_obj.class_name,
                semester=semester,
                tx1=7.5, tx2=8.0, tx3=7.0, tx4=8.5,
                gk=8.0, ck=7.5
            )
            await db.grades.insert_one(grade_obj.dict())
    
    # Create sample news
    news_items = [
        {
            "title": "Thông báo khai giảng năm học mới 2024-2025",
            "content": "Giáo Xứ Phú Lý thông báo lịch khai giảng năm học Giáo lý 2024-2025 vào ngày Chủ nhật 15/9/2024. Kính mời các em học sinh và phụ huynh tham dự.",
            "author": "Ban Giáo lý"
        },
        {
            "title": "Lễ Thánh Giuse thợ 19/3",
            "content": "Giáo Xứ Phú Lý sẽ tổ chức Lễ Thánh Giuse thợ vào ngày 19/3. Chương trình gồm Thánh lễ và các hoạt động văn nghệ.",
            "author": "Ban Tổ chức"
        }
    ]
    
    for news_data in news_items:
        news_obj = News(**news_data)
        await db.news.insert_one(news_obj.dict())
    
    return {"message": "Sample data initialized successfully"}

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Giáo Xứ Phú Lý - Hệ Thống Quản Lý API"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()