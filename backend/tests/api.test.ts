import request from "supertest";
import { app } from "../src/server";
import { prisma } from "../src/db";
import bcrypt from "bcryptjs";

describe("QuizNest Backend API Critical Path Tests", () => {
  let studentToken = "";
  let teacherToken = "";
  let adminToken = "";
  let testStudentId = "";
  let testTeacherId = "";
  let testAdminId = "";
  let testSubjectId = "";
  let testQuizId = "";
  let testQuestionId = "";
  let testOptionId = "";
  let testAttemptId = "";
  let activeSessionToken = "";

  beforeAll(async () => {
    // 1. Initial Teardown to guarantee clean start
    await prisma.passwordResetToken.deleteMany({
      where: { email: { in: ["test-api-student@test.com", "test-api-teacher@test.com", "test-api-admin@test.com"] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["test-api-student@test.com", "test-api-teacher@test.com", "test-api-admin@test.com"] } },
    });
    await prisma.subject.deleteMany({
      where: { code: "TJS101" },
    });

    // 2. Hash password
    const passwordHash = await bcrypt.hash("Password123!", 10);

    // 3. Create teacher and student
    const teacher = await prisma.user.create({
      data: {
        name: "Test API Teacher",
        email: "test-api-teacher@test.com",
        passwordHash,
        role: "TEACHER",
      },
    });
    testTeacherId = teacher.id;

    const student = await prisma.user.create({
      data: {
        name: "Test API Student",
        email: "test-api-student@test.com",
        passwordHash,
        role: "STUDENT",
        department: "CSE",
        year: "3rd Year",
      },
    });
    testStudentId = student.id;

    const admin = await prisma.user.create({
      data: {
        name: "Test API Admin",
        email: "test-api-admin@test.com",
        passwordHash,
        role: "ADMIN",
      },
    });
    testAdminId = admin.id;

    // 4. Create Subject course
    const subject = await prisma.subject.create({
      data: {
        name: "Test Jest Subject",
        code: "TJS101",
        createdById: testTeacherId,
      },
    });
    testSubjectId = subject.id;

    // 5. Create Quiz assessment with questions in one nested query
    const quiz = await prisma.quiz.create({
      data: {
        title: "Jest Test Assessment",
        description: "Deliberate automated testing quiz",
        durationMinutes: 10,
        startsAt: new Date(Date.now() - 1000 * 60 * 10), // Started 10 Mins ago
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 2), // Ends in 2 hours
        subjectId: testSubjectId,
        teacherId: testTeacherId,
        isPublished: true,
        questions: {
          create: [
            {
              text: "What is the capital of France?",
              type: "MCQ",
              points: 5,
              options: {
                create: [
                  { text: "Paris", isCorrect: true },
                  { text: "London", isCorrect: false },
                ],
              },
            },
          ],
        },
      },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });
    testQuizId = quiz.id;
    testQuestionId = quiz.questions[0].id;
    testOptionId = quiz.questions[0].options.find(o => o.text === "Paris")!.id; // The correct answer Paris
  });

  afterAll(async () => {
    // Cascade delete ensures everything linked (attempts, answers, questions) is purged
    await prisma.subject.deleteMany({
      where: { id: testSubjectId },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testStudentId, testTeacherId, testAdminId] } },
    });
    await prisma.$disconnect();
  });

  describe("Authentication Endpoints", () => {
    it("should reject login requests with invalid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "test-api-student@test.com", password: "WrongPassword!" });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });

    it("should accept valid credentials and return a signed JWT", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "test-api-student@test.com", password: "Password123!" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      studentToken = res.body.token;

      const resTeacher = await request(app)
        .post("/api/auth/login")
        .send({ email: "test-api-teacher@test.com", password: "Password123!" });
      teacherToken = resTeacher.body.token;

      const resAdmin = await request(app)
        .post("/api/auth/login")
        .send({ email: "test-api-admin@test.com", password: "Password123!" });
      adminToken = resAdmin.body.token;
    });

    it("should restore active user details on /api/auth/me", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("test-api-student@test.com");
      expect(res.body.user.role).toBe("STUDENT");
    });
  });

  describe("Student Assessment Endpoints", () => {
    it("should retrieve a list of available quizzes", async () => {
      const res = await request(app)
        .get("/api/student/quizzes")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.quizzes)).toBe(true);
      expect(res.body.quizzes.some((q: any) => q.id === testQuizId)).toBe(true);
    });

    it("should initialize a new quiz attempt session", async () => {
      const res = await request(app)
        .post(`/api/student/quizzes/${testQuizId}/attempt`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("attempt");
      expect(res.body).toHaveProperty("activeSessionToken");
      testAttemptId = res.body.attempt.id;
      activeSessionToken = res.body.activeSessionToken;
    });

    it("should save a student response choice for a question", async () => {
      const res = await request(app)
        .post(`/api/student/attempts/${testAttemptId}/answers`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          activeSessionToken,
          questionId: testQuestionId,
          selectedOptionId: testOptionId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should submit telemetry window defocus events", async () => {
      const res = await request(app)
        .post(`/api/student/attempts/${testAttemptId}/telemetry`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          activeSessionToken,
          defocusCount: 1,
          defocusDurationSeconds: 4,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should finalize and accurately grade the completed attempt", async () => {
      const res = await request(app)
        .post(`/api/student/attempts/${testAttemptId}/finalize`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ activeSessionToken });

      expect(res.status).toBe(200);
      expect(res.body.score).toBe(5);

      const attempt = await prisma.quizAttempt.findUnique({
        where: { id: testAttemptId },
      });
      expect(attempt?.score).toBe(5);
      expect(attempt?.defocusCount).toBe(1);
      expect(attempt?.defocusDurationSeconds).toBe(4);
    });
  });

  describe("Teacher Question Import Endpoints", () => {
    let importQuizId = "";

    beforeAll(async () => {
      const quiz = await prisma.quiz.create({
        data: {
          title: "Import Testing Quiz",
          durationMinutes: 10,
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 1000 * 60 * 60),
          subjectId: testSubjectId,
          teacherId: testTeacherId,
        },
      });
      importQuizId = quiz.id;
    });

    it("should reject import request with malformed CSV headers", async () => {
      const csvText = "BadHeader,Type,Points,Options,CorrectOptions\nQuestion text,MCQ,2,A;;B,A";
      const res = await request(app)
        .post(`/api/teacher/quizzes/${importQuizId}/questions/import`)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ csvText });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Missing required CSV headers");
    });

    it("should reject import request containing row validation errors", async () => {
      const csvText = "Text,Type,Points,Options,CorrectOptions\nMCQ question,MCQ,abc,A;;B,A\nTF question,TRUE_FALSE,1,,WrongAnswer";
      const res = await request(app)
        .post(`/api/teacher/quizzes/${importQuizId}/questions/import`)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ csvText });

      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.length).toBe(2);
      expect(res.body.errors[0]).toContain("Row 2: Points must be a positive integer");
      expect(res.body.errors[1]).toContain("Row 3: TRUE_FALSE correct option must be either");
    });

    it("should successfully import valid questions and save to database", async () => {
      const csvText = "Text,Type,Points,Options,CorrectOptions\n" +
        "\"What is 2 + 2, sir?\",MCQ,2,3;;4;;5,4\n" +
        "The sky is blue.,TRUE_FALSE,1,,True\n" +
        "Write the name of Python creator.,SHORT_ANSWER,3,,Guido van Rossum";

      const res = await request(app)
        .post(`/api/teacher/quizzes/${importQuizId}/questions/import`)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ csvText });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(3);

      const createdQuestions = await prisma.question.findMany({
        where: { quizId: importQuizId },
        include: { options: true },
      });
      expect(createdQuestions.length).toBe(3);

      const mcq = createdQuestions.find(q => q.type === "MCQ" && q.text.includes("2 + 2"));
      expect(mcq).toBeDefined();
      expect(mcq?.points).toBe(2);
      expect(mcq?.options.find(o => o.text === "4")?.isCorrect).toBe(true);
      expect(mcq?.options.find(o => o.text === "3")?.isCorrect).toBe(false);

      const tf = createdQuestions.find(q => q.type === "TRUE_FALSE");
      expect(tf).toBeDefined();
      expect(tf?.options.find(o => o.text === "True")?.isCorrect).toBe(true);
      expect(tf?.options.find(o => o.text === "False")?.isCorrect).toBe(false);

      const sa = createdQuestions.find(q => q.type === "SHORT_ANSWER");
      expect(sa).toBeDefined();
      expect(sa?.options.find(o => o.text === "Guido van Rossum")?.isCorrect).toBe(true);
    });
  });

  describe("Teacher Quiz & Question Edit Locks (Item 7)", () => {
    it("should reject updating a quiz if it has submitted attempts and is locked", async () => {
      const res = await request(app)
        .put(`/api/teacher/quizzes/${testQuizId}`)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ title: "Mutated Assessment Title" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Editing is blocked because this assessment has submitted student attempts");
    });

    it("should reject deleting a quiz if it has submitted attempts and is locked", async () => {
      const res = await request(app)
        .delete(`/api/teacher/quizzes/${testQuizId}`)
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Deleting this quiz is blocked because it has submitted student attempts");
    });

    it("should reject editing a question linked to a submitted quiz when locked", async () => {
      const res = await request(app)
        .put(`/api/teacher/quizzes/${testQuizId}/questions/${testQuestionId}`)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ text: "Mutated Question Text", type: "MCQ", points: 10 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Editing is blocked because this assessment has submitted student attempts");
    });

    it("should reject deleting a question linked to a submitted quiz", async () => {
      const res = await request(app)
        .delete(`/api/teacher/quizzes/${testQuizId}/questions/${testQuestionId}`)
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Deleting this question is blocked because it is part of a quiz with submitted attempts");
    });
  });

  describe("Admin Override & Unlock Flagging (Item 8)", () => {
    it("should reject unlock and relock requests from non-admin accounts", async () => {
      const res1 = await request(app)
        .post(`/api/admin/quizzes/${testQuizId}/unlock`)
        .set("Authorization", `Bearer ${teacherToken}`);
      expect(res1.status).toBe(403);

      const res2 = await request(app)
        .post(`/api/admin/quizzes/${testQuizId}/relock`)
        .set("Authorization", `Bearer ${teacherToken}`);
      expect(res2.status).toBe(403);
    });

    it("should allow unlock and relock from admin accounts", async () => {
      const resUnlock = await request(app)
        .post(`/api/admin/quizzes/${testQuizId}/unlock`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(resUnlock.status).toBe(200);
      expect(resUnlock.body.quiz.adminUnlockedForEditing).toBe(true);

      const resRelock = await request(app)
        .post(`/api/admin/quizzes/${testQuizId}/relock`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(resRelock.status).toBe(200);
      expect(resRelock.body.quiz.adminUnlockedForEditing).toBe(false);
    });

    it("should NOT set needsReview if teacher performs non-grading edits on unlocked quiz questions", async () => {
      // 1. Unlock quiz
      await request(app)
        .post(`/api/admin/quizzes/${testQuizId}/unlock`)
        .set("Authorization", `Bearer ${adminToken}`);

      // 2. Perform text-only edit on the question (which is linked to the quiz)
      const editRes = await request(app)
        .put(`/api/teacher/quizzes/${testQuizId}/questions/${testQuestionId}`)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          text: "What is the capital city of France, please?",
          type: "MCQ",
          points: 5,
          options: [
            { text: "Paris", isCorrect: true },
            { text: "London", isCorrect: false },
          ],
        });

      expect(editRes.status).toBe(200);

      // Verify that the attempt is NOT flagged needsReview
      const attempt = await prisma.quizAttempt.findUnique({
        where: { id: testAttemptId },
      });
      expect(attempt?.needsReview).toBe(false);
    });

    it("should set needsReview if teacher performs grading-relevant edits on unlocked quiz questions", async () => {
      // Perform correct answer flip
      const editRes = await request(app)
        .put(`/api/teacher/quizzes/${testQuizId}/questions/${testQuestionId}`)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          text: "What is the capital city of France, please?",
          type: "MCQ",
          points: 5,
          options: [
            { text: "Paris", isCorrect: false },
            { text: "London", isCorrect: true },
          ],
        });

      expect(editRes.status).toBe(200);

      // Verify that the attempt IS flagged needsReview
      const attempt = await prisma.quizAttempt.findUnique({
        where: { id: testAttemptId },
      });
      expect(attempt?.needsReview).toBe(true);

      // Clean up re-locking
      await request(app)
        .post(`/api/admin/quizzes/${testQuizId}/relock`)
        .set("Authorization", `Bearer ${adminToken}`);
    });
  });

  describe("Teacher Quiz Preview (Item 9)", () => {
    it("should reject preview fetch from non-teacher accounts", async () => {
      const res = await request(app)
        .get(`/api/teacher/quizzes/${testQuizId}/preview`)
        .set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it("should successfully fetch complete quiz layout and question options for preview", async () => {
      const res = await request(app)
        .get(`/api/teacher/quizzes/${testQuizId}/preview`)
        .set("Authorization", `Bearer ${teacherToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("quiz");
      expect(res.body.quiz.id).toBe(testQuizId);
      expect(Array.isArray(res.body.quiz.questions)).toBe(true);
      expect(res.body.quiz.questions.length).toBe(1); // Exactly 1 initial question on primary quiz
      expect(res.body.quiz.questions[0].id).toBe(testQuestionId);
      expect(Array.isArray(res.body.quiz.questions[0].options)).toBe(true);
    });
  });

  describe("Manual Grading & Unlock Workflow (Item 9 Edge Cases)", () => {
    let manualQuizId = "";
    let shortAnswerQuestionId = "";
    let mcqQuestionId = "";
    let manualAttemptId = "";
    let unlockRequestId = "";

    it("should set up a quiz with MCQ and SHORT_ANSWER questions", async () => {
      const now = new Date();
      const quiz = await prisma.quiz.create({
        data: {
          title: "Manual Grading Test Quiz",
          durationMinutes: 20,
          startsAt: new Date(now.getTime() - 60000),
          endsAt: new Date(now.getTime() + 3600000),
          subjectId: testSubjectId,
          teacherId: testTeacherId,
          isPublished: true,
          questions: {
            create: [
              {
                text: "Explain TCP three-way handshake",
                type: "SHORT_ANSWER",
                points: 5,
                options: { create: [{ text: "SYN, SYN-ACK, ACK", isCorrect: true }] },
              },
              {
                text: "Is UDP connectionless?",
                type: "TRUE_FALSE",
                points: 2,
                options: {
                  create: [
                    { text: "True", isCorrect: true },
                    { text: "False", isCorrect: false },
                  ],
                },
              },
            ],
          },
        },
        include: { questions: { include: { options: true } } },
      });

      manualQuizId = quiz.id;
      const saQ = quiz.questions.find((q) => q.type === "SHORT_ANSWER")!;
      const mcqQ = quiz.questions.find((q) => q.type === "TRUE_FALSE")!;
      shortAnswerQuestionId = saQ.id;
      mcqQuestionId = mcqQ.id;

      expect(manualQuizId).toBeTruthy();
    });

    it("should start attempt and submit ONLY the TRUE_FALSE question (leaving SHORT_ANSWER unanswered)", async () => {
      // 1. Start attempt
      const startRes = await request(app)
        .post(`/api/student/quizzes/${manualQuizId}/attempt`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(startRes.status).toBe(200);
      manualAttemptId = startRes.body.attempt.id;
      const sessionToken = startRes.body.activeSessionToken;

      // 2. Find correct TRUE_FALSE option ID
      const quiz = await prisma.quiz.findUnique({
        where: { id: manualQuizId },
        include: { questions: { include: { options: true } } },
      });
      const tfQ = quiz!.questions.find((q) => q.type === "TRUE_FALSE")!;
      const trueOpt = tfQ.options.find((o) => o.text === "True")!;

      // 3. Save TRUE_FALSE answer only
      const saveRes = await request(app)
        .post(`/api/student/attempts/${manualAttemptId}/answers`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          questionId: mcqQuestionId,
          selectedOptionId: trueOpt.id,
          activeSessionToken: sessionToken,
        });

      expect(saveRes.status).toBe(200);

      // 4. Finalize attempt (student side)
      const finRes = await request(app)
        .post(`/api/student/attempts/${manualAttemptId}/finalize`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ activeSessionToken: sessionToken });

      expect(finRes.status).toBe(200);
      expect(finRes.body.gradingStatus).toBe("PENDING_REVIEW");
      expect(finRes.body.score).toBe(2); // Provisional score: 2 pts from TRUE_FALSE only
      expect(finRes.body.pendingReviewCount).toBe(1);
    });

    it("EDGE CASE CRITICAL: should HARD-BLOCK finalize-grading when SHORT_ANSWER was skipped/unanswered", async () => {
      const finalizeRes = await request(app)
        .post(`/api/teacher/attempts/${manualAttemptId}/finalize-grading`)
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(finalizeRes.status).toBe(400);
      expect(finalizeRes.body.error).toContain("still require manual review");
      expect(finalizeRes.body.unansweredCount).toBe(1);
    });

    it("should allow teacher to grade and confirm the short answer question", async () => {
      // 1. First, create an unconfirmed Answer record or grade directly via grade-question endpoint
      // We grade the question: since student left it unanswered, we create or update an answer record
      // Let's create an answer entry for this short answer
      const answer = await prisma.answer.create({
        data: {
          attemptId: manualAttemptId,
          questionId: shortAnswerQuestionId,
          textAnswer: "(Left blank by student)",
          isCorrect: false,
          pointsAwarded: 0,
          confirmed: false,
        },
      });

      const gradeRes = await request(app)
        .post(`/api/teacher/attempts/${manualAttemptId}/grade-question`)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ answerId: answer.id, pointsAwarded: 1 });

      expect(gradeRes.status).toBe(200);
      expect(gradeRes.body.answer.confirmed).toBe(true);
      expect(gradeRes.body.answer.pointsAwarded).toBe(1);
    });

    it("should now successfully finalize grading after all short answer slots are confirmed", async () => {
      const finalizeRes = await request(app)
        .post(`/api/teacher/attempts/${manualAttemptId}/finalize-grading`)
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(finalizeRes.status).toBe(200);
      expect(finalizeRes.body.gradingStatus).toBe("FINALIZED");
      expect(finalizeRes.body.finalScore).toBe(3); // 2 (MCQ) + 1 (graded SA) = 3
    });

    it("should allow teacher to submit unlock request for locked quiz", async () => {
      const reqRes = await request(app)
        .post(`/api/teacher/quizzes/${manualQuizId}/unlock-request`)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ reason: "Need to update point distribution for Q1." });

      expect(reqRes.status).toBe(200);
      expect(reqRes.body.success).toBe(true);
      unlockRequestId = reqRes.body.request.id;
    });

    it("should enforce duplicate PENDING unlock request guard (return 409)", async () => {
      const dupRes = await request(app)
        .post(`/api/teacher/quizzes/${manualQuizId}/unlock-request`)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ reason: "Duplicate request attempt." });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error).toContain("already pending");
    });

    it("should allow admin to list and approve unlock request", async () => {
      // 1. List requests
      const listRes = await request(app)
        .get("/api/admin/unlock-requests?status=PENDING")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.requests)).toBe(true);
      const reqItem = listRes.body.requests.find((r: any) => r.id === unlockRequestId);
      expect(reqItem).toBeTruthy();
      expect(reqItem.reason).toBe("Need to update point distribution for Q1.");

      // 2. Approve request
      const approveRes = await request(app)
        .post(`/api/admin/unlock-requests/${unlockRequestId}/approve`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);

      // 3. Verify quiz is unlocked
      const quizAfter = await prisma.quiz.findUnique({
        where: { id: manualQuizId },
        select: { adminUnlockedForEditing: true },
      });
      expect(quizAfter?.adminUnlockedForEditing).toBe(true);
    });

    it("should clean up manual test quiz and attempt records", async () => {
      await prisma.quizAttempt.deleteMany({ where: { quizId: manualQuizId } });
      await prisma.quizUnlockRequest.deleteMany({ where: { quizId: manualQuizId } });
      await prisma.quiz.delete({ where: { id: manualQuizId } });
    });
  });
});

