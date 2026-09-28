import fs from "fs";

const files = [
  "src/app/pages/workspace/TeamCollaborationHub.tsx",
  "src/app/pages/workspace/CommandCenter.tsx",
  "src/app/pages/workspace/WorkflowApprovalHub.tsx",
  "src/app/pages/workspace/WorkspaceTeamChat.tsx"
];

for (const file of files) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, "utf8");
    fs.writeFileSync(file, content.replace(/\r\n/g, "\n"), "utf8");
    console.log(`Normalized ${file}`);
  }
}
