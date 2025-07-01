from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017')
db = client['test_database']

# Check users collection
print('Users collection:')
users = list(db.users.find())
for user in users:
    print(user)

print(f"\nTotal users: {len(users)}")

# Check students collection
print('\nStudents collection:')
students = list(db.students.find())
for student in students:
    print(student)

print(f"\nTotal students: {len(students)}")

# Check news collection
print('\nNews collection:')
news = list(db.news.find())
for item in news:
    print(item)

print(f"\nTotal news items: {len(news)}")