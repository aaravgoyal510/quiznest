const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Password Hashes
  const adminPassword = await bcrypt.hash("Admin123!", 10);
  const teacherPassword = await bcrypt.hash("Teacher123!", 10);
  const studentPassword = await bcrypt.hash("Student123!", 10);

  // 2. Users
  const admin = await prisma.user.upsert({
    where: { email: "admin@institution.edu" },
    update: {},
    create: {
      name: "Dr. Arthur Vance (Admin)",
      email: "admin@institution.edu",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@institution.edu" },
    update: {},
    create: {
      name: "Prof. Sarah Connor",
      email: "teacher@institution.edu",
      passwordHash: teacherPassword,
      role: "TEACHER",
      department: "CSE",
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@institution.edu" },
    update: {},
    create: {
      name: "John Doe",
      email: "student@institution.edu",
      passwordHash: studentPassword,
      role: "STUDENT",
      department: "CSE",
      year: "3rd Year",
    },
  });

  console.log("✅ Users created:");
  console.log("   - Admin: admin@institution.edu (Pass: Admin123!)");
  console.log("   - Teacher: teacher@institution.edu (Pass: Teacher123!)");
  console.log("   - Student: student@institution.edu (Pass: Student123!)");

  // 3. Subject
  const subject = await prisma.subject.upsert({
    where: { code: "CS301" },
    update: {},
    create: {
      name: "Data Structures & Algorithms",
      code: "CS301",
      description: "Advanced algorithms, trees, dynamic programming and complexity analysis.",
      createdById: teacher.id,
    },
  });

  console.log("✅ Subject created: CS301");

  // 4. Questions
  const q1 = await prisma.question.create({
    data: {
      subjectId: subject.id,
      text: "What is the average time complexity of quicksort algorithm?",
      type: "MCQ",
      points: 2,
      createdById: teacher.id,
      options: {
        create: [
          { text: "O(N log N)", isCorrect: true },
          { text: "O(N^2)", isCorrect: false },
          { text: "O(N)", isCorrect: false },
          { text: "O(1)", isCorrect: false },
        ],
      },
    },
  });

  const q2 = await prisma.question.create({
    data: {
      subjectId: subject.id,
      text: "A Binary Search Tree (BST) always guarantees O(log N) lookup in all cases without self-balancing.",
      type: "TRUE_FALSE",
      points: 1,
      createdById: teacher.id,
      options: {
        create: [
          { text: "True", isCorrect: false },
          { text: "False", isCorrect: true },
        ],
      },
    },
  });

  const q3 = await prisma.question.create({
    data: {
      subjectId: subject.id,
      text: "Explain the difference between BFS and DFS traversal strategies.",
      type: "SHORT_ANSWER",
      points: 5,
      createdById: teacher.id,
    },
  });

  console.log("✅ Sample questions created in question bank.");

  // 5. Quiz
  const now = new Date();
  const startsAt = new Date(now.getTime() - 10 * 60 * 1000); // started 10 mins ago
  const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // ends in 24 hours

  const quiz = await prisma.quiz.create({
    data: {
      subjectId: subject.id,
      title: "Mid-Term DSA Assessment",
      description: "Covers QuickSort, BST properties, and Graph traversal algorithms.",
      durationMinutes: 30,
      teacherId: teacher.id,
      startsAt,
      endsAt,
      isPublished: true,
      questions: {
        create: [
          { questionId: q1.id, order: 1 },
          { questionId: q2.id, order: 2 },
          { questionId: q3.id, order: 3 },
        ],
      },
    },
  });

  console.log(`✅ Demo quiz created: "${quiz.title}" (Published and active)`);

  // 6. Audit Log
  await prisma.auditLog.create({
    data: {
      userId: teacher.id,
      action: "CREATE_QUIZ",
      details: `Created and published quiz "${quiz.title}" under CS301.`,
    },
  });

  console.log("🌱 Database seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
