import { getGraphClient } from "@/lib/graph";

export interface TransferState {
  status: "idle" | "running" | "stopped" | "completed" | "error";
  botToken: string;
  chatId: string;
  folderPath: string;
  userId: string;
  deleteAfterTransfer: boolean;
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  deletedFiles: number;
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
  webUrl?: string;
  "@microsoft.graph.downloadUrl"?: string;
}

let globalState: TransferState = {
  status: "idle",
  botToken: "",
  chatId: "",
  folderPath: "",
  userId: "",
  deleteAfterTransfer: false,
  totalFiles: 0,
  processedFiles: 0,
  successfulFiles: 0,
  failedFiles: 0,
  deletedFiles: 0,
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
  return { ...globalState, logs: [...globalState.logs].slice(-60) };
}

export function stopTransferJob(): void {
  if (globalState.status === "running") {
    shouldStop = true;
    addLog("[CONTROL] Stop signal sent. Halting transfer job...");
  }
}

function addLog(msg: string) {
  const ts = new Date().toLocaleTimeString();
  globalState.logs.push(`[${ts}] ${msg}`);
  if (globalState.logs.length > 300) {
    globalState.logs.shift();
  }
}

async function fetchOneDriveFiles(
  userId: string,
  folderPath: string
): Promise<Array<{ id: string; name: string; size: number; path: string; webUrl?: string }>> {
  const client = await getGraphClient();
  const fileList: Array<{ id: string; name: string; size: number; path: string; webUrl?: string }> = [];

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
            webUrl: item.webUrl,
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
    startApi = cleanPath
      ? `/users/${userId}/drive/root:/${cleanPath}:/children`
      : `/users/${userId}/drive/root/children`;
  } else {
    startApi = cleanPath
      ? `/me/drive/root:/${cleanPath}:/children`
      : `/me/drive/root/children`;
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

// 50 MB limit for direct HTTP Telegram Bot API uploads
const TELEGRAM_MAX_FILE_BYTES = 50 * 1024 * 1024;

export async function startTransferJob(options: {
  botToken: string;
  chatId: string;
  folderPath: string;
  userId?: string;
  deleteAfterTransfer?: boolean;
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
  const deleteAfter = !!options.deleteAfterTransfer;

  shouldStop = false;
  globalState = {
    status: "running",
    botToken: options.botToken,
    chatId: targetChatId,
    folderPath: options.folderPath || "/",
    userId: options.userId || "",
    deleteAfterTransfer: deleteAfter,
    totalFiles: 0,
    processedFiles: 0,
    successfulFiles: 0,
    failedFiles: 0,
    deletedFiles: 0,
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
  if (deleteAfter) {
    addLog("⚠️ DELETION ENABLED: Files will be deleted from OneDrive after successful upload.");
  }

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
        const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
        addLog(`[${i + 1}/${files.length}] Processing: ${file.name} (${fileSizeMb} MB)...`);

        let uploadSuccess = false;

        try {
          // Check if file exceeds 50MB Telegram HTTP Bot API limit
          if (file.size > TELEGRAM_MAX_FILE_BYTES) {
            addLog(` Notice: ${file.name} (${fileSizeMb} MB) exceeds Telegram Bot API 50MB HTTP limit. Sending metadata & link...`);
            
            const messageText = `📁 *${file.name}*\n📦 *Size:* ${fileSizeMb} MB\n📍 *Path:* \`${file.path}\`\n\n⚠️ *File size exceeds 50 MB limit for direct bot upload.*\n🔗 [Open in OneDrive](${file.webUrl || "#"})`;

            const msgRes = await fetch(`https://api.telegram.org/bot${options.botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: options.chatId.trim(),
                text: messageText,
                parse_mode: "Markdown",
              }),
            });

            const msgData = await msgRes.json();
            if (!msgRes.ok || !msgData.ok) {
              throw new Error(msgData.description || `HTTP ${msgRes.status}`);
            }

            uploadSuccess = true;
            globalState.successfulFiles++;
            globalState.processedBytes += file.size;
            addLog(`✓ [${i + 1}/${files.length}] Sent metadata link to Telegram for large file: ${file.name}`);
          } else {
            // Stream/download file content into memory buffer directly from Microsoft Graph
            const downloadApi = options.userId
              ? `/users/${options.userId}/drive/items/${file.id}/content`
              : `/me/drive/items/${file.id}/content`;

            // Download from Microsoft Graph with 10-minute timeout resilience
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

            let arrayBuffer: ArrayBuffer;
            try {
              arrayBuffer = await client
                .api(downloadApi)
                .responseType("arraybuffer" as any)
                .get();
            } finally {
              clearTimeout(timeoutId);
            }

            const buffer = Buffer.from(arrayBuffer);

            const isPhoto = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
            const isVideo = /\.(mp4|mov|avi|mkv|webm|3gp)$/i.test(file.name);

            let telegramMethod = "sendDocument";
            let fieldName = "document";

            if (isPhoto) {
              telegramMethod = "sendPhoto";
              fieldName = "photo";
            } else if (isVideo) {
              telegramMethod = "sendVideo";
              fieldName = "video";
            }

            // Retry loop with 429 rate limit backoff handling (up to 5 retries per file)
            let attempts = 0;
            const maxAttempts = 5;

            while (attempts < maxAttempts && !uploadSuccess && !shouldStop) {
              attempts++;

              const formData = new FormData();
              formData.append("chat_id", options.chatId.trim());
              formData.append("caption", `📁 ${file.name}\nPath: ${file.path}`);
              if (isVideo) {
                formData.append("supports_streaming", "true");
              }

              const blob = new Blob([buffer]);
              formData.append(fieldName, blob, file.name);

              let tgRes = await fetch(`https://api.telegram.org/bot${options.botToken}/${telegramMethod}`, {
                method: "POST",
                body: formData,
              });

              let tgData = await tgRes.json();

              // Check for Telegram 429 Rate Limit (Too Many Requests)
              if (tgRes.status === 429 || tgData.error_code === 429 || tgData.parameters?.retry_after) {
                const retryAfterSec = (tgData.parameters?.retry_after || 10) + 1;
                addLog(`⏳ [RATE LIMIT 429] Telegram requested delay. Auto-waiting ${retryAfterSec}s before retry (Attempt ${attempts}/${maxAttempts})...`);
                await new Promise((res) => setTimeout(res, retryAfterSec * 1000));
                continue; // Retry this file
              }

              // Fallback: If sendPhoto/sendVideo fails, retry automatically as standard document
              if ((!tgRes.ok || !tgData.ok) && telegramMethod !== "sendDocument" && !tgData.description?.includes("chat not found")) {
                addLog(`Notice: ${telegramMethod} failed (${tgData.description}), retrying ${file.name} via sendDocument...`);
                const docFormData = new FormData();
                docFormData.append("chat_id", options.chatId.trim());
                docFormData.append("caption", `📁 ${file.name}\nPath: ${file.path}`);
                docFormData.append("document", new Blob([buffer]), file.name);

                tgRes = await fetch(`https://api.telegram.org/bot${options.botToken}/sendDocument`, {
                  method: "POST",
                  body: docFormData,
                });
                tgData = await tgRes.json();

                if (tgRes.status === 429 || tgData.error_code === 429 || tgData.parameters?.retry_after) {
                  const retryAfterSec = (tgData.parameters?.retry_after || 10) + 1;
                  addLog(`⏳ [RATE LIMIT 429] Telegram requested delay during fallback. Auto-waiting ${retryAfterSec}s...`);
                  await new Promise((res) => setTimeout(res, retryAfterSec * 1000));
                  continue;
                }
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

              uploadSuccess = true;
              globalState.successfulFiles++;
              globalState.processedBytes += file.size;
              addLog(`✓ [${i + 1}/${files.length}] Uploaded to Telegram: ${file.name}`);
            }

            if (!uploadSuccess && !shouldStop) {
              throw new Error(`Failed to upload after ${maxAttempts} attempts due to Telegram rate limits/errors.`);
            }
          }

          // Optional: Delete from OneDrive after successful upload
          if (uploadSuccess && deleteAfter) {
            try {
              const deleteApi = options.userId
                ? `/users/${options.userId}/drive/items/${file.id}`
                : `/me/drive/items/${file.id}`;
              
              await client.api(deleteApi).delete();
              globalState.deletedFiles++;
              addLog(`🗑️ [DELETED FROM ONEDRIVE] Removed ${file.name} from OneDrive after successful transfer.`);
            } catch (delErr: any) {
              addLog(`⚠️ Warning: Failed to delete ${file.name} from OneDrive: ${delErr.message || String(delErr)}`);
            }
          }

        } catch (err: any) {
          globalState.failedFiles++;
          addLog(`❌ [${i + 1}/${files.length}] Failed to upload ${file.name}: ${err.message || String(err)}`);
        } finally {
          globalState.processedFiles++;
          const elapsedSec = (Date.now() - startTimeMs) / 1000;
          globalState.speedBps = elapsedSec > 0 ? Math.round(globalState.processedBytes / elapsedSec) : 0;
        }

        // Base 2-second rate limit safety buffer between files
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      globalState.status = "completed";
      globalState.endTime = new Date().toISOString();
      globalState.currentFileName = "Transfer Complete!";
      addLog(`=== Transfer Completed! ${globalState.successfulFiles} succeeded, ${globalState.failedFiles} failed, ${globalState.deletedFiles} deleted from OneDrive. ===`);
    } catch (err: any) {
      globalState.status = "error";
      globalState.endTime = new Date().toISOString();
      addLog(`[CRITICAL ERROR] ${err.message || String(err)}`);
    }
  })();
}
