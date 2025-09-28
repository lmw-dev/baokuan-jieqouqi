// 文件哈希计算工具 - 使用Web Worker避免阻塞主线程

export interface HashProgress {
  progress: number; // 0-100
  status: 'calculating' | 'completed' | 'error';
  hash?: string;
  error?: string;
}

export interface HashOptions {
  onProgress?: (progress: HashProgress) => void;
  chunkSize?: number; // 分块大小，默认1MB
}

/**
 * 使用Web Worker计算文件SHA-256哈希值
 * 支持大文件分块计算和进度回调
 */
export async function calculateFileHash(
  file: File,
  options: HashOptions = {}
): Promise<string> {
  const { onProgress, chunkSize = 1024 * 1024 } = options;

  return new Promise((resolve, reject) => {
    // 创建Web Worker - 使用new URL()避免静态分析问题
    const worker = new Worker(new URL('/hash-worker.js', window.location.origin));
    
    // 监听Worker消息
    worker.onmessage = function(e) {
      const { type, hash, progress, error } = e.data;
      
      switch (type) {
        case 'progress':
          onProgress?.({
            progress,
            status: 'calculating'
          });
          break;
          
        case 'success':
          onProgress?.({
            progress: 100,
            status: 'completed',
            hash
          });
          worker.terminate();
          resolve(hash);
          break;
          
        case 'error':
          onProgress?.({
            progress: 0,
            status: 'error',
            error
          });
          worker.terminate();
          reject(new Error(error));
          break;
      }
    };

    worker.onerror = function(error) {
      worker.terminate();
      reject(new Error(`Worker error: ${error.message}`));
    };

    // 发送文件给Worker处理
    worker.postMessage({
      file,
      chunkSize
    });
  });
}

/**
 * 检查浏览器是否支持Web Worker和Crypto API
 */
export function isHashCalculationSupported(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined'
  );
}

/**
 * 快速计算小文件哈希（同步，适用于<1MB文件）
 */
export async function calculateSmallFileHash(file: File): Promise<string> {
  if (file.size > 1024 * 1024) {
    throw new Error('File too large for synchronous calculation');
  }

  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}