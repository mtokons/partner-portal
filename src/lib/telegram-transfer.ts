import { getGraphClient } from "@/lib/graph";
import fs from "fs";
import path from "path";
import { TelegramClient, Api } from "teleproto";
import { StringSession } from "teleproto/sessions";

export interface JobHistoryRecord {
  id: string;
  startTime: string;
  endTime: string | null;
  status: "completed" | "stopped" | "error";
  folderPath: string;
  chatId: string;
  mode: "bot" | "user_mtproto";
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  deletedFiles: number;
  totalBytes: number;
  processedBytes: number;
  cancellationReason?: string;
  logs: string[];
}

export interface TransferState {
  status: "idle" | "running" | "stopped" | "completed" | "error";
  mode: "bot" | "user_mtproto";
  botToken: string;
  apiId?: string;
  apiHash?: string;
  sessionString?: string;
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
  cancellationReason?: string;
  logs: string[];
  history: JobHistoryRecord[];
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

const HISTORY_FILE = path.join(process.cwd(), "transfer_history.json");

function loadHistory(): JobHistoryRecord[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, "utf-8");
      return JSON.parse(data) || [];
    }
  } catch (err) {
    console.error("Failed to load transfer history:", err);
  }
  return [];
}

function saveHistoryRecord(record: JobHistoryRecord) {
  try {
    const list = loadHistory();
    list.unshift(record);
    const trimmed = list.slice(0, 30);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save transfer history record:", err);
  }
}

export function getTransferHistory(): JobHistoryRecord[] {
  return loadHistory();
}

let globalState: TransferState = {
  status: "idle",
  mode: "bot",
  botToken: "",
  apiId: "",
  apiHash: "",
  sessionString: "",
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
  cancellationReason: undefined,
  logs: [],
  history: [],
};

let shouldStop = false;

export function getTransferStatus(): TransferState {
  return {
    ...globalState,
    logs: [...globalState.logs].slice(-100),
    history: loadHistory(),
  };
}

export function stopTransferJob(): void {
  if (globalState.status === "running") {
    shouldStop = true;
    globalState.cancellationReason = "User clicked Stop Transfer Operation button";
    addLog("[CONTROL] 🛑 Stop signal sent by user. Halting transfer operation...");
  }
}

