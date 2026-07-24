import { getGraphClient } from "@/lib/graph";

export interface TransferState {
  status: "idle" | "running" | "stopped" | "completed" | "error";
  botToken: string;
  chatId: string;
  folderPath: string;
  userId: string;
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalBytes: number;
  processedBytes: number;
  currentFileName: string;
  speedBps: number;
  startTime: string | null;
  endTime: string | null;
  logs: string[];
}

interface DriveItem {
  id: string;
  name: string;
  size?: number;
  folder?: Record<string, unknown>;
  file?: { mimeType: string };
}

let globalState: TransferState = {
  status: "idle",
  botToken: "",
  chatId: "",
  folderPath: "",
  userId: "",
  totalFiles: 0,
  processedFiles: 0,
  successfulFiles: 0,
  failedFiles: 0,
  totalBytes: 0,
  processedBytes: 0,
  currentFileName: "",
  speedBps: 0,
  startTime: null,
  endTime: null,
  logs: [],
};

let shouldStop = false;

export function getTransferStatus(): TransferState {
  return { ...globalState, logs: [...globalState.logs].slice(-50) };
}

export function stopTransferJob(): void {
  if (globalState.status === "running") {
    shouldStop = true;
    addLog("[CONTROL] Stop signal sent. Halting transfer...");
  }
}

function addLog(msg: string) {
  const ts = new Date().toLocaleTimeString();
  globalState.logs.push(`[${ts}] ${msg}`);
  if (globalState.logs.length > 200) {
    globalState.logs.shift();
  }
}

async function fetchOneDriveFiles(userId: string, folderPath: string): Promise<Array<{ id: string; name: string; size: number; path: string }>> {
  const client = await getGraphClient();
  const fileList: Array<{ id: string; name: string; size: number; path: string }> = [];

  async function crawlFolder(endpoint: string, currentPath: string) {
    if (shouldStop) return;
    try {
      const res = await client.api(endpoint).get();
      const items: DriveItem[] = res.value || [];

      for (const item of items) {
        if (shouldStop) return;
        const itemPath = `${currentPath}/${item.name}`;
        if (item.folder) {
          addLog(`Scanning directory: ${itemPath}`);
          const subEndpoint = userId
            ? `/users/${userId}/drive/items/${item.id}/children`
            : `/me/drive/items/${item.id}/children`;
          await crawlFolder(subEndpoint, itemPath);
        } else if (item.file) {
          fileList.push({
            id: item.id,
            name: item.name,
            size: item.size || 0,
            path: itemPath,
          });
        }
      }
    } catch (err: any) {
      addLog(`Error scanning endpoint ${endpoint}: ${err.message || String(err)}`);
    }
  }

  const cleanPath = folderPath.trim().replace(/^\/+|\/+$/g, "");
  let startApi = "";
  if (userId) {
    startApi = cleanPath ? `/users/${userId}/drive/root:/${cleanPath}:/children` : `/users/${userId}/drive/root/children`;
  } else {
    startApi = cleanPath ? `/me/drive/root:/${cleanPath}:/children` : `/me/drive/root/children`;
  }

  addLog(`Starting file scan in OneDrive (Path: "${cleanPath || "/"}")`);
  await crawlFolder(startApi, cleanPath ? `/${cleanPath}` : "");
  return fileList;
}

