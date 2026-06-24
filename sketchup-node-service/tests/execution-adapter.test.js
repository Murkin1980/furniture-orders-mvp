import test from "node:test";
import assert from "node:assert/strict";
import { runSketchUpExecutionAdapter, validateManagerApproval } from "../src/execution-adapter.js";

const JOB = {
  jobId: "job-execution-001",
  payload: {
    commandPlan: {
      planVersion: "sketchup-command-plan/v1",
      commands: [{ type: "set_units", unit: "millimeter" }]
    }
  }
};
const APPROVAL = {
  approved: true,
  jobId: JOB.jobId,
  requestedBy: "manager@example.com",
  approvedAt: "2026-06-16T12:00:00.000Z"
};

test("execution is disabled by default without calling executor", async () => {
  let calls = 0;
  const result = await runSketchUpExecutionAdapter(JOB, { executePlan: async () => { calls += 1; } });
  assert.equal(result.status, "disabled");
  assert.equal(result.executed, false);
  assert.equal(calls, 0);
});

test("requires explicit matching manager approval", async () => {
  const result = await runSketchUpExecutionAdapter(JOB, {
    executionEnabled: true,
    managerApproval: { ...APPROVAL, jobId: "another-job" },
    executePlan: async () => ({ executed: true })
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.error, "manager_approval_required");
});

test("requires an injected executor after approval", async () => {
  const result = await runSketchUpExecutionAdapter(JOB, {
    executionEnabled: true,
    managerApproval: APPROVAL
  });
  assert.equal(result.status, "failed");
  assert.equal(result.error, "executor_required");
});

test("passes a clone of the plan and minimal manager context", async () => {
  let received;
  const result = await runSketchUpExecutionAdapter(JOB, {
    executionEnabled: true,
    managerApproval: APPROVAL,
    executePlan: async (plan, context) => {
      received = { plan, context };
      plan.commands[0].unit = "changed";
      return {
        executed: true,
        artifact: { type: "skp", reference: "local-ref-1", ignored: "value" },
        artifacts: [
          { type: "skp", reference: "local-ref-1", ignored: "value" },
          { type: "render", reference: "render-ref-1" }
        ]
      };
    }
  });
  assert.equal(result.status, "executed");
  assert.equal(result.executed, true);
  assert.deepEqual(result.artifact, { type: "skp", reference: "local-ref-1" });
  assert.deepEqual(result.artifacts, [
    { type: "skp", reference: "local-ref-1" },
    { type: "render", reference: "render-ref-1" }
  ]);
  assert.equal(received.context.requestedBy, APPROVAL.requestedBy);
  assert.equal(JOB.payload.commandPlan.commands[0].unit, "millimeter");
});

test("fails safely when executor does not confirm execution", async () => {
  const result = await runSketchUpExecutionAdapter(JOB, {
    executionEnabled: true,
    managerApproval: APPROVAL,
    executePlan: async () => ({ executed: false })
  });
  assert.equal(result.error, "execution_not_confirmed");
  assert.equal(result.executed, false);
});

test("normalizes thrown executor errors", async () => {
  const result = await runSketchUpExecutionAdapter(JOB, {
    executionEnabled: true,
    managerApproval: APPROVAL,
    executePlan: async () => { throw new Error("SketchUp unavailable"); }
  });
  assert.equal(result.status, "failed");
  assert.equal(result.error, "executor_failed");
  assert.equal(result.message, "SketchUp unavailable");
});

test("approval validator requires identity and time", () => {
  assert.match(validateManagerApproval(JOB, { ...APPROVAL, requestedBy: "" }), /identity/);
  assert.match(validateManagerApproval(JOB, { ...APPROVAL, approvedAt: "" }), /time/);
});
