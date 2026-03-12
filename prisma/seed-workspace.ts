import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if any workspace already exists
  const existing = await prisma.workspace.findFirst();
  if (existing) {
    console.log('Default workspace already exists:', existing.id);
    return existing.id;
  }

  // Create default workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: '默认工作区',
      description: '系统创建的默认工作区',
      color: '#94a3b8',
      sortOrder: 0,
    },
  });
  console.log('Created default workspace:', workspace.id);

  // Backfill all existing meetings
  const meetingResult = await prisma.$executeRawUnsafe(
    `UPDATE Meeting SET workspaceId = ? WHERE workspaceId IS NULL OR workspaceId = ''`,
    workspace.id
  );
  console.log(`Backfilled meetings: ${meetingResult}`);

  // Backfill all existing folders
  const folderResult = await prisma.$executeRawUnsafe(
    `UPDATE Folder SET workspaceId = ? WHERE workspaceId IS NULL OR workspaceId = ''`,
    workspace.id
  );
  console.log(`Backfilled folders: ${folderResult}`);

  return workspace.id;
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
