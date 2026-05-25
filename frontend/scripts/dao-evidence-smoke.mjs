import assert from "node:assert/strict";
import {
  sampleDaoEvidencePackets,
  statusLabel,
  totalTutRequested,
} from "../src/lib/labs-evidence.ts";

const [packet] = sampleDaoEvidencePackets;

assert.ok(packet, "Expected at least one sample DAO evidence packet.");
assert.equal(packet.status, "review");
assert.equal(statusLabel(packet.status), "DAO review");
assert.equal(packet.sourceSystem, "Tolani Labs");
assert.equal(packet.proposalRequired, true);
assert.ok(packet.projectId);
assert.ok(packet.projectName);
assert.ok(packet.labValidationId);
assert.ok(packet.metricReports.length >= 1);
assert.ok(packet.metricReports.every((metric) => metric.metricId && metric.label && metric.value));
assert.ok(packet.rewardRecipients.every((recipient) => recipient.role && recipient.reason));
assert.equal(totalTutRequested(packet), 750);

console.log(
  JSON.stringify(
    {
      ok: true,
      packetId: packet.id,
      labValidationId: packet.labValidationId,
      status: statusLabel(packet.status),
      metricReports: packet.metricReports.length,
      tutRequested: totalTutRequested(packet),
    },
    null,
    2
  )
);
