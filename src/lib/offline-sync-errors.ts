export function isPermanentSyncError(message: string, attempts: number) {
  return (
    /not authorized|permission denied|invalid|forbidden|duplicate key|does not belong/i.test(
      message,
    ) || attempts >= 4
  );
}