export function sanitizeTelegramChatId(input: string): string {
  let cleaned = input.trim();
  if (cleaned.startsWith("https://t.me/c/") || cleaned.startsWith("http://t.me/c/")) {
    const parts = cleaned.replace(/^https?:\/\/t\.me\/c\//, "").split("/");
    if (parts[0] && /^\d+$/.test(parts[0])) {
      return `-100${parts[0]}`;
    }
  }
  if (cleaned.startsWith("https://t.me/") || cleaned.startsWith("http://t.me/")) {
    const raw = cleaned.replace(/^https?:\/\/t\.me\//, "").split("/")[0].replace("@", "");
    if (raw && !raw.startsWith("+") && !raw.startsWith("joinchat")) {
      return `@${raw}`;
    }
  }
  return cleaned;
}

export async function startTransferJob(options: {
  botToken: string;
  chatId: string;
  folderPath: string;
  userId?: string;
}): Promise<void> {
  if (globalState.status === "running") {
    throw new Error("A transfer job is already running.");
  }

  const rawChatId = options.chatId.trim();
  if (rawChatId.includes("t.me/+") || rawChatId.includes("joinchat")) {
    throw new Error(
      "Telegram invite links (like https://t.me/+...) cannot be used directly as Chat IDs. For private channels, use the numeric Chat ID starting with '-100...' (e.g. -1002145897612)."
    );
  }

  const targetChatId = sanitizeTelegramChatId(rawChatId);

  shouldStop = false;
  globalState = {
    status: "running",
    botToken: options.botToken,
    chatId: targetChatId,
    folderPath: options.folderPath || "/",
    userId: options.userId || "",
    totalFiles: 0,
    processedFiles: 0,
    successfulFiles: 0,
    failedFiles: 0,
    totalBytes: 0,
    processedBytes: 0,
    currentFileName: "Scanning OneDrive...",
    speedBps: 0,
    startTime: new Date().toISOString(),
    endTime: null,
    logs: [],
  };

  addLog("=== OneDrive to Telegram Transfer Job Initialized ===");
  addLog(`Target Telegram Chat: ${targetChatId}`);

  // Run asynchronously in background
  (async () => {
    try {
      // 1. Verify Bot Token & Connection
      addLog("Verifying Telegram Bot credentials...");
      let botUsername = "";
      try {
        const getMeRes = await fetch(`https://api.telegram.org/bot${options.botToken}/getMe`);
        const getMeData = await getMeRes.json();
        if (!getMeRes.ok || !getMeData.ok) {
          throw new Error(`Telegram Bot Token Invalid: ${getMeData.description || "Authentication failed"}`);
        }
        botUsername = getMeData.result.username || "";
        addLog(`✓ Bot Authenticated: @${botUsername}`);
      } catch (err: any) {
        throw new Error(`Telegram Bot connection failed: ${err.message || String(err)}`);
      }

      const files = await fetchOneDriveFiles(options.userId || "", options.folderPath || "/");

      if (shouldStop) {
        globalState.status = "stopped";
        globalState.endTime = new Date().toISOString();
        addLog("[STOPPED] Transfer job aborted by user.");
        return;
      }

      globalState.totalFiles = files.length;
      globalState.totalBytes = files.reduce((acc, f) => acc + f.size, 0);
      addLog(`Found ${files.length} total files (${(globalState.totalBytes / (1024 * 1024)).toFixed(2)} MB) to transfer.`);

      if (files.length === 0) {
        globalState.status = "completed";
        globalState.endTime = new Date().toISOString();
        globalState.currentFileName = "Done (No files found)";
        addLog("No files found in specified folder.");
        return;
      }

      const client = await getGraphClient();
      const startTimeMs = Date.now();

      for (let i = 0; i < files.length; i++) {
        if (shouldStop) {
          globalState.status = "stopped";
          globalState.endTime = new Date().toISOString();
          addLog("[STOPPED] Transfer halted by user.");
          return;
        }

        const file = files[i];
        globalState.currentFileName = file.name;
        addLog(`[${i + 1}/${files.length}] Fetching from Graph: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`);

        try {
          // Stream/download file content into memory buffer directly from Microsoft Graph
          const downloadApi = options.userId
            ? `/users/${options.userId}/drive/items/${file.id}/content`
            : `/me/drive/items/${file.id}/content`;

          const arrayBuffer: ArrayBuffer = await client
            .api(downloadApi)
            .responseType("arraybuffer" as any)
            .get();

          const buffer = Buffer.from(arrayBuffer);

          // Upload directly to Telegram Bot API in memory without writing to disk
          const isPhoto = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
          const telegramMethod = isPhoto ? "sendPhoto" : "sendDocument";
          const fieldName = isPhoto ? "photo" : "document";

          const formData = new FormData();
          formData.append("chat_id", options.chatId.trim());
          formData.append("caption", `📁 ${file.name}\nPath: ${file.path}`);
          const blob = new Blob([buffer]);
          formData.append(fieldName, blob, file.name);

          let tgRes = await fetch(`https://api.telegram.org/bot${options.botToken}/${telegramMethod}`, {
            method: "POST",
            body: formData,
          });

          let tgData = await tgRes.json();

          // Fallback: If sendPhoto fails (e.g. image dimension or size > 10MB), retry automatically as document
          if ((!tgRes.ok || !tgData.ok) && isPhoto && !tgData.description?.includes("chat not found")) {
            addLog(`Notice: sendPhoto failed (${tgData.description}), retrying ${file.name} via sendDocument...`);
            const docFormData = new FormData();
            docFormData.append("chat_id", options.chatId.trim());
            docFormData.append("caption", `📁 ${file.name}\nPath: ${file.path}`);
            docFormData.append("document", new Blob([buffer]), file.name);

            tgRes = await fetch(`https://api.telegram.org/bot${options.botToken}/sendDocument`, {
              method: "POST",
              body: docFormData,
            });
            tgData = await tgRes.json();
          }

          if (!tgRes.ok || !tgData.ok) {
            const desc = tgData.description || `HTTP ${tgRes.status}`;
            if (desc.toLowerCase().includes("chat not found")) {
              throw new Error(
                `Bad Request: chat not found.\n💡 HINT: (1) Make sure bot @${botUsername || "your_bot"} is added as an ADMINISTRATOR in channel "${options.chatId}". (2) For public channels use "@channelname", for private channels use numerical ID starting with "-100..." (e.g. -1001234567890).`
              );
            }
            throw new Error(desc);
          }

          globalState.successfulFiles++;
          globalState.processedBytes += file.size;
          addLog(`✓ [${i + 1}/${files.length}] Uploaded to Telegram: ${file.name}`);
        } catch (err: any) {
          globalState.failedFiles++;
          addLog(`❌ [${i + 1}/${files.length}] Failed to upload ${file.name}: ${err.message || String(err)}`);
        } finally {
          globalState.processedFiles++;
          const elapsedSec = (Date.now() - startTimeMs) / 1000;
          globalState.speedBps = elapsedSec > 0 ? Math.round(globalState.processedBytes / elapsedSec) : 0;
        }

        // Delay 1.5 seconds between uploads to respect Telegram Bot API rate limits
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      globalState.status = "completed";
      globalState.endTime = new Date().toISOString();
      globalState.currentFileName = "Transfer Complete!";
      addLog(`=== Transfer Completed! ${globalState.successfulFiles} succeeded, ${globalState.failedFiles} failed. ===`);
    } catch (err: any) {
      globalState.status = "error";
      globalState.endTime = new Date().toISOString();
      addLog(`[CRITICAL ERROR] ${err.message || String(err)}`);
    }
  })();
}
