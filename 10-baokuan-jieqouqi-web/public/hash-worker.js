// Web Worker for file hash calculation
// 避免阻塞主线程的文件哈希计算

self.onmessage = async function(e) {
  const { file, chunkSize = 1024 * 1024 } = e.data; // 默认1MB块
  
  try {
    console.log('[Hash Worker] Starting hash calculation for:', file.name, 'size:', file.size);
    
    const crypto = self.crypto;
    if (!crypto || !crypto.subtle) {
      throw new Error('Web Crypto API not available');
    }

    // 创建哈希上下文
    const hasher = crypto.subtle;
    
    // 对于小文件，直接计算
    if (file.size <= chunkSize) {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await hasher.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      self.postMessage({
        type: 'success',
        hash: hashHex,
        progress: 100
      });
      return;
    }

    // 对于大文件，分块计算并报告进度
    let offset = 0;
    const chunks = [];
    
    while (offset < file.size) {
      const chunk = file.slice(offset, offset + chunkSize);
      const chunkBuffer = await chunk.arrayBuffer();
      chunks.push(new Uint8Array(chunkBuffer));
      
      offset += chunkSize;
      const progress = Math.min(Math.round((offset / file.size) * 90), 90); // 90%用于读取，10%用于最终计算
      
      self.postMessage({
        type: 'progress',
        progress: progress
      });
    }

    // 合并所有块并计算最终哈希
    self.postMessage({
      type: 'progress',
      progress: 95
    });

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const mergedBuffer = new Uint8Array(totalLength);
    let mergedOffset = 0;
    
    for (const chunk of chunks) {
      mergedBuffer.set(chunk, mergedOffset);
      mergedOffset += chunk.length;
    }

    const hashBuffer = await hasher.digest('SHA-256', mergedBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('[Hash Worker] Hash calculation completed:', hashHex);

    self.postMessage({
      type: 'success',
      hash: hashHex,
      progress: 100
    });

  } catch (error) {
    console.error('[Hash Worker] Error:', error);
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
};