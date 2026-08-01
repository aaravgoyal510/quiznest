const http = require("http");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Function to check if the Next.js production server is running on localhost:3001
function pingProductionServer() {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:3001", (res) => {
      resolve(true);
    });
    
    req.on("error", () => {
      resolve(false);
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Helper to make a JSON POST request to our stress test endpoint
function sendRequest(body) {
  return new Promise((resolve) => {
    const start = Date.now();
    const postData = JSON.stringify(body);

    const req = http.request(
      {
        hostname: "localhost",
        port: 3001,
        path: "/api/test/quiz-flow",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
        timeout: 10000, // 10s timeout
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        
        res.on("end", () => {
          const duration = Date.now() - start;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = JSON.parse(responseBody);
              resolve({ success: true, duration, data, error: null });
            } catch (e) {
              resolve({ success: true, duration, data: responseBody, error: null });
            }
          } else {
            resolve({ success: false, duration, error: `HTTP ${res.statusCode}: ${responseBody}` });
          }
        });
      }
    );

    req.on("error", (err) => {
      resolve({ success: false, duration: Date.now() - start, error: err.message });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ success: false, duration: Date.now() - start, error: "Connection Timeout" });
    });

    req.write(postData);
    req.end();
  });
}

async function startLoadTest() {
  console.log("Validating Next.js production server availability on port 3001...");
  const isServerRunning = await pingProductionServer();
  
  if (!isServerRunning) {
    console.error("\n======================================================================");
    console.error("ERROR: Production server is not reachable on http://localhost:3001");
    console.error("Please run the production server before running the load test.");
    console.error("======================================================================\n");
    process.exit(1);
  }

  console.log("Connecting to database to retrieve target published quiz questions...");
  const quiz = await prisma.quiz.findFirst({
    where: { isPublished: true },
    include: {
      questions: { select: { questionId: true } },
    },
  });

  if (!quiz || quiz.questions.length === 0) {
    console.error("Error: No published quiz was found in the database. Please publish at least 1 quiz before running the load test.");
    process.exit(1);
  }

  const questionIds = quiz.questions.map((q) => q.questionId);
  console.log(`Found published quiz: "${quiz.title}" (ID: ${quiz.id}) with ${questionIds.length} questions.`);
  console.log("Starting load test against http://localhost:3001/api/test/quiz-flow");
  
  const concurrencyLimit = 60; // 60 concurrent virtual student users
  const testDurationMs = 20000; // Run for 20 seconds
  const startTime = Date.now();
  const endTime = startTime + testDurationMs;

  console.log(`Simulating ${concurrencyLimit} virtual students starting attempt -> saving answers sequentially -> finalizing for ${testDurationMs / 1000}s...\n`);

  const results = [];
  let activeWorkers = 0;

  // Worker loop for each virtual student connection
  async function runWorker(workerId) {
    activeWorkers++;
    
    while (Date.now() < endTime) {
      // Step 1: Start attempt
      const startRes = await sendRequest({ action: "start", quizId: quiz.id });
      results.push(startRes);
      
      if (!startRes.success || !startRes.data?.attemptId) {
        // Yield on failure and loop
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      const { attemptId, activeSessionToken } = startRes.data;

      // Step 2: Loop questions and simulate student pacing
      const answersToSave = Math.min(10, questionIds.length);
      let failedSequence = false;

      for (let i = 0; i < answersToSave; i++) {
        // Enforce a 500ms delay between answer updates to match student typing debounce rhythms
        await new Promise((r) => setTimeout(r, 500));
        
        if (Date.now() >= endTime) break;

        const saveRes = await sendRequest({
          action: "save",
          attemptId,
          questionId: questionIds[i],
          activeSessionToken,
          textAnswer: `Simulated worker ${workerId} answer save for question index ${i}.`,
        });
        results.push(saveRes);

        if (!saveRes.success) {
          failedSequence = true;
          break;
        }
      }

      if (Date.now() >= endTime) break;

      // Step 3: Finalize attempt (executing grading validations)
      if (!failedSequence) {
        const finalizeRes = await sendRequest({
          action: "finalize",
          attemptId,
          activeSessionToken,
        });
        results.push(finalizeRes);
      }
    }
    
    activeWorkers--;
  }

  // Spawn VUs in parallel
  const workers = Array.from({ length: concurrencyLimit }).map((_, idx) => runWorker(idx));
  
  // Log progress updates every 2 seconds
  const progressInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const sent = results.length;
    const errors = results.filter((r) => !r.success).length;
    console.log(`[Progress] ${elapsed}s elapsed | Requests Sent: ${sent} | Failures: ${errors}`);
  }, 2000);

  await Promise.all(workers);
  clearInterval(progressInterval);

  console.log("\nLoad test execution finished. Initiating global database cleanup of test records...");
  try {
    const studentId = "load-test-student-id";
    await prisma.answer.deleteMany({
      where: { attempt: { studentId } }
    });
    await prisma.quizAttempt.deleteMany({
      where: { studentId }
    });
    console.log("Database cleanup completed successfully!");
  } catch (cleanupErr) {
    console.error("Global database cleanup failed:", cleanupErr.message);
  }

  // Compile final results metrics
  const totalRequests = results.length;
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);
  const totalFailures = failures.length;
  const errorRate = totalRequests > 0 ? (totalFailures / totalRequests) * 100 : 0;

  const latencies = successes.map((r) => r.duration).sort((a, b) => a - b);
  const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  
  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.90)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const max = latencies.length > 0 ? Math.max(...latencies) : 0;

  console.log("\n==================================================");
  console.log("                 LOAD TEST RESULT                 ");
  console.log("==================================================");
  console.log(`Total Requests Sent : ${totalRequests}`);
  console.log(`Average Requests/Sec: ${(totalRequests / (testDurationMs / 1000)).toFixed(1)}`);
  console.log(`Total Failures      : ${totalFailures} (${errorRate.toFixed(2)}% error rate)`);
  console.log("--------------------------------------------------");
  console.log("LATENCY STATISTICS (Percentiles for Successes):");
  console.log(`p50 (Median)        : ${p50} ms`);
  console.log(`p90                 : ${p90} ms`);
  console.log(`p95                 : ${p95} ms`);
  console.log(`p99                 : ${p99} ms`);
  console.log(`Avg Latency         : ${avgLatency.toFixed(1)} ms`);
  console.log(`Max Latency         : ${max} ms`);
  console.log("==================================================\n");

  console.log("METRICS HEALTH EVALUATION:");
  if (errorRate > 1.0) {
    console.log("STATUS: CRITICAL FAILURE - High failure rate detected! Verify database limits or server availability.");
  } else if (p95 > 1500) {
    console.log("STATUS: CONCERNING - High p95 latency queues. Db pool limits might be throttling requests.");
  } else if (p95 < 600) {
    console.log("STATUS: HEALTHY - System handles 60 concurrent takers perfectly!");
  } else {
    console.log("STATUS: ACCEPTABLE - Slight latency queueing, but functional.");
  }

  // Print sample error messages if any occurred
  if (failures.length > 0) {
    console.log("\nSAMPLE ERROR MESSAGES:");
    const sampleErrors = Array.from(new Set(failures.slice(0, 3).map((f) => f.error)));
    sampleErrors.forEach((e) => console.log(`- ${e}`));
  }

  prisma.$disconnect();
}

startLoadTest().catch((err) => {
  console.error("Test initialization failed:", err);
  prisma.$disconnect();
});
