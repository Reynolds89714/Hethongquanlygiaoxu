from fastapi import FastAPI, APIRouter, HTTPException, Query
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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class Student(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    class_name: str
    birth_date: Optional[str] = None
    parent_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class StudentCreate(BaseModel):
    name: str
    class_name: str
    birth_date: Optional[str] = None
    parent_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class Grade(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    student_name: str
    class_name: str
    subject: str  # "kinh_thanh", "giao_ly", "hanh_vi", "tham_gia"
    score: float
    max_score: float = 10.0
    date: datetime = Field(default_factory=datetime.utcnow)
    semester: str = "HK1"  # HK1, HK2
    year: str = "2024-2025"

class GradeCreate(BaseModel):
    student_id: str
    subject: str
    score: float
    max_score: float = 10.0
    semester: str = "HK1"
    year: str = "2024-2025"

class Attendance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    student_name: str
    class_name: str
    date: datetime = Field(default_factory=datetime.utcnow)
    status: str = "present"  # present, absent, late
    method: str = "manual"   # manual, qr_code

class AttendanceCreate(BaseModel):
    student_id: str
    status: str = "present"
    method: str = "manual"

class Teacher(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    classes: List[str] = []
    role: str = "teacher"  # teacher, coordinator, admin
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TeacherCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    classes: List[str] = []
    role: str = "teacher"

class News(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    author: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    published: bool = True

class NewsCreate(BaseModel):
    title: str
    content: str
    author: str
    published: bool = True


# Student Routes
@api_router.post("/students", response_model=Student)
async def create_student(student: StudentCreate):
    student_dict = student.dict()
    student_obj = Student(**student_dict)
    await db.students.insert_one(student_obj.dict())
    return student_obj

@api_router.get("/students", response_model=List[Student])
async def get_students(class_name: Optional[str] = Query(None), search: Optional[str] = Query(None)):
    query = {}
    if class_name:
        query["class_name"] = class_name
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"class_name": {"$regex": search, "$options": "i"}}
        ]
    
    students = await db.students.find(query).to_list(1000)
    return [Student(**student) for student in students]

@api_router.get("/students/{student_id}", response_model=Student)
async def get_student(student_id: str):
    student = await db.students.find_one({"id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return Student(**student)

# Grade Routes
@api_router.post("/grades", response_model=Grade)
async def create_grade(grade: GradeCreate):
    # Get student info
    student = await db.students.find_one({"id": grade.student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    grade_dict = grade.dict()
    grade_dict["student_name"] = student["name"]
    grade_dict["class_name"] = student["class_name"]
    grade_obj = Grade(**grade_dict)
    await db.grades.insert_one(grade_obj.dict())
    return grade_obj

@api_router.get("/grades/student/{student_id}")
async def get_student_grades(student_id: str):
    grades_cursor = db.grades.find({"student_id": student_id})
    grades = await grades_cursor.to_list(1000)
    
    # Convert ObjectId to string and clean up data
    cleaned_grades = []
    for grade in grades:
        if "_id" in grade:
            del grade["_id"]  # Remove MongoDB ObjectId
        cleaned_grades.append(grade)
    
    # Calculate average and status
    total_score = 0
    count = 0
    subjects = {}
    
    for grade in cleaned_grades:
        total_score += grade["score"]
        count += 1
        subject = grade["subject"]
        if subject not in subjects:
            subjects[subject] = []
        subjects[subject].append(grade["score"])
    
    average = total_score / count if count > 0 else 0
    
    # Determine pass status (>= 6.5 average and all subjects >= 5)
    pass_status = "Lên lớp"
    if average < 6.5:
        pass_status = "Học lại"
    
    for subject, scores in subjects.items():
        subject_avg = sum(scores) / len(scores)
        if subject_avg < 5.0:
            pass_status = "Học lại"
            break
    
    return {
        "grades": cleaned_grades,
        "average": round(average, 2),
        "status": pass_status,
        "subjects": subjects
    }

# Attendance Routes
@api_router.post("/attendance", response_model=Attendance)
async def create_attendance(attendance: AttendanceCreate):
    # Get student info
    student = await db.students.find_one({"id": attendance.student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    attendance_dict = attendance.dict()
    attendance_dict["student_name"] = student["name"]
    attendance_dict["class_name"] = student["class_name"]
    attendance_obj = Attendance(**attendance_dict)
    await db.attendance.insert_one(attendance_obj.dict())
    return attendance_obj

@api_router.get("/attendance/student/{student_id}")
async def get_student_attendance(student_id: str):
    attendance_cursor = db.attendance.find({"student_id": student_id})
    attendance_records = await attendance_cursor.to_list(1000)
    
    # Clean up ObjectId
    cleaned_records = []
    for record in attendance_records:
        if "_id" in record:
            del record["_id"]
        cleaned_records.append(record)
    
    return cleaned_records

# QR Code Routes
@api_router.get("/qr-code/{student_id}")
async def generate_qr_code(student_id: str):
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
async def scan_qr_attendance(qr_data: dict):
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
        
        # Create attendance record
        attendance_obj = Attendance(
            student_id=student_id,
            student_name=student["name"],
            class_name=student["class_name"],
            status="present",
            method="qr_code"
        )
        await db.attendance.insert_one(attendance_obj.dict())
        
        return {"message": "Điểm danh thành công", "student": student}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing QR code: {str(e)}")

# Teacher Routes
@api_router.post("/teachers", response_model=Teacher)
async def create_teacher(teacher: TeacherCreate):
    teacher_dict = teacher.dict()
    teacher_obj = Teacher(**teacher_dict)
    await db.teachers.insert_one(teacher_obj.dict())
    return teacher_obj

@api_router.get("/teachers", response_model=List[Teacher])
async def get_teachers():
    teachers = await db.teachers.find().to_list(1000)
    return [Teacher(**teacher) for teacher in teachers]

# News Routes
@api_router.post("/news", response_model=News)
async def create_news(news: NewsCreate):
    news_dict = news.dict()
    news_obj = News(**news_dict)
    await db.news.insert_one(news_obj.dict())
    return news_obj

@api_router.get("/news", response_model=List[News])
async def get_news():
    news_list = await db.news.find({"published": True}).sort("created_at", -1).to_list(100)
    return [News(**news) for news in news_list]

# Statistics Routes
@api_router.get("/stats/overview")
async def get_overview_stats():
    total_students = await db.students.count_documents({})
    total_teachers = await db.teachers.count_documents({})
    total_classes = len(await db.students.distinct("class_name"))
    
    # Get recent attendance
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_attendance = await db.attendance.count_documents({"date": {"$gte": today}})
    
    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "today_attendance": today_attendance
    }

# Initialize sample data
@api_router.post("/init-sample-data")
async def initialize_sample_data():
    # Check if data already exists
    student_count = await db.students.count_documents({})
    if student_count > 0:
        return {"message": "Sample data already exists"}
    
    # Sample students
    sample_students = [
        {"name": "Nguyễn Văn An", "class_name": "Lớp 1A", "parent_name": "Nguyễn Văn Nam", "phone": "0123456789"},
        {"name": "Trần Thị Bình", "class_name": "Lớp 1A", "parent_name": "Trần Văn Bách", "phone": "0987654321"},
        {"name": "Lê Văn Cường", "class_name": "Lớp 2A", "parent_name": "Lê Thị Cúc", "phone": "0123987456"},
        {"name": "Phạm Thị Dung", "class_name": "Lớp 2A", "parent_name": "Phạm Văn Đức", "phone": "0987123456"},
        {"name": "Hoàng Văn Em", "class_name": "Lớp 3A", "parent_name": "Hoàng Thị Hoa", "phone": "0123456987"},
    ]
    
    # Insert students
    for student_data in sample_students:
        student_obj = Student(**student_data)
        await db.students.insert_one(student_obj.dict())
        
        # Add sample grades
        subjects = ["kinh_thanh", "giao_ly", "hanh_vi", "tham_gia"]
        for subject in subjects:
            grade_obj = Grade(
                student_id=student_obj.id,
                student_name=student_obj.name,
                class_name=student_obj.class_name,
                subject=subject,
                score=float(7 + (hash(student_obj.id + subject) % 3))  # Random score 7-9
            )
            await db.grades.insert_one(grade_obj.dict())
    
    # Sample teachers
    sample_teachers = [
        {"name": "Thầy Phêrô Nguyễn", "email": "pedro@giaoxu.com", "classes": ["Lớp 1A"], "role": "teacher"},
        {"name": "Cô Maria Trần", "email": "maria@giaoxu.com", "classes": ["Lớp 2A"], "role": "teacher"},
        {"name": "Thầy Phao-lô Lê", "email": "paulo@giaoxu.com", "classes": ["Lớp 3A"], "role": "coordinator"},
    ]
    
    for teacher_data in sample_teachers:
        teacher_obj = Teacher(**teacher_data)
        await db.teachers.insert_one(teacher_obj.dict())
    
    # Sample news
    sample_news = [
        {
            "title": "Thông báo khai giảng năm học mới 2024-2025",
            "content": "Giáo xứ thông báo lịch khai giảng năm học Giáo lý 2024-2025 vào ngày Chủ nhật 15/9/2024. Kính mời các em học sinh và phụ huynh tham dự.",
            "author": "Ban Giáo lý"
        },
        {
            "title": "Lễ Thánh Giuse thợ 19/3",
            "content": "Giáo xứ sẽ tổ chức Lễ Thánh Giuse thợ vào ngày 19/3. Chương trình gồm Thánh lễ và các hoạt động văn nghệ.",
            "author": "Ban Tổ chức"
        }
    ]
    
    for news_data in sample_news:
        news_obj = News(**news_data)
        await db.news.insert_one(news_obj.dict())
    
    return {"message": "Sample data initialized successfully"}

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Parish Management System API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()