function addLog(msg: string) {
  const ts = new Date().toLocaleTimeString();
  globalState.logs.push(`[${ts}] ${msg}`);
  if (globalState.logs.length > 500) {
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

const TELEGRAM_MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB HTTP limit for Bot API

function recordHistory(status: "completed" | "stopped" | "error", reason?: string) {
  saveHistoryRecord({
    id: "job_" + Date.now(),
    startTime: globalState.startTime || new Date().toISOString(),
    endTime: new Date().toISOString(),
    status,
    folderPath: globalState.folderPath,
    chatId: globalState.chatId,
    mode: globalState.mode,
    totalFiles: globalState.totalFiles,
    processedFiles: globalState.processedFiles,
    successfulFiles: globalState.successfulFiles,
    failedFiles: globalState.failedFiles,
    deletedFiles: globalState.deletedFiles,
    totalBytes: globalState.totalBytes,
    processedBytes: globalState.processedBytes,
    cancellationReason: reason,
    logs: globalState.logs.slice(-30),
  });
}

// ----------------------------------------------------
// MTProto Client API Helper Methods (GramJS / Teleproto)
// ----------------------------------------------------
let pendingAuthClient: TelegramClient | null = null;
let pendingAuthPhone: string = "";

export async function sendUserAuthCode(apiId: number, apiHash: string, phoneNumber: string) {
  addLog(`[MTProto] Sending Telegram authentication code to phone: ${phoneNumber}...`);
  const stringSession = new StringSession("");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.connect();

  const { phoneCodeHash } = await client.sendCode(
    { apiId, apiHash },
    phoneNumber
  );

  const tempSession = stringSession.save();
  pendingAuthClient = client;
  pendingAuthPhone = phoneNumber;

  return { phoneCodeHash, tempSession };
}

export async function verifyUserAuthCode(
  apiId: number,
  apiHash: string,
  phoneNumber: string,
  phoneCodeHash: string,
  code: string,
  password?: string,
  tempSession?: string
) {
  addLog(`[MTProto] Verifying login code for ${phoneNumber}...`);
  let client = pendingAuthClient;
  if (!client || !client.connected) {
    const stringSession = new StringSession(tempSession || "");
    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });
    await client.connect();
  }

  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode: code.trim(),
      })
    );
  } catch (err: any) {
    console.error("[MTProto] signIn error:", err);
    const errStr = String(err?.errorMessage || err?.message || err);
    if (errStr.includes("SESSION_PASSWORD_NEEDED") || errStr.includes("2FA")) {
      if (!password || !password.trim()) {
        throw new Error("2FA_REQUIRED");
      }
      try {
        const pwdState = await client.invoke(new Api.account.GetPassword());
        const { computeCheck } = await import("teleproto/Password");
        const pwdCheck = await computeCheck(pwdState, password.trim());
        await client.invoke(
          new Api.auth.CheckPassword({
            password: pwdCheck,
          })
        );
      } catch (pwdErr: any) {
        const pwdErrStr = String(pwdErr?.errorMessage || pwdErr?.message || pwdErr);
        if (pwdErrStr.includes("PASSWORD_HASH_INVALID")) {
          throw new Error("The 2FA password entered is incorrect. Please check your 2FA password and try again.");
        }
        throw new Error(pwdErrStr || "2FA verification failed.");
      }
    } else if (errStr.includes("PHONE_CODE_INVALID")) {
      throw new Error("The 5-digit verification code is invalid. Please check Telegram app and try again.");
    } else if (errStr.includes("PHONE_CODE_EXPIRED")) {
      throw new Error("The verification code has expired. Please click 'Send Auth Code' again.");
    } else {
      throw new Error(errStr || "Failed to verify code.");
    }
  }

  const sessionString = (client.session as StringSession).save();
  try {
    await client.disconnect();
  } catch {}
  pendingAuthClient = null;

  addLog(`✓ [MTProto] User Account Authenticated! Session created.`);
  return { sessionString };
}

