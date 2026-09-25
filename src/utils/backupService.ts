import { Capacitor, registerPlugin } from '@capacitor/core';
import { createBackupPayload, HooshyarBackupPayload } from './storage';
import { getTodayJalali } from './jalali';

export interface NativeBackupPluginInterface {
  saveBackupFile(options: { fileName: string; content: string }): Promise<{
    status: 'success' | 'canceled';
    uri?: string;
    message?: string;
  }>;
  readBackupFile(): Promise<{
    status: 'success' | 'canceled';
    content?: string;
    fileName?: string;
    uri?: string;
    message?: string;
  }>;
}

export const NativeBackup = registerPlugin<NativeBackupPluginInterface>('NativeBackup');

export interface BackupExportResult {
  success: boolean;
  isCanceled?: boolean;
  message: string;
  fileName: string;
  filePath?: string;
  isNative: boolean;
  itemCounts?: {
    notes: number;
    tasks: number;
    reminders: number;
    expenses: number;
    debts: number;
  };
  error?: string;
}

interface EncryptedBackupEnvelope {
  app: 'هوشیار';
  format: 'encrypted-backup';
  version: 1;
  encryption: {
    algorithm: 'AES-GCM';
    kdf: 'PBKDF2-SHA-256';
    iterations: number;
    salt: string;
    iv: string;
  };
  ciphertext: string;
}

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
};

async function deriveBackupKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const sourceKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    sourceKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptBackupContent(content: string, password: string): Promise<string> {
  if (password.length < 8) throw new Error('رمز پشتیبان باید حداقل ۸ نویسه باشد.');
  if (!globalThis.crypto?.subtle) throw new Error('رمزگذاری امن در این دستگاه پشتیبانی نمی‌شود.');
  const iterations = 210_000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(password, salt, iterations);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(content)
  );
  const envelope: EncryptedBackupEnvelope = {
    app: 'هوشیار',
    format: 'encrypted-backup',
    version: 1,
    encryption: {
      algorithm: 'AES-GCM',
      kdf: 'PBKDF2-SHA-256',
      iterations,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv)
    },
    ciphertext: bytesToBase64(new Uint8Array(ciphertext))
  };
  return JSON.stringify(envelope, null, 2);
}

export async function decryptBackupContent(content: string, password: string): Promise<string> {
  const parsed = JSON.parse(content);
  if (parsed?.format !== 'encrypted-backup') return content;
  if (password.length < 8) throw new Error('برای بازیابی، رمز پشتیبان را وارد کنید.');
  const envelope = parsed as EncryptedBackupEnvelope;
  if (
    envelope.version !== 1 ||
    envelope.encryption?.algorithm !== 'AES-GCM' ||
    envelope.encryption?.kdf !== 'PBKDF2-SHA-256' ||
    !Number.isInteger(envelope.encryption.iterations) ||
    envelope.encryption.iterations < 100_000 ||
    envelope.encryption.iterations > 1_000_000
  ) {
    throw new Error('قالب رمزگذاری پشتیبان معتبر نیست.');
  }
  try {
    const salt = base64ToBytes(envelope.encryption.salt);
    const iv = base64ToBytes(envelope.encryption.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new Error();
    const key = await deriveBackupKey(password, salt, envelope.encryption.iterations);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      base64ToBytes(envelope.ciphertext) as BufferSource
    );
    return new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
  } catch {
    throw new Error('رمز اشتباه است یا فایل پشتیبان آسیب دیده.');
  }
}

/**
 * Generates a unique, meaningful, timestamped backup file name.
 * Format: hooshyar-backup-YYYY-MM-DD_HH-mm.json
 */
export function generateBackupFileName(): string {
  const today = getTodayJalali();
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const jy = today.jy;
  const jm = pad(today.jm);
  const jd = pad(today.jd);
  const hour = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `hooshyar-backup-${jy}-${jm}-${jd}_${hour}-${min}.json`;
}

/**
 * Exports user data backup:
 * - On Native Android (Capacitor): Uses Android Storage Access Framework (ACTION_CREATE_DOCUMENT)
 *   via NativeBackupPlugin, allowing the user to choose their preferred folder (Downloads, Drive, SD Card, etc.)
 *   and writes the JSON file directly into user storage with real UTF-8 encoding.
 * - On Web Browser: Uses standard client Blob download anchor.
 */
export async function exportBackupFile(password: string): Promise<BackupExportResult> {
  const fileName = generateBackupFileName();
  let backupPayload: HooshyarBackupPayload;
  let jsonStr: string;

  try {
    backupPayload = createBackupPayload();
    jsonStr = await encryptBackupContent(JSON.stringify(backupPayload), password);
  } catch (err: any) {
    console.error('[BackupService] Failed to generate backup payload:', err);
    return {
      success: false,
      message: `خطا در ایجاد ساختار پشتیبان: ${err?.message || 'خطای ناشناخته'}`,
      fileName,
      isNative: Capacitor.isNativePlatform(),
      error: String(err)
    };
  }

  const itemCounts = {
    notes: backupPayload.data.notes?.length || 0,
    tasks: backupPayload.data.tasks?.length || 0,
    reminders: backupPayload.data.reminders?.length || 0,
    expenses: backupPayload.data.expenses?.length || 0,
    debts: backupPayload.data.debts?.length || 0
  };

  // 1. Android Native Platform implementation via Storage Access Framework
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await NativeBackup.saveBackupFile({
        fileName,
        content: jsonStr
      });

      if (result.status === 'canceled') {
        return {
          success: false,
          isCanceled: true,
          message: 'عملیات ذخیره فایل لغو شد.',
          fileName,
          isNative: true
        };
      }

      if (result.status === 'success') {
        return {
          success: true,
          message: `فایل پشتیبان با نام «${fileName}» با موفقیت در محل انتخابی شما ذخیره شد.`,
          fileName,
          filePath: result.uri,
          isNative: true,
          itemCounts
        };
      }

      throw new Error(result.message || 'پاسخ نامشخص از سیستم‌عامل');
    } catch (nativeErr: any) {
      console.error('[BackupService] Native Android backup save failed:', nativeErr);
      return {
        success: false,
        message: `خطا در ذخیره‌سازی فایل پشتیبان در حافظه دستگاه: ${nativeErr?.message || String(nativeErr)}`,
        fileName,
        isNative: true,
        error: String(nativeErr)
      };
    }
  }

  // 2. Web Browser Fallback Implementation (Standard Blob Download)
  try {
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();

    setTimeout(() => {
      if (downloadAnchor.parentNode) {
        downloadAnchor.parentNode.removeChild(downloadAnchor);
      }
      URL.revokeObjectURL(url);
    }, 250);

    return {
      success: true,
      message: `فایل پشتیبان با موفقیت ایجاد و دانلود شد (${fileName}).`,
      fileName,
      isNative: false,
      itemCounts
    };
  } catch (webErr: any) {
    console.error('[BackupService] Browser download failed:', webErr);
    return {
      success: false,
      message: `خطا در دانلود فایل در مرورگر: ${webErr?.message || 'خطای سیستمی'}`,
      fileName,
      isNative: false,
      error: String(webErr)
    };
  }
}
