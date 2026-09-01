export {};

declare global {
  interface Window {
    desktopAPI?: {
      isDesktop: boolean;
      platform: string;
      sendNotification: (title: string, body: string) => void;
      openExternal: (url: string) => void;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      getAppVersion: () => Promise<string>;
      printDocument: () => Promise<{ success: boolean }>;
      saveExportFile: (
        filename: string,
        data: unknown,
      ) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      openImportFile: (
        filters?: Array<{ name: string; extensions: string[] }>,
      ) => Promise<{ success: boolean; filePath?: string; content?: string; canceled?: boolean; error?: string }>;
      onNavigate: (callback: (route: string) => void) => () => void;
    };
  }
}