export async function startTransferJob(options: {
  mode?: "bot" | "user_mtproto";
  botToken?: string;
  apiId?: number;
  apiHash?: string;
  sessionString?: string;
  chatId: string;
  folderPath: string;
  userId?: string;
  deleteAfterTransfer?: boolean;
}): Promise<void> {
  if (globalState.status === "running") {
    throw new Error("A transfer job is already running.");
  }

  const transferMode = options.mode || (options.sessionString ? "user_mtproto" : "bot");

  if (transferMode === "bot" && !options.botToken) {
    throw new Error("Telegram Bot Token is required for Bot API mode.");
  }
  if (transferMode === "user_mtproto" && (!options.apiId || !options.apiHash || !options.sessionString)) {
    throw new Error("API ID, API Hash, and Authenticated User Session are required for Direct MTProto mode.");
  }

  const rawChatId = options.chatId.trim();
  if (rawChatId.includes("t.me/+") || rawChatId.includes("joinchat")) {
    throw new Error(
      "Telegram invite links cannot be used directly as Chat IDs. For private channels, use the numeric Chat ID starting with '-100...' (e.g. -1002145897612)."
    );
  }

  const targetChatId = sanitizeTelegramChatId(rawChatId);
  const deleteAfter = !!options.deleteAfterTransfer;

  shouldStop = false;
  globalState = {
    status: "running",
    mode: transferMode,
    botToken: options.botToken || "",
    apiId: options.apiId ? String(options.apiId) : "",
    apiHash: options.apiHash || "",
    sessionString: options.sessionString || "",
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
    cancellationReason: undefined,
    logs: [],
    history: loadHistory(),
  };

  addLog("=== OneDrive to Telegram Transfer Job Initialized ===");
  addLog(`Transfer Engine Mode: ${transferMode === "user_mtproto" ? "⚡ Direct Telegram MTProto API (User Account - 2GB Limit)" : "🤖 Telegram Bot API (50MB Limit)"}`);
  addLog(`Target Telegram Chat: ${targetChatId}`);
  if (deleteAfter) {
    addLog("⚠️ DELETION ENABLED: Files will be deleted from OneDrive after successful upload.");
  }

  (async () => {
    let mtClient: TelegramClient | null = null;

    try {
      if (transferMode === "user_mtproto") {
        addLog("Connecting to Telegram MTProto Data Centers via Teleproto...");
        mtClient = new TelegramClient(
          new StringSession(options.sessionString!),
          options.apiId!,
          options.apiHash!,
          { connectionRetries: 5 }
        );
        await mtClient.connect();
        const me = await mtClient.getMe();
        addLog(`✓ [MTProto] Connected as Telegram User: @${me.username || me.firstName || me.id}`);
      } else {
        addLog("Verifying Telegram Bot credentials...");
        const getMeRes = await fetch(`https://api.telegram.org/bot${options.botToken}/getMe`);
        const getMeData = await getMeRes.json();
        if (!getMeRes.ok || !getMeData.ok) {
          throw new Error(`Telegram Bot Token Invalid: ${getMeData.description || "Authentication failed"}`);
        }
        addLog(`✓ Bot Authenticated: @${getMeData.result.username || ""}`);
      }

      const files = await fetchOneDriveFiles(options.userId || "", options.folderPath || "/");

      if (shouldStop) {
        globalState.status = "stopped";
        globalState.endTime = new Date().toISOString();
        globalState.cancellationReason = "User cancelled job during initial folder scan";
        addLog(`[STOPPED] Transfer job cancelled: ${globalState.cancellationReason}`);
        recordHistory("stopped", globalState.cancellationReason);
        if (mtClient) await mtClient.disconnect();
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
        recordHistory("completed");
        if (mtClient) await mtClient.disconnect();
        return;
      }

      const client = await getGraphClient();
      const startTimeMs = Date.now();

      for (let i = 0; i < files.length; i++) {
        if (shouldStop) {
          globalState.status = "stopped";
          globalState.endTime = new Date().toISOString();
          globalState.cancellationReason = globalState.cancellationReason || "Manual stop requested by user";
          addLog(`[STOPPED] Transfer halted: ${globalState.cancellationReason}`);
          recordHistory("stopped", globalState.cancellationReason);
          if (mtClient) await mtClient.disconnect();
          return;
        }

        const file = files[i];
        globalState.currentFileName = file.name;
        const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
        addLog(`[${i + 1}/${files.length}] Processing: ${file.name} (${fileSizeMb} MB)...`);

        let uploadSuccess = false;

        try {
          // Download file content from Graph with 10-minute timeout resilience
          const downloadApi = options.userId
            ? `/users/${options.userId}/drive/items/${file.id}/content`
            : `/me/drive/items/${file.id}/content`;

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

          // MODE A: Direct Telegram MTProto Client API (GramJS / Teleproto) - UP TO 2 GB PER FILE
          if (transferMode === "user_mtproto" && mtClient) {
            addLog(`⚡ [MTProto] Streaming file directly to Telegram DC: ${file.name}...`);
            
            // Upload file to Telegram MTProto storage engine
            const fileResult = await mtClient.uploadFile({
              file: buffer,
              workers: 4,
            });

            await mtClient.sendFile(targetChatId, {
              file: fileResult,
              caption: `📁 ${file.name}\nPath: ${file.path}`,
              forceDocument: !/\.(jpg|jpeg|png|gif|webp|mp4|mov|avi)$/i.test(file.name),
            });

            uploadSuccess = true;
            globalState.successfulFiles++;
            globalState.processedBytes += file.size;
            addLog(`✓ [${i + 1}/${files.length}] MTProto Uploaded to Telegram: ${file.name}`);
          }
          // MODE B: Telegram Bot API (50 MB Limit)
          else {
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

                let tgRes: Response;
                let tgData: any;

                try {
                  tgRes = await fetch(`https://api.telegram.org/bot${options.botToken}/${telegramMethod}`, {
                    method: "POST",
                    body: formData,
                  });
                  tgData = await tgRes.json();
                } catch (netErr: any) {
                  addLog(`⚠️ Network glitch uploading ${file.name} (Attempt ${attempts}/${maxAttempts}): ${netErr.message}`);
                  await new Promise((res) => setTimeout(res, 3000));
                  continue;
                }

                if (tgRes.status === 429 || tgData.error_code === 429 || tgData.parameters?.retry_after) {
                  const retryAfterSec = (tgData.parameters?.retry_after || 10) + 1;
                  addLog(`⏳ [RATE LIMIT 429] Telegram requested delay. Auto-waiting ${retryAfterSec}s before retry (Attempt ${attempts}/${maxAttempts})...`);
                  await new Promise((res) => setTimeout(res, retryAfterSec * 1000));
                  continue;
                }

                if ((!tgRes.ok || !tgData.ok) && telegramMethod !== "sendDocument" && !tgData.description?.includes("chat not found")) {
                  addLog(`Notice: ${telegramMethod} failed (${tgData.description}), retrying ${file.name} via sendDocument...`);
                  const docFormData = new FormData();
                  docFormData.append("chat_id", options.chatId.trim());
                  docFormData.append("caption", `📁 ${file.name}\nPath: ${file.path}`);
                  docFormData.append("document", new Blob([buffer]), file.name);

                  try {
                    tgRes = await fetch(`https://api.telegram.org/bot${options.botToken}/sendDocument`, {
                      method: "POST",
                      body: docFormData,
                    });
                    tgData = await tgRes.json();
                  } catch (netErr: any) {
                    addLog(`⚠️ Network glitch on document retry for ${file.name}: ${netErr.message}`);
                    await new Promise((res) => setTimeout(res, 3000));
                    continue;
                  }

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
                      `Bad Request: chat not found.\n💡 HINT: Make sure target channel ID "${options.chatId}" exists and your account/bot has permission.`
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
          }

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
          const errMsg = err.message || String(err);
          addLog(`❌ [${i + 1}/${files.length}] Failed to upload ${file.name}: ${errMsg}`);
          
          if (globalState.failedFiles >= 5 && globalState.successfulFiles === 0) {
            shouldStop = true;
            globalState.cancellationReason = `Job auto-cancelled: First 5 consecutive files failed (${errMsg})`;
            addLog(`🚨 [AUTO-CANCEL] ${globalState.cancellationReason}`);
          }
        } finally {
          globalState.processedFiles++;
          const elapsedSec = (Date.now() - startTimeMs) / 1000;
          globalState.speedBps = elapsedSec > 0 ? Math.round(globalState.processedBytes / elapsedSec) : 0;
        }

        // Pacing delay between uploads
        await new Promise((resolve) => setTimeout(resolve, transferMode === "user_mtproto" ? 1500 : 2500));
      }

      if (shouldStop) {
        globalState.status = "stopped";
        globalState.endTime = new Date().toISOString();
        globalState.cancellationReason = globalState.cancellationReason || "Operation stopped during batch processing";
        addLog(`[STOPPED] Transfer finished with stop signal. Reason: ${globalState.cancellationReason}`);
        recordHistory("stopped", globalState.cancellationReason);
        if (mtClient) await mtClient.disconnect();
        return;
      }

      globalState.status = "completed";
      globalState.endTime = new Date().toISOString();
      globalState.currentFileName = "Transfer Complete!";
      addLog(`=== Transfer Completed! ${globalState.successfulFiles} succeeded, ${globalState.failedFiles} failed, ${globalState.deletedFiles} deleted from OneDrive. ===`);
      recordHistory("completed");
      if (mtClient) await mtClient.disconnect();
    } catch (err: any) {
      globalState.status = "error";
      globalState.endTime = new Date().toISOString();
      const fatalErr = err.message || String(err);
      globalState.cancellationReason = fatalErr;
      addLog(`[CRITICAL ERROR] ${fatalErr}`);
      recordHistory("error", fatalErr);
      if (mtClient) await mtClient.disconnect();
    }
  })();
}